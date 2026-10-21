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
// THE SEARCH (ruleSearch) runs over nodes (arrival, state): the run the
// head arrived by and the end it arrived at (the vertex), so it can bar
// the tap the game reads as a backtrack. A breadth-first search finds the
// fewest taps (runs in vertex.edges order, so the route is deterministic)
// and a binary-heap Dijkstra the shortest length (ties by node number).
// Any state at the exit is solved. A backtrack is not a move here: it
// returns to a node already reached, so it never shortens a route.
//
// COMPOSITION (composeRules): at most one rule EXPANDS a tap into several
// runs (ice: `expands`); it proposes the move, and every other rule judges
// each of its runs in order, from the vertex that run leaves, threading its
// own state. One refusal refuses the tap. The composed state is the
// mixed-radix product of the parts' states.
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
  // The move a tap on `run` from `from` makes in `state`; null: refused.
  step(from: string, run: number, state: number): RuleMove | null;
}

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
  for (const r of parts) states *= r.states;
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
    step(from, run, state) {
      const s = decode(state);
      const m = base.step(from, run, s[0]);
      if (!m) return null;
      const next = [m.state];
      for (let j = 0; j < judges.length; j++) {
        let js = s[j + 1];
        let at = from;
        for (const r of m.runs) {
          const jm = judges[j].step(at, r, js);
          if (!jm) return null;
          js = jm.state;
          at = jm.to;
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

// Where a search starts: a vertex, the rule's state there and the run the
// head arrived by (the path's top run; -1 none).
export interface SearchFrom {
  vertex: string;
  state: number;
  last?: number;
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
  const srcV = from?.vertex ?? walk.start;
  const srcState = from?.state ?? rule.start;
  if (!walk.vertices.has(srcV) || !walk.vertices.has(walk.exit)) return none;
  if (srcV === walk.exit) {
    return { solvable: true, fewest: 0, shortest: 0, route: [], routeRuns: [] };
  }
  // Node = key x S + state; key = 2 run + end for an arrival by `run` at
  // its end (0: va, 1: vb), 2E for the source.
  const SRC = 2 * E;
  const keyOf = (run: number, to: string): number =>
    2 * run + (walk.edges[run].va === to ? 0 : 1);
  const last = from?.last ?? -1;
  const lastOk =
    last >= 0 && last < E && (walk.edges[last].va === srcV || walk.edges[last].vb === srcV);
  const vertOf = (key: number): string =>
    key === SRC ? srcV : (key & 1) === 0 ? walk.edges[key >> 1].va : walk.edges[key >> 1].vb;
  // The run a tap must not take from a key (the arrival run; -1 none).
  const barred = (key: number): number =>
    !backtracks ? -1 : key === SRC ? (lastOk ? last : -1) : key >> 1;
  const N = (2 * E + 1) * S;
  const source = SRC * S + srcState;
  const keyOfNode = (n: number): number => (n - (n % S)) / S;
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
    for (const run of walk.vertices.get(v)!.edges) {
      if (run === bar) continue;
      const m = rule.step(v, run, n % S);
      if (!m) continue;
      const t = keyOf(m.runs[m.runs.length - 1], m.to) * S + m.state;
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
  for (const run of route) {
    const m = rule.step(at, run, state)!;
    routeRuns.push(...m.runs);
    at = m.to;
    state = m.state;
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
    for (const run of walk.vertices.get(v)!.edges) {
      if (run === bar) continue;
      const m = rule.step(v, run, n % S);
      if (!m) continue;
      const t = keyOf(m.runs[m.runs.length - 1], m.to) * S + m.state;
      const nd = d + m.length;
      if (nd < dist[t]) {
        dist[t] = nd;
        heap.push(nd, t);
      }
    }
  }
  return { solvable: true, fewest: route.length, shortest, route, routeRuns };
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
// draw, else none.
export function placeRule<T>(
  walk: RuleWalk,
  draw: () => T,
  ruleOf: (layout: T) => WalkRule
): Placement<T> {
  const plain = ruleSearch(walk, plainRule(walk));
  let last: T | null = null;
  for (let i = 1; i <= PLACE_DRAWS; i++) {
    const layout = draw();
    const rule = ruleOf(layout);
    const legal = ruleSearch(walk, rule);
    if (!legal.solvable) continue;
    last = layout;
    if (searchBites(legal, plain)) return { layout, bites: true, draws: i };
  }
  return { layout: last, bites: false, draws: PLACE_DRAWS };
}
