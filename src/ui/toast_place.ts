// K698: where the toast sits (ui/share.ts showToast places it; pure, tested
// in test/ui/toast_place.test.ts). The toast is centred at the bottom of the
// screen, at the CSS floor (max(18px, the safe area)). A control anchored to
// the bottom of the screen that shares the toast's column (the scissors and
// Undo, the walker's buttons, the move pad, a phone's win banner, an edge
// indicator) lifts it to TOAST_GAP above that control's top; the highest
// such top wins. It never goes below the floor or off the top. A control
// beside the toast's column leaves it where it is (the desktop's pad, far
// right, does not lift a centred toast).

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// Px between the toast and the top of the control it sits above.
export const TOAST_GAP = 10;
// A control this many px beside the toast's column still counts as under it.
export const TOAST_SIDE_MARGIN = 8;
// The toast's top never rises above this many px from the screen's top.
export const TOAST_TOP_MARGIN = 10;

// Is a box anchored to the bottom of a viewport `vh` tall (nearer its
// bottom edge than its top)? A desktop's win banner, at the top, is not.
export function bottomAnchored(b: Box, vh: number): boolean {
  return vh - b.bottom < b.top;
}

// The toast's CSS `bottom` in px: `toast` is its column (left, right) and
// height, `controls` the visible controls' boxes (client px), `floor` the
// CSS floor.
export function toastBottom(
  toast: { left: number; right: number; height: number },
  controls: readonly Box[],
  vh: number,
  floor: number
): number {
  let bottom = floor;
  for (const c of controls) {
    if (!(c.right > c.left && c.bottom > c.top)) continue; // empty (or NaN)
    if (!bottomAnchored(c, vh)) continue;
    if (c.right <= toast.left - TOAST_SIDE_MARGIN) continue;
    if (c.left >= toast.right + TOAST_SIDE_MARGIN) continue;
    bottom = Math.max(bottom, vh - c.top + TOAST_GAP);
  }
  return Math.max(floor, Math.min(bottom, vh - toast.height - TOAST_TOP_MARGIN));
}
