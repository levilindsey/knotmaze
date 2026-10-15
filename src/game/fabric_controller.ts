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
//  - walkedDist (K155, the star rating's measure): every run walked,
//    forward and back. It equals pathLength + 2 x backtrackDist until a K80
//    respawn empties the path; the walk from the entrance after a catch
//    adds on.
//
// MEMORY-TRAIL MODE (Stage 23, `trailMode`): backtracking does not exist -
// EVERY legal tap is an advance, including re-tapping the run just arrived
// by (that is simply another advance that happens to revisit the previous
// vertex), so pathLength only ever accumulates and backtrackDist stays 0.
// The branch-point-only rule and the win condition are unchanged. The flag
// is live-togglable mid-solve (gameplay interpretation only; the path state
// is valid under either reading).
//
// K19 STATS (definitions in game/maze_stats.ts): the distinct junctions and
// dead-end tips the head has reached, and a per-move log for the share
// grid. All reset with reset().
//
// K47 SAVED ATTEMPTS: `taps` lists every accepted tap's run, in order. The
// whole solve state is a pure function of that list and the walk graph, so
// replay(taps) rebuilds it exactly (path, meters, stats, move log) - that
// is what a saved daily attempt stores. retreatToStart() is a daily's
// Reset path: backtracks, one run at a time, to the entrance.
//
// K100 RESTARTS: `restarts` counts reset() calls (the constructor's and
// replay()'s included), so a new value means the solve started over. The
// fog of war's explored memory (render/fabric_maze_renderer.ts) starts
// over when it moves and only then: a backtrack to the entrance, by hand
// or by retreatToStart(), and a K80 respawn() keep it. reset() is also the
// one thing that empties `taps`, so the taps are everything explored
// (game/daily_attempt.ts exploredRuns). K174: `refogs` counts respawn(true)
// calls, a catch that returns the fog to the solve's start (minoRefog);
// the fog starts over when either counter moves.

import type { WalkGraph } from "../core/walk_graph";
import type { MoveKind } from "./maze_stats";

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
  walkedDist = 0;
  solved = false;
  // Distinct JUNCTION vertices (not END) the head has arrived at.
  visitedJunctions = new Set<string>();
  // Distinct dead-end tips the head has arrived at: END vertices other
  // than the start and the exit (main.ts shows them only with deadEnds on).
  deadEndTips = new Set<string>();
  // One entry per accepted move: g(ood) / d(etour) / b(acktrack).
  moveLog: MoveKind[] = [];
  // The run of every accepted tap, in order (replay() reproduces the rest).
  taps: number[] = [];
  // reset() calls so far: a new value = a restarted solve (K100).
  restarts = 0;
  // respawn(true) calls so far: a new value = the fog of war starts over,
  // the solve goes on (K174).
  refogs = 0;

  // Memory-trail mode: advance-only taps (see the header comment). Set at
  // construction and freely togglable from main.ts afterwards.
  trailMode: boolean;

  constructor(walk: WalkGraph, trailMode = false) {
    this.walk = walk;
    this.trailMode = trailMode;
    this.reset();
  }

  reset(): void {
    this.pathVertices = [this.walk.start];
    this.pathEdges = [];
    this.backtrackDist = 0;
    this.walkedDist = 0;
    this.solved = false;
    this.visitedJunctions = new Set();
    this.deadEndTips = new Set();
    this.moveLog = [];
    this.taps = [];
    this.restarts++;
  }

  // Rebuild the solve state from a tap list (a saved attempt): reset, then
  // apply every tap. False - and a reset controller - when any tap is not
  // a legal move from where the previous ones led (a different maze, or a
  // damaged record).
  replay(taps: readonly number[]): boolean {
    this.reset();
    for (const eid of taps) {
      const r = Number.isInteger(eid) ? this.tapEdge(eid) : "reject";
      if (r === "reject" || r === "noop") {
        this.reset();
        return false;
      }
    }
    return true;
  }

  // Back to the entrance by backtracking every run of the path, newest
  // first - exactly the taps a player could make (each is logged "b" and
  // priced on the backtrack meter). Returns the runs retracted. Nothing in
  // memory-trail mode (no backtracking exists there) or once solved.
  retreatToStart(): number[] {
    const out: number[] = [];
    if (this.trailMode || this.solved) return out;
    while (this.pathEdges.length > 0) {
      const eid = this.pathEdges[this.pathEdges.length - 1];
      if (this.tapEdge(eid) !== "backtrack") break;
      out.push(eid);
    }
    return out;
  }

  // K80's real-time mode: the minotaur caught the player. Back to the
  // entrance in one jump, not a restart: the stats, the move log, the taps,
  // the backtrack and walked meters and `restarts` stay (replay(taps)
  // cannot reproduce a respawn; a real-time maze is never a daily, so
  // nothing replays it). `refog` (K174, the minoRefog param) returns the
  // fog of war to the solve's start; without it the explored fog stays.
  respawn(refog = false): void {
    if (refog) this.refogs++;
    this.pathVertices = [this.walk.start];
    this.pathEdges = [];
    this.solved = false;
  }

  // Moves made (accepted taps) since the last reset.
  get moveCount(): number {
    return this.moveLog.length;
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
      !this.trailMode &&
      this.pathEdges.length > 0 &&
      edgeId === this.pathEdges[this.pathEdges.length - 1]
    ) {
      this.pathEdges.pop();
      this.pathVertices.pop();
      this.backtrackDist += e.length;
      this.walkedDist += e.length;
      this.moveLog.push("b");
      this.taps.push(edgeId);
      return "backtrack";
    }

    // A self-loop run returns to the same vertex; everything else crosses.
    const far = e.va === head ? e.vb : e.va;
    this.moveLog.push(this.onShortestRoute(head, e.length, far) ? "g" : "d");
    this.taps.push(edgeId);
    this.walkedDist += e.length;
    this.pathEdges.push(edgeId);
    this.pathVertices.push(far);
    this.arrive(far);
    if (far === this.walk.exit) {
      this.solved = true;
      return "win";
    }
    return "advance";
  }

  // Does stepping from `from` across a run of `len` to `to` stay on a
  // shortest route to the exit?
  private onShortestRoute(from: string, len: number, to: string): boolean {
    const d0 = this.walk.distToExit.get(from) ?? Infinity;
    const d1 = this.walk.distToExit.get(to) ?? Infinity;
    if (!Number.isFinite(d0) || !Number.isFinite(d1)) return false;
    return len + d1 <= d0 + 1e-9 * Math.max(1, d0);
  }

  private arrive(id: string): void {
    const v = this.walk.vertices.get(id);
    if (!v) return;
    if (!v.isEnd) this.visitedJunctions.add(id);
    else if (id !== this.walk.start && id !== this.walk.exit) {
      this.deadEndTips.add(id);
    }
  }
}
