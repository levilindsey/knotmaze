// K138 THE RULE KIT (brief docs/design/K138_s1.md; design
// docs/design/K80_gameplay_additions.md 4.18 and 4.19): the walking rules
// beyond the plain walk (ice runs, game/ice.ts; the color rule,
// game/color_rule.ts) as one judge that the game and the search share. Pure
// walk-graph code, engine-exact (K108: + - * /, integer helpers and
// Math.imul only), so one link gives one layout, one par and one optimum
// everywhere.
//
// A RULE turns a tap on a run from a vertex, in a state, into a MOVE: the
// runs it walks (one, or ice's slide), the vertex it ends at, the state
// after it and its length (title runs count 0, as every maze meter does);
// null refuses the tap. FabricMazeController.tapEdge calls the same step.
//
// THE SEARCH (ruleSearch) runs over nodes (arrival, state, phase): the run
// the head arrived by and the end it arrived at (the vertex), so it can bar
// the tap the game reads as a backtrack and tell a rule where the head came
// from; the rule's state; and (stage 2) the PHASE, the MOVES made (taps
// that are not carried on: an advance or a backtrack, a slide one) mod the
// rule's `period` (default 1: no clock; the turnstiles, game/turnstiles.ts,
// turn on it). A step gets the arrival run as `last` (-1: none) and the
// phase. A breadth-first search finds the fewest taps (runs in
// vertex.edges order, so the route is deterministic) and a binary-heap
// Dijkstra the shortest length (ties by node number). Any state at the exit
// is solved. With period 1 a backtrack is never a move here: it returns to
// a node already reached (the game's backtrack restores the state), so it
// never shortens a route, and the node numbers and the search are stage
// 1's, so ice and the color rule search exactly as before.
// WITH A CLOCK (period > 1, backtracks on) a backtrack still restores the
// node but turns the clock, so a walk is the final path's advances plus
// EXCURSIONS that leave a path node and come back to it, each 2k taps
// that turn the clock 2k steps. The search takes the two shortest as
// edges: a BOUNCE, out along one legal move and back (2 taps, the clock
// + 2), and a DEEP BOUNCE, out two legal moves and back twice (4 taps, the
// clock + 4; two bounces do the same when the node can advance at both
// clocks). Any excursion starts with a legal advance, so a bounce is there
// whenever one is; a longer excursion (6 taps or more) is left out, and
// where only one of those would turn the clock as needed the search is an
// upper bound (a residual). A retreat from the head (undoing moves already
// made, then advancing elsewhere) is the controller's (ruleLeftFrom). The
// fewest taps run on a bucket queue (edges of 1, 2 and 4 taps), and the
// route lists every tap (a bounce's backtrack is the move's last run).
// A bounce retraces its moves, so neither kind takes a move the rule says
// cannot be backtracked (K138 stage 3, `blocksBack`: one that took a
// one-way run); a node whose every legal move is such has no bounce.
//
// COMPOSITION (composeRules): at most one rule EXPANDS a tap into several
// runs (ice: `expands`); it proposes the move, and every other rule judges
// each of its runs in order, from the vertex that run leaves, threading its
// own state and the run before it as `last`, all at the tap's phase (one
// move turns the clock once). One refusal refuses the tap. The composed
// state is the mixed-radix product of the parts' states, the period their
// least common multiple (each part reads the phase mod its own).
//
// PLACEMENT (placeRule): each mechanism draws from its own SeededRNG
// (ruleRng: FNV-1a of "<seed>:<name>"), never the shared rng(), whose draws
// build the maze. Up to PLACE_DRAWS draws from that one stream: the first
// that is solvable and BITES (the legal search's fewest taps, shortest
// length or best route's runs differ from the plain walk's), else the last
// solvable draw, else none. EXEMPT runs (never icy, no color) are the
// cut's uncuttable ones: K115 title runs and the two escape tails.

import type { WalkGraph } from "../core/walk_graph";
import { SeededRNG } from "../util/random";
import { cuttable } from "./cut";

export type RuleWalk = Pick<
  WalkGraph,
  "vertices" | "edges" | "start" | "exit" | "mazeStart" | "titleEdges"
>;

// One tap's move under a rule.
export interface RuleMove {
  runs: number[];
  to: string;
  state: number;
  length: number;
}

export interface WalkRule {
  readonly states: number; // the rule's states, 0 .. states - 1
  readonly start: number; // the state when the solve starts
  readonly expands?: boolean; // a tap may walk several runs (ice)
  // Stage 2: the clock's period in moves (default 1: no clock).
  readonly period?: number;
  // K138 stage 3: may a move over these runs NOT be backtracked (a one-way
  // run)? A clocked search's bounces skip such a move (default: none).
  readonly blocksBack?: (runs: readonly number[]) => boolean;
  // The move a tap on `run` from `from` makes in `state`, the head having
  // arrived by `last` (-1: none), after `phase` moves (mod the period, or
  // more: a rule reduces it mod its own); null: refused.
  step(from: string, run: number, state: number, last?: number, phase?: number): RuleMove | null;
}

// The greatest common divisor and least common multiple of two periods.
function gcd(a: number, b: number): number {
  while (b > 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}
const lcm = (a: number, b: number): number => (a / gcd(a, b)) * b;

export interface RuleSearch {
  solvable: boolean;
  fewest: number; // taps from the source to the exit (Infinity: none)
  shortest: number; // length from the source to the exit (Infinity: none)
  route: number[]; // the tapped runs of one fewest-taps route
  routeRuns: number[]; // every run that route walks
}

export const PLACE_DRAWS = 32;

// A run's length as the meters count it: a title run counts 0.
export function meterLength(walk: RuleWalk, run: number): number {
  return walk.titleEdges?.has(run) ? 0 : walk.edges[run].length;
}

// Never icy and never colored: title runs and the escape tails.
export function exemptRun(walk: RuleWalk, run: number): boolean {
  return !cuttable(walk, run);
}

// The plain walk as a rule: any incident run, to its far end.
export function plainRule(walk: RuleWalk): WalkRule {
  return {
    states: 1,
    start: 0,
    step(from, run, state) {
      const e = walk.edges[run];
      if (!e || (e.va !== from && e.vb !== from)) return null;
      return { runs: [run], to: e.va === from ? e.vb : e.va, state, length: meterLength(walk, run) };
    },
  };
}

// The rules as one (see the header's COMPOSITION).
export function composeRules(...rules: WalkRule[]): WalkRule {
  if (rules.length === 0) throw new Error("composeRules: no rules");
  const expanders = rules.filter((r) => r.expands);
  if (expanders.length > 1) throw new Error("composeRules: more than one expanding rule");
  if (rules.length === 1) return rules[0];
  const base = expanders[0] ?? rules[0];
  const judges = rules.filter((r) => r !== base);
  const parts = [base, ...judges];
  let states = 1;
  let period = 1;
  for (const r of parts) {
    states *= r.states;
    period = lcm(period, r.period ?? 1);
  }
  const blockers = parts.filter((r) => r.blocksBack);
  const encode = (s: number[]): number => {
    let out = 0;
    for (let i = parts.length - 1; i >= 0; i--) out = out * parts[i].states + s[i];
    return out;
  };
  const decode = (x: number): number[] => {
    const s: number[] = [];
    for (const r of parts) {
      s.push(x % r.states);
      x = (x - (x % r.states)) / r.states;
    }
    return s;
  };
  return {
    states,
    start: encode(parts.map((r) => r.start)),
    expands: base.expands,
    period,
    blocksBack: blockers.length > 0 ? (runs) => blockers.some((r) => r.blocksBack!(runs)) : undefined,
    step(from, run, state, last = -1, phase = 0) {
      const s = decode(state);
      const m = base.step(from, run, s[0], last, phase);
      if (!m) return null;
      const next = [m.state];
      for (let j = 0; j < judges.length; j++) {
        let js = s[j + 1];
        let at = from;
        let prev = last;
        for (let i = 0; i < m.runs.length; i++) {
          const r = m.runs[i];
          const jm = judges[j].step(at, r, js, prev, phase);
          if (!jm) return null;
          js = jm.state;
          at = jm.to;
          prev = r;
        }
        next.push(js);
      }
      return { runs: m.runs, to: m.to, state: encode(next), length: m.length };
    },
  };
}

// A binary min-heap of (key, node), ties by node.
class NodeHeap {
  private keys: number[] = [];
  private nodes: number[] = [];
  get size(): number {
    return this.nodes.length;
  }
  private less(i: number, j: number): boolean {
    const a = this.keys[i];
    const b = this.keys[j];
    return a < b || (a === b && this.nodes[i] < this.nodes[j]);
  }
  private swap(i: number, j: number): void {
    const k = this.keys[i];
    this.keys[i] = this.keys[j];
    this.keys[j] = k;
    const n = this.nodes[i];
    this.nodes[i] = this.nodes[j];
    this.nodes[j] = n;
  }
  push(key: number, node: number): void {
    this.keys.push(key);
    this.nodes.push(node);
    let i = this.nodes.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(i, p)) break;
      this.swap(i, p);
      i = p;
    }
  }
  pop(): [number, number] {
    const top: [number, number] = [this.keys[0], this.nodes[0]];
    const last = this.nodes.length - 1;
    this.swap(0, last);
    this.keys.pop();
    this.nodes.pop();
    let i = 0;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < this.nodes.length && this.less(l, m)) m = l;
      if (r < this.nodes.length && this.less(r, m)) m = r;
      if (m === i) break;
      this.swap(i, m);
      i = m;
    }
    return top;
  }
}

// Where a search starts: a vertex, the rule's state there, the run the
// head arrived by (the path's top run; -1 none) and the runs walked on the
// path (the phase; 0 by default).
export interface SearchFrom {
  vertex: string;
  state: number;
  last?: number;
  phase?: number;
}

// The fewest taps and the shortest length from `from` (default: the
// walk's start in the rule's start state) to the exit under `rule`.
// `backtracks` (default true) is the game outside memory-trail mode: a tap
// on the run the head arrived by is a backtrack, not a move, so the search
// never takes it as one (after a slide it would walk back only the slide's
// last run, to a junction the game cannot stop at).
export function ruleSearch(
  walk: RuleWalk,
  rule: WalkRule,
  from?: SearchFrom,
  backtracks = true
): RuleSearch {
  const none: RuleSearch = {
    solvable: false,
    fewest: Infinity,
    shortest: Infinity,
    route: [],
    routeRuns: [],
  };
  const E = walk.edges.length;
  const S = rule.states;
  const P = rule.period ?? 1;
  const srcV = from?.vertex ?? walk.start;
  const srcState = from?.state ?? rule.start;
  const srcPhase = (from?.phase ?? 0) % P;
  if (!walk.vertices.has(srcV) || !walk.vertices.has(walk.exit)) return none;
  if (srcV === walk.exit) {
    return { solvable: true, fewest: 0, shortest: 0, route: [], routeRuns: [] };
  }
  // Node = (key x S + state) x P + phase; key = 2 run + end for an arrival
  // by `run` at its end (0: va, 1: vb), 2E for the source. P = 1 gives
  // stage 1's numbers.
  const SRC = 2 * E;
  const keyOf = (run: number, to: string): number =>
    2 * run + (walk.edges[run].va === to ? 0 : 1);
  const last = from?.last ?? -1;
  const lastOk =
    last >= 0 && last < E && (walk.edges[last].va === srcV || walk.edges[last].vb === srcV);
  const vertOf = (key: number): string =>
    key === SRC ? srcV : (key & 1) === 0 ? walk.edges[key >> 1].va : walk.edges[key >> 1].vb;
  // The run the head arrived by at a key (-1 none), and the run a tap must
  // not take there (the arrival run, when a tap on it is a backtrack).
  const arrival = (key: number): number => (key === SRC ? (lastOk ? last : -1) : key >> 1);
  const barred = (key: number): number => (!backtracks ? -1 : arrival(key));
  const N = (2 * E + 1) * S * P;
  const source = (SRC * S + srcState) * P + srcPhase;
  const phaseOf = (n: number): number => n % P;
  const stateOf = (n: number): number => ((n - (n % P)) / P) % S;
  const keyOfNode = (n: number): number => {
    const ks = (n - (n % P)) / P;
    return (ks - (ks % S)) / S;
  };
  const nodeOf = (m: RuleMove, ph: number): number =>
    (keyOf(m.runs[m.runs.length - 1], m.to) * S + m.state) * P + ((ph + 1) % P);
  if (backtracks && P > 1) {
    return clockSearch(walk, rule, {
      N,
      source,
      srcV,
      srcState,
      srcPhase,
      P,
      keyOfNode,
      vertOf,
      barred,
      arrival,
      stateOf,
      phaseOf,
      nodeOf,
    });
  }
  // Breadth first: the fewest taps, and one route.
  const parent = new Int32Array(N).fill(-1);
  const parentRun = new Int32Array(N).fill(-1);
  const seen = new Uint8Array(N);
  seen[source] = 1;
  const queue = [source];
  let goal = -1;
  for (let qi = 0; qi < queue.length && goal < 0; qi++) {
    const n = queue[qi];
    const key = keyOfNode(n);
    const v = vertOf(key);
    const bar = barred(key);
    const came = arrival(key);
    const ph = phaseOf(n);
    for (const run of walk.vertices.get(v)!.edges) {
      if (run === bar) continue;
      const m = rule.step(v, run, stateOf(n), came, ph);
      if (!m) continue;
      const t = nodeOf(m, ph);
      if (seen[t]) continue;
      seen[t] = 1;
      parent[t] = n;
      parentRun[t] = run;
      if (m.to === walk.exit) {
        goal = t;
        break;
      }
      queue.push(t);
    }
  }
  if (goal < 0) return none;
  const route: number[] = [];
  for (let n = goal; n !== source; n = parent[n]) route.push(parentRun[n]);
  route.reverse();
  const routeRuns: number[] = [];
  let at = srcV;
  let state = srcState;
  let came = arrival(SRC);
  let ph = srcPhase;
  for (const run of route) {
    const m = rule.step(at, run, state, came, ph)!;
    routeRuns.push(...m.runs);
    at = m.to;
    state = m.state;
    came = m.runs[m.runs.length - 1];
    ph = (ph + 1) % P;
  }
  // Dijkstra: the shortest length.
  const dist = new Float64Array(N).fill(Infinity);
  dist[source] = 0;
  const heap = new NodeHeap();
  heap.push(0, source);
  let shortest = Infinity;
  while (heap.size > 0) {
    const [d, n] = heap.pop();
    if (d > dist[n]) continue;
    const key = keyOfNode(n);
    const v = vertOf(key);
    if (v === walk.exit) {
      shortest = d;
      break;
    }
    const bar = barred(key);
    const cameBy = arrival(key);
    const nph = phaseOf(n);
    for (const run of walk.vertices.get(v)!.edges) {
      if (run === bar) continue;
      const m = rule.step(v, run, stateOf(n), cameBy, nph);
      if (!m) continue;
      const t = nodeOf(m, nph);
      const nd = d + m.length;
      if (nd < dist[t]) {
        dist[t] = nd;
        heap.push(nd, t);
      }
    }
  }
  return { solvable: true, fewest: route.length, shortest, route, routeRuns };
}

// The search's node helpers, shared with clockSearch.
interface NodeKit {
  N: number;
  source: number;
  srcV: string;
  srcState: number;
  srcPhase: number;
  P: number;
  keyOfNode: (n: number) => number;
  vertOf: (key: number) => string;
  barred: (key: number) => number;
  arrival: (key: number) => number;
  stateOf: (n: number) => number;
  phaseOf: (n: number) => number;
  nodeOf: (m: RuleMove, ph: number) => number;
}

// An edge of the clocked search: an advance (1 tap), a bounce (2) or a deep
// bounce (4), by its first run (and the deep bounce's second).
const ADVANCE = 1;
const BOUNCE = 2;
const DEEP = 3;

// ruleSearch with a clock and backtracks (see the header's WITH A CLOCK).
function clockSearch(walk: RuleWalk, rule: WalkRule, k: NodeKit): RuleSearch {
  const { N, source, P } = k;
  // The node a bounce lands on: the same arrival and state, the clock on.
  const turned = (n: number, steps: number): number => n - (n % P) + ((n % P) + steps) % P;
  // The legal advances out of node n, in vertex.edges order.
  const advances = (n: number): { run: number; m: RuleMove }[] => {
    const key = k.keyOfNode(n);
    const v = k.vertOf(key);
    const bar = k.barred(key);
    const came = k.arrival(key);
    const out: { run: number; m: RuleMove }[] = [];
    for (const run of walk.vertices.get(v)!.edges) {
      if (run === bar) continue;
      const m = rule.step(v, run, k.stateOf(n), came, k.phaseOf(n));
      if (m) out.push({ run, m });
    }
    return out;
  };
  // The legal advances from where move `m` ends, at clock `ph` + 1.
  const after = (m: RuleMove, ph: number): RuleMove[] => {
    const last = m.runs[m.runs.length - 1];
    const out: RuleMove[] = [];
    for (const run of walk.vertices.get(m.to)!.edges) {
      if (run === last) continue;
      const m2 = rule.step(m.to, run, m.state, last, (ph + 1) % P);
      if (m2) out.push(m2);
    }
    return out;
  };
  // May a move be retraced (a bounce's way back; K138 stage 3)?
  const backable = (m: RuleMove): boolean => !rule.blocksBack || !rule.blocksBack(m.runs);
  // Fewest taps: a bucket queue over taps (edges of 1, 2 and 4).
  const dist = new Int32Array(N).fill(-1);
  const parent = new Int32Array(N).fill(-1);
  const kind = new Uint8Array(N);
  const viaA = new Int32Array(N).fill(-1);
  const viaB = new Int32Array(N).fill(-1);
  const buckets: number[][] = [[source]];
  dist[source] = 0;
  let goal = -1;
  const relax = (t: number, nd: number, from: number, kd: number, a: number, b: number): void => {
    if (dist[t] >= 0 && dist[t] <= nd) return;
    dist[t] = nd;
    parent[t] = from;
    kind[t] = kd;
    viaA[t] = a;
    viaB[t] = b;
    (buckets[nd] ??= []).push(t);
  };
  for (let d = 0; d < buckets.length; d++) {
    if (goal >= 0 && dist[goal] <= d) break;
    const bucket = buckets[d];
    if (!bucket) continue;
    for (let bi = 0; bi < bucket.length; bi++) {
      const n = bucket[bi];
      if (dist[n] !== d) continue;
      if (k.vertOf(k.keyOfNode(n)) === walk.exit) continue;
      const ph = k.phaseOf(n);
      const outs = advances(n);
      for (const { run, m } of outs) {
        const t = k.nodeOf(m, ph);
        const was = dist[t];
        relax(t, d + 1, n, ADVANCE, run, -1);
        if (m.to === walk.exit && dist[t] === d + 1 && was !== d + 1) {
          if (goal < 0 || dist[t] < dist[goal]) goal = t;
        }
      }
      if (outs.length === 0) continue;
      const bounce = outs.find(({ m }) => backable(m));
      if (bounce) relax(turned(n, 2), d + 2, n, BOUNCE, bounce.run, -1);
      for (const { run, m } of outs) {
        if (!backable(m)) continue;
        const m2 = after(m, ph).find(backable);
        if (!m2) continue;
        relax(turned(n, 4), d + 4, n, DEEP, run, m2.runs[0]);
        break;
      }
    }
  }
  const none: RuleSearch = { solvable: false, fewest: Infinity, shortest: Infinity, route: [], routeRuns: [] };
  if (goal < 0) return none;
  const steps: number[] = [];
  for (let n = goal; n !== source; n = parent[n]) steps.push(n);
  steps.reverse();
  const route: number[] = [];
  const routeRuns: number[] = [];
  let at = k.srcV;
  let state = k.srcState;
  let came = k.arrival(k.keyOfNode(source));
  let ph = k.srcPhase;
  const back = (runs: number[]): number[] => runs.slice().reverse();
  for (const n of steps) {
    const m = rule.step(at, viaA[n], state, came, ph)!;
    if (kind[n] === ADVANCE) {
      route.push(viaA[n]);
      routeRuns.push(...m.runs);
      at = m.to;
      state = m.state;
      came = m.runs[m.runs.length - 1];
      ph = (ph + 1) % P;
    } else if (kind[n] === BOUNCE) {
      route.push(viaA[n], m.runs[m.runs.length - 1]);
      routeRuns.push(...m.runs, ...back(m.runs));
      ph = (ph + 2) % P;
    } else {
      const last = m.runs[m.runs.length - 1];
      const m2 = rule.step(m.to, viaB[n], m.state, last, (ph + 1) % P)!;
      route.push(viaA[n], viaB[n], m2.runs[m2.runs.length - 1], last);
      routeRuns.push(...m.runs, ...m2.runs, ...back(m2.runs), ...back(m.runs));
      ph = (ph + 4) % P;
    }
  }
  // Shortest length: Dijkstra over the same edges (a bounce's length is its
  // shortest legal move's, twice; a deep bounce's its shortest pair's).
  const len = new Float64Array(N).fill(Infinity);
  len[source] = 0;
  const heap = new NodeHeap();
  heap.push(0, source);
  let shortest = Infinity;
  while (heap.size > 0) {
    const [d, n] = heap.pop();
    if (d > len[n]) continue;
    if (k.vertOf(k.keyOfNode(n)) === walk.exit) {
      shortest = d;
      break;
    }
    const ph = k.phaseOf(n);
    const push = (t: number, nd: number): void => {
      if (nd < len[t]) {
        len[t] = nd;
        heap.push(nd, t);
      }
    };
    const outs = advances(n);
    let one = Infinity;
    let two = Infinity;
    for (const { m } of outs) {
      push(k.nodeOf(m, ph), d + m.length);
      if (!backable(m)) continue;
      if (m.length < one) one = m.length;
      for (const m2 of after(m, ph)) {
        if (!backable(m2)) continue;
        if (m.length + m2.length < two) two = m.length + m2.length;
      }
    }
    if (Number.isFinite(one)) push(turned(n, 2), d + 2 * one);
    if (Number.isFinite(two)) push(turned(n, 4), d + 2 * two);
  }
  return { solvable: true, fewest: dist[goal], shortest, route, routeRuns };
}
// Does a legal search differ from the plain one (see the header's
// PLACEMENT)?
export function searchBites(legal: RuleSearch, plain: RuleSearch): boolean {
  if (!legal.solvable) return false;
  if (legal.fewest !== plain.fewest || legal.shortest !== plain.shortest) return true;
  if (legal.routeRuns.length !== plain.routeRuns.length) return true;
  return legal.routeRuns.some((r, i) => r !== plain.routeRuns[i]);
}

// Does the rule change the walk?
export function bites(walk: RuleWalk, rule: WalkRule): boolean {
  return searchBites(ruleSearch(walk, rule), ruleSearch(walk, plainRule(walk)));
}

// A mechanism's own stream: FNV-1a 32 of "<seed>:<name>" seeds a SeededRNG.
export function ruleRng(seed: number, name: string): SeededRNG {
  const s = `${seed}:${name}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return new SeededRNG(h >>> 0);
}

export interface Placement<T> {
  layout: T | null; // null: no draw was solvable
  bites: boolean; // the kept draw bites
  draws: number; // draws made
}

// Draw (from the caller's stream), search and redraw up to PLACE_DRAWS
// times: the first draw that is solvable and bites, else the last solvable
// draw, else none. A draw bites when its search differs from `base`'s (the
// plain rule by default; the color rule under ice passes the ice rule).
// K788: can the player walk into a trap under `rule`? A forward search over
// (arrival, state) nodes (a tap on the arrival run is a backtrack, never a
// move) finds every node the player can reach; SAFE nodes reach the exit by
// taps alone. A backtrack undoes a whole move, so a player outside SAFE
// escapes along their own path unless a move on it blocks its backtrack
// (`blocksBack`: a one-way run). A TRAP is a reached blocking move into a
// node that is not SAFE (the start itself unsafe counts too). Clocked rules
// (period > 1) turn the clock on a backtrack, so this period-1 check does
// not judge them and reports no trap.
export function ruleHasTrap(walk: RuleWalk, rule: WalkRule): boolean {
  if ((rule.period ?? 1) !== 1 || !rule.blocksBack) return false;
  const E = walk.edges.length;
  const S = rule.states;
  const SRC = 2 * E;
  const keyOf = (run: number, to: string): number =>
    2 * run + (walk.edges[run].va === to ? 0 : 1);
  const vertOf = (key: number): string =>
    key === SRC ? walk.start : (key & 1) === 0 ? walk.edges[key >> 1].va : walk.edges[key >> 1].vb;
  const N = (2 * E + 1) * S;
  const seen = new Uint8Array(N);
  const fwd: number[][] = [];
  const blocked = new Uint8Array(N);
  const exitNodes: number[] = [];
  const start = SRC * S + rule.start;
  const queue = [start];
  seen[start] = 1;
  const reached: number[] = [];
  for (let qi = 0; qi < queue.length; qi++) {
    const n = queue[qi];
    reached.push(n);
    const key = Math.floor(n / S);
    const v = vertOf(key);
    if (v === walk.exit) {
      exitNodes.push(n);
      continue;
    }
    const lastRun = key === SRC ? -1 : key >> 1;
    const outs: number[] = [];
    for (const run of walk.vertices.get(v)!.edges) {
      if (run === lastRun) continue;
      const m = rule.step(v, run, n % S, lastRun, 0);
      if (!m) continue;
      const t = keyOf(m.runs[m.runs.length - 1], m.to) * S + m.state;
      outs.push(t);
      if (rule.blocksBack(m.runs)) blocked[t] = 1;
      if (!seen[t]) {
        seen[t] = 1;
        queue.push(t);
      }
    }
    fwd[n] = outs;
  }
  const rev = new Map<number, number[]>();
  for (const n of reached) {
    for (const t of fwd[n] ?? []) {
      const list = rev.get(t);
      if (list) list.push(n);
      else rev.set(t, [n]);
    }
  }
  const ok = new Uint8Array(N);
  const stack = [...exitNodes];
  for (const n of exitNodes) ok[n] = 1;
  while (stack.length > 0) {
    const t = stack.pop()!;
    for (const n of rev.get(t) ?? []) {
      if (!ok[n]) {
        ok[n] = 1;
        stack.push(n);
      }
    }
  }
  if (!ok[start]) return true;
  for (const n of reached) if (blocked[n] && !ok[n]) return true;
  return false;
}

export function placeRule<T>(
  walk: RuleWalk,
  draw: () => T,
  ruleOf: (layout: T) => WalkRule,
  base: WalkRule | null = null,
  accept?: (rule: WalkRule) => boolean
): Placement<T> {
  const plain = ruleSearch(walk, base ?? plainRule(walk));
  let last: T | null = null;
  for (let i = 1; i <= PLACE_DRAWS; i++) {
    const layout = draw();
    const rule = ruleOf(layout);
    const legal = ruleSearch(walk, rule);
    if (!legal.solvable) continue;
    if (accept && !accept(rule)) continue;
    last = layout;
    if (searchBites(legal, plain)) return { layout, bites: true, draws: i };
  }
  return { layout: last, bites: false, draws: PLACE_DRAWS };
}
