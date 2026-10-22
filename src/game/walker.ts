// K114 WALKER (brief docs/design/K114_walker.md; design
// docs/design/K80_gameplay_additions.md R.3.9 and R.4.3): the auto-walker.
// In a walker mode the head is a walker, and the player's actions are cuts
// (game/cut.ts). Pure walk-graph code, engine-exact (K108: + - * /, sqrt
// and hypot2 only), so one link gives one walk and one par everywhere.
//
// STATE: a directed run d = 2 run + dir (dir 0 travels va -> vb and arrives
// at vb; dir 1 travels vb -> va and arrives at va). Leaving a run by its
// end k (0 = va, 1 = vb) is the directed run 2 run + k, so a run end and
// the departure from it share one index, and turning back is d ^ 1.
//
// THE MAP (WalkerMap, built once per maze): per run end, its HEADING (the
// greedy search's look: the point HEADING_LOOK of arc into the run, minus
// the vertex) and its strand CONTINUATION: at vb (ctrl ctrlB) the strand
// goes on into the run of the same chain whose ctrlA is ctrlB (mod 2
// nodeCount on a closed strand), at va into the run whose ctrlB is ctrlA.
// None (-1): the strand ends at that junction (a splice bridge, H1's
// trimmed strand, a title seam).
//
// LEAD THE WALKER (the strand follower): arriving at a vertex it takes the
// first live entry of its PREFERENCE LIST: the continuation, then the
// other run ends clockwise from straight on (s = minus the arrival
// heading; screen y down, so clockwise is a right turn: it keeps right),
// then back the way it came. An END's list is back alone. Cut runs are
// gone. The walk is deterministic, so a repeated directed state is a LOOP
// (it would repeat forever). The route is the walk to the exit or to its
// first repeat (leadRoute).
//
// DELAY IT (the replanning shortest route): at its vertex it takes the
// live run with the least length + distance from the far end to the exit
// (stage 1's distancesToExit, cut runs removed), ties by run id.
//
// PAR (leadPar): the fewest cuts that lead the walker to the exit.
// R.3.9's MODEL is a shortest path over directed states where taking the
// k-th entry of a preference list costs the k runs before it (none past an
// uncuttable run or the run just walked). Its route's cut set (the union
// over the visits) is CHECKED by simulating the walker. The EXACT search
// walks the rule over partial assignments (each run open, live or cut):
// the walk runs as the rule says until the first open run in a preference
// list, then branches (take it, so it is live; or cut it and look at the
// next entry), deepening on the cut count. A walked run is live, an
// uncuttable run is live from the start, and a repeated state fails (the
// decisions it rests on are fixed, so the walk would repeat forever), so
// the first count that succeeds is the par. STEP BUDGET: the search counts
// directed steps (never wall-clock time: one link, one par); past the
// budget the checked model cut set stands as an upper bound (exact false).

import type { TangleGraph } from "../core/types";
import type { WalkGraph } from "../core/walk_graph";
import { HEADING_LOOK, runPoly } from "../core/greedy_search";
import { hypot2 } from "../util/det_math";
import { cuttable, distancesToExit } from "./cut";

export type WalkerMode = "lead" | "delay";

// What the HUD, the win banner and the share say of a walker game: Lead's
// par (null: none found within the budget), Delay's walk and the walk it
// wanted, both in runs. K713: `upper` true marks Lead's par as an upper
// bound (the search ran past its budget: ParResult.exact false), which
// they show as "par ≤ P"; absent or false, the par is exact.
export type WalkerScore =
  | { mode: "lead"; par: number | null; upper?: boolean }
  | { mode: "delay"; walk: number; shortest: number };

type WalkerWalk = Pick<
  WalkGraph,
  "vertices" | "edges" | "start" | "exit" | "mazeStart" | "titleEdges" | "distToExit"
>;

export interface WalkerMap {
  readonly walk: WalkerWalk;
  // Runs.
  readonly n: number;
  // Per run end (2 run + end): the heading's x at [2 i], y at [2 i + 1].
  readonly head: Float64Array;
  // Per run end: the directed run the strand goes on into there, or -1.
  readonly cont: Int32Array;
  // Per directed run, lazily (leadEntries): its preference list, back last.
  readonly entries: Array<Int32Array | undefined>;
}

// The vertex a directed run arrives at.
export function arrivalOf(m: WalkerMap, d: number): string {
  const e = m.walk.edges[d >> 1];
  return (d & 1) === 0 ? e.vb : e.va;
}

// The vertex a directed run leaves from.
export function departureOf(m: WalkerMap, d: number): string {
  const e = m.walk.edges[d >> 1];
  return (d & 1) === 0 ? e.va : e.vb;
}

// The heading of a polyline from its first point: the point `look` of arc
// along it (its last point on a shorter one), minus the first.
function lookHeading(pts: ReadonlyArray<readonly [number, number]>): [number, number] {
  if (pts.length < 2) return [0, 0];
  const p = pts[0];
  let q: readonly [number, number] = pts[pts.length - 1];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const seg = hypot2(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc + seg >= HEADING_LOOK && seg > 0) {
      const t = (HEADING_LOOK - acc) / seg;
      q = [
        pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t,
        pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t,
      ];
      break;
    }
    acc += seg;
  }
  return [q[0] - p[0], q[1] - p[1]];
}

// The map from per-run polylines (va -> vb) and per-chain periods (2
// nodeCount for a closed strand, 0 for an open one). Tests build it from
// hand-made polylines; walkerMapOf reads a tangle graph.
export function buildWalkerMap(
  walk: WalkerWalk,
  polyOf: (run: number) => ReadonlyArray<readonly [number, number]>,
  periodOf: (chain: number) => number
): WalkerMap {
  const n = walk.edges.length;
  const head = new Float64Array(4 * n);
  const cont = new Int32Array(2 * n).fill(-1);
  const startAt = new Map<string, number>();
  const endAt = new Map<string, number>();
  const wrap = (chain: number, c: number): number => {
    const p = periodOf(chain);
    return p > 0 ? c % p : c;
  };
  for (const e of walk.edges) {
    if (e.chain < 0) continue; // K137 tunnels (4.13): no thread to ride.
    const pts = polyOf(e.id);
    const h0 = lookHeading(pts);
    const h1 = lookHeading([...pts].reverse());
    head[4 * e.id] = h0[0];
    head[4 * e.id + 1] = h0[1];
    head[4 * e.id + 2] = h1[0];
    head[4 * e.id + 3] = h1[1];
    startAt.set(`${e.chain}:${wrap(e.chain, e.ctrlA)}`, e.id);
    endAt.set(`${e.chain}:${wrap(e.chain, e.ctrlB)}`, e.id);
  }
  for (const e of walk.edges) {
    if (e.chain < 0) continue; // K137 tunnels (4.13)
    const on = startAt.get(`${e.chain}:${wrap(e.chain, e.ctrlB)}`);
    if (on !== undefined && walk.edges[on].va === e.vb) cont[2 * e.id + 1] = 2 * on;
    const back = endAt.get(`${e.chain}:${wrap(e.chain, e.ctrlA)}`);
    if (back !== undefined && walk.edges[back].vb === e.va) cont[2 * e.id] = 2 * back + 1;
  }
  return { walk, n, head, cont, entries: new Array(2 * n) };
}

// The map of a built maze.
export function walkerMapOf(graph: TangleGraph, walk: WalkerWalk): WalkerMap {
  return buildWalkerMap(
    walk,
    (r) => runPoly(graph, walk.edges[r]),
    (chain) => {
      const s = graph.strands[chain];
      return s && s.isClosed ? 2 * (s.nodes.length - 1) : 0;
    }
  );
}

// The run ends at a vertex as departures (2 run + end), a self-loop twice.
// Exported for K114's beat rider.
export function departures(m: WalkerMap, v: string): number[] {
  const out: number[] = [];
  const vert = m.walk.vertices.get(v);
  if (!vert) return out;
  for (const r of vert.edges) {
    const e = m.walk.edges[r];
    if (e.va === v) out.push(2 * r);
    if (e.vb === v) out.push(2 * r + 1);
  }
  return out;
}

// Lead's preference list on arriving by `d`: the continuation, the other
// run ends clockwise from straight on, then back (d ^ 1). Cached.
export function leadEntries(m: WalkerMap, d: number): Int32Array {
  const hit = m.entries[d];
  if (hit) return hit;
  const back = d ^ 1;
  const v = arrivalOf(m, d);
  const vert = m.walk.vertices.get(v);
  let out: Int32Array;
  if (!vert || vert.isEnd) {
    out = Int32Array.of(back);
  } else {
    const c = m.cont[back];
    const sx = -m.head[2 * back];
    const sy = -m.head[2 * back + 1];
    const others = departures(m, v).filter((x) => x !== back && x !== c);
    // Clockwise angle from s, by half-plane ([0, 180) first) and then the
    // sign of the cross product; equal directions by index. Exact.
    const half = (x: number): number => {
      const hx = m.head[2 * x];
      const hy = m.head[2 * x + 1];
      const cr = sx * hy - sy * hx;
      return cr > 0 || (cr === 0 && sx * hx + sy * hy > 0) ? 0 : 1;
    };
    others.sort((x, y) => {
      const hx = half(x);
      const hy = half(y);
      if (hx !== hy) return hx - hy;
      const cr = m.head[2 * x] * m.head[2 * y + 1] - m.head[2 * x + 1] * m.head[2 * y];
      if (cr > 0) return -1;
      if (cr < 0) return 1;
      return x - y;
    });
    const list = c >= 0 ? [c, ...others] : others;
    list.push(back);
    out = Int32Array.from(list);
  }
  m.entries[d] = out;
  return out;
}

// The walker's first run from the start: the start's run ends by index
// (an END has one); -1 when every one is cut.
export function leadFirst(m: WalkerMap, cut: (run: number) => boolean): number {
  for (const x of departures(m, m.walk.start).sort((a, b) => a - b)) {
    if (!cut(x >> 1)) return x;
  }
  return -1;
}

// Lead's next directed run after arriving by `d`.
export function leadNext(m: WalkerMap, d: number, cut: (run: number) => boolean): number {
  const list = leadEntries(m, d);
  for (let i = 0; i < list.length - 1; i++) {
    if (!cut(list[i] >> 1)) return list[i];
  }
  return d ^ 1;
}

export interface LeadRoute {
  // The directed runs walked, in order (the first repeat not included).
  states: number[];
  // "exit": the last state arrives at the exit; "loop": the next state
  // would be states[loopAt] again; "none": no live run leaves the start.
  end: "exit" | "loop" | "none";
  loopAt: number;
}

// The walker's whole walk from the start with `cuts` gone: to the exit or
// to its first repeated state.
export function leadRoute(m: WalkerMap, cuts: ReadonlySet<number>): LeadRoute {
  const cut = (r: number): boolean => cuts.has(r);
  const states: number[] = [];
  const seen = new Int32Array(2 * m.n).fill(-1);
  let d = leadFirst(m, cut);
  if (d < 0) return { states, end: "none", loopAt: -1 };
  for (;;) {
    if (seen[d] >= 0) return { states, end: "loop", loopAt: seen[d] };
    seen[d] = states.length;
    states.push(d);
    if (arrivalOf(m, d) === m.walk.exit) return { states, end: "exit", loopAt: -1 };
    d = leadNext(m, d, cut);
  }
}

// Delay's next run from vertex `at`: the live run with the least length +
// distance to the exit from its far end, ties by run id; -1 at the exit or
// with no way on.
export function delayNext(
  walk: Pick<WalkGraph, "vertices" | "edges" | "exit" | "distToExit">,
  at: string,
  cuts: ReadonlySet<number>,
  dist: ReadonlyMap<string, number> = distancesToExit(walk, cuts)
): number {
  if (at === walk.exit) return -1;
  const vert = walk.vertices.get(at);
  if (!vert) return -1;
  let best = -1;
  let bestCost = Infinity;
  for (const r of vert.edges) {
    if (cuts.has(r)) continue;
    const e = walk.edges[r];
    const far = e.va === at ? e.vb : e.va;
    const c = e.length + (dist.get(far) ?? Infinity);
    if (c < bestCost || (c === bestCost && best >= 0 && r < best)) {
      best = r;
      bestCost = c;
    }
  }
  return best;
}

// Delay's route from `at` while nothing more is cut: its runs to the exit.
export function delayRoute(
  walk: Pick<WalkGraph, "vertices" | "edges" | "exit" | "distToExit">,
  at: string,
  cuts: ReadonlySet<number>
): number[] {
  const dist = distancesToExit(walk, cuts);
  const out: number[] = [];
  let v = at;
  for (let guard = 0; guard <= walk.edges.length && v !== walk.exit; guard++) {
    const r = delayNext(walk, v, cuts, dist);
    if (r < 0) break;
    out.push(r);
    const e = walk.edges[r];
    v = e.va === v ? e.vb : e.va;
  }
  return out;
}

export interface ParResult {
  // The fewest cuts found that lead the walker to the exit (Infinity: none
  // found within the cap).
  par: number;
  // A cut set of that size, ascending.
  cuts: number[];
  // True when the search proved no smaller set works.
  exact: boolean;
  // The model's cost (the sum over its route's visits; Infinity: no route).
  model: number;
  // Its route's cut set (the union), and whether the walker reaches the
  // exit with it.
  modelCuts: number[];
  modelValid: boolean;
  // Directed steps the exact search took.
  steps: number;
}

// The default budgets: the page's par (synchronous at scene build) and the
// largest cut count the search tries without a checked model set.
export const PAR_STEP_BUDGET = 400_000;
export const PAR_MAX_CUTS = 12;

const OPEN = 0;
const LIVE = 1;
const CUT = 2;

// R.3.9's model: the cheapest route over directed states (cost: the runs
// skipped in each preference list), and its cut set.
function parModel(m: WalkerMap): { cost: number; cuts: number[] } {
  const walk = m.walk;
  const N = 2 * m.n;
  const dist = new Float64Array(N).fill(Infinity);
  const parent = new Int32Array(N).fill(-1);
  const buckets: number[][] = [];
  const push = (d: number, c: number, from: number): void => {
    if (c >= dist[d]) return;
    dist[d] = c;
    parent[d] = from;
    (buckets[c] || (buckets[c] = [])).push(d);
  };
  // The start's run ends, by index: skipping one costs a cut.
  const first = departures(m, walk.start).sort((a, b) => a - b);
  for (let i = 0; i < first.length; i++) {
    push(first[i], i, -1);
    if (!cuttable(walk, first[i] >> 1)) break;
  }
  let goal = -1;
  for (let c = 0; c < buckets.length && goal < 0; c++) {
    const bucket = buckets[c];
    if (!bucket) continue;
    for (let k = 0; k < bucket.length; k++) {
      const d = bucket[k];
      if (dist[d] !== c) continue;
      if (arrivalOf(m, d) === walk.exit) {
        goal = d;
        break;
      }
      const list = leadEntries(m, d);
      const skipped: number[] = [];
      for (let i = 0; i < list.length; i++) {
        const a = list[i] >> 1;
        if (skipped.includes(a)) continue;
        push(list[i], c + skipped.length, d);
        if (a === d >> 1 || !cuttable(walk, a)) break;
        skipped.push(a);
      }
    }
  }
  if (goal < 0) return { cost: Infinity, cuts: [] };
  const cuts = new Set<number>();
  let d = goal;
  for (; parent[d] >= 0; d = parent[d]) {
    const list = leadEntries(m, parent[d]);
    for (let i = 0; i < list.length && list[i] !== d; i++) cuts.add(list[i] >> 1);
  }
  for (let i = 0; i < first.length && first[i] !== d; i++) cuts.add(first[i] >> 1);
  return { cost: dist[goal], cuts: [...cuts].sort((a, b) => a - b) };
}

// Is there a set of at most `limit` cuts that leads the walker to the
// exit? The exact search (see the header); null when the budget ran out.
function exactSearch(
  m: WalkerMap,
  limit: number,
  state: { steps: number; budget: number }
): number[] | false | null {
  const walk = m.walk;
  const assign = new Uint8Array(m.n);
  for (let r = 0; r < m.n; r++) if (!cuttable(walk, r)) assign[r] = LIVE;
  const visited = new Uint8Array(2 * m.n);
  const trailStates: number[] = [];
  const trailRuns: number[] = [];
  let aborted = false;
  const exit = walk.exit;

  const go = (d0: number, used: number): boolean => {
    const s0 = trailStates.length;
    const r0 = trailRuns.length;
    let d = d0;
    for (;;) {
      if (visited[d]) break;
      if (++state.steps > state.budget) {
        aborted = true;
        break;
      }
      visited[d] = 1;
      trailStates.push(d);
      const r = d >> 1;
      if (assign[r] === OPEN) {
        assign[r] = LIVE;
        trailRuns.push(r);
      }
      if (arrivalOf(m, d) === exit) return true;
      const list = leadEntries(m, d);
      let next = -1;
      let at = -1;
      for (let i = 0; i < list.length; i++) {
        const s = assign[list[i] >> 1];
        if (s === CUT) continue;
        if (s === LIVE) next = list[i];
        else at = i;
        break;
      }
      if (at >= 0) {
        if (branch(list, at, used)) return true;
        break;
      }
      if (next < 0) break; // Cannot happen: the run just walked is live.
      d = next;
    }
    while (trailStates.length > s0) visited[trailStates.pop()!] = 0;
    while (trailRuns.length > r0) assign[trailRuns.pop()!] = OPEN;
    return false;
  };

  const branch = (list: ArrayLike<number>, from: number, used: number): boolean => {
    const cutHere: number[] = [];
    let ok = false;
    for (let i = from; i < list.length && !aborted; i++) {
      const x = list[i];
      const a = x >> 1;
      const s = assign[a];
      if (s === CUT) continue;
      if (s === LIVE) {
        ok = go(x, used);
        break;
      }
      assign[a] = LIVE;
      if (go(x, used)) {
        ok = true;
        break;
      }
      assign[a] = OPEN;
      if (used >= limit) break;
      assign[a] = CUT;
      cutHere.push(a);
      used++;
    }
    if (!ok) for (const a of cutHere) assign[a] = OPEN;
    return ok;
  };

  const first = departures(m, walk.start).sort((a, b) => a - b);
  const ok = branch(first, 0, 0);
  if (aborted) return null;
  if (!ok) return false;
  const cuts: number[] = [];
  for (let r = 0; r < m.n; r++) if (assign[r] === CUT) cuts.push(r);
  return cuts;
}

// Lead's par: the model, its check, then the exact search below it.
export function leadPar(
  m: WalkerMap,
  opts: { budget?: number; maxCuts?: number } = {}
): ParResult {
  const budget = opts.budget ?? PAR_STEP_BUDGET;
  const maxCuts = opts.maxCuts ?? PAR_MAX_CUTS;
  const model = parModel(m);
  const modelValid =
    Number.isFinite(model.cost) && leadRoute(m, new Set(model.cuts)).end === "exit";
  const state = { steps: 0, budget };
  let best: number[] | null = modelValid ? model.cuts : null;
  const top = best ? best.length - 1 : maxCuts;
  let exact = true;
  for (let k = 0; k <= top; k++) {
    const found = exactSearch(m, k, state);
    if (found === null) {
      exact = false;
      break;
    }
    if (found) {
      best = found;
      break;
    }
  }
  if (!best) {
    return {
      par: Infinity,
      cuts: [],
      exact: false,
      model: model.cost,
      modelCuts: model.cuts,
      modelValid,
      steps: state.steps,
    };
  }
  return {
    par: best.length,
    cuts: best,
    exact,
    model: model.cost,
    modelCuts: model.cuts,
    modelValid,
    steps: state.steps,
  };
}
