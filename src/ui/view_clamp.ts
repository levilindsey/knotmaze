// THE FIT CAMERA'S PAN RANGE (K198; Levi, 2026-10-14: "I just want to be
// able to pan such that the right edge of the maze is shown to the left of
// the left edge of the panel. ... I guess we should prevent the excess
// pan."). PURE - main.ts's clampView and updateCamera call it.
//
// In fit mode the view is the auto-fit FRAME (the maze framed in a
// screen-sized rectangle) scaled by `zoom` and shifted by `pan`, in screen
// px: screen = zoom * fitScreen + pan. Zoom 1 is the home view and the
// furthest-out one. The zoomed frame covers the screen (the rule before
// K149), so zoom 1 has no pan range, with one widening: while the panel is
// open, the pan may also go left until the maze's drawn right edge sits
// PANEL_GAP px left of the panel's left edge:
//
//   panX in [min(W (1 - zoom), panelLeft - gap - zoom * mazeRight), 0]
//   panY in [H (1 - zoom), 0]
//
// (mazeRight in fit-screen px, where it sits at zoom 1, pan 0). A maze that
// already clears the open panel gets nothing extra at any zoom. K149's
// PAN_SLACK (0.3 of the screen per side, at every zoom) is gone.
//
// Opening the panel only widens the range, so it never moves the view.
// Closing it, a resize or the fit drifting can leave the view outside: it
// eases back in (easeIntoRange, once a frame), never snaps, and a gesture
// meanwhile is clamped to where the ease has got to. See gameplay-camera.md
// (FIT CAMERA PAN RANGE).

// The gap between the maze's right edge and the open panel's left edge at
// the left limit: the panel's own margin from the screen's edge.
export const PANEL_GAP = 10;
// The share of the way into range the view moves each frame (the reset's
// ease, viewHoming in main.ts).
export const RANGE_EASE = 0.15;

export interface FitView {
  // Zoom on top of the auto-fit: 1 = home (the furthest out), up to the max.
  zoom: number;
  // Screen-space shift of the zoomed frame, px.
  panX: number;
  panY: number;
}

// The open panel as the range needs it (null while it is closed).
export interface OpenPanel {
  // The panel's left edge, screen px.
  left: number;
  // The framed maze's drawn right edge in fit-screen px.
  mazeRight: number;
}

// Pan bounds per axis (px). The ease's allowance has the same shape: how
// far past each bound the view may still sit (>= 0).
export interface PanBounds {
  loX: number;
  hiX: number;
  loY: number;
  hiY: number;
}

export const noAllowance = (): PanBounds => ({ loX: 0, hiX: 0, loY: 0, hiY: 0 });

export function panRange(
  w: number,
  h: number,
  zoom: number,
  panel: OpenPanel | null,
  gap: number = PANEL_GAP
): PanBounds {
  const loX = w * (1 - zoom);
  // NaN (no maze edge yet) compares false: no widening.
  const open = panel ? panel.left - gap - zoom * panel.mazeRight : NaN;
  return {
    loX: open < loX ? open : loX,
    hiX: 0,
    loY: h * (1 - zoom),
    hiY: 0,
  };
}

const clampTo = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

// Clamp the zoom to [1, maxZoom], then each pan into its range widened by
// the allowance (in place).
export function clampFitView(
  view: FitView,
  w: number,
  h: number,
  maxZoom: number,
  panel: OpenPanel | null = null,
  allow: PanBounds | null = null,
  gap: number = PANEL_GAP
): void {
  view.zoom = Math.min(maxZoom, Math.max(1, view.zoom));
  const r = panRange(w, h, view.zoom, panel, gap);
  const a = allow ?? noAllowance();
  view.panX = clampTo(view.panX, r.loX - a.loX, r.hiX + a.hiX);
  view.panY = clampTo(view.panY, r.loY - a.loY, r.hiY + a.hiY);
}

// One frame of the ease into range: the allowance becomes (1 - rate) of how
// far the view lies past each bound (0 under half a px), and the view is
// clamped to the widened range, so it moves `rate` of the way in. rate 0
// only records where the view is (nothing moves). Returns whether the view
// is still out of range.
export function easeIntoRange(
  view: FitView,
  w: number,
  h: number,
  panel: OpenPanel | null,
  allow: PanBounds,
  rate: number = RANGE_EASE,
  gap: number = PANEL_GAP
): boolean {
  const r = panRange(w, h, view.zoom, panel, gap);
  const keep = (out: number): number => {
    const v = out * (1 - rate);
    return v < 0.5 ? 0 : v;
  };
  allow.loX = keep(r.loX - view.panX);
  allow.hiX = keep(view.panX - r.hiX);
  allow.loY = keep(r.loY - view.panY);
  allow.hiY = keep(view.panY - r.hiY);
  view.panX = clampTo(view.panX, r.loX - allow.loX, r.hiX + allow.hiX);
  view.panY = clampTo(view.panY, r.loY - allow.loY, r.hiY + allow.hiY);
  return allow.loX + allow.hiX + allow.loY + allow.hiY > 0;
}
