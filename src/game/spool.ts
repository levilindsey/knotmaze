// K137 stage 2 (4.15): ARIADNE'S SPOOL. The yarn is a stack of moves: the
// classic game's path stack (FabricMazeController.pathEdges, never the
// trail look's), so a move that retraces the last yarn run reels it in, any
// other move pays a run out (loops included), and Undo reels in too. The
// spool holds par's measure of the optimal route (the fewest runs, title
// runs included, as strokes count them; game/par.ts) times (1 + slack), and
// tapEdge refuses a move that would pay out past it ("spool"). Pure.

import { parFor } from "./par";

export const SPOOL_SLACK_MIN = 0.1;
export const SPOOL_SLACK_MAX = 1;
// Call 1 (K137 s2): the slack once the spool is on.
export const SPOOL_SLACK_DEFAULT = 0.3;

// A slack held to [SPOOL_SLACK_MIN, SPOOL_SLACK_MAX]; garbage reads the default.
export function spoolSlackOf(v: number): number {
  if (!Number.isFinite(v)) return SPOOL_SLACK_DEFAULT;
  return Math.min(SPOOL_SLACK_MAX, Math.max(SPOOL_SLACK_MIN, v));
}

// The spool's capacity in runs: par's rounding of fewest x (1 + slack).
// Infinity when the walk has no route (nothing to refuse against).
export function spoolCapacity(fewestRuns: number, slack: number): number {
  return parFor(fewestRuns, spoolSlackOf(slack));
}

// The share of the spool paid out, 0..1 (0 without a finite capacity).
export function spoolShareUsed(used: number, capacity: number): number {
  if (!Number.isFinite(capacity) || capacity <= 0) return 0;
  return Math.min(1, Math.max(0, used / capacity));
}

// Would a move that pays one more run out pass the spool?
export function spoolRefuses(used: number, capacity: number): boolean {
  return used + 1 > capacity;
}

// The share used as a whole percent (the share tag's and the win banner's).
export function spoolPercentUsed(used: number, capacity: number): number {
  return Math.round(spoolShareUsed(used, capacity) * 100);
}

// The share text's tag: "🧶 82% of the spool" (the share used at the finish).
export function spoolTag(used: number, capacity: number): string | null {
  if (!Number.isFinite(capacity) || capacity <= 0) return null;
  return `🧶 ${spoolPercentUsed(used, capacity)}% of the spool`;
}

// The HUD's gauge: the share LEFT as SPOOL_GAUGE_CELLS cells and a whole
// percent, rounded down, so a spool one run from empty never reads full
// and an empty one reads 0%.
export const SPOOL_GAUGE_CELLS = 8;
export function spoolGauge(used: number, capacity: number): string {
  const left = 1 - spoolShareUsed(used, capacity);
  const full = Math.max(0, Math.min(SPOOL_GAUGE_CELLS, Math.floor(left * SPOOL_GAUGE_CELLS + 1e-9)));
  const pct = Math.floor(left * 100 + 1e-9);
  return "█".repeat(full) + "░".repeat(SPOOL_GAUGE_CELLS - full) + ` ${pct}%`;
}
