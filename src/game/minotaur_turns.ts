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
// table is in docs/design/K80_turns_stage3.md's handoff).
export const TURN_MODEL_DEFAULTS = Object.freeze({
  guard: Object.freeze({ sight: 4, accuracy: 0.3 }),
  stalker: Object.freeze({ accuracy: 0.45 }),
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

  constructor(walk: WalkGraph) {
    const g = (this.chase = new ChaseGraph(walk));
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
          const w = this.other(e, v);
          if (this.hop[row + w] >= 0) continue;
          this.hop[row + w] = d + 1;
          queue[qt++] = w;
        }
      }
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
    const w = g.other(e, v);
    if (w === v || !allowed(g, w)) continue;
    out.push([e, w]);
  }
  return out;
}

function pick<T>(arr: T[], rng: TurnRng): T {
  return arr[Math.min(arr.length - 1, Math.floor(rng.next() * arr.length))];
}

function stepToward(g: TurnGraph, v: number, target: number, rng: TurnRng): TurnStep | null {
  const d = g.hopd(v, target);
  if (d <= 0) return null;
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
  const ahead = spotAhead(g, s);
  const behind = spotBehind(g, s);
  const cands: TurnStep[] = [];
  for (const w of ahead === behind ? [ahead] : [ahead, behind]) {
    if (!allowed(g, w)) continue;
    cands.push([s.edge, w]);
  }
  if (cands.length === 0) return null;
  let best = Infinity;
  for (const [, w] of cands) best = Math.min(best, g.hopd(w, target));
  if (!Number.isFinite(best) || best < 0) return null;
  const c = cands.filter(([, w]) => g.hopd(w, target) === best);
  return pick(c, rng);
}

function stepRandomSpot(g: TurnGraph, m: MinoState, noReverse: boolean, rng: TurnRng): TurnStep | null {
  const s = m.spot;
  const ahead = spotAhead(g, s);
  const behind = spotBehind(g, s);
  let c: TurnStep[] = [];
  for (const w of ahead === behind ? [ahead] : [ahead, behind]) {
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
  // The player in the sanctuary is out of reach: hunters lose track.
  const visibleP = p === g.start ? -1 : p;
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
        if (m.lastSeen < 0 || m.v === m.lastSeen) {
          m.mode = 0;
          m.dest = -1;
        } else {
          mv = stepToward(g, m.v, m.lastSeen, rng);
        }
      }
      if (m.mode === 0 && !mv) {
        if (m.dest < 0 || m.dest === m.v) {
          m.dest = wanderDest(g, cfg, cfg.home ? g.exitJ : m.v, rng, m.v, visibleP);
        }
        mv = m.dest >= 0 ? stepToward(g, m.v, m.dest, rng) : stepRandom(g, m, true, rng);
      }
    }
    apply(mv);
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
    if (atVertex && (m.lastSeen < 0 || m.v === m.lastSeen)) {
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
    if (m.dest < 0 || (atVertex && m.dest === m.v)) {
      m.dest = wanderDest(g, cfg, cfg.home ? g.exitJ : m.v, rng, m.v, visibleP);
    }
    mv = m.dest >= 0 ? stepTowardAny(g, m, m.dest, rng) : stepRandomAny(g, m, true, rng);
  }
  return mv;
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
  const visibleP = player === g.start ? -1 : player;
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
  readonly tg: TurnGraph;
  cfg: TurnConfig;
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
  // K481 stage 2 (by-length catches): the contact's moment - the move
  // fraction and both spots there - for the page to show the catch when
  // the animation reaches it. The turn's route (lastPath, lastSegLens,
  // lastTravel, lastFromSpot) stays readable until finishCatchAnim, so
  // `mino` keeps walking it while the catch is pending on screen; the
  // game state itself has already respawned, exactly as a runs catch.
  lastContact: { t: number; mino: Spot; player: Spot } | null = null;
  private committed: TurnStep[] = [];
  private committedPlan: TurnLengthPlan | null = null;
  private commitState: MinoState | null = null;

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

  // A level restart's new minotaur takes over the old one's tallies.
  carry(prev: TurnMinotaur): void {
    this.catches = prev.catches;
    this.closeCalls = prev.closeCalls;
    this.seen = prev.seen;
    this.restarts = prev.restarts;
  }

  // One turn: the player runs `edge` from their vertex (-1 = waits there).
  turn(edge: number): TurnResult {
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
    const from = this.state.v;
    let path: TurnStep[];
    // Where the player stood when this turn was decided: the telegraph
    // decided it before the move, from p; without one it is decided now.
    let seenAt = p2;
    if (this.cfg.telegraph && this.commitState) {
      path = this.committed;
      this.state = this.commitState;
      seenAt = p;
    } else {
      path = decide(g, this.cfg, this.state, p2, this.lifeTurn, this.rng.at(this.turns));
    }
    this.committed = [];
    this.commitState = null;
    this.lastFrom = from;
    this.lastPath = path;
    this.progress = 0;
    // Seen: a turn it took hunting you (the hunting getter's rule).
    if (
      this.state.left &&
      (this.cfg.policy === "chase" ? seenAt !== g.start : this.state.mode !== 0)
    ) {
      this.seen++;
    }
    if (p2 === g.exit) {
      this.player = p2;
      this.finished = true;
      return "win";
    }
    if (contact(p, edge, p2, from, path)) {
      this.catches++;
      this.lastCatch = { player: p2, mino: this.state.v };
      this.player = g.start;
      // K273: back to its lair, or it stays where its turn ended (a fresh
      // roam from there; its sleep and parity count from now, as a spawn's).
      this.state =
        this.cfg.lair === false
          ? { v: this.state.v, prev: -1, dest: -1, mode: 0, lastSeen: -1, left: true, spot: { ...this.state.spot } }
          : initMino(g);
      this.lifeTurn = 0;
      this.lastFrom = this.state.v;
      this.lastPath = [];
      this.progress = 1;
      this.commit();
      return "caught";
    }
    // A close call: the move ends one run from it (out of its lair; the
    // start is a sanctuary).
    if (this.state.left && p2 !== g.start && g.hopd(p2, this.state.v) === 1) {
      this.closeCalls++;
    }
    this.player = p2;
    this.commit();
    return "moved";
  }

  // K481: the choice travels at the player's vertex, for the telegraph's
  // ticks and the sim: each incident run, plus the wait (the median).
  lengthChoices(): { edge: number; length: number }[] {
    const g = this.tg;
    const out = g.chase.adj[this.player].map((e) => ({ edge: e, length: g.chase.len[e] }));
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
    const playerLen = edge < 0 ? g.medianLength : g.chase.len[edge];
    let plan: TurnLengthPlan;
    let seenAt = p2;
    if (this.cfg.telegraph && this.committedPlan) {
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
    this.committed = [];
    this.committedPlan = null;
    this.commitState = null;
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
    // Seen (decision 9): a turn counts when any hop it actually started
    // was decided hunting or checking (prox), or the chase could see the
    // player where the turn was decided.
    const hunted =
      this.cfg.policy === "chase"
        ? seenAt !== g.start
        : realized.hunted || this.state.mode !== 0;
    if (this.state.left && hunted) this.seen++;
    if (p2 === g.exit) {
      this.player = p2;
      this.finished = true;
      return "win";
    }
    const catchDist = this.cfg.catchDist ?? BY_LENGTH_CATCH_DIST;
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
      this.commit();
      return "caught";
    }
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

  private commitLength(): void {
    if (!this.cfg.telegraph || this.finished) {
      this.committed = [];
      this.committedPlan = null;
      this.commitState = null;
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
      factor * maxLen
    );
    this.committedPlan = plan;
    this.committed = plan.steps.slice();
    this.commitState = cloneMino(plan.stateAfter);
  }

  // The telegraph: decide the next turn now, from where the player stands.
  private commit(): void {
    if (this.cfg.byLength) return this.commitLength();
    if (!this.cfg.telegraph || this.finished) {
      this.committed = [];
      this.commitState = null;
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
  }

  private telegraphLength(): TurnTelegraph | null {
    const plan = this.committedPlan;
    if (!plan || this.progress < 1) return null;
    const g = this.tg;
    const catchDist = this.cfg.catchDist ?? BY_LENGTH_CATCH_DIST;
    const stops = this.lengthChoices().map((c) => {
      const travel = Math.min(plan.factor * c.length * travelScaleOf(this.cfg), plan.totalLength);
      const p2 =
        c.edge < 0 ? this.player : g.chase.ea[c.edge] === this.player ? g.chase.eb[c.edge] : g.chase.ea[c.edge];
      const caught =
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
    if (this.cfg.policy === "chase") return this.player !== this.tg.start;
    const m = this.commitState ?? this.state;
    return m.mode !== 0;
  }

  // Real time's display modes (the marker's glow reads them).
  get mode(): MinotaurMode {
    if (!this.state.left && !(this.progress < 1 && this.lastPath.length > 0)) return "lair";
    return this.hunting ? "hunt" : "wander";
  }

  // K481 stage 2: the page has shown the by-length catch at its contact
  // moment; the marker now stands where the game state already put it.
  finishCatchAnim(): void {
    this.progress = 1;
  }

  setProgress(frac: number): void {
    this.progress = frac >= 1 ? 1 : frac <= 0 ? 0 : frac;
  }

  // Where it stands for the renderer: along the last turn's steps, split by
  // run length (two runs share the player's one animation).
  get mino(): Spot {
    if (this.cfg.byLength) {
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
    if (path.length === 0 || this.progress >= 1) {
      return { edge: -1, pos: 0, dir: 1, vertex: this.state.v };
    }
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

// The design seed's own stream for the turn minotaur ("TURN").
export function turnSeed(seed: number): number {
  const s = Math.floor(Math.abs(seed)) % 4294967296;
  return (s ^ 0x5455524e) >>> 0;
}
