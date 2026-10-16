// K499: GAMEPAD - the Gamepad API polled once a frame (main.ts
// pollGamepad, from the frame loop's fabricTick, so it runs in every
// ticker branch without waking a sleeping scene: a poll with no edges
// reads state and changes nothing). The d-pad and the left stick feed
// the SAME direction picker as the arrow keys (ui/key_moves.ts): a
// direction going down is a key press (keyPress), staying down is a
// hold, and the held-at-arrival rule judges it at the arrival exactly
// as a key - a direction tapped mid-move and released before the
// arrival is discarded, one still held continues (queuedPressHeld
// reads HeldKeys, where the pad's directions live beside the keys').
// A/confirm is the tap-class input (Levi's correction, 3b1612f): an
// edge with no mid-move queue - pressed while the dot travels it is
// discarded, at rest it takes one step along the held direction and
// starts no hold of its own. Gameplay movement only: no panel
// navigation, no viewer preference.
//
// This module is the pure half: a snapshot in, direction and button
// edges out. No DOM, no navigator - main.ts reads the live gamepad.

import type { KeyDir } from "./key_moves";

// The standard mapping's indices (Gamepad API "standard" layout):
// buttons 12-15 are the d-pad, 0 is A (cross), the bottom button.
export const DPAD_UP = 12;
export const DPAD_DOWN = 13;
export const DPAD_LEFT = 14;
export const DPAD_RIGHT = 15;
export const CONFIRM_BUTTON = 0;
// Left stick axes.
export const STICK_X = 0;
export const STICK_Y = 1;
// Radial deadzone for the stick: below this magnitude the stick names
// no direction. 0.35 sits past the resting drift of a worn stick
// (about 0.1-0.2) and under a deliberate tilt (past 0.5 within a few
// degrees of travel), so a held direction does not flicker at rest.
export const STICK_DEADZONE = 0.35;

// A button as the mapping reads it: the API's GamepadButton, a plain
// boolean, or absent (a short buttons array on a sparse pad).
export type PadButton = boolean | { pressed: boolean } | undefined | null;

// One polled pad, reduced to what the mapping reads (the API's
// Gamepad satisfies it structurally - its Float64Array axes included -
// so main.ts hands it over with no per-frame copy; tests build their
// own).
export interface GamepadSnapshot {
  axes: ArrayLike<number>;
  buttons: ArrayLike<PadButton>;
}

export function buttonDown(b: PadButton): boolean {
  if (b === true) return true;
  if (b === false || b === null || b === undefined) return false;
  return b.pressed === true;
}

// The d-pad's directions. Opposite buttons down together cancel (a
// real d-pad cannot press both; a chord of them names no direction,
// as chordOf says of opposite keys).
export function dpadDirs(buttons: ArrayLike<PadButton>): KeyDir[] {
  const up = buttonDown(buttons[DPAD_UP]);
  const down = buttonDown(buttons[DPAD_DOWN]);
  const left = buttonDown(buttons[DPAD_LEFT]);
  const right = buttonDown(buttons[DPAD_RIGHT]);
  const out: KeyDir[] = [];
  if (up !== down) out.push(up ? "up" : "down");
  if (left !== right) out.push(left ? "left" : "right");
  return out;
}

// The left stick's directions: the vector past the radial deadzone,
// quantized to the eight sectors (a cardinal within 22.5 degrees of
// its axis, else the diagonal it leans into, as two dirs the chord
// rules name). Screen y is down, as the stick's +y is. A non-finite
// axis names nothing (a half-initialized pad must not steer).
export function stickDirs(
  x: number,
  y: number,
  deadzone: number = STICK_DEADZONE
): KeyDir[] {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return [];
  if (Math.sqrt(x * x + y * y) < deadzone) return [];
  // Sector 0 is +x (right), turning clockwise on screen (y down).
  const sector = ((Math.round(Math.atan2(y, x) / (Math.PI / 4)) % 8) + 8) % 8;
  switch (sector) {
    case 0:
      return ["right"];
    case 1:
      return ["right", "down"];
    case 2:
      return ["down"];
    case 3:
      return ["left", "down"];
    case 4:
      return ["left"];
    case 5:
      return ["left", "up"];
    case 6:
      return ["up"];
    default:
      return ["right", "up"];
  }
}

// Every direction a snapshot holds: the d-pad's, then the stick's it
// does not already name (one held entry per direction, however many
// sources hold it).
export function gamepadDirs(snap: GamepadSnapshot): KeyDir[] {
  const out = dpadDirs(snap.buttons);
  for (const d of stickDirs(snap.axes[STICK_X] ?? 0, snap.axes[STICK_Y] ?? 0)) {
    if (!out.includes(d)) out.push(d);
  }
  return out;
}

// Whether a snapshot's A/confirm button is down.
export function confirmDown(snap: GamepadSnapshot): boolean {
  return buttonDown(snap.buttons[CONFIRM_BUTTON]);
}

// One poll's edges: the directions that went down and came up since
// the last poll, A/confirm's fresh press, and the directions held now.
export interface GamepadEvents {
  pressed: KeyDir[];
  released: KeyDir[];
  confirm: boolean;
  dirs: KeyDir[];
}

// The stateful edge tracker (still pure: snapshots and times in,
// edges out). A null snapshot is no pad at all - everything held is
// released, so an unplugged pad never leaves a direction stuck down.
export class GamepadInput {
  private held: KeyDir[] = [];
  private confirmWas = false;

  poll(snap: GamepadSnapshot | null): GamepadEvents {
    const dirs = snap === null ? [] : gamepadDirs(snap);
    const pressed = dirs.filter((d) => !this.held.includes(d));
    const released = this.held.filter((d) => !dirs.includes(d));
    const confirmNow = snap !== null && confirmDown(snap);
    const confirm = confirmNow && !this.confirmWas;
    this.held = dirs;
    this.confirmWas = confirmNow;
    return { pressed, released, confirm, dirs };
  }

  // The directions held now (a confirm step steps along these).
  get dirs(): KeyDir[] {
    return this.held;
  }

  clear(): void {
    this.held = [];
    this.confirmWas = false;
  }
}
