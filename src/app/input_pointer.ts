import type { Application, Container } from "pixi.js";
import type { KnotSynth } from "../audio/knot_synth";
import type { PhysicsHost } from "../physics/physics_host";
import type { PluckRipple } from "../render/pluck_model";
import type { PluckRipples } from "../render/pluck_ripple";
import type { MotionSetting } from "../ui/motion";
import type { PanelSettings } from "../ui/tweakpane_panel";
import type { UrlParams } from "../ui/url_state";
import { resolveTelegraphHover } from "../game/mino_feedback";
import type { SceneRef } from "./scene_ref";

// K5 M6 (docs/design/K5_K6_split.md, 2.2): pointer input, moved out of
// main() as it was: the picking helpers (toLattice, pickRadius, onThread,
// grabAt, grabRadius), the bounded tug and snap-back, the render-only tap
// pluck, the ripple and tug helpers the auto audio and the probe hooks
// share, and the canvas gestures (wheel, double-click, pointer down /
// move / up, pinch). main.ts calls createPointerInput once, where the
// picking helpers were, and destructures what the session and the frame
// loop call under their old names. The session functions declared later
// in main.ts (handleFabricTap, the wait zone) and the frame loop's wake
// come in as closures on `deps`, read at call time; the drag state
// (dragPos, grabOrigin, snapMode) is the returned object's, read by the
// frame loop through it: never destructure snapMode, or the copy goes
// stale.

// RENDER-ONLY PLUCK input (see render/pluck_overlay.ts): a press that
// stays within the slop (CSS px, per pointer type) until release is a TAP
// - it plucks, touching no physics; moving past it commits a tug (or, with
// physics off, a camera pan). Taps sound at TAP_STRENGTH.
const TAP_SLOP_PX: Record<string, number> = { mouse: 4, pen: 6, touch: 10 };
const TAP_STRENGTH = 0.55;
// K370: whether a committed drag posts on pointerrawupdate (the raw-input
// lever) when window.__knotRawDrag is unset, and the least time between two
// raw posts (a 1000 Hz mouse would otherwise post a target, and the worker
// pack a snapshot, every millisecond; the worker applies input only between
// substeps of about 10 ms).
const RAW_DRAG_DEFAULT = true;
const RAW_MIN_MS = 4;

// What pointer input reads from main(): values and functions, each
// assigned once, plus closures over what main.ts declares after this
// point (the session's tap handler and wait zone, the frame loop's wake).
export interface PointerInputDeps {
  app: Application;
  root: Container;
  params: UrlParams;
  settings: PanelSettings;
  motion: MotionSetting;
  synth: KnotSynth;
  host: PhysicsHost;
  ripples: PluckRipples;
  freqForCtrl: (chain: number, ctrl: number) => number;
  pluckUnit: (
    chain: number,
    ctrl: number
  ) => { spanCtrl: [number, number] | null; reach: number };
  physicsLive: () => boolean;
  wake: () => void;
  isLoading: () => boolean;
  placeWorldAt: (
    wx: number,
    wy: number,
    sx: number,
    sy: number,
    s: number,
    free?: boolean
  ) => void;
  touchCamera: () => void;
  zoomAt: (sx: number, sy: number, factor: number) => void;
  panBy: (dx: number, dy: number) => void;
  resetCamera: () => void;
  nowSec: () => number;
  handleFabricTap: (x: number, y: number, pt: string) => boolean;
  inWaitZone: (x: number, y: number) => boolean;
  setWaitCue: (on: boolean) => void;
  tapReach: () => number;
  // K114: the scissors are armed: every tap goes to handleFabricTap (it
  // cuts, or disarms on empty space), and the hover glows the run a click
  // would cut (FabricMazeRenderer.cutAt) under a crosshair.
  cutArmed?: () => boolean;
  // K114 WALKER: a tap on any live run cuts (no scissors to arm). A touch
  // press on one is a pending tap, as a choice's is, and the hover glows
  // the run a click would cut under a crosshair; elsewhere a press pans.
  cutPick?: () => boolean;
  // K138 s2: a pluck sounded on a thread at a chain ctrl (a tap's, or a
  // drag's release on pointerup): main shows the hidden runs it finds.
  onPluck?: (chain: number, ctrl: number) => void;
}

// K331: the pick radius from a thread's centerline (world) for a pointer
// type, pure so the zoom test can call the production code. Half the drawn
// width plus the pointer's own margin in CSS px past the ribbon's edge
// (pickMargin for mouse/pen, touchPickMargin for touch), times
// pickChoiceRatio on a choice. Screen px, because aim error is in screen
// px: the zone past the edge is the same number of px at every zoom.
// fabric.runDistance is not a pick and does not read this.
export function pickRadiusFor(
  p: Pick<UrlParams, "threadWidth" | "pickMargin" | "touchPickMargin" | "pickChoiceRatio">,
  scale: number,
  pt: string,
  choice = false
): number {
  const margin = pt === "touch" ? p.touchPickMargin : p.pickMargin;
  const px = margin * (choice ? p.pickChoiceRatio : 1);
  return 0.5 * p.threadWidth + px / Math.max(1e-6, scale);
}

export function createPointerInput(deps: PointerInputDeps, scene: SceneRef) {
  const {
    app,
    root,
    params,
    settings,
    motion,
    synth,
    host,
    ripples,
    freqForCtrl,
    pluckUnit,
    physicsLive,
    wake,
    isLoading,
    placeWorldAt,
    touchCamera,
    zoomAt,
    panBy,
    resetCamera,
    nowSec,
    handleFabricTap,
    inWaitZone,
    setWaitCue,
    tapReach,
  } = deps;
  // Pointer tug: grab the nearest thread particle, drag it (springs carry
  // the tug through the knot), and pluck the strand on release.
  const toLattice = (e: PointerEvent): [number, number] => [
    (e.clientX - root.position.x) / root.scale.x,
    (e.clientY - root.position.y) / root.scale.y,
  ];
  const GRAB_RADIUS = 0.7;
  // K298/K331, PICK MARGINS (Levi: "reduce the amount of mouse margin we
  // allow for clicking/hovering over a thread ... And add a slider"; K331:
  // touch takes the same form with its own margin). The pick radius from a
  // thread's centerline (world) for a pointer type (pickRadiusFor): half
  // the drawn width plus the pointer's margin in CSS px past the ribbon's
  // edge (pickMargin mouse/pen, touchPickMargin touch), and a CHOICE
  // (edgeAt: a run from the current junction) pickChoiceRatio times that
  // margin. Screen px, because aim error is in screen px; a world margin
  // balloons when zoomed in (touch's old world radii did exactly that).
  // Hover, click, the thread cursor and the tug's grab all read these, so
  // the cursor never promises a grab that the click then misses.
  const pickRadius = (pt: string, choice = false): number =>
    pickRadiusFor(params, root.scale.x, pt, choice);
  // Is a thread within the pointer's pick radius? A particle, or the
  // rendered ribbon between particles: particles sit up to ~0.64 world
  // apart, so at a tight mouse margin a point on the ribbon's edge can be
  // ~0.4 world from both of its particles.
  // K76 stage 2c: under the thread reveal only pickThread asks (it skips
  // hidden thread; a particle knows nothing of the reveal).
  const onThread = (x: number, y: number, pt: string): boolean => {
    const r = pickRadius(pt);
    return (
      (!scene.renderer?.exploreOn && !!scene.ps && scene.ps.nearest(x, y, r) >= 0) ||
      !!scene.renderer?.pickThread(x, y, r)
    );
  };
  // The particle a press grabs: the nearest one, or under the thread reveal
  // the particle at the shown thread point pickThread finds (a particle's
  // ctrl is its index in its chain), so a tug never grabs hidden thread.
  const grabAt = (x: number, y: number, pt: string): number => {
    if (!scene.ps) return -1;
    const r = grabRadius(pt);
    if (!scene.renderer?.exploreOn) return scene.ps.nearest(x, y, r);
    const hit = scene.renderer.pickThread(x, y, r);
    if (!hit) return -1;
    const arr = scene.ps.chains[hit.chain];
    if (!arr || arr.length === 0) return -1;
    const closed = scene.ps.chainBreakAfter[hit.chain] < 0;
    const k = Math.round(hit.ctrl);
    return arr[closed ? ((k % arr.length) + arr.length) % arr.length : Math.max(0, Math.min(arr.length - 1, k))];
  };
  // The tug's grab radius: wide enough that a press onThread accepted
  // always finds a particle (the press may sit on the ribbon between two
  // of them). K331: touch needs the widening too - its pick radius is the
  // pixel form now, not the old 0.7 world.
  const grabRadius = (pt: string): number => {
    const r = pickRadius(pt);
    return Math.sqrt(r * r + GRAB_RADIUS * GRAB_RADIUS);
  };

  // Stage 19 - bounded tug + snap-back, pointer-layer only (the physics
  // grab machinery is untouched, so knot-mode byte identity holds). The
  // drag target is rubber-banded around the grab ORIGIN (the grabbed
  // particle's position at grab time): eff = L * tanh(r / L) with
  // L = tugLimit thread widths, so the first stretch tracks the cursor
  // ~1:1 and the thread asymptotes at the limit - pulling further reads
  // as mounting resistance. On release the target eases home
  // (exponential at snapBack 1/s) before the grab frees; the pluck voice
  // fires at POINTERUP from the tracked drag speed, since by actual
  // release time the eased thread is nearly still.
  // A STRING-style release (pluckStyle string, the default) frees the
  // physics at once - the knot's natural snap-back propagates as with any
  // drag - and adds the RENDER-ONLY vibration (render/pluck_overlay.ts) on
  // the released unit. Taps and auto plucks are that vibration alone:
  // they never grab, drag or wake the physics.
  const grabOrigin = new Float64Array(2);
  const dragPos = new Float64Array(2);
  let dragVel = 0;
  let lastMoveT = 0;
  let snapMode: "none" | "soft" = "none";

  // The drag target for a pointer at (x, y): L tanh(r / L) from the grab.
  const boundTarget = (x: number, y: number, out: Float64Array): void => {
    const L = Math.max(0.1, params.tugLimit * params.threadWidth);
    const dx = x - grabOrigin[0];
    const dy = y - grabOrigin[1];
    const r = Math.hypot(dx, dy);
    const s = r > 1e-9 ? (L * Math.tanh(r / L)) / r : 0;
    out[0] = grabOrigin[0] + dx * s;
    out[1] = grabOrigin[1] + dy * s;
  };
  // K370: the raw-input lever's newest post (NaN once pointermove has run
  // after it) and its time. pointermove skips posting a target the raw
  // handler already posted, so a step costs the worker one input as before.
  const rawPosted = new Float64Array([NaN, NaN]);
  let rawPostedAt = -Infinity;
  const boundedDragTo = (x: number, y: number): void => {
    if (!scene.ps) return;
    boundTarget(x, y, dragPos);
    const posted = dragPos[0] === rawPosted[0] && dragPos[1] === rawPosted[1];
    rawPosted[0] = NaN;
    rawPosted[1] = NaN;
    if (!posted) host.dragTo(dragPos[0], dragPos[1]);
  };

  // End any release animation immediately (new grab, regenerate): free
  // the grab with no sound - the pluck already played.
  const cancelSnap = (): void => {
    if (snapMode === "none") return;
    snapMode = "none";
    host.release();
  };

  // K279 RIPPLE: a pluck's ring at the plucked point (render/pluck_ripple.ts;
  // pluckRipple's look, at rippleStrength for taps and releases and
  // rippleAuto for auto plucks). None under Reduced motion.
  const startRipple = (
    chain: number,
    at: { ctrl?: number; arc?: number },
    strength: number,
    delay = 0,
    look: PluckRipple = params.pluckRipple
  ): void => {
    if (!scene.renderer || look === "off" || !(strength > 0)) return;
    ripples.look = look;
    ripples.reducedMotion = motion.reduced;
    const pt = scene.renderer.pluckPoint(chain, at);
    if (pt) ripples.add(pt.x, pt.y, strength, delay);
  };
  // K279 TUG: a tap's small physical kick (pluckTug, peak in thread widths;
  // auto plucks only with tugAuto). The tapped stretch between its nodes
  // (renderer.tugSpan: crossings, joints, markers, ends; at most
  // TUG_MAX_CTRL each way) moves toward
  // `side` by a sine bump, starting at rest; the springs bring it home and
  // the knot sleeps again. Live physics only, never under Reduced motion;
  // tug 0 touches no physics at all (a tap stays render-only).
  const TUG_MAX_CTRL = 6;
  const tugAt = (
    chain: number,
    at: { ctrl?: number; arc?: number },
    side: number,
    amount: number
  ): void => {
    if (!scene.ps || !scene.renderer || !(amount > 0) || !physicsLive() || motion.reduced) {
      return;
    }
    const span = scene.renderer.tugSpan(chain, at, TUG_MAX_CTRL);
    if (!span) return;
    const amp = Math.min(1, amount) * params.threadWidth;
    // The host wakes the physics for a tug that moved anything; wake()
    // here also asks for the render pass (a paused scene).
    if (host.tug(chain, span.c0, span.c1, span.tap, side, amp) > 0) wake();
  };

  // Release the current drag. string: free the physics now and set the
  // released unit vibrating (amplitude from the release offset, swinging
  // from the side it was pulled toward); soft: ease home (snapBack).
  // K244 (Levi, 2026-10-20: "Players shouldn't be able to pluck junction
  // cores."): `pluckable` false (the release sits in a core, where a pluck
  // would draw nothing) plucks nothing: no vibration or ripple here, and
  // endDrag played no note. The drag still ends and the thread still
  // eases home or springs free, as the physics always did.
  const beginRelease = (
    style: "soft" | "string",
    freq: number,
    pluckable = true
  ): void => {
    if (style === "string" && scene.ps && scene.renderer && scene.ps.grabbedParticle >= 0) {
      const p = scene.ps.grabbedParticle;
      const chain = scene.ps.chainOfParticle(p);
      if (chain >= 0 && pluckable) {
        const arr = scene.ps.chains[chain];
        const slot = arr.indexOf(p);
        const dx = dragPos[0] - grabOrigin[0];
        const dy = dragPos[1] - grabOrigin[1];
        const off = Math.hypot(dx, dy);
        // Pulled side, against the thread's local normal (-ty, tx).
        const len = arr.length;
        const a = arr[Math.max(0, slot - 1)];
        const b = arr[Math.min(len - 1, slot + 1)];
        const tx = scene.ps.positions[b * 2] - scene.ps.positions[a * 2];
        const ty = scene.ps.positions[b * 2 + 1] - scene.ps.positions[a * 2 + 1];
        const side = off > 1e-6 && tx * dy - ty * dx < 0 ? -1 : 1;
        const unit = pluckUnit(chain, slot);
        scene.renderer.pluck({
          chain,
          ctrl: slot,
          side,
          gain: Math.max(0.6, Math.min(1.4, off / (1.5 * params.threadWidth))),
          freq,
          reach: unit.reach,
          spanCtrl: unit.spanCtrl,
        });
        // K279: the release ripples (the drag already tugged the thread).
        startRipple(chain, { ctrl: slot }, params.rippleStrength);
      }
      snapMode = "none";
      host.release();
    } else if (style === "soft" && params.snapBack > 0) {
      snapMode = "soft";
    } else {
      snapMode = "none";
      host.release();
    }
  };

  // A TAP on a thread: the render-only pluck, sounding and vibrating on
  // RELEASE (how a real pluck works, and what tells a tap from a drag).
  // Re-picks at the press point so a knot that moved meanwhile still
  // plucks the thread that is there now.
  const tapPluck = (x: number, y: number, pt: string): void => {
    if (!scene.ps || !scene.renderer) return;
    const hit = scene.renderer.pickThread(x, y, pickRadius(pt));
    if (!hit) return;
    const freq = freqForCtrl(hit.chain, hit.ctrl);
    const unit = pluckUnit(hit.chain, hit.ctrl);
    // (renderer.pluck can return before the overlay runs: clear its verdict.)
    scene.renderer.plucks.resetSkip();
    const drawn = scene.renderer.pluck({
      chain: hit.chain,
      arc: hit.arc,
      side: hit.side,
      gain: 1,
      freq,
      reach: unit.reach,
      spanCtrl: unit.spanCtrl,
    });
    // K235 (Levi, on K194: "Do we trigger pluck sounds for this? Probably
    // shouldn't."): a tap inside a junction core draws no pluck, so it makes
    // no sound, ripple or tug. K459 (Levi: "If we make a pluck sound, then we
    // should show the pluck effect"): no other tap sounds without a drawn
    // pluck either (a chain mid-reveal, a held particle, pluckSize 0, a short
    // lobe); those keep their ripple and tug.
    if (!drawn && scene.renderer.plucks.lastSkip === "core") return;
    if (drawn && !settings.muted && params.soundMode !== "none") {
      synth.pluck(freq, TAP_STRENGTH);
    }
    deps.onPluck?.(hit.chain, hit.ctrl); // K138 s2: hidden runs.
    // K279: the tap's ripple and tug (a core tap has neither).
    startRipple(hit.chain, { arc: hit.arc }, params.rippleStrength);
    tugAt(hit.chain, { arc: hit.arc }, hit.side, params.pluckTug);
  };

  app.canvas.style.touchAction = "none";

  // GESTURES. Touch: two fingers pinch-zoom + pan; one finger tugs
  // threads and taps choices as before, and drags EMPTY space to pan.
  // Touch taps on maze choices resolve on RELEASE (desktop clicks stay on
  // press), so the first finger of a pinch can never move the player; a
  // pinch also drops any tug it interrupts without plucking, and after a
  // pinch, fingers still down do nothing until all have lifted. Desktop:
  // the wheel zooms at the cursor, a trackpad two-finger scroll pans and
  // its pinch (ctrl+wheel) zooms, dragging empty space (or any middle-
  // button drag) pans. Double-click / double-tap empty space resets.
  const touches = new Map<number, { x: number; y: number }>();
  let pinch: {
    d0: number;
    s0: number;
    wx: number;
    wy: number;
  } | null = null;
  let touchLocked = false;
  let pendingTap: {
    id: number;
    sx: number;
    sy: number;
    x: number;
    y: number;
  } | null = null;
  let dragPan: { id: number; x: number; y: number; moved: number } | null =
    null;
  // A press on a thread, undecided until it moves past the slop (a tug -
  // or a pan with physics off) or lifts (a render-only tap-pluck).
  let pendingPluck: {
    id: number;
    // The pointer type: its pick and grab radii (K298).
    pt: string;
    slop: number;
    sx: number;
    sy: number;
    x: number;
    y: number;
  } | null = null;
  let lastEmptyTap = -1e9;
  const TAP_SLOP = 10; // CSS px a tap may wander and still count.
  const pinchPair = (): [
    { x: number; y: number },
    { x: number; y: number },
  ] => {
    const it = touches.values();
    return [it.next().value!, it.next().value!];
  };
  const beginPinch = (): void => {
    if (scene.ps && scene.ps.grabbedParticle >= 0) {
      host.release();
      snapMode = "none";
    }
    pendingTap = null;
    pendingPluck = null;
    dragPan = null;
    touchLocked = true;
    clearGlow();
    const [a, b] = pinchPair();
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const s0 = root.scale.x;
    pinch = {
      d0: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
      s0,
      wx: (mx - root.position.x) / s0,
      wy: (my - root.position.y) / s0,
    };
  };
  const updatePinch = (): void => {
    if (!pinch) return;
    const [a, b] = pinchPair();
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    placeWorldAt(
      pinch.wx,
      pinch.wy,
      (a.x + b.x) / 2,
      (a.y + b.y) / 2,
      pinch.s0 * (d / pinch.d0)
    );
    touchCamera();
  };
  // Over a thread: grab where it can be tugged, a plain pointer where it
  // can only be plucked (physics off).
  const threadCursor = (): string => (physicsLive() ? "grab" : "pointer");
  // Nothing to tap or tug at this lattice point (where empty-space
  // gestures - pan, double-tap reset - may take over), for pointer `pt`.
  const emptyAt = (x: number, y: number, pt: string): boolean =>
    !!scene.ps &&
    !onThread(x, y, pt) &&
    !(
      params.mazeFabric &&
      scene.fabric &&
      scene.fabricController &&
      (scene.fabric.edgeAt(x, y, scene.fabricController, pickRadius(pt, true)) >= 0 ||
        scene.fabric.targetAt(x, y, scene.fabricController, pickRadius(pt, true), tapReach()) !== null)
    );
  // K145, the hover glow: the run under the pointer lights subtly along
  // both rims. Over a choice (eid >= 0, edgeAt's pick) it lights that run
  // too, centered where the pointer projects onto it (K298, Levi: "render
  // it in-addition to the adjacent-to-current-juction highlight"); else
  // the thread under the pointer. A touch press shows it until the
  // finger lifts or the press becomes a tug or a pan. Returns true when
  // the paint declaration needs a refresh. `pt`: the pointer type, whose
  // pick radius finds the thread (K298).
  const setGlowAt = (
    x: number,
    y: number,
    eid: number,
    pt: string
  ): boolean => {
    if (!params.mazeFabric || !scene.fabric) return false;
    if (eid >= 0) return scene.fabric.setGlowRun(eid, x, y);
    const hit = scene.renderer?.pickThread(x, y, pickRadius(pt));
    return scene.fabric.setGlow(hit ? hit.chain : -1, hit ? hit.ctrl : 0);
  };
  const clearGlow = (): void => {
    // K481 stage 3: a lifted or leaving pointer lights no tick.
    if (scene.fabric && scene.fabricController && (scene.fabric.setGlow(-1, 0) || scene.fabric.setHoverRoute(null) || scene.fabric.setTelegraphHover(null))) {
      scene.fabric.update(scene.fabricController);
    }
  };

  app.canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const unit =
        e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? app.screen.height : 1;
      // A mouse wheel ticks in big integer steps with no deltaX (or in
      // lines); a trackpad pinch arrives as ctrl+wheel; anything else is
      // a two-finger trackpad scroll, which PANS like a laptop map.
      const mouseWheel =
        e.deltaMode !== 0 ||
        (e.deltaX === 0 &&
          Number.isInteger(e.deltaY) &&
          Math.abs(e.deltaY) >= 40);
      if (e.ctrlKey || mouseWheel) {
        const k = e.ctrlKey ? 0.01 : 0.0015;
        zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * unit * k));
      } else {
        panBy(-e.deltaX * unit, -e.deltaY * unit);
      }
    },
    { passive: false }
  );
  app.canvas.addEventListener("dblclick", (e) => {
    const [x, y] = toLattice(e as unknown as PointerEvent);
    // (dblclick is a MouseEvent: no pointerType, the mouse's radii.)
    if (emptyAt(x, y, (e as Partial<PointerEvent>).pointerType || "mouse")) {
      resetCamera();
    }
  });

  app.canvas.addEventListener("pointerdown", (e) => {
    if (!scene.ps) return;
    if (e.pointerType === "touch") {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size >= 2) {
        if (!pinch) beginPinch();
        return;
      }
      if (touchLocked) return;
    }
    // Middle-button drag pans from anywhere.
    if (e.pointerType === "mouse" && e.button === 1) {
      e.preventDefault();
      clearGlow();
      dragPan = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 };
      app.canvas.setPointerCapture(e.pointerId);
      app.canvas.style.cursor = "grabbing";
      return;
    }
    // No wake() here: a press decides nothing yet. Taps never touch the
    // physics; a committed drag wakes it (pointermove); maze moves and
    // the inspector wake for themselves.
    const [x, y] = toLattice(e);
    // Alt+click: dump the nearest crossing's render state to the console
    // (diagnostic; makes broken-crossing reports exactly reproducible).
    if (e.altKey) {
      scene.renderer?.requestInspect(x, y);
      wake();
      return;
    }
    // While the hidden settle runs there is nothing on screen to touch.
    if (isLoading()) return;
    if (params.mazeFabric) {
      if (e.pointerType === "touch") {
        if (
          scene.fabric &&
          scene.fabricController &&
          ((deps.cutArmed?.() ?? false) ||
            ((deps.cutPick?.() ?? false) &&
              scene.fabric.cutAt(x, y, scene.fabricController, pickRadius("touch", true)) >= 0) ||
            scene.fabric.edgeAt(x, y, scene.fabricController, pickRadius("touch", true)) >= 0 ||
            scene.fabric.targetAt(x, y, scene.fabricController, pickRadius("touch", true), tapReach()) !== null ||
            inWaitZone(x, y)) // K80 turns 3a: a tap on the head waits.
        ) {
          // K481 stage 3: pressing a choice lights its telegraph tick
          // while the finger is down (the phone's press for its hover).
          const pressTarget = inWaitZone(x, y)
            ? null
            : scene.fabric.targetAt(x, y, scene.fabricController, pickRadius("touch", true), tapReach());
          const pressEid =
            pressTarget?.eid ?? scene.fabric.edgeAt(x, y, scene.fabricController, pickRadius("touch", true));
          scene.fabric.setTelegraphHover(
            resolveTelegraphHover(pressEid, pressTarget?.route ?? null, inWaitZone(x, y))
          );
          // K330: the press lights the choice's hover glow at once, the
          // glow run the mouse's hover would set (setGlowAt with this eid).
          // A wait-zone press is no choice, and the cut paths keep their
          // own press behavior. Release, cancel and a move off the choice
          // clear it (endDrag, beginPinch and the slop conversion below).
          if (
            pressEid >= 0 &&
            !inWaitZone(x, y) &&
            !(deps.cutArmed?.() ?? false) &&
            !(deps.cutPick?.() ?? false) &&
            scene.fabric.setGlowRun(pressEid, x, y)
          ) {
            scene.fabric.update(scene.fabricController);
          }
          pendingTap = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x, y };
          return;
        }
      } else if (handleFabricTap(x, y, e.pointerType)) {
        return;
      }
    }
    if (onThread(x, y, e.pointerType)) {
      // A thread: undecided until it moves past the slop or lifts.
      pendingPluck = {
        id: e.pointerId,
        pt: e.pointerType,
        slop: TAP_SLOP_PX[e.pointerType] ?? TAP_SLOP,
        sx: e.clientX,
        sy: e.clientY,
        x,
        y,
      };
      app.canvas.setPointerCapture(e.pointerId);
      // The press shows the hover glow (a touch has no hover before it).
      if (setGlowAt(x, y, -1, e.pointerType) && scene.fabric && scene.fabricController) {
        scene.fabric.update(scene.fabricController);
      }
    } else {
      // Empty space: drag to pan the camera.
      dragPan = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 };
      app.canvas.setPointerCapture(e.pointerId);
    }
  });

  // A pending press moved past its slop: commit a TUG (grab at the PRESSED
  // point - the bounded target then catches up to the pointer smoothly), or
  // with physics off, a camera PAN from the press point.
  const commitPendingDrag = (e: PointerEvent): void => {
    const pp = pendingPluck;
    pendingPluck = null;
    if (!pp || !scene.ps) return;
    // A tug or a pan is not a hover: the glow goes (K145).
    clearGlow();
    if (!physicsLive()) {
      dragPan = { id: pp.id, x: pp.sx, y: pp.sy, moved: pp.slop + 1 };
      return;
    }
    cancelSnap();
    // K7: main picks on the view, the host grabs (a miss clears the grab).
    // K298: at the pointer's grab radius.
    // K76 stage 2c: never hidden thread (grabAt).
    if (host.grab(grabAt(pp.x, pp.y, pp.pt), pp.x, pp.y) < 0) {
      dragPan = { id: pp.id, x: pp.sx, y: pp.sy, moved: pp.slop + 1 };
      return;
    }
    const p = scene.ps.grabbedParticle;
    grabOrigin[0] = scene.ps.positions[p * 2];
    grabOrigin[1] = scene.ps.positions[p * 2 + 1];
    dragPos[0] = grabOrigin[0];
    dragPos[1] = grabOrigin[1];
    rawPosted[0] = NaN;
    rawPosted[1] = NaN;
    dragVel = 0;
    lastMoveT = e.timeStamp;
    app.canvas.style.cursor = "grabbing";
    wake();
  };
  // K370, the raw-input lever (`window.__knotRawDrag`; RAW_DRAG_DEFAULT
  // when unset). Chrome holds a pointermove for the next frame (rAF-
  // aligned); pointerrawupdate fires as the input arrives (secure contexts
  // only). On a committed drag it posts the bounded target at once, at most
  // every RAW_MIN_MS, so the worker steps toward it sooner. pointermove
  // still runs as before (dragPos, dragVel, wake) and posts only a target
  // the raw handler has not.
  app.canvas.addEventListener("pointerrawupdate", (ev) => {
    const flag = (globalThis as { __knotRawDrag?: boolean }).__knotRawDrag;
    if (!(typeof flag === "boolean" ? flag : RAW_DRAG_DEFAULT)) return;
    // lib.dom types pointerrawupdate as a plain Event.
    const e = ev as PointerEvent;
    if (!scene.ps || pinch || dragPan || pendingPluck) return;
    if (e.pointerType === "touch" && touchLocked) return;
    if (scene.ps.grabbedParticle < 0 || snapMode !== "none") return;
    const now = performance.now();
    if (now - rawPostedAt < RAW_MIN_MS) return;
    rawPostedAt = now;
    const [x, y] = toLattice(e);
    boundTarget(x, y, rawPosted);
    host.dragTo(rawPosted[0], rawPosted[1]);
  });
  app.canvas.addEventListener("pointermove", (e) => {
    if (!scene.ps) return;
    if (e.pointerType === "touch") {
      const t = touches.get(e.pointerId);
      if (t) {
        t.x = e.clientX;
        t.y = e.clientY;
      }
      if (pinch) {
        updatePinch();
        return;
      }
      if (
        pendingTap &&
        pendingTap.id === e.pointerId &&
        Math.hypot(e.clientX - pendingTap.sx, e.clientY - pendingTap.sy) >
          TAP_SLOP
      ) {
        // The finger is dragging, not tapping: it pans instead. K330: a
        // move off the choice takes the press's glow with it.
        clearGlow();
        dragPan = {
          id: e.pointerId,
          x: pendingTap.sx,
          y: pendingTap.sy,
          moved: TAP_SLOP + 1,
        };
        pendingTap = null;
      }
      if (touchLocked) return;
    }
    if (pendingPluck && pendingPluck.id === e.pointerId) {
      // Within the slop nothing moves: it may still be a tap.
      if (
        Math.hypot(e.clientX - pendingPluck.sx, e.clientY - pendingPluck.sy) <=
        pendingPluck.slop
      ) {
        return;
      }
      commitPendingDrag(e);
    }
    if (dragPan && dragPan.id === e.pointerId) {
      const dx = e.clientX - dragPan.x;
      const dy = e.clientY - dragPan.y;
      dragPan.x = e.clientX;
      dragPan.y = e.clientY;
      dragPan.moved += Math.abs(dx) + Math.abs(dy);
      if (dragPan.moved > TAP_SLOP) {
        panBy(dx, dy);
        app.canvas.style.cursor = "grabbing";
      }
      return;
    }
    const [x, y] = toLattice(e);
    if (scene.ps.grabbedParticle >= 0 && snapMode === "none") {
      const px = dragPos[0];
      const py = dragPos[1];
      boundedDragTo(x, y);
      const dt = Math.max(1e-3, (e.timeStamp - lastMoveT) / 1000);
      lastMoveT = e.timeStamp;
      dragVel =
        dragVel * 0.6 +
        (Math.hypot(dragPos[0] - px, dragPos[1] - py) / dt) * 0.4;
      wake();
    } else if (
      params.mazeFabric &&
      scene.fabric &&
      scene.fabricController &&
      ((deps.cutArmed?.() ?? false) || (deps.cutPick?.() ?? false))
    ) {
      // K114: armed scissors light the run a click would cut (the K145
      // glow, centered under the pointer), no choice, under a crosshair.
      // The walker's modes the same, the crosshair only over a run.
      const cut = scene.fabric.cutAt(x, y, scene.fabricController, pickRadius(e.pointerType, true));
      const glow = cut >= 0 ? scene.fabric.setGlowRun(cut, x, y) : scene.fabric.setGlow(-1, 0);
      const routeChanged = scene.fabric.setHoverRoute(null);
      if (scene.fabric.setHover(-1) || glow || routeChanged) scene.fabric.update(scene.fabricController);
      app.canvas.style.cursor = (deps.cutArmed?.() ?? false) || cut >= 0 ? "crosshair" : "default";
    } else if (params.mazeFabric && scene.fabric && scene.fabricController) {
      // Hover: light the choosable run under the pointer (the paint pass
      // animates it even while the physics sleeps - no wake needed), or
      // glow subtly along any other run under it (K145). K80 turns 3a: the
      // wait zone first, as a click there waits (handleFabricTap): a
      // pointer cursor, the head's wait cue, no choice lit and no glow.
      const zone = inWaitZone(x, y);
      setWaitCue(zone);
      // K480: past the choices, the hover lights the whole route a tap
      // would take (stage 2), the tapped run wearing the rim glow.
      const target = zone
        ? null
        : scene.fabric.targetAt(
            x,
            y,
            scene.fabricController,
            pickRadius(e.pointerType, true),
            tapReach()
          );
      const eid = zone
        ? -1
        : (scene.fabric.targetAt(
            x,
            y,
            scene.fabricController,
            pickRadius(e.pointerType, true),
            tapReach()
          )?.eid ?? -1);
      const glow = zone ? scene.fabric.setGlow(-1, 0) : setGlowAt(x, y, eid, e.pointerType);
      const routeChanged = scene.fabric.setHoverRoute(zone ? null : (target?.route ?? null));
      // K481 stage 3: the same hover lights its by-length telegraph tick
      // (the wait's in its zone, a multi-run tap's first run otherwise).
      const teleChanged = scene.fabric.setTelegraphHover(
        resolveTelegraphHover(eid, target?.route ?? null, zone)
      );
      if (scene.fabric.setHover(eid) || glow || routeChanged || teleChanged) scene.fabric.update(scene.fabricController);
      app.canvas.style.cursor =
        zone || eid >= 0
          ? "pointer"
          : onThread(x, y, e.pointerType)
            ? threadCursor()
            : "default";
    } else {
      app.canvas.style.cursor = onThread(x, y, e.pointerType)
        ? threadCursor()
        : "default";
    }
  });
  const endDrag = (e: PointerEvent): void => {
    if (!scene.ps) return;
    if (dragPan && dragPan.id === e.pointerId) {
      // A touch that never really moved on empty space is a TAP there:
      // two within 320ms reset the view (double-tap).
      if (
        e.pointerType === "touch" &&
        e.type === "pointerup" &&
        dragPan.moved <= TAP_SLOP &&
        !touchLocked
      ) {
        const t = nowSec();
        if (t - lastEmptyTap < 0.32) {
          resetCamera();
          lastEmptyTap = -1e9;
        } else {
          lastEmptyTap = t;
        }
      }
      dragPan = null;
    }
    if (e.pointerType === "touch") {
      touches.delete(e.pointerId);
      if (touches.size < 2) pinch = null;
      if (pendingTap && pendingTap.id === e.pointerId) {
        const tap = pendingTap;
        pendingTap = null;
        if (e.type === "pointerup" && !touchLocked) {
          handleFabricTap(tap.x, tap.y, "touch");
        }
      }
      // A lifted finger leaves no hover or glow behind (touch has no
      // pointer to move off the run).
      const glow = !!scene.fabric && scene.fabric.setGlow(-1, 0);
      if (scene.fabric && scene.fabricController && (scene.fabric.setHover(-1) || scene.fabric.setHoverRoute(null) || scene.fabric.setTelegraphHover(null) || glow)) {
        scene.fabric.update(scene.fabricController);
      }
      if (touches.size === 0) touchLocked = false;
    }
    if (pendingPluck && pendingPluck.id === e.pointerId) {
      // Lifted within the slop: a TAP. Cancels (pointercancel, a pinch -
      // beginPinch drops pendingPluck) never pluck.
      const pp = pendingPluck;
      pendingPluck = null;
      if (e.type === "pointerup") tapPluck(pp.x, pp.y, pp.pt);
    } else if (scene.ps.grabbedParticle >= 0 && snapMode === "none") {
      wake();
      const chain = scene.ps.chainOfParticle(scene.ps.grabbedParticle);
      const slot =
        chain >= 0 ? scene.ps.chains[chain].indexOf(scene.ps.grabbedParticle) : -1;
      const freq = chain >= 0 ? freqForCtrl(chain, slot) : 220;
      // K244: would a pluck at the release draw anything (the same verdict
      // as a tap's and an auto pluck's, PluckOverlay.siteTester)? In a
      // junction core it would not, so the release plays no note under
      // either pluck style and, in the string style, starts no vibration or
      // ripple (beginRelease). Hot, held and pluckSize 0 are not asked and
      // keep their sound, as before.
      const pluckable =
        chain >= 0 &&
        !!scene.renderer &&
        scene.renderer.plucks.siteTester()(chain, slot);
      if (!settings.muted && params.soundMode !== "none" && pluckable) {
        synth.pluck(freq, Math.max(0.35, Math.min(1, dragVel / 25)));
      }
      beginRelease(params.pluckStyle, freq, pluckable);
      if (pluckable && e.type === "pointerup") deps.onPluck?.(chain, slot); // K138 s2.
    }
    if (app.canvas.hasPointerCapture(e.pointerId)) {
      app.canvas.releasePointerCapture(e.pointerId);
    }
    app.canvas.style.cursor = "default";
  };
  app.canvas.addEventListener("pointerup", endDrag);
  app.canvas.addEventListener("pointercancel", endDrag);
  // A mouse that leaves the canvas (for the panel, say) takes the hover
  // glow with it (K145). The choice hover keeps its old behavior.
  app.canvas.addEventListener("pointerleave", (e) => {
    if (e.pointerType === "mouse" && !pendingPluck) clearGlow();
    setWaitCue(false); // K80 turns 3a.
  });


  return {
    toLattice,
    pickRadius,
    onThread,
    grabAt,
    grabRadius,
    startRipple,
    tugAt,
    cancelSnap,
    dragPos,
    grabOrigin,
    get snapMode() {
      return snapMode;
    },
    set snapMode(v: "none" | "soft") {
      snapMode = v;
    },
  };
}
