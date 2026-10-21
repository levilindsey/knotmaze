import type { Application, Container, Ticker } from "pixi.js";
import type { KnotSynth } from "../audio/knot_synth";
import type { PhysicsTuning } from "../physics/particle_system";
import type { PhysicsHost } from "../physics/physics_host";
import type { BackgroundLayer } from "../render/background";
import type { ConfettiLayer } from "../render/confetti";
import type { FabricMazeRenderer } from "../render/fabric_maze_renderer";
import { PLUCK_WHOLE_MAX } from "../render/pluck_model";
import type { PluckRipples } from "../render/pluck_ripple";
import type { ShaderWarmup } from "../render/shader_warmup";
import type { A11yFlags, A11yKey } from "../ui/accessibility";
import type { MotionSetting } from "../ui/motion";
import type { MovePad } from "../ui/move_pad";
import type { OffscreenIndicators } from "../ui/offscreen_indicators";
import type { PanelApi, PanelSettings } from "../ui/tweakpane_panel";
import type { UrlParams } from "../ui/url_state";
import { pathVizOf } from "../ui/url_state";
import { CAM_MAX_DT } from "./camera";
import type { PhysState } from "./lifecycle";
import {
  Flag,
  NEED_AMBIENT,
  NEED_EVENT,
  SCENE_ACTIVE,
  VISUAL,
  ambientOnly,
  hasWork,
  type LoopFlags,
} from "./loop_flags";
import type { SceneRef } from "./scene_ref";
import type { StampPerf } from "./stamp";

// K5 M3 (docs/design/K5_K6_split.md, 2.2): the frame loop, moved out of
// main() as it was: the ticker callback (each frame's main-thread cost and
// the reveal's), tick (the load settle or the physics step, the sleep
// gate's call, the camera, the fabric's per-frame work, flow's half rate,
// the rest frame, the stamp) and the background's tick. K6-2: the tick's
// parts and the rest/paused geometry pass run only on their loop flags
// (src/app/loop_flags.ts); the draw is still every frame (K6-3).
// main.ts calls createFrameLoop once, after createStamp (perf and
// updateStamp exist only from there), and loop.start() registers the
// ticker callback. The `let`s main.ts keeps come in as accessors on `deps`
// (getters, and get/set pairs for the ones the loop writes), so moved
// lines say `deps.<name>`. halted and the counters the probe hooks read
// are getters on the returned object (halted a get/set pair): never
// destructure those, or the copy goes stale.

// PHYSICS OFF (the `physics` param unchecked): every build settles HIDDEN
// behind the loading indicator (the host's load slices) until the sleep
// gate trips, then the simulation stops for good and the appearance
// animation plays over the frozen layout. A later visible re-settle
// (unchecking while awake, or a physics slider moved while frozen) gives
// up after SETTLE_WALL_CAP_MS.
const SETTLE_WALL_CAP_MS = 12000;

// K6-3 (= K24): ambient-only frames run the tick at this cadence (Levi's
// question 1: 30 fps), and the ticker stops after two workless frames.
const REST_CADENCE_MS = 1000 / 30;
const IDLE_POLL_MS = 250;

// What the frame loop reads from main(): values and functions, each
// assigned once, then accessors for the `let`s main.ts keeps and the
// lifecycle's (physState, settleWall0, warmHoldFrom: src/app/lifecycle.ts).
export interface FrameLoopDeps {
  app: Application;
  root: Container;
  params: UrlParams;
  host: PhysicsHost;
  motion: MotionSetting;
  a11y: A11yFlags;
  look: <K extends A11yKey>(key: K) => UrlParams[K];
  settings: PanelSettings;
  synth: KnotSynth;
  background: BackgroundLayer;
  ripples: PluckRipples;
  warmup: ShaderWarmup;
  confetti: ConfettiLayer;
  panel: PanelApi;
  indicators: OffscreenIndicators;
  movePad: MovePad;
  dragPos: Float64Array<ArrayBuffer>;
  grabOrigin: Float64Array<ArrayBuffer>;
  perf: StampPerf;
  updateStamp: () => void;
  introPlaying: () => boolean;
  updateCamera: (dt: number) => void;
  physicsTuning: () => PhysicsTuning;
  syncExploration: (f: FabricMazeRenderer) => void;
  tickChase: (dt: number) => void;
  tickTurnMino: (dt: number) => void;
  // K114 stage 2: the real-time fire (main.ts owns its clock).
  realtimeFire: () => boolean;
  tickFire: (dt: number) => void;
  fireSet: () => void;
  setWaitCue: (on: boolean) => void;
  keysLive: () => boolean;
  // K114: show the scissors while the cut is on and the keys are live.
  cutTick?: () => void;
  // K499: poll the gamepad once a frame (edges only; never wakes).
  pollGamepad: () => void;
  handRendererLook: () => void;
  loadingTick: () => void;
  presettleTick: () => void;
  warmHoldTick: () => void;
  showFabricWin: () => void;
  showFireLoss: () => void;
  keyStep: () => void;
  autoAudioTick: () => void;
  freeze: () => void;
  // K6-1 (docs/design/K6_1.md): the flag ledger, created first in main.ts
  // (question 6), and the polls over state main.ts keeps: read-only and
  // allocation-free. GAME: the chase's clock, the turn minotaur's wait, a
  // key hold or a waiting move (the loop adds the fabric's move, the
  // real-time fire and a pending banner). AUDIO: the auto sound's clock.
  // CAMERA: the camera has not converged, or an indicator's show delay runs.
  flags: LoopFlags;
  gameNeedsFrame: () => boolean;
  audioNeedsFrame: () => boolean;
  cameraNeedsFrame: () => boolean;
  // main.ts's and the lifecycle's `let`s: read only,
  readonly physState: PhysState;
  readonly settleWall0: number;
  readonly warmHoldFrom: number;
  readonly waitCueGlyph: string | null;
  readonly waitCueHead: string | null;
  // and written by the loop too.
  snapMode: "none" | "soft";
  pendingWin: boolean;
  pendingLoss: boolean;
  perfLine: string;
}

export function createFrameLoop(deps: FrameLoopDeps, scene: SceneRef) {
  const {
    app,
    root,
    params,
    host,
    motion,
    a11y,
    look,
    settings,
    synth,
    background,
    ripples,
    warmup,
    confetti,
    panel,
    indicators,
    movePad,
    dragPos,
    grabOrigin,
    perf,
    updateStamp,
    introPlaying,
    updateCamera,
    physicsTuning,
    syncExploration,
    tickChase,
    tickTurnMino,
    realtimeFire,
    tickFire,
    fireSet,
    setWaitCue,
    keysLive,
    pollGamepad,
    handRendererLook,
    loadingTick,
    presettleTick,
    warmHoldTick,
    showFabricWin,
    showFireLoss,
    keyStep,
    autoAudioTick,
    freeze,
    flags,
    gameNeedsFrame,
    audioNeedsFrame,
    cameraNeedsFrame,
  } = deps;

  // Quiescence: a motionless deterministic knot stays motionless without
  // external input, so once the sleep gate trips (its quiet run spans
  // QUIET_WINDOW simulated seconds), skip both physics and rendering
  // entirely until something wakes it. The host owns the gate and the
  // asleep flag (host.asleep, host.wake/sleep).
  let flowParity = false;
  // Non-finite watchdog: if the physics state ever explodes to NaN/Inf,
  // HALT instead of churning. NaN positions collapse the collision
  // spatial hash into a single bucket (NaN keys compare equal in Map),
  // turning each frame into an O(9*N^2) multi-second task - the page
  // hard-hangs and can't even process a dev-server reload. A halted sim
  // is debuggable; a hung tab is not. Cleared on regenerate.
  let halted = false;
  // A one-shot render pass requested where nothing else would run
  // update() (a frozen physics-off scene: width / recolor changes).
  let renderDirty = false;
  // K6-2: the change-detected per-frame param syncs (fabricTick): the
  // last values handed to the renderer's plucks and to the fabric, keyed
  // on the objects they were handed to (a rebuild replaces both).
  let pluckSync: { r: unknown; v: readonly (number | string | boolean)[] } | null = null;
  let fabricSync: { f: unknown; c: unknown; v: readonly (number | string | boolean)[] } | null = null;
  const wake = (): void => {
    host.wake();
    renderDirty = true;
    flags.push(Flag.PHYS | Flag.GEOM); // K6-1 (shadow: recorded only)
  };
  // K6-1: the frame stepped the physics without PHYS in its need (the
  // report's observer; reset at each frame's end).
  let stepUnflagged = false;
  // simSpeed [0, 10]: piecewise-linear multiplier hitting the spec's
  // pinned points exactly - 0 paused, 1 -> 0.2x, 5 -> 1x, 10 -> 5x. A
  // physics-off settle runs regardless (it must reach its freeze).
  const speedMultNow = (): number => {
    const rawMult =
      params.simSpeed <= 5
        ? params.simSpeed / 5
        : 1 + (params.simSpeed - 5) * 0.8;
    return deps.physState === "settling" && rawMult === 0 ? 1 : rawMult;
  };
  // (The sleep gate's per-frame test - physicsQuiet plus the temperature
  // rule - runs in the host: PhysicsCore.gateFrame.)

  // Main-thread cost of every ticker callback, ms (probes: __knotPerf),
  // plus running totals since load.
  const frameCost = new Float32Array(600);
  let frameCostN = 0;
  let frameCostTotal = 0;
  // K7 stage 4: the appearance reveal's own share of each callback
  // (reveal.tick), on the same ring (probes: __knotPerf, __knotReveal).
  const revealCost = new Float32Array(600);
  let revealMs = 0;
  let revealMsTotal = 0;

  // K24/K6 HOOK: is anything besides the background moving this frame?
  // The background's drift pauses once the rest of the scene has been
  // still for a while (BACKGROUND_PAUSE_GRACE), and background.needsFrame()
  // then says false - so a render-on-demand loop can stop drawing. Since
  // K6-1 the answer is sceneActive (the flags, backgroundTick below).
  // K6-2 deleted the pre-K6 sceneAnimating()/viewMoved observer that
  // K6-1 kept beside it: the flags are the only answer now.
  // K6-1: the polls (docs/design/K6_1.md, "The flags"), read at a frame's
  // end for the next one. Read-only and allocation-free: each is a test of
  // state the loop or a module already keeps.
  const readPolls = (): number => {
    let p = 0;
    const st = deps.physState;
    if (
      st === "loading" ||
      st === "settling" ||
      deps.warmHoldFrom >= 0 ||
      host.presettling ||
      !warmup.wave1Done
    ) {
      p |= Flag.LOAD;
    }
    if (!halted && st !== "frozen" && host.needsFrame() && speedMultNow() > 0) p |= Flag.PHYS;
    if (look("flowStrength") > 0) p |= Flag.FLOW;
    if (scene.reveal !== null && !scene.reveal.done) p |= Flag.REVEAL;
    const r = scene.renderer;
    const fab = params.mazeFabric ? scene.fabric : null;
    if (r !== null) {
      if (r.needsFxRender() || r.appearFxAlive() > 0) p |= Flag.FX;
      const paint = r.paintNeedsFrame() | (fab !== null ? fab.needsFrame() : 0);
      if (paint & NEED_EVENT) p |= Flag.PAINT;
      if (paint & NEED_AMBIENT) p |= Flag.PAINT_AMBIENT;
      if (r.plucks.activeCount > 0) p |= Flag.OVERLAY;
    }
    if (
      (fab !== null && fab.animating) ||
      deps.pendingWin ||
      deps.pendingLoss ||
      realtimeFire() ||
      gameNeedsFrame()
    ) {
      p |= Flag.GAME;
    }
    if (cameraNeedsFrame()) p |= Flag.CAMERA;
    if (ripples.activeCount > 0 || confetti.active) p |= Flag.OVERLAY;
    // BACKGROUND is not read here: backgroundTick reads it after the
    // background's own tick (see there).
    if (audioNeedsFrame()) p |= Flag.AUDIO;
    return p;
  };
  // The last frame's sceneActive (probes read it under its old name,
  // K6-1 question 3: sceneWasAnimating, __knotConfetti().sceneAnimating,
  // __knotA11y().animating).
  let sceneWasAnimating = false;
  const backgroundTick = (dt: number): { need: number; polls: number } => {
    background.reducedMotion = motion.reduced;
    // K6-1: sceneActive, the flags' answer: this frame's pushes or the
    // polls read now carry a visual flag other than BACKGROUND. It
    // drives the background's drift pause (K6-2 deleted the legacy
    // sceneAnimating() observer it replaced).
    let polls = readPolls();
    const active = ((flags.pushed | polls) & SCENE_ACTIVE) !== 0;
    sceneWasAnimating = active;
    // K307: no texture pass before wave 1 (pixi would link the effect cold).
    if (warmup.wave1Done) {
      background.tick(dt, active);
      // The background's poll reads its clock AFTER this frame's tick. Read
      // before it (in readPolls), it answered whether THIS frame re-renders,
      // so the flag landed a frame after each pass: the shadow report saw
      // every pass of a drift that outlives the rest of the scene as UNDER
      // and the frame after it as OVER (K6-1, the drift case's finish).
      if (background.needsFrame(dt)) polls |= Flag.BACKGROUND;
    }
    const closedNeed = flags.endFrame(polls, { active, stepUnflagged });
    stepUnflagged = false;
    return { need: closedNeed, polls };
  };

  // K6-3 (= K24): the draw/ticker half of the frame's decision (design
  // 4.8). Pixi's auto-render is removed in start(); onTick calls
  // app.render() itself only on a frame whose closed need is visual (or
  // every frame in continuous mode). Ambient-only frames run the whole
  // tick at REST_CADENCE_MS with the accumulated dt. Two workless frames
  // in a row (no visual flag, no AUDIO) stop the ticker; any push (input
  // included, via flags.onPush), a probe's continuous request, or the
  // idle poll below restarts it. Wall-clock animations are safe on a
  // stopped ticker because each polls true while it runs (K6-1's audit):
  // the camera's follow delay and tween hold hold CAMERA (converged() is
  // false off-target or mid-tween), key holds and waiting moves hold
  // GAME, the fire's FX hold PAINT, and AUDIO-only frames never count as
  // workless, so the auto sound's wall clock keeps ticking.
  let continuous = false;
  let stopped = false;
  let emptyStreak = 0;
  let cadenceAccumMs = 0;
  let idleTimer: ReturnType<typeof setInterval> | null = null;
  // K456 (docs/design/K456.md, Design): a lost WebGL context suspends the
  // loop. suspend() stops the ticker and keeps it stopped (nothing ticks,
  // steps or draws into the lost context) until resume(), which the
  // restored context calls; the first frame after a resume re-renders the
  // background's texture (a RenderTexture comes back empty from a
  // restore), runs the restore hooks and draws, whatever the flags say.
  let suspended = false;
  let restorePending = false;
  const restoreHooks: Array<() => void> = [];
  const stopTicker = (): void => {
    if (stopped) return;
    stopped = true;
    app.ticker.stop();
    // While stopped the stamp still refreshes (DOM only, no draw), and a
    // cheap poll catches what no push can: the background's next drift
    // pass coming due, a worker "tugged" clearing host.asleep, an audio
    // clock's next event. 250 ms is far below any of their periods.
    if (typeof window !== "undefined" && idleTimer === null) {
      idleTimer = setInterval(() => {
        updateStamp();
        let polls = readPolls();
        if (warmup.wave1Done && background.needsFrame(IDLE_POLL_MS / 1000)) {
          polls |= Flag.BACKGROUND;
        }
        if (hasWork(polls)) ensureRunning();
      }, IDLE_POLL_MS);
    }
  };
  const ensureRunning = (): void => {
    // K456: a suspended loop (a lost WebGL context) stays stopped until
    // resume(); pushes and the idle poll land here and wait.
    if (!stopped || suspended) return;
    stopped = false;
    emptyStreak = 0;
    cadenceAccumMs = 0;
    if (idleTimer !== null) {
      clearInterval(idleTimer);
      idleTimer = null;
    }
    app.ticker.start();
  };
  flags.onPush = ensureRunning;
  const setContinuous = (on: boolean): void => {
    continuous = on;
    flags.mode = on ? "continuous" : "ondemand";
    if (on) ensureRunning();
  };
  const suspend = (): void => {
    if (suspended) return;
    suspended = true;
    if (idleTimer !== null) {
      clearInterval(idleTimer);
      idleTimer = null;
    }
    if (!stopped) {
      stopped = true;
      app.ticker.stop();
    }
  };
  const resume = (): void => {
    if (!suspended) return;
    suspended = false;
    restorePending = true;
    // The rest/paused pass's forced update, then a push that restarts the
    // ticker (onPush = ensureRunning).
    renderDirty = true;
    flags.push(Flag.GEOM);
  };

  const onTick = (ticker: Ticker): void => {
    if (suspended) return;
    const c0 = performance.now();
    revealMs = 0;
    // K6-3: the rest cadence. An ambient-only need runs the whole tick at
    // 30 fps: off-cadence rAFs return at once (no tick, no draw, no frame
    // counted), and the tick that runs gets the accumulated dt, so every
    // dt clock (paint, fog, background drift, flow) advances as before.
    let eff = ticker;
    if (!continuous && !restorePending && ambientOnly(flags.need)) {
      cadenceAccumMs += ticker.deltaMS;
      if (cadenceAccumMs < REST_CADENCE_MS) return;
      eff = { deltaMS: cadenceAccumMs, elapsedMS: cadenceAccumMs } as Ticker;
      cadenceAccumMs = 0;
    } else {
      cadenceAccumMs = 0;
    }
    warmup.poll(); // K307: the warm-up's compiles, once a frame.
    tick(eff);
    // K307: wave 2 once the intro is over (the reveal done, or asleep).
    if (warmup.wave1Done && deps.physState !== "loading" && (host.asleep || !introPlaying())) {
      warmup.startWave2();
    }
    // K279: the pluck ripples, after the camera's step (they read its view).
    ripples.tick(eff.deltaMS / 1000);
    // K140: the confetti steps in every branch (asleep, paused, loading);
    // a single early return once nothing is in the air.
    confetti.tick(eff.deltaMS / 1000, app.screen.height, root);
    // After the scene's frame (the background's render-texture pass, when
    // due, precedes the stage render either way).
    const closed = backgroundTick(eff.deltaMS / 1000);
    // K6-3: draw only on a visual need (every frame in continuous mode);
    // the canvas keeps its last frame otherwise. Stop after two workless
    // frames so the last change is drawn before the ticker halts.
    if (restorePending) {
      // K456: the restore redraw (K578's still-maze cache would refill in
      // a restore hook: its RenderTexture comes back empty too).
      restorePending = false;
      if (warmup.wave1Done) background.renderTexture();
      for (const fn of restoreHooks) fn();
      app.render();
    } else if (continuous || (closed.need & VISUAL) !== 0) {
      app.render();
    }
    if (!continuous) {
      emptyStreak = hasWork(closed.need) || hasWork(closed.polls) ? 0 : emptyStreak + 1;
      if (emptyStreak >= 2) stopTicker();
    } else {
      emptyStreak = 0;
    }
    const c = performance.now() - c0;
    revealCost[frameCostN % revealCost.length] = revealMs;
    revealMsTotal += revealMs;
    frameCost[frameCostN++ % frameCost.length] = c;
    frameCostTotal += c;
  };

  const tick = (ticker: Ticker): void => {
    if (!scene.ps || !scene.renderer) return;
    if (halted) return;

    if (deps.physState === "loading") {
      if (deps.warmHoldFrom >= 0) warmHoldTick();
      else if (host.presettling) presettleTick();
      else loadingTick();
      if (deps.physState === "loading") deps.perfLine = " | loading";
      updateStamp();
      return;
    }

    const speedMult = speedMultNow();

    // K6-2: hand the look over FIRST (change-detecting since K6-2: it
    // pushes GEOM only when a worn value changed), so this frame's need
    // snapshot below already carries that push and a rest/paused frame
    // can run its geometry pass in this same frame. The later calls in
    // fabricTick/flowRender/awake are then no-ops.
    handRendererLook();
    // K6-2: this frame's need (the polls carried from last frame | the
    // pushes since, the look change above included). CPU work below
    // runs only on its flags; the draw is still every frame (K6-3).
    const need = flags.need;
    const inputPushed = (flags.pushed & Flag.INPUT) !== 0;

    // Stage 22: the appearance reveal advances on WALL time in every
    // branch (awake, asleep, paused). While it runs, the render pass must
    // execute even when the physics does not (see flowRender's guard);
    // once it completes, every branch returns to its exact pre-reveal
    // behavior.
    const revealing = scene.reveal !== null && !scene.reveal.done;
    if (revealing && scene.reveal) {
      scene.reveal.speed = params.appearSpeed;
      const r0 = performance.now();
      scene.reveal.tick(ticker.deltaMS / 1000);
      revealMs = performance.now() - r0;
    }
    // G2: the paint clock advances here, BEFORE any update() this frame
    // (the shader uniforms and update()'s CPU mirror read one clock).
    // K6-2: the paint clock advances only while paint, its FX, the
    // reveal or the pulses animate (at rest it has nothing to move: the
    // shader uniforms it feeds are static without those flags).
    if ((need & (Flag.REVEAL | Flag.FX | Flag.PAINT | Flag.PAINT_AMBIENT)) !== 0 || revealing) {
      scene.renderer.advanceClocks(ticker.deltaMS / 1000);
    }
    // The gameplay animations (traversal, pulse, hover) run even while
    // paused or asleep - they touch only markers and UV buffers, never
    // physics or splines.
    const fabricTick = (): void => {
      // K6-2: the auto sound's clock only on AUDIO (its poll: live,
      // random or music, not muted).
      if ((need & Flag.AUDIO) !== 0) autoAudioTick();
      // K239: handRendererLook (cuspRadius, fade, flow, pulses, glow, FX) runs
      // here too, for the readers between passes, and before every update().
      // K111: the flow holds still under Reduced motion (the intro and the
      // pulses keep playing) and the crossings cut crisp under High contrast.
      // The FX style is consumed by the appearance-FX pass inside tickPaint
      // while a reveal runs.
      handRendererLook();
      // K6-2: the per-frame param re-syncs are change-detected pushes
      // now, not assignments: the pluck look and the auto level below
      // (and the fabric's fields further down) are applied only when a
      // value actually changed (panel, URL or probe writing the live
      // params), which is also when they take effect - the next pluck,
      // the next move - so no frame at rest pays for them.
      // Render-only pluck look (live; a hand-edited link cannot leave the
      // panel's ranges - pluckSize's slider has reached 3 since K25, and a
      // clamp left at 2 made its top third do nothing).
      const pv: readonly (number | string | boolean)[] = [
        Math.max(0, Math.min(3, params.pluckSize)),
        Math.max(0, Math.min(1, params.pluckGhost)),
        Math.max(0, Math.min(PLUCK_WHOLE_MAX, params.pluckWhole)),
        params.pluckCrossings, params.pluckGlow, params.sustain,
        Math.max(0, Math.min(1, params.pluckSheen)),
        Math.max(0, Math.min(1, params.autoPluckGain)),
        motion.reduced,
      ];
      if (pluckSync === null || pluckSync.r !== scene.renderer || pv.some((x, i) => x !== pluckSync!.v[i])) {
        pluckSync = { r: scene.renderer, v: pv };
        scene.renderer!.plucks.size = pv[0] as number;
        scene.renderer!.plucks.ghost = pv[1] as number;
        // K180's pluck params: W's amount and the glow reach the next pluck,
        // a crossings change re-lays the ringing ones out.
        scene.renderer!.plucks.setWhole(pv[2] as number, params.pluckCrossings, params.pluckGlow);
        scene.renderer!.plucks.sustain = params.sustain;
        // K279: the time exposure's sheen (live), and auto plucks' level.
        scene.renderer!.plucks.sheen = pv[6] as number;
        synth.setAutoGain(pv[7] as number);
        // Reduced motion (the Motion setting, live; WCAG 2.3.3): a pluck
        // started under it is STILL - the plucked segment brightens briefly
        // and nothing moves (K104); the sound is unchanged. Plucks already
        // ringing when it turns on finish without the ghost and the attack.
        scene.renderer!.plucks.reducedMotion = motion.reduced;
      }
      if (params.mazeFabric && scene.fabric && scene.fabricController) {
        // K6-2: the fabric's param fields sync only on a change (the
        // tuple covers every field assigned here and everything
        // syncExploration reads; `revealing` rides in through the two
        // holds, which flip at the reveal's end).
        const fogHold = params.exploration === "fog" && params.fowIntro && revealing;
        const exploreHold = params.exploration === "threads" && params.fowIntro && revealing;
        const fv: readonly (number | string | boolean)[] = [
          params.moveSpeed, pathVizOf(params), params.tension, params.trailLength,
          look("markerSize"), a11y.reducedMotion, a11y.highContrast, fogHold, exploreHold,
          params.exploration, params.fowRadius, params.revealDistance, params.revealFade,
          params.revealLook, params.burnt, params.revealFinish, params.revealEndCross,
          params.revealEndGlow,
        ];
        if (fabricSync === null || fabricSync.f !== scene.fabric || fabricSync.c !== scene.fabricController || fv.some((x, i) => x !== fabricSync!.v[i])) {
          fabricSync = { f: scene.fabric, c: scene.fabricController, v: fv };
          scene.fabric.moveSpeed = params.moveSpeed;
          scene.fabric.trailMode = pathVizOf(params) === "trail";
          scene.fabric.pathViz = pathVizOf(params);
          scene.fabric.tension = params.tension;
          scene.fabric.trailLength = params.trailLength;
          syncExploration(scene.fabric);
          scene.fabric.markerSize = look("markerSize"); // K98 (a no-op unless moved).
          // K76 stage 2c: the reveal's halo follows the Accessibility flags.
          scene.fabric.exploreStill = a11y.reducedMotion;
          scene.fabric.exploreContrast = a11y.highContrast;
          // fowIntro: keep the fog off while the intro animation plays; the
          // release closes it in (fade + contracting radius). K76 stage 2c:
          // the thread reveal's hold shows every thread while the intro plays,
          // and its release closes in on what you have explored the same way.
          scene.fabric.setFogHold(fogHold);
          scene.fabric.setExploreHold(exploreHold);
          scene.fabricController.trailMode = pathVizOf(params) === "trail";
        }
        // K6-2: the fog's wobble is PAINT_AMBIENT, its intro PAINT (the
        // fabric poll); nothing else in tickFog moves at rest.
        if ((need & (Flag.PAINT | Flag.PAINT_AMBIENT | Flag.REVEAL)) !== 0) {
          scene.fabric.tickFog(ticker.deltaMS / 1000);
        }
        // K76 stage 2c: the reveal's clock (growth, the close-in) in every
        // clock mode - the real-time chase never runs tickAnim (K324).
        // K6-2: its poll is PAINT (growth, halos) and a move is GAME; a
        // move in flight or the reveal itself also keeps it running.
        if ((need & (Flag.PAINT | Flag.GAME)) !== 0 || scene.fabric.animating || revealing) {
          scene.fabric.tickExplore(ticker.deltaMS / 1000);
        }
        // K120/K499: the gamepad polls every frame (edges only; a press
        // at rest is an input no flag poll could see first).
        pollGamepad();
        // K6-2: the game clocks run only on GAME (a chase, the turn
        // minotaur, the fire, a move, a key hold) - or on the frame an
        // input lands, so a tap's first step keeps its old timing; a
        // move in flight and a pending banner are GAME by poll, and are
        // named here so a skipped frame can never strand them.
        if ((need & Flag.GAME) !== 0 || inputPushed || scene.fabric.animating || deps.pendingWin || deps.pendingLoss) {
          // K80: in the real-time mode the chase moves the dot (tickChase).
          if (scene.chase) tickChase(ticker.deltaMS / 1000);
          // K114 stage 2: the real-time fire's clock moves the dot.
          else if (realtimeFire()) tickFire(ticker.deltaMS / 1000);
          else {
            scene.fabric.tickAnim(ticker.deltaMS / 1000, scene.fabricController);
            // K80 turns: the turn minotaur rides the move just stepped.
            if (scene.turnMino) tickTurnMino(ticker.deltaMS / 1000);
          }
          // K120: a held key's next move, once the dot has arrived.
          keyStep();
          // K114 stage 2: after the waiting move left, the fire's clock.
          if (realtimeFire()) fireSet();
          if (deps.pendingWin && !scene.fabric.animating) {
            deps.pendingWin = false;
            showFabricWin();
          }
          if (deps.pendingLoss && !scene.fabric.animating) {
            deps.pendingLoss = false;
            showFireLoss();
          }
        }
        // K114: the fire's look rides the dot. K6-2: it recomputes on
        // GAME (the fire's clock, a move), PAINT (its FX), GEOM/LOAD (a
        // rebuild) or an input frame; at rest with no fire it has
        // nothing to declare. It takes the frame's dt now (K6-2).
        if ((need & (Flag.GAME | Flag.PAINT | Flag.GEOM | Flag.LOAD)) !== 0 || inputPushed) {
          scene.fabric.drawFire(scene.fabricController, ticker.deltaMS / 1000);
        }
      }
      // K120: the move pad shows while the keys are live (knot mode too:
      // there it hides). K224: and the panel is closed (an open panel is
      // the whole screen on a phone, and the pad sat on its rows).
      // K713: and no walker mode is on (Lead and Delay refuse every move;
      // the keys still toast why).
      movePad.setShown(
        settings.movePad &&
          keysLive() &&
          !panel.isOpen() &&
          !scene.fabricController?.walkerMode
      );
      // K80 turns 3a: the pad's center waits while the turn minotaur is on.
      movePad.setWait(scene.turnMino !== null);
      deps.cutTick?.(); // K114: the scissors, beside the pad.
      // K80 turns 3a: the wait cue leaves with the head (a key move, a
      // catch) or the minotaur; the next pointer move puts it back.
      if (
        deps.waitCueGlyph !== null &&
        (scene.turnMino === null || scene.fabricController?.head !== deps.waitCueHead)
      ) {
        setWaitCue(false);
      }
      // K6-2: the paint pass only on its flags (pulses and the fog's
      // wobble are PAINT/PAINT_AMBIENT, the hover breath and web fade
      // PAINT, the FX tails FX, the flow clock FLOW) or on an input
      // frame (a hover move re-declares the rim before its poll lands).
      if ((need & (Flag.PAINT | Flag.PAINT_AMBIENT | Flag.FX | Flag.REVEAL | Flag.FLOW | Flag.GEOM)) !== 0 || inputPushed) {
        scene.renderer!.tickPaint(ticker.deltaMS / 1000);
      }
      // After the paint pass: fabric pluck colors read this frame's paint.
      // K6-2: only while plucks/ripples/confetti are live (OVERLAY), or
      // on the input frame that starts one.
      if ((need & Flag.OVERLAY) !== 0 || inputPushed) {
        scene.renderer!.tickPlucks(ticker.deltaMS / 1000);
      }
      // K6-2: the camera and the indicators only while the camera has
      // not converged (CAMERA) or on an input frame (a pan/zoom gesture
      // starts before its poll lands); at rest both are still.
      if ((need & Flag.CAMERA) !== 0 || inputPushed) {
        const camDt = Math.min(ticker.elapsedMS / 1000, CAM_MAX_DT);
        updateCamera(camDt);
        // After the camera step: the indicators read this frame's framing
        // (and the head's show delay runs on the same clock).
        indicators.update(camDt);
      }
    };

    // Flow undulation is RENDER-side only: while the physics is paused or
    // asleep the scene must keep swaying, so the render pass (and the
    // overlay updates that ride it, exactly as in the awake path) runs
    // WITHOUT ps.step. At flowStrength 0 this is a no-op and the
    // asleep/paused branches stay byte-identical to the pre-flow behavior
    // (no render at all while asleep). The appearance reveal rides the
    // same channel: its masks animate in update(), so while revealing the
    // render pass runs regardless of flowStrength.
    // `force` = a requested one-shot pass (renderDirty), whatever the flow.
    const flowRender = (force = false): void => {
      // Appearance FX that outlive the reveal (materialize fades, the
      // rainbow swell) gate crossings and reshape ribbons in update() -
      // asleep at flowStrength 0 it must keep running until they settle,
      // or crossings stay hidden until the next wake.
      if (
        !force &&
        look("flowStrength") <= 0 &&
        !revealing &&
        !scene.renderer!.needsFxRender()
      ) {
        return;
      }
      handRendererLook(); // K239: before the update(), not after it.
      scene.renderer!.update();
      if (params.mazeFabric && scene.fabric && scene.fabricController) {
        scene.fabric.update(scene.fabricController);
      }
    };
    const takeDirty = (): boolean => {
      const d = renderDirty;
      renderDirty = false;
      return d;
    };

    // At rest - asleep, or frozen with physics off (which NEVER steps):
    // render-side motion only. Half-rate the flow re-render (audit F2):
    // the displacement is cheap but moving the controls forces the full
    // spline + crossing re-solve (~10ms/frame), and 30fps sway is
    // imperceptible for a slow drift; the paint pass and the render-only
    // plucks stay at full rate. A reveal (or its lingering FX) renders at
    // FULL rate - with physics off the whole intro plays in this branch.
    const restFrame = (label: string): void => {
      // K6-3: at the rest cadence the tick itself is half-rate, so the
      // flow pass runs on every tick (the cadence replaces flowParity).
      flowParity = ambientOnly(need) ? true : !flowParity;
      // K6-2: a GEOM push (invalidate, wake, a look change, and the
      // worker sleep trip's deferred GEOM - K509 measured its miss at
      // 0 px, and this pass is what would draw it) forces the pass.
      const force = takeDirty() || (need & Flag.GEOM) !== 0;
      if (force || flowParity || revealing || scene.renderer!.needsFxRender()) {
        flowRender(force);
      }
      fabricTick();
      deps.perfLine = label;
      updateStamp();
    };
    if (deps.physState === "frozen") {
      restFrame(" | asleep (physics off)");
      return;
    }

    if (speedMult === 0) {
      flowRender(takeDirty() || (need & Flag.GEOM) !== 0);
      fabricTick();
      deps.perfLine = " | paused";
      updateStamp();
      return;
    }

    // Release animation (soft style): ease the freed target back to the
    // grab origin, then free the grab. (The STRING style frees the physics
    // at once and vibrates render-only.) Runs ahead of the asleep check
    // (wake() keeps the sim stepping while the thread moves); skipped
    // while paused - a frozen world holds.
    if (deps.snapMode === "soft") {
      if (scene.ps.grabbedParticle >= 0) {
        const dt = ticker.deltaMS / 1000;
        const f = 1 - Math.exp(-params.snapBack * dt);
        dragPos[0] += (grabOrigin[0] - dragPos[0]) * f;
        dragPos[1] += (grabOrigin[1] - dragPos[1]) * f;
        host.dragTo(dragPos[0], dragPos[1]);
        wake();
        if (
          Math.hypot(
            dragPos[0] - grabOrigin[0],
            dragPos[1] - grabOrigin[1]
          ) < 0.02
        ) {
          deps.snapMode = "none";
          host.release();
        }
      } else {
        deps.snapMode = "none";
      }
    }

    if (host.asleep) {
      restFrame(" | asleep");
      return;
    }
    // K6-1 observer: a step the need did not carry (a missing PHYS poll).
    if ((flags.need & Flag.PHYS) === 0) stepUnflagged = true;
    const t0 = performance.now();
    const requestDt = (ticker.deltaMS / 1000) * speedMult;
    // The frame's step (K147: under the load settle's budget while it is
    // armed - possibly no step() call at all). False: non-finite.
    const finite = host.frame(
      requestDt,
      physicsTuning(),
      t0,
      deps.physState === "live",
      params.settleBudget
    );
    const t1 = performance.now();
    if (!finite) {
      halted = true;
      deps.perfLine = " | HALTED: physics went non-finite (regenerate to reset)";
      updateStamp();
      console.error(
        "KnotMaze: physics state went non-finite; simulation halted."
      );
      return;
    }
    handRendererLook(); // K239: a toggle between frames is worn at once.
    scene.renderer.update();
    renderDirty = false;
    // Keep the gameplay overlay locked to the deforming knot.
    if (params.mazeFabric && scene.fabric && scene.fabricController) {
      scene.fabric.update(scene.fabricController);
    }
    fabricTick();
    const t2 = performance.now();

    // The sleep gate, fed this frame's SIMULATED time (frame-rate
    // independent), after the render: fabricTick may have woken the knot.
    // A physics-off settle freezes where live physics would fall asleep (or
    // at its wall-clock cap).
    const settling = deps.physState === "settling";
    const slept = host.gateFrame(settling);
    // K6-1 (question 2): the worker's sleep trip applies its last snapshot
    // inside gateFrame, after this frame's geometry pass, so the next frame
    // owes one (GEOM, noted for it).
    if (slept && host.kind === "worker") flags.defer(Flag.GEOM);
    if (slept && settling) freeze();
    if (
      settling &&
      deps.physState === "settling" &&
      performance.now() - deps.settleWall0 > SETTLE_WALL_CAP_MS
    ) {
      freeze();
    }

    perf.physMs += t1 - t0;
    perf.renderMs += t2 - t1;
    perf.frames++;
    if (t2 - perf.flushedAt >= 500) {
      const fps = (perf.frames * 1000) / (t2 - perf.flushedAt);
      deps.perfLine =
        (settling ? " | settling" : "") +
        ` | phys ${(perf.physMs / perf.frames).toFixed(2)}ms` +
        ` render ${(perf.renderMs / perf.frames).toFixed(2)}ms` +
        ` ${fps.toFixed(0)}fps mv ${scene.ps.maxMove.toExponential(1)}`;
      perf.physMs = perf.renderMs = perf.frames = 0;
      perf.flushedAt = t2;
    }
    updateStamp();
  };

  // K6 (section 4.8): K6-2 built the CPU half of the frame's decision
  // (the tick's parts and the rest/paused geometry pass run only on
  // their flags, in today's order). K6-3 adds the rest: draw or skip
  // app.render(), the rest cadence, stopping the ticker.
  // A one-shot render pass (renderDirty), for the regions that change what
  // a frozen scene shows (the marker size, the accessibility looks, the
  // probe hooks).
  const invalidate = (): void => {
    renderDirty = true;
    flags.push(Flag.GEOM); // K6-1 (shadow: recorded only)
  };
  // K6-1: a push for the change a region just made (main.ts: GEOM at a
  // width, resize, panel, rebuild or recolor change).
  const note = (bits: number): void => {
    flags.push(bits);
  };
  // K6-1: every input event pushes INPUT (one capture-phase listener per
  // type on the window; recorded only - INPUT is not visual).
  const onInput = (): void => {
    flags.push(Flag.INPUT);
  };
  const INPUT_EVENTS = [
    "pointerdown",
    "pointermove",
    "pointerup",
    "pointercancel",
    "wheel",
    "keydown",
    "keyup",
    "resize",
    "focus",
  ] as const;
  // Registers the ticker callback, once (main.ts, after createStamp).
  const start = (): void => {
    // K6-3: the loop draws itself (design 4.8's mechanics), so Pixi's
    // auto-render comes off the ticker. A probe that times frames sets
    // the pre-load global (evaluateOnNewDocument) for continuous mode.
    app.ticker.remove(app.render, app);
    if (
      typeof window !== "undefined" &&
      (window as unknown as Record<string, unknown>).__knotLoopMode === "continuous"
    ) {
      setContinuous(true);
    }
    app.ticker.add(onTick);
    if (typeof window !== "undefined") {
      for (const type of INPUT_EVENTS) {
        window.addEventListener(type, onInput, { capture: true, passive: true });
      }
      document.addEventListener("visibilitychange", onInput, { capture: true, passive: true });
    }
  };

  return {
    // Called, or mutated in place: main.ts destructures these.
    wake,
    invalidate,
    note,
    start,
    setContinuous,
    // K456: a lost WebGL context (src/app/context_loss.ts).
    suspend,
    resume,
    onRestore: (fn: () => void): void => {
      restoreHooks.push(fn);
    },
    get suspended() {
      return suspended;
    },
    get stopped() {
      return stopped;
    },
    get continuous() {
      return continuous;
    },
    frameCost,
    revealCost,
    // The `let`s other regions read (the probe hooks) or write (the load
    // settle halts the loop): getters, and a get/set pair for halted.
    get halted() {
      return halted;
    },
    set halted(v) {
      halted = v;
    },
    get frameCostN() {
      return frameCostN;
    },
    get frameCostTotal() {
      return frameCostTotal;
    },
    get revealMsTotal() {
      return revealMsTotal;
    },
    get sceneWasAnimating() {
      return sceneWasAnimating;
    },
  };
}
