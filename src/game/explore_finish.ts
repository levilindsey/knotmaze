// K465 pure: when the FINISH shows under the thread reveal.
//
// K76's decision 6 hid the exit under the reveal (`exploration` threads)
// until the player had seen it: the exit marker (fabric_maze_renderer's
// drawMarkers), the marker's gap slot (ribbon/explore_gaps.ts) and the
// exit's off-screen indicator (main.ts) all waited for the thread point
// under it to be solid (`exploreVisAt` >= EXPLORE_MARKER_VIS). Levi,
// 2026-10-15: "With the thread reveal mode, we should show where the
// destination marker is, by default." The `revealFinish` param (rvx,
// default on) LIFTS that hold; off, decision 6 stands. These functions are
// the one place the rule lives, so the three sites cannot drift apart.
//
// What stays as it was, lifted or not:
//   - the intro reveal's own rule (`revealMulAtCtrl` under 0.98): the exit
//     still waits for the appearance animation to reach it;
//   - the burn: an exit point burnt away under `burnt` gone is not drawn
//     (the burn declares it as hidden through the same visibility the
//     reveal reads), so the lift does not reach through it;
//   - everything after a finish, the minotaur's fog rules and the fit
//     camera (it frames the seen thread, not the exit).

// A thread point counts as seen once its visibility reaches this: the exit
// marker and its gap slot are on or off by the same test. (Unchanged since
// K76 stage 2b; it moved here with the rule.)
export const EXPLORE_MARKER_VIS = 0.98;

// Why the exit is held back, "" = not held. The strings are what
// `__knotIndicators()` reports as the finish indicator's `finishWhy`.
export type FinishHold = "" | "exit unrevealed" | "exit unseen";

// Whether the reveal's hold on the exit is lifted: the param is on and the
// exit's own thread point is not burnt away (gone). With the reveal off
// nothing depends on it: exploreVisAt answers 1 there.
export function finishLifted(revealFinish: boolean, burntGone: boolean): boolean {
  return revealFinish && !burntGone;
}

// Why the exit marker and its indicator wait, in the order the checks have
// always run: the appearance animation first (`introMul`, the intro
// reveal's multiplier at the exit; 1 when none runs), then the thread
// reveal (`exploreVis`, 1 with the mode off) unless the finish is lifted.
export function finishHold(a: {
  introMul: number;
  exploreVis: number;
  lifted: boolean;
}): FinishHold {
  if (a.introMul < EXPLORE_MARKER_VIS) return "exit unrevealed";
  if (a.exploreVis >= EXPLORE_MARKER_VIS) return "";
  return a.lifted ? "" : "exit unseen";
}

// Whether the marker disc's gap slot is switched off by the thread reveal:
// the exit's slot waits with its marker, every other disc (the start's)
// follows its thread point; `lifted` is only ever true for the exit's slot.
export function markerGapHeld(exploreVis: number, lifted: boolean): boolean {
  return !lifted && exploreVis < EXPLORE_MARKER_VIS;
}
