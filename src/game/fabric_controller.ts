// P4 branching-maze solve state over the walk graph. The player stands at a
// VERTEX (junction or end) and advances one walk edge per tap - BRANCH-POINT-
// ONLY interaction: a tap may only choose among the runs incident to the
// current head, never past a later branch point. Tapping the run just
// traversed retracts it (backtracking, one branching segment at a time).
//
// Two distance readouts, both in deterministic lattice arc:
//  - pathLength: the CURRENT path (the stack from the start to the head),
//    compared against walk.optimalLength.
//  - backtrackDist: cumulative distance retracted via backtracking, summed
//    forever (a separate price-paid meter; never decreases).

import type { WalkGraph } from "../core/walk_graph";

export type FabricTapResult =
  | "advance" // stepped across a run to its far vertex
  | "backtrack" // retracted the last run
  | "reject" // the run is not incident to the current head
  | "noop" // after solving
  | "win"; // advanced onto the exit tail

export class FabricMazeController {
  readonly walk: WalkGraph;
  pathVertices: string[] = [];
  pathEdges: number[] = [];
  backtrackDist = 0;
  solved = false;

  constructor(walk: WalkGraph) {
    this.walk = walk;
    this.reset();
  }

  reset(): void {
    this.pathVertices = [this.walk.start];
    this.pathEdges = [];
    this.backtrackDist = 0;
    this.solved = false;
  }

  get head(): string {
    return this.pathVertices[this.pathVertices.length - 1];
  }

  get pathLength(): number {
    let sum = 0;
    for (const eid of this.pathEdges) sum += this.walk.edges[eid].length;
    return sum;
  }

  // Walk-edge ids tappable right now: every run incident to the head (the
  // last traversed one among them means "backtrack").
  choices(): number[] {
    if (this.solved) return [];
    return this.walk.vertices.get(this.head)!.edges;
  }

  tapEdge(edgeId: number): FabricTapResult {
    if (this.solved) return "noop";
    const e = this.walk.edges[edgeId];
    const head = this.head;
    if (!e || (e.va !== head && e.vb !== head)) return "reject";

    if (
      this.pathEdges.length > 0 &&
      edgeId === this.pathEdges[this.pathEdges.length - 1]
    ) {
      this.pathEdges.pop();
      this.pathVertices.pop();
      this.backtrackDist += e.length;
      return "backtrack";
    }

    // A self-loop run returns to the same vertex; everything else crosses.
    const far = e.va === head ? e.vb : e.va;
    this.pathEdges.push(edgeId);
    this.pathVertices.push(far);
    if (far === this.walk.exit) {
      this.solved = true;
      return "win";
    }
    return "advance";
  }
}
