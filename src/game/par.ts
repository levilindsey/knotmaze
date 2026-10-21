// K137 stage 1, PAR (design docs/design/K80_gameplay_additions.md; brief
// docs/design/K137_s1.md). Pure: the par of a maze, the strict loss test
// and the strokes readout. FabricMazeController holds the state.
//
// F is the fewest runs from the start to the exit (runsToExit, a BFS over
// the walk graph); the par is P = F + round(parSlack x F), fixed when the
// solve starts. A stroke is a move (one accepted tap: an advance or a
// backtrack, a title run included), so strokes = the controller's taps.
//  - strict: the solve is lost the moment the fewest unbroken runs from
//    the head to the exit exceed the strokes left, P - strokes (reaching P
//    short of the exit included). With fragile runs on, the search skips
//    broken runs.
//  - strokes: never lost; the HUD and the share text say how far over or
//    under par the finish was ("+2", "E", "-1").

export type ParMode = "off" | "strict" | "strokes";
export const PAR_MODES: readonly ParMode[] = ["off", "strict", "strokes"];

// The slack slider's range and default (the default picked by K137's
// numbers, step 5 of the brief: `.claude/probes/K137/`).
export const PAR_SLACK_MIN = 0;
export const PAR_SLACK_MAX = 1;
export const PAR_SLACK_DEFAULT = 0.25;

// P = F + round(slack x F). The slack counts in hundredths, so the
// product is an integer over 100 and the rounding is the same on every
// engine (a half rounds up). Infinity when F is (no route).
export function parFor(fewest: number, slack: number): number {
  if (!Number.isFinite(fewest)) return Infinity;
  const s = Math.max(0, Math.round(slack * 100));
  return fewest + Math.round((s * fewest) / 100);
}

// Strokes left before par (negative: over par).
export function strokesLeft(par: number, strokes: number): number {
  return par - strokes;
}

// Strict par: is no finish within par left? `runsLeft` is the fewest
// (unbroken) runs from the head to the exit (Infinity: none), `strokes`
// the moves made so far.
export function strictLost(runsLeft: number, par: number, strokes: number): boolean {
  if (runsLeft === 0) return false;
  return runsLeft > par - strokes;
}

// The finish against par, golf style: "+2" over, "E" even, "−1" under
// (U+2212, as the share text prints it).
export function parScore(strokes: number, par: number): string {
  if (!Number.isFinite(par)) return "";
  const d = strokes - par;
  if (d === 0) return "E";
  return d > 0 ? `+${d}` : `−${-d}`;
}
