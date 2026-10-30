// K138 ONE-WAY RUNS (brief docs/design/K138_s3.md; plan
// docs/design/K138_plan.md 4.2; design docs/design/K80_gameplay_additions.md
// 4.2). A one-way run is walked one way only: in at its ENTRY vertex, out at
// the other end.
//
// THE ORIENTATION (oneWayCore): the CORE is the largest 2-edge-connected
// piece of the walk graph over the runs that may turn one-way: no exempt run
// (title runs and the escape tails, `exemptRun`) and no self-loop. Bridges
// (Tarjan, by run id, so two parallel runs make a cycle) split it off; the
// pockets and tails that hang off it stay two-way. One DFS of the core,
// rooted at the first core vertex of the base route, gives every core run a
// direction: a tree run from parent to child, a back run from descendant to
// ancestor (Robbins: a bridgeless graph has a strongly connected orientation,
// and a DFS finds one). A draw orients a subset of it, and reverses the whole
// subset on a coin (the reverse of a strongly connected orientation is one
// too).
// NO TRAPS: orient any subset of a strongly connected orientation of the core
// and leave every other run two-way, and every pair of vertices that was
// connected stays connected both ways (a core stretch of any walk can be
// swapped for a directed core path), so every vertex still reaches the exit.
//
// PLACEMENT (placeOneWay): each draw orients round(share x core runs) of
// them, sampled without replacement from the "oneWay" stream with
// ROUTE_WEIGHT tickets for a run of the base route (the plain route, or the
// route of the rules beneath) and 1 for the rest, then the coin. The kit's
// placeRule keeps the first draw that is solvable and bites (else the last
// solvable). Share 0 places nothing and draws nothing; so does a maze with no
// core.
//
// THE RULE (oneWayRule): a one-way run may be tapped only from its entry. The
// kit has no backtrack move (the search bars the arrival run), so par is the
// directed search. In the game a backtrack retraces a whole move, so the
// controller refuses one whose move took a one-way run (oneWayBlocksBack);
// Undo replays the actions, so it is always allowed. With a clock
// (turnstiles) the kit's bounces backtrack, so the rule's blocksBack keeps
// them off such a move too.

import type { RuleWalk, WalkRule, Placement } from "./rule_search";
import { composeRules, exemptRun, meterLength, placeRule, plainRule, ruleHasTrap, ruleRng, ruleSearch } from "./rule_search";

export const ONE_WAY_MAX = 0.6;
// A base-route run's tickets in the draw (1 for any other core run).
export const ROUTE_WEIGHT = 4;

// One-way runs: run id -> the vertex it must be entered from.
export type OneWayLayout = ReadonlyMap<number, string>;

// May `run` take a direction? Not exempt, not a self-loop.
export function orientable(walk: RuleWalk, run: number): boolean {
  const e = walk.edges[run];
  return !!e && e.va !== e.vb && !exemptRun(walk, run);
}

// A one-way run's far end from its entry.
function otherEnd(walk: RuleWalk, run: number, from: string): string {
  const e = walk.edges[run];
  return e.va === from ? e.vb : e.va;
}

// May `run` be tapped from `from`?
export function oneWayAllows(layout: OneWayLayout, from: string, run: number): boolean {
  const entry = layout.get(run);
  return entry === undefined || entry === from;
}

// Does a backtrack over these runs (one move's) go against an arrow?
export function oneWayBlocksBack(layout: OneWayLayout, runs: readonly number[]): boolean {
  for (const r of runs) if (layout.has(r)) return true;
  return false;
}

// +1 when the run is walked from ctrlA to ctrlB (entry va), -1 the other
// way, 0 when it is two-way.
export function oneWayDirection(walk: RuleWalk, layout: OneWayLayout, run: number): number {
  const entry = layout.get(run);
  if (entry === undefined) return 0;
  return entry === walk.edges[run].va ? 1 : -1;
}

export function oneWayRule(walk: RuleWalk, layout: OneWayLayout): WalkRule {
  return {
    states: 1,
    start: 0,
    blocksBack: (runs) => oneWayBlocksBack(layout, runs),
    step(from, run, state) {
      const e = walk.edges[run];
      if (!e || (e.va !== from && e.vb !== from)) return null;
      if (!oneWayAllows(layout, from, run)) return null;
      return { runs: [run], to: e.va === from ? e.vb : e.va, state, length: meterLength(walk, run) };
    },
  };
}

export interface OneWayCore {
  runs: number[]; // the core's runs, in DFS order
  entry: Map<number, string>; // each core run's entry under the DFS orientation
  root: string | null;
}

// The vertices of a route of runs from the walk's start, in order.
function routeVertices(walk: RuleWalk, routeRuns: readonly number[]): string[] {
  const out = [walk.start];
  let cur = walk.start;
  for (const r of routeRuns) {
    const e = walk.edges[r];
    if (!e) break;
    cur = e.va === cur ? e.vb : e.va;
    out.push(cur);
  }
  return out;
}

// The core and its DFS orientation (see the header). `routeRuns` picks the
// root: the first core vertex along it, else the core's first vertex.
export function oneWayCore(walk: RuleWalk, routeRuns: readonly number[] = []): OneWayCore {
  const ids = [...walk.vertices.keys()];
  const index = new Map<string, number>();
  ids.forEach((id, i) => index.set(id, i));
  const n = ids.length;
  const adj: number[][] = ids.map((id) => walk.vertices.get(id)!.edges.filter((r) => orientable(walk, r)));
  const far = (r: number, v: number): number => {
    const e = walk.edges[r];
    return index.get(e.va === ids[v] ? e.vb : e.va)!;
  };
  // Bridges: an iterative Tarjan, skipping only the run it came in on.
  const disc = new Int32Array(n).fill(-1);
  const low = new Int32Array(n);
  const bridge = new Set<number>();
  let timer = 0;
  for (let root = 0; root < n; root++) {
    if (disc[root] >= 0 || adj[root].length === 0) continue;
    disc[root] = low[root] = timer++;
    const vs = [root];
    const via = [-1];
    const next = [0];
    while (vs.length > 0) {
      const top = vs.length - 1;
      const v = vs[top];
      if (next[top] < adj[v].length) {
        const r = adj[v][next[top]++];
        if (r === via[top]) continue;
        const u = far(r, v);
        if (disc[u] < 0) {
          disc[u] = low[u] = timer++;
          vs.push(u);
          via.push(r);
          next.push(0);
        } else if (disc[u] < low[v]) {
          low[v] = disc[u];
        }
      } else {
        const r = via[top];
        vs.pop();
        via.pop();
        next.pop();
        if (vs.length > 0) {
          const p = vs[vs.length - 1];
          if (low[v] < low[p]) low[p] = low[v];
          if (low[v] > disc[p]) bridge.add(r);
        }
      }
    }
  }
  // 2-edge-connected pieces over the non-bridge runs; the largest by runs
  // (the first found on a tie) is the core.
  const comp = new Int32Array(n).fill(-1);
  const compRuns: number[] = [];
  for (let s = 0; s < n; s++) {
    if (comp[s] >= 0) continue;
    const c = compRuns.length;
    comp[s] = c;
    const seen = new Set<number>();
    const q = [s];
    for (let qi = 0; qi < q.length; qi++) {
      const v = q[qi];
      for (const r of adj[v]) {
        if (bridge.has(r)) continue;
        seen.add(r);
        const u = far(r, v);
        if (comp[u] < 0) {
          comp[u] = c;
          q.push(u);
        }
      }
    }
    compRuns.push(seen.size);
  }
  let core = -1;
  for (let c = 0; c < compRuns.length; c++) if (compRuns[c] > 0 && (core < 0 || compRuns[c] > compRuns[core])) core = c;
  if (core < 0) return { runs: [], entry: new Map(), root: null };
  let root = -1;
  for (const id of routeVertices(walk, routeRuns)) {
    const i = index.get(id);
    if (i !== undefined && comp[i] === core) {
      root = i;
      break;
    }
  }
  if (root < 0) for (let i = 0; i < n && root < 0; i++) if (comp[i] === core) root = i;
  // The orientation: one DFS of the core. A run is oriented the first time
  // it is seen: a tree run at discovery, from its parent; any other from the
  // vertex that sees it, which is the descendant (its ancestor's iterator is
  // still paused on the tree run below it).
  const entry = new Map<number, string>();
  const runs: number[] = [];
  const seenV = new Uint8Array(n);
  seenV[root] = 1;
  const vs = [root];
  const next = [0];
  while (vs.length > 0) {
    const top = vs.length - 1;
    const v = vs[top];
    if (next[top] < adj[v].length) {
      const r = adj[v][next[top]++];
      if (bridge.has(r) || entry.has(r)) continue;
      const u = far(r, v);
      entry.set(r, ids[v]);
      runs.push(r);
      if (!seenV[u]) {
        seenV[u] = 1;
        vs.push(u);
        next.push(0);
      }
    } else {
      vs.pop();
      next.pop();
    }
  }
  return { runs, entry, root: ids[root] };
}

// Place one-way runs (see the header). `base` is the rules beneath (ice,
// the color rule, turnstiles); the layout's rule is composed onto it.
export function placeOneWay(
  walk: RuleWalk,
  share: number,
  seed: number,
  base: WalkRule | null = null
): Placement<OneWayLayout> {
  const s = Math.max(0, Math.min(ONE_WAY_MAX, share));
  if (!(s > 0)) return { layout: null, bites: false, draws: 0 };
  const plain = ruleSearch(walk, base ?? plainRule(walk));
  const core = oneWayCore(walk, plain.routeRuns);
  const count = Math.min(core.runs.length, Math.round(s * core.runs.length));
  if (count === 0) return { layout: null, bites: false, draws: 0 };
  const onRoute = new Set(plain.routeRuns);
  const rng = ruleRng(seed, "oneWay");
  const drawFor = (n: number) => (): OneWayLayout => {
    const pool = core.runs.slice();
    const weight = pool.map((r) => (onRoute.has(r) ? ROUTE_WEIGHT : 1));
    let total = 0;
    for (const w of weight) total += w;
    const flip = rng.nextInt(2) === 1;
    const out = new Map<number, string>();
    for (let k = 0; k < n; k++) {
      let t = rng.nextInt(total);
      let j = 0;
      while (t >= weight[j]) {
        t -= weight[j];
        j++;
      }
      const r = pool[j];
      total -= weight[j];
      pool.splice(j, 1);
      weight.splice(j, 1);
      const e = core.entry.get(r)!;
      out.set(r, flip ? otherEnd(walk, r, e) : e);
    }
    return out;
  };
  const ruleOf = (layout: OneWayLayout): WalkRule =>
    base ? composeRules(base, oneWayRule(walk, layout)) : oneWayRule(walk, layout);
  const accept = (rule: WalkRule): boolean => !ruleHasTrap(walk, rule);
  // K788: a trapping (or unsolvable) round places nothing; the stream runs
  // on, so redraw whole rounds, then rounds of half as many runs, before
  // giving up (only null outcomes retry, so a placed draw never moves).
  let placed: Placement<OneWayLayout> | null = null;
  for (let n = count; ; n = Math.max(1, Math.floor(n / 2))) {
    const round = placeRule(walk, drawFor(n), ruleOf, base, accept);
    placed = placed
      ? { layout: round.layout, bites: round.bites, draws: placed.draws + round.draws }
      : round;
    if (placed.layout || n <= 1) return placed;
  }
}

// How many of the layout's runs lie on a route (the census's count).
export function oneWayOnRoute(layout: OneWayLayout, routeRuns: readonly number[]): number {
  const on = new Set(routeRuns);
  let k = 0;
  for (const r of layout.keys()) if (on.has(r)) k++;
  return k;
}
