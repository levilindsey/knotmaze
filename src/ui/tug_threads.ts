// K1173: TUG THREADS - whether dragging a thread tugs it with physics.
// A viewer preference (localStorage `knotmaze.tugThreads`, a panel
// checkbox in Touch & feel), on by default, kept per browser like the
// move pad (`ui/move_pad.ts`) and never in a link: a link and a daily
// describe a design, not how this player's drags feel. With it off, a
// drag that starts on a thread pans the view instead (the physics never
// sees a grab); taps still pluck, and move in maze play, exactly as
// before. Pluck tug and Auto plucks tug are the pluck's own settings
// and are untouched.
//
// Storage may be missing, or throw on any access (blocked storage,
// private modes, quota): every access is wrapped, and the choice then
// lasts for the session only (the motion setting's pattern).

import type { StorageLike } from "../game/daily_store";

export const TUG_THREADS_KEY = "knotmaze.tugThreads";

// The stored choice ("1" on, "0" off), else on: tugging is how the
// knot has always felt, so anything unreadable reads as no choice.
export function tugThreadsPref(stored: string | null): boolean {
  return stored !== "0";
}

// The preference as stored in this browser (on when storage cannot say).
export function readTugThreadsPref(storage: StorageLike | null): boolean {
  try {
    return tugThreadsPref(storage?.getItem(TUG_THREADS_KEY) ?? null);
  } catch {
    return true;
  }
}

// Remember the choice per browser; a refusal just loses the memory.
export function writeTugThreadsPref(
  storage: StorageLike | null,
  on: boolean
): void {
  try {
    storage?.setItem(TUG_THREADS_KEY, on ? "1" : "0");
  } catch {
    // Storage refused (blocked or full): this session only.
  }
}
