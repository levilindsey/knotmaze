// MAZE STATS (K19): the solve metrics beside the path and backtrack meters,
// and their exact definitions. Distances are lattice arc (walk-graph run
// lengths), like the existing meters.
//
// - TIME: wall-clock milliseconds from the first move (the first accepted
//   tap - always the entrance run) to the dot's ARRIVAL at the exit, with
//   the time the page spent hidden left out (SolveClock). Reset path and a
//   rebuild reset it; it does not run before the first move. A DAILY
//   attempt (K47) is saved instead: a reload or a rebuild resumes it, and
//   its Reset path backtracks to the entrance with the clock running.
// - EFFICIENCY: optimal / path, where path is the route you ended on (the
//   current-path meter at the exit) - so backtracked detours do not lower
//   it (the backtrack meter prices them separately, as designed in Stage
//   8); in trail mode, which has no backtracking, path is everything you
//   walked. Defined only for a finished route: the HUD shows it after the
//   solve. Shown as a whole percent rounded DOWN, so 100% means optimal.
// - JUNCTIONS: distinct junction vertices your position has reached
//   (revisits and backtracking onto them do not count again).
// - DEAD ENDS: distinct dead-end tips reached - END vertices that are
//   neither the entrance nor the exit. Counted only while the deadEnds
//   param is on (the HUD hides the row otherwise).
// - MOVES (the share grid): one letter per accepted tap - "g" a step along
//   a shortest route to the exit (run length + the far vertex's distance
//   to the exit equals the near vertex's), "d" any other advance (a
//   detour), "b" a backtrack.

export type MoveKind = "g" | "d" | "b";

// optimal / path in (0, 1], or null when undefined (no path yet, or a maze
// with no finite optimal).
export function efficiencyOf(optimal: number, path: number): number | null {
  if (!Number.isFinite(optimal) || optimal <= 0) return null;
  if (!Number.isFinite(path) || path <= 0) return null;
  return Math.min(1, optimal / path);
}

// Whole percent, rounded DOWN (a 99.9% route is not optimal), with an
// epsilon for the float noise of summing the same run lengths in another
// order (path == optimal must read 100).
export function efficiencyPercent(eff: number): number {
  return Math.max(0, Math.min(100, Math.floor(eff * 100 + 1e-7)));
}

// m:ss below an hour, h:mm:ss from there; seconds round down.
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

// The solve clock: idle until start(), then running until stop(). Time the
// page spends HIDDEN (another tab, the phone's home screen) does not count:
// nothing can be played then, and the arrival animation would not finish
// until the page came back anyway. Every method takes the current time
// (performance.now() in the app), so the tests drive it exactly.
//
// A SAVED attempt (K47) comes back PAUSED at its saved time - restore() -
// and resume() carries on from there: main.ts resumes once the scene is on
// screen (after the intro), or at the next move, whichever comes first.
export class SolveClock {
  private startAt = 0;
  private stopAt = 0;
  private hiddenSince: number | null = null;
  private hiddenTotal = 0;
  private pausedMs = 0;
  state: "idle" | "paused" | "running" | "stopped" = "idle";

  get started(): boolean {
    return this.state !== "idle";
  }

  start(now: number, hidden = false): void {
    this.runFrom(now, 0, hidden);
  }

  // A saved attempt's clock: paused at `elapsedMs` until resume().
  restore(elapsedMs: number): void {
    this.state = "paused";
    this.pausedMs = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
    this.hiddenSince = null;
    this.hiddenTotal = 0;
  }

  // Run on from the paused time (no-op unless paused).
  resume(now: number, hidden = false): void {
    if (this.state !== "paused") return;
    this.runFrom(now, this.pausedMs, hidden);
  }

  private runFrom(now: number, offsetMs: number, hidden: boolean): void {
    this.state = "running";
    this.startAt = now - offsetMs;
    this.stopAt = now;
    this.hiddenTotal = 0;
    this.hiddenSince = hidden ? now : null;
  }

  stop(now: number): void {
    if (this.state === "paused") {
      // Finished without resuming (a restored winning move): its saved time.
      this.startAt = 0;
      this.stopAt = this.pausedMs;
      this.hiddenTotal = 0;
      this.hiddenSince = null;
      this.state = "stopped";
      return;
    }
    if (this.state !== "running") return;
    this.settleHidden(now);
    this.stopAt = now;
    this.state = "stopped";
  }

  reset(): void {
    this.state = "idle";
    this.hiddenSince = null;
    this.hiddenTotal = 0;
  }

  // The page's visibility changed (visibilitychange).
  setHidden(hidden: boolean, now: number): void {
    if (this.state !== "running") return;
    if (hidden) {
      if (this.hiddenSince === null) this.hiddenSince = now;
    } else {
      this.settleHidden(now);
    }
  }

  private settleHidden(now: number): void {
    if (this.hiddenSince !== null) {
      this.hiddenTotal += Math.max(0, now - this.hiddenSince);
      this.hiddenSince = null;
    }
  }

  elapsed(now: number): number {
    if (this.state === "idle") return 0;
    if (this.state === "paused") return this.pausedMs;
    const end = this.state === "running" ? now : this.stopAt;
    const hiddenNow =
      this.state === "running" && this.hiddenSince !== null
        ? Math.max(0, now - this.hiddenSince)
        : 0;
    return Math.max(0, end - this.startAt - this.hiddenTotal - hiddenNow);
  }
}

// The Wordle-style move grid for sharing: one square per move (green = a
// shortest-route step, yellow = a detour, red = a backtrack), `perRow` to a
// line, at most `maxRows` lines - a longer solve ends its last line in
// "+N" (the moves not drawn).
const SQUARE: Record<MoveKind, string> = {
  g: "\u{1F7E9}",
  d: "\u{1F7E8}",
  b: "\u{1F7E5}",
};

export function moveGrid(moves: string, perRow = 10, maxRows = 6): string {
  const kinds = [...moves].filter((c): c is MoveKind => c in SQUARE);
  if (kinds.length === 0) return "";
  const cap = perRow * maxRows;
  const shown = kinds.length > cap ? kinds.slice(0, cap - 1) : kinds;
  const rows: string[] = [];
  for (let i = 0; i < shown.length; i += perRow) {
    rows.push(
      shown
        .slice(i, i + perRow)
        .map((k) => SQUARE[k])
        .join("")
    );
  }
  if (kinds.length > cap) rows[rows.length - 1] += ` +${kinds.length - shown.length}`;
  return rows.join("\n");
}
