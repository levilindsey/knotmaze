// THE FIT CAMERA'S PAN CLAMP (K149; Levi, 2026-10-13: "we should support
// panning the maze a bit more off-screen at furthest zoom. Especially to
// get it out from under the menu."). PURE - main.ts's clampView calls it.
//
// In fit mode the view is the auto-fit FRAME (the maze framed in a
// screen-sized rectangle) scaled by `zoom` and shifted by `pan`, in screen
// px: screen = zoom * fitScreen + pan. Zoom 1 is the home view and the
// furthest-out one. Until K149 the zoomed frame had to cover the screen, so
// at zoom 1 there was no pan range at all: the maze could never leave the
// open panel's side of the screen. Now the frame may overhang the screen's
// edge by PAN_SLACK of the screen's size per side, at every zoom:
//
//   pan in [size * (1 - zoom) - slack * size, slack * size]   (per axis)
//
// so at least (1 - slack) of the screen's width and height is still frame
// at any zoom (the maze sits inside the frame with its own margin, so
// the maze keeps at least as much). The slack is a share of the SCREEN, not
// of the maze: a fixed fraction does not change when the panel opens or
// closes, so nothing jumps.
//
// Why 0.3: the desktop panel is 256 px wide at 10 px from the right edge
// (266 px), and a maze that fills the width has a 40 px margin
// (FIT_MARGIN), so it must move left by 226 px plus a gap to clear the panel.
// That is 17% of 1400, 23% of 1000 and 29% of 800 (below 700 px the panel
// starts closed). Measured at 1000x800 and 800x700: the maze overlaps the
// open panel at home and clears it at the limit. On a 411x753 phone the
// open panel is 320 px wide (x 81-401) and runs to the bottom, so no share
// short of about 70% clears it, which would leave the maze all but off
// screen: 0.3 moves it 123 px there, and the panel starts closed. See
// gameplay.md (FIT CAMERA PAN SLACK, K149).

export const PAN_SLACK = 0.3;

export interface FitView {
  // Zoom on top of the auto-fit: 1 = home (the furthest out), up to the max.
  zoom: number;
  // Screen-space shift of the zoomed frame, px.
  panX: number;
  panY: number;
}

// One axis: the range of the frame's shift. The frame is `size * zoom`
// long and starts `pan` px from the screen's start edge.
export function panRange(
  size: number,
  zoom: number,
  slack: number = PAN_SLACK
): { lo: number; hi: number } {
  const room = Math.max(0, slack) * size;
  return { lo: size * (1 - zoom) - room, hi: room };
}

// Clamp the zoom to [1, maxZoom] and each pan into its range (in place).
export function clampFitView(
  view: FitView,
  w: number,
  h: number,
  maxZoom: number,
  slack: number = PAN_SLACK
): void {
  view.zoom = Math.min(maxZoom, Math.max(1, view.zoom));
  const x = panRange(w, view.zoom, slack);
  const y = panRange(h, view.zoom, slack);
  view.panX = Math.min(x.hi, Math.max(x.lo, view.panX));
  view.panY = Math.min(y.hi, Math.max(y.lo, view.panY));
}
