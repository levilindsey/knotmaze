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
  roam: number; // runs: the hunter's farthest roam destination
  territory: number; // runs from the exit junction: the guard's ground
  accuracy: number; // [0, 1]: chance a hunting step is a best one
  pause: number; // [0, 1]: chance it stands still for a turn
  sleep: number; // turns in its lair before it first moves
}

// The defaults are the research's hunter (section 0: prox, see 4, lose 7,
// q 0.9, stall 0.1, roam 3-8 runs; the guard's territory 1-6).
export const DEFAULT_TURN_MINO: Readonly<TurnMinoParams> = Object.freeze({
  model: "off",
  speed: "one",
  telegraph: true,
  sight: 4,
  roam: 8,
  territory: 6,
  accuracy: 0.9,
  pause: 0.1,
  sleep: 0,
});

// ...and gives up beyond sight + LOSE_MARGIN runs (a rule, not a knob).
export const LOSE_MARGIN = 3;
// The hunter's nearest roam destination, in runs (at most `roam`).
export const ROAM_MIN = 3;

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
    lose: p.sight + LOSE_MARGIN,
    sleep: p.sleep,
  };
  if (p.speed === "charge") base.chaseSpeed = 2;
  if (p.model === "stalker") return { ...base, policy: "chase" };
  if (p.model === "guard") return { ...base, home: true, rMin: 1, rMax: p.territory };
  return { ...base, rMin: Math.min(ROAM_MIN, p.roam), rMax: p.roam };
}

export function mix32(x: number): number {
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

// Counter-based draws: next() is a pure function of (seed, turn, k).
export class TurnRng {
  private turn = 0;
  private k = 0;
  constructor(readonly seed: number) {}
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
  v: number;
  prev: number;
  dest: number; // roam destination, -1 = none
  mode: number; // prox: 0 roam, 1 hunt, 2 to where it last saw you
  lastSeen: number;
  left: boolean; // has left its lair
}

// One step of a turn: [run, the vertex it ends on].
export type TurnStep = [number, number];

export function initMino(g: TurnGraph): MinoState {
  return { v: g.exit, prev: -1, dest: -1, mode: 0, lastSeen: -1, left: false };
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

function wanderDest(g: TurnGraph, cfg: TurnConfig, v: number, rng: TurnRng): number {
  const lo = cfg.rMin ?? 3;
  const hi = cfg.rMax ?? 8;
  const c: number[] = [];
  for (let w = 0; w < g.n; w++) {
    if (g.chase.isEnd[w]) continue;
    const d = g.hopd(v, w);
    if (d >= lo && d <= hi) c.push(w);
  }
  if (c.length === 0) return -1;
  return c[Math.floor(rng.next() * c.length)];
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
          m.dest = wanderDest(g, cfg, cfg.home ? g.exitJ : m.v, rng);
        }
        mv = m.dest >= 0 ? stepToward(g, m.v, m.dest, rng) : stepRandom(g, m, true, rng);
      }
    }
    apply(mv);
  }
  return out;
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
  from: number; // vertex it leaves
  steps: readonly TurnStep[]; // runs it will take (empty = it stays)
  dest: number; // vertex it will end the turn on
}

export class TurnMinotaur {
  readonly tg: TurnGraph;
  cfg: TurnConfig;
  private readonly rng: TurnRng;
  catches = 0;
  turns = 0; // Turns played this game: the RNG's counter.
  lifeTurn = 0; // Turns since the last (re)spawn: sleep and half-speed parity.
  finished = false;
  player: number; // Vertex index.
  state: MinoState;
  readonly inputs: number[] = []; // Run per turn, -1 = a wait.
  // The last turn, for the animation: where it left from and its steps.
  lastFrom: number;
  lastPath: TurnStep[] = [];
  // Animation progress through the last turn, [0, 1] (1 = at rest).
  progress = 1;
  private committed: TurnStep[] = [];
  private commitState: MinoState | null = null;

  constructor(walk: WalkGraph | TurnGraph, cfg: TurnConfig, seed: number) {
    this.tg = walk instanceof TurnGraph ? walk : new TurnGraph(walk);
    this.cfg = cfg;
    this.rng = new TurnRng(seed >>> 0);
    this.player = this.tg.start;
    this.state = initMino(this.tg);
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

  // One turn: the player runs `edge` from their vertex (-1 = waits there).
  turn(edge: number): TurnResult {
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
    if (this.cfg.telegraph && this.commitState) {
      path = this.committed;
      this.state = this.commitState;
    } else {
      path = decide(g, this.cfg, this.state, p2, this.lifeTurn, this.rng.at(this.turns));
    }
    this.committed = [];
    this.commitState = null;
    this.lastFrom = from;
    this.lastPath = path;
    this.progress = 0;
    if (p2 === g.exit) {
      this.player = p2;
      this.finished = true;
      return "win";
    }
    if (contact(p, edge, p2, from, path)) {
      this.catches++;
      this.player = g.start;
      this.state = initMino(g);
      this.lifeTurn = 0;
      this.lastFrom = this.state.v;
      this.lastPath = [];
      this.progress = 1;
      this.commit();
      return "caught";
    }
    this.player = p2;
    this.commit();
    return "moved";
  }

  // The telegraph: decide the next turn now, from where the player stands.
  private commit(): void {
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

  // The committed next move (null without the telegraph, or mid-animation).
  telegraph(): TurnTelegraph | null {
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

  setProgress(frac: number): void {
    this.progress = frac >= 1 ? 1 : frac <= 0 ? 0 : frac;
  }

  // Where it stands for the renderer: along the last turn's steps, split by
  // run length (two runs share the player's one animation).
  get mino(): Spot {
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
