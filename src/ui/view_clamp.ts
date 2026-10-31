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
// THE PANEL'S EDGE IS TWEENED (K198 stage 2): the panel itself snaps open
// and shut (setOpen toggles its display), but the range sees it through an
// openness in [0, 1] that eases over PANEL_TWEEN_S on a time-based clock
// (stepPanelTween, easePanel; 0 under reduced motion), and the widening is
// scaled by it. Closing at the limit, the view rides the edge home in
// PANEL_TWEEN_S at any frame rate, starting and stopping smoothly.
// A resize or the fit drifting can still leave the view outside: it eases
// back in (easeIntoRange, once a frame), never snaps, and a gesture
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

// How long the range's panel edge takes to follow the panel open or shut.
export const PANEL_TWEEN_S = 0.25;

// The open panel as the range needs it (null while it is closed).
export interface OpenPanel {
  // The panel's left edge, screen px (the last open one while it closes).
  left: number;
  // The framed maze's drawn right edge in fit-screen px.
  mazeRight: number;
  // The eased openness (easePanel): the share of the widening in force.
  // Absent = 1, fully open.
  open?: number;
}

// One step of the panel's clock: its linear progress u (0 closed, 1 open)
// moves toward `open` by dt / dur. A reversal mid-way turns back from where
// it is. dur 0 (reduced motion) jumps.
export function stepPanelTween(
  u: number,
  open: boolean,
  dt: number,
  dur: number = PANEL_TWEEN_S
): number {
  if (!(dur > 0)) return open ? 1 : 0;
  const d = Math.max(0, dt) / dur;
  return open ? Math.min(1, u + d) : Math.max(0, u - d);
}

// The openness the range uses for progress u: smoothstep, so the edge (and
// a view riding it) starts and stops smoothly.
export const easePanel = (u: number): number => {
  const c = u < 0 ? 0 : u > 1 ? 1 : u;
  return c * c * (3 - 2 * c);
};

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
  const edge = panel ? panel.left - gap - zoom * panel.mazeRight : NaN;
  const wide = edge < loX ? edge : loX;
  // The tweened panel (K198 stage 2): the share of the widening in force.
  const k = panel?.open ?? 1;
  return {
    loX: k >= 1 ? wide : loX + (wide - loX) * Math.max(0, k),
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

// One frame of the fit camera's range (main.ts easeView, K198 stage 2): the
// ease back into range is measured against the range as it stood at the
// panel's previous openness (`before`), then the view is clamped to this
// frame's (`now`) with that allowance. A view at the limit therefore rides
// the tweened panel edge exactly (no lag on top of the tween), while a view
// a resize or the fit's drift left outside still eases in at `rate` a frame.
export function stepRange(
  view: FitView,
  w: number,
  h: number,
  maxZoom: number,
  before: OpenPanel | null,
  now: OpenPanel | null,
  allow: PanBounds,
  rate: number = RANGE_EASE,
  gap: number = PANEL_GAP
): void {
  easeIntoRange(view, w, h, before, allow, rate, gap);
  clampFitView(view, w, h, maxZoom, now, allow, gap);
}

// K549: THE TEXT SCENE'S FIT. A maze's home view may sit under the open
// panel: K198's pan range lets the player bring its right edge clear.
// A standalone word (a text scene, params.text) is read whole, start to
// exit, so its FIT is placed in the panel-cleared part of the screen
// instead: with the panel open the fit area ends PANEL_GAP left of the
// panel, and the word is centred there at a smaller scale. Every other
// scene, and a text scene with the panel closed (or the phone's sheet,
// which the camera reads as no panel), keeps the full-viewport fit.
// Pure, like the pan range above; src/app/camera.ts supplies the panel's
// left edge and whether the scene is a text scene.
export interface FitArea {
  left: number;
  right: number;
}

// The screen band the fit centres in. A cleared band too narrow to read
// a word in (under 200 px: the panel covers the screen in practice, and
// the sheet already reads as no panel) falls back to the full viewport.
export function fitArea(
  screenW: number,
  panelLeft: number | null,
  textScene: boolean,
  gap: number = PANEL_GAP
): FitArea {
  const full: FitArea = { left: 0, right: screenW };
  if (!textScene || panelLeft === null || !Number.isFinite(panelLeft)) return full;
  const right = panelLeft - gap;
  return right >= 200 && right < screenW ? { left: 0, right } : full;
}

// Padded scene bounds, as computeFitTarget pads them.
export interface FitBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

// The fit's placement: the largest scale that fits the bounds in the
// area (margin on every side, capped at maxScale), centred in it. In
// the full area this is exactly the fit camera's long-standing formula.
export function fitPlacement(
  bounds: FitBounds,
  screenH: number,
  margin: number,
  maxScale: number,
  area: FitArea
): { scale: number; x: number; y: number } {
  const w = Math.max(bounds.maxX - bounds.minX, 1);
  const h = Math.max(bounds.maxY - bounds.minY, 1);
  const availW = area.right - area.left;
  const scale = Math.min(
    (availW - margin * 2) / w,
    (screenH - margin * 2) / h,
    maxScale
  );
  return {
    scale,
    x: area.left + (availW - w * scale) / 2 - bounds.minX * scale,
    y: (screenH - h * scale) / 2 - bounds.minY * scale,
  };
}
