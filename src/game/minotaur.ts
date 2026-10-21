// K80 stage 1, THE REAL-TIME MINOTAUR (`clock` = realtime): a dedicated
// maze mode in which a minotaur lives on the walk graph and moves
// continuously while the player thinks. Pure game state: no render, no DOM,
// no physics. main.ts drives it from wall time and the renderer animates
// toward it (docs/design/K80_realtime.md; the design is
// docs/design/K80_gameplay_additions.md sections 2 and R.4.2).
//
// CLOCK: a fixed-step sim clock, CHASE_HZ ticks a second. advance(seconds)
// accumulates wall time and runs whole ticks (at most MAX_STEPS_PER_ADVANCE
// a call, so a stalled tab slows the game instead of teleporting it).
// Everything inside a tick is a function of the tick count, the params, the
// design seed and the player's inputs, so replaying the (tick, run) inputs
// reproduces a chase exactly (replayChase): what a later replay link or a
// daily with a minotaur needs. main.ts never advances while the page is
// hidden.
//
// UNITS: lattice arc along the threads (WalkEdge.length), the same in every
// browser (the walk graph is engine-exact, K108). Only + - * / and
// comparisons are used here, so a chase is too.
//
// THE PLAYER moves as in the turn-based maze, one run per tap, but at
// `playerPace` and through real time: a tap at a branch point leaves on
// the next tick; a tap while running QUEUES (the latest wins) and leaves on
// arrival, if its run starts there. A backtrack is a run walked back, never
// an undo: this mode has no undo (Levi's call 4) and no wait move (call 5).
//
// THE MINOTAUR (Levi's calls 3 and 6):
// - LAIR: it starts at the exit END and stays there `wake` seconds, then
//   walks out along the exit tail. It never returns: the exit tail and the
//   entrance tail are barred to it: the sanctuary. A player on either tail
//   is safe, unseen and uncatchable (so a run onto the exit tail is a
//   win nothing can take back).
// - WANDER: it picks a destination and walks there by the shortest route
//   at the leg's pace (wanderPace x (1 +- paceJitter)), pausing at a
//   junction it passes with chance pauseChance and always at the
//   destination (pauseMin..pauseMax seconds: the long stop), where it
//   picks the next destination as it arrives (K324 2.3). With chance
//   deadEndBias the destination is a dead-end tip (its hunting ground, up
//   to tipReach x roamRange away), otherwise a junction roamNear x
//   roamRange..roamRange away (K324 made the 2 and the 1/4 params).
//   ROAM TOWARD THE PLAYER (K174, `roamPull`): with chance roamPull a leg
//   picks among those candidates only the ones nearer the player than
//   where it stands (thread distance), so it drifts their way without
//   homing in; a player it cannot see (on a tail) pulls nothing. roamPull 0
//   is K80's pick exactly: the same three draws, the same choice.
// - HUNT: it starts when the player is within detectStart of it and ends
//   beyond detectEnd, both measured along the threads (shortest arc through
//   the walk graph minus the barred tails, not a count of runs). While
//   hunting it runs at approachPace along the shortest path to the player's
//   exact position, re-planned every tick: at a junction it takes the
//   run that starts the shortest path; mid-run it turns back only when that
//   is shorter by more than turnBack (no dithering on near-ties).
//   Losing the player, it walks to where it last saw them, then roams.
// - JUNCTION STOPS (K324, docs/design/K324_realtime_minotaur.md section
//   3): it stops at every junction it reaches (never at a dead-end tip),
//   roaming or hunting, for stopMin..stopMax s while it roams and that
//   times huntStop while it hunts. A long stop replaces it where one
//   starts. The stop is a `hold` tick counter: the mode stays wander or
//   hunt, so detection, the glow and huntTicks go on, and spotting the
//   player does not cut it short (it still cuts a long stop). The lengths
//   come from a counter-based stream on the seed and the junction
//   arrivals (TurnRng), never from the sequential rng, and a stop that
//   rounds to 0 ticks costs no tick, so stops of 0 are K80's chase
//   exactly.
// - THE PLAN (K324 2.2): plan(reach) says, without changing or drawing
//   anything, which runs it will take next (the telegraph's route); the
//   chase makes its choices through the same functions.
// - CATCH: contact within catchDist (thread distance, off the tails)
//   sends the player back to the entrance and the minotaur back to its
//   lair, and counts it; the solve continues (main.ts keeps the clock).
//
// THE MODELS (K324 stage 3, `model`; Levi took K323's question 6: Hunter,
// Guard and Stalker play in real time too). Everything above is the
// HUNTER, which aims every step (byte-identical to stage 1: K80_DIGESTS).
// - THE GUARD roams only within its TERRITORY: the vertices within
//   `territory` u (thread distance) of its home, the exit tail's junction,
//   and the runs wholly within that (the turn guard's territory in hops,
//   in world units). Destinations are territory vertices (tips with chance
//   deadEndBias, roamPull as the hunter's), routed through the territory
//   while it stands inside it. It spots you within guardDetect and loses
//   you beyond guardLose (its own sight), wherever you are; hunting, each
//   junction takes the best run with chance guardAccuracy, else a random
//   one (the turn clock's accuracy). Losing you, it checks where it last
//   saw you, then walks home to roam its territory again.
// - THE STALKER has no destinations: whenever it sees you (you are off the
//   tails) each junction takes the best run toward you with chance
//   stalkerAccuracy, else a random one, at the wander pace; unseen, it
//   walks on at random without turning back. Within the shared sight
//   (detectStart .. detectEnd, the hunter's) it CHARGES: mode hunt, at
//   approachPace, its steps still at chance accuracy. No long stops; the
//   junction stops apply.
// - Their choices draw from a second counter stream (seed, `decisions`),
//   never the sequential rng, so plan() reads the same choices ahead, and
//   a hunt turns back mid-run only after an aimed choice (`aimed`).

import type { WalkGraph } from "../core/walk_graph";
import { SeededRNG } from "../util/random";
// The counter-based stream (K324 3.2). The modules import each other, but
// each uses the other's bindings only inside functions, so either may load
// first.
import { TurnRng, type TurnStep } from "./minotaur_turns";
import { newSword, swordSpend, swordTake, swordTouch, type SwordState } from "./sword";

export const CHASE_HZ = 120;
const DT = 1 / CHASE_HZ;
// A stalled tab (GC, a background throttle) runs at most this many ticks
// per advance(): 0.25 s.
export const MAX_STEPS_PER_ADVANCE = 30;
// K324 2.1: in its lair, plan() shows the exit tail's run this long (s)
// before it leaves.
export const LAIR_TELL = 0.5;
// plan()'s longest reach (runs after the lead).
const PLAN_REACH_MAX = 8;

// The maze clock (the `clock` param): turn = the turn-based maze, realtime =
// this mode. K114's beat clock would append a third option.
export type ClockMode = "turn" | "realtime";

// K324 stage 3: which minotaur plays (the Behavior row, `minotaur`).
export type ChaseModel = "hunter" | "guard" | "stalker";

// (K263, closed in K323 Stage A: the old undoAllowed export had no
// caller in src and no move undo exists; K92's design undo is separate.)

export interface ChaseParams {
  playerPace: number; // u/s: the player's speed along the threads.
  wanderPace: number; // u/s while it roams.
  approachPace: number; // u/s while it hunts.
  paceJitter: number; // [0, 0.5]: a roaming leg's pace = wanderPace x (1 +- this).
  pauseChance: number; // [0, 1]: chance it pauses at a junction it passes.
  pauseMin: number; // s
  pauseMax: number; // s
  detectStart: number; // u along the threads: hunting starts within this.
  detectEnd: number; // u: ...and ends beyond this (kept >= detectStart).
  catchDist: number; // u: contact.
  deadEndBias: number; // [0, 1]: chance a roam destination is a dead-end tip.
  roamRange: number; // u: the farthest junction it roams to.
  wake: number; // s in its lair, at the start and after each catch.
  // [0, 1]: chance a roam leg heads toward the player (K174; 0 = K80's
  // pick, exactly).
  roamPull: number;
  // K273 (K80 turns stage 2): a catch sends it back to its lair (true), or
  // leaves it where it caught you, pausing `wake` s (false).
  lair: boolean;
  // K324: a stop at every junction it reaches (never a dead-end tip),
  // uniform in [stopMin, stopMax] s while it roams and that times huntStop
  // while it hunts; a long stop replaces it. 0 = none (K80's chase).
  stopMin: number; // s
  stopMax: number; // s (kept >= stopMin)
  huntStop: number; // [0, 1]: a hunting stop as a share of the roaming draw.
  // K324: mid-run, a hunting minotaur turns back only when the way behind
  // is shorter by more than this (u; K80's REVERSE_MARGIN).
  turnBack: number;
  // K324: the roam window as multiples of roamRange: dead-end tips within
  // tipReach x roamRange, junctions from roamNear x roamRange (K80's 2 and
  // 1/4).
  tipReach: number;
  roamNear: number;
  // K324 stage 3: the model (the header's THE MODELS); hunter = all of the
  // above, K80's chase.
  model: ChaseModel;
  // The guard: its territory's radius around the exit tail's junction (u
  // along the threads), its sight (spots you within guardDetect, loses you
  // beyond guardLose, kept >= guardDetect) and its hunting accuracy
  // ([0, 1]: chance a junction takes the best run).
  territory: number;
  guardDetect: number;
  guardLose: number;
  guardAccuracy: number;
  // The stalker's accuracy ([0, 1]), stalking or charging.
  stalkerAccuracy: number;
}

// K324 stage 3: one choice of the guard's hunt or the stalker (decideFrom).
export interface ChaseDecision {
  choice: [number, 1 | -1] | null; // [edge, dir]; null = stay.
  aimed: boolean; // The best run toward the player.
  pace: number; // The stalker's leg pace (u/s); -1 = none drawn.
  drew: boolean; // It used a decision (the exit tail draws none).
}

// K324 stage 3: the guard's territory (MinotaurChase.territory()).
export interface ChaseTerritory {
  readonly asked: number; // params.territory it was built for.
  readonly home: number; // The exit tail's junction.
  readonly radius: number; // u: territory, or home's shortest run out if longer.
  readonly vin: Uint8Array; // 1 = vertex within radius of home.
  readonly ein: Uint8Array; // 1 = run wholly within radius of home.
  readonly routes: Map<number, Float64Array>; // Distances within, by destination.
}

// K324 2.2: what the minotaur will do next, for the telegraph (plan()).
export interface ChasePlan {
  // Its current run from its spot, in the direction it will keep; null =
  // it stands at a vertex.
  lead: { edge: number; pos: number; dir: 1 | -1 } | null;
  // Whole runs after the lead, [edge, nextVertex] (as TurnTelegraph).
  steps: TurnStep[];
  // The roaming destination when the route reaches it, else -1.
  dest: number;
  hunting: boolean; // The look: bright while it hunts.
}

// K174: the minotaur's paces as fractions of the player's (Levi: "0.7 of
// your speed"; 0.9 since K324's re-tune, below). Links and the panel carry
// the fractions (minoWanderPace, minoHuntPace); ChaseParams carries their
// products with playerPace, so one playerPace edit scales the whole chase.
// 0.5 x 10 and 0.9 x 10 are exactly 5 and 9 in doubles (url_codec.test.ts
// checks it).
export const WANDER_PACE_FRACTION = 0.5;
export const HUNT_PACE_FRACTION = 0.9;
const PLAYER_PACE = 10;

// The defaults come from a headless simulation (2026-10-13, 288 default
// mazes, scripted greedy and fleeing players; the table and how to rerun it
// are in .claude/rules/gameplay-minotaur.md, REAL-TIME MINOTAUR).
// roamPull 0.5 (K174, the same simulation): a greedy player meets it in 63%
// of games instead of 56%, at 1.68 catches a game (median 1), 74% of games
// with 0 to 2; pull 1 adds only 3 points of meetings for 0.26 catches more.
// The junction stops (K324, Levi's calls q1-q2): 0.2-0.6 s while it roams,
// half that while it hunts. They slow its hunt, so K324 raised the hunt pace
// from 0.7 to 0.9 of yours to keep today's catch rates (question 3; the
// table is gameplay-minotaur.md's K324 entry). A player who keeps moving
// away still outruns a hunt between its stops.
// K324 stage 3: the guard's and the stalker's real-time knobs, a table
// beside minotaur_turns.ts's TURN_MODEL_DEFAULTS (K294's shape) because the
// units differ: u along the threads, not runs, and the real-time hunter
// aims every step, so the turn table's accuracies do not carry over. The
// territory converts the turn guard's 6 runs at about 5 u a run
// (docs/design/K324_s3.md's Handoff says how). The sight starts wider than
// the hunter's 15 / 25, as the turn guard's 4 runs are wider than the
// hunter's 2, but the straight conversion (twice, 30 / 40) kept a player
// hunted for most of a solve; tuned on stage 1's sim (the Handoff's table)
// to about the hunter's catches a game: the guard spots you from further,
// hunts more often and aims worse; the stalker always closes in, charges
// within the hunter's sight and is escaped about half the time.
export const CHASE_MODEL_DEFAULTS = Object.freeze({
  guard: Object.freeze({ territory: 30, detect: 20, lose: 30, accuracy: 0.4 }),
  stalker: Object.freeze({ accuracy: 0.45 }),
});

// url_state.ts PARAM_DEFAULTS reads these, so a retune edits only them (and
// moves every link that leaves them out).
export const DEFAULT_CHASE_PARAMS: Readonly<ChaseParams> = Object.freeze({
  playerPace: PLAYER_PACE,
  wanderPace: WANDER_PACE_FRACTION * PLAYER_PACE,
  approachPace: HUNT_PACE_FRACTION * PLAYER_PACE,
  paceJitter: 0.2,
  pauseChance: 0.3,
  pauseMin: 0.5,
  pauseMax: 2,
  detectStart: 15,
  detectEnd: 25,
  catchDist: 1,
  deadEndBias: 0.4,
  roamRange: 30,
  wake: 2,
  roamPull: 0.5,
  lair: true,
  stopMin: 0.2,
  stopMax: 0.6,
  huntStop: 0.5,
  turnBack: 1.5,
  tipReach: 2,
  roamNear: 0.25,
  model: "hunter",
  territory: CHASE_MODEL_DEFAULTS.guard.territory,
  guardDetect: CHASE_MODEL_DEFAULTS.guard.detect,
  guardLose: CHASE_MODEL_DEFAULTS.guard.lose,
  guardAccuracy: CHASE_MODEL_DEFAULTS.guard.accuracy,
  stalkerAccuracy: CHASE_MODEL_DEFAULTS.stalker.accuracy,
});

// Where an entity stands: at a vertex (edge < 0), or on a run `pos` units
// from its ctrlA end (va), travelling toward vb (dir +1) or va (dir -1).
export interface Spot {
  edge: number;
  pos: number;
  dir: 1 | -1;
  vertex: number; // Vertex index; meaningful while edge < 0.
}

export type MinotaurMode = "lair" | "wander" | "pause" | "hunt";

export type ChaseEvent =
  | { kind: "depart"; edge: number } // The player left along `edge`.
  | { kind: "arrive"; vertex: string } // The player reached a vertex.
  | { kind: "spotted" } // It started hunting the player.
  | { kind: "lost" } // It lost the player.
  | { kind: "caught" } // Player at the entrance, minotaur in its lair.
  // K137 s3b: the sword taken, a touch while it fled, the flee run out.
  | { kind: "sword"; what: "taken" | "banish" | "slay" | "spent" };

export interface ChaseInput {
  tick: number; // The tick the tap applies before.
  edge: number;
}

// Binary min-heap of (key, id) pairs, ties broken by id (deterministic).
class MinHeap {
  private keys: number[] = [];
  private ids: number[] = [];
  get size(): number {
    return this.ids.length;
  }
  private less(i: number, j: number): boolean {
    const a = this.keys[i];
    const b = this.keys[j];
    return a < b || (a === b && this.ids[i] < this.ids[j]);
  }
  private swap(i: number, j: number): void {
    const k = this.keys[i];
    this.keys[i] = this.keys[j];
    this.keys[j] = k;
    const d = this.ids[i];
    this.ids[i] = this.ids[j];
    this.ids[j] = d;
  }
  push(key: number, id: number): void {
    this.keys.push(key);
    this.ids.push(id);
    let i = this.ids.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(i, p)) break;
      this.swap(i, p);
      i = p;
    }
  }
  pop(): [number, number] {
    const top: [number, number] = [this.keys[0], this.ids[0]];
    const lastK = this.keys.pop()!;
    const lastI = this.ids.pop()!;
    if (this.ids.length > 0) {
      this.keys[0] = lastK;
      this.ids[0] = lastI;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < this.ids.length && this.less(l, m)) m = l;
        if (r < this.ids.length && this.less(r, m)) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }
}

// The walk graph as index arrays, plus lazily cached single-source
// distances over the whole graph (catches) and over the graph without the
// two tails (the minotaur's world: pathing and detection).
export class ChaseGraph {
  readonly walk: WalkGraph;
  readonly ids: string[] = [];
  readonly index = new Map<string, number>();
  readonly isEnd: boolean[] = [];
  readonly adj: number[][] = []; // Incident edge ids per vertex.
  readonly ea: Int32Array; // Edge endpoint indices.
  readonly eb: Int32Array;
  readonly len: Float64Array;
  readonly barred: Uint8Array; // 1 = the entrance or exit tail.
  // K137-b: 1 = a run that broke behind the player (fragile, collapse):
  // gone for the minotaur's pathing (the restricted distances), as the
  // tails are; contact still measures the whole graph. block() sets it.
  readonly blocked: Uint8Array;
  blockedCount = 0;
  readonly start: number;
  readonly exit: number;
  private cache = [new Map<number, Float64Array>(), new Map<number, Float64Array>()];

  constructor(walk: WalkGraph) {
    this.walk = walk;
    for (const [id, v] of walk.vertices) {
      this.index.set(id, this.ids.length);
      this.ids.push(id);
      this.isEnd.push(v.isEnd);
      this.adj.push(v.edges.slice());
    }
    const n = walk.edges.length;
    this.ea = new Int32Array(n);
    this.eb = new Int32Array(n);
    this.len = new Float64Array(n);
    this.barred = new Uint8Array(n);
    this.blocked = new Uint8Array(n);
    this.start = this.index.get(walk.start)!;
    this.exit = this.index.get(walk.exit)!;
    for (const e of walk.edges) {
      this.ea[e.id] = this.index.get(e.va)!;
      this.eb[e.id] = this.index.get(e.vb)!;
      this.len[e.id] = e.length > 1e-9 ? e.length : 1e-9;
      const tail =
        this.ea[e.id] === this.start ||
        this.eb[e.id] === this.start ||
        this.ea[e.id] === this.exit ||
        this.eb[e.id] === this.exit;
      this.barred[e.id] = tail ? 1 : 0;
    }
  }

  // Shortest thread distances from vertex `src` to every vertex; restricted
  // = without the barred tails.
  from(src: number, restricted: boolean): Float64Array {
    const c = this.cache[restricted ? 1 : 0];
    const hit = c.get(src);
    if (hit) return hit;
    const dist = new Float64Array(this.ids.length).fill(Infinity);
    const done = new Uint8Array(this.ids.length);
    const heap = new MinHeap();
    dist[src] = 0;
    heap.push(0, src);
    while (heap.size > 0) {
      const [d, u] = heap.pop();
      if (done[u]) continue;
      done[u] = 1;
      for (const eid of this.adj[u]) {
        if (restricted && (this.barred[eid] || this.blocked[eid])) continue;
        const w = this.ea[eid] === u ? this.eb[eid] : this.ea[eid];
        const nd = d + this.len[eid];
        if (nd < dist[w]) {
          dist[w] = nd;
          heap.push(nd, w);
        }
      }
    }
    c.set(src, dist);
    return dist;
  }

  // K137-b: run `eid` broke; true when it was not blocked before.
  block(eid: number): boolean {
    if (!(eid >= 0 && eid < this.blocked.length) || this.blocked[eid]) return false;
    this.blocked[eid] = 1;
    this.blockedCount++;
    this.cache[1].clear();
    return true;
  }

  // K324 stage 3: shortest distances from `src` over only the runs `ok`
  // marks (the guard's territory, which caches them).
  fromOver(src: number, ok: Uint8Array): Float64Array {
    const dist = new Float64Array(this.ids.length).fill(Infinity);
    const done = new Uint8Array(this.ids.length);
    const heap = new MinHeap();
    dist[src] = 0;
    heap.push(0, src);
    while (heap.size > 0) {
      const [d, u] = heap.pop();
      if (done[u]) continue;
      done[u] = 1;
      for (const eid of this.adj[u]) {
        if (!ok[eid]) continue;
        const w = this.ea[eid] === u ? this.eb[eid] : this.ea[eid];
        const nd = d + this.len[eid];
        if (nd < dist[w]) {
          dist[w] = nd;
          heap.push(nd, w);
        }
      }
    }
    return dist;
  }

  // Distance from a spot to vertex x. K137-b: on a run that broke, only
  // the end the spot heads to leads on (restricted).
  spotToVertex(s: Spot, x: number, restricted: boolean): number {
    if (s.edge < 0) return this.from(s.vertex, restricted)[x];
    if (restricted && this.blocked[s.edge]) {
      return s.dir > 0
        ? this.len[s.edge] - s.pos + this.from(this.eb[s.edge], true)[x]
        : s.pos + this.from(this.ea[s.edge], true)[x];
    }
    const a = this.from(this.ea[s.edge], restricted)[x];
    const b = this.from(this.eb[s.edge], restricted)[x];
    return Math.min(s.pos + a, this.len[s.edge] - s.pos + b);
  }

  // Distance between two spots along the threads.
  spotToSpot(m: Spot, p: Spot, restricted: boolean): number {
    if (m.edge < 0) return this.spotToVertex(p, m.vertex, restricted);
    let d =
      restricted && this.blocked[m.edge]
        ? m.dir > 0
          ? this.len[m.edge] - m.pos + this.spotToVertex(p, this.eb[m.edge], true)
          : m.pos + this.spotToVertex(p, this.ea[m.edge], true)
        : Math.min(
            m.pos + this.spotToVertex(p, this.ea[m.edge], restricted),
            this.len[m.edge] - m.pos + this.spotToVertex(p, this.eb[m.edge], restricted)
          );
    if (p.edge === m.edge) d = Math.min(d, Math.abs(p.pos - m.pos));
    return d;
  }

  // The vertex a spot is heading to (or stands at).
  ahead(s: Spot): number {
    if (s.edge < 0) return s.vertex;
    return s.dir > 0 ? this.eb[s.edge] : this.ea[s.edge];
  }
}

// A spot's position on its chain, for the renderer: the linear arc
// fraction along the run's ctrl span (a vertex: its one live occurrence).
export function spotCtrl(
  walk: WalkGraph,
  g: ChaseGraph,
  s: Spot
): { chain: number; ctrl: number } {
  if (s.edge < 0) {
    const v = walk.vertices.get(g.ids[s.vertex])!;
    return { chain: v.chain, ctrl: v.ctrl };
  }
  const e = walk.edges[s.edge];
  return {
    chain: e.chain,
    ctrl: e.ctrlA + ((e.ctrlB - e.ctrlA) * s.pos) / g.len[s.edge],
  };
}

// Seconds to whole ticks (timers count ticks: exact, whatever the float).
function ticksOf(seconds: number): number {
  return seconds > 0 ? Math.round(seconds * CHASE_HZ) : 0;
}

function seedMix(seed: number): number {
  const s = Math.floor(Math.abs(seed)) % 4294967296;
  return (s ^ 0x4d494e4f) >>> 0; // "MINO"
}

export class MinotaurChase {
  readonly g: ChaseGraph;
  readonly params: ChaseParams;
  tick = 0;
  // The attempt's tallies: a level restart's new chase carries them over
  // (carry), so a restart never launders a catch. restarts counts a Reset
  // path under it (main.ts; K80 turns stage 2: logged, not a catch).
  catches = 0;
  huntTicks = 0; // Ticks spent hunted (stats: time chased).
  restarts = 0;
  finished = false; // The player reached the exit.
  readonly inputs: ChaseInput[] = [];
  player: Spot;
  mino: Spot;
  mode: MinotaurMode = "lair";
  // K324: ticks left in a junction stop (0 = none; read-only outside).
  // The mode stays wander or hunt meanwhile.
  hold = 0;
  // K324: junction arrivals since the chase began, the stop stream's
  // counter (read-only outside).
  arrivals = 0;
  // K324 stage 3: the guard's hunting and the stalker's choices so far,
  // the decision stream's counter (read-only outside; the hunter draws
  // none, so it stays 0).
  decisions = 0;
  private queued = -1;
  private timer = 0; // Ticks left in the lair or a pause.
  private dest = -1; // Roam destination (vertex index), -1 = pick one.
  private legPace = 0;
  private acc = 0; // advance()'s wall-time accumulator.
  private rng: SeededRNG;
  private stopRng: TurnRng;
  private aimRng: TurnRng; // K324 stage 3: the decision stream.
  // K324 stage 3: the current run was an aimed choice (a hunt turns back
  // mid-run only then; always true for the hunter and for roaming legs).
  private aimed = true;
  private lastEdge = -1; // The run it last arrived along (-1 = none).
  private terr: ChaseTerritory | null = null;
  // K137-b: the controller's break limits and the player's crossings so
  // far (null: nothing breaks).
  private limits: ArrayLike<number> | null = null;
  private crossings: Uint32Array | null = null;
  // K137 s3b (4.7): the sword (null: none, the default: nothing below
  // reads or draws, so every digest holds), runs the player has walked
  // (the flee counts them, s3a call 3) and the last touch while it fled.
  sword: SwordState | null = null;
  walked = 0;
  lastTouch: { kind: "banish" | "slay"; tick: number } | null = null;
  // K137 s3c (4.29), SPRINT: the next `sprintLeft` departures run at twice
  // playerPace (sprint() arms two). `sprints` holds the ticks sprint() was
  // called before, apart from `inputs` (main.ts reads inputs' length as the
  // tap count), so replayChase rebuilds it. Never armed: nothing below
  // reads them and every digest holds.
  readonly sprints: number[] = [];
  sprintLeft = 0;
  private sprinting = false;

  constructor(walk: WalkGraph, params: ChaseParams, seed: number) {
    this.g = new ChaseGraph(walk);
    this.params = { ...params };
    this.setParams(params);
    this.rng = new SeededRNG(seedMix(seed));
    this.stopRng = new TurnRng(seedMix(seed));
    this.aimRng = new TurnRng((seedMix(seed) ^ 0x5354414c) >>> 0);
    this.player = { edge: -1, pos: 0, dir: 1, vertex: this.g.start };
    this.mino = { edge: -1, pos: 0, dir: 1, vertex: this.g.exit };
    this.timer = ticksOf(this.params.wake);
    this.legPace = this.params.wanderPace;
  }

  // Live panel edits: read from the next tick on. (A replay needs the
  // params a chase ran with, so only free play edits mid-chase.)
  setParams(p: ChaseParams): void {
    Object.assign(this.params, p);
    if (!(this.params.detectEnd >= this.params.detectStart)) {
      this.params.detectEnd = this.params.detectStart;
    }
    if (!(this.params.pauseMax >= this.params.pauseMin)) {
      this.params.pauseMax = this.params.pauseMin;
    }
    if (!(this.params.stopMax >= this.params.stopMin)) {
      this.params.stopMax = this.params.stopMin;
    }
    if (!(this.params.guardLose >= this.params.guardDetect)) {
      this.params.guardLose = this.params.guardDetect;
    }
  }

  // A level restart's new chase takes over the old one's tallies.
  carry(prev: MinotaurChase): void {
    this.catches = prev.catches;
    this.huntTicks = prev.huntTicks;
    this.restarts = prev.restarts;
  }

  // K137-b: the controller's break limits (fragile, collapse; Infinity =
  // never breaks). The chase counts the player's departures itself, one
  // crossing each as the controller counts its taps, and blocks a run in
  // its own ChaseGraph the moment it breaks. Call before the first tick
  // (main.ts restartChase, replayChase); a catch keeps the breaks.
  setBreakLimits(limits: ArrayLike<number> | null): void {
    let any = false;
    if (limits) {
      for (let i = 0; i < limits.length; i++) {
        if (Number.isFinite(limits[i])) {
          any = true;
          break;
        }
      }
    }
    this.limits = any ? limits : null;
    this.crossings = any ? new Uint32Array(this.g.len.length) : null;
  }

  // K137 s3b: the sword for this chase (null: none). Call before the first
  // tick (main.ts restartChase, replayChase).
  setSword(s: SwordState | null): void {
    this.sword = s;
  }

  // K137 s3b: it flees the sword / the one-use sword slew it.
  get fleeing(): boolean {
    return this.sword !== null && this.sword.phase === "fleeing";
  }

  get slain(): boolean {
    return this.sword !== null && this.sword.phase === "slain";
  }

  // K137 s3b: the player arrived at vertex v. Taking the sword turns it
  // round on its run (Pac-Man), ends any stop and any hunt; while it flees
  // each run walked spends one.
  private swordArrive(v: number, out: ChaseEvent[]): void {
    const s = this.sword as SwordState;
    if (s.phase === "fleeing") {
      swordSpend(s);
      if (s.left === 0) out.push({ kind: "sword", what: "spent" });
      return;
    }
    if (!swordTake(s, v, this.walked)) return;
    out.push({ kind: "sword", what: "taken" });
    const m = this.mino;
    if (this.mode === "hunt" || this.mode === "pause") {
      this.mode = "wander";
      this.timer = 0;
    }
    this.hold = 0;
    this.dest = -1;
    this.aimed = true;
    if (m.edge >= 0) m.dir = m.dir > 0 ? -1 : 1;
  }

  // K137 s3b: a touch while it flees, no catch: timed banishes it to its
  // lair (it waits `wake` there), one-use slays it.
  private swordTouched(out: ChaseEvent[]): void {
    const kind = swordTouch(this.sword as SwordState, this.walked);
    this.lastTouch = { kind, tick: this.tick };
    out.push({ kind: "sword", what: kind });
    this.hold = 0;
    this.dest = -1;
    this.aimed = true;
    this.lastEdge = -1;
    if (kind === "banish") {
      this.mino = { edge: -1, pos: 0, dir: 1, vertex: this.g.exit };
      this.mode = "lair";
      this.timer = ticksOf(this.params.wake);
    } else {
      this.mode = "wander";
      this.timer = 0;
    }
  }

  // K137 s3b: fleeing at its vertex: the run whose far end is farthest from
  // the player (thread distance it may use; out of reach counts farthest),
  // ties the lowest run id, no draw. null = it holds: in its lair, or while
  // every run closes in on you (a tip, a pocket), as the turn flee does.
  fleeEdgeFrom(v: number): [number, 1 | -1] | null {
    const g = this.g;
    if (v === g.exit) return null;
    const far2 = (d: number): number => (d < Infinity ? d : Number.MAX_VALUE);
    let best: [number, 1 | -1] | null = null;
    let bestD = -1;
    for (const eid of g.adj[v]) {
      if (g.barred[eid] || g.blocked[eid]) continue;
      const far = g.ea[eid] === v ? g.eb[eid] : g.ea[eid];
      const dd = far2(g.spotToVertex(this.player, far, true));
      if (dd > bestD || (dd === bestD && best !== null && eid < best[0])) {
        bestD = dd;
        best = [eid, g.ea[eid] === v ? 1 : -1];
      }
    }
    if (best === null || bestD < far2(g.spotToVertex(this.player, v, true))) return null;
    return best;
  }

  // K137 s3b: a fleeing tick: wander pace, no stops, no sight, no turning
  // back mid-run (it turned once, at the pickup); each vertex asks
  // fleeEdgeFrom, and a hold waits there a tick.
  private moveFleeing(): void {
    const g = this.g;
    const m = this.mino;
    let rem = this.params.wanderPace * DT;
    for (let guard = 0; guard < 64 && rem > 0; guard++) {
      if (m.edge < 0) {
        const choice = this.fleeEdgeFrom(m.vertex);
        if (!choice) return;
        const [eid, dir] = choice;
        m.edge = eid;
        m.dir = dir;
        m.pos = dir > 0 ? 0 : g.len[eid];
      }
      const L = g.len[m.edge];
      const toEnd = m.dir > 0 ? L - m.pos : m.pos;
      if (rem < toEnd) {
        m.pos += m.dir * rem;
        return;
      }
      rem -= toEnd;
      m.vertex = m.dir > 0 ? g.eb[m.edge] : g.ea[m.edge];
      this.lastEdge = m.edge;
      m.edge = -1;
      m.pos = 0;
    }
  }

  // K137-b: the runs broken so far, in id order (probes, tests).
  get blockedRuns(): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.g.blocked.length; i++) if (this.g.blocked[i]) out.push(i);
    return out;
  }

  private crossRun(eid: number): void {
    const lim = this.limits;
    const c = this.crossings;
    if (lim === null || c === null || !(eid >= 0 && eid < c.length)) return;
    if (++c[eid] >= lim[eid] && this.g.block(eid)) this.terr = null;
  }

  // K137-b: the player is on a run that broke, heading to vertex v (the
  // only way they can come out).
  private awaits(v: number): boolean {
    const p = this.player;
    const g = this.g;
    return p.edge >= 0 && g.blocked[p.edge] === 1 && g.ahead(p) === v;
  }

  get seconds(): number {
    return this.tick * DT;
  }

  get huntSeconds(): number {
    return this.huntTicks * DT;
  }

  // The vertex the player's next run starts from (where they stand, or the
  // end of the run they are on).
  get decisionVertex(): string {
    return this.g.ids[this.g.ahead(this.player)];
  }

  get playerMoving(): boolean {
    return this.player.edge >= 0;
  }

  // How far the player has come along the run they are on, 0..1.
  get playerProgress(): number {
    const p = this.player;
    if (p.edge < 0) return 1;
    const L = this.g.len[p.edge];
    return p.dir > 0 ? p.pos / L : (L - p.pos) / L;
  }

  // Thread distance as the minotaur sees it (Infinity: the player is on a
  // tail, invisible) and as contact measures it (the whole graph).
  huntDistance(): number {
    if (this.invisible()) return Infinity;
    return this.g.spotToSpot(this.mino, this.player, true);
  }

  contactDistance(): number {
    return this.g.spotToSpot(this.mino, this.player, false);
  }

  // A tap on run `edge`: queued to leave from the decision vertex (at once
  // when standing, on arrival when running; the latest tap wins).
  tap(edge: number): "queued" | "reject" {
    if (this.finished) return "reject";
    const v = this.g.ahead(this.player);
    if (
      !Number.isInteger(edge) ||
      edge < 0 ||
      edge >= this.g.len.length ||
      (this.g.ea[edge] !== v && this.g.eb[edge] !== v)
    ) {
      return "reject";
    }
    this.queued = edge;
    this.inputs.push({ tick: this.tick, edge });
    return "queued";
  }

  // K137 s3c: arm a sprint (the next two departures at twice playerPace).
  // Refused once finished or while one is still armed or running.
  sprint(): "armed" | "reject" {
    if (this.finished || this.sprintLeft > 0 || this.sprinting) return "reject";
    this.sprintLeft = 2;
    this.sprints.push(this.tick);
    return "armed";
  }

  // K137 s3c: a sprint is armed or under way (the HUD, the dot's pace).
  get sprintActive(): boolean {
    return this.sprintLeft > 0 || this.sprinting;
  }

  // K137 s3c: the player's pace on the run they are on (main.ts's dot).
  get playerSpeed(): number {
    return this.sprinting ? this.params.playerPace * 2 : this.params.playerPace;
  }

  // Run the whole ticks `seconds` of wall time cover.
  advance(seconds: number, out: ChaseEvent[] = []): ChaseEvent[] {
    if (!(seconds > 0)) return out;
    this.acc += seconds;
    let n = 0;
    while (this.acc >= DT && n < MAX_STEPS_PER_ADVANCE) {
      this.acc -= DT;
      this.step(out);
      n++;
    }
    if (this.acc >= DT) this.acc = 0; // Drop a stall's backlog.
    return out;
  }

  // One fixed tick: the player, then the minotaur, then contact, then
  // detection.
  step(out: ChaseEvent[] = []): ChaseEvent[] {
    this.movePlayer(out);
    this.moveMinotaur();
    // K137 s3b: slain, it is gone (no contact, no sight); fleeing, a touch
    // banishes or slays it instead of catching you and it spots no one.
    const sword = this.sword !== null && (this.sword.phase === "fleeing" || this.sword.phase === "slain");
    if (sword) {
      if (
        !this.finished &&
        this.sword!.phase === "fleeing" &&
        !this.invisible() &&
        this.contactDistance() <= this.params.catchDist
      ) {
        this.swordTouched(out);
      }
    } else if (
      !this.finished &&
      !this.invisible() &&
      this.contactDistance() <= this.params.catchDist
    ) {
      this.catches++;
      out.push({ kind: "caught" });
      this.respawn();
    } else if (!this.finished) {
      this.detect(out);
    }
    if (this.mode === "hunt") this.huntTicks++;
    this.tick++;
    return out;
  }

  // Tests and probes: put an entity somewhere (a vertex id, or a run and an
  // offset from its ctrlA end) and optionally set the minotaur's mode.
  place(
    who: "player" | "minotaur",
    at: string | { edge: number; pos: number; dir: 1 | -1 },
    mode?: MinotaurMode,
    timer = 0
  ): void {
    const s: Spot =
      typeof at === "string"
        ? { edge: -1, pos: 0, dir: 1, vertex: this.g.index.get(at)! }
        : { edge: at.edge, pos: at.pos, dir: at.dir, vertex: -1 };
    if (who === "player") {
      this.player = s;
      this.queued = -1;
    } else {
      this.mino = s;
      if (mode) this.mode = mode;
      this.timer = ticksOf(timer);
      this.dest = -1;
      this.hold = 0;
      this.aimed = true;
      this.lastEdge = -1;
    }
  }

  private invisible(): boolean {
    const p = this.player;
    if (p.edge >= 0) return this.g.barred[p.edge] === 1;
    return p.vertex === this.g.start || p.vertex === this.g.exit;
  }

  // A catch: the player to the entrance; the minotaur to its lair, or
  // (lair off, K273) where it stands, even mid-run, pausing `wake` s
  // before it roams again from there.
  private respawn(): void {
    this.player = { edge: -1, pos: 0, dir: 1, vertex: this.g.start };
    this.queued = -1;
    // K137 s3c: a catch ends a sprint (it is spent, s3b call 1).
    this.sprintLeft = 0;
    this.sprinting = false;
    if (this.params.lair === false) {
      this.mode = "pause";
    } else {
      this.mino = { edge: -1, pos: 0, dir: 1, vertex: this.g.exit };
      this.mode = "lair";
    }
    this.timer = ticksOf(this.params.wake);
    this.dest = -1;
    this.hold = 0;
    this.aimed = true;
    this.lastEdge = -1;
  }

  private movePlayer(out: ChaseEvent[]): void {
    const g = this.g;
    const p = this.player;
    let rem = this.params.playerPace * DT;
    for (let guard = 0; guard < 64; guard++) {
      if (p.edge < 0) {
        if (this.queued < 0 || this.finished) return;
        const eid = this.queued;
        this.queued = -1;
        const v = p.vertex;
        if (g.ea[eid] === v) {
          p.edge = eid;
          p.pos = 0;
          p.dir = 1;
        } else if (g.eb[eid] === v) {
          p.edge = eid;
          p.pos = g.len[eid];
          p.dir = -1;
        } else {
          return;
        }
        out.push({ kind: "depart", edge: eid });
        this.crossRun(eid);
        // K137 s3c: a sprinted departure (x2 and /2 are exact, K108).
        if (this.sprintLeft > 0) {
          this.sprintLeft--;
          this.sprinting = true;
        }
      }
      const L = g.len[p.edge];
      const toEnd = p.dir > 0 ? L - p.pos : p.pos;
      if (this.sprinting) {
        if (rem * 2 < toEnd) {
          p.pos += p.dir * (rem * 2);
          return;
        }
        rem -= toEnd / 2;
        this.sprinting = false;
      } else {
        if (rem < toEnd) {
          p.pos += p.dir * rem;
          return;
        }
        rem -= toEnd;
      }
      const v = p.dir > 0 ? g.eb[p.edge] : g.ea[p.edge];
      p.edge = -1;
      p.pos = 0;
      p.vertex = v;
      out.push({ kind: "arrive", vertex: g.ids[v] });
      if (v === g.exit) {
        this.finished = true;
        this.queued = -1;
        if (this.mode === "hunt") this.mode = "wander";
        return;
      }
      if (this.sword !== null) {
        this.walked++;
        this.swordArrive(v, out);
      }
    }
  }

  private moveMinotaur(): void {
    const g = this.g;
    const m = this.mino;
    const P = this.params;
    if (this.sword !== null && this.sword.phase !== "ready" && this.sword.phase !== "used") {
      if (this.sword.phase === "fleeing") this.moveFleeing();
      return;
    }
    if (this.mode === "lair" || this.mode === "pause") {
      if (this.timer > 0) {
        this.timer--;
        return;
      }
      this.mode = "wander";
      // A destination rest picked its next leg on arrival (K324 2.3); the
      // lair, a catch's pause and a pick that found nothing pick here. The
      // stalker has no destinations.
      if (P.model !== "stalker" && (this.dest < 0 || this.dest === m.vertex)) {
        this.pickDest();
      }
    }
    if (this.hold > 0) {
      this.hold--;
      return;
    }
    let rem = (this.mode === "hunt" ? P.approachPace : this.legPace) * DT;
    for (let guard = 0; guard < 64 && rem > 0; guard++) {
      if (m.edge < 0) {
        const choice = this.chooseRun();
        if (!choice) return;
        const [eid, dir] = choice;
        m.edge = eid;
        m.dir = dir;
        m.pos = dir > 0 ? 0 : g.len[eid];
      } else if (this.mode === "hunt" && this.aimed && this.shouldReverse(m)) {
        m.dir = m.dir > 0 ? -1 : 1;
      }
      const L = g.len[m.edge];
      const toEnd = m.dir > 0 ? L - m.pos : m.pos;
      if (rem < toEnd) {
        m.pos += m.dir * rem;
        return;
      }
      rem -= toEnd;
      m.vertex = m.dir > 0 ? g.eb[m.edge] : g.ea[m.edge];
      this.lastEdge = m.edge;
      m.edge = -1;
      m.pos = 0;
      // K324: every junction arrival draws its stop first, so the stream's
      // index never depends on what happens next; a long stop replaces it,
      // and a stop that rounds to 0 ticks keeps the tick's movement. The
      // stalker takes no long stops.
      const stop = g.isEnd[m.vertex] ? 0 : this.junctionStop();
      if (this.mode === "wander" && P.model !== "stalker" && this.roamArrival()) return;
      if (stop > 0) {
        this.hold = stop;
        return;
      }
    }
  }

  // K324 stage 3: the run it leaves its vertex along. The hunter hunts
  // (huntEdgeFrom) or roams (roamEdge), as K80 did; the guard roams its
  // territory and hunts by decideFrom; the stalker always decides.
  private chooseRun(): [number, 1 | -1] | null {
    const P = this.params;
    const v = this.mino.vertex;
    const hunting = this.mode === "hunt";
    if (P.model !== "guard" && P.model !== "stalker") {
      return hunting ? this.huntEdgeFrom(v) : this.roamEdge();
    }
    if (P.model === "guard" && !hunting) {
      this.aimed = true;
      return this.roamEdge();
    }
    const d = this.decideFrom(v, this.decisions, this.lastEdge);
    if (d.drew) this.decisions++;
    this.aimed = d.aimed;
    if (!hunting && d.pace >= 0) this.legPace = d.pace;
    return d.choice;
  }

  // K324 stage 3: the guard's hunting step and the stalker's every step at
  // vertex v, from decision k of the counter stream (seed, k). While it sees
  // you (you are off the tails), with chance q (guardAccuracy or
  // stalkerAccuracy) the best run toward you (huntEdgeFrom); otherwise a
  // random run, never a tail, and for a stalker that cannot see you never
  // `back` (the run it came along) while it has another. Three draws (u1
  // aims, u2 picks the random run, u3 the stalker's leg pace), none for the
  // exit tail out of its lair. Pure: plan() asks it ahead at k + i.
  decideFrom(v: number, k: number, back: number): ChaseDecision {
    const g = this.g;
    const P = this.params;
    if (v === g.exit) {
      const tail = g.adj[v][0];
      const choice: [number, 1 | -1] | null =
        tail === undefined ? null : [tail, g.ea[tail] === v ? 1 : -1];
      return { choice, aimed: false, pace: -1, drew: false };
    }
    const r = this.aimRng.at(k);
    const u1 = r.next();
    const u2 = r.next();
    const u3 = r.next();
    const pace = P.wanderPace * (1 + P.paceJitter * (2 * u3 - 1));
    const seen = !this.invisible();
    const q = P.model === "guard" ? P.guardAccuracy : P.stalkerAccuracy;
    if (seen && u1 < q) {
      // K137-b: you are coming out of a broken run at v: an aimed choice
      // waits there (drawing nothing, so the same decision is read again).
      if (g.blockedCount > 0 && this.awaits(v)) {
        return { choice: null, aimed: true, pace: -1, drew: false };
      }
      const best = this.huntEdgeFrom(v);
      if (best) return { choice: best, aimed: true, pace, drew: true };
    }
    let runs: number[] = [];
    for (const eid of g.adj[v]) {
      if (!g.barred[eid] && !g.blocked[eid] && runs.indexOf(eid) < 0) runs.push(eid);
    }
    if (!seen && P.model === "stalker" && runs.length > 1 && back >= 0) {
      const ahead = runs.filter((eid) => eid !== back);
      if (ahead.length > 0) runs = ahead;
    }
    if (runs.length === 0) return { choice: null, aimed: false, pace, drew: true };
    const eid = runs[Math.min(runs.length - 1, Math.floor(u2 * runs.length))];
    return { choice: [eid, g.ea[eid] === v ? 1 : -1], aimed: false, pace, drew: true };
  }

  // K324 stage 3: the guard's territory, rebuilt when params.territory
  // changes. Home = the exit tail's junction; radius = territory, or home's
  // shortest run out when that is longer (so it always has somewhere to
  // go). A vertex is in when it lies within radius of home along the
  // threads it may use; a run when its farthest point does, which is
  // (d[a] + d[b] + len) / 2 from home (a shortest-path tree's runs all
  // qualify, so the territory is connected).
  territory(): ChaseTerritory {
    const P = this.params;
    if (this.terr && this.terr.asked === P.territory) return this.terr;
    const g = this.g;
    const tail = g.adj[g.exit][0];
    const home =
      tail === undefined ? g.exit : g.ea[tail] === g.exit ? g.eb[tail] : g.ea[tail];
    let shortest = Infinity;
    for (const eid of g.adj[home]) {
      if (g.barred[eid] || g.blocked[eid] || g.ea[eid] === g.eb[eid]) continue;
      if (g.len[eid] < shortest) shortest = g.len[eid];
    }
    const asked = P.territory;
    const radius = shortest < Infinity && !(asked >= shortest) ? shortest : asked;
    const d = g.from(home, true);
    const vin = new Uint8Array(g.ids.length);
    for (let i = 0; i < vin.length; i++) if (d[i] <= radius) vin[i] = 1;
    const ein = new Uint8Array(g.len.length);
    for (let e = 0; e < ein.length; e++) {
      if (g.barred[e] || g.blocked[e]) continue;
      if (d[g.ea[e]] + d[g.eb[e]] + g.len[e] <= 2 * radius) ein[e] = 1;
    }
    this.terr = { asked, home, radius, vin, ein, routes: new Map() };
    return this.terr;
  }

  // Distances to `dest` through the territory's runs (cached per territory).
  private territoryRoute(dest: number): Float64Array {
    const t = this.territory();
    let r = t.routes.get(dest);
    if (!r) {
      r = this.g.fromOver(dest, t.ein);
      t.routes.set(dest, r);
    }
    return r;
  }

  // K324 3.1-3.2: a junction stop's length in ticks, from the counter
  // stream (seed, arrival count): roaming uniform in [stopMin, stopMax] s,
  // hunting that times huntStop.
  private junctionStop(): number {
    const P = this.params;
    const u = this.stopRng.at(this.arrivals++).next();
    const s = P.stopMin + (P.stopMax - P.stopMin) * u;
    return ticksOf(this.mode === "hunt" ? s * P.huntStop : s);
  }

  // Wandering, arrived at a vertex: pause at the destination and pick the
  // next one now (K324 2.3: on arrival, so plan() can show the next leg
  // through the rest), or pause at a passing junction by chance. True = it
  // paused. Always two RNG draws, then pickDest's three at a destination.
  private roamArrival(): boolean {
    const P = this.params;
    const u1 = this.rng.next();
    const u2 = this.rng.next();
    const pause = P.pauseMin + (P.pauseMax - P.pauseMin) * u2;
    const v = this.mino.vertex;
    if (v === this.dest) {
      this.dest = -1;
      this.startPause(pause);
      this.pickDest();
      return true;
    }
    if (!this.g.isEnd[v] && u1 < P.pauseChance) {
      this.startPause(pause);
      return true;
    }
    return false;
  }

  private startPause(seconds: number): void {
    this.mode = "pause";
    this.timer = ticksOf(seconds);
  }

  // The next roam destination, from where it stands (its lair counts as
  // the exit tail's junction). Always three RNG draws: u1 picks the kind
  // (a tip or a junction), u2 the candidate (and, with roamPull, whether
  // the leg heads toward the player: below roamPull it does, and u2 /
  // roamPull picks among the nearer candidates; above, (u2 - roamPull) /
  // (1 - roamPull) picks among all, so roamPull 0 is u2 itself), u3 the
  // leg's pace.
  private pickDest(): void {
    const g = this.g;
    const P = this.params;
    const u1 = this.rng.next();
    const u2 = this.rng.next();
    const u3 = this.rng.next();
    this.legPace = P.wanderPace * (1 + P.paceJitter * (2 * u3 - 1));
    const here = this.roamAnchor();
    const d = g.from(here, true);
    const tips: number[] = [];
    const near: number[] = [];
    const any: number[] = [];
    if (P.model === "guard") {
      // K324 stage 3: the guard's candidates are its territory's vertices
      // (tips, or junctions), home excepted; none, it heads home.
      const t = this.territory();
      for (let i = 0; i < g.ids.length; i++) {
        if (i === here || i === t.home || i === g.start || i === g.exit) continue;
        if (!t.vin[i] || !(d[i] < Infinity)) continue;
        any.push(i);
        if (g.isEnd[i]) tips.push(i);
        else near.push(i);
      }
      if (any.length === 0 && here !== t.home) {
        near.push(t.home);
        any.push(t.home);
      }
    } else {
      for (let i = 0; i < g.ids.length; i++) {
        if (i === here || i === g.start || i === g.exit) continue;
        if (!(d[i] < Infinity)) continue;
        any.push(i);
        if (g.isEnd[i]) {
          if (d[i] <= P.tipReach * P.roamRange) tips.push(i);
        } else if (d[i] >= P.roamNear * P.roamRange && d[i] <= P.roamRange) {
          near.push(i);
        }
      }
    }
    let pool = u1 < P.deadEndBias && tips.length > 0 ? tips : near;
    if (pool.length === 0) pool = tips.length > 0 ? tips : any;
    let u = u2;
    const pull = P.roamPull;
    if (pull > 0 && pool.length > 0 && !this.invisible()) {
      if (u2 < pull) {
        u = u2 / pull;
        const nearer = this.nearerThePlayer(pool, here);
        if (nearer.length > 0) pool = nearer;
      } else {
        u = (u2 - pull) / (1 - pull);
      }
    }
    this.dest = pool.length > 0 ? pool[Math.min(pool.length - 1, Math.floor(u * pool.length))] : -1;
  }

  // K174: the candidates nearer the player than `here`, along the threads
  // the minotaur may use (pool order kept).
  private nearerThePlayer(pool: readonly number[], here: number): number[] {
    const g = this.g;
    const p = this.player;
    const base = g.spotToVertex(p, here, true);
    const out: number[] = [];
    for (const v of pool) {
      if (g.spotToVertex(p, v, true) < base) out.push(v);
    }
    return out;
  }

  // Where roaming distances are measured from: its vertex, or the exit
  // tail's junction while it stands in its lair.
  private roamAnchor(): number {
    const g = this.g;
    const m = this.mino;
    const v = m.edge < 0 ? m.vertex : g.ahead(m);
    if (v !== g.exit) return v;
    const tail = g.adj[v][0];
    return tail === undefined ? v : g.ea[tail] === v ? g.eb[tail] : g.ea[tail];
  }

  // Wandering at its vertex: picks a destination when it has none or
  // stands on it (out of its lair), then roamEdgeFrom. Null = stay.
  private roamEdge(): [number, 1 | -1] | null {
    const v = this.mino.vertex;
    if (v !== this.g.exit && (this.dest < 0 || this.dest === v)) this.pickDest();
    const r = this.roamEdgeFrom(v, this.dest);
    if (r !== null || this.g.blockedCount === 0 || v === this.g.exit) return r;
    // K137-b: a break cut its destination off; pick again (a pick draws
    // only destinations it can reach).
    this.pickDest();
    return this.roamEdgeFrom(v, this.dest);
  }

  // Wandering at vertex v toward `dest`: the first run of the shortest
  // route there (the exit tail out of its lair). Pure (K324 2.2: the chase
  // and plan() both ask it). Null = stay, or no destination.
  roamEdgeFrom(v: number, dest = this.dest): [number, 1 | -1] | null {
    const g = this.g;
    if (v === g.exit) {
      const tail = g.adj[v][0];
      if (tail === undefined) return null;
      return [tail, g.ea[tail] === v ? 1 : -1];
    }
    if (dest < 0) return null;
    // K324 stage 3: a guard inside its territory, bound for a vertex in it,
    // keeps to the territory's runs.
    let ok: Uint8Array | null = null;
    if (this.params.model === "guard") {
      const t = this.territory();
      if (t.vin[v] && t.vin[dest]) ok = t.ein;
    }
    const toDest = ok ? this.territoryRoute(dest) : g.from(dest, true);
    let best: [number, 1 | -1] | null = null;
    let bestCost = Infinity;
    for (const eid of g.adj[v]) {
      if (g.barred[eid] || g.blocked[eid]) continue;
      if (ok && !ok[eid]) continue;
      const far = g.ea[eid] === v ? g.eb[eid] : g.ea[eid];
      const cost = g.len[eid] + toDest[far];
      if (cost < bestCost) {
        bestCost = cost;
        best = [eid, g.ea[eid] === v ? 1 : -1];
      }
    }
    return best;
  }

  // Hunting at vertex v: the run that starts the shortest path to the
  // player's exact position (a self-loop the player is on: the shorter way
  // round). Pure (K324 2.2). Null = no way (it loses them next detect()).
  huntEdgeFrom(v: number): [number, 1 | -1] | null {
    const g = this.g;
    const p = this.player;
    // K137-b: you are coming out of a broken run at v: it waits for you.
    if (g.blockedCount > 0 && this.awaits(v)) return null;
    let best: [number, 1 | -1] | null = null;
    let bestCost = Infinity;
    for (const eid of g.adj[v]) {
      if (g.barred[eid] || g.blocked[eid]) continue;
      const L = g.len[eid];
      const fromA = g.ea[eid] === v;
      let cost: number;
      let dir: 1 | -1 = fromA ? 1 : -1;
      if (p.edge === eid) {
        if (g.ea[eid] === v && g.eb[eid] === v) {
          dir = p.pos <= L - p.pos ? 1 : -1;
          cost = Math.min(p.pos, L - p.pos);
        } else {
          cost = fromA ? p.pos : L - p.pos;
        }
      } else {
        const far = fromA ? g.eb[eid] : g.ea[eid];
        cost = L + g.spotToVertex(p, far, true);
      }
      if (cost < bestCost) {
        bestCost = cost;
        best = [eid, dir];
      }
    }
    return best;
  }

  // Hunting mid-run at spot m: whether the way behind is clearly shorter
  // (by more than turnBack), so it turns back. Pure (K324 2.2).
  shouldReverse(m: Spot = this.mino): boolean {
    const g = this.g;
    const p = this.player;
    // K137-b: on a run that broke it finishes the run.
    if (m.edge < 0 || g.blocked[m.edge]) return false;
    const L = g.len[m.edge];
    const toEnd = m.dir > 0 ? L - m.pos : m.pos;
    const ahead = m.dir > 0 ? g.eb[m.edge] : g.ea[m.edge];
    const behind = m.dir > 0 ? g.ea[m.edge] : g.eb[m.edge];
    let fwd = g.barred[m.edge] && ahead === g.exit ? Infinity : toEnd + g.spotToVertex(p, ahead, true);
    let back = g.barred[m.edge] && behind === g.exit ? Infinity : L - toEnd + g.spotToVertex(p, behind, true);
    if (p.edge === m.edge) {
      const delta = p.pos - m.pos;
      if (delta * m.dir >= 0) fwd = Math.min(fwd, Math.abs(delta));
      else back = Math.min(back, Math.abs(delta));
    }
    return back + this.params.turnBack < fwd;
  }

  // K324 2.2: the route it will take next, for the telegraph. Read-only:
  // it changes nothing and draws nothing, and it asks the choice functions
  // the chase uses (roamEdgeFrom, huntEdgeFrom, shouldReverse).
  // - Roaming: its current run (lead), then up to `reach` runs of its
  //   route to the destination, `dest` set when the route reaches it; at
  //   a vertex (a junction stop, a rest) the runs from there; a rest at a
  //   destination already shows the next leg (picked on arrival, 2.3). No
  //   destination yet (a catch's pause with minoLair off: it picks one when
  //   it leaves): nothing after the lead.
  // - Hunting: its current run in the direction it will keep, then up to
  //   `reach` runs toward the player's spot now (live: it follows them).
  // - In its lair: nothing, except the exit tail's run during the last
  //   LAIR_TELL s of its wait.
  // - K324 stage 3: the guard's hunt and the stalker read their next
  //   decisions ahead (decideFrom at decisions, decisions + 1, ...), from
  //   the player's spot now: up to `reach` runs, stopping where they meet
  //   the player while they track them (hunting, or a stalker that sees
  //   them); the guard roams as above, within its territory.
  // reach 0 = the lead only.
  plan(reach: number): ChasePlan {
    const g = this.g;
    const m = this.mino;
    const P = this.params;
    const hunting = this.mode === "hunt";
    const deciding = P.model === "stalker" || (P.model === "guard" && hunting);
    const out: ChasePlan = { lead: null, steps: [], dest: -1, hunting };
    const n = Math.min(PLAN_REACH_MAX, Math.max(0, Math.floor(reach) || 0));
    // K137 s3b: slain, no plan; fleeing, its flee route (fleeEdgeFrom on).
    if (this.slain) return { lead: null, steps: [], dest: -1, hunting: false };
    if (this.fleeing) return this.fleePlan(n);
    if (this.mode === "lair") {
      if (m.edge >= 0 || this.timer > ticksOf(LAIR_TELL)) return out;
      const first = this.roamEdgeFrom(m.vertex, -1);
      if (first) out.steps.push([first[0], first[1] > 0 ? g.eb[first[0]] : g.ea[first[0]]]);
      return out;
    }
    let v: number;
    let back = this.lastEdge;
    if (m.edge >= 0) {
      const turns = hunting && this.aimed && this.shouldReverse(m);
      const dir = turns ? (m.dir > 0 ? -1 : 1) : m.dir;
      out.lead = { edge: m.edge, pos: m.pos, dir };
      v = dir > 0 ? g.eb[m.edge] : g.ea[m.edge];
      back = m.edge;
    } else {
      v = m.vertex;
    }
    const p = this.player;
    const dest = this.dest;
    const tracking = hunting || (P.model === "stalker" && !this.invisible());
    if (!hunting && !deciding) {
      if (dest >= 0 && v === dest && out.lead) {
        out.dest = dest;
        return out;
      }
      if (v !== g.exit && (dest < 0 || dest === v)) return out;
    } else if (tracking && out.lead && (p.edge === out.lead.edge || (p.edge < 0 && p.vertex === v))) {
      return out; // It meets the player on this run.
    }
    let k = this.decisions;
    for (let i = 0; i < n; i++) {
      let choice: [number, 1 | -1] | null;
      if (deciding) {
        const d = this.decideFrom(v, k, back);
        if (d.drew) k++;
        choice = d.choice;
      } else {
        choice = hunting ? this.huntEdgeFrom(v) : this.roamEdgeFrom(v, dest);
      }
      if (!choice) break;
      const [eid, dir] = choice;
      const far = dir > 0 ? g.eb[eid] : g.ea[eid];
      out.steps.push([eid, far]);
      v = far;
      back = eid;
      if (tracking) {
        if (p.edge === eid || (p.edge < 0 && p.vertex === far)) break;
      } else if (!deciding && far === dest) {
        out.dest = dest;
        break;
      }
    }
    return out;
  }

  // K137 s3b: the flee's plan: the run it is on in its direction, then
  // fleeEdgeFrom's runs from where you stand now, until it would hold.
  private fleePlan(n: number): ChasePlan {
    const g = this.g;
    const m = this.mino;
    const out: ChasePlan = { lead: null, steps: [], dest: -1, hunting: false };
    let v: number;
    if (m.edge >= 0) {
      out.lead = { edge: m.edge, pos: m.pos, dir: m.dir };
      v = m.dir > 0 ? g.eb[m.edge] : g.ea[m.edge];
    } else {
      v = m.vertex;
    }
    for (let i = 0; i < n; i++) {
      const choice = this.fleeEdgeFrom(v);
      if (!choice) break;
      const [eid, dir] = choice;
      const far = dir > 0 ? g.eb[eid] : g.ea[eid];
      out.steps.push([eid, far]);
      v = far;
    }
    return out;
  }

  // Spotting and losing the player: the hunter's and the stalker's charge
  // read the shared sight (detectStart / detectEnd), the guard its own
  // (guardDetect / guardLose). Lost, the hunter and the guard check where
  // they last saw you; the stalker stalks on.
  private detect(out: ChaseEvent[]): void {
    const P = this.params;
    const d = this.huntDistance();
    const guard = P.model === "guard";
    if (this.mode === "hunt") {
      if (d > (guard ? P.guardLose : P.detectEnd)) {
        this.mode = "wander";
        this.dest = P.model === "stalker" ? -1 : this.lastSeen();
        this.legPace = P.wanderPace;
        out.push({ kind: "lost" });
      }
    } else if (this.mode !== "lair" && d <= (guard ? P.guardDetect : P.detectStart)) {
      this.mode = "hunt";
      this.timer = 0;
      out.push({ kind: "spotted" });
    }
  }

  // Where it looks for a player it lost: the vertex they were heading to,
  // unless that is a tail's end (then the tail's junction).
  private lastSeen(): number {
    const g = this.g;
    const p = this.player;
    const v = g.ahead(p);
    if (v !== g.start && v !== g.exit) return v;
    if (p.edge >= 0) {
      const other = p.dir > 0 ? g.ea[p.edge] : g.eb[p.edge];
      if (other !== g.start && other !== g.exit) return other;
    }
    return -1;
  }
}

// Rebuild a chase from its inputs: a fresh sim, each tap applied before
// the tick it was made at, run to `ticks`. Equal to the live run, bit for
// bit (the test pins it).
export function replayChase(
  walk: WalkGraph,
  params: ChaseParams,
  seed: number,
  inputs: readonly ChaseInput[],
  ticks: number,
  limits: ArrayLike<number> | null = null,
  sword: { spot: number; mode: "timed" | "oneuse"; moves: number } | null = null,
  sprints: readonly number[] = []
): MinotaurChase {
  const sim = new MinotaurChase(walk, params, seed);
  if (limits) sim.setBreakLimits(limits);
  if (sword) sim.setSword(newSword(sword.spot, sword.mode, sword.moves));
  let k = 0;
  let s = 0;
  while (sim.tick < ticks) {
    while (k < inputs.length && inputs[k].tick === sim.tick) {
      sim.tap(inputs[k].edge);
      k++;
    }
    // K137 s3c: a sprint armed before this tick (after its taps: main.ts
    // arms between frames, and a tap and an arm in one tick commute).
    while (s < sprints.length && sprints[s] === sim.tick) {
      sim.sprint();
      s++;
    }
    sim.step();
  }
  return sim;
}
