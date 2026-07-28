// P4 maze mode solve state: the player traces ALONG the maze thread from the
// start end (node 0) toward the exit end (node `steps`). Because the strand is
// deterministic (always continue straight), tapping a node ON the thread moves
// the trace to it - forward to extend, backward to retract. (Junctions, where
// the player would actually choose, are a later increment.)

import type { MazeGraph } from "../core/types";

export type TapResult =
  | "advance" // extended the trace toward the exit
  | "backtrack" // pulled the trace back toward the start
  | "reject" // tap wasn't on a reachable node of the thread
  | "noop" // tapped the current head, or after solving
  | "win"; // reached the exit end

export class MazeController {
  private maze: MazeGraph;
  head = 0; // current node index along the thread, in [0, maze.steps].
  solved = false;

  constructor(maze: MazeGraph) {
    this.maze = maze;
  }

  reset(): void {
    this.head = 0;
    this.solved = false;
  }

  // Nodes traced from the start.
  get progress(): number {
    return this.head;
  }
  get total(): number {
    return this.maze.steps;
  }

  // Move the trace to node k along the thread.
  tapNode(k: number): TapResult {
    if (this.solved) return "noop";
    if (k < 0 || k > this.maze.steps) return "reject";
    if (k === this.head) return "noop";
    const advancing = k > this.head;
    this.head = k;
    if (k === this.maze.steps) {
      this.solved = true;
      return "win";
    }
    return advancing ? "advance" : "backtrack";
  }
}
