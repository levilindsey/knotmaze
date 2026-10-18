import type { Container } from "pixi.js";
import type { PhysicsTuning } from "../physics/particle_system";
import { LOAD_SIM_CAP } from "../physics/physics_host";
import type { PhysicsHost } from "../physics/physics_host";
import { RevealAnimator } from "../render/reveal";
import type { ShaderWarmup } from "../render/shader_warmup";
import type { OffscreenIndicators } from "../ui/offscreen_indicators";
import { LOAD_SETTLE_MAX } from "../ui/url_state";
import type { UrlParams } from "../ui/url_state";
import type { SceneRef } from "./scene_ref";

// K5 M4 (docs/design/K5_K6_split.md, 2.2): the load and settle lifecycle,
// moved out of main() as it was: the appearance's start, the physics-off
// load (beginLoading, loadingTick, finishLoading), the K147 pre-settle and
// K307's warm-up hold (beginSettle, presettleTick, warmHoldTick,
// finishPresettle), replaySettle and the physics toggle (startSettling,
// freeze, applyPhysicsMode, physicsInputsChanged). main.ts calls
// createLifecycle once, where startAppearance was; the frame loop, created
// later, runs its ticks and reads its getters. What main.ts declares after
// that point comes in as accessors on `deps` (getters, and get/set pairs
// for the ones the lifecycle writes), so moved lines say `deps.<name>`;
// the scene's `let`s are `scene.<name>`. state (physState), settleWall0,
// warmHoldFrom and loaderShownAt are getters on the returned object: never
// destructure those, or the copy goes stale.

// THE LOAD SETTLE (K147, docs/design/K147.md): the pre-settle and the
// budgeted settle step in the physics host (physics/physics_host.ts, whose
// header is the full note, with the physics-off load's caps); main keeps
// their UI. The trefoil shows only for a pre-settle predicted past
// LOADER_DELAY_MS, and then for at least LOADER_MIN_MS (no flash). A
// pre-settle ends after PRESETTLE_SIM simulated seconds or `loadSettle`
// seconds of stepping work; at loadSettle's max it lasts until the first
// sleep (LOAD_SIM_CAP).
const PRESETTLE_SIM = 1.2;
const LOADER_DELAY_MS = 300;
const LOADER_MIN_MS = 400;
// Sim seconds a settle-first load is predicted to run (K63: every design
// sleeps ~5.0 sim-s in), for the loader's show-or-not call.
const NOMINAL_SLEEP_SIM = 5;

// PHYSICS MODE. live = physics on (today's behavior: awake until the
// sleep gate, woken by input). With the `physics` param off: loading =
// the hidden chunked settle behind the indicator; settling = a VISIBLE
// settle-then-freeze (unchecked while awake, or a physics slider moved
// while frozen); frozen = no ps.step() at all - only render-side motion
// (flow, pulses, traversal, the reveal, plucks) runs.
export type PhysState = "live" | "loading" | "settling" | "frozen";

// What the lifecycle reads from main(): values and functions, each
// assigned once, then accessors for what main.ts declares after it (the
// indicators, the frame loop, the stamp's perfLine) and the scene's reveal,
// which the lifecycle writes.
export interface LifecycleDeps {
  params: UrlParams;
  host: PhysicsHost;
  root: Container;
  warmup: ShaderWarmup;
  loader: { show: () => void; hide: () => void };
  physicsTuning: () => PhysicsTuning;
  handRendererLook: () => void;
  fitToScreen: () => void;
  wake: () => void;
  // Read only (`loop.halted = true` stays a write on the loop),
  readonly indicators: OffscreenIndicators;
  readonly loop: { halted: boolean };
  // and written by the lifecycle too.
  perfLine: string;
  reveal: RevealAnimator | null;
}

export function createLifecycle(deps: LifecycleDeps, scene: SceneRef) {
  const {
    params,
    host,
    root,
    warmup,
    loader,
    physicsTuning,
    handRendererLook,
    fitToScreen,
    wake,
  } = deps;

  let physState: PhysState = "live";
  // The sleep gate, the step counts and the load and settle diagnostics
  // live in the physics host (host.stats()).
  let settleWall0 = 0;
  // Physics inputs the frozen layout was settled with: a change while
  // frozen re-settles (visibly) instead of being silently ignored.
  let frozenSig = "";
  // K147 LOAD SETTLE (see the note at the top). The host's hidden
  // pre-settle runs while host.presettling (physState "loading", the
  // loader's ticker branch); main shows the loader.
  let loaderShownAt = -1;
  // K307: a link without a pre-settle holds its first frame until the
  // warm-up's wave 1 (beginSettle's instant branch; warmHoldTick). The
  // hold's start, or -1.
  let warmHoldFrom = -1;
  // K307 stage 3: showing the trefoil also releases the warm-up's blocking
  // fallback reads (they freeze the page, trefoil included, so they must
  // not run before it is up; on the poll path this is a no-op).
  const showLoader = (): void => {
    loader.show();
    warmup.releaseBlocking();
  };
  const physSig = (): string => {
    const t = physicsTuning();
    return [
      t.slack,
      t.drag,
      t.repulsion,
      t.bend,
      t.smooth,
      t.stiffness,
      t.gridAlign,
      t.threadWidth,
    ].join(",");
  };
  // Tugs exist only while the physics runs live.
  const physicsLive = (): boolean => params.physics && physState === "live";

  // Stage 22: (re)start the appearance animation: hand the renderer a
  // fresh animator. Instant mode detaches everything: the render path is
  // byte-identical to the pre-Stage-22 build. The settle before the reveal
  // is the caller's (K147: the hidden pre-settle, or the physics-off load).
  function startAppearance(): void {
    if (!scene.ps || !scene.renderer) return;
    if (params.appearSequence === "instant") {
      deps.reveal = null;
      scene.renderer.beginReveal(null);
      if (scene.fabric) scene.fabric.revealQuery = null;
      return;
    }
    deps.reveal = new RevealAnimator(
      params.appearSequence,
      scene.walkGraph,
      scene.ps,
      params.seed
    );
    // The ticker re-syncs this from the slider every frame (an x1.8 burn
    // factor applied here was overwritten before it ever ticked - the
    // appearMode presets are tuned at the plain slider speed).
    deps.reveal.speed = params.appearSpeed;
    scene.renderer.beginReveal(deps.reveal);
    if (scene.fabric) {
      const r = scene.renderer;
      scene.fabric.revealQuery = (chain, ctrl) => r.revealMulAtCtrl(chain, ctrl);
    }
  }

  // PHYSICS OFF, step 1: hide the scene and settle it in slices (the
  // ticker calls loadingTick every frame) behind the loading indicator.
  function beginLoading(): void {
    if (!scene.ps || !scene.renderer) return;
    physState = "loading";
    warmHoldFrom = -1;
    deps.loop.halted = false; // K436: a regenerate clears the halt.
    host.beginLoad();
    deps.reveal = null;
    scene.renderer.beginReveal(null);
    if (scene.fabric) scene.fabric.revealQuery = null;
    root.visible = false;
    deps.indicators.hideAll();
    showLoader();
  }

  // One slice of the hidden settle (the host's loadFrame: virtual 60 fps
  // frames through the normal step() and the normal sleep gate).
  function loadingTick(): void {
    if (!scene.ps) return;
    const status = host.loadFrame(physicsTuning());
    if (status === "halted") {
      deps.loop.halted = true;
      loader.hide();
      root.visible = true;
      deps.perfLine = " | HALTED: physics went non-finite (regenerate to reset)";
      console.error("KnotMaze: physics state went non-finite; simulation halted.");
    } else if (status === "done" && warmup.wave1Done) {
      finishLoading(); // K307: not before the warm-up's wave 1.
    }
  }

  // PHYSICS OFF, step 2: the layout is final. Build the render once, start
  // the appearance animation over it, show the scene, and stop simulating
  // (or go live, if physics was switched back on meanwhile).
  function finishLoading(): void {
    if (!scene.ps || !scene.renderer) return;
    host.endLoad();
    // Reveal first, so the very first visible frame already wears its
    // (collapsed) masks - no one-frame flash of the finished knot.
    startAppearance();
    handRendererLook(); // K239: the first frame wears the worn fade and flow.
    scene.renderer.update();
    if (scene.fabric && scene.fabricController) scene.fabric.update(scene.fabricController);
    fitToScreen();
    root.visible = true;
    loader.hide();
    host.wake();
    if (params.physics) {
      physState = "live";
    } else {
      physState = "frozen";
      host.sleep();
      frozenSig = physSig();
    }
  }

  // "Replay settle": back to the lattice state, settle and appear again.
  function replaySettle(): void {
    host.reset();
    scene.renderer?.plucks.clear();
    if (!params.physics) {
      // Physics off: the replay is a fresh hidden load + reveal.
      beginLoading();
      return;
    }
    // Replay the appearance too: fresh pre-settle, fresh reveal clock.
    beginSettle();
    wake();
  }

  // K147, PHYSICS ON: settle a new (or replayed) knot. A non-instant
  // appear mode with loadSettle > 0 first settles it HIDDEN (the ticker's
  // loading branch runs presettleTick); otherwise the scene shows at once.
  // Either way the budgeted settle then runs from the first visible frame
  // to the first sleep.
  function beginSettle(): void {
    if (!scene.ps || !scene.renderer) return;
    deps.loop.halted = false; // K436: a regenerate clears the halt.
    host.disarm();
    warmHoldFrom = -1;
    if (params.appearSequence === "instant" || params.loadSettle <= 0) {
      if (!warmup.wave1Done) {
        // K307: hidden, inputs off as in a load, until wave 1 is in.
        physState = "loading";
        warmHoldFrom = performance.now();
        loaderShownAt = -1;
        root.visible = false;
        deps.indicators.hideAll();
        loader.hide();
        return;
      }
      physState = "live";
      startAppearance();
      // K243: draw the first frame now - a paused page (fw=0) otherwise
      // never updates and shows no threads.
      handRendererLook();
      scene.renderer.update();
      if (scene.fabric && scene.fabricController) scene.fabric.update(scene.fabricController);
      // A physics-off load cut short by this rebuild left these behind.
      root.visible = true;
      loader.hide();
      host.armBudget(params.settleBudget);
      return;
    }
    physState = "loading";
    host.beginPresettle();
    loaderShownAt = -1;
    deps.reveal = null;
    scene.renderer.beginReveal(null);
    if (scene.fabric) scene.fabric.revealQuery = null;
    root.visible = false;
    deps.indicators.hideAll();
    loader.hide();
  }

  // One slice of the hidden pre-settle (the host's presettleFrame: virtual
  // 60 fps frames through the normal step() and the normal sleep gate). It
  // may end at the first sleep, after PRESETTLE_SIM simulated seconds or
  // loadSettle seconds of stepping (at loadSettle's max: LOAD_SIM_CAP or
  // LOAD_WALL_CAP_MS); it does end once the loader, if it showed, has
  // shown for LOADER_MIN_MS, and steps on meanwhile unless asleep.
  function presettleTick(): void {
    if (!scene.ps) return;
    if (!params.physics) {
      // Physics went off meanwhile: the physics-off load takes over.
      beginLoading();
      return;
    }
    const settleFirst = params.loadSettle >= LOAD_SETTLE_MAX;
    const simCap = settleFirst ? LOAD_SIM_CAP : PRESETTLE_SIM;
    const workCap = params.loadSettle * 1000;
    const mayFinish = (): boolean =>
      warmup.wave1Done &&
      (loaderShownAt < 0 || performance.now() - loaderShownAt >= LOADER_MIN_MS);
    const pr = host.presettleFrame(physicsTuning(), settleFirst, simCap, workCap, mayFinish);
    if (pr.halted) {
      deps.loop.halted = true;
      physState = "live"; // Keeps the HALTED line on the stamp.
      loader.hide();
      root.visible = true;
      deps.perfLine = " | HALTED: physics went non-finite (regenerate to reset)";
      console.error("KnotMaze: physics state went non-finite; simulation halted.");
      return;
    }
    if (pr.end === "" && loaderShownAt < 0) {
      // Show the loader for a settle that will run past LOADER_DELAY_MS.
      const simDone = pr.simDone;
      const simLeft = (settleFirst ? NOMINAL_SLEEP_SIM : simCap) - simDone;
      let workLeft = simDone > 0 ? (simLeft * pr.workMs) / simDone : Infinity;
      if (!settleFirst) workLeft = Math.min(workLeft, workCap - pr.workMs);
      if (pr.elapsed + workLeft > LOADER_DELAY_MS || pr.elapsed > LOADER_DELAY_MS) {
        showLoader();
        loaderShownAt = performance.now();
      }
    }
    // K307: so does the warm-up's wave 1, still compiling at LOADER_DELAY_MS.
    if (loaderShownAt < 0 && !warmup.wave1Done && pr.elapsed > LOADER_DELAY_MS) {
      showLoader();
      loaderShownAt = performance.now();
    }
    if (pr.end !== "" && mayFinish()) finishPresettle();
  }

  // K307: one frame of the instant hold (see beginSettle): the trefoil after
  // LOADER_DELAY_MS, then the first frame once wave 1 is in and a shown
  // trefoil has had LOADER_MIN_MS.
  function warmHoldTick(): void {
    const now = performance.now();
    if (loaderShownAt < 0 && !warmup.wave1Done && now - warmHoldFrom > LOADER_DELAY_MS) {
      showLoader();
      loaderShownAt = now;
    }
    if (!warmup.wave1Done) return;
    if (loaderShownAt >= 0 && now - loaderShownAt < LOADER_MIN_MS) return;
    beginSettle();
  }

  // The pre-settle is over: start the appearance over the settled layout,
  // show the scene and go live - asleep if the sleep gate already tripped,
  // else under the settle budget.
  function finishPresettle(): void {
    if (!scene.ps || !scene.renderer) return;
    host.finishPresettle(loaderShownAt >= 0);
    // Reveal first, so the very first visible frame already wears its
    // (collapsed) masks - no one-frame flash of the finished knot.
    startAppearance();
    handRendererLook(); // K239: the first frame wears the worn fade and flow.
    scene.renderer.update();
    if (scene.fabric && scene.fabricController) scene.fabric.update(scene.fabricController);
    fitToScreen();
    root.visible = true;
    loader.hide();
    physState = "live";
    host.goLive(params.settleBudget);
  }

  const startSettling = (): void => {
    physState = "settling";
    settleWall0 = performance.now();
    host.wake();
  };
  const freeze = (): void => {
    physState = "frozen";
    host.sleep();
    frozenSig = physSig();
  };
  // The live physics toggle (panel checkbox). OFF: freeze at once if the
  // knot sleeps, else keep stepping VISIBLY until the gate trips (a soft
  // snap-back in flight finishes first - the gate needs the grab freed).
  // ON: wake and run as ever. A hidden load in progress just finishes
  // into whichever mode is current then (finishLoading).
  const applyPhysicsMode = (): void => {
    if (physState === "loading") return;
    if (params.physics) {
      physState = "live";
      wake();
    } else if (host.asleep && scene.ps && scene.ps.grabbedParticle < 0) {
      freeze();
    } else {
      startSettling();
    }
  };
  // A physics input moved while frozen: settle (visibly) into the new
  // layout, then freeze again - a slider must not silently do nothing.
  const physicsInputsChanged = (): void => {
    if (physState === "frozen" && physSig() !== frozenSig) startSettling();
  };

  return {
    beginLoading,
    loadingTick,
    finishLoading,
    replaySettle,
    beginSettle,
    presettleTick,
    warmHoldTick,
    finishPresettle,
    startSettling,
    freeze,
    applyPhysicsMode,
    physicsInputsChanged,
    physicsLive,
    get state() {
      return physState;
    },
    get settleWall0() {
      return settleWall0;
    },
    get warmHoldFrom() {
      return warmHoldFrom;
    },
    get loaderShownAt() {
      return loaderShownAt;
    },
  };
}
