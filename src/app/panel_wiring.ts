import type { Application } from "pixi.js";
import { setGamutConfig } from "../core/section_colors";
import type { DailyStore, SolveRecord } from "../game/daily_store";
import { todayNumber } from "../game/daily_calendar";
import { resetPathAction } from "../game/daily_attempt";
import { turnConfig } from "../game/minotaur_turns";
import type { KnotSynth } from "../audio/knot_synth";
import type { BackgroundLayer } from "../render/background";
import { accentHexes, backgroundColors } from "../render/background_model";
import type { ConfettiLayer } from "../render/confetti";
import type { FabricMazeRenderer } from "../render/fabric_maze_renderer";
import {
  highContrastChoice,
  overriddenKeys,
  reducedMotionChoice,
  type A11yFlags,
  type A11yKey,
  type ContrastSetting,
} from "../ui/accessibility";
import type { MotionSetting } from "../ui/motion";
import { MOVE_PAD_KEY } from "../ui/move_pad";
import {
  HEAD_INDICATOR_KEY,
  INDICATOR_SIZE_KEY,
  MINOTAUR_INDICATOR_KEY,
} from "../ui/offscreen_indicators";
import { showToast } from "../ui/share";
import { buildPanel } from "../ui/tweakpane_panel";
import type { PanelApi, PanelSettings } from "../ui/tweakpane_panel";
import {
  chaseParamsOf,
  clampHoverGlowFade,
  clampHoverGlowLength,
  clampHoverGlowWidth,
  newSeed,
  turnMinoParamsOf,
} from "../ui/url_state";
import type { UrlParams } from "../ui/url_state";
import { Flag, type LoopFlags } from "./loop_flags";
import { BACKGROUND } from "./scene";
import type { SceneRef } from "./scene_ref";

// K5 M5 (docs/design/K5_K6_split.md, 2.2): the panel wiring, moved out of
// main() as it was: the buildPanel callbacks, applyAccessibility,
// handRendererLook and the window resize listener. main.ts calls
// wirePanel once, where the panel was built, and destructures
// applyAccessibility and handRendererLook under their old names (the
// lifecycle, the frame loop and the probe hooks call them). What main.ts
// declares after that point (the session's HUD, win and solve functions,
// the stamp, the frame loop's wake/invalidate) comes in as closures and
// getters on `deps`, so moved lines say `deps.<name>` for those; the
// scene's `let`s are `scene.<name>`. panel stays main's (the badge, the
// indicators and the frame loop read it): never cache a scene value.

export interface PanelWiringDeps {
  app: Application;
  params: UrlParams;
  settings: PanelSettings;
  motion: MotionSetting;
  contrast: ContrastSetting;
  a11y: A11yFlags;
  look: <K extends A11yKey>(key: K) => UrlParams[K];
  synth: KnotSynth;
  confetti: ConfettiLayer;
  background: BackgroundLayer;
  dailyStore: DailyStore;
  flags: LoopFlags;
  statsKey: string;
  mazeStatsKey: string;
  finishIndicatorKey: string;
  tapToPanKey: string;
  rebuild: () => void;
  recolorScene: () => void;
  syncBackground: () => void;
  syncExploration: (f: FabricMazeRenderer) => void;
  writeParams: (p: UrlParams) => void;
  wake: () => void;
  invalidate: () => void;
  replaySettle: () => void;
  applyPhysicsMode: () => void;
  physicsInputsChanged: () => void;
  rebuildAudioMap: () => void;
  fitToScreen: () => void;
  updateHud: () => void;
  showFabricWin: () => void;
  restartSolve: (carry?: boolean) => void;
  playDaily: (n: number, floating?: boolean) => void;
  showDailyStats: () => void;
  saveAttempt: () => void;
  dailyAttemptLive: () => boolean;
  attemptLate: () => boolean;
  readonly stampEl: HTMLElement;
  readonly dailyN: number | null;
  readonly attemptDaily: number | null;
  readonly attemptRecord: SolveRecord | null;
  readonly hcLookChoice: number;
  pendingWin: boolean;
}

export interface PanelWiring {
  panel: PanelApi;
  applyAccessibility: () => void;
  handRendererLook: () => void;
  resize: () => void;
}

export function wirePanel(deps: PanelWiringDeps, scene: SceneRef): PanelWiring {
  const { params, settings, motion, contrast, a11y, look, synth } = deps;

  // The design's own background accents in the panel's order (accent 1 =
  // the main one): what switching the colors to custom starts from.
  function gamutAccentHexes(): [string, string, string] {
    const effHue = (((params.seed % 360) + params.hueShift) % 360 + 360) % 360;
    // The DESIGN's accents (the stored palette), then the gamut the scene
    // wears (K111: high contrast swaps the palette) is put back.
    setGamutConfig(params.gamutArc, params.palette);
    const accents = accentHexes(backgroundColors(BACKGROUND, effHue));
    setGamutConfig(params.gamutArc, look("palette"));
    return accents;
  }

  const panel = buildPanel(params, settings, {
    onRegenerate: () => {
      deps.rebuild();
      deps.wake();
    },
    onReseed: () => {
      params.seed = newSeed();
      deps.rebuild();
      deps.wake();
    },
    onSetSeed: (seed: number) => {
      if (seed === params.seed) return;
      params.seed = seed;
      deps.rebuild();
      deps.wake();
    },
    onReplaySettle: () => deps.replaySettle(),
    onPhysicsToggle: () => {
      deps.writeParams(params);
      deps.applyPhysicsMode();
    },
    onStatsToggle: (visible) => {
      deps.stampEl.style.display = visible ? "" : "none";
      try {
        localStorage.setItem(deps.statsKey, visible ? "1" : "0");
      } catch {
        // Storage unavailable: the choice just doesn't persist.
      }
    },
    onMazeStatsToggle: (visible) => {
      deps.updateHud();
      try {
        localStorage.setItem(deps.mazeStatsKey, visible ? "1" : "0");
      } catch {
        // Storage unavailable: the choice just doesn't persist.
      }
    },
    // The next frame shows or hides the indicator / makes it inert.
    onFinishIndicatorToggle: (visible) => {
      try {
        localStorage.setItem(deps.finishIndicatorKey, visible ? "1" : "0");
      } catch {
        // Storage unavailable: the choice just doesn't persist.
      }
    },
    // K198 stage 2: the head's and the minotaur's switches and the size
    // (the next frame reads them).
    onHeadIndicatorToggle: (visible) => {
      try {
        localStorage.setItem(HEAD_INDICATOR_KEY, visible ? "1" : "0");
      } catch {
        // Storage unavailable: the choice just doesn't persist.
      }
    },
    onMinotaurIndicatorToggle: (visible) => {
      try {
        localStorage.setItem(MINOTAUR_INDICATOR_KEY, visible ? "1" : "0");
      } catch {
        // Storage unavailable: the choice just doesn't persist.
      }
    },
    onIndicatorSizeChange: (scale) => {
      try {
        localStorage.setItem(INDICATOR_SIZE_KEY, String(scale));
      } catch {
        // Storage unavailable: the choice just doesn't persist.
      }
    },
    onTapToPanToggle: (on) => {
      try {
        localStorage.setItem(deps.tapToPanKey, on ? "1" : "0");
      } catch {
        // Storage unavailable: the choice just doesn't persist.
      }
    },
    // K120: the next frame shows or hides the move pad.
    onMovePadToggle: (on) => {
      try {
        localStorage.setItem(MOVE_PAD_KEY, on ? "1" : "0");
      } catch {
        // Storage unavailable: the choice just doesn't persist.
      }
    },
    // Stored by the setting itself; the next frame's readers and the
    // stylesheets (the root attribute) follow at once.
    onMotionChange: (pref) => motion.setPref(pref),
    // K111: the Accessibility switches. Reduced motion sets the Motion
    // setting's answer, High contrast its own preference; the subscriptions
    // below (applyAccessibility) carry the change to the scene. Neither
    // writes a design param, the link or the undo stack.
    onReducedMotionToggle: (on) =>
      motion.setPref(reducedMotionChoice(on, motion.system)),
    onHighContrastToggle: (on) =>
      contrast.setPref(highContrastChoice(on, contrast.system)),
    onDebugToggle: (visible) => {
      if (scene.debug) scene.debug.container.visible = visible;
    },
    onSlackChange: () => {
      deps.writeParams(params);
      deps.physicsInputsChanged();
      deps.wake();
    },
    onStyleChange: () => {
      scene.renderer?.setWidths(params.threadWidth, look("gap"));
      scene.fabric?.setWidths(params.threadWidth);
      if (scene.fabric && scene.fabricController) scene.fabric.update(scene.fabricController);
      deps.writeParams(params);
      deps.physicsInputsChanged();
      deps.wake();
    },
    onTemperatureChange: () => deps.wake(),
    // Memory-trail mode + trail length apply LIVE: they change only the
    // gameplay interpretation (controller flag) and the paint declaration,
    // never the scene - no rebuild, and no wake (the paint pass runs in the
    // asleep/paused ticker branches).
    onTrailChange: () => {
      if (scene.fabricController) {
        scene.fabricController.trailMode = params.pathViz === "trail";
      }
      if (scene.fabric && scene.fabricController) {
        scene.fabric.trailMode = params.pathViz === "trail";
        scene.fabric.pathViz = params.pathViz;
        scene.fabric.tension = params.tension;
        scene.fabric.trailLength = params.trailLength;
        deps.syncExploration(scene.fabric);
        scene.fabric.update(scene.fabricController);
      }
      deps.updateHud();
      deps.writeParams(params);
    },
    // Look color controls: recolor the live scene in place (the full
    // rebuild they used to trigger reset the knot, replayed the reveal and
    // wiped the player's progress for a hue tweak).
    onRecolor: () => {
      deps.recolorScene();
      // The background wears the design's gamut too.
      deps.syncBackground();
      deps.writeParams(params);
      deps.wake();
    },
    // Background effect / intensity / speed / shape / colors: the layer
    // (and the page color) only - no scene change.
    onBackgroundChange: () => {
      deps.syncBackground();
      deps.writeParams(params);
    },
    backgroundGamutColors: () => gamutAccentHexes(),
    onModeChange: () => {
      // Mode changes alter the graph TOPOLOGY (fabric surgery, color
      // field), which is baked in at build time, so a full rebuild is
      // required rather than a visibility toggle.
      deps.writeParams(params);
      deps.rebuild();
      deps.app.canvas.style.cursor = "default";
      deps.wake();
    },
    onResetPath: () => {
      // A winning move whose dot is still on its way counts: finish it.
      if (deps.pendingWin && scene.fabricController) {
        deps.pendingWin = false;
        scene.fabric?.cancelMove();
        deps.showFabricWin();
      }
      // K47 (game/daily_attempt.ts resetPathAction): inside a daily's
      // attempt - the one that will be official - Reset path is
      // backtracking to the entrance: every run retracted like a tap would
      // (logged, on the backtrack meter), the clock running on. It never
      // restarts the attempt.
      const action = resetPathAction({
        dailyAttempt: deps.dailyAttemptLive(),
        official: deps.dailyN !== null && deps.dailyStore.hasOfficial(deps.dailyN),
        solved: scene.fabricController?.solved ?? false,
        trailMode: scene.fabricController?.trailMode ?? false,
        // K80: a real-time solve always starts over (a fresh chase), and so
        // does one with the turn minotaur (K80 turns, section 2.10: backing
        // out run by run past it would be suicide; a restart, not a catch).
        // K114 call 2: and a burn race (the fuse relit): the way back to the
        // entrance is the way into the fire.
        realtime:
          scene.chase !== null || scene.turnMino !== null || scene.fabricController?.fire != null,
        // K146: so does a practice run (a past daily, not scored).
        practice: deps.attemptLate(),
      });
      if (action === "refuse") {
        showToast("recentPath mode has no way back: keep exploring.");
        return;
      }
      if (action === "backtrack" && scene.fabric && scene.fabricController) {
        scene.fabric.cancelMove();
        const depart = scene.fabricController.head;
        const retraced = scene.fabricController.retreatToStart();
        if (retraced.length > 0) {
          // The fog stays (K100) and lifts along the way back again, each
          // run stamped from the head's end as walking it back by hand
          // would and as a restore of these taps will (exploreRuns).
          scene.fabric.exploreRuns(retraced, depart);
          // The Ariadne string keeps every pass, the way back included.
          scene.fabric.restoreYarn(scene.fabricController.taps);
          scene.fabric.update(scene.fabricController);
          deps.updateHud();
          deps.saveAttempt();
          showToast("Back at the start. The clock keeps running.");
        }
        return;
      }
      // Anywhere else a fresh attempt (a daily's replay or practice run
      // starts over).
      if (deps.dailyN !== null && deps.attemptDaily === deps.dailyN && deps.attemptRecord === null) {
        deps.dailyStore.clearAttempt(deps.dailyN);
      }
      // K80 turns section 2.10 (stage 2): under a minotaur, an unsolved run
      // with a move made restarts COUNTED, not as a catch: the tallies carry
      // to the new minotaur and its `restarts` goes up. Stage 3a: with no
      // move made since the last restart the tallies carry too, uncounted
      // (nothing moved), so a Reset path never launders a catch: before,
      // a catch under minoRestart, or a counted restart, then a Reset path
      // with no move, started a fresh minotaur at 0 catches.
      const c = scene.fabricController;
      const liveMino = scene.chase ?? scene.turnMino;
      if (liveMino && c && !c.solved) {
        const moved = c.moveCount > 0;
        deps.restartSolve(true);
        const m = scene.chase ?? scene.turnMino;
        if (m && moved) m.restarts++;
        deps.updateHud();
        return;
      }
      deps.restartSolve();
    },
    // K80: the maze clock. The graph is the same, so no rebuild: the solve
    // starts over in the new mode (a fresh chase, or none).
    onClockChange: () => {
      deps.writeParams(params);
      deps.restartSolve();
      deps.updateHud();
    },
    // K80: the chase's tuning, live (the chase goes on).
    onChaseChange: () => {
      scene.chase?.setParams(chaseParamsOf(params));
      // K273: the shared catch rows (minoLair) reach the turn minotaur too.
      // Re-committing its next move under unchanged settings decides the
      // same move (its draws are counter-based).
      scene.turnMino?.setConfig(turnConfig(turnMinoParamsOf(params)));
      deps.writeParams(params);
    },
    // K80 turns: the turn minotaur's tuning, live (the solve goes on; its
    // next move is committed again under the new settings).
    onTurnMinoChange: () => {
      scene.turnMino?.setConfig(turnConfig(turnMinoParamsOf(params)));
      deps.writeParams(params);
    },
    // K140: the finish confetti (render-only, live; off drops the pieces
    // still in the air).
    onConfettiChange: () => {
      if (!params.confetti) deps.confetti.clear();
      deps.writeParams(params);
    },
    // K98: the markers' size. One render pass (the start/exit gap slots
    // and the markers) without waking the physics.
    onMarkerSizeChange: () => {
      if (scene.fabric) scene.fabric.markerSize = look("markerSize");
      deps.writeParams(params);
      deps.invalidate();
    },
    onPlayDaily: () => deps.playDaily(todayNumber(), true),
    onShowDailyStats: () => deps.showDailyStats(),
    // K468: a pop of the settings sheet's history entry (Android Back, or the
    // close button handing the entry back): the entry it landed on holds the
    // link from before the sheet opened, so write the design on screen again.
    onSheetBack: () => deps.writeParams(params),
    onAudioChange: () => {
      deps.writeParams(params);
      deps.rebuildAudioMap();
    },
    onVolumeChange: () => {
      deps.writeParams(params);
      synth.setVolume(params.volume);
      synth.setReverb(params.reverb);
      synth.setVoice({
        brightness: params.brightness,
        sustain: params.sustain,
        shimmer: params.shimmer,
        pickPosition: params.pickPosition,
      });
    },
  });

  // K111: an Accessibility switch, or the OS setting behind one, moved.
  // Refresh the flags every `look()` reads, then push the change through the
  // scene without waking the physics: the new palette and route color, the
  // casing gap, the backdrop and page, the markers (the per-frame reads pick
  // up the flow, the fade length and the markers by themselves). The panel's
  // rows are re-read under its own guard and the overridden ones dimmed. This
  // never calls writeParams: an override is a view, not a design change.
  function applyAccessibility(): void {
    a11y.reducedMotion = motion.reduced;
    a11y.highContrast = contrast.high;
    panel.syncAccessibility({
      motion: motion.pref,
      reducedMotion: a11y.reducedMotion,
      highContrast: a11y.highContrast,
    });
    if (scene.renderer && scene.ps) {
      deps.recolorScene();
      scene.renderer.setWidths(params.threadWidth, look("gap"));
    }
    deps.syncBackground();
    if (scene.fabric) scene.fabric.markerSize = look("markerSize");
    panel.markOverridden(overriddenKeys(a11y));
    // One render pass for an asleep or frozen scene (the flow standing still
    // or coming back, the new gap and palette). Every pass hands the
    // renderer the worn fade and flow first (handRendererLook, K239), so the
    // pass solves the crossing cuts with the NEW values.
    deps.invalidate();
  }

  // K239 (the K111 finding, "A renderer finding" part 2): the renderer takes
  // its fade length and flow from the page's params, and the crossing cuts
  // (fade) and the flow displacement are solved INSIDE update(). They used
  // to be handed over by fabricTick, which runs AFTER the frame's update():
  // the first pass of a STATIC page (physics off, or paused, no flow, no
  // reveal - nothing ever redoes it) solved the cuts at the constructor's
  // fade 0, about 28k px off a refreshed frame. This is the one place that
  // does it, and it runs before EVERY update() - the load's first frame, the
  // asleep, frozen and paused passes (an Accessibility toggle's forced pass
  // among them) and the awake step - and in fabricTick for the readers
  // between passes (tickPaint, the pluck footprints, the flow clock). The
  // values are the WORN ones (`look`: Reduced motion holds the flow still,
  // High contrast cuts the crossings crisp).
  // The probe found the same lag in the junction rounding: the renderer's
  // cuspRadius (1) is not the param's (3), update() builds every fan and web
  // from it, and a static fabric page kept the cusp-1 fans (3936 px off a
  // refreshed frame after the fade fix alone). So the other inputs update()
  // and the paint pass read ride along: cuspRadius, the pulse spacing and
  // reach, the hover glow and the appearance FX style.
  // K6-2: change-detecting. The worn values are recomputed every call
  // (look() is cheap), but the renderer is touched - and GEOM pushed -
  // only when one actually changed (a panel edit, an accessibility
  // switch, a probe writing the live params). Before, every frame
  // re-assigned all twelve, so no frame could skip the geometry pass
  // on their account.
  let lookCache: { r: unknown; v: readonly (number | string)[] } | null = null;
  function handRendererLook(): void {
    if (!scene.renderer) return;
    const fadeLength = look("fadeLength");
    const flowStrength = look("flowStrength");
    const flowSpeed = look("flowSpeed");
    const pulseReach =
      params.mazeFabric && params.exploration === "threads"
        ? Math.min(params.pulseReach, params.revealDistance)
        : params.pulseReach;
    const v: readonly (number | string)[] = [
      fadeLength, flowStrength, flowSpeed, params.cuspRadius, params.pulseSpacing,
      pulseReach,
      Math.max(0, Math.min(1, params.hoverGlow)),
      clampHoverGlowWidth(params.hoverGlowWidth),
      clampHoverGlowLength(params.hoverGlowLength),
      clampHoverGlowFade(params.hoverGlowFade),
      a11y.highContrast ? deps.hcLookChoice : 0,
      params.appearFx,
    ];
    if (lookCache !== null && lookCache.r === scene.renderer) {
      let same = true;
      for (let i = 0; i < v.length; i++) if (v[i] !== lookCache.v[i]) { same = false; break; }
      if (same) return;
    }
    lookCache = { r: scene.renderer, v };
    scene.renderer.fadeLength = fadeLength;
    scene.renderer.flowStrength = flowStrength;
    scene.renderer.flowSpeed = flowSpeed;
    scene.renderer.cuspRadius = params.cuspRadius;
    scene.renderer.pulseSpacing = params.pulseSpacing;
    // K76 stage 2c (question 5): under the thread reveal the pulses never
    // reach past the reveal distance.
    scene.renderer.pulseReach = pulseReach;
    scene.renderer.hoverGlow = Math.max(0, Math.min(1, params.hoverGlow));
    scene.renderer.hoverGlowWidth = clampHoverGlowWidth(params.hoverGlowWidth);
    scene.renderer.hoverGlowLength = clampHoverGlowLength(params.hoverGlowLength);
    scene.renderer.hoverGlowFade = clampHoverGlowFade(params.hoverGlowFade);
    scene.renderer.hcLook = a11y.highContrast ? deps.hcLookChoice : 0;
    scene.renderer.appearFx = params.appearFx;
    deps.flags.push(Flag.GEOM); // K6-2: a look change asks for a geometry pass
  }
  motion.subscribe(applyAccessibility);
  contrast.subscribe(applyAccessibility);
  panel.markOverridden(overriddenKeys(a11y));

  const resize = (): void => {
    deps.app.renderer.resize(window.innerWidth, window.innerHeight);
    deps.background.resize(deps.app.screen.width, deps.app.screen.height);
    deps.fitToScreen();
    deps.flags.push(Flag.GEOM | Flag.CAMERA); // K6-1 (shadow)
  };
  window.addEventListener("resize", resize);

  return { panel, applyAccessibility, handRendererLook, resize };
}
