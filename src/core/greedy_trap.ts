// K74 stage 4 (sim-first half): the GREEDY-TRAP SEARCH, as pure walk-graph
// code. No generation change lives here: nothing in the maze pipeline calls
// this module yet. It exists so the stage-4 measurement (and the eventual
// build, behind a default-off param) share one tested implementation of
// the two naive walkers, the trap candidates and the acceptance rule from
// docs/design/K74_maze_design.md section 4.4.
//
// Engine-exactness (K108): the far-end walker ranks runs by SQUARED
// distance to the exit. Lattice positions are multiples of 0.5, so those
// squares are exact in every engine and preserve the Euclidean order.
// The heading walker takes its score from the caller; a shipped version
// must supply an exact heading score (see the stage-4 brief), because the
// prototype's normalized-dot score divides by a run length.

export interface TrapVertexLike {
  edges: readonly number[];
}

export interface TrapEdgeLike {
  va: string;
  vb: string;
  length: number;
}

export interface TrapGraphLike {
  vertices: ReadonlyMap<string, TrapVertexLike>;
  edges: readonly TrapEdgeLike[];
}

export type TrapScore = (v: string, eid: number) => number;

export interface TrapWalkResult {
  walked: number; // Forward + backtracked distance.
  final: number; // Length of the path left on the stack at the exit.
  backtracks: number;
  advances: number;
  taken: number[]; // Run of every advance, in order.
  takenFrom: string[]; // Vertex each advance left from.
  finalPath: string[]; // Vertex stack at the exit (start .. exit).
}

export const otherEnd = (e: TrapEdgeLike, v: string): string =>
  e.va === v ? e.vb : e.va;

// Rebuild the vertex stack at the exit from a walk's advance log:
// advances push, a backtrack pops until the stack top is the vertex the
// next advance left from.
export function finalPathOf(
  graph: TrapGraphLike,
  start: string,
  taken: readonly number[],
  takenFrom: readonly string[]
): string[] {
  const stack: string[] = [start];
  const via: number[] = [];
  for (let k = 0; k < taken.length; k++) {
    while (stack.length && stack[stack.length - 1] !== takenFrom[k]) {
      stack.pop();
      via.pop();
    }
    via.push(taken[k]);
    stack.push(otherEnd(graph.edges[taken[k]], takenFrom[k]));
  }
  return stack;
}

// A depth-first walker with memory, the way a player can play: at the head
// it takes the best UNUSED run by score (lowest edge id wins a tie), and
// with none left it backtracks the last run. Mirrors the K74 probe harness
// walker (`.claude/probes/K74/lib.ts` dfsWalk), minus its endgame window.
export function greedyWalk(
  graph: TrapGraphLike,
  start: string,
  exit: string,
  score: TrapScore
): TrapWalkResult {
  const used = new Set<number>();
  const stack: { v: string; via: number }[] = [{ v: start, via: -1 }];
  let walked = 0;
  let backtracks = 0;
  let advances = 0;
  const taken: number[] = [];
  const takenFrom: string[] = [];
  let guard = 0;
  while (stack.length && guard++ < 200000) {
    const top = stack[stack.length - 1];
    if (top.v === exit) break;
    let best = -1;
    let bestS = Infinity;
    for (const eid of graph.vertices.get(top.v)!.edges) {
      if (used.has(eid)) continue;
      const s = score(top.v, eid);
      if (s < bestS || (s === bestS && eid < best)) {
        bestS = s;
        best = eid;
      }
    }
    if (best < 0) {
      const t = stack.pop()!;
      if (t.via >= 0) {
        walked += graph.edges[t.via].length;
        backtracks++;
      }
      continue;
    }
    used.add(best);
    const e = graph.edges[best];
    walked += e.length;
    advances++;
    taken.push(best);
    takenFrom.push(top.v);
    stack.push({ v: otherEnd(e, top.v), via: best });
  }
  let final = 0;
  for (const s of stack) if (s.via >= 0) final += graph.edges[s.via].length;
  return {
    walked,
    final,
    backtracks,
    advances,
    taken,
    takenFrom,
    finalPath: finalPathOf(graph, start, taken, takenFrom),
  };
}

// Far-end greedy score: squared distance from the run's far end to the
// exit (lower = preferred). `pos` maps every vertex id to its lattice
// position.
export function farEndScore(
  graph: TrapGraphLike,
  pos: ReadonlyMap<string, readonly [number, number]>,
  exitPos: readonly [number, number]
): TrapScore {
  return (v, eid) => {
    const p = pos.get(otherEnd(graph.edges[eid], v))!;
    const dx = p[0] - exitPos[0];
    const dy = p[1] - exitPos[1];
    return dx * dx + dy * dy;
  };
}

export interface TrapCandidate {
  id: string;
  dist2: number; // Squared distance to the exit.
}

// The trap candidates on the walkers' final paths: junctions (per the
// caller's `isJunction`) within `radius` of the exit, nearest first
// (squared distance, then id). A vertex on both paths appears once, at
// its own distance.
export function trapCandidates(
  finalPaths: readonly (readonly string[])[],
  pos: ReadonlyMap<string, readonly [number, number]>,
  exitPos: readonly [number, number],
  radius: number,
  isJunction: (id: string) => boolean
): TrapCandidate[] {
  const seen = new Map<string, number>();
  for (const path of finalPaths) {
    for (const v of path) {
      if (seen.has(v) || !isJunction(v)) continue;
      const p = pos.get(v);
      if (!p) continue;
      const dx = p[0] - exitPos[0];
      const dy = p[1] - exitPos[1];
      const d2 = dx * dx + dy * dy;
      if (d2 <= radius * radius) seen.set(v, d2);
    }
  }
  return [...seen.entries()]
    .map(([id, dist2]) => ({ id, dist2 }))
    .sort((a, b) => a.dist2 - b.dist2 || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export interface TrapEval {
  optimal: number;
  gF: number; // Far-end greedy walked / optimal.
  gH: number; // Heading greedy walked / optimal.
}

export interface TrapSearchOptions {
  targetF: number;
  targetH: number;
  maxF: number; // No pathological trap: far-end cap.
  maxH: number; // Heading cap.
  maxGrow: number; // Optimal route may grow to this x its original length.
  iters: number; // Accepted deletions at most.
  tries: number; // Trial deletions per round at most.
}

export const DEFAULT_TRAP_SEARCH: TrapSearchOptions = {
  targetF: 2.5,
  targetH: 3.5,
  maxF: 6,
  maxH: 8,
  maxGrow: 1.15,
  iters: 12,
  tries: 8,
};

// How far the worse-off walker still is from its target (1 = both met).
export function trapObjective(ev: TrapEval, o: TrapSearchOptions): number {
  return Math.min(ev.gF / o.targetF, ev.gH / o.targetH);
}

// One trial deletion is accepted only if it raises the objective, keeps
// the optimal route within maxGrow of the original, and creates no trap
// over the caps. (Section 4.4's "improves both walkers" is this objective
// in the prototype; see the stage-4 brief.)
export function acceptsTrap(
  trial: TrapEval | null,
  current: TrapEval,
  optimal0: number,
  o: TrapSearchOptions
): boolean {
  if (!trial || !Number.isFinite(trial.optimal)) return false;
  if (trial.optimal > o.maxGrow * optimal0) return false;
  if (trial.gF > o.maxF || trial.gH > o.maxH) return false;
  return trapObjective(trial, o) > trapObjective(current, o) + 1e-9;
}

export interface TrapSearchOps<S> {
  // Build and score one state; null when it has no finite route.
  evaluate: (state: S) => TrapEval | null;
  // Ordered candidate ids to try deleting from this state (nearest the
  // exit first). Spanning/reachability sites must already be excluded:
  // the search never deletes what it is not offered.
  candidates: (state: S, current: TrapEval) => readonly string[];
  remove: (state: S, id: string) => S;
}

export type TrapStop =
  | "targets" // Both walkers at or over their targets.
  | "iters" // Accepted-deletion budget spent.
  | "no-improvement" // No offered deletion passed the acceptance rule.
  | "invalid"; // A state with no finite route.

export interface TrapSearchResult<S> {
  state: S;
  removed: string[];
  initial: TrapEval | null;
  last: TrapEval | null;
  evaluations: number; // evaluate() calls, trials included.
  stop: TrapStop;
}

// The search loop (section 4.4): while either walker still solves under
// its target, delete the offered junction nearest the exit on its final
// path - the first trial (up to `tries`) that the acceptance rule passes.
export function searchGreedyTraps<S>(
  initial: S,
  ops: TrapSearchOps<S>,
  o: TrapSearchOptions = DEFAULT_TRAP_SEARCH
): TrapSearchResult<S> {
  let state = initial;
  const removed: string[] = [];
  let evaluations = 0;
  const evalOf = (s: S): TrapEval | null => {
    evaluations++;
    return ops.evaluate(s);
  };
  let last = evalOf(state);
  const first = last;
  if (!last || !Number.isFinite(last.optimal)) {
    return { state, removed, initial: first, last, evaluations, stop: "invalid" };
  }
  const optimal0 = last.optimal;
  let currentEval: TrapEval = last;
  for (let it = 0; ; it++) {
    if (currentEval.gF >= o.targetF && currentEval.gH >= o.targetH) {
      return { state, removed, initial: first, last: currentEval, evaluations, stop: "targets" };
    }
    if (it >= o.iters) {
      return { state, removed, initial: first, last: currentEval, evaluations, stop: "iters" };
    }
    const current = currentEval;
    let cut = false;
    const offered = ops.candidates(state, current);
    for (const id of offered.slice(0, o.tries)) {
      const next = ops.remove(state, id);
      const trial = evalOf(next);
      if (!trial || !acceptsTrap(trial, current, optimal0, o)) continue;
      state = next;
      currentEval = trial;
      removed.push(id);
      cut = true;
      break;
    }
    if (!cut) {
      return { state, removed, initial: first, last: currentEval, evaluations, stop: "no-improvement" };
    }
  }
}

// K46's selection bands (docs/design/K74_maze_design.md section 4.5),
// as (far-end, heading) floors. A band is a seed FILTER: it places no
// trap, it only keeps mazes that already pass.
export interface TrapBand {
  name: string;
  minF: number;
  minH: number;
}

export const K46_BANDS: readonly TrapBand[] = [
  { name: "K46 draft (1.1)", minF: 1.1, minH: 0 },
  { name: "far-end 1.5 + heading 2", minF: 1.5, minH: 2 },
  { name: "far-end 1.8 + heading 2.5", minF: 1.8, minH: 2.5 },
  { name: "search targets (2.5 / 3.5)", minF: 2.5, minH: 3.5 },
];

export function passesBand(ev: TrapEval, band: TrapBand): boolean {
  return ev.gF >= band.minF && ev.gH >= band.minH;
}

export interface BandStat {
  band: TrapBand;
  pass: number; // Mazes passing.
  share: number; // pass / total.
  candidatesPerDay: number; // 1 / share: rerolls a band costs (Infinity at 0).
}

// Pass shares for a set of scored mazes; `candidatesPerDay` is what a
// reroll-until-pass daily (K46 section 5) pays per day at that band.
export function bandStats(
  evals: readonly TrapEval[],
  bands: readonly TrapBand[] = K46_BANDS
): BandStat[] {
  return bands.map((band) => {
    const pass = evals.filter((ev) => passesBand(ev, band)).length;
    const share = evals.length ? pass / evals.length : 0;
    return {
      band,
      pass,
      share,
      candidatesPerDay: share > 0 ? 1 / share : Infinity,
    };
  });
}
