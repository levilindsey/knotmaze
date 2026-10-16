import type { Application, Container } from "pixi.js";
import type { MotionSetting } from "../ui/motion";
import type { Rect } from "../ui/offscreen_indicators";
import { SHEET_QUERY } from "../ui/panel_sheet";
import type { UrlParams } from "../ui/url_state";
import {
  PANEL_TWEEN_S,
  clampFitView,
  easePanel,
  noAllowance,
  stepPanelTween,
  stepRange,
  type OpenPanel,
} from "../ui/view_clamp";
import { Flag, type LoopFlags } from "./loop_flags";
import type { SceneRef } from "./scene_ref";

// K5 M2 (docs/design/K5_K6_split.md, 2.2): the camera, moved out of main()
// as it was: the eased fit, the follow camera, the one primitive every
// gesture speaks (placeWorldAt), the K198 pan range and the panel's tween.
// main.ts calls createCamera once, where this code was, and destructures
// what other regions call under the old names. The `let`s other regions
// read are getters on the returned object, and the ones they also write
// are get/set pairs (`camera.camTween = null`): never destructure those,
// or the copy goes stale.

const FIT_MARGIN = 40;
// Pinch / wheel zoom ceiling, as a multiple of the auto-fit scale.
const MAX_ZOOM = 8;
// FOLLOW camera (cameraMode follow): framing span (lattice units across
// the short screen side), the grace period after a pan/zoom gesture
// before the pull-back spring engages, its ease-in time, and its
// full-strength angular rate (critically damped - weak, no overshoot).
const FOLLOW_SPAN = 13;
export const FOLLOW_DELAY = 1.2;
export const FOLLOW_RAMP = 1.0;
const FOLLOW_W = 2.4;
// K96: the camera steps by REAL elapsed time (the ticker's deltaMS is
// capped at 100 ms), the spring in substeps of at most CAM_STEP so it stays
// stable, so a low frame rate no longer means a slow-motion camera. A
// stall longer than CAM_MAX_DT (a hidden tab) counts as that long.
const CAM_STEP = 0.05;
export const CAM_MAX_DT = 1;
// K6-1: converged()'s thresholds, the motion left: screen px, and log
// scale (1e-5 moves a point 1000 px from the origin by 0.01 px).
const CONVERGED_PX = 0.01;
// K6-3: the scale test is screen-aware: a relative scale error e moves a
// screen point by e x its distance from the root's origin, which at
// MAX_ZOOM sits thousands of px off screen (K6-1's two UNDER frames). The
// lever is that distance's maximum over the screen's corners.

// What the camera reads from main(), each assigned once.
export interface CameraDeps {
  app: Application;
  root: Container;
  params: UrlParams;
  motion: MotionSetting;
  // K6-1: the loop's flag ledger (a gesture, a reset or a tween pushes CAMERA).
  flags: LoopFlags;
}

export function createCamera(deps: CameraDeps, scene: SceneRef) {
  const { app, root, params, motion, flags } = deps;
  // The unanchored knot finds its own shape, so the viewport fit follows
  // the live particle bounds, easing toward the target to avoid popping.
  const fitTarget = { scale: 1, x: 0, y: 0 };
  // K198: the framed maze's drawn right edge, world x (the pan range's).
  let fitRight = 0;
  // `out`: where the target goes (K6-1: converged() computes a fresh one
  // into a scratch); only the real target's call sets fitRight.
  function computeFitTarget(
    out: { scale: number; x: number; y: number } = fitTarget
  ): void {
    if (!scene.ps) return;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < scene.ps.particleCount; i++) {
      const x = scene.ps.positions[i * 2];
      const y = scene.ps.positions[i * 2 + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    let pad = params.threadWidth / 2 + 0.3;
    // FOG OF WAR: frame only what the fog lets you see (the explored
    // region grown by the reveal radius) - it widens as you explore. K76
    // stage 2c: the thread reveal frames the thread it shows the same way.
    const fogBox =
      params.mazeFabric && scene.fabric
        ? (scene.fabric.fogVisibleBounds() ?? scene.fabric.exploreVisibleBounds())
        : null;
    if (fogBox) {
      minX = fogBox.minX;
      minY = fogBox.minY;
      maxX = fogBox.maxX;
      maxY = fogBox.maxY;
      pad = 0.3;
      // K362 (taken 2026-10-15): under the thread reveal the framed span
      // is at least about 2 x (revealDistance + 2) world units, so the
      // start view is not pinned at the 90 px/world cap on the first stubs.
      if (params.exploration === 'threads') {
        const span = 2 * (params.revealDistance + 2);
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        if (maxX - minX < span) { minX = cx - span / 2; maxX = cx + span / 2; }
        if (maxY - minY < span) { minY = cy - span / 2; maxY = cy + span / 2; }
      }
    }
    // The threads' edge, or a start/head/exit disc poking past it; under
    // fog, the visible region's.
    if (out === fitTarget) {
      fitRight = fogBox
        ? maxX
        : Math.max(
            maxX + params.threadWidth / 2,
            params.mazeFabric && scene.fabric ? scene.fabric.markersRight() : -Infinity
          );
    }
    minX -= pad;
    minY -= pad;
    maxX += pad;
    maxY += pad;
    const w = Math.max(maxX - minX, 1);
    const h = Math.max(maxY - minY, 1);
    // Fit the knot, but never zoom in past a comfortable thread scale.
    out.scale = Math.min(
      (app.screen.width - FIT_MARGIN * 2) / w,
      (app.screen.height - FIT_MARGIN * 2) / h,
      90
    );
    out.x = (app.screen.width - w * out.scale) / 2 - minX * out.scale;
    out.y = (app.screen.height - h * out.scale) / 2 - minY * out.scale;
  }

  // ---- CAMERA ------------------------------------------------------------
  // Two modes (params.cameraMode):
  // FIT - the eased auto-fit (the whole knot, or under fog the visible
  //   region) with the user's zoom/pan composed on top in SCREEN space:
  //   screen = zoom * fitScreen + pan. Zoom 1 is the home view. Pans clamp
  //   (ui/view_clamp.ts, K198) so the zoomed fit frame covers the screen,
  //   except that while the panel is open the maze may go left until its
  //   right edge clears the panel; out of range (the panel closed, a
  //   resize), the view eases back in. A reset (double-click) eases back to
  //   zoom 1, pan 0.
  // FOLLOW - a chase camera on the player's head (maze mode): a scale +
  //   world center that gestures move freely, pulled back by a weak,
  //   critically damped spring that stays OFF for FOLLOW_DELAY after the
  //   last gesture and then eases its stiffness in over FOLLOW_RAMP (the
  //   approach itself eases out). During the intro it frames the knot.
  // Gestures speak one primitive - put world point (wx, wy) at screen
  // point (sx, sy) at scale s (placeWorldAt) - and each mode maps it onto
  // its own state, so pinch / wheel / drag behave identically in both.
  const fitCur = { scale: 1, x: 0, y: 0 };
  const view = { zoom: 1, panX: 0, panY: 0 };
  const cam = { s: 1, cx: 0, cy: 0, vl: 0, vx: 0, vy: 0 };
  let camFollow = false;
  let camTouchedAt = -1e9; // performance.now seconds of the last gesture.
  let viewHoming = false; // Fit mode: easing a reset back to the home view.
  // K73: an eased move to a framing (an off-screen indicator's tap): the
  // world point at the screen's center and the scale, from -> to. Any
  // gesture or a reset cancels it. `hold`: how long the follow camera
  // stays off once the move ends (negative: it is at full strength at
  // once - K148's return to the head).
  let camTween: {
    t: number;
    dur: number;
    s0: number;
    x0: number;
    y0: number;
    s1: number;
    x1: number;
    y1: number;
    hold: number;
    // K488: a free tween (the finish's peek) places its point at the
    // asked scale, past the fit clamp; with a `back` target it holds at
    // its end for `hold` seconds (camera dt) and then tweens back.
    free?: boolean;
    back?: { x: number; y: number; s: number; dur: number } | null;
    holdLeft?: number;
  } | null = null;
  const headScratch = new Float64Array(2);
  const nowSec = (): number => performance.now() / 1000;
  const touchCamera = (): void => {
    camTouchedAt = nowSec();
    viewHoming = false;
    camTween = null;
  };
  // K198: how far outside its range the view may still sit while it eases
  // back in (ui/view_clamp.ts), and the panel's wrapper once it exists.
  const panAllow = noAllowance();
  let panelWrap: HTMLElement | null = null;
  // K198 stage 2: the panel as the range and the indicators see it. The
  // panel snaps open and shut; its edge reaches them through a time-based
  // tween (panelU, linear progress, stepped in updateCamera; panelT, its
  // eased openness, this frame's and the last). While it closes, the box
  // is the last open one (a closed panel has none).
  let panelU = 0;
  let panelT = 0;
  let panelTPrev = 0;
  let panelBox: Rect | null = null;
  // K468: the settings sheet (a phone's full-screen panel) counts as no panel
  // here: its rect spans the screen, and the range would let the maze slide
  // out of view entirely.
  const sheetMQ =
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(SHEET_QUERY)
      : null;
  const readPanel = (): boolean => {
    if (sheetMQ?.matches) return false;
    const r = panelWrap?.getBoundingClientRect();
    if (!r || r.width <= 0) return false;
    panelBox = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    return true;
  };
  const stepPanel = (dt: number): void => {
    const open = readPanel();
    panelTPrev = panelT;
    panelU = stepPanelTween(panelU, open, dt, motion.reduced ? 0 : PANEL_TWEEN_S);
    panelT = easePanel(panelU);
  };
  // The open panel as the pan range needs it, at openness t (null while
  // it is shut).
  const openPanelAt = (t: number): OpenPanel | null =>
    t > 0 && panelBox
      ? {
          left: panelBox.left,
          mazeRight: fitCur.x + fitRight * fitCur.scale,
          open: t,
        }
      : null;
  const openPanel = (): OpenPanel | null => openPanelAt(panelT);
  // The fit camera's zoom range and pan range (ui/view_clamp.ts).
  const clampView = (): void => {
    clampFitView(
      view,
      app.screen.width,
      app.screen.height,
      MAX_ZOOM,
      openPanel(),
      panAllow
    );
  };
  // One frame of the range: the ease back into it (rate 0: hold where it
  // is), measured at last frame's openness, then the clamp at this one's,
  // so a view at the limit rides the tweened edge (stepRange).
  const easeView = (rate?: number): void => {
    stepRange(
      view,
      app.screen.width,
      app.screen.height,
      MAX_ZOOM,
      openPanelAt(panelTPrev),
      openPanel(),
      panAllow,
      rate
    );
  };
  const applyView = (): void => {
    root.scale.set(fitCur.scale * view.zoom);
    root.position.set(
      fitCur.x * view.zoom + view.panX,
      fitCur.y * view.zoom + view.panY
    );
  };
  const applyCam = (): void => {
    root.scale.set(cam.s);
    root.position.set(
      app.screen.width / 2 - cam.cx * cam.s,
      app.screen.height / 2 - cam.cy * cam.s
    );
  };
  // Follow framing: FOLLOW_SPAN lattice units across the short screen
  // side - or under fog, the visible disc plus a margin. The thread reveal
  // keeps FOLLOW_SPAN (K76 section 2.7).
  const followScale = (): number => {
    const span = params.exploration === "fog"
      ? 2 * (params.fowRadius + 1.2)
      : FOLLOW_SPAN;
    return Math.min(app.screen.width, app.screen.height) / span;
  };
  const placeWorldAt = (
    wx: number,
    wy: number,
    sx: number,
    sy: number,
    s: number,
    free = false
  ): void => {
    const lo = camFollow
      ? Math.min(fitTarget.scale, followScale()) * 0.85
      : fitCur.scale;
    const hi = camFollow ? followScale() * 4 : fitCur.scale * MAX_ZOOM;
    // K488: a free placement (a peek tween's step) takes the scale as
    // asked, inside wide sane bounds, so it can zoom out past the fit
    // frame to frame the exit.
    const sc = free
      ? Math.min(2000, Math.max(0.5, s))
      : Math.min(hi, Math.max(lo, s));
    const px = sx - wx * sc;
    const py = sy - wy * sc;
    flags.push(Flag.CAMERA); // K6-1: a gesture or a tween's step moved the view.
    if (camFollow) {
      cam.s = sc;
      cam.cx = (app.screen.width / 2 - px) / sc;
      cam.cy = (app.screen.height / 2 - py) / sc;
      cam.vl = 0;
      cam.vx = 0;
      cam.vy = 0;
      applyCam();
    } else {
      view.zoom = sc / fitCur.scale;
      view.panX = px - fitCur.x * view.zoom;
      view.panY = py - fitCur.y * view.zoom;
      if (!free) clampView();
      applyView();
    }
  };
  // Zoom by `factor` about screen point (sx, sy).
  const zoomAt = (sx: number, sy: number, factor: number): void => {
    const s = root.scale.x;
    placeWorldAt(
      (sx - root.position.x) / s,
      (sy - root.position.y) / s,
      sx,
      sy,
      s * factor
    );
    touchCamera();
  };
  const panBy = (dx: number, dy: number): void => {
    const s = root.scale.x;
    placeWorldAt(-root.position.x / s, -root.position.y / s, dx, dy, s);
    touchCamera();
  };
  // Double-click / double-tap on empty space: back to the home framing.
  const resetCamera = (): void => {
    flags.push(Flag.CAMERA); // K6-1
    camTween = null;
    if (camFollow) camTouchedAt = -1e9; // Full-strength pull at once.
    else viewHoming = true;
  };
  // One frame of camTween (it owns the camera while it runs).
  const stepCamTween = (dt: number): void => {
    const tw = camTween;
    if (!tw) return;
    tw.t += dt;
    const u = tw.dur > 0 ? Math.min(1, tw.t / tw.dur) : 1;
    const e = u * u * (3 - 2 * u);
    const s = Math.exp(Math.log(tw.s0) + (Math.log(tw.s1) - Math.log(tw.s0)) * e);
    placeWorldAt(
      tw.x0 + (tw.x1 - tw.x0) * e,
      tw.y0 + (tw.y1 - tw.y0) * e,
      app.screen.width / 2,
      app.screen.height / 2,
      s,
      tw.free ?? false
    );
    viewHoming = false;
    if (u < 1) {
      // The follow spring stays off through the move.
      camTouchedAt = nowSec();
      return;
    }
    if (tw.back) {
      // K488: hold the framing for `hold` seconds, then ease back to
      // the pre-tap one (the place above re-places the target each
      // frame, so the hold tracks the fit's drift).
      if (tw.holdLeft === undefined) tw.holdLeft = tw.hold;
      tw.holdLeft -= dt;
      camTouchedAt = nowSec();
      if (tw.holdLeft > 0) return;
      const b = tw.back;
      const sNow = root.scale.x;
      camTween = {
        t: 0,
        dur: b.dur,
        s0: sNow,
        x0: (app.screen.width / 2 - root.position.x) / sNow,
        y0: (app.screen.height / 2 - root.position.y) / sNow,
        s1: b.s,
        x1: b.x,
        y1: b.y,
        hold: 0,
        free: tw.free,
        back: null,
      };
      return;
    }
    // The follow spring stays off for the hold once the move ends.
    camTouchedAt = nowSec() + tw.hold;
    camTween = null;
  };
  // Mode switches hand over the CURRENT framing (no jump); each mode then
  // eases to its own target.
  const setCamFollow = (on: boolean): void => {
    if (on === camFollow) return;
    if (on) {
      cam.s = root.scale.x;
      cam.cx = (app.screen.width / 2 - root.position.x) / cam.s;
      cam.cy = (app.screen.height / 2 - root.position.y) / cam.s;
      cam.vl = 0;
      cam.vx = 0;
      cam.vy = 0;
      camTouchedAt = nowSec() - FOLLOW_DELAY;
    } else {
      fitCur.scale = root.scale.x;
      fitCur.x = root.position.x;
      fitCur.y = root.position.y;
      view.zoom = 1;
      view.panX = 0;
      view.panY = 0;
    }
    camFollow = on;
  };

  // The appearance intro is playing (the follow camera frames the knot).
  const introPlaying = (): boolean => scene.reveal !== null && !scene.reveal.done;

  // Per-frame camera step, in EVERY ticker branch (fog reveals grow and
  // the head travels while the physics sleeps).
  let fitFrames = 0;
  const updateCamera = (dt: number): void => {
    stepPanel(dt);
    if (fitFrames++ % 3 === 0) computeFitTarget();
    fitCur.scale += (fitTarget.scale - fitCur.scale) * 0.08;
    fitCur.x += (fitTarget.x - fitCur.x) * 0.08;
    fitCur.y += (fitTarget.y - fitCur.y) * 0.08;
    // K6-2 (pulled from K6-3's list): snap the ease's last remainder, at
    // converged()'s own thresholds. The 0.08 ease never lands, and once
    // the frame loop gates updateCamera on CAMERA the creep would freeze
    // up to CONVERGED_PX short of the target - a resting frame a
    // sub-pixel off master's. Snapped, both land on the target exactly.
    if (
      Math.abs(fitTarget.x - fitCur.x) * view.zoom < CONVERGED_PX &&
      Math.abs(fitTarget.y - fitCur.y) * view.zoom < CONVERGED_PX &&
      (Math.abs(fitTarget.scale - fitCur.scale) / fitCur.scale) * leverPx() <
      CONVERGED_PX
    ) {
      fitCur.scale = fitTarget.scale;
      fitCur.x = fitTarget.x;
      fitCur.y = fitTarget.y;
    }
    setCamFollow(
      params.cameraMode === "follow" && params.mazeFabric && scene.fabric !== null
    );
    // K198: a view the range left behind (the panel closed, a resize, the
    // fit drifting) eases back in, every frame, whatever else runs.
    if (!camFollow) easeView();
    if (camTween) {
      stepCamTween(dt);
      return;
    }
    if (!camFollow) {
      if (viewHoming) {
        view.zoom += (1 - view.zoom) * 0.15;
        view.panX -= view.panX * 0.15;
        view.panY -= view.panY * 0.15;
        // K149: zoom 1 can have a pan range (the panel open, K198), so the
        // pan must settle too (else a reset from a panned zoom-1 view snaps
        // on frame one).
        if (
          Math.abs(view.zoom - 1) < 1e-3 &&
          Math.abs(view.panX) < 0.5 &&
          Math.abs(view.panY) < 0.5
        ) {
          view.zoom = 1;
          view.panX = 0;
          view.panY = 0;
          viewHoming = false;
        }
        clampView();
      }
      applyView();
      return;
    }
    // Target: the head - or the whole knot while the intro plays.
    let ts = fitTarget.scale;
    let tx = (app.screen.width / 2 - fitTarget.x) / ts;
    let ty = (app.screen.height / 2 - fitTarget.y) / ts;
    const intro = introPlaying();
    if (!intro && scene.fabric && scene.fabric.headPosition(headScratch)) {
      ts = followScale();
      tx = headScratch[0];
      ty = headScratch[1];
    }
    const idle = nowSec() - camTouchedAt;
    const r = Math.max(0, Math.min(1, (idle - FOLLOW_DELAY) / FOLLOW_RAMP));
    const ease = r * r * (3 - 2 * r);
    if (ease > 0) {
      const w = FOLLOW_W * ease;
      const n = Math.max(1, Math.ceil(dt / CAM_STEP));
      const h = dt / n;
      // Critically damped spring per axis (zoom in log space).
      const step = (
        x: number,
        v: number,
        target: number
      ): [number, number] => {
        const v2 = v + (w * w * (target - x) - 2 * w * v) * h;
        return [x + v2 * h, v2];
      };
      let ls = Math.log(cam.s);
      const lts = Math.log(ts);
      for (let i = 0; i < n; i++) {
        [ls, cam.vl] = step(ls, cam.vl, lts);
        [cam.cx, cam.vx] = step(cam.cx, cam.vx, tx);
        [cam.cy, cam.vy] = step(cam.cy, cam.vy, ty);
      }
      cam.s = Math.exp(ls);
    }
    applyCam();
  };

  // K6-1, the frame loop's CAMERA poll: has the camera stopped? False while
  // updateCamera would still move the root by CONVERGED_PX or more (a
  // scale in screen px), next frame or over the fit's ease: a tween,
  // the reset's homing, the
  // panel's tween (or a panel that changed since the last frame), the pan
  // range's ease, the fit's ease toward a FRESH target (computed here, not
  // the every-third-frame one), or the follow spring off its target or
  // still moving. A follow camera held off by a recent gesture is not
  // converged while it is off its target: the spring will move it later.
  const leverPx = (): number => {
    const w = app.screen.width;
    const h = app.screen.height;
    const ox = root.position.x;
    const oy = root.position.y;
    return Math.max(
      1,
      Math.hypot(ox, oy),
      Math.hypot(w - ox, oy),
      Math.hypot(ox, h - oy),
      Math.hypot(w - ox, h - oy)
    );
  };
  const fitScratch = { scale: 1, x: 0, y: 0 };
  const followScratch = new Float64Array(2);
  const converged = (): boolean => {
    if (camTween || viewHoming) return false;
    if (panelT !== panelTPrev || (panelU > 0 && panelU < 1)) return false;
    if (readPanel() !== panelU > 0) return false;
    if (!scene.ps) return true;
    computeFitTarget(fitScratch);
    if (!camFollow) {
      if (panAllow.loX || panAllow.hiX || panAllow.loY || panAllow.hiY) return false;
      // The fit's ease never lands (8% of the rest a frame): test what is
      // LEFT of it, not the next step. A step test let the last 0.125 px
      // creep out unflagged, 100-250 px of the frame changing on a few
      // frames after the camera "stopped" (the shadow report's UNDER at fw=0).
      const z = view.zoom;
      return (
        Math.abs(fitScratch.x - fitCur.x) * z < CONVERGED_PX &&
        Math.abs(fitScratch.y - fitCur.y) * z < CONVERGED_PX &&
        (Math.abs(fitScratch.scale - fitCur.scale) / fitCur.scale) * leverPx() <
        CONVERGED_PX
      );
    }
    let ts = fitScratch.scale;
    let tx = (app.screen.width / 2 - fitScratch.x) / ts;
    let ty = (app.screen.height / 2 - fitScratch.y) / ts;
    if (!introPlaying() && scene.fabric && scene.fabric.headPosition(followScratch)) {
      ts = followScale();
      tx = followScratch[0];
      ty = followScratch[1];
    }
    const s = cam.s;
    return (
      Math.abs(Math.log(s) - Math.log(ts)) * leverPx() < CONVERGED_PX &&
      Math.abs(cam.cx - tx) * s < CONVERGED_PX &&
      Math.abs(cam.cy - ty) * s < CONVERGED_PX &&
      (Math.abs(cam.vl) / 60) * leverPx() < CONVERGED_PX &&
      (Math.abs(cam.vx) * s) / 60 < CONVERGED_PX &&
      (Math.abs(cam.vy) * s) / 60 < CONVERGED_PX
    );
  };

  function fitToScreen(): void {
    computeFitTarget();
    fitCur.scale = fitTarget.scale;
    fitCur.x = fitTarget.x;
    fitCur.y = fitTarget.y;
    // K198: a resize can leave the view out of range: hold it here, and
    // let the next frames ease it in (never a snap).
    easeView(0);
    if (camFollow) applyCam();
    else applyView();
  }

  return {
    // Mutated in place, or called: main.ts destructures these.
    fitCur,
    view,
    headScratch,
    nowSec,
    touchCamera,
    panAllow,
    openPanel,
    followScale,
    placeWorldAt,
    zoomAt,
    panBy,
    resetCamera,
    setCamFollow,
    introPlaying,
    updateCamera,
    fitToScreen,
    converged,
    // The `let`s other regions read (the indicators, returnToHead, the
    // probe hooks): getters, so each read is the current value.
    get fitRight() {
      return fitRight;
    },
    get camFollow() {
      return camFollow;
    },
    get panelT() {
      return panelT;
    },
    get panelBox() {
      return panelBox;
    },
    // The `let`s other regions also write (rebuild, the panel's wrapper,
    // startCamTween, returnToHead): get/set pairs.
    get camTouchedAt() {
      return camTouchedAt;
    },
    set camTouchedAt(v) {
      camTouchedAt = v;
    },
    get viewHoming() {
      return viewHoming;
    },
    set viewHoming(v) {
      viewHoming = v;
    },
    get camTween() {
      return camTween;
    },
    set camTween(v) {
      if (v !== null) flags.push(Flag.CAMERA); // K6-1: a tween starts.
      camTween = v;
    },
    get panelWrap() {
      return panelWrap;
    },
    set panelWrap(v) {
      panelWrap = v;
    },
  };
}
