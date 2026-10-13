// SAVED DAILY ATTEMPTS (K47): turning the live solve into a stored record
// (game/daily_store.ts DailyAttempt) and back. Pure - main.ts owns the
// clock, the store and the screen.
//
// The record's taps ARE the attempt: FabricMazeController.replay rebuilds
// the path, both meters, the visited junctions and dead ends and the move
// log from them. A restore is refused - the controller left at the
// entrance - when the walk graph is not the one the taps were made on (its
// fingerprint differs: the generation code moved), when a tap is not a
// legal move, or when the replay does not arrive at the saved path.

import type { WalkGraph } from "../core/walk_graph";
import type { FabricMazeController } from "./fabric_controller";
import type { DailyAttempt } from "./daily_store";

// A walk graph's identity: its size, the entrance and exit, and every run
// (ends + lattice length) hashed (FNV-1a), so a moved maze never accepts
// another maze's taps (run ids are only indices).
export function walkFingerprint(walk: WalkGraph): string {
  let h = 0x811c9dc5;
  const add = (s: string): void => {
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
    }
  };
  add(`${walk.start}>${walk.exit};`);
  for (const e of walk.edges) {
    add(`${e.va}>${e.vb}:${Math.round(e.length * 1e6)};`);
  }
  const hex = h.toString(16).padStart(8, "0");
  return `w1.${walk.vertices.size}.${walk.edges.length}.${hex}`;
}

export interface AttemptInfo {
  startedAt: number;
  day: number;
  elapsedMs: number;
  maze: string;
  def: number;
  savedAt: number;
}

// The record of the solve in progress (null before its first move).
export function attemptRecord(
  c: FabricMazeController,
  info: AttemptInfo
): DailyAttempt | null {
  if (c.taps.length === 0) return null;
  return {
    startedAt: info.startedAt,
    day: info.day,
    elapsedMs: Math.max(0, Math.round(info.elapsedMs)),
    taps: [...c.taps],
    path: [...c.pathEdges],
    moves: c.moveLog.join(""),
    backtrack: c.backtrackDist,
    maze: info.maze,
    def: info.def,
    savedAt: info.savedAt,
  };
}

export type RestoreOutcome = "ok" | "maze" | "taps" | "path";

// Put a saved attempt back onto a fresh controller for the same maze.
// Anything but "ok" leaves the controller at the entrance.
export function restoreAttempt(
  c: FabricMazeController,
  a: DailyAttempt,
  maze: string
): RestoreOutcome {
  if (a.maze !== maze) {
    c.reset();
    return "maze";
  }
  if (!c.replay(a.taps)) return "taps";
  const same =
    c.pathEdges.length === a.path.length &&
    c.pathEdges.every((e, i) => e === a.path[i]);
  if (!same) {
    c.reset();
    return "path";
  }
  return "ok";
}

// What the Reset path button does. Inside a daily's unfinished attempt -
// the one that will be official - it never restarts the attempt: it is
// backtracking to the entrance (FabricMazeController.retreatToStart),
// the clock running on; memory-trail mode has no way back, so there it
// does nothing. Anywhere else - an ordinary design, a replay, a finished
// solve - it starts a fresh attempt, as it always has.
export type ResetPathAction = "backtrack" | "refuse" | "restart";

export function resetPathAction(s: {
  // The solve on screen is the daily's own unfinished attempt.
  dailyAttempt: boolean;
  // That daily already has its official result (this is a replay).
  official: boolean;
  solved: boolean;
  trailMode: boolean;
}): ResetPathAction {
  if (!s.dailyAttempt || s.official || s.solved) return "restart";
  return s.trailMode ? "refuse" : "backtrack";
}

// The runs the head has crossed since the path was last back at the
// entrance - what the fog of war has explored (it starts over whenever the
// path empties, as live play does). Follows the taps' effect on the path
// stack: a tap of the newest run backtracks it (outside trail mode).
export function exploredRuns(c: FabricMazeController): number[] {
  const stack: number[] = [];
  let since: number[] = [];
  for (const eid of c.taps) {
    if (!c.trailMode && stack.length > 0 && stack[stack.length - 1] === eid) {
      stack.pop();
    } else {
      stack.push(eid);
    }
    since.push(eid);
    if (stack.length === 0) since = [];
  }
  return since;
}
