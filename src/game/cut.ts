// K114 CUT, the cut verb (round 2, stage 1; brief docs/design/K114_cut.md,
// design docs/design/K80_gameplay_additions.md R.4.1). The player deletes a
// whole run. Pure: what can be cut, the refusal, the contraction (the runs a
// move carries on along) and the distances to the exit, each a function of
// (walk graph, cut runs), so that a later walker can read them.
// FabricMazeController holds the cut set and the action log and calls these.
//
// CUTTABLE: any maze run but the start tail (the run out of the maze's start,
// `mazeStart ?? start`, so a titled maze's seam tail), the exit tail (the run
// into the exit) and K115 title runs. A dead-end stub can be cut, which
// prunes a dead end.
//
// REFUSED: a cut that leaves no route from the head to the exit (runsToExit
// with the cut runs and the candidate blocked). A route over live runs can
// always be walked, so a game with cuts is never stranded.
//
// CONTRACTION: a CONTRACTED vertex had three or more runs and has exactly two
// live (uncut) runs now, so it is no decision. A move arriving at one carries
// on along its other live run, and on through every contracted vertex, until
// it reaches a vertex with three or more live runs, an END, the exit, or a
// run this move already took (no loops). Advances and backtracks alike: each
// run of the chain goes to its far end, whichever the controller calls it. A
// vertex with two runs to begin with (the K115 title seam, a title waypoint)
// is never contracted. A self-loop counts twice, as its vertex lists it.

import type { WalkGraph } from "../core/walk_graph";
import { runsToExit, walkDistances } from "../core/walk_graph";

export type CutMode = "off" | "on";
export const CUT_MODES: readonly CutMode[] = ["off", "on"];

// One player action: a move (its first run; the runs it carries on along
// follow from the cuts) or a cut. FabricMazeController.actions lists them.
export type FabricAction = { kind: "move"; run: number } | { kind: "cut"; run: number };

// A cut's outcome (FabricMazeController.cut): done, refused (it would leave
// no route to the exit), or not a cut at all (cut off, not cuttable, already
// cut, the solve over, or a move still under way).
export type CutResult = "cut" | "refused" | "invalid";

type CutWalk = Pick<WalkGraph, "vertices" | "edges" | "exit" | "start" | "mazeStart" | "titleEdges">;

// Can this run be cut at all (see the header's CUTTABLE)?
export function cuttable(walk: CutWalk, eid: number): boolean {
  const e = walk.edges[eid];
  if (!e) return false;
  if (walk.titleEdges?.has(eid)) return false;
  const start = walk.mazeStart ?? walk.start;
  if (e.va === start || e.vb === start) return false;
  return e.va !== walk.exit && e.vb !== walk.exit;
}

// Would cutting `eid` leave no route over live runs from `head` to the exit?
export function cutStrands(
  walk: Pick<WalkGraph, "vertices" | "edges" | "exit">,
  head: string,
  cuts: ReadonlySet<number>,
  eid: number
): boolean {
  const left = runsToExit(walk, (r) => r === eid || cuts.has(r)).get(head) ?? Infinity;
  return !Number.isFinite(left);
}

// The verdict on cutting `eid` with the player at `head`.
export function cutVerdict(
  walk: CutWalk,
  head: string,
  cuts: ReadonlySet<number>,
  eid: number
): CutResult {
  if (!cuttable(walk, eid) || cuts.has(eid)) return "invalid";
  return cutStrands(walk, head, cuts, eid) ? "refused" : "cut";
}

// The live runs at a vertex, as it lists them (a self-loop twice).
export function liveRuns(walk: Pick<WalkGraph, "vertices">, v: string, cuts: ReadonlySet<number>): number[] {
  const vert = walk.vertices.get(v);
  return vert ? vert.edges.filter((r) => !cuts.has(r)) : [];
}

// Is `v` contracted (see the header's CONTRACTION)?
export function contracted(
  walk: Pick<WalkGraph, "vertices" | "exit">,
  v: string,
  cuts: ReadonlySet<number>
): boolean {
  const vert = walk.vertices.get(v);
  if (!vert || vert.isEnd || v === walk.exit || vert.edges.length < 3) return false;
  let live = 0;
  for (const r of vert.edges) if (!cuts.has(r)) live++;
  return live === 2;
}

// The runs a move along `first` from `from` walks: `first`, then every run it
// carries on along (see the header's CONTRACTION).
export function carryChain(
  walk: Pick<WalkGraph, "vertices" | "edges" | "exit">,
  cuts: ReadonlySet<number>,
  from: string,
  first: number
): number[] {
  const out = [first];
  if (cuts.size === 0) return out;
  const taken = new Set<number>(out);
  let at = from;
  let run = first;
  for (;;) {
    const e = walk.edges[run];
    if (!e) break;
    at = e.va === at ? e.vb : e.va;
    if (!contracted(walk, at, cuts)) break;
    // The other live run: the vertex's live entries but one of `run`'s.
    let next = -1;
    let skipped = false;
    for (const r of walk.vertices.get(at)!.edges) {
      if (cuts.has(r)) continue;
      if (r === run && !skipped) {
        skipped = true;
        continue;
      }
      next = r;
      break;
    }
    if (next < 0 || taken.has(next)) break;
    taken.add(next);
    out.push(next);
    run = next;
  }
  return out;
}

// Walk distances from every vertex to the exit over the live runs (the walk
// graph's own field while nothing is cut; never mutate the result).
export function distancesToExit(
  walk: Pick<WalkGraph, "vertices" | "edges" | "exit" | "distToExit">,
  cuts: ReadonlySet<number>
): Map<string, number> {
  if (cuts.size === 0) return walk.distToExit;
  return walkDistances(walk.vertices, walk.edges, walk.exit, cuts);
}
