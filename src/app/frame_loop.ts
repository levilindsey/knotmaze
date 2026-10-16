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
import { CAM_MAX_DT } from "./camera";
import type { SceneRef } from "./scene_ref";
import type { StampPerf } from "./stamp";

// K5 M3 (docs/design/K5_K6_split.md, 2.2): the frame loop, moved out of
// main() as it was: the ticker callback (each frame's main-thread cost and
// the reveal's), tick (the load settle or the physics step, the sleep
// gate's call, the camera, the fabric's per-frame work, flow's half rate,
// the rest frame, the stamp), sceneAnimating and the background's tick.
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

// What the frame loop reads from main(): values and functions, each
// assigned once, then accessors for the `let`s main.ts keeps (their owners
// move in later stages: physState's is M4's lifecycle).
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
  handRendererLook: () => void;
  loadingTick: () => void;
  presettleTick: () => void;
  warmHoldTick: () => void;
  showFabricWin: () => void;
  showFireLoss: () => void;
  keyStep: () => void;
  autoAudioTick: () => void;
  freeze: () => void;
  // main.ts's `let`s: read only,
  readonly physState: "live" | "loading" | "settling" | "frozen";
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
    handRendererLook,
    loadingTick,
    presettleTick,
    warmHoldTick,
    showFabricWin,
    showFireLoss,
    keyStep,
    autoAudioTick,
    freeze,
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
  const wake = (): void => {
    host.wake();
    renderDirty = true;
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

  // K24/K6 HOOK (approximate until K6's what-changed flags): is anything
  // besides the background moving this frame? The background's drift
  // pauses once the rest of the scene has been still for a while
  // (BACKGROUND_PAUSE_GRACE), and background.needsFrame() then says false -
  // so a render-on-demand loop can stop drawing.
  let lastViewX = NaN;
  let lastViewY = NaN;
  let lastViewS = NaN;
  const sceneAnimating = (): boolean => {
    // The fit camera's ease converges geometrically: ignore sub-pixel
    // creep (comparing exact floats held the drift awake ~11 s after the
    // knot slept, instead of the 2.5 s grace).
    const moved = !(
      Math.abs(root.position.x - lastViewX) < 0.01 &&
      Math.abs(root.position.y - lastViewY) < 0.01 &&
      Math.abs(root.scale.x - lastViewS) < 1e-5 * root.scale.x
    );
    lastViewX = root.position.x;
    lastViewY = root.position.y;
    lastViewS = root.scale.x;
    if (moved || !scene.ps || !scene.renderer) return true;
    // K140: confetti in the air (false again once its last piece is gone).
    if (confetti.active) return true;
    // K279: a pluck ripple spreading.
    if (ripples.activeCount > 0) return true;
    // K169: a fully traveled gold web fading in (0.25 s).
    if (scene.fabric !== null && scene.fabric.webFading) return true;
    if (deps.physState === "loading" || deps.physState === "settling" || !host.asleep) {
      return true;
    }
    if (look("flowStrength") > 0 || (scene.reveal !== null && !scene.reveal.done)) {
      return true;
    }
    if (scene.renderer.needsFxRender() || scene.renderer.plucks.activeCount > 0) {
      return true;
    }
    // Fabric gameplay paint (pulses, hover breathing, traversal, the fog's
    // wobble) animates continuously.
    return params.mazeFabric && scene.fabric !== null;
  };
  // The last frame's sceneAnimating() (probes read it; calling it again
  // would move its view bookkeeping).
  let sceneWasAnimating = false;
  const backgroundTick = (dt: number): void => {
    background.reducedMotion = motion.reduced;
    sceneWasAnimating = sceneAnimating();
    // K307: no texture pass before wave 1 (pixi would link the effect cold).
    if (warmup.wave1Done) background.tick(dt, sceneWasAnimating);
  };

  const onTick = (ticker: Ticker): void => {
    const c0 = performance.now();
    revealMs = 0;
    warmup.poll(); // K307: the warm-up's compiles, once a frame.
    tick(ticker);
    // K307: wave 2 once the intro is over (the reveal done, or asleep).
    if (warmup.wave1Done && deps.physState !== "loading" && (host.asleep || !introPlaying())) {
      warmup.startWave2();
    }
    // K279: the pluck ripples, after the camera's step (they read its view).
    ripples.tick(ticker.deltaMS / 1000);
    // K140: the confetti steps in every branch (asleep, paused, loading);
    // a single early return once nothing is in the air.
    confetti.tick(ticker.deltaMS / 1000, app.screen.height, root);
    // After the scene's frame (the background's render-texture pass, when
    // due, precedes the stage render either way).
    backgroundTick(ticker.deltaMS / 1000);
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

    // simSpeed [0, 10]: piecewise-linear multiplier hitting the spec's
    // pinned points exactly - 0 paused, 1 -> 0.2x, 5 -> 1x, 10 -> 5x. A
    // physics-off settle runs regardless (it must reach its freeze).
    const rawMult =
      params.simSpeed <= 5
        ? params.simSpeed / 5
        : 1 + (params.simSpeed - 5) * 0.8;
    const speedMult =
      deps.physState === "settling" && rawMult === 0 ? 1 : rawMult;

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
    scene.renderer.advanceClocks(ticker.deltaMS / 1000);
    // The gameplay animations (traversal, pulse, hover) run even while
    // paused or asleep - they touch only markers and UV buffers, never
    // physics or splines.
    const fabricTick = (): void => {
      autoAudioTick();
      // K239: handRendererLook (cuspRadius, fade, flow, pulses, glow, FX) runs
      // here too, for the readers between passes, and before every update().
      // K111: the flow holds still under Reduced motion (the intro and the
      // pulses keep playing) and the crossings cut crisp under High contrast.
      // The FX style is consumed by the appearance-FX pass inside tickPaint
      // while a reveal runs.
      handRendererLook();
      // Render-only pluck look (live; a hand-edited link cannot leave the
      // panel's ranges - pluckSize's slider has reached 3 since K25, and a
      // clamp left at 2 made its top third do nothing).
      scene.renderer!.plucks.size = Math.max(0, Math.min(3, params.pluckSize));
      scene.renderer!.plucks.ghost = Math.max(0, Math.min(1, params.pluckGhost));
      // K180's pluck params: W's amount and the glow reach the next pluck,
      // a crossings change re-lays the ringing ones out.
      scene.renderer!.plucks.setWhole(
        Math.max(0, Math.min(PLUCK_WHOLE_MAX, params.pluckWhole)),
        params.pluckCrossings,
        params.pluckGlow
      );
      scene.renderer!.plucks.sustain = params.sustain;
      // K279: the time exposure's sheen (live), and auto plucks' level.
      scene.renderer!.plucks.sheen = Math.max(0, Math.min(1, params.pluckSheen));
      synth.setAutoGain(Math.max(0, Math.min(1, params.autoPluckGain)));
      // Reduced motion (the Motion setting, live; WCAG 2.3.3): a pluck
      // started under it is STILL - the plucked segment brightens briefly
      // and nothing moves (K104); the sound is unchanged. Plucks already
      // ringing when it turns on finish without the ghost and the attack.
      scene.renderer!.plucks.reducedMotion = motion.reduced;
      if (params.mazeFabric && scene.fabric && scene.fabricController) {
        scene.fabric.moveSpeed = params.moveSpeed;
        scene.fabric.trailMode = params.pathViz === "trail";
        scene.fabric.pathViz = params.pathViz;
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
        scene.fabric.setFogHold(params.exploration === "fog" && params.fowIntro && revealing);
        scene.fabric.setExploreHold(
          params.exploration === "threads" && params.fowIntro && revealing
        );
        scene.fabric.tickFog(ticker.deltaMS / 1000);
        // K76 stage 2c: the reveal's clock (growth, the close-in) in every
        // clock mode - the real-time chase never runs tickAnim (K324).
        scene.fabric.tickExplore(ticker.deltaMS / 1000);
        scene.fabricController.trailMode = params.pathViz === "trail";
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
        // K114: the fire's look rides the dot (the cheap first look; a no-op
        // without a fire once cleared).
        scene.fabric.drawFire(scene.fabricController);
      }
      // K120: the move pad shows while the keys are live (knot mode too:
      // there it hides). K224: and the panel is closed (an open panel is
      // the whole screen on a phone, and the pad sat on its rows).
      movePad.setShown(settings.movePad && keysLive() && !panel.isOpen());
      // K80 turns 3a: the pad's center waits while the turn minotaur is on.
      movePad.setWait(scene.turnMino !== null);
      // K80 turns 3a: the wait cue leaves with the head (a key move, a
      // catch) or the minotaur; the next pointer move puts it back.
      if (
        deps.waitCueGlyph !== null &&
        (scene.turnMino === null || scene.fabricController?.head !== deps.waitCueHead)
      ) {
        setWaitCue(false);
      }
      scene.renderer!.tickPaint(ticker.deltaMS / 1000);
      // After the paint pass: fabric pluck colors read this frame's paint.
      scene.renderer!.tickPlucks(ticker.deltaMS / 1000);
      const camDt = Math.min(ticker.elapsedMS / 1000, CAM_MAX_DT);
      updateCamera(camDt);
      // After the camera step: the indicators read this frame's framing
      // (and the head's show delay runs on the same clock).
      indicators.update(camDt);
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
      flowParity = !flowParity;
      const force = takeDirty();
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
      flowRender(takeDirty());
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
    if (host.gateFrame(settling) && settling) freeze();
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

  // K6 (section 4.8) puts the frame's decision here; none of it is built
  // yet: tick in today's order, the geometry pass, then draw or skip
  // app.render(); flowParity becomes the rest cadence; no flag set for two
  // frames stops the ticker, and invalidate() or any input starts it.
  // A one-shot render pass (renderDirty), for the regions that change what
  // a frozen scene shows (the marker size, the accessibility looks, the
  // probe hooks).
  const invalidate = (): void => {
    renderDirty = true;
  };
  // Registers the ticker callback, once (main.ts, after createStamp).
  const start = (): void => {
    app.ticker.add(onTick);
  };

  return {
    // Called, or mutated in place: main.ts destructures these.
    wake,
    invalidate,
    start,
    sceneAnimating,
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
