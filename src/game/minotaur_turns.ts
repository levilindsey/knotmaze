// K481 (stage 1, docs/design/K481.md): with TurnConfig.byLength the
// turn travel below is by thread length instead of runs; see TURNS BY LENGTH
// in .claude/rules/gameplay-minotaur.md. Off by default, no param yet.
//
// K80 turns (stage 1, 2026-10-14; brief docs/design/K80_turns.md): the
// turn-aligned minotaur, a modifier of the normal turn-based maze (clock
// "turn"). It moves when you move: every accepted tap is one turn, and the
// minotaur moves `speed` runs in it. Real time's chase is minotaur.ts.
//
// PORTED FROM THE RESEARCH HARNESS (.claude/probes/K80/sim.ts, section 0 of
// docs/design/K80_gameplay_additions.md): mix32, TurnRng, decide (its "prox"
// and "chase" policies), wanderDest and contact are line-for-line ports, the
// same draws in the same order, candidates sorted by run id and roam
// destinations drawn in vertex index order, so the harness's games and this
// module's are the same games (test/game/minotaur_turns.test.ts and the
// stage 1 comparison in .claude/probes/K80/turns/ check it).
//
// THE RULES (section 2.2):
// - A turn is one accepted tap (a run, or a wait: your own junction). The
//   minotaur moves `speed` runs: 0.5 (every other turn), 1, or 2; "charge"
//   is 1 that becomes 2 while it hunts you.
// - Contact is SIMULTANEOUS and CONTINUOUS: you are caught when you both
//   end on the same vertex, cross head-on on one run, or you arrive where it
//   stands. Stepping onto the junction it is LEAVING by another run is safe.
//   A wait is caught when its path touches your junction at all.
// - THE TELEGRAPH commits its next move at the end of your previous one,
//   from where you stood, and the game shows it. Without it, it decides
//   after seeing your tap (reactive). Two runs a move forces it on (section
//   2.6): a reactive two-run minotaur is unfair.
// - THE SANCTUARY: the entrance END. It never enters it and cannot see you
//   there. ITS LAIR: the exit END, which it leaves on its first move and
//   never returns to; a catch sends it back. A run onto the exit END is
//   always a win, even with it still in its lair (the harness would call
//   that a catch; real time's tails are a sanctuary too).
// - A CATCH sends you to the entrance and it to its lair, and is counted.
//   Its sleep and its half-speed parity count from there (lifeTurn); its
//   random draws stay on the game's turn counter, so a second life does
//   not replay the first.
// All randomness is counter-based, a pure function of (seed, turn, call):
// the same taps give the same minotaur, and a game replays from its taps.

import type { WalkGraph } from "../core/walk_graph";
import { ChaseGraph, type MinotaurMode, type Spot } from "./minotaur";
import { swordFleeing, swordSpend, swordTake, swordTouch, type SwordState } from "./sword";
import { LURE_RANGE, lureTarget } from "./lures";
import { mudStep } from "./mud"; // K137 s5
import {
  canSnare,
  heldIndex,
  holdTurn,
  releaseSnares,
  SNARE_HOLD,
  snareCut,
  springSnare,
  type Snare,
} from "./snares";
import {
  FOLLOW_SHORTCUT,
  followDelay,
  monsterRng,
  type MonsterKind,
  type MonsterPhase,
  type MonsterSpec,
} from "./monsters";

// The `minotaur` param: off, or the movement model (section 2.3). K80
// stage 3 appends "abbott".
export type TurnMinotaurSetting = "off" | "hunter" | "guard" | "stalker";
export const MINOTAUR_SETTINGS: readonly TurnMinotaurSetting[] = [
  "off",
  "hunter",
  "guard",
  "stalker",
];

// The `minoSpeed` param: runs a turn. charge = one, two while it hunts.
export type TurnSpeed = "half" | "one" | "charge" | "two";
export const TURN_SPEEDS: readonly TurnSpeed[] = ["half", "one", "charge", "two"];

// What the params give the model (url_state.ts turnMinoParamsOf).
export interface TurnMinoParams {
  model: TurnMinotaurSetting;
  speed: TurnSpeed;
  telegraph: boolean;
  sight: number; // runs: it hunts you within this many runs...
  // runs: ...and gives up beyond sight + giveUp, then checks where it last
  // saw you (K324 section 4.3, K80 turns 3a; was LOSE_MARGIN 3).
  giveUp: number;
  roam: number; // runs: the hunter's farthest roam destination
  // runs: the hunter's nearest roam destination, at most `roam` (K324
  // section 4.3, K80 turns 3a; was ROAM_MIN 3).
  roamMin: number;
  territory: number; // runs from the exit junction: the guard's ground
  accuracy: number; // [0, 1]: chance a hunting step is a best one
  pause: number; // [0, 1]: chance it stands still for a turn
  sleep: number; // turns in its lair before it first moves
  // [0, 1]: chance a roam destination is one nearer you than it stands
  // (K80 turns 3a: real time's roamPull, in runs; 0 = the plain pick).
  pull: number;
  // K80 turns stage 2 (K273): a catch sends it back to its lair (true), or
  // leaves it where its turn ended (false).
  lair: boolean;
  // K481 stage 2: travel by thread length (the `minoByLength` param).
  byLength: boolean;
  // K795: the turns a snare holds (`snareHold`; SNARE_HOLD when absent) and
  // the runs a lure is heard within (`lureRange`; LURE_RANGE when absent).
  snareHold?: number;
  lureRange?: number;
}

// The defaults: the research's hunter (section 0: prox, stall 0.1, roam 3-8
// runs; the guard's territory 1-6), RETUNED for today's mazes (K80 turns
// stage 2, K269): section 0's see 4 and q 0.9 caught an attentive explorer
// on 18% of today's dailies and an 80% one on 36% (section 0: 1% and 13%);
// sight 2 and accuracy 0.3 give 1.0% and 13.1% (64 reps of dailies 1-30,
// .claude/probes/K80/turns2/sweep_fine64.md).
export const DEFAULT_TURN_MINO: Readonly<TurnMinoParams> = Object.freeze({
  model: "off",
  speed: "one",
  telegraph: true,
  sight: 2,
  giveUp: 3,
  roam: 8,
  roamMin: 3,
  territory: 6,
  accuracy: 0.3,
  pause: 0.1,
  sleep: 0,
  pull: 0,
  lair: true,
  byLength: false,
});

// K294 (K80 turns 3a): per-model defaults. DEFAULT_TURN_MINO's sight and
// accuracy are the HUNTER's; the guard has its own sight and accuracy and
// the stalker its own accuracy (its charge reads the shared sight). The
// params carry them as their own rows (url_state.ts minoGuardSight,
// minoGuardAccuracy, minoStalkerAccuracy), and turnMinoParamsOf picks by
// model. Tuned toward section 0's % caught on the three sets (the
// stalker's: chase1/T, section 0's stalker at accuracy 1): the guard
// keeps accuracy 0.3 and sees 4 runs (stage 1's sight), the stalker steps
// best 0.45 of the time (`.claude/probes/K80/stage3/sweep_3a_*64.md`; the
// table is in docs/design/K80_turns_stage3.md's handoff). K421 (Levi,
// 2026-10-20) took the stalker's accuracy to 0.3, the value stage 2's
// dailies-only criterion kept (the handoff's OPEN FOR LEVI: 0.45 overshot
// section 0 on the daily 80% and fog-4 cells).
export const TURN_MODEL_DEFAULTS = Object.freeze({
  guard: Object.freeze({ sight: 4, accuracy: 0.3 }),
  stalker: Object.freeze({ accuracy: 0.3 }),
});

// The defaults one model plays with: DEFAULT_TURN_MINO plus that model's
// rows from TURN_MODEL_DEFAULTS.
export function turnMinoDefaults(model: TurnMinotaurSetting): TurnMinoParams {
  const p: TurnMinoParams = { ...DEFAULT_TURN_MINO, model };
  if (model === "guard") {
    p.sight = TURN_MODEL_DEFAULTS.guard.sight;
    p.accuracy = TURN_MODEL_DEFAULTS.guard.accuracy;
  } else if (model === "stalker") {
    p.accuracy = TURN_MODEL_DEFAULTS.stalker.accuracy;
  }
  return p;
}

// K481: the by-length catch distance, tuned on the turn sim from the
// real-time chase's 1 (stage 1: 0 is closest to today's rates, since
// continuous crossing already catches what the runs rule caught only at
// vertices; .claude/probes/K481/sweep_length_32.md).

export const BY_LENGTH_CATCH_DIST = 0;

// K501 (Levi, 2026-10-16): the by-length TRAVEL SCALE. Travel is the
// speed factor times the player's move length times this scale (a wait:
// the median run length). At scale 1 the mode ran deadlier than today's
// runs mode for the attentive explorer (stalker daily explorer 3.4%
// today -> 8.9% by-length; at speed one it averages 1.69 hops a turn, its
// runs shorter than the player's picks), which no catch distance in
// [0, 1] offsets. Tuned on the turn sim toward today's nine-cell catch
// rates (stage 2; .claude/probes/K481/sweep_scale_32.md); a code
// constant, not a panel row - the panel carries only the toggle
// (decision 1). LENGTH_GAMES is pinned at this value.
export const BY_LENGTH_TRAVEL_SCALE = 0.65;

// The harness's MinoConfig, trimmed to the two policies stage 1 ships, so
// the comparison can pass the harness's own configs.
export interface TurnConfig {
  policy: "prox" | "chase";
  speed: number; // runs per turn: 0.5, 1 or 2
  telegraph: boolean;
  q?: number; // P(an optimal step) while hunting (default 1)
  stall?: number; // P(standing still) per turn (default 0)
  rMin?: number; // roam destinations: run distance range (default 3-8)
  rMax?: number;
  see?: number; // prox: hunts within `see` runs (default 4)...
  lose?: number; // ...gives up beyond `lose` (default 7), checks the last-seen spot
  sleep?: number; // turns before it first moves
  home?: boolean; // roam destinations around the exit junction (the guard)
  chaseSpeed?: number; // runs per turn while it hunts you (charge)
  lair?: boolean; // a catch sends it to its lair (default true; K273)
  pull?: number; // P(a roam destination nearer you) (default 0; K80 turns 3a)
  // K481 (stage 1): travel by thread length instead of by runs. Off by
  // default; stage 2 wires the `minoByLength` param to it. Decisions stay
  // in runs (sight, roam, give-up, territory); only the travel changes.
  byLength?: boolean;
  // K501: travel scale (travel = speed factor x player length x scale;
  // default 1 here; turnConfig sets BY_LENGTH_TRAVEL_SCALE).
  travelScale?: number;
  // K481: thread distance at which a by-length contact catches (lattice
  // units; default BY_LENGTH_CATCH_DIST).
  catchDist?: number;
  // K795: turns a sprung snare holds (default SNARE_HOLD) and runs a lure is
  // heard within (default LURE_RANGE). turnConfig sets each only off its
  // default, so a default design's config is what it was.
  snareHold?: number;
  lureRange?: number;
}

// Two runs a move, or a charge, forces the telegraph on (section 2.6).
export function telegraphOn(p: Pick<TurnMinoParams, "telegraph" | "speed">): boolean {
  return p.telegraph || p.speed === "two" || p.speed === "charge";
}

export function turnConfig(p: TurnMinoParams): TurnConfig {
  const base: TurnConfig = {
    policy: "prox",
    speed: p.speed === "half" ? 0.5 : p.speed === "two" ? 2 : 1,
    telegraph: telegraphOn(p),
    q: p.accuracy,
    stall: p.pause,
    see: p.sight,
    lose: p.sight + p.giveUp,
    sleep: p.sleep,
  };
  if (p.lair === false) base.lair = false;
  if (p.byLength) {
    base.byLength = true;
    base.catchDist = BY_LENGTH_CATCH_DIST;
    base.travelScale = BY_LENGTH_TRAVEL_SCALE;
  }
  if (p.speed === "charge") base.chaseSpeed = 2;
  if (p.snareHold !== undefined && p.snareHold !== SNARE_HOLD) base.snareHold = p.snareHold;
  if (p.lureRange !== undefined && p.lureRange !== LURE_RANGE) base.lureRange = p.lureRange;
  if (p.model === "stalker") return { ...base, policy: "chase" };
  if (p.pull > 0) base.pull = p.pull;
  if (p.model === "guard") return { ...base, home: true, rMin: 1, rMax: p.territory };
  return { ...base, rMin: Math.min(p.roamMin, p.roam), rMax: p.roam };
}

export function mix32(x: number): number {
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

// Counter-based draws: next() is a pure function of (seed, turn, k).
export class TurnRng {
  readonly seed: number;
  private turn = 0;
  private k = 0;
  constructor(seed: number) {
    this.seed = seed;
  }
  at(turn: number): this {
    this.turn = turn;
    this.k = 0;
    return this;
  }
  next(): number {
    const a = mix32((this.turn * 0x9e3779b1 + 0x632be5ab) >>> 0);
    const b = mix32((this.k++ * 0x85ebca6b + 0x1b873593) >>> 0);
    return mix32((this.seed ^ a ^ (b * 3)) >>> 0) / 4294967296;
  }
}

// K137-b: the run count between two vertices a broken run has cut apart.
// Larger than any real count, so every "within sight" or "nearer" test
// reads it as far, and the deciders below treat it as unreachable. It
// appears only in a graph with blocked runs.
export const UNREACH = 32767;

// The walk graph for turns: real time's index arrays (the renderer reads
// them) plus all-pairs run counts and the exit tail's junction.
export class TurnGraph {
  readonly chase: ChaseGraph;
  readonly n: number;
  readonly hop: Int16Array; // n x n run counts, -1 = unreachable
  readonly exitJ: number;
  // K481: the median run (thread) length; a wait travels this times the
  // speed factor in the by-length mode.
  readonly medianLength: number;
  // K137-b: the broken runs (1 = blocked), or null while none is. The hop
  // matrix is then over the unbroken runs, UNREACH across a cut.
  readonly blocked: Uint8Array | null;

  constructor(walk: WalkGraph | ChaseGraph, blocked: Uint8Array | null = null) {
    const g = (this.chase = walk instanceof ChaseGraph ? walk : new ChaseGraph(walk));
    this.blocked = blocked;
    const n = (this.n = g.ids.length);
    this.hop = new Int16Array(n * n).fill(-1);
    const queue = new Int32Array(n);
    for (let s = 0; s < n; s++) {
      const row = s * n;
      this.hop[row + s] = 0;
      let qh = 0;
      let qt = 0;
      queue[qt++] = s;
      while (qh < qt) {
        const v = queue[qh++];
        const d = this.hop[row + v];
        for (const e of g.adj[v]) {
          if (blocked !== null && blocked[e] === 1) continue;
          const w = this.other(e, v);
          if (this.hop[row + w] >= 0) continue;
          this.hop[row + w] = d + 1;
          queue[qt++] = w;
        }
      }
    }
    if (blocked !== null) {
      for (let i = 0; i < this.hop.length; i++) if (this.hop[i] < 0) this.hop[i] = UNREACH;
    }
    this.exitJ = this.other(g.adj[g.exit][0], g.exit);
    const lens = Array.from(g.len).sort((a, b) => a - b);
    const mid = lens.length >> 1;
    this.medianLength =
      lens.length === 0 ? 0 : lens.length % 2 === 1 ? lens[mid] : (lens[mid - 1] + lens[mid]) / 2;
  }

  get start(): number {
    return this.chase.start;
  }
  get exit(): number {
    return this.chase.exit;
  }
  hopd(a: number, b: number): number {
    return this.hop[a * this.n + b];
  }
  other(e: number, v: number): number {
    return this.chase.ea[e] === v ? this.chase.eb[e] : this.chase.ea[e];
  }
  // K137-b: is run e broken?
  isBlocked(e: number): boolean {
    return this.blocked !== null && this.blocked[e] === 1;
  }
  // K137-b: the same graph with these runs blocked (a fresh hop matrix;
  // the ChaseGraph and its index arrays are shared).
  withBlocked(blocked: Uint8Array): TurnGraph {
    return new TurnGraph(this.chase, blocked);
  }
}

// The minotaur's plan state (the harness's Mino).
export interface MinoState {
  // K481: where it stands along the threads. At a vertex, edge < 0 and
  // vertex === v. Mid-run, v is the vertex it is heading to (the run's far
  // end in its direction of travel) and spot is on that run.
  v: number;
  prev: number;
  dest: number; // roam destination, -1 = none
  mode: number; // prox: 0 roam, 1 hunt, 2 to where it last saw you
  lastSeen: number;
  left: boolean; // has left its lair
  spot: Spot;
  // K137 s4 (4.10): a lure it heard (game/lures.ts): the vertex it heads
  // for before its model's rules, -1 or absent = none. Absent until a lure
  // is heard, so a game without lures carries no such field.
  lure?: number;
  // K137 s5: it crossed into mud last turn and spends this one in it.
  // Absent until it first crosses mud, so mud-free games carry none.
  mudWait?: boolean;
}

// One step of a turn: [run, the vertex it ends on].
export type TurnStep = [number, number];

export function cloneMino(m: MinoState): MinoState {
  return { ...m, spot: { ...m.spot } };
}

export function spotAtVertex(v: number): Spot {
  return { edge: -1, pos: 0, dir: 1, vertex: v };
}

export function initMino(g: TurnGraph): MinoState {
  return { v: g.exit, prev: -1, dest: -1, mode: 0, lastSeen: -1, left: false, spot: spotAtVertex(g.exit) };
}

function allowed(g: TurnGraph, w: number): boolean {
  return w !== g.start && w !== g.exit;
}

// Neighbors it may step to.
function moves(g: TurnGraph, v: number): TurnStep[] {
  const out: TurnStep[] = [];
  for (const e of g.chase.adj[v]) {
    if (g.isBlocked(e)) continue;
    const w = g.other(e, v);
    if (w === v || !allowed(g, w)) continue;
    out.push([e, w]);
  }
  return out;
}

// K137-b: the ends a mid-run spot may head for: both, or only the one
// ahead on a broken run (it finishes the run it was on, call 1).
function spotEnds(g: TurnGraph, s: Spot): number[] {
  const ahead = spotAhead(g, s);
  const behind = spotBehind(g, s);
  return ahead === behind || g.isBlocked(s.edge) ? [ahead] : [ahead, behind];
}

function pick<T>(arr: T[], rng: TurnRng): T {
  return arr[Math.min(arr.length - 1, Math.floor(rng.next() * arr.length))];
}

function stepToward(g: TurnGraph, v: number, target: number, rng: TurnRng): TurnStep | null {
  const d = g.hopd(v, target);
  if (d <= 0 || d >= UNREACH) return null;
  const c = moves(g, v).filter(([, w]) => g.hopd(w, target) === d - 1);
  if (c.length === 0) return null;
  c.sort((a, b) => a[0] - b[0]);
  return pick(c, rng);
}

function stepRandom(g: TurnGraph, m: MinoState, noReverse: boolean, rng: TurnRng): TurnStep | null {
  let c = moves(g, m.v);
  if (noReverse && c.length > 1) c = c.filter(([, w]) => w !== m.prev);
  if (c.length === 0) return null;
  c.sort((a, b) => a[0] - b[0]);
  return pick(c, rng);
}

// K481: spot helpers. A mid-run state's v is the vertex ahead, so the
// vertex behind is the run's other end.
export function spotAhead(g: TurnGraph, s: Spot): number {
  if (s.edge < 0) return s.vertex;
  return s.dir > 0 ? g.chase.eb[s.edge] : g.chase.ea[s.edge];
}

export function spotBehind(g: TurnGraph, s: Spot): number {
  if (s.edge < 0) return s.vertex;
  return s.dir > 0 ? g.chase.ea[s.edge] : g.chase.eb[s.edge];
}

function spotCoord(g: TurnGraph, s: Spot, e: number): number {
  if (s.edge === e) return s.pos;
  return s.vertex === g.chase.ea[e] ? 0 : g.chase.len[e];
}

function stepTowardSpot(g: TurnGraph, m: MinoState, target: number, rng: TurnRng): TurnStep | null {
  const s = m.spot;
  const cands: TurnStep[] = [];
  for (const w of spotEnds(g, s)) {
    if (!allowed(g, w)) continue;
    cands.push([s.edge, w]);
  }
  if (cands.length === 0) return null;
  let best = Infinity;
  for (const [, w] of cands) best = Math.min(best, g.hopd(w, target));
  if (!Number.isFinite(best) || best < 0 || best >= UNREACH) return null;
  const c = cands.filter(([, w]) => g.hopd(w, target) === best);
  return pick(c, rng);
}

function stepRandomSpot(g: TurnGraph, m: MinoState, noReverse: boolean, rng: TurnRng): TurnStep | null {
  const s = m.spot;
  let c: TurnStep[] = [];
  for (const w of spotEnds(g, s)) {
    if (!allowed(g, w)) continue;
    c.push([s.edge, w]);
  }
  if (noReverse && c.length > 1) c = c.filter(([, w]) => w !== m.prev);
  if (c.length === 0) return null;
  return pick(c, rng);
}

function stepTowardAny(g: TurnGraph, m: MinoState, target: number, rng: TurnRng): TurnStep | null {
  return m.spot.edge < 0 ? stepToward(g, m.v, target, rng) : stepTowardSpot(g, m, target, rng);
}

function stepRandomAny(g: TurnGraph, m: MinoState, noReverse: boolean, rng: TurnRng): TurnStep | null {
  return m.spot.edge < 0 ? stepRandom(g, m, noReverse, rng) : stepRandomSpot(g, m, noReverse, rng);
}

// The by-length speed factor for a turn decided from `m` with the player
// at `p` (K481 decision 2): cfg.speed, or the charge speed while it hunts
// or has the player in sight. Half is 0.5x every turn here, not every
// other turn as in the runs mode; sleep and pause still gate the turn.
// K501: the config's travel scale (1 when unset or garbled).
export function travelScaleOf(cfg: TurnConfig): number {
  const s = cfg.travelScale;
  return s !== undefined && Number.isFinite(s) && s > 0 ? s : 1;
}

export function lengthFactor(g: TurnGraph, cfg: TurnConfig, m: MinoState, p: number): number {
  let f = cfg.speed;
  if (cfg.chaseSpeed && p !== g.start) {
    const near = g.hopd(m.v, p) <= (cfg.see ?? 4);
    if (cfg.policy === "chase" ? near : m.mode === 1 || near) f = Math.max(f, cfg.chaseSpeed);
  }
  return f;
}

// A roam destination: a junction rMin..rMax runs from v. THE PULL (K80
// turns 3a, real time's roamPull in runs, minotaur.ts pickDest): with chance
// cfg.pull it is drawn only among those nearer the player p than the
// minotaur's own junction `at`, when there are any and p is seen (p < 0 on
// the start: it pulls nothing). It splits the one draw u: below pull,
// u / pull picks among the nearer; above, (u - pull) / (1 - pull) among
// all, so pull 0 is the plain pick exactly.
function wanderDest(
  g: TurnGraph,
  cfg: TurnConfig,
  v: number,
  rng: TurnRng,
  at: number,
  p: number
): number {
  const lo = cfg.rMin ?? 3;
  const hi = cfg.rMax ?? 8;
  let c: number[] = [];
  for (let w = 0; w < g.n; w++) {
    if (g.chase.isEnd[w]) continue;
    const d = g.hopd(v, w);
    if (d >= lo && d <= hi) c.push(w);
  }
  if (c.length === 0) return -1;
  let u = rng.next();
  const pull = cfg.pull ?? 0;
  if (pull > 0 && p >= 0) {
    if (u < pull) {
      u /= pull;
      const base = g.hopd(at, p);
      const nearer = c.filter((w) => {
        const d = g.hopd(w, p);
        return d >= 0 && d < base;
      });
      if (nearer.length > 0) c = nearer;
    } else {
      u = (u - pull) / (1 - pull);
    }
  }
  return c[Math.min(c.length - 1, Math.floor(u * c.length))];
}

// One turn of the minotaur, with the player standing at (or bound for) p:
// the steps it takes (empty = it stays). Mutates `m`. `turn` counts from
// its (re)spawn: its sleep and its half-speed parity.
export function decide(
  g: TurnGraph,
  cfg: TurnConfig,
  m: MinoState,
  p: number,
  turn: number,
  rng: TurnRng
): TurnStep[] {
  const out: TurnStep[] = [];
  if (turn <= (cfg.sleep ?? 0)) return out;
  if (cfg.speed < 1 && turn % 2 === 0) return out;
  let steps = Math.max(1, Math.round(cfg.speed));
  if (cfg.chaseSpeed && p !== g.start) {
    // A charge while it has you in sight. The harness has it for prox only;
    // the stalker (chase) charges within sight too.
    const near = g.hopd(m.v, p) <= (cfg.see ?? 4);
    if (cfg.policy === "chase" ? near : m.mode === 1 || near) {
      steps = Math.max(steps, cfg.chaseSpeed);
    }
  }
  if (cfg.stall && rng.next() < cfg.stall) return out;
  // The player in the sanctuary is out of reach: hunters lose track. So is
  // one a broken run has cut off from it (K137-b).
  const visibleP = p === g.start || cutOff(g, m.v, p) ? -1 : p;
  const apply = (mv: TurnStep | null): void => {
    if (!mv) return;
    out.push(mv);
    m.prev = m.v;
    m.v = mv[1];
    m.left = true;
    m.spot = spotAtVertex(m.v);
  };
  for (let s = 0; s < steps; s++) {
    let mv: TurnStep | null = null;
    // K137 s4 (4.10): a lure it heard comes first; at it (or cut off from
    // it) the lure is spent and the model's rules decide.
    if (m.lure !== undefined && m.lure >= 0) {
      if (m.v === m.lure || cutOff(g, m.v, m.lure)) m.lure = -1;
      else {
        mv = stepToward(g, m.v, m.lure, rng);
        if (mv) {
          apply(mv);
          if (m.v === m.lure) m.lure = -1;
          continue;
        }
        m.lure = -1;
      }
    }
    if (cfg.policy === "chase") {
      if (visibleP < 0) mv = stepRandom(g, m, true, rng);
      else if (rng.next() < (cfg.q ?? 1)) mv = stepToward(g, m.v, visibleP, rng);
      else mv = stepRandom(g, m, false, rng);
    } else {
      const d = visibleP < 0 ? Infinity : g.hopd(m.v, visibleP);
      if (d <= (cfg.see ?? 4)) m.mode = 1;
      else if (m.mode === 1 && d > (cfg.lose ?? 7)) m.mode = 2;
      if (m.mode === 1 && visibleP >= 0) {
        m.lastSeen = visibleP;
        mv =
          rng.next() < (cfg.q ?? 1)
            ? stepToward(g, m.v, visibleP, rng)
            : stepRandom(g, m, false, rng);
      } else if (m.mode === 2) {
        if (m.lastSeen < 0 || m.v === m.lastSeen || cutOff(g, m.v, m.lastSeen)) {
          m.mode = 0;
          m.dest = -1;
        } else {
          mv = stepToward(g, m.v, m.lastSeen, rng);
        }
      }
      if (m.mode === 0 && !mv) {
        if (m.dest < 0 || m.dest === m.v || cutOff(g, m.v, m.dest)) {
          m.dest = wanderDest(g, cfg, cfg.home ? g.exitJ : m.v, rng, m.v, visibleP);
        }
        mv =
          m.dest >= 0 && !cutOff(g, m.v, m.dest)
            ? stepToward(g, m.v, m.dest, rng)
            : stepRandom(g, m, true, rng);
      }
    }
    apply(mv);
  }
  return out;
}

// K137 s3b (4.7): one flee hop from `m` with the player at p: the move whose
// far end lies farthest from p in runs (one a broken run cuts off counts as
// farthest), ties to the lowest run id, no draw. At a vertex it holds when
// every move would close in; mid-run it takes the better end. Null: it holds.
function fleeHop(g: TurnGraph, m: MinoState, p: number): TurnStep | null {
  const mid = m.spot.edge >= 0;
  const cands: TurnStep[] = mid
    ? spotEnds(g, m.spot)
        .filter((w) => allowed(g, w))
        .map((w) => [m.spot.edge, w] as TurnStep)
    : moves(g, m.v);
  let best: TurnStep | null = null;
  let bestD = -1;
  for (const mv of cands) {
    const d = g.hopd(mv[1], p);
    if (d > bestD || (d === bestD && best !== null && mv[0] < best[0])) {
      best = mv;
      bestD = d;
    }
  }
  if (best === null) return null;
  if (!mid && bestD < g.hopd(m.v, p)) return null;
  return best;
}

// K137 s3b: one turn of the flee (runs): the speed's steps (no charge), each
// a fleeHop; still asleep in its lair it stays. It forgets its hunt and roam
// (mode 0), so it comes out of the flee roaming. Mutates `m`.
export function fleeTurn(g: TurnGraph, cfg: TurnConfig, m: MinoState, p: number, turn: number): TurnStep[] {
  const out: TurnStep[] = [];
  m.mode = 0;
  m.dest = -1;
  m.lastSeen = -1;
  if (m.lure !== undefined) m.lure = -1;
  if (!m.left && turn <= (cfg.sleep ?? 0)) return out;
  if (cfg.speed < 1 && turn % 2 === 0) return out;
  const steps = Math.max(1, Math.round(cfg.speed));
  for (let s = 0; s < steps; s++) {
    const mv = fleeHop(g, m, p);
    if (!mv) break;
    out.push(mv);
    m.prev = m.v;
    m.v = mv[1];
    m.left = true;
    m.spot = spotAtVertex(m.v);
  }
  return out;
}

// K481: one hop of a by-length route, decided from `m` (which may stand
// mid-run). The decision rules and draw order mirror decide()'s per-run
// step; arrival transitions (checking the last-seen vertex, picking a new
// roam destination) only fire at a vertex, so a mid-run hop first decides
// whether to continue or turn back toward the current target.
function decideLengthHop(
  g: TurnGraph,
  cfg: TurnConfig,
  m: MinoState,
  visibleP: number,
  rng: TurnRng
): TurnStep | null {
  const atVertex = m.spot.edge < 0;
  // K137 s4 (4.10): a lure it heard comes first, as in decide().
  if (m.lure !== undefined && m.lure >= 0) {
    if ((atVertex && m.v === m.lure) || cutOff(g, m.v, m.lure)) m.lure = -1;
    else {
      const lv = stepTowardAny(g, m, m.lure, rng);
      if (lv) return lv;
      m.lure = -1;
    }
  }
  if (cfg.policy === "chase") {
    if (visibleP < 0) return stepRandomAny(g, m, true, rng);
    if (rng.next() < (cfg.q ?? 1)) return stepTowardAny(g, m, visibleP, rng);
    return stepRandomAny(g, m, false, rng);
  }
  const d = visibleP < 0 ? Infinity : g.hopd(m.v, visibleP);
  if (d <= (cfg.see ?? 4)) m.mode = 1;
  else if (m.mode === 1 && d > (cfg.lose ?? 7)) m.mode = 2;
  let mv: TurnStep | null = null;
  if (m.mode === 1 && visibleP >= 0) {
    m.lastSeen = visibleP;
    mv =
      rng.next() < (cfg.q ?? 1)
        ? stepTowardAny(g, m, visibleP, rng)
        : stepRandomAny(g, m, false, rng);
  } else if (m.mode === 2) {
    if ((atVertex && (m.lastSeen < 0 || m.v === m.lastSeen)) || cutOff(g, m.v, m.lastSeen)) {
      m.mode = 0;
      m.dest = -1;
    } else if (m.lastSeen >= 0) {
      mv = stepTowardAny(g, m, m.lastSeen, rng);
    } else {
      m.mode = 0;
      m.dest = -1;
    }
  }
  if (m.mode === 0 && !mv) {
    if (m.dest < 0 || (atVertex && m.dest === m.v) || cutOff(g, m.v, m.dest)) {
      m.dest = wanderDest(g, cfg, cfg.home ? g.exitJ : m.v, rng, m.v, visibleP);
    }
    mv =
      m.dest >= 0 && !cutOff(g, m.v, m.dest)
        ? stepTowardAny(g, m, m.dest, rng)
        : stepRandomAny(g, m, true, rng);
  }
  return mv;
}

// K137 s4 (4.10, 4.30): a lure or a snare used before input `at` (free in
// time), recorded so that replayTurnMinotaur rebuilds it.
export interface TurnTool {
  at: number;
  kind: "lure" | "snare";
  edge: number;
}

// K137 s4 (4.30): cut a monster's path (decided from state `before` into
// `m`) at its first step onto a set snare: the path stops at that run's near
// end and m stands there. Returns the snare's index, or -1 (no cut). The
// rest of what the decision left in m (its mode, destination, lure) stays.
function cutAtSnare(snares: readonly Snare[], path: TurnStep[], before: MinoState, m: MinoState): number {
  const cut = snareCut(snares, path);
  if (cut === null) return -1;
  const i = cut.step;
  path.length = i;
  if (i === 0) {
    m.v = before.v;
    m.prev = before.prev;
    m.left = before.left;
  } else {
    m.v = path[i - 1][1];
    m.prev = i > 1 ? path[i - 2][1] : before.v;
  }
  m.spot = spotAtVertex(m.v);
  return cut.snare;
}

// K137 s5: cut a monster's path at its first step onto a muddy run: it
// CROSSES that run (the step stays) and its turn ends at the far end;
// it spends its next turn in the mud (mudWait). True when it crossed.
function cutAtMud(mud: ReadonlySet<number>, path: TurnStep[], before: MinoState, m: MinoState): boolean {
  const i = mudStep(mud, path);
  if (i < 0) return false;
  path.length = i + 1;
  m.v = path[i][1];
  m.prev = i > 0 ? path[i - 1][1] : before.v;
  m.spot = spotAtVertex(m.v);
  m.mudWait = true;
  return true;
}

// K137-b: has a broken run cut vertex b off from vertex a? Always false in
// a graph without blocked runs (and for b < 0), so the deciders' unblocked
// paths are unchanged.
function cutOff(g: TurnGraph, a: number, b: number): boolean {
  return g.blocked !== null && b >= 0 && g.hopd(a, b) >= UNREACH;
}

function lengthSegment(g: TurnGraph, m: MinoState, mv: TurnStep): number {
  const [e, w] = mv;
  const len = g.chase.len[e];
  if (m.spot.edge !== e) return len;
  const ahead = spotAhead(g, m.spot);
  if (w === ahead) {
    return m.spot.dir > 0 ? len - m.spot.pos : m.spot.pos;
  }
  return m.spot.dir > 0 ? m.spot.pos : len - m.spot.pos;
}

// A planned by-length route (K481 decisions 2-4): enough hops that its
// thread length covers `maxTravel`, decided from where the player stands.
// Where the travel outruns a roam destination the route EXTENDS past it
// (the next hop picks a new destination, as decide()'s loop does), so the
// mean travel stays the speed factor times the player's length; a hunting
// route stops at the player's vertex, as decide()'s steps do.
export interface TurnLengthPlan {
  from: number;
  fromSpot: Spot;
  fromState: MinoState;
  steps: TurnStep[];
  segLens: number[];
  cumLens: number[];
  totalLength: number;
  factor: number;
  maxTravel: number;
  stateAfter: MinoState;
  stepStates: MinoState[];
}

export function planLengthRoute(
  g: TurnGraph,
  cfg: TurnConfig,
  m0: MinoState,
  player: number,
  rng: TurnRng,
  turn: number,
  maxTravel: number
): TurnLengthPlan {
  // K501: callers pass the unscaled cap (factor x length); the planned
  // route covers the scaled travel.
  maxTravel = maxTravel * travelScaleOf(cfg);
  const fromState = cloneMino(m0);
  const factor = lengthFactor(g, cfg, fromState, player);
  const empty = (): TurnLengthPlan => ({
    from: fromState.v,
    fromSpot: { ...fromState.spot },
    fromState,
    steps: [],
    segLens: [],
    cumLens: [],
    totalLength: 0,
    factor,
    maxTravel,
    stateAfter: cloneMino(fromState),
    stepStates: [],
  });
  if (turn <= (cfg.sleep ?? 0)) return empty();
  if (cfg.stall && rng.next() < cfg.stall) return empty();
  const m = cloneMino(fromState);
  const visibleP = player === g.start || cutOff(g, m.v, player) ? -1 : player;
  const steps: TurnStep[] = [];
  const segLens: number[] = [];
  const cumLens: number[] = [];
  const stepStates: MinoState[] = [];
  let total = 0;
  for (let guard = 0; guard < 10000 && total < maxTravel - 1e-9; guard++) {
    const mv = decideLengthHop(g, cfg, m, visibleP, rng);
    if (!mv) break;
    const seg = lengthSegment(g, m, mv);
    if (!(seg > 0)) break;
    const prevV = g.other(mv[0], mv[1]);
    m.prev = prevV;
    m.v = mv[1];
    m.left = true;
    m.spot = spotAtVertex(m.v);
    steps.push(mv);
    segLens.push(seg);
    total += seg;
    cumLens.push(total);
    stepStates.push(cloneMino(m));
  }
  return {
    from: fromState.v,
    fromSpot: { ...fromState.spot },
    fromState,
    steps,
    segLens,
    cumLens,
    totalLength: total,
    factor,
    maxTravel,
    stateAfter: cloneMino(m),
    stepStates,
  };
}

// K137 s3b (4.7): the flee by length: fleeHops until the scaled travel is
// covered or it holds; the factor is the speed alone (no charge). Shaped as
// planLengthRoute's plan, so realizing, contact and the telegraph's stops
// read it unchanged.
export function planFleeLength(
  g: TurnGraph,
  cfg: TurnConfig,
  m0: MinoState,
  player: number,
  turn: number,
  maxTravel: number
): TurnLengthPlan {
  maxTravel = maxTravel * travelScaleOf(cfg);
  const fromState = cloneMino(m0);
  fromState.mode = 0;
  fromState.dest = -1;
  fromState.lastSeen = -1;
  if (fromState.lure !== undefined) fromState.lure = -1;
  const factor = cfg.speed;
  const m = cloneMino(fromState);
  const steps: TurnStep[] = [];
  const segLens: number[] = [];
  const cumLens: number[] = [];
  const stepStates: MinoState[] = [];
  let total = 0;
  const asleep = !m.left && turn <= (cfg.sleep ?? 0);
  for (let guard = 0; !asleep && guard < 10000 && total < maxTravel - 1e-9; guard++) {
    const mv = fleeHop(g, m, player);
    if (!mv) break;
    const seg = lengthSegment(g, m, mv);
    if (!(seg > 0)) break;
    m.prev = g.other(mv[0], mv[1]);
    m.v = mv[1];
    m.left = true;
    m.spot = spotAtVertex(m.v);
    steps.push(mv);
    segLens.push(seg);
    total += seg;
    cumLens.push(total);
    stepStates.push(cloneMino(m));
  }
  return {
    from: fromState.v,
    fromSpot: { ...fromState.spot },
    fromState,
    steps,
    segLens,
    cumLens,
    totalLength: total,
    factor,
    maxTravel,
    stateAfter: cloneMino(m),
    stepStates,
  };
}

// Where a spot travelling `dist` along a route stands.
export function spotAlongLengthRoute(
  g: TurnGraph,
  fromSpot: Spot,
  steps: readonly TurnStep[],
  segLens: readonly number[],
  dist: number
): Spot {
  let spot: Spot = { ...fromSpot };
  let rem = dist;
  for (let i = 0; i < steps.length; i++) {
    if (rem <= 0) break;
    const [e, w] = steps[i];
    const seg = segLens[i] ?? g.chase.len[e];
    if (rem < seg - 1e-9) {
      const dir: 1 | -1 =
        spot.edge === e ? (w === spotAhead(g, spot) ? spot.dir : ((spot.dir * -1) as 1 | -1)) : w === g.chase.eb[e] ? 1 : -1;
      const pos = spotCoord(g, spot, e) + dir * rem;
      return { edge: e, pos, dir, vertex: dir > 0 ? g.chase.ea[e] : g.chase.eb[e] };
    }
    rem -= seg;
    spot = spotAtVertex(w);
  }
  return spot;
}

function playerSpotAt(g: TurnGraph, p: number, e: number, t: number): Spot {
  if (e < 0) return spotAtVertex(p);
  const len = g.chase.len[e];
  if (g.chase.ea[e] === p && g.chase.eb[e] !== p) {
    return { edge: e, pos: t * len, dir: 1, vertex: p };
  }
  if (g.chase.eb[e] === p && g.chase.ea[e] !== p) {
    return { edge: e, pos: len - t * len, dir: -1, vertex: p };
  }
  return { edge: e, pos: t * len, dir: 1, vertex: p };
}

// K481 decision 5: the least thread distance between the player (at
// t x their run) and the minotaur (at t x its travel along its route)
// over the move, t in [0, 1]. The distance is ChaseGraph.spotToSpot on
// the whole graph. Between the route's breakpoints every candidate
// shortest path is affine in t, so the least falls at a breakpoint,
// except on a shared run, where the two can also cross between
// breakpoints (checked by the sign of their separation).
export function lengthContactDistance(
  g: TurnGraph,
  p: number,
  e: number,
  fromSpot: Spot,
  steps: readonly TurnStep[],
  segLens: readonly number[],
  travel: number
): number {
  const fracs: number[] = [0, 1];
  if (travel > 0) {
    let cum = 0;
    for (const seg of segLens) {
      cum += seg;
      const f = cum / travel;
      if (f > 0 && f < 1) fracs.push(f);
    }
  }
  fracs.sort((a, b) => a - b);
  const ts: number[] = [];
  for (const f of fracs) {
    if (ts.length === 0 || f - ts[ts.length - 1] > 1e-12) ts.push(f);
  }
  let best = Infinity;
  for (let i = 0; i < ts.length; i++) {
    const t = ts[i];
    const ms = spotAlongLengthRoute(g, fromSpot, steps, segLens, t * travel);
    const ps = playerSpotAt(g, p, e, t);
    best = Math.min(best, g.chase.spotToSpot(ms, ps, false));
    if (i + 1 >= ts.length || !(best > 0)) continue;
    const t1 = ts[i + 1];
    const mid = (t + t1) / 2;
    const mm = spotAlongLengthRoute(g, fromSpot, steps, segLens, mid * travel);
    if (e < 0 || mm.edge !== e) continue;
    const d0 = spotCoord(g, spotAlongLengthRoute(g, fromSpot, steps, segLens, t * travel), e) - spotCoord(g, playerSpotAt(g, p, e, t), e);
    const d1 = spotCoord(g, spotAlongLengthRoute(g, fromSpot, steps, segLens, t1 * travel), e) - spotCoord(g, playerSpotAt(g, p, e, t1), e);
    if ((d0 < 0 && d1 > 0) || (d0 > 0 && d1 < 0)) best = 0;
  }
  return best;
}

// K481 stage 2: the earliest move fraction t in [0, 1] at which the
// by-length contact above first holds (null: never). The page shows the
// catch at this moment of the move animation. Between the route's
// breakpoints only a shared run can cross the catch distance (its
// separation is linear in t); everywhere else the least distance falls
// at a breakpoint, as lengthContactDistance argues.
export function lengthContactFraction(
  g: TurnGraph,
  p: number,
  e: number,
  fromSpot: Spot,
  steps: readonly TurnStep[],
  segLens: readonly number[],
  travel: number,
  catchDist: number
): number | null {
  const fracs: number[] = [0, 1];
  if (travel > 0) {
    let cum = 0;
    for (const seg of segLens) {
      cum += seg;
      const f = cum / travel;
      if (f > 0 && f < 1) fracs.push(f);
    }
  }
  fracs.sort((a, b) => a - b);
  const ts: number[] = [];
  for (const f of fracs) {
    if (ts.length === 0 || f - ts[ts.length - 1] > 1e-12) ts.push(f);
  }
  const distAt = (t: number): number =>
    g.chase.spotToSpot(
      spotAlongLengthRoute(g, fromSpot, steps, segLens, t * travel),
      playerSpotAt(g, p, e, t),
      false
    );
  for (let i = 0; i < ts.length; i++) {
    const t = ts[i];
    if (distAt(t) <= catchDist + 1e-9) return t;
    if (i + 1 >= ts.length) break;
    const t1 = ts[i + 1];
    if (e < 0) continue;
    const mid = (t + t1) / 2;
    const mm = spotAlongLengthRoute(g, fromSpot, steps, segLens, mid * travel);
    if (mm.edge !== e) continue;
    const sep = (tt: number): number =>
      spotCoord(g, spotAlongLengthRoute(g, fromSpot, steps, segLens, tt * travel), e) -
      spotCoord(g, playerSpotAt(g, p, e, tt), e);
    const d0 = sep(t);
    const d1 = sep(t1);
    if (d0 === d1) continue;
    // |sep| falls to catchDist between the breakpoints.
    for (const target of [catchDist, -catchDist]) {
      const f = (target - d0) / (d1 - d0);
      if (f > 0 && f < 1) return t + (t1 - t) * f;
    }
    if ((d0 < 0 && d1 > 0) || (d0 > 0 && d1 < 0)) {
      return t + (t1 - t) * (Math.abs(d0) / (Math.abs(d0) + Math.abs(d1)));
    }
  }
  return null;
}

export function contactByLength(
  g: TurnGraph,
  p: number,
  e: number,
  fromSpot: Spot,
  steps: readonly TurnStep[],
  segLens: readonly number[],
  travel: number,
  catchDist: number
): boolean {
  return lengthContactDistance(g, p, e, fromSpot, steps, segLens, travel) <= catchDist + 1e-9;
}

// Contact, the continuous rule: does a player run p -(e)-> p2 meet a
// minotaur turn that starts at m0 and takes `path`? A wait (e < 0, p2 = p)
// is caught wherever its path touches p.
export function contact(p: number, e: number, p2: number, m0: number, path: TurnStep[]): boolean {
  const mEnd = path.length ? path[path.length - 1][1] : m0;
  if (p2 === mEnd) return true;
  let a = m0;
  for (const [f, b] of path) {
    if (e >= 0 && f === e && a === p2 && b === p) return true; // head-on on one run
    if (e < 0 && b === p) return true; // passes through a waiting player
    a = b;
  }
  return false;
}

// K546 stage 1: where a catch by runs that contact() declared happens, for
// the page to show it at that moment of the move animation: the earliest
// move fraction t at thread distance 0, and both spots there. A turn by
// runs splits its path by run length over the player's one animation
// (`mino`), so at fraction t the minotaur is t x the path's length along
// it and the player t x their run (playerSpotAt; a wait stands at p).
// Both motions are piecewise linear in t, so lengthContactFraction at that
// travel and catch distance 0 solves it exactly. contact() stays the
// authority, and each of its catches meets: on the same vertex at t = 1
// (it ends where you end, or stands where you arrive), a head-on swap
// crossing inside your run, a wait at the breakpoint where its path
// reaches you. The earliest zero can come before the one contact() named
// (it overtakes you on your run first). t = 1 is only a fallback.
export function runsContact(
  g: TurnGraph,
  p: number,
  e: number,
  m0: number,
  path: readonly TurnStep[]
): { t: number; mino: Spot; player: Spot } {
  const segLens = path.map(([f]) => g.chase.len[f]);
  let total = 0;
  for (const s of segLens) total += s;
  const from = spotAtVertex(m0);
  const t = lengthContactFraction(g, p, e, from, path, segLens, total, 0) ?? 1;
  return {
    t,
    mino: spotAlongLengthRoute(g, from, path, segLens, t * total),
    player: playerSpotAt(g, p, e, t),
  };
}

export type TurnResult = "moved" | "caught" | "win" | "reject" | "noop";

// The minotaur's next move as the telegraph shows it.
export interface TurnTelegraph {
  // K481 (by-length only): the spot it leaves, the speed factor, the
  // segment lengths of `steps`, and where it would stop for each choice
  // at the player's vertex (edge -1 = the wait), for the tick telegraph.
  // Stage 3: `player` is the player's vertex (chase index) the stops are
  // judged from, and each stop's `caught` says whether taking that
  // choice would be caught (the tint fallback's input; an exit run wins
  // first and a move ending on the start is never a catch, as in
  // turnByLength).
  player?: number;
  fromSpot?: Spot;
  factor?: number;
  segLens?: readonly number[];
  catchDist?: number;
  stops?: readonly { edge: number; travel: number; spot: Spot; caught?: boolean }[];
  from: number; // vertex it leaves
  steps: readonly TurnStep[]; // runs it will take (empty = it stays)
  dest: number; // vertex it will end the turn on
}

export class TurnMinotaur {
  // K137-b: replaced (withBlocked) when a run breaks; never mutated.
  tg: TurnGraph;
  cfg: TurnConfig;
  // K137-b: the controller's break limits (null: no run breaks) and this
  // minotaur's own count of the player's crossings, one per accepted run
  // (the controller's rule, fragile.ts), so the blocked set replays from
  // the inputs alone.
  private limits: ArrayLike<number> | null = null;
  private crossings: Uint32Array | null = null;
  private readonly rng: TurnRng;
  // The attempt's tallies (K80 turns stage 2, section 2.9). A level restart
  // makes a new minotaur and carries them over (carry), so a restart never
  // launders a catch: catches; close calls (moves ending one run from it);
  // seen (turns it spent hunting you, as its glow shows it); restarts (a
  // Reset path under it, main.ts: logged, not a catch).
  catches = 0;
  closeCalls = 0;
  seen = 0;
  restarts = 0;
  turns = 0; // Turns played this game: the RNG's counter.
  lifeTurn = 0; // Turns since the last (re)spawn: sleep and half-speed parity.
  finished = false;
  player: number; // Vertex index.
  state: MinoState;
  readonly inputs: number[] = []; // Run per turn, -1 = a wait.
  // The last turn, for the animation: where it left from and its steps.
  lastFrom: number;
  lastPath: TurnStep[] = [];
  // K481 (by-length): the last turn's start spot, its segment lengths,
  // the distance it actually travelled, and that distance's factor basis.
  lastFromSpot: Spot;
  lastSegLens: number[] = [];
  lastTravel = 0;
  lastFactor = 1;
  // Animation progress through the last turn, [0, 1] (1 = at rest).
  progress = 1;
  // K80 turns 3b (section 2.8): where the last catch happened (the player's
  // vertex, and the vertex the minotaur's turn ended on), for main.ts to
  // burst, sound and vibrate at after the respawn moved both. Null before.
  lastCatch: { player: number; mino: number } | null = null;
  // K481 stage 2 (by-length catches), K546 stage 1 (by runs too): the
  // contact's moment - the move fraction and both spots there - for the
  // page to show the catch when the animation reaches it. Null after a
  // turn that caught nothing. The turn's route stays readable until the
  // animation ends (finishCatchAnim, or setProgress reaching 1), so `mino`
  // keeps walking it while the catch is pending on screen: by length
  // lastPath, lastSegLens, lastTravel and lastFromSpot; by runs lastFrom
  // and lastPath (catchRoute), which then clear as an instant catch left
  // them. The game state itself has already respawned at the tap.
  lastContact: { t: number; mino: Spot; player: Spot } | null = null;
  // K546: a runs catch's route is still showing (lastFrom, lastPath).
  private catchRoute = false;
  private committed: TurnStep[] = [];
  private committedPlan: TurnLengthPlan | null = null;
  private commitState: MinoState | null = null;
  // K137 s3b (4.7): the sword (null: none, the default, which reads and
  // draws nothing, so every pin holds), whether the committed move is a
  // flee, and the last touch while it fled (the turn it happened; null
  // after a turn without one) for the page's burst and toast.
  sword: SwordState | null = null;
  private commitFlee = false;
  lastTouch: { kind: "banish" | "slay"; player: number; turn: number } | null = null;
  // K137 s3c (4.29), SPRINT: two player moves make one minotaur turn. The
  // first is a SKIPPED turn (turn(edge, {sprint: "skip"})): the minotaur
  // stands, `turns` and `lifeTurn` stay, and `skips` records its index in
  // `inputs` so a replay rebuilds it. The second is an ordinary turn; by
  // length it travels for half the pair's summed length (`skipLen`, the
  // first move's length, -1 when no skip is pending). `standSpot`: where a
  // by-length minotaur stood when a skipped move walked into it, for the
  // catch animation (the respawn has already moved it). With no skip
  // nothing here is read, so every pin holds.
  readonly skips: number[] = [];
  private skipLen = -1;
  private standSpot: Spot | null = null;
  // K137 s3d: the extra monsters (sleepers, followers; monsters.ts), which
  // step after the minotaur on every accepted move (extrasTurn). Empty
  // unless setMonsters lays some, and then nothing below runs or draws,
  // so every pin holds. `woken`: sleepers woken this attempt (a level
  // restart carries it). `lastCatcher`: who made the last catch (-1 the
  // minotaur, i extra i).
  readonly extras: TurnExtra[] = [];
  woken = 0;
  lastCatcher = -1;
  // K137 s4 (4.10, 4.30): LURES and SNARES, free in time (lure(), setSnare()).
  // `tools` records each use before input `at` (inputs.length then), so a
  // replay rebuilds them; `snares` holds the laid ones (snares.ts);
  // `commitSnare`: the snare the committed move springs, -1 none. Empty
  // unless a lure or snare is used, and then nothing below runs or draws,
  // so every pin holds. `lured`: lures used, `heardBy`: the last lure's
  // listeners (0: nobody heard it).
  readonly tools: TurnTool[] = [];
  readonly snares: Snare[] = [];
  private commitSnare = -1;
  // K137 s5: the muddy runs (walk edge ids; main sets them from the
  // controller at restart). Empty: no mud runs below. Assigning
  // re-commits, so the telegraph's first move honors them too.
  private _mud: ReadonlySet<number> = new Set();
  get mud(): ReadonlySet<number> {
    return this._mud;
  }
  set mud(m: ReadonlySet<number>) {
    this._mud = m;
    this.commit();
  }
  lured = 0;
  heardBy = 0;

  constructor(walk: WalkGraph | TurnGraph, cfg: TurnConfig, seed: number) {
    this.tg = walk instanceof TurnGraph ? walk : new TurnGraph(walk);
    this.cfg = cfg;
    this.rng = new TurnRng(seed >>> 0);
    this.player = this.tg.start;
    this.state = initMino(this.tg);
    this.lastFromSpot = { ...this.state.spot };
    this.lastFrom = this.state.v;
    this.commit();
  }

  get g(): ChaseGraph {
    return this.tg.chase;
  }

  // Live panel edits: the plan state stays, the next move is re-committed.
  setConfig(cfg: TurnConfig): void {
    this.cfg = cfg;
    this.commit();
  }

  // K137 s3b: the sword for this game (null: none). Called before the
  // first turn; the next move is re-committed.
  setSword(s: SwordState | null): void {
    this.sword = s;
    this.commit();
  }

  // K137 s3d: the extras for this game (monsters.ts monsterSpecs; `seed` is
  // the design seed their own streams draw from). Called before the first
  // turn.
  setMonsters(specs: readonly MonsterSpec[], seed: number): void {
    this.extras.length = 0;
    specs.forEach((s, i) => this.extras.push(newTurnExtra(s, seed, i)));
  }

  // K137 s4 (4.10): a LURE plucked on run `edge`, free in time (no turn
  // passes; lures.ts states the rules). The minotaur (not fleeing, not
  // slain) and every sleeper within cfg.lureRange runs (LURE_RANGE, 6, by
  // default; the lureRange param) head for the run's
  // nearer end, the minotaur forgetting its hunt and roam; an asleep sleeper
  // wakes (woken++); a follower ignores it. The next move is re-committed,
  // so the telegraph shows the lured route. Returns how many heard it (0:
  // nobody, the lure is still used), or -1 when refused (finished, a bad run).
  lure(edge: number): number {
    const g = this.tg;
    if (this.finished || !Number.isInteger(edge) || edge < 0 || edge >= g.chase.ea.length) return -1;
    this.tools.push({ at: this.inputs.length, kind: "lure", edge });
    this.lured++;
    let heard = 0;
    if (!this.slain && !this.fleeing) {
      const t = lureTarget(g, this.state.v, edge, this.cfg.lureRange);
      if (t >= 0) {
        this.state.lure = t;
        this.state.mode = 0;
        this.state.dest = -1;
        heard++;
      }
    }
    for (const x of this.extras) {
      if (x.kind !== "sleeper") continue;
      const t = lureTarget(g, x.state.v, edge, this.cfg.lureRange);
      if (t < 0) continue;
      if (x.phase === "asleep") {
        x.phase = "awake";
        x.shown = "awake";
        x.life = 0;
        this.woken++;
      }
      x.state.lure = t;
      x.state.mode = 0;
      x.state.dest = -1;
      heard++;
    }
    this.heardBy = heard;
    this.commit();
    return heard;
  }

  // K137 s4 (4.30): a SNARE laid on run `edge`, free in time (snares.ts
  // states the rules): the run must touch your junction and hold no snare.
  // By runs only (by length refuses: a residual). Re-commits, so the
  // telegraph previews the cut. False when refused.
  setSnare(edge: number): boolean {
    const g = this.tg;
    if (this.finished || this.cfg.byLength) return false;
    if (!canSnare(this.snares, g.chase.ea, g.chase.eb, this.player, edge)) return false;
    this.tools.push({ at: this.inputs.length, kind: "snare", edge });
    this.snares.push({ edge, phase: "set", holder: null, left: 0 });
    this.commit();
    return true;
  }

  // K137 s4: is monster `who` (-1 the minotaur, i extra i) held now?
  heldBySnare(who: number): boolean {
    return this.snares.length > 0 && heldIndex(this.snares, who) >= 0;
  }

  // K137 s3d: the extras' part of an accepted move p -(edge)-> p2 (-1: a
  // wait), after the minotaur's, which caught nobody. `stand`: a sprint's
  // skipped move, when every monster stands. A sleeper wakes on a move
  // along a run that touches its junction and neither moves nor catches on
  // that move; awake it decides as a hunter from p, where you stood (as the
  // telegraph decides the minotaur), so it never catches you from behind
  // unless you walk into it, wait where it arrives or are cornered. A
  // follower sets off when you leave its junction, appears there `delay`
  // moves later and walks your trail. Contact is the minotaur's rule.
  // Returns the catching extra, or -1.
  private extrasTurn(p: number, edge: number, p2: number, stand: boolean): number {
    if (this.extras.length === 0) return -1;
    const g = this.tg;
    const cfg = extraConfig(this.cfg);
    let caught = -1;
    for (let i = 0; i < this.extras.length; i++) {
      const x = this.extras[i];
      const from = x.state.v;
      let path: TurnStep[] = [];
      let live = false;
      if (x.kind === "follower" && x.phase !== "asleep" && !x.homing && edge >= 0) x.trail.push([edge, p2]);
      if (x.phase === "awake") {
        if (!stand && x.state.mudWait) {
          // K137 s5: this turn is spent in the mud.
          x.state.mudWait = false;
        } else if (!stand && this.snares.length > 0 && holdTurn(this.snares, i)) {
          // K137 s4 (4.30): a snare holds it; it stands.
        } else if (!stand) {
          const before = this.snares.length > 0 || this.mud.size > 0 ? cloneMino(x.state) : null;
          const at0 = x.at;
          const rng = x.rng.at(this.turns);
          path = x.kind === "sleeper" ? decide(g, cfg, x.state, p, ++x.life, rng) : followStep(g, x, p, rng);
          if (before !== null && x.phase === "awake") {
            const k = cutAtSnare(this.snares, path, before, x.state);
            if (k < 0 && this.mud.size > 0) cutAtMud(this.mud, path, before, x.state);
            if (k >= 0) {
              if (x.kind === "follower") x.at = at0;
              springSnare(this.snares[k], i, this.cfg.snareHold);
            }
          }
        }
        live = x.phase === "awake";
      } else if (x.phase === "waiting") {
        if (!stand && --x.wait <= 0) {
          x.phase = "awake";
          path = followStep(g, x, p, x.rng.at(this.turns));
          live = x.phase === "awake";
        }
      } else if (x.kind === "sleeper") {
        if (edge >= 0 && (p === x.home || p2 === x.home)) {
          x.phase = "awake";
          x.life = 0;
          this.woken++;
        }
      } else if (edge >= 0 && p === x.home && p2 !== x.home) {
        x.phase = "waiting";
        x.wait = x.delay;
        x.trail = [[edge, p2]];
        x.at = 0;
      }
      x.lastFrom = from;
      x.lastPath = path;
      x.shown = x.phase;
      if (live && caught < 0 && contact(p, edge, p2, from, path)) caught = i;
    }
    return caught;
  }

  // K137 s3d: a catch by extra i: the minotaur's catch (s3b call 1): you to
  // the entrance, the minotaur to its lair (or where it stands, lair off),
  // every extra back on its junction, asleep. The minotaur's own route of
  // this move plays out for the animation (catchRoute, as its own catch).
  private extraCatch(i: number, p: number, edge: number, p2: number): TurnResult {
    const g = this.tg;
    const x = this.extras[i];
    this.catches++;
    this.lastCatcher = i;
    this.lastCatch = { player: p2, mino: x.state.v };
    this.lastContact = runsContact(g, p, edge, x.lastFrom, x.lastPath);
    this.player = g.start;
    this.state =
      this.cfg.lair === false
        ? { v: this.state.v, prev: -1, dest: -1, mode: 0, lastSeen: -1, left: true, spot: { ...this.state.spot } }
        : initMino(g);
    this.lifeTurn = 0;
    if (this.cfg.byLength) {
      // It stood this move: show it there until the animation ends.
      if (this.lastPath.length === 0) this.standSpot = { ...this.lastFromSpot };
      this.lastFrom = this.state.v;
    } else {
      this.catchRoute = true;
    }
    this.skipLen = -1;
    for (const y of this.extras) sleepExtra(y);
    // K137 s4 (4.30): every holder went home; their snares are spent.
    if (this.snares.length > 0) releaseSnares(this.snares);
    this.commit();
    return "caught";
  }

  // K137 s3d: the minotaur caught you: the extras stood this move and go
  // back to sleep (the minotaur's own catch block calls this).
  private extrasOnCatch(): void {
    this.lastCatcher = -1;
    for (const x of this.extras) {
      x.lastFrom = x.state.v;
      x.lastPath = [];
      x.shown = x.phase;
      sleepExtra(x);
    }
  }

  // K137 s3d: where extra i stands for the renderer, along its last turn's
  // steps (the minotaur's split by run length), and the phase it shows.
  extraSpot(i: number): Spot {
    const x = this.extras[i];
    if (this.progress >= 1) return spotAtVertex(x.state.v);
    return alongPath(this.tg.chase, x.lastFrom, x.lastPath, this.progress);
  }

  extraPhase(i: number): MonsterPhase {
    const x = this.extras[i];
    return this.progress >= 1 ? x.phase : x.shown;
  }

  // K137 s3d: every extra as the renderer draws it (empty without extras).
  get extraViews(): ExtraView[] {
    return this.extras.map((x, i) => ({ spot: this.extraSpot(i), phase: this.extraPhase(i), kind: x.kind }));
  }

  // K137 s3b: it flees the sword / the one-use sword slew it.
  get fleeing(): boolean {
    return swordFleeing(this.sword);
  }

  get slain(): boolean {
    return this.sword !== null && this.sword.phase === "slain";
  }

  // K137 s3b: arriving on the sword's spot takes it; a committed move that
  // was no flee is dropped (the flee is decided now).
  private takeSword(p2: number): void {
    if (!swordTake(this.sword, p2, this.turns)) return;
    if (!this.commitFlee) {
      this.committed = [];
      this.committedPlan = null;
      this.commitState = null;
    }
  }

  // K137 s3b: a touch while it flees, no catch: timed sends it to its lair
  // (its sleep counts from now), one-use slays it.
  private touchSword(p2: number): void {
    const kind = swordTouch(this.sword as SwordState, this.turns);
    this.lastTouch = { kind, player: p2, turn: this.turns };
    if (kind === "banish") {
      this.state = initMino(this.tg);
      this.lifeTurn = 0;
      if (this.snares.length > 0) releaseSnares(this.snares, -1);
    }
  }

  // K137 s3b: a turn after the one-use sword slew it: the player moves.
  // K137 s3d: the extras still play (`stand` on a sprint's skipped move).
  private slainTurn(edge: number, p2: number, stand = false): TurnResult {
    const p = this.player;
    this.lastFrom = this.state.v;
    this.lastPath = [];
    this.lastSegLens = [];
    this.lastTravel = 0;
    this.progress = 0;
    this.lastContact = null;
    this.lastTouch = null;
    this.catchRoute = false;
    this.crossRun(edge);
    if (p2 === this.tg.exit) {
      this.player = p2;
      this.finished = true;
      return "win";
    }
    const xi = this.extrasTurn(p, edge, p2, stand);
    if (xi >= 0) return this.extraCatch(xi, p, edge, p2);
    this.player = p2;
    return "moved";
  }

  // A level restart's new minotaur takes over the old one's tallies.
  carry(prev: TurnMinotaur): void {
    this.catches = prev.catches;
    this.closeCalls = prev.closeCalls;
    this.seen = prev.seen;
    this.restarts = prev.restarts;
    this.woken = prev.woken;
  }

  // K137-b: the runs that break and after how many crossings (the
  // controller's breakLimits; Infinity = never). Called before the first
  // turn; it clears any count and block, so a fresh solve starts whole.
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
    this.crossings = any ? new Uint32Array(this.tg.chase.ea.length) : null;
    if (this.tg.blocked !== null) {
      this.tg = new TurnGraph(this.tg.chase);
      this.commit();
    }
  }

  // K137-b: the broken runs it routes around, in id order.
  get blockedRuns(): number[] {
    const b = this.tg.blocked;
    const out: number[] = [];
    if (b) for (let i = 0; i < b.length; i++) if (b[i] === 1) out.push(i);
    return out;
  }

  // K137-b: one accepted crossing of run `edge`; at its limit the run is
  // gone for every later decision (this turn was decided already, so a
  // minotaur on the run finishes it).
  private crossRun(edge: number): void {
    const lim = this.limits;
    const c = this.crossings;
    if (lim === null || c === null || edge < 0 || edge >= c.length) return;
    const n = ++c[edge];
    if (n !== lim[edge]) return;
    const b = this.tg.blocked ? this.tg.blocked.slice() : new Uint8Array(c.length);
    b[edge] = 1;
    this.tg = this.tg.withBlocked(b);
  }

  // One turn: the player runs `edge` from their vertex (-1 = waits there).
  // K137 s3c: `{sprint: "skip"}` makes it a sprint's first move (skipTurn).
  turn(edge: number, opts?: { sprint?: "skip" }): TurnResult {
    if (opts?.sprint === "skip") return this.skipTurn(edge);
    this.standSpot = null;
    if (this.cfg.byLength) return this.turnByLength(edge);
    if (this.finished) return "noop";
    const g = this.tg;
    const p = this.player;
    let p2 = p;
    if (edge >= 0) {
      if (!Number.isInteger(edge) || edge >= g.chase.ea.length) return "reject";
      const a = g.chase.ea[edge];
      const b = g.chase.eb[edge];
      if (a !== p && b !== p) return "reject";
      p2 = a === p ? b : a;
    } else {
      edge = -1;
    }
    this.turns++;
    this.lifeTurn++;
    this.inputs.push(edge);
    this.skipLen = -1;
    // K137 s3b: the one-use sword slew it; the sword taken on this move.
    if (this.sword !== null) {
      if (this.slain) return this.slainTurn(edge, p2);
      this.takeSword(p2);
      this.lastTouch = null;
    }
    const flee = this.fleeing;
    const from = this.state.v;
    let path: TurnStep[];
    // Where the player stood when this turn was decided: the telegraph
    // decided it before the move, from p; without one it is decided now.
    let seenAt = p2;
    // K137 s4 (4.30): held by a snare it stands; a path onto a set snare
    // stops at the run's near end and springs it (the committed move was
    // cut already, commitSnare). No snares: none of this runs.
    let sprung = -1;
    if (this.state.mudWait) {
      // K137 s5: this turn is spent in the mud.
      this.state.mudWait = false;
      path = [];
      if (this.cfg.telegraph && this.commitState) seenAt = p;
    } else if (this.snares.length > 0 && holdTurn(this.snares, -1)) {
      path = [];
      if (this.cfg.telegraph && this.commitState) seenAt = p;
    } else if (flee) {
      if (this.cfg.telegraph && this.commitState && this.commitFlee) {
        path = this.committed;
        this.state = this.commitState;
        sprung = this.commitSnare;
      } else {
        const before = this.snares.length > 0 || this.mud.size > 0 ? cloneMino(this.state) : null;
        path = fleeTurn(g, this.cfg, this.state, p2, this.lifeTurn);
        if (before !== null) {
          sprung = cutAtSnare(this.snares, path, before, this.state);
          if (sprung < 0 && this.mud.size > 0) cutAtMud(this.mud, path, before, this.state);
        }
      }
    } else if (this.cfg.telegraph && this.commitState) {
      path = this.committed;
      this.state = this.commitState;
      seenAt = p;
      sprung = this.commitSnare;
    } else {
      const before = this.snares.length > 0 || this.mud.size > 0 ? cloneMino(this.state) : null;
      path = decide(g, this.cfg, this.state, p2, this.lifeTurn, this.rng.at(this.turns));
      if (before !== null) {
        sprung = cutAtSnare(this.snares, path, before, this.state);
        if (sprung < 0 && this.mud.size > 0) cutAtMud(this.mud, path, before, this.state);
      }
    }
    if (sprung >= 0) springSnare(this.snares[sprung], -1, this.cfg.snareHold);
    this.commitSnare = -1;
    this.committed = [];
    this.commitState = null;
    this.lastFrom = from;
    this.lastPath = path;
    this.progress = 0;
    this.lastContact = null;
    this.catchRoute = false;
    // Seen: a turn it took hunting you (the hunting getter's rule).
    if (
      !flee &&
      this.state.left &&
      (this.cfg.policy === "chase" ? seenAt !== g.start : this.state.mode !== 0)
    ) {
      this.seen++;
    }
    this.crossRun(edge);
    if (p2 === g.exit) {
      this.player = p2;
      this.finished = true;
      return "win";
    }
    if (flee) {
      // K137 s3b: no catch while it flees: a touch banishes or slays it.
      if (contact(p, edge, p2, from, path)) this.touchSword(p2);
      else swordSpend(this.sword);
      // K137 s3d: the extras ignore the sword.
      const xf = this.extrasTurn(p, edge, p2, false);
      if (xf >= 0) return this.extraCatch(xf, p, edge, p2);
      this.player = p2;
      this.commit();
      return "moved";
    }
    if (contact(p, edge, p2, from, path)) {
      this.catches++;
      this.lastCatch = { player: p2, mino: this.state.v };
      // K546: where the two meet, before the respawn moves both.
      this.lastContact = runsContact(g, p, edge, from, path);
      this.player = g.start;
      // K273: back to its lair, or it stays where its turn ended (a fresh
      // roam from there; its sleep and parity count from now, as a spawn's).
      this.state =
        this.cfg.lair === false
          ? { v: this.state.v, prev: -1, dest: -1, mode: 0, lastSeen: -1, left: true, spot: { ...this.state.spot } }
          : initMino(g);
      this.lifeTurn = 0;
      // K546: the catching route (lastFrom, lastPath, progress 0) stays
      // for the animation until it ends (endCatchRoute); stage 1 cleared
      // it here, and so showed no catching move.
      this.catchRoute = true;
      this.extrasOnCatch();
      // K137 s4 (4.30): every holder went home; their snares are spent.
      if (this.snares.length > 0) releaseSnares(this.snares);
      this.commit();
      return "caught";
    }
    // K137 s3d: the extras step after it.
    const xi = this.extrasTurn(p, edge, p2, false);
    if (xi >= 0) return this.extraCatch(xi, p, edge, p2);
    // A close call: the move ends one run from it (out of its lair; the
    // start is a sanctuary). K137-b: one unbroken run (this.tg).
    if (this.state.left && p2 !== g.start && this.tg.hopd(p2, this.state.v) === 1) {
      this.closeCalls++;
    }
    this.player = p2;
    this.commit();
    return "moved";
  }

  // K137 s3c (4.29): a sprint's first move, a SKIPPED minotaur turn. The
  // player runs `edge` (a wait cannot start a sprint) while the minotaur
  // stands: no turn is counted, no draw is taken, and contact is the
  // standing rule (runs: you arrive where it stands; by length: your run
  // passes within the catch distance of its spot). The next turn() is the
  // sprint's second move. Rejected while a skip is pending.
  private skipTurn(edge: number): TurnResult {
    if (this.finished) return "noop";
    const g = this.tg;
    const p = this.player;
    if (this.skipLen >= 0 || edge < 0) return "reject";
    if (!Number.isInteger(edge) || edge >= g.chase.ea.length) return "reject";
    const a = g.chase.ea[edge];
    const b = g.chase.eb[edge];
    if (a !== p && b !== p) return "reject";
    const p2 = a === p ? b : a;
    this.standSpot = null;
    this.skips.push(this.inputs.length);
    this.inputs.push(edge);
    if (this.sword !== null) {
      if (this.slain) {
        this.skipLen = g.chase.len[edge];
        return this.slainTurn(edge, p2, true);
      }
      this.takeSword(p2);
      this.lastTouch = null;
    }
    const flee = this.fleeing;
    const from = this.state.v;
    const spot: Spot = { ...this.state.spot };
    this.lastFrom = from;
    this.lastPath = [];
    this.lastSegLens = [];
    this.lastTravel = 0;
    this.lastFromSpot = { ...spot };
    this.progress = 0;
    this.lastContact = null;
    this.catchRoute = false;
    this.crossRun(edge);
    if (p2 === g.exit) {
      this.player = p2;
      this.finished = true;
      return "win";
    }
    const byLength = this.cfg.byLength === true;
    const catchDist = this.cfg.catchDist ?? BY_LENGTH_CATCH_DIST;
    const touched = byLength
      ? p2 !== g.start && contactByLength(g, p, edge, spot, [], [], 0, catchDist)
      : contact(p, edge, p2, from, []);
    if (flee) {
      // K137 s3b: no catch while it flees: a touch banishes or slays it.
      if (touched) this.touchSword(p2);
      else swordSpend(this.sword);
      // K137 s3d: every extra stands too.
      const xf = this.extrasTurn(p, edge, p2, true);
      if (xf >= 0) return this.extraCatch(xf, p, edge, p2);
      this.player = p2;
      this.skipLen = g.chase.len[edge];
      this.commit();
      return "moved";
    }
    if (touched) {
      this.catches++;
      this.lastCatch = { player: p2, mino: this.state.v };
      if (byLength) {
        const t = lengthContactFraction(g, p, edge, spot, [], [], 0, catchDist) ?? 1;
        this.lastContact = { t, mino: { ...spot }, player: playerSpotAt(g, p, edge, t) };
        this.standSpot = { ...spot };
      } else {
        this.lastContact = runsContact(g, p, edge, from, []);
      }
      this.player = g.start;
      this.state =
        this.cfg.lair === false
          ? { v: this.state.v, prev: -1, dest: -1, mode: 0, lastSeen: -1, left: true, spot: { ...this.state.spot } }
          : initMino(g);
      this.lifeTurn = 0;
      // A runs catch keeps lastFrom (where it stood) until the animation
      // ends, as turn()'s catchRoute does.
      this.catchRoute = !byLength;
      this.skipLen = -1;
      this.extrasOnCatch();
      this.commit();
      return "caught";
    }
    // K137 s3d: every extra stands too.
    const xi = this.extrasTurn(p, edge, p2, true);
    if (xi >= 0) return this.extraCatch(xi, p, edge, p2);
    if (this.state.left && p2 !== g.start) {
      if (byLength) {
        const d = g.chase.spotToVertex(this.state.spot, p2, false);
        if (d <= g.medianLength + 1e-9) this.closeCalls++;
      } else if (this.tg.hopd(p2, this.state.v) === 1) {
        this.closeCalls++;
      }
    }
    this.player = p2;
    this.skipLen = g.chase.len[edge];
    this.commit();
    return "moved";
  }

  // K137 s3c: a sprint's pair shares one turn's travel by length: half the
  // two moves' summed length (s3a call 5). `l` alone with no skip pending.
  private pairLen(l: number): number {
    return this.skipLen >= 0 ? (this.skipLen + l) / 2 : l;
  }

  // K137 s3c: is a sprint's second move due (its first was skipped)?
  get sprintPending(): boolean {
    return this.skipLen >= 0;
  }

  // K481: the choice travels at the player's vertex, for the telegraph's
  // ticks and the sim: each incident run, plus the wait (the median).
  lengthChoices(): { edge: number; length: number }[] {
    const g = this.tg;
    // K137-b: a broken run is no choice.
    const runs = g.blocked === null ? g.chase.adj[this.player] : g.chase.adj[this.player].filter((e) => !g.isBlocked(e));
    const out = runs.map((e) => ({ edge: e, length: g.chase.len[e] }));
    out.push({ edge: -1, length: g.medianLength });
    return out;
  }

  private turnByLength(edge: number): TurnResult {
    if (this.finished) return "noop";
    const g = this.tg;
    const p = this.player;
    let p2 = p;
    if (edge >= 0) {
      if (!Number.isInteger(edge) || edge >= g.chase.ea.length) return "reject";
      const a = g.chase.ea[edge];
      const b = g.chase.eb[edge];
      if (a !== p && b !== p) return "reject";
      p2 = a === p ? b : a;
    } else {
      edge = -1;
    }
    this.turns++;
    this.lifeTurn++;
    this.inputs.push(edge);
    // K137 s3c: a sprint's second move travels for half the pair's length.
    const playerLen = this.pairLen(edge < 0 ? g.medianLength : g.chase.len[edge]);
    this.skipLen = -1;
    // K137 s3b: the one-use sword slew it; the sword taken on this move.
    if (this.sword !== null) {
      if (this.slain) return this.slainTurn(edge, p2);
      this.takeSword(p2);
      this.lastTouch = null;
    }
    const flee = this.fleeing;
    let plan: TurnLengthPlan;
    let seenAt = p2;
    // K137 s5: a turn spent in the mud travels nothing.
    const mudStand = this.state.mudWait === true;
    if (mudStand) this.state.mudWait = false;
    if (mudStand) {
      plan = planLengthRoute(g, this.cfg, this.state, p2, this.rng.at(this.turns), this.lifeTurn, 0);
    } else if (flee) {
      plan =
        this.cfg.telegraph && this.committedPlan && this.commitFlee
          ? this.committedPlan
          : planFleeLength(g, this.cfg, this.state, p2, this.lifeTurn, this.cfg.speed * playerLen);
    } else if (this.cfg.telegraph && this.committedPlan) {
      plan = this.committedPlan;
      seenAt = p;
    } else if (this.cfg.telegraph && this.commitState) {
      // No plan (should not happen with byLength commits): fall back to a
      // reactive plan so the turn still plays by length.
      // (replanned below with the real travel cap)
      plan = planLengthRoute(
        g,
        this.cfg,
        this.state,
        p2,
        this.rng.at(this.turns),
        this.lifeTurn,
        lengthFactor(g, this.cfg, this.state, p2) * playerLen
      );
    } else {
      plan = planLengthRoute(
        g,
        this.cfg,
        this.state,
        p2,
        this.rng.at(this.turns),
        this.lifeTurn,
        lengthFactor(g, this.cfg, this.state, p2) * playerLen
      );
    }
    // K137 s5: the travel stops after the first muddy run it crosses.
    let mudIdx = -1;
    if (!mudStand && this.mud.size > 0) {
      mudIdx = mudStep(this.mud, plan.steps);
      if (mudIdx >= 0) {
        plan.steps.length = mudIdx + 1;
        plan.segLens.length = mudIdx + 1;
        plan.cumLens = [0];
        for (const s of plan.segLens) plan.cumLens.push(plan.cumLens[plan.cumLens.length - 1] + s);
        plan.totalLength = plan.cumLens[plan.cumLens.length - 1];
      }
    }
    this.committed = [];
    this.committedPlan = null;
    this.commitState = null;
    this.catchRoute = false; // K546: a runs catch's route, if one was showing.
    const wanted = plan.factor * playerLen * travelScaleOf(this.cfg);
    const realized = this.realizeLengthPlan(plan, wanted);
    this.lastFrom = plan.from;
    this.lastFromSpot = { ...plan.fromSpot };
    this.lastPath = realized.steps;
    this.lastSegLens = realized.segLens;
    this.lastTravel = realized.travel;
    this.lastFactor = plan.factor;
    this.progress = 0;
    this.state = realized.state;
    // K137 s5: it crossed the muddy run whole: next turn is spent in it.
    if (
      mudIdx >= 0 &&
      realized.steps.length > mudIdx &&
      this.state.spot.edge !== plan.steps[mudIdx][0]
    )
      this.state.mudWait = true;
    // Seen (decision 9): a turn counts when any hop it actually started
    // was decided hunting or checking (prox), or the chase could see the
    // player where the turn was decided.
    const hunted =
      this.cfg.policy === "chase"
        ? seenAt !== g.start
        : realized.hunted || this.state.mode !== 0;
    if (!flee && this.state.left && hunted) this.seen++;
    this.crossRun(edge);
    if (p2 === g.exit) {
      this.player = p2;
      this.finished = true;
      return "win";
    }
    const catchDist = this.cfg.catchDist ?? BY_LENGTH_CATCH_DIST;
    if (flee) {
      // K137 s3b: no catch while it flees: a touch banishes or slays it.
      const touched = contactByLength(g, p, edge, plan.fromSpot, plan.steps, plan.segLens, realized.travel, catchDist);
      if (touched) this.touchSword(p2);
      else swordSpend(this.sword);
      this.lastContact = null;
      // K137 s3d: the extras ignore the sword (a run a turn on both travels).
      const xf = this.extrasTurn(p, edge, p2, false);
      if (xf >= 0) return this.extraCatch(xf, p, edge, p2);
      this.player = p2;
      this.commit();
      return "moved";
    }
    const caught =
      p2 !== g.start &&
      contactByLength(g, p, edge, plan.fromSpot, plan.steps, plan.segLens, realized.travel, catchDist);
    this.lastContact = null;
    if (caught) {
      this.catches++;
      this.lastCatch = { player: p2, mino: this.state.v };
      const ct = lengthContactFraction(
        g, p, edge, plan.fromSpot, plan.steps, plan.segLens, realized.travel, catchDist
      );
      const t = ct ?? 1;
      this.lastContact = {
        t,
        mino: spotAlongLengthRoute(g, plan.fromSpot, plan.steps, plan.segLens, t * realized.travel),
        player: playerSpotAt(g, p, edge, t),
      };
      this.player = g.start;
      this.state =
        this.cfg.lair === false
          ? { v: this.state.v, prev: -1, dest: -1, mode: 0, lastSeen: -1, left: true, spot: { ...this.state.spot } }
          : initMino(g);
      this.lifeTurn = 0;
      this.lastFrom = this.state.v;
      // The route (lastFromSpot, lastPath, lastSegLens, lastTravel) stays
      // for the catch animation: `mino` walks it until finishCatchAnim.
      this.progress = 0;
      this.extrasOnCatch();
      this.commit();
      return "caught";
    }
    // K137 s3d: the extras step after it, a run a turn.
    const xi = this.extrasTurn(p, edge, p2, false);
    if (xi >= 0) return this.extraCatch(xi, p, edge, p2);
    // Close call (decision 9): the move ends within one median run of
    // thread from it, out of its lair and off the sanctuary.
    if (this.state.left && p2 !== g.start) {
      const d = g.chase.spotToVertex(this.state.spot, p2, false);
      if (d <= g.medianLength + 1e-9) this.closeCalls++;
    }
    this.player = p2;
    this.commit();
    return "moved";
  }

  private realizeLengthPlan(
    plan: TurnLengthPlan,
    wanted: number
  ): { state: MinoState; steps: TurnStep[]; segLens: number[]; travel: number; hunted: boolean } {
    if (plan.steps.length === 0 || !(wanted > 0)) {
      return { state: cloneMino(plan.fromState), steps: [], segLens: [], travel: 0, hunted: false };
    }
    const travel = Math.min(wanted, plan.totalLength);
    const steps: TurnStep[] = [];
    const segLens: number[] = [];
    let hunted = false;
    let rem = travel;
    let state = cloneMino(plan.fromState);
    for (let i = 0; i < plan.steps.length; i++) {
      if (rem <= 1e-9) break;
      const seg = plan.segLens[i];
      steps.push(plan.steps[i]);
      segLens.push(seg);
      if (plan.stepStates[i].mode !== 0) hunted = true;
      if (rem < seg - 1e-9) {
        state = cloneMino(plan.stepStates[i]);
        state.spot = spotAlongLengthRoute(
          this.tg,
          plan.fromSpot,
          plan.steps,
          plan.segLens,
          travel
        );
        // state.v is already the run's far vertex; prev is its other end.
        state.prev = this.tg.other(plan.steps[i][0], plan.steps[i][1]);
        rem = 0;
        break;
      }
      rem -= seg;
      state = cloneMino(plan.stepStates[i]);
    }
    if (steps.length === plan.steps.length && travel >= plan.totalLength - 1e-9) {
      state = cloneMino(plan.stateAfter);
    }
    return { state, steps, segLens, travel, hunted };
  }

  // K137 s5: a by-length plan stops after its first muddy run (it
  // crosses, then spends its next turn in the mud), as cutAtMud does
  // for run-counted turns.
  private cutPlanMud(): void {
    const plan = this.committedPlan;
    if (!plan || this.mud.size === 0) return;
    const i = mudStep(this.mud, plan.steps);
    if (i < 0) return;
    plan.steps.length = i + 1;
    plan.segLens.length = i + 1;
    plan.cumLens = [0];
    for (const s of plan.segLens) plan.cumLens.push(plan.cumLens[plan.cumLens.length - 1] + s);
    plan.totalLength = plan.cumLens[plan.cumLens.length - 1];
    const after = cloneMino(plan.stepStates[i]);
    after.mudWait = true;
    plan.stateAfter = after;
    this.committed = plan.steps.slice();
    this.commitState = cloneMino(after);
  }

  private commitLength(): void {
    this.commitFlee = false;
    if (!this.cfg.telegraph || this.finished || this.slain) {
      this.committed = [];
      this.committedPlan = null;
      this.commitState = null;
      return;
    }
    if (this.state.mudWait) {
      // K137 s5: in the mud this turn; it stands.
      this.committed = [];
      this.committedPlan = null;
      this.commitState = cloneMino(this.state);
      return;
    }
    if (this.fleeing) {
      // K137 s3b: the flee by length, long enough for the longest choice.
      let maxRun = this.tg.medianLength;
      for (const c of this.lengthChoices()) maxRun = Math.max(maxRun, c.length);
      const fp = planFleeLength(
        this.tg,
        this.cfg,
        this.state,
        this.player,
        this.lifeTurn + 1,
        this.cfg.speed * this.pairLen(maxRun)
      );
      this.committedPlan = fp;
      this.committed = fp.steps.slice();
      this.commitState = cloneMino(fp.stateAfter);
      this.commitFlee = true;
      this.cutPlanMud();
      return;
    }
    const factor = lengthFactor(this.tg, this.cfg, this.state, this.player);
    let maxLen = this.tg.medianLength;
    for (const c of this.lengthChoices()) maxLen = Math.max(maxLen, c.length);
    const plan = planLengthRoute(
      this.tg,
      this.cfg,
      this.state,
      this.player,
      this.rng.at(this.turns + 1),
      this.lifeTurn + 1,
      factor * this.pairLen(maxLen)
    );
    this.committedPlan = plan;
    this.committed = plan.steps.slice();
    this.commitState = cloneMino(plan.stateAfter);
    this.cutPlanMud();
  }

  // The telegraph: decide the next turn now, from where the player stands.
  private commit(): void {
    if (this.cfg.byLength) return this.commitLength();
    this.commitFlee = false;
    this.commitSnare = -1;
    if (!this.cfg.telegraph || this.finished || this.slain) {
      this.committed = [];
      this.commitState = null;
      return;
    }
    if (this.snares.length > 0 && heldIndex(this.snares, -1) >= 0) {
      // K137 s4 (4.30): held by a snare, it stands.
      this.committed = [];
      this.commitState = cloneMino(this.state);
      this.commitFlee = this.fleeing;
      return;
    }
    if (this.state.mudWait) {
      // K137 s5: in the mud this turn; it stands.
      this.committed = [];
      this.commitState = cloneMino(this.state);
      this.commitFlee = this.fleeing;
      return;
    }
    if (this.fleeing) {
      // K137 s3b: the flee, from where the player stands (no draw).
      const f = cloneMino(this.state);
      this.committed = fleeTurn(this.tg, this.cfg, f, this.player, this.lifeTurn + 1);
      this.commitState = f;
      this.commitFlee = true;
      if (this.snares.length > 0) this.commitSnare = cutAtSnare(this.snares, this.committed, this.state, f);
      if (this.mud.size > 0) cutAtMud(this.mud, this.committed, this.state, f);
      return;
    }
    const c = { ...this.state };
    this.committed = decide(
      this.tg,
      this.cfg,
      c,
      this.player,
      this.lifeTurn + 1,
      this.rng.at(this.turns + 1)
    );
    this.commitState = c;
    if (this.snares.length > 0) this.commitSnare = cutAtSnare(this.snares, this.committed, this.state, c);
    if (this.mud.size > 0) cutAtMud(this.mud, this.committed, this.state, c);
  }

  private telegraphLength(): TurnTelegraph | null {
    const plan = this.committedPlan;
    if (!plan || this.progress < 1) return null;
    const g = this.tg;
    const catchDist = this.cfg.catchDist ?? BY_LENGTH_CATCH_DIST;
    const stops = this.lengthChoices().map((c) => {
      const travel = Math.min(plan.factor * this.pairLen(c.length) * travelScaleOf(this.cfg), plan.totalLength);
      const p2 =
        c.edge < 0 ? this.player : g.chase.ea[c.edge] === this.player ? g.chase.eb[c.edge] : g.chase.ea[c.edge];
      // K137 s3b: a flee touches, never catches.
      const caught =
        !this.commitFlee &&
        p2 !== g.exit &&
        p2 !== g.start &&
        contactByLength(g, this.player, c.edge, plan.fromSpot, plan.steps, plan.segLens, travel, catchDist);
      return {
        edge: c.edge,
        travel,
        spot: spotAlongLengthRoute(this.tg, plan.fromSpot, plan.steps, plan.segLens, travel),
        caught,
      };
    });
    return {
      from: this.state.v,
      steps: this.committed,
      dest: plan.stateAfter.v,
      player: this.player,
      fromSpot: { ...plan.fromSpot },
      factor: plan.factor,
      segLens: plan.segLens.slice(),
      catchDist,
      stops,
    };
  }

  // The committed next move (null without the telegraph, or mid-animation).
  telegraph(): TurnTelegraph | null {
    if (this.cfg.byLength) return this.telegraphLength();
    if (!this.commitState || this.progress < 1) return null;
    return { from: this.state.v, steps: this.committed, dest: this.commitState.v };
  }

  // Hunting: the stalker whenever it can see you; prox while it hunts or
  // checks where it last saw you (the committed move's state, telegraphed).
  get hunting(): boolean {
    if (!this.state.left) return false;
    // K137 s3b: fleeing the sword, or slain, it hunts nobody.
    if (this.sword !== null && this.sword.phase !== "ready" && this.sword.phase !== "used") return false;
    if (this.cfg.policy === "chase") return this.player !== this.tg.start;
    const m = this.commitState ?? this.state;
    return m.mode !== 0;
  }

  // Real time's display modes (the marker's glow reads them).
  get mode(): MinotaurMode {
    if (!this.state.left && !(this.progress < 1 && (this.lastPath.length > 0 || this.standSpot !== null))) return "lair";
    return this.hunting ? "hunt" : "wander";
  }

  // K481 stage 2, K546 (by runs too): the page has shown the catch at its
  // contact moment; the marker now stands where the game state already
  // put it.
  finishCatchAnim(): void {
    this.progress = 1;
    this.standSpot = null;
    this.endCatchRoute();
  }

  setProgress(frac: number): void {
    this.progress = frac >= 1 ? 1 : frac <= 0 ? 0 : frac;
    if (this.progress >= 1) this.endCatchRoute();
  }

  // K546: a runs catch's route has played; lastFrom and lastPath read as
  // stage 1's instant catch left them (the respawned vertex, no path), so
  // every later read, the pinned digests' included, is unchanged.
  private endCatchRoute(): void {
    if (!this.catchRoute) return;
    this.catchRoute = false;
    this.lastFrom = this.state.v;
    this.lastPath = [];
  }

  // Where it stands for the renderer: along the last turn's steps, split by
  // run length (two runs share the player's one animation).
  get mino(): Spot {
    if (this.cfg.byLength) {
      // K137 s3c: a sprint's skipped move walked into it where it stood.
      if (this.standSpot !== null && this.progress < 1) return { ...this.standSpot };
      if (this.lastPath.length === 0 || this.progress >= 1) return { ...this.state.spot };
      return spotAlongLengthRoute(
        this.tg,
        this.lastFromSpot,
        this.lastPath,
        this.lastSegLens,
        this.progress * this.lastTravel
      );
    }
    const path = this.lastPath;
    if (this.progress >= 1) return { edge: -1, pos: 0, dir: 1, vertex: this.state.v };
    // A turn it stood still: where it stands, which a runs catch's respawn
    // has already left (K546: you walked into it there).
    if (path.length === 0) return { edge: -1, pos: 0, dir: 1, vertex: this.lastFrom };
    const g = this.tg.chase;
    let total = 0;
    for (const [e] of path) total += g.len[e];
    let left = this.progress * total;
    let a = this.lastFrom;
    for (let i = 0; i < path.length; i++) {
      const [e, b] = path[i];
      const len = g.len[e];
      if (left <= len || i === path.length - 1) {
        const s = Math.min(len, Math.max(0, left));
        return g.ea[e] === a
          ? { edge: e, pos: s, dir: 1, vertex: a }
          : { edge: e, pos: len - s, dir: -1, vertex: a };
      }
      left -= len;
      a = b;
    }
    return { edge: -1, pos: 0, dir: 1, vertex: this.state.v };
  }
}

// K137 s3d: an extra monster on the turn clock (monsters.ts has the rules).
export interface TurnExtra {
  readonly kind: MonsterKind;
  readonly home: number;
  readonly delay: number; // Follower: moves after you leave home before it appears.
  readonly rng: TurnRng;
  phase: MonsterPhase;
  shown: MonsterPhase; // The phase its last turn ended in (before a catch's reset).
  state: MinoState;
  life: number; // Turns since it woke (decide's sleep and half-speed parity).
  wait: number; // Follower: turns left before it appears.
  trail: TurnStep[]; // Follower: your moves since you left its junction.
  at: number; // Follower: the trail step it takes next (-1: off the trail).
  homing: boolean; // Follower: it lost you (you hid at the entrance); walking home.
  lastFrom: number;
  lastPath: TurnStep[];
}

// What the renderer draws for one extra: where it stands, its phase, its kind.
export interface ExtraView {
  readonly spot: Spot;
  readonly phase: MonsterPhase;
  readonly kind: MonsterKind;
}

function homeState(v: number): MinoState {
  return { v, prev: -1, dest: -1, mode: 0, lastSeen: -1, left: true, spot: spotAtVertex(v) };
}

export function newTurnExtra(s: MonsterSpec, seed: number, i: number): TurnExtra {
  return {
    kind: s.kind,
    home: s.home,
    delay: s.kind === "follower" ? followDelay(seed, i) : 0,
    rng: monsterRng(seed, i),
    phase: "asleep",
    shown: "asleep",
    state: homeState(s.home),
    life: 0,
    wait: 0,
    trail: [],
    at: 0,
    homing: false,
    lastFrom: s.home,
    lastPath: [],
  };
}

// Back to sleep on its junction (a catch, or a follower home again).
function sleepExtra(x: TurnExtra): void {
  x.phase = "asleep";
  x.state = homeState(x.home);
  x.life = 0;
  x.wait = 0;
  x.trail = [];
  x.at = 0;
  x.homing = false;
}

// The extras' config: the minotaur's pace, sight and accuracy as a hunter
// (prox), with no telegraph, sleep, territory or pull, by runs.
export function extraConfig(cfg: TurnConfig): TurnConfig {
  const out: TurnConfig = {
    policy: "prox",
    speed: cfg.speed,
    telegraph: false,
    q: cfg.q,
    stall: cfg.stall,
    see: cfg.see,
    lose: cfg.lose,
    sleep: 0,
  };
  if (cfg.chaseSpeed) out.chaseSpeed = cfg.chaseSpeed;
  if (!cfg.home && cfg.rMin != null && cfg.rMax != null) {
    out.rMin = cfg.rMin;
    out.rMax = cfg.rMax;
  }
  return out;
}

// The step after the follower's newest place on its trail at w (-1: off it).
function trailIndexAfter(x: TurnExtra, w: number): number {
  for (let j = x.trail.length - 1; j >= 0; j--) if (x.trail[j][1] === w) return j + 1;
  return w === x.home ? 0 : -1;
}

// K137 s3d: one follower step with the player at p (where the turn found
// them, as a telegraph decides): the next run of your trail, or (chance
// FOLLOW_SHORTCUT, or off the trail) a step toward you, rejoining the trail
// where it lands on it. You at the entrance: it loses you and walks home,
// where it sleeps again.
function followStep(g: TurnGraph, x: TurnExtra, p: number, rng: TurnRng): TurnStep[] {
  const m = x.state;
  let mv: TurnStep | null = null;
  if (!x.homing && p === g.start) x.homing = true;
  if (!x.homing) {
    const next = x.at >= 0 && x.at < x.trail.length ? x.trail[x.at] : null;
    const onTrail =
      next !== null &&
      allowed(g, next[1]) &&
      !g.isBlocked(next[0]) &&
      (g.chase.ea[next[0]] === m.v || g.chase.eb[next[0]] === m.v);
    if (onTrail && rng.next() >= FOLLOW_SHORTCUT) {
      mv = next;
      x.at++;
    } else if (!cutOff(g, m.v, p)) {
      mv = stepToward(g, m.v, p, rng);
      if (mv) x.at = trailIndexAfter(x, mv[1]);
    }
  } else if (m.v === x.home) {
    sleepExtra(x);
    return [];
  } else {
    mv = stepToward(g, m.v, x.home, rng);
  }
  if (!mv) return [];
  m.prev = m.v;
  m.v = mv[1];
  m.spot = spotAtVertex(m.v);
  return [mv];
}

// Where a turn's path puts a mover at `progress`, split by run length (the
// minotaur's `mino` split, for the extras).
function alongPath(g: ChaseGraph, from: number, path: readonly TurnStep[], progress: number): Spot {
  if (path.length === 0) return spotAtVertex(from);
  let total = 0;
  for (const [e] of path) total += g.len[e];
  let left = progress * total;
  let a = from;
  for (let i = 0; i < path.length; i++) {
    const [e, b] = path[i];
    const len = g.len[e];
    if (left <= len || i === path.length - 1) {
      const s = Math.min(len, Math.max(0, left));
      return g.ea[e] === a ? { edge: e, pos: s, dir: 1, vertex: a } : { edge: e, pos: len - s, dir: -1, vertex: a };
    }
    left -= len;
    a = b;
  }
  return spotAtVertex(path[path.length - 1][1]);
}

// K137 s3c: a game rebuilt from its inputs and skips (a sprint's first moves,
// TurnMinotaur.skips): the same taps give the same minotaur. K137 s3d:
// `monsters`, the extras and the design seed their streams draw from. K137
// s4: `tools`, the lures and snares used (TurnMinotaur.tools), each applied
// before its input.
export function replayTurnMinotaur(
  walk: WalkGraph | TurnGraph,
  cfg: TurnConfig,
  seed: number,
  inputs: readonly number[],
  skips: readonly number[] = [],
  monsters: { specs: readonly MonsterSpec[]; seed: number } | null = null,
  tools: readonly TurnTool[] = [],
  mud: ReadonlySet<number> = new Set()
): TurnMinotaur {
  const tm = new TurnMinotaur(walk, cfg, seed);
  if (monsters) tm.setMonsters(monsters.specs, monsters.seed);
  tm.mud = mud;
  const skip = new Set(skips);
  let k = 0;
  const useTools = (at: number): void => {
    for (; k < tools.length && tools[k].at <= at; k++) {
      const t = tools[k];
      if (t.kind === "lure") tm.lure(t.edge);
      else tm.setSnare(t.edge);
    }
  };
  for (let i = 0; i < inputs.length; i++) {
    useTools(i);
    tm.turn(inputs[i], skip.has(i) ? { sprint: "skip" } : undefined);
  }
  useTools(inputs.length);
  return tm;
}

// The design seed's own stream for the turn minotaur ("TURN").
export function turnSeed(seed: number): number {
  const s = Math.floor(Math.abs(seed)) % 4294967296;
  return (s ^ 0x5455524e) >>> 0;
}
