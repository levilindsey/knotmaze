// K139, COLLAPSE MODE (brief docs/design/K139.md; Levi, 2026-10-13: "You
// cannot backtrack, segments collapse behind you; try to collapse as much of
// the level as possible while still reaching the finish line. Or,
// alternatively, without reaching the finish line"). Pure: the trail rule,
// the end tests, the score and the par search. FabricMazeController holds
// the state and calls these.
//
// THE TRAIL RULE rides K137's snap (game/fragile.ts): every MAZE run gets a
// limit of 1, so it breaks (collapses) after its first crossing and a walk is
// a trail, no run twice. Unlike fragile's limits the END runs collapse too
// (the start tail on the first move, a stub when you enter it, which strands
// you at its tip, the exit tail when you finish). K115/K552 title runs never
// collapse and score nothing: the title is walked, but it is not the maze.
//
// THE MODES:
//  - finish: reaching the exit wins; stranded = no unbroken route to the
//    exit (fragile's strandedAt);
//  - free: the exit is only a dead end. The game ends when no unbroken maze
//    run is reachable from the head (freeStranded).
//
// THE SCORE is the share of the maze's thread length collapsed. Lengths are
// counted in integer UNITS (round(length x 1000)), so every sum is exact and
// the same in any order on every engine (K108); shown as a whole percentage
// rounded down (sharePercent).
//
// PAR is the best possible score: the longest trail over maze runs from the
// maze's start (the seam on a titled maze), to the exit in finish mode,
// ending anywhere in free mode (R.3.4's "longest thread" in
// docs/design/K80_gameplay_additions.md is the same measure). Longest trail
// is NP-hard, so collapsePar is a depth-first search with an admissible
// bound and a STEP BUDGET (nodes expanded, never wall-clock time: one link
// builds one par on every device). When the budget trips, par is the best
// trail found and `tripped` says so: the HUD, the banner and the share text
// must then read it as a lower bound (">= N%"), never as the maximum.

import type { WalkGraph } from "../core/walk_graph";

export type CollapseMode = "off" | "finish" | "free";
export const COLLAPSE_MODES: readonly CollapseMode[] = ["off", "finish", "free"];

// Integer units per unit of run length.
export const UNITS_PER_LENGTH = 1000;

// Nodes the par search may expand per maze and mode. Measured (K139 step 4,
// dailies 1-60 and 15 gridSize-24 mazes, `.claude/probes/K139/`): the
// search trips on every one at any budget up to 200k, so par reads
// ">= N%". At 20k par sits a mean 1.4-2.1 points below the 200k search's
// (40k: 1.0-2.0) and costs a median 10 ms, at most 38 ms, on the desktop
// under the perf lock (40k: 20 / 74 ms); a phone is about 5x slower
// (K74's estimate; the real phone timing is owed, K662).
export const PAR_STEP_BUDGET = 20_000;

// Is the run part of the maze (not a title run)?
export function mazeRun(walk: WalkGraph, eid: number): boolean {
  return eid >= 0 && eid < walk.edges.length && !walk.titleEdges?.has(eid);
}

// Per run, the crossings it takes before it collapses: 1 for every maze run,
// Infinity for title runs (fragile.ts's limit table).
export function collapseLimits(walk: WalkGraph): Float64Array {
  const out = new Float64Array(walk.edges.length);
  for (let i = 0; i < out.length; i++) out[i] = mazeRun(walk, i) ? 1 : Infinity;
  return out;
}

// A run's length in integer units (0 for a title run).
export function runUnits(walk: WalkGraph, eid: number): number {
  return mazeRun(walk, eid) ? Math.round(walk.edges[eid].length * UNITS_PER_LENGTH) : 0;
}

// Every run's units, indexed by run id.
export function unitTable(walk: WalkGraph): Float64Array {
  const out = new Float64Array(walk.edges.length);
  for (let i = 0; i < out.length; i++) out[i] = runUnits(walk, i);
  return out;
}

// The whole maze's units: what 100% means.
export function totalUnits(walk: WalkGraph): number {
  let sum = 0;
  for (let i = 0; i < walk.edges.length; i++) sum += runUnits(walk, i);
  return sum;
}

// The units collapsed: every maze run crossed at least once.
export function collapsedUnits(walk: WalkGraph, crossings: ArrayLike<number>): number {
  let sum = 0;
  for (let i = 0; i < walk.edges.length; i++) if (crossings[i] > 0) sum += runUnits(walk, i);
  return sum;
}

// A share of the maze as a whole percentage, rounded down (0 for an empty
// maze; negative units, "no trail", read as 0).
export function sharePercent(units: number, total: number): number {
  if (!(total > 0) || !(units > 0)) return 0;
  return Math.floor((units * 100) / total);
}

// Free mode's end: no unbroken MAZE run can be reached from the head over
// unbroken runs (title runs are walked through, so a head on the title or
// at the seam is stranded only once the maze beyond is gone).
export function freeStranded(walk: WalkGraph, head: string, broken: (eid: number) => boolean): boolean {
  const seen = new Set<string>([head]);
  const queue = [head];
  while (queue.length > 0) {
    const v = queue.pop()!;
    for (const eid of walk.vertices.get(v)?.edges ?? []) {
      if (broken(eid)) continue;
      if (mazeRun(walk, eid)) return false;
      const e = walk.edges[eid];
      const o = e.va === v ? e.vb : e.va;
      if (!seen.has(o)) {
        seen.add(o);
        queue.push(o);
      }
    }
  }
  return true;
}

export interface CollapsePar {
  // The longest trail found, in units (-1: no trail reaches the exit).
  units: number;
  // The maze's units (totalUnits).
  total: number;
  // The budget ran out before the search could prove `units` the maximum.
  tripped: boolean;
  // Nodes expanded.
  steps: number;
  // The best trail's runs, in walking order.
  trail: number[];
}

// The longest trail from the maze's start (see the header's PAR).
//
// THE SEARCH: depth first over the unused maze runs, each vertex's runs
// tried longest first (ties: lower id), so the first descent is a greedy
// walk and later ones improve it. A node is pruned when its BOUND cannot beat
// the best trail found: the length so far, plus the unused length reachable
// from the head, minus half the cheapest unused run (not a loop) at every
// vertex of odd unused degree there. A trail through that reachable part
// leaves at least one run unused at each such vertex except its two ends
// (its runs give every other vertex an even degree), and each unused run is
// charged by at most its two ends. The ends: the head and, in finish mode,
// the exit; free mode spends its unknown end on the largest charge. Finish
// mode also prunes a node whose reachable part has lost the exit. Doubled
// units keep the halves integral.
//
// `onBetter` (probes only) hears each improvement: the steps so far and the
// new best units.
export function collapsePar(
  walk: WalkGraph,
  mode: "finish" | "free",
  budget = PAR_STEP_BUDGET,
  onBetter?: (steps: number, units: number) => void
): CollapsePar {
  const total = totalUnits(walk);
  const index = new Map<string, number>();
  for (const id of walk.vertices.keys()) index.set(id, index.size);
  const nv = index.size;
  const ne = walk.edges.length;
  const ea = new Int32Array(ne);
  const eb = new Int32Array(ne);
  const w = new Float64Array(ne);
  const deg = new Int32Array(nv + 1);
  for (let i = 0; i < ne; i++) {
    const e = walk.edges[i];
    ea[i] = index.get(e.va) ?? 0;
    eb[i] = index.get(e.vb) ?? 0;
    if (!mazeRun(walk, i)) continue;
    w[i] = runUnits(walk, i);
    deg[ea[i]]++;
    if (eb[i] !== ea[i]) deg[eb[i]]++;
  }
  // Adjacency (CSR): a loop listed once, at its vertex.
  const off = new Int32Array(nv + 1);
  for (let v = 0; v < nv; v++) off[v + 1] = off[v] + deg[v];
  const adj = new Int32Array(off[nv]);
  const fill = off.slice(0, nv);
  for (let i = 0; i < ne; i++) {
    if (!mazeRun(walk, i)) continue;
    adj[fill[ea[i]]++] = i;
    if (eb[i] !== ea[i]) adj[fill[eb[i]]++] = i;
  }
  for (let v = 0; v < nv; v++) {
    const list = Array.from(adj.subarray(off[v], off[v + 1]));
    list.sort((a, b) => w[b] - w[a] || a - b);
    adj.set(list, off[v]);
  }

  const s = index.get(walk.mazeStart ?? walk.start);
  const t = mode === "finish" ? index.get(walk.exit) ?? -1 : -1;
  const used = new Uint8Array(ne);
  const vMark = new Int32Array(nv);
  const eMark = new Int32Array(ne);
  const queue = new Int32Array(nv);
  let mark = 0;
  const stack: number[] = [];
  let best = mode === "finish" ? -1 : 0;
  let bestTrail: number[] = [];
  let steps = 0;
  let tripped = false;

  // Twice the bound at head v with `cur` units walked; -1 when finish mode's
  // exit is out of reach.
  const bound2 = (v: number, cur: number): number => {
    mark++;
    let qh = 0;
    let qt = 0;
    queue[qt++] = v;
    vMark[v] = mark;
    let reach = 0;
    let charge = 0;
    let top = 0;
    let exitSeen = false;
    while (qh < qt) {
      const x = queue[qh++];
      let d = 0;
      let cheapest = Infinity;
      for (let k = off[x]; k < off[x + 1]; k++) {
        const e = adj[k];
        if (used[e]) continue;
        if (eMark[e] !== mark) {
          eMark[e] = mark;
          reach += w[e];
        }
        const y = ea[e] === x ? eb[e] : ea[e];
        if (y === x) continue;
        d++;
        if (w[e] < cheapest) cheapest = w[e];
        if (vMark[y] !== mark) {
          vMark[y] = mark;
          queue[qt++] = y;
          if (y === t) exitSeen = true;
        }
      }
      if ((d & 1) === 1 && x !== v && x !== t) {
        charge += cheapest;
        if (cheapest > top) top = cheapest;
      }
    }
    if (t >= 0) return exitSeen ? 2 * cur + 2 * reach - charge : -1;
    return 2 * cur + 2 * reach - (charge - top);
  };

  // A node: head v, `cur` units walked. Children are tried longest run
  // first (the adjacency order). Ordering them by their bound instead was
  // measured on dailies 1-4: about twice the cost a step and a lower par
  // at every budget on three of the four (.claude/probes/K139, explore2).
  const dfs = (v: number, cur: number): void => {
    if (steps >= budget) {
      tripped = true;
      return;
    }
    steps++;
    if (t < 0 && cur > best) {
      best = cur;
      bestTrail = stack.slice();
      onBetter?.(steps, best);
    }
    const b = bound2(v, cur);
    if (b < 0 || b <= 2 * best) return;
    for (let k = off[v]; k < off[v + 1]; k++) {
      const e = adj[k];
      if (used[e]) continue;
      const y = ea[e] === v ? eb[e] : ea[e];
      used[e] = 1;
      stack.push(e);
      if (y === t) {
        // Arriving at the exit ends a finish-mode game.
        if (cur + w[e] > best) {
          best = cur + w[e];
          bestTrail = stack.slice();
          onBetter?.(steps, best);
        }
      } else dfs(y, cur + w[e]);
      stack.pop();
      used[e] = 0;
      if (tripped) return;
    }
  };

  if (s !== undefined && (mode === "free" || t >= 0)) dfs(s, 0);
  return { units: best, total, tripped, steps, trail: bestTrail };
}

// Par as text: "71%", ">= 71%" once the budget tripped (unicode >=), "—"
// when no trail reaches the exit.
export function parText(par: Pick<CollapsePar, "units" | "total" | "tripped">): string {
  if (par.units < 0) return "—";
  const pct = `${sharePercent(par.units, par.total)}%`;
  return par.tripped ? `≥${pct}` : pct;
}
