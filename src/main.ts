import { Application, Container } from "pixi.js";

import type { WalkGraph } from "./core/walk_graph";
// K7: main never steps or writes the physics itself - every write goes
// through the PhysicsHost (physics/physics_host.ts); `ps` is its read view.
import type { PhysicsTuning } from "./physics/particle_system";
import { InThreadHost } from "./physics/physics_host";
import type { PhysicsHost } from "./physics/physics_host";
import { WorkerHost } from "./physics/worker_host";
import { FabricMazeRenderer } from "./render/fabric_maze_renderer";
import { EXPLORE_LOOKS } from "./render/explore_glsl";
import { FabricMazeController } from "./game/fabric_controller";
import { finishHold } from "./game/explore_finish";
import { buildFire } from "./game/fire";
import { FireClock } from "./game/fire_clock";
import type { Fire } from "./game/fire";
import { tapWhileMoving } from "./ui/key_moves";
import { MOVE_PAD_KEY, movePadPref } from "./ui/move_pad";

import { MinotaurChase } from "./game/minotaur";
import type { ChaseEvent } from "./game/minotaur";
import { TurnMinotaur, turnConfig, turnSeed } from "./game/minotaur_turns";
import {
  catchNotes,
  footstepPan,
  footstepStrength,
  turnCue,
} from "./game/mino_feedback";
import { firstSmolderIndex, planRoute, routeWarning } from "./game/route_plan";
import { BackgroundLayer } from "./render/background";

import {
  chaseParamsOf,
  clockOf,
  fireSettingsOf,
  turnMinoParamsOf,
  writeParams as writeTokenParams,
} from "./ui/url_state";
import type { UrlParams } from "./ui/url_state";
import {
  DAILY_DEF,
  applyDailyPrefs,
  dailyParams,
  dailyQuery,
  isDailyDesign,
  mergeDailyPrefs,
  parseLaunch,
  sceneTitle,
} from "./ui/daily_link";
import { formatDayDate, todayNumber } from "./game/daily_calendar";
import {
  DailyStore,
  begunLate,
  browserStorage,
} from "./game/daily_store";
import type { DailyResult, SolveRecord } from "./game/daily_store";
import {
  attemptRecord as savedAttemptOf,
  exploredRuns,
  mazeTaps,
  restoreAttempt,
  walkFingerprint,
} from "./game/daily_attempt";
import { SolveClock, efficiencyOf } from "./game/maze_stats";
import { shareText } from "./game/share_text";
import { rateRun, ratingForResult, walkedOf } from "./game/star_rating";
import { LossBanner, MazeHud, WinBanner } from "./ui/maze_hud";
import type { HudSnapshot } from "./ui/maze_hud";
import { ModeBadge, modeBadgeFor } from "./ui/mode_badge";
import {
  HEAD_SHOW_DELAY_S,
  headIndicatorWhy,
  headReturnPlan,
} from "./ui/head_indicator";
import { finishPeekPlan } from "./ui/finish_peek";
import {
  DARK_DISC,
  GLYPH_R,
  OffscreenIndicators,
  indicatorPrefs,
} from "./ui/offscreen_indicators";
import type { IndicatorStyle } from "./ui/offscreen_indicators";
import {
  DEFAULT_GLYPHS,
  markerDotRadiusFor,
  markerGlyphSvgFit,
  markerRadiusFor,
} from "./render/marker_glyphs";
import { ConfettiLayer } from "./render/confetti";
import { confettiPlan, sprayUnit } from "./render/confetti_model";
import { PluckRipples } from "./render/pluck_ripple";
import { startShaderWarmup, warmContextFor } from "./render/shader_warmup";
import { openDailyStats } from "./ui/daily_stats_view";
import { shareOrCopy, showToast } from "./ui/share";
import { SHEET_QUERY } from "./ui/panel_sheet";
import { wirePanel } from "./app/panel_wiring";
import type { PanelSettings } from "./ui/tweakpane_panel";
import {
  UndoStack,
  designKey,
  designState,
  restorePlan,
  undoFlags,
  type DesignState,
} from "./ui/undo_stack";
import { UndoButtons } from "./ui/undo_buttons";
import { MotionSetting, browserMotionQuery } from "./ui/motion";
import {
  ContrastSetting,
  browserContrastQuery,
  effectiveParam,
  type A11yFlags,
  type A11yKey,
} from "./ui/accessibility";
import { KnotSynth } from "./audio/knot_synth";
import { SnoreSfx, fetchSnore } from "./audio/snore_sfx";
import { attachSnoreLink } from "./ui/snore_link";
import { SongScheduler } from "./audio/song_scheduler";
import { createLoader } from "./ui/loader";
import { createStamp } from "./app/stamp";
import { GLYPHS2 } from "./app/glyph_switch";
import { installProbeHooks } from "./app/probe_hooks";
import { createFrameLoop } from "./app/frame_loop";
import { createLoopFlags, Flag } from "./app/loop_flags";
import { createLifecycle } from "./app/lifecycle";
import { BACKGROUND, createScene } from "./app/scene";
import { createAudioMap } from "./app/audio_map";
import { createPointerInput } from "./app/input_pointer";
import { createKeyInput } from "./app/input_keys";
import { createAutoAudio } from "./app/auto_audio";
import {
  FOLLOW_DELAY,
  FOLLOW_RAMP,
  createCamera,
} from "./app/camera";

// The stamp/perf readout's visibility persists per browser.
const STATS_KEY = "knotmaze.showStats";
const MAZE_STATS_KEY = "knotmaze.showMazeStats";
// K73 viewer preferences for the off-screen indicators (both default on;
// K84 sorts every param into preference vs design later).
const FINISH_INDICATOR_KEY = "knotmaze.finishIndicator";
const TAP_TO_PAN_KEY = "knotmaze.tapToPan";


const app = new Application();

async function main(): Promise<void> {
  // THE MOTION SETTING (K53; ui/motion.ts): follow system / full / reduced,
  // a viewer preference. First, so the root's data-motion attribute (the
  // stylesheets' reduced variants) is set before anything animates; every
  // reduced-motion reader below asks motion.reduced.
  const motion = new MotionSetting(
    browserStorage(),
    browserMotionQuery(),
    document.documentElement
  );
  // K111 (ui/accessibility.ts): the Accessibility group's two master
  // switches. Reduced motion IS the Motion setting's answer (it also stills
  // the flow now); High contrast is its own viewer preference. `a11y`
  // mirrors both for the pure effective-settings functions, and
  // applyAccessibility() refreshes it when either moves.
  const contrast = new ContrastSetting(
    browserStorage(),
    browserContrastQuery(),
    document.documentElement
  );
  const a11y: A11yFlags = {
    reducedMotion: motion.reduced,
    highContrast: contrast.high,
  };
  // K111 stage 4 (K265): High contrast's highlight prototype while Levi
  // picks one: 1 contrast, 2 outline, 3 chevrons, anything else today's
  // pulses. Read once from the TEMPORARY link key `hcl` (`?<token>&hcl=2`)
  // before the page rewrites the address bar; the probe hook __knotHcLook
  // switches it live. It shows only while High contrast is on. Not a codec
  // param: stage 5 builds the picked look and removes the key and the hook.
  const hclAsked = Number(new URLSearchParams(window.location.search).get("hcl"));
  let hcLookChoice = hclAsked === 1 || hclAsked === 2 || hclAsked === 3 ? hclAsked : 0;

  // K20/K56: the bare page is today's daily and `?daily...` a daily link
  // (ui/daily_link.ts), opening with the player's stored daily prefs;
  // anything else reads as an ordinary design link.
  const dailyStore = new DailyStore(browserStorage());
  const launch = parseLaunch(
    window.location.search,
    todayNumber(),
    dailyStore.prefs()
  );
  const params = launch.params;

  // K7: the physics host owns the ParticleSystem and every write to it;
  // `ps` is its read view (host.view, reassigned on each build): the
  // renderers, picks and probe hooks read it, and nothing steps, grabs,
  // drags, releases, tugs or resets through it (test/physics/
  // host_seam.test.ts). K7 stage 3: `phw=1` (params.physicsWorker, read
  // once here) runs it in a Web Worker; a worker that cannot start, answer
  // or match falls back in-thread and rebuilds (__knotPerf().host.reason).
  // A browser without Worker gets the WorkerHost's own fallback, so the
  // reason reads "no-worker". K7 stage 5, THE START GATE: the host is made
  // here, before app.init, so the worker's module loads while Pixi starts
  // and main hears the worker is up before the first frame's long task; made
  // after it, the `init` waited behind that task with the worker idle
  // (stage 4: about 300 ms on the desktop). A fallback before the first
  // build never calls rebuild(). K7 stage 7, THE LEVER: the Worker's name
  // carries this design's scene params (`prebuild`), so the worker builds it
  // while main boots, and the first rebuild() adopts that build when the
  // params still match (__knotPerf().host.prebuild).
  const host: PhysicsHost = params.physicsWorker
    ? new WorkerHost(() => rebuild(), {
        // K552: the same title gate as every createScene below, so a daily's
        // prebuild (untitled by default, titled with the pref) is adopted.
        // K115 stage 9: and the #glyphs2 switch, as scene.ts builds it.
        prebuild: { ...params, title: sceneTitle(launch.daily, params), glyphs2: GLYPHS2 },
      })
    : new InThreadHost();

  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    antialias: true,
    preference: "webgl",
    resolution: Math.min(window.devicePixelRatio, 2),
    // Keep the canvas CSS size at logical pixels; without this, any
    // devicePixelRatio > 1 blows the canvas up past the viewport.
    autoDensity: true,
    // TRANSPARENT canvas: crossing gaps alpha-PUNCH the thread layer (the
    // renderer's 'erase'-blend patches), so whatever sits behind the canvas
    // shows through them. Today that is the same flat color as ever, moved
    // to the canvas CSS below; later a textured page backdrop can replace
    // it without touching the renderer.
    backgroundAlpha: 0,
  });
  document.body.appendChild(app.canvas);
  app.canvas.style.background = `#${BACKGROUND.toString(16).padStart(6, "0")}`;

  // K111: a design param as the scene WEARS it under the Accessibility
  // switches (the stored value itself while both are off). Every visual read
  // of a param a switch overrides goes through this; `params`, the link, the
  // daily comparison and the undo stack only ever see the stored values.
  const look = <K extends A11yKey>(key: K) => effectiveParam(params, a11y, key);
  // The daily on screen, or null for an ordinary design. It ends the moment
  // a param other than a preference changes (syncDaily).
  let dailyN: number | null = launch.daily;
  // The player came for TODAY's daily (the bare page, `?daily`, the Daily
  // button) rather than a numbered one: the address bar stays bare.
  let dailyFloating = launch.floating;
  // K92 (ui/undo_stack.ts): the design history the undo and redo buttons
  // walk. Every design the page writes is recorded where it writes the
  // address bar, the first write (the first build) starting the history;
  // nothing while an undo or redo puts one back, nor mid-drag (the release
  // records the drag once).
  const liveDesign = (): DesignState => designState(params, dailyN, dailyFloating);
  let undoStack: UndoStack<DesignState> | null = null;
  let undoRestoring = false;
  let panelMidDrag = (): boolean => false;
  let syncUndoButtons = (): void => {};
  // Every URL write: on a daily the address bar is bare (today's, as asked
  // for) or `?daily=<n>`; a param change that leaves the daily is caught
  // first (syncDaily), and the page becomes an ordinary design link.
  const writeParams = (p: UrlParams): void => {
    syncDaily();
    if (dailyN !== null) {
      const q = dailyQuery(dailyN, dailyFloating ? todayNumber() : undefined);
      history.replaceState(null, "", q === "" ? location.pathname : `?${q}`);
    } else {
      writeTokenParams(p);
    }
    if (undoStack === null) undoStack = new UndoStack(liveDesign(), designKey);
    else if (!undoRestoring && !panelMidDrag()) undoStack.commit(liveDesign());
    syncUndoButtons();
  };
  let statsShown = false;
  let mazeStatsShown = false;
  let finishIndicatorShown = true;
  let tapToPan = true;
  // K198 stage 2: the head's and the minotaur's switches and the size.
  let indPrefs = indicatorPrefs(() => null);
  // K120: the move pad, on by default for coarse pointers.
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  let movePadOn = movePadPref(null, coarsePointer);
  try {
    movePadOn = movePadPref(localStorage.getItem(MOVE_PAD_KEY), coarsePointer);
    statsShown = localStorage.getItem(STATS_KEY) === "1";
    // Opt-in since 2026-10-12 (Levi: the win banner carries the stats).
    mazeStatsShown = localStorage.getItem(MAZE_STATS_KEY) === "1";
    finishIndicatorShown = localStorage.getItem(FINISH_INDICATOR_KEY) !== "0";
    tapToPan = localStorage.getItem(TAP_TO_PAN_KEY) !== "0";
    indPrefs = indicatorPrefs((k) => localStorage.getItem(k));
  } catch {
    // Storage unavailable: the defaults (both stats readouts hidden, the
    // finish indicator shown and tappable).
  }
  const settings: PanelSettings = {
    temperature: 0,
    showDebug: false,
    muted: false,
    showStats: statsShown,
    showMazeStats: mazeStatsShown,
    finishIndicator: finishIndicatorShown,
    headIndicator: indPrefs.head,
    minotaurIndicator: indPrefs.minotaur,
    indicatorSize: indPrefs.scale,
    tapToPan,
    movePad: movePadOn,
    motion: motion.pref,
    reducedMotion: motion.reduced,
    highContrast: contrast.high,
  };
  const synth = new KnotSynth();
  // K325: the snoring cat's snore, played by the panel's "Made by Snoring
  // Cat" link on hover and touch-down. Silent when the game is (muted, sound
  // mode none, volume 0); the file loads when the panel shows, not at page
  // load (.claude/rules/gameplay-audio.md).
  const snore = new SnoreSfx({
    host: synth,
    enabled: () =>
      !settings.muted && params.soundMode !== "none" && params.volume > 0,
    load: () => fetchSnore(`${import.meta.env.BASE_URL}snoring-cat-snore.mp3`),
  });

  // SHADER BACKGROUND (K21): a screen-fixed layer drawn FIRST, beneath the
  // world root (crossing gaps show it). Phones get the cheaper profile
  // (lower texture resolution, lower drift rate).
  const background = new BackgroundLayer(
    app.renderer,
    typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse), (max-width: 700px)").matches
  );
  app.stage.addChild(background.container);
  background.resize(app.screen.width, app.screen.height);

  const root = new Container();
  app.stage.addChild(root);
  // K279: pluck ripples - a filter on the world container while one lives.
  const ripples = new PluckRipples(root, () => app.screen);
  // K307: THE SHADER WARM-UP (render/shader_warmup.ts, lore:
  // render-shaders.md). Wave 1, what this mode's intro draws, links now
  // (late-enable, polled), in parallel with the hidden pre-settle; the
  // first visible frame waits for it (presettleTick's mayFinish,
  // beginSettle's instant hold). Until then the background draws nothing
  // (pixi would link it cold), and the ripple pools its texture after
  // (K279 stage 2; its program is wave 1's).
  const warmup = startShaderWarmup(app.renderer, (n) =>
    warmContextFor(params, look("background"), motion.reduced, n)
  );
  background.container.renderable = false;
  warmup.afterWave1(() => {
    background.container.renderable = true;
    ripples.warm(app.stage);
  });

  // K140 FINISH CONFETTI (render/confetti.ts): two particle layers over the
  // world root - the world-space spray around the exit, then the
  // screen-space rain on top. Render-only (never wakes the physics), no
  // pointer events, and the win banner and HUD are DOM above the canvas.
  const confetti = new ConfettiLayer();
  app.stage.addChild(confetti.sprayContainer, confetti.rainContainer);

  // K80's real-time mode (params.clock "realtime"): the chase over the walk
  // graph (game/minotaur.ts), built with the fabric. Its clock starts at the
  // player's first accepted tap (chaseRunning) and stops at the finish.
  let chaseRunning = false;
  // K80 TURNS: the turn-aligned minotaur (params.minotaur under the turn
  // clock, game/minotaur_turns.ts), built with the fabric. Every accepted
  // move is a turn, and so is a wait (a tap on your own junction); its run
  // plays over the player's move animation, a wait's over turnWaitDur.
  let turnWait = 0; // Seconds left of a wait's animation (0: none).
  // K481 stage 2: a by-length catch waiting for its contact moment in the
  // move (or wait) animation; turnCaught runs when progress reaches it.
  let pendingTurnCatch: { tm: TurnMinotaur; t: number; wait: boolean } | null = null;
  let turnWaitDur = 0;
  // K80 turns 3a: the head's WAIT CUE (setWaitCue) - while the pointer is
  // in the wait zone the head wears the "hourglass" glyph; this is the glyph
  // it wore before (null: no cue), which the head's indicator keeps.
  let waitCueGlyph: string | null = null;
  let waitCueFabric: FabricMazeRenderer | null = null;
  let waitCueHead: string | null = null;
  // The minotaur on screen, whichever clock moves it.
  const liveMino = (): MinotaurChase | TurnMinotaur | null => scene.chase ?? scene.turnMino;
  // K114 BURN RACE (game/fire.ts): the fire for walk graph `w` under the
  // params on screen, or null (off, real time, or the turn minotaur on:
  // fireSettingsOf). The controller's `fire`; a change restarts the solve.
  const fireOf = (w: WalkGraph): Fire | null => {
    const s = params.mazeFabric ? fireSettingsOf(params) : null;
    return s ? buildFire(w, s.speed, s.delay, s.clock) : null;
  };
  // Set when a losing move lands; the Burnt banner waits for the dot.
  let pendingLoss = false;
  // K114 stage 2: the real-time fire's clock (game/fire_clock.ts), run by
  // tickFire while the race runs; a rebuild and restartSolve reset it.
  const fireClock = new FireClock();
  const realtimeFire = (): boolean => scene.fabricController?.fire?.clock === "realtime";
  // K480 (stage 1): a multi-run tap's route still to walk (the run in
  // flight is not in it), the solve it belongs to, the real-time chase's
  // route tail, and whether the last moveAlong move started the turn
  // minotaur hunting (the stop rules read them; the machinery is below,
  // by handleFabricTap).
  let routeRuns: number[] = [];
  let routeFc: FabricMazeController | null = null;
  let chaseRoute: number[] = [];
  let moveHuntWas = false;
  // The physics host (`host`) is made before app.init (K7 stage 5's start
  // gate, above).
  // K5 M4: the scene `let`s (ps, the renderers, the walk graph, the fabric,
  // the minotaurs, the controller and the reveal) and their build (rebuild,
  // recolorScene, syncBackground and the page ink) are src/app/scene.ts.
  // `scene` reads the `let`s through getters (src/app/scene_ref.ts): never
  // destructure those or cache a value read through them. The three
  // functions never change, so main.ts destructures them.
  // K6-1 (question 6): the frame loop's flag ledger, created first and
  // passed down (the camera, the frame loop, the probe hooks).
  const flags = createLoopFlags();
  const scene = createScene({
    dailyTitle: () => sceneTitle(dailyN, params),
    app,
    root,
    params,
    look,
    host,
    settings,
    background,
    confetti,
    ripples,
    fireOf,
    fireClock,
    syncExploration,
    writeParams,
    rebuildAudioMap: () => rebuildAudioMap(),
    syncDaily: () => syncDaily(),
    saveAttempt: () => saveAttempt(),
    restartChase: () => restartChase(),
    resetAttempt: () => resetAttempt(),
    hideWin: () => hideWin(),
    restoreSavedAttempt: () => restoreSavedAttempt(),
    beginSettle: () => beginSettle(),
    beginLoading: () => beginLoading(),
    setCamFollow: (on) => setCamFollow(on),
    fitToScreen: () => fitToScreen(),
    get view() {
      return view;
    },
    get camera() {
      return camera;
    },
    get indicators() {
      return indicators;
    },
    get pendingWin() {
      return pendingWin;
    },
    set pendingWin(v) {
      pendingWin = v;
    },
    get pendingLoss() {
      return pendingLoss;
    },
    set pendingLoss(v) {
      pendingLoss = v;
    },
  });
  const { syncBackground } = scene;
  // K6-1: a recolor or a rebuild pushes its flags (shadow: recorded only).
  const recolorScene = (): void => {
    scene.recolorScene();
    flags.push(Flag.GEOM);
  };
  const rebuild = (): void => {
    scene.rebuild();
    flags.push(Flag.LOAD | Flag.GEOM);
  };

  const physicsTuning = (): PhysicsTuning => ({
    // Physics off never agitates: temperature would keep it from settling.
    temperature: params.physics ? settings.temperature : 0,
    slack: params.slack,
    drag: params.drag,
    repulsion: params.repulsion,
    bend: params.bend,
    smooth: params.smooth,
    stiffness: params.stiffness,
    gridAlign: params.gridAlign,
    threadWidth: params.threadWidth,
  });
  const loader = createLoader();

  // K101: music mode's notes, on the audio clock once it runs.
  const songSched = new SongScheduler();
  // K5 M4: the audio map (Stage 20's per-segment pitches, the walk runs a
  // pluck looks up, the auto plucks' sites) is src/app/audio_map.ts.
  // autoAudioTick reads its `let`s through getters on `audioMap`, never
  // destructured; its functions never change, so main.ts destructures them.
  const audioMap = createAudioMap({ params, synth, songSched }, scene);
  const { rebuildAudioMap, freqForCtrl, pluckUnit } = audioMap;

  // K5 M2: the camera (the eased fit, the follow camera, placeWorldAt, the
  // K198 pan range, the panel's tween) is src/app/camera.ts. The `let`s
  // other regions read or write are `camera.<name>`, never destructured.
  const camera = createCamera({ app, root, params, motion, flags }, scene);
  const {
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
  } = camera;
  // K76 stage 2c: the exploration mode onto the fabric - the fog of war's
  // switch and radius, and the thread reveal's switch, reach, fade (never
  // longer than the reach: the design's sanitize) and end look.
  function syncExploration(f: FabricMazeRenderer): void {
    f.fogOfWar = params.exploration === "fog";
    f.fowRadius = params.fowRadius;
    const ex = f.explore;
    ex.on = params.exploration === "threads";
    ex.reach = params.revealDistance;
    ex.fade = Math.min(params.revealFade, params.revealDistance);
    const li = (EXPLORE_LOOKS as readonly string[]).indexOf(params.revealLook);
    if (li >= 0) ex.look = li;
    f.burntLook = params.burnt; // K290: how burnt runs draw
    f.revealFinish = params.revealFinish; // K465: the finish under the reveal
    ex.endCross = params.revealEndCross; // K466: an end under a crossing
    ex.endGlow = params.revealEndGlow; // K466: the ends' halo
  }
  // How long a follow camera stays on a framing an indicator's tap moved it
  // to, beyond the usual FOLLOW_DELAY, before it eases back to the head.
  const PEEK_HOLD = 1.3;

  // K5 M4: the load and settle lifecycle (the appearance's start, the
  // physics-off load, the K147 pre-settle and K307's warm-up hold, the
  // physics toggle) is src/app/lifecycle.ts. Its `let`s are getters on
  // `life` (life.state is physState), never destructured.
  const life = createLifecycle(
    {
      params,
      host,
      root,
      warmup,
      loader,
      physicsTuning,
      handRendererLook: () => handRendererLook(),
      fitToScreen,
      wake: () => wake(),
      get indicators() {
        return indicators;
      },
      get loop() {
        return loop;
      },
      get perfLine() {
        return perfLine;
      },
      set perfLine(v) {
        perfLine = v;
      },
      get reveal() {
        return scene.reveal;
      },
      set reveal(v) {
        scene.reveal = v;
      },
    },
    scene
  );
  const {
    beginLoading,
    loadingTick,
    replaySettle,
    beginSettle,
    presettleTick,
    warmHoldTick,
    freeze,
    applyPhysicsMode,
    physicsInputsChanged,
    physicsLive,
  } = life;

  // K5 M5: the panel wiring (the buildPanel callbacks, applyAccessibility,
  // handRendererLook, the resize listener) is src/app/panel_wiring.ts. Its
  // session callbacks run only from user actions, after every closure
  // below exists, so they come in as closures that read the current
  // bindings at call time.
  const { panel, handRendererLook } = wirePanel(
    {
      app,
      params,
      settings,
      motion,
      contrast,
      a11y,
      look,
      synth,
      confetti,
      background,
      dailyStore,
      flags,
      statsKey: STATS_KEY,
      mazeStatsKey: MAZE_STATS_KEY,
      finishIndicatorKey: FINISH_INDICATOR_KEY,
      tapToPanKey: TAP_TO_PAN_KEY,
      rebuild,
      recolorScene,
      syncBackground,
      syncExploration,
      writeParams,
      wake: () => wake(),
      invalidate: () => invalidate(),
      replaySettle,
      applyPhysicsMode,
      physicsInputsChanged,
      rebuildAudioMap,
      fitToScreen,
      updateHud: () => updateHud(),
      showFabricWin: () => showFabricWin(),
      restartSolve: (carry) => restartSolve(carry),
      playDaily: (n, floating) => playDaily(n, floating),
      showDailyStats: () => showDailyStats(),
      saveAttempt: () => saveAttempt(),
      dailyAttemptLive: () => dailyAttemptLive(),
      attemptLate: () => attemptLate(),
      get stampEl() {
        return stamp;
      },
      get dailyN() {
        return dailyN;
      },
      get attemptDaily() {
        return attemptDaily;
      },
      get attemptRecord() {
        return attemptRecord;
      },
      get hcLookChoice() {
        return hcLookChoice;
      },
      get pendingWin() {
        return pendingWin;
      },
      set pendingWin(v) {
        pendingWin = v;
      },
    },
    scene
  );
  camera.panelWrap = panel.pane.element.parentElement; // K198 (display none closed).
  synth.setVolume(params.volume);
  synth.setReverb(params.reverb);
  synth.setVoice({
    brightness: params.brightness,
    sustain: params.sustain,
    shimmer: params.shimmer,
    pickPosition: params.pickPosition,
  });

  // K5 M6: pointer input (picking, the bounded tug, tap plucks, the
  // canvas gestures) is src/app/input_pointer.ts. The session functions
  // declared below and the frame loop's wake come in as closures, read
  // at call time; the drag state is `pointer`'s (the frame loop reads
  // it through there).
  const pointer = createPointerInput(
    {
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
      wake: () => wake(),
      isLoading: () => life.state === "loading",
      placeWorldAt,
      touchCamera,
      zoomAt,
      panBy,
      resetCamera,
      nowSec,
      handleFabricTap: (x, y, pt) => handleFabricTap(x, y, pt),
      inWaitZone: (x, y) => inWaitZone(x, y),
      setWaitCue: (on) => setWaitCue(on),
      tapReach: () => tapReach(),
    },
    scene
  );
  const { pickRadius, startRipple, tugAt } = pointer;

  // ---- K19 MAZE STATS + K20 DAILY + K47 SAVED ATTEMPTS + K56 ------------
  // The HUD (top-left) and the win banner live in ui/maze_hud.ts; the
  // metrics' definitions in game/maze_stats.ts. The solve clock runs from
  // the first move to the dot's arrival at the exit, hidden time excluded.
  // A DAILY attempt is saved as it goes (after every move, when the page
  // hides or goes, every few seconds while the clock runs, before a
  // rebuild) and restored whenever its daily opens - a reload is no fresh
  // start. Leaving the daily (syncDaily) parks it.
  const clock = new SolveClock();
  // The current attempt: the daily it counts for (fixed at its first move;
  // null = none, or a daily since left), the player's local daily number
  // and the time at that first move (an attempt begun after its day is
  // practice, K146), and what its finish recorded.
  let attemptDaily: number | null = null;
  let attemptDay = 0;
  let attemptStartedAt = 0;
  let attemptRecord: SolveRecord | null = null;
  // A restored attempt's explored runs (every tap since its restart, K100),
  // for the fog of war once the scene is on screen (null = nothing pending).
  let pendingExplored: number[] | null = null;
  // The savedAt of the attempt record this tab last wrote or restored: a
  // newer one was written by another tab (adoptOtherTab).
  let attemptSyncedAt = 0;
  // Set while a rebuild adopts another tab's attempt: its save must not
  // write this tab's older state over it.
  let adopting = false;
  // The last finish, for the banner's Share button.
  let lastWin: { text: string; url: string } | null = null;

  // K146: is the solve on screen a PRACTICE run - a daily begun after its
  // day? An attempt under way (restored ones included) began on its own
  // attemptDay; before the first move, playing on would begin today.
  const attemptLate = (): boolean => {
    if (dailyN === null) return false;
    const began =
      attemptDaily === dailyN && clock.started ? attemptDay : todayNumber();
    return begunLate(dailyN, began);
  };

  const hud = new MazeHud();
  const banner = new WinBanner(
    () => void shareResult(lastWin),
    () => showDailyStats(),
    () => fitModeBadge()
  );
  // K114 call 1: a lost burn race's banner; its button (and a tap on the
  // maze) restarts with the fuse relit.
  const lossBanner = new LossBanner(
    () => {
      restartSolve();
      updateHud();
    },
    () => fitModeBadge()
  );
  const hideWin = (): void => {
    banner.hide();
    if (lossBanner.shown) lossBanner.hide();
  };
  // K73 + K151 MODE BADGE (ui/mode_badge.ts): what the solve on screen is,
  // left of the hamburger. "Free play" off the daily (a tap = the panel's
  // Daily button, so an X fades in), "Daily #N" on the attempt that counts
  // (a tap opens the daily stats - the HUD title's job before K151),
  // "Replay" and "Practice" on runs that don't (a tap explains). It keeps
  // clear of the HUD and the banner (fit).
  const modeBadge = new ModeBadge({
    free: () => playDaily(todayNumber(), true),
    daily: () => showDailyStats(),
    explain: (tip) => showToast(tip, 4500),
  });
  // K468: on the open settings sheet the badge sits in the top bar, over the
  // HUD and the banners (the sheet covers them), so it avoids none.
  const sheetMQ = window.matchMedia(SHEET_QUERY);
  const fitModeBadge = (): void =>
    modeBadge.fit(
      panel.isOpen() && sheetMQ.matches ? [] : [hud.el, banner.el, lossBanner.el]
    );
  window.addEventListener("resize", fitModeBadge);
  // K92 UNDO AND REDO (ui/undo_buttons.ts): beside the hamburger while the
  // panel is open, the badge on the row below them then (so it re-fits).
  const undoButtons = new UndoButtons({
    undo: () => undoDesign(),
    redo: () => redoDesign(),
  });
  syncUndoButtons = () => {
    if (undoStack) undoButtons.set(undoFlags(undoStack, liveDesign()));
  };
  panelMidDrag = () => panel.midDrag();
  panel.onOpenChange(() => fitModeBadge());
  // K325: the credit link snores on hover and touch-down, and a touch tap
  // opens it a beat later. The file loads when the panel shows; a panel that
  // starts open (the desktop default) waits for an idle moment first.
  attachSnoreLink(panel.studioLink, snore);
  panel.onOpenChange((open) => {
    if (open) snore.preload();
  });
  if (panel.isOpen()) {
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(() => snore.preload(), { timeout: 4000 });
    } else {
      window.setTimeout(() => snore.preload(), 2000);
    }
  }
  const syncModeBadge = (): void => {
    modeBadge.set(
      modeBadgeFor({
        daily: dailyN,
        official: dailyN !== null && dailyStore.hasOfficial(dailyN),
        record: attemptRecord,
        late: attemptLate(),
      }),
      dailyN,
      todayNumber(),
      attemptRecord === "official"
    );
    fitModeBadge();
  };

  // K73 OFF-SCREEN INDICATORS (ui/offscreen_indicators.ts): gameplay
  // targets register there, and while one is off screen a disc at the
  // screen's edge points the way. The module places them (clear of the
  // chrome and of each other) and draws them; indicators.update() runs in
  // fabricTick after the camera step, so in every ticker branch. The finish
  // is the first client (below); the player's head (K148) and the minotaur
  // (K80) follow it.
  const menuButton = document.querySelector(".kp-menu");
  const indicators = new OffscreenIndicators({
    view: () => ({ x: root.position.x, y: root.position.y, s: root.scale.x }),
    size: () => ({ w: app.screen.width, h: app.screen.height }),
    avoid: () => [
      hud.el,
      banner.el,
      modeBadge.el,
      menuButton,
      undoButtons.el, // K92 (display none closed).
      // (The panel: env.panel below, K198 stage 2.)
      stamp,
      document.querySelector<HTMLElement>(".km-pad"), // K120 (hidden: none).
    ],
    // The tap-to-pan preference: off, indicators let taps through.
    tapEnabled: () => settings.tapToPan,
    // K198 stage 2: the size setting, and the panel on the camera's clock
    // (displaced indicators slide to their new place as its edge moves).
    scale: () => settings.indicatorSize,
    panel: () => ({ box: camera.panelBox, open: camera.panelT }),
  });
  // Start an eased move that puts world (x1, y1) at the screen's center at
  // scale s1 (placeWorldAt clamps it every frame); see camTween.
  const startCamTween = (
    x1: number,
    y1: number,
    s1: number,
    dur: number,
    hold: number,
    backDur?: number
  ): void => {
    const s0 = root.scale.x;
    const x0 = (app.screen.width / 2 - root.position.x) / s0;
    const y0 = (app.screen.height / 2 - root.position.y) / s0;
    camera.camTween = {
      t: 0,
      dur,
      s0,
      x0,
      y0,
      s1,
      x1,
      y1,
      hold,
      // K488: with a back duration the tween is the finish's peek: free
      // of the fit clamp, holding at its target, then easing back here.
      ...(backDur !== undefined
        ? { free: true, back: { x: x0, y: y0, s: s0, dur: backDur } }
        : {}),
    };
  };
  // A tap on the minotaur's indicator: ease the camera to frame it - and
  // the head, as far as the zoom allows (placeWorldAt clamps the zoom-out:
  // the home view in fit mode, the whole knot in follow mode, which then
  // holds the framing a moment before it eases back to the head). The
  // finish's tap peeks instead (peekFinish below, K488).
  const frameWorld = (wx: number, wy: number): void => {
    let minX = wx;
    let maxX = wx;
    let minY = wy;
    let maxY = wy;
    if (scene.fabric && scene.fabric.headPosition(headScratch)) {
      minX = Math.min(minX, headScratch[0]);
      maxX = Math.max(maxX, headScratch[0]);
      minY = Math.min(minY, headScratch[1]);
      maxY = Math.max(maxY, headScratch[1]);
    }
    const pad = 1.5;
    const margin = 70;
    const w = app.screen.width;
    const h = app.screen.height;
    const s0 = root.scale.x;
    const sFit = Math.min(
      Math.max(1, w - 2 * margin) / (maxX - minX + 2 * pad),
      Math.max(1, h - 2 * margin) / (maxY - minY + 2 * pad)
    );
    startCamTween(
      (minX + maxX) / 2,
      (minY + maxY) / 2,
      Math.min(s0, sFit),
      motion.reduced ? 0 : 0.6,
      PEEK_HOLD
    );
  };
  // THE FINISH (the exit marker). Shown in fabric mode with the
  // finishIndicator preference on, unsolved, once the intro has revealed
  // the exit (fabric draws the marker past the same 0.98), under fog of
  // war too (Levi, 2026-10-13: direction only - the exit's place follows
  // from the design anyway). A tap frames it; under fog it only says which
  // way. finishWhy says why it hides (probes).
  const exitVertex = (): { chain: number; ctrl: number } | null => {
    if (!params.mazeFabric || !scene.walkGraph) return null;
    return scene.walkGraph.vertices.get(scene.walkGraph.exit) ?? null;
  };
  const exitScratch = new Float32Array(2);
  let finishWhy = "init";
  // The exit marker's glyph (K83) in the indicator's glyph box. icon() is
  // read every frame while shown, so the markup is built once per glyph.
  let finishIconId = "";
  let finishIconSvg = "";
  const finishIcon = (): string => {
    const id = scene.fabric?.markerGlyphId("exit") ?? DEFAULT_GLYPHS.exit;
    if (id !== finishIconId) {
      finishIconId = id;
      finishIconSvg = markerGlyphSvgFit(id, "exit", GLYPH_R, DARK_DISC.ink);
    }
    return finishIconSvg;
  };
  // K488: a tap on the finish's indicator peeks at the exit: ease out
  // to frame it (ui/finish_peek.ts), hold, and ease back to this view.
  // Under fog the tap only toasts (the onTap below).
  const peekFinish = (): void => {
    const v = exitVertex();
    if (!v || !scene.renderer) return;
    scene.renderer.markerWorld(v.chain, v.ctrl, exitScratch);
    const plan = finishPeekPlan({
      exit: { x: exitScratch[0], y: exitScratch[1] },
      scale: root.scale.x,
      followScale: followScale(),
      reduced: motion.reduced,
    });
    startCamTween(plan.x, plan.y, plan.s, plan.dur, plan.hold, plan.backDur);
  };
  const finishIndicator = indicators.add({
    id: "finish",
    world: (out) => {
      const v = exitVertex();
      if (!v || !scene.renderer) return false;
      // Where fabric draws the marker: the renderer's own sample.
      scene.renderer.markerWorld(v.chain, v.ctrl, out);
      return true;
    },
    // The exit marker's own radius: its colored dot (K98), the outermost
    // thing it draws (FabricMazeRenderer.markerDotRadius).
    radius: () =>
      scene.fabric?.markerDotRadius() ??
      markerDotRadiusFor(params.threadWidth, look("markerSize")),
    icon: finishIcon,
    style: DARK_DISC,
    visible: () => {
      const v = exitVertex();
      finishWhy = !settings.finishIndicator
        ? "setting off"
        : !v || !scene.renderer || !scene.fabric || !scene.fabricController
          ? "no maze"
          : scene.fabricController.solved
            ? "solved"
            : !root.visible || life.state === "loading"
              ? "loading"
              : // The exit marker's own rule (explore_finish.ts, one place
                // for the three sites): the appearance has reached the exit,
                // and, K76 stage 2c (decision 6), the thread reveal has
                // shown it - unless K465's revealFinish lifts that hold.
                finishHold({
                  introMul: scene.renderer.revealMulAtCtrl(v.chain, v.ctrl),
                  exploreVis: scene.renderer.exploreVisAt(v.chain, v.ctrl),
                  lifted: scene.fabric.exitLifted(),
                });
      return finishWhy === "";
    },
    label: () =>
      params.exploration === "fog"
        ? "The exit lies this way, still under the fog."
        : settings.tapToPan
          ? "The exit is off screen, this way. Tap to peek at the exit."
          : "The exit is off screen, this way.",
    onTap: () => {
      if (params.exploration === "fog") {
        showToast("The exit lies this way. Explore to lift the fog.", 3000);
        return;
      }
      peekFinish();
    },
  });
  // K76 (Decision 6): until the exit marker has been seen, the finish's
  // indicator would give its direction away; visible() above holds it back
  // ("exit unseen") under the thread reveal. K465 (Levi, 2026-10-15): not by
  // default - `revealFinish` shows the marker, its gap and this indicator
  // from the start, and off keeps the hold.
  void finishIndicator;

  // THE PLAYER (K148; Levi, 2026-10-13: "When panning away from the
  // current position, we should also show an offscreen indicator for it."):
  // the head dot, wearing K83's head glyph, whenever it is off screen in a
  // maze - during play, after a finish, and under fog (it is where you
  // are). No viewer setting of its own (the finish's hides a direction;
  // this hides nothing); tapToPan alone decides whether it takes taps. A
  // tap brings the head back (returnToHead). headWhy says why it hides
  // (probes). Registered after the finish, before the minotaur.
  let headWhy = "init";
  let headIconId = "";
  let headIconSvg = "";
  const headIcon = (): string => {
    const id = waitCueGlyph ?? scene.fabric?.markerGlyphId("head") ?? DEFAULT_GLYPHS.head;
    if (id !== headIconId) {
      headIconId = id;
      headIconSvg = markerGlyphSvgFit(id, "head", GLYPH_R, DARK_DISC.ink);
    }
    return headIconSvg;
  };
  // A tap on the head's indicator (ui/head_indicator.ts holds the plan):
  // the fit camera centers the head at the zoom the player is at (the
  // clamp keeps what it must); the follow camera eases onto its follow
  // framing of the head and resumes the follow the moment it lands - the
  // pan that suspended the spring is over.
  const returnToHead = (): void => {
    if (!scene.fabric || !scene.fabric.headPosition(headScratch)) return;
    const plan = headReturnPlan({
      follow: camera.camFollow,
      head: { x: headScratch[0], y: headScratch[1] },
      scale: root.scale.x,
      followScale: followScale(),
      intro: introPlaying(),
      reduced: motion.reduced,
      followSettle: FOLLOW_DELAY + FOLLOW_RAMP,
    });
    if (plan.tween) {
      startCamTween(plan.x, plan.y, plan.s, plan.dur, plan.hold);
    } else {
      camera.camTween = null;
    }
    if (plan.resume) camera.camTouchedAt = -1e9; // Full-strength pull at once.
    camera.viewHoming = false;
  };
  indicators.add({
    id: "head",
    world: (out) => !!scene.fabric && scene.fabric.headPosition(out),
    // The head marker's radius: the one disc radius every marker wears
    // (K83; sized by markerSize since K98).
    radius: () =>
      scene.fabric?.markerRadius() ??
      markerRadiusFor(params.threadWidth, look("markerSize")),
    icon: headIcon,
    style: DARK_DISC,
    visible: () => {
      headWhy = headIndicatorWhy({
        mazeFabric: params.mazeFabric,
        built: !!scene.fabric && !!scene.fabricController && !!scene.renderer,
        shown: root.visible && life.state !== "loading",
        enabled: settings.headIndicator,
      });
      return headWhy === "";
    },
    // K198 stage 2: no blips (a follow camera a long run outpaces).
    showDelay: () => HEAD_SHOW_DELAY_S,
    label: () =>
      settings.tapToPan
        ? "Your position is off screen, this way. Tap to bring it into view."
        : "Your position is off screen, this way.",
    onTap: returnToHead,
  });

  // THE MINOTAUR (K80, the real-time mode): a dark red disc wearing its
  // marker's glyph, once it has left its lair (in the lair it sits on the
  // finish, which has an indicator of its own) and only where fabric draws
  // it over the fog (minoFog): an indicator must not give away a hidden
  // minotaur. A tap frames it with the head. Not tied to the
  // finishIndicator preference (K84 sorts the viewer prefs).
  const MINO_DISC: IndicatorStyle = { disc: "#7a0c0c", ink: "#fff" };
  const minoScratch = new Float32Array(2);
  let minoIconSvg = "";
  indicators.add({
    id: "minotaur",
    world: (out) => liveMino() !== null && !!scene.fabric && scene.fabric.minotaurWorld(out),
    radius: () =>
      scene.fabric?.minotaurRadius() ??
      markerRadiusFor(params.threadWidth, look("markerSize")),
    icon: () =>
      minoIconSvg ||
      (minoIconSvg = markerGlyphSvgFit(
        DEFAULT_GLYPHS.minotaur,
        "minotaur",
        GLYPH_R,
        MINO_DISC.ink
      )),
    style: MINO_DISC,
    // K80 turns: the turn minotaur's too, on the same terms.
    visible: () =>
      settings.minotaurIndicator && // K198 stage 2: the viewer's switch.
      (liveMino()?.finished === false) &&
      liveMino()!.mode !== "lair" &&
      !!scene.fabric &&
      !scene.fabric.minotaurUnderFog &&
      scene.fabric.minotaurWorld(minoScratch),
    label: () =>
      settings.tapToPan
        ? "The minotaur is off screen, this way. Tap to bring it into view."
        : "The minotaur is off screen, this way.",
    onTap: () => {
      if (scene.fabric?.minotaurWorld(minoScratch)) {
        frameWorld(minoScratch[0], minoScratch[1]);
      }
    },
  });

  // (K151: the daily's name, date and state moved from the HUD's title row
  // to the mode badge - ui/mode_badge.ts modeBadgeText.)
  const hudSnapshot = (): HudSnapshot | null => {
    if (!params.mazeFabric || !scene.fabricController) return null;
    const c = scene.fabricController;
    return {
      showStats: settings.showMazeStats,
      timeMs: clock.elapsed(performance.now()),
      path: c.pathLength,
      optimal: c.walk.optimalLength,
      // A finished route's metric: shown from the arrival on.
      efficiency:
        c.solved && clock.state === "stopped"
          ? efficiencyOf(c.walk.optimalLength, c.pathLength)
          : null,
      // Memory-trail mode has no backtracking, so no backtrack meter.
      backtrack: params.pathViz === "trail" ? null : c.backtrackDist,
      junctions: c.visitedJunctions.size,
      deadEnds: params.deadEndDensity > 0 ? c.deadEndTips.size : null,
      // K80: times caught so far (null: no minotaur).
      catches: liveMino()?.catches ?? null,
      // K80 turns stage 2: the turn minotaur's close calls and turns seen
      // (null on real time), and the Reset-path restarts on either clock.
      closeCalls: scene.turnMino ? scene.turnMino.closeCalls : null,
      seen: scene.turnMino ? scene.turnMino.seen : null,
      restarts: liveMino()?.restarts ?? null,
      // K114: the fire's lead at your junction while the race runs, the
      // closest call once it is over (null: no fire).
      fireLead: c.fire && !c.solved && !c.fireLost ? c.fireLeadHere : null,
      closestCall: c.fire && (c.solved || c.fireLost) ? c.fireClosest : null,
    };
  };
  // The HUD and the mode badge (it re-fits around the HUD's new size).
  const updateHud = (): void => {
    hud.render(hudSnapshot());
    syncModeBadge();
  };

  // A fresh attempt (rebuild, Reset path): clock idle, nothing recorded.
  const resetAttempt = (): void => {
    clock.reset();
    attemptDaily = null;
    attemptRecord = null;
    pendingExplored = null;
    lastWin = null;
    updateHud();
  };

  // K47: is the solve on screen the daily's unfinished attempt (the one
  // that is saved)?
  const dailyAttemptLive = (): boolean =>
    dailyN !== null &&
    attemptDaily === dailyN &&
    attemptRecord === null &&
    scene.fabricController !== null &&
    clock.started;

  // K47: write the daily attempt in progress (the store re-reads first, so
  // two tabs never lose each other's results).
  const saveAttempt = (): void => {
    if (adopting || !dailyAttemptLive() || !scene.fabricController || !scene.walkGraph) {
      return;
    }
    const n = dailyN!;
    const rec = savedAttemptOf(scene.fabricController, {
      startedAt: attemptStartedAt,
      day: attemptDay,
      elapsedMs: clock.elapsed(performance.now()),
      maze: walkFingerprint(scene.walkGraph),
      def: DAILY_DEF,
      // Strictly after anything this tab saw (a fast double save, a clock
      // step), so another tab's later save always reads as later.
      savedAt: Math.max(Date.now(), attemptSyncedAt + 1),
    });
    if (!rec) return;
    dailyStore.saveAttempt(n, rec);
    attemptSyncedAt = rec.savedAt;
  };

  // Two tabs on one daily: a tab coming back into view takes up the
  // attempt another tab played on since this one last saved it (this
  // tab's own state was saved when it was hidden, so nothing of it is
  // lost) - a rebuild restores it - instead of saving over it.
  const adoptOtherTab = (): void => {
    if (dailyN === null || document.hidden || !scene.fabricController) return;
    const saved = dailyStore.attempt(dailyN);
    if (!saved || saved.savedAt <= attemptSyncedAt) return;
    // K552: saved taps are in maze form (game/daily_attempt.ts).
    const mine = mazeTaps(scene.fabricController);
    attemptSyncedAt = saved.savedAt;
    if (
      saved.taps.length === mine.length &&
      saved.taps.every((t, i) => t === mine[i])
    ) {
      return;
    }
    adopting = true;
    try {
      rebuild();
    } finally {
      adopting = false;
    }
    wake();
    showToast("Picked up your attempt from your other tab.");
  };

  // K47: rebuild() calls this once the new scene exists - daily dailyN
  // opens where its saved attempt left off: path, meters, the Ariadne
  // string, the move log. The clock comes back PAUSED at the saved time
  // and runs on once the scene is on screen (resumeWhenReady), or at the
  // next move. A saved winning move (the page closed before the dot
  // arrived) finishes at once.
  const restoreSavedAttempt = (): void => {
    if (dailyN === null || !scene.fabricController || !scene.fabric || !scene.walkGraph) return;
    const saved = dailyStore.attempt(dailyN);
    if (!saved) return;
    attemptSyncedAt = Math.max(attemptSyncedAt, saved.savedAt);
    const outcome = restoreAttempt(
      scene.fabricController,
      saved,
      walkFingerprint(scene.walkGraph)
    );
    if (outcome !== "ok") {
      console.warn(
        `KnotMaze: Daily #${dailyN}'s saved attempt does not fit this maze ` +
          `(${outcome}); it starts over.`
      );
      return;
    }
    attemptDaily = dailyN;
    attemptDay = saved.day;
    attemptStartedAt = saved.startedAt;
    attemptRecord = null;
    clock.restore(saved.elapsedMs);
    scene.fabric.restoreYarn(scene.fabricController.taps);
    pendingExplored = exploredRuns(scene.fabricController);
    scene.fabric.exploreRestore(scene.fabricController); // K76 stage 2c: the reveal too.
    scene.fabric.update(scene.fabricController);
    if (scene.fabricController.solved) pendingWin = true;
    updateHud();
  };

  // The scene is on screen (no hidden settle, no intro still drawing): a
  // restored clock runs on from here, and the fog re-explores.
  const sceneReady = (): boolean =>
    root.visible && life.state !== "loading" && (scene.reveal === null || scene.reveal.done);
  const resumeWhenReady = (): void => {
    if (clock.state !== "paused" && pendingExplored === null) return;
    if (!sceneReady()) return;
    if (clock.state === "paused") clock.resume(performance.now(), document.hidden);
    if (pendingExplored !== null && scene.fabric) {
      scene.fabric.exploreRuns(pendingExplored);
      pendingExplored = null;
    }
    updateHud();
  };

  // An accepted move. The attempt's first starts the clock and, on a
  // daily, marks that day played (not a practice run's, K146); a restored
  // clock runs on from its first. Every move of a daily attempt is saved.
  const noteMove = (): void => {
    if (clock.state === "paused") {
      clock.resume(performance.now(), document.hidden);
    } else if (!clock.started) {
      // K115 stage 3a, K552: on a titled daily the clock starts on the
      // first MAZE move, the move from the seam (mazeStart) into the maze,
      // never while writing the title: the untitled maze starts it on that
      // same move (its first, from the start), so both clocks read the same.
      const w = scene.walkGraph;
      const c = scene.fabricController;
      if (
        w?.titleEdges &&
        c &&
        (c.taps.length === 0 || w.titleEdges.has(c.taps[c.taps.length - 1]))
      ) {
        return;
      }
      clock.start(performance.now(), document.hidden);
      attemptDay = todayNumber();
      attemptStartedAt = Date.now();
      attemptDaily = dailyN;
      if (dailyN !== null) {
        dailyStore.markPlayed(dailyN, attemptStartedAt, attemptDay);
      }
      // The badge may turn: a past daily's first move begins practice.
      syncModeBadge();
    }
    saveAttempt();
  };
  document.addEventListener("visibilitychange", () => {
    clock.setHidden(document.hidden, performance.now());
    if (document.hidden) {
      saveAttempt();
      savePrefsNow();
    } else {
      adoptOtherTab();
      // Another tab may have finished this daily meanwhile: the mode badge
      // then reads "replay".
      updateHud();
    }
  });
  // pagehide: the last event a closing tab or a reload is sure to get.
  window.addEventListener("pagehide", () => {
    saveAttempt();
    savePrefsNow();
  });

  // K56: the daily on screen must be its pinned design but for the exempt
  // preferences (ui/daily_link.ts). Every URL write and rebuild checks: a
  // preference the player changes is stored for future dailies; any other
  // change leaves the daily (leaveDaily).
  let prefsTimer = 0;
  // The params as of the daily's opening (or the last store): only what
  // the player changes after it is stored.
  let prefsFrom: UrlParams = { ...params };
  const savePrefsNow = (): void => {
    window.clearTimeout(prefsTimer);
    prefsTimer = 0;
    if (dailyN === null) return;
    dailyStore.setPrefs(
      mergeDailyPrefs(dailyStore.prefs(), prefsFrom, params, dailyN)
    );
    prefsFrom = { ...params };
  };
  const syncDaily = (): void => {
    if (dailyN === null) return;
    if (!isDailyDesign(params, dailyN)) {
      leaveDaily();
      return;
    }
    // Sliders write on every step: store the prefs once they settle.
    window.clearTimeout(prefsTimer);
    prefsTimer = window.setTimeout(savePrefsNow, 400);
  };
  // Leave the daily: park its attempt (saved, time and all), become an
  // ordinary design link. The solve on screen plays on as an ordinary
  // design's; the Daily button (or the stats view) brings the daily back.
  const leaveDaily = (): void => {
    if (dailyN === null) return;
    const n = dailyN;
    savePrefsNow();
    saveAttempt();
    const parked = dailyStore.attempt(n) !== undefined;
    dailyN = null;
    if (attemptDaily === n) attemptDaily = null;
    dailyChanged();
    showToast(
      parked ? `Left Daily #${n}. Your attempt is saved.` : `Left Daily #${n}.`
    );
  };

  const dailyUrl = (n: number): string =>
    `${location.origin}${location.pathname}?daily=${n}`;

  // Set when a winning tap lands; the banner shows once the traversal
  // animation delivers the dot to the exit.
  let pendingWin = false;
  // The ARRIVAL: stop the clock, record a daily's result (the first finish
  // is official, later ones replays; one begun after its day practice,
  // K146), show the banner.
  const showFabricWin = (): void => {
    if (!scene.fabricController) return;
    const c = scene.fabricController;
    clock.stop(performance.now());
    const timeMs = clock.elapsed(performance.now());
    const efficiency = efficiencyOf(c.walk.optimalLength, c.pathLength);
    const backtrack = params.pathViz === "trail" ? null : c.backtrackDist;
    const deadEnds = params.deadEndDensity > 0 ? c.deadEndTips.size : null;
    const moves = c.moveLog.join("");
    const daily =
      attemptDaily !== null && attemptDaily === dailyN ? attemptDaily : null;
    if (daily !== null && efficiency !== null) {
      const result: DailyResult = {
        at: Date.now(),
        day: attemptDay,
        timeMs: Math.round(timeMs),
        path: c.pathLength,
        optimal: c.walk.optimalLength,
        efficiency,
        backtrack: c.backtrackDist,
        junctions: c.visitedJunctions.size,
        deadEnds,
        moves,
        viz: params.pathViz,
        def: DAILY_DEF,
      };
      attemptRecord = dailyStore.recordSolve(daily, result);
    }
    const replay = attemptRecord === "replay";
    // K146: a practice finish shares too, titled as practice (like a
    // replay); the banner says so.
    const practice = attemptRecord === "practice";
    // K155: the stars. Turn-based walks rate from path + 2 x backtrack, as
    // a stored daily result does (the stats view agrees to the bit); a
    // chase rates from the walked meter (a catch's re-walk) and its catches,
    // and so does a solve with the turn minotaur (K80 turns). The walked
    // meter starts over with the level and the catches carry, so the
    // popover says which catches' walks it holds (`respawns`, K293 (a)).
    const mino = liveMino();
    const rating = mino
      ? rateRun(c.walkedDist, c.walk.optimalLength, mino.catches, c.respawns)
      : rateRun(walkedOf(c.pathLength, c.backtrackDist), c.walk.optimalLength);
    const stars = rating?.stars ?? null;
    lastWin = {
      text: shareText({
        daily,
        replay,
        practice,
        timeMs,
        efficiency,
        moves,
        stars,
        // K80 turns stage 2: the title's minotaur tag (🐂).
        catches: mino ? mino.catches : null,
        closeCalls: scene.turnMino ? scene.turnMino.closeCalls : null,
      }),
      url: daily !== null ? dailyUrl(daily) : location.href,
    };
    banner.show({
      heading:
        daily === null
          ? "Solved!"
          : replay
            ? `Daily #${daily} replay solved`
            : practice
              ? `Daily #${daily} practice solved`
              : `Daily #${daily} solved!`,
      timeMs,
      efficiency,
      path: c.pathLength,
      optimal: c.walk.optimalLength,
      backtrack,
      junctions: c.visitedJunctions.size,
      deadEnds,
      stats: daily !== null,
      // K80: a chase's catches and time hunted (null: no minotaur; the turn
      // minotaur has catches, no time hunted).
      catches: mino ? mino.catches : null,
      chasedMs: scene.chase ? scene.chase.huntSeconds * 1000 : null,
      // K80 turns stage 2: the turn minotaur's close calls and turns seen,
      // and the restarts under either clock's minotaur.
      closeCalls: scene.turnMino ? scene.turnMino.closeCalls : null,
      seen: scene.turnMino ? scene.turnMino.seen : null,
      restarts: mino ? mino.restarts : null,
      // K114: a burn race's closest call (null: no fire).
      closestCall: c.fire ? c.fireClosest : null,
      rating,
    });
    updateHud();
    throwConfetti();
  };

  // K114 call 1: a lost burn race's ARRIVAL (or a tap on the maze after
  // its banner was closed): stop the clock, show the Burnt banner. Its Try
  // again restarts with the fuse relit (restartSolve: a reset, counted in
  // `restarts`); so does Reset path (call 2). A burn race is never a daily
  // (fire is no exempt key), so nothing is recorded.
  const showFireLoss = (): void => {
    if (!scene.fabricController) return;
    const c = scene.fabricController;
    if (clock.state === "running") clock.stop(performance.now());
    lossBanner.show({
      timeMs: clock.elapsed(performance.now()),
      walked: c.walkedDist,
      closest: c.fireClosest,
      reached: c.fire?.clock === "realtime",
    });
    updateHud();
  };

  // K140: a finish's confetti, with its banner (every finish: dailies, free
  // play, replays, real time) - the rain over the screen and the spray
  // around the exit marker, in units of the marker's radius with a CSS px
  // floor (sprayUnit). Reduced motion keeps only a small, slow spray.
  const throwConfetti = (): void => {
    const plan = confettiPlan(
      params.confettiAmount,
      motion.reduced,
      app.screen.width,
      app.screen.height
    );
    if (plan.rain === 0 && plan.spray === 0) return;
    flags.push(Flag.OVERLAY); // K6-3: wake a stopped loop for the burst.
    let cx = NaN;
    let cy = NaN;
    const v = exitVertex();
    if (v && scene.renderer) {
      // Where fabric draws the exit marker: the renderer's own sample.
      scene.renderer.markerWorld(v.chain, v.ctrl, exitScratch);
      cx = exitScratch[0];
      cy = exitScratch[1];
    }
    // The finish's outer edge: its colored dot (K98).
    const radius =
      scene.fabric?.markerDotRadius() ??
      markerDotRadiusFor(params.threadWidth, look("markerSize"));
    confetti.burst(
      plan,
      app.screen.width,
      app.screen.height,
      cx,
      cy,
      sprayUnit(radius, root.scale.x),
      root
    );
  };

  // K80 REAL-TIME MODE (params.clock "realtime", game/minotaur.ts). The
  // chase owns the clock: its first accepted tap starts it (chaseRunning),
  // fabricTick advances it by each frame's wall time (a fixed 120 Hz sim,
  // at most 0.25 s a frame), never while the page is hidden, and it stops
  // at the finish. The controller follows the chase's departures (one
  // tapEdge each: path, stats, move log, paint) and the dot rides the
  // chase's progress (setMoveProgress) instead of tickAnim's pace. A catch
  // sends the player back to the entrance: the clock and the stats run on,
  // the path and the string start over, and the fog returns to the solve's
  // start (K174's minoRefog) or keeps what was explored, up to where the
  // catch stopped the dot (K100).
  // `carry`: a level restart under the same minotaur (K273's catch toggle,
  // or a Reset path under it) hands its tallies to the new one, so the
  // catch count survives the restart.
  const restartChase = (carry = false): void => {
    const prevChase = carry ? scene.chase : null;
    const prevTurn = carry ? scene.turnMino : null;
    scene.chase =
      params.mazeFabric && params.gameMode === "minotaur" && clockOf(params) === "realtime" && scene.walkGraph && scene.fabric
        ? new MinotaurChase(scene.walkGraph, chaseParamsOf(params), params.seed)
        : null;
    if (scene.chase && prevChase) scene.chase.carry(prevChase);
    chaseRunning = false;
    // K80 turns: the turn clock's minotaur, when one is chosen. Its stream
    // is the seed's own (turnSeed), so the same taps meet the same minotaur.
    scene.turnMino =
      params.mazeFabric &&
      params.gameMode === "minotaur" &&
      clockOf(params) === "turn" &&
      scene.walkGraph &&
      scene.fabric
        ? new TurnMinotaur(
            scene.walkGraph,
            turnConfig(turnMinoParamsOf(params)),
            turnSeed(params.seed)
          )
        : null;
    if (scene.turnMino && prevTurn) scene.turnMino.carry(prevTurn);
    turnWait = 0;
    scene.fabric?.syncMinotaur(liveMino(), params.minoFog, scene.turnMino?.telegraph() ?? null);
  };

  // A catch's toast (K80, both clocks; K273: or the level restarts).
  const showCaughtToast = (n: number, restart = false): void => {
    const then = restart ? "Starting over." : "Back to the entrance.";
    showToast(n === 1 ? `Caught! ${then}` : `Caught ${n} times. ${then}`, 2500);
  };

  // A fresh solve on the same maze (Reset path, a clock change, K114's
  // Burnt banner, K273's catch toggle): a new chase or none, the fuse
  // relit, nothing recorded; the clock restarts (resetAttempt: idle until
  // the next move). THE level restart: a caller follows it with
  // updateHud(). `carry` keeps the minotaur's tallies (restartChase).
  const restartSolve = (carry = false): void => {
    // K114: the fuse relit under the params on screen (a clock change may
    // have turned the fire on or off, or moved its speed or delay).
    if (scene.fabricController) scene.fabricController.fire = fireOf(scene.fabricController.walk);
    scene.fabricController?.reset();
    routeRuns = [];
    routeFc = null;
    chaseRoute = [];
    scene.fabric?.cancelMove();
    scene.fabric?.clearYarn();
    pendingWin = false;
    pendingLoss = false;
    fireClock.reset(); // K114 stage 2: idle until the next first move.
    restartChase(carry);
    hideWin();
    if (scene.fabric && scene.fabricController) scene.fabric.update(scene.fabricController);
    resetAttempt();
    wake();
  };

  // A tap queues a run from the decision vertex (where the player stands,
  // or the end of the run under way; the latest tap wins); the chase sets
  // off along it on its next tick. Returns true when the tap was taken.
  const handleChaseTap = (x: number, y: number, pt: string): boolean => {
    if (!scene.chase || !scene.fabric || !scene.fabricController) return false;
    const eid = scene.fabric.edgeAt(x, y, scene.fabricController, pickRadius(pt, true));
    if (eid >= 0) return chaseAlong(eid);
    // K480 (decision 6): a tap past the choices queues its whole route
    // with the chase, run by run (tickChase feeds the next as each
    // departs); a newer tap or key replaces it. No warning stops in
    // real time.
    const t = scene.fabric.targetAt(
      x,
      y,
      scene.fabricController,
      pickRadius(pt, true),
      tapReach()
    );
    if (!t) return false;
    const route = planRoute(
      scene.fabricController.walk,
      scene.chase.decisionVertex,
      { edge: t.eid, at: t.at },
      tapReach()
    );
    if (!route || !chaseAlong(route[0])) return false;
    chaseRoute = route.slice(1);
    return true;
  };
  // Queue run `eid` as a tap on it would (K120's keys share it).
  const chaseAlong = (eid: number): boolean => {
    if (!scene.chase || !scene.fabric || !scene.fabricController) return false;
    chaseRoute = []; // A fresh tap or key replaces a queued route (K480).
    if (eid < 0 || scene.chase.tap(eid) === "reject") return false;
    chaseRunning = true;
    if (scene.fabric.setHover(-1)) scene.fabric.update(scene.fabricController);
    return true;
  };

  const chaseEvents: ChaseEvent[] = [];
  let chaseWarned = false;
  const tickChase = (dt: number): void => {
    if (!scene.chase || !scene.fabric || !scene.fabricController) return;
    const fc = scene.fabricController;
    if (chaseRunning && !scene.chase.finished && !document.hidden) {
      chaseEvents.length = 0;
      scene.chase.advance(dt, chaseEvents);
      for (const ev of chaseEvents) {
        if (ev.kind === "depart") {
          const result = fc.tapEdge(ev.edge);
          if (result === "reject" || result === "noop") {
            if (!chaseWarned) {
              chaseWarned = true;
              console.warn(`K80: the controller refused run ${ev.edge} (${result})`);
            }
            continue;
          }
          noteMove();
          scene.fabric.setHover(-1);
          scene.fabric.beginMove(
            ev.edge,
            result === "backtrack" ? "backtrack" : "advance",
            fc
          );
          // The finish is the exit tail's far end: the banner waits for it.
          if (result === "win") pendingWin = true;
          // K480: feed a multi-run tap's next run to the chase as this
          // one departs (it leaves on arrival, from its far vertex).
          if (chaseRoute.length > 0 && scene.chase) {
            if (scene.chase.tap(chaseRoute[0]) === "reject") chaseRoute = [];
            else chaseRoute.shift();
          }
          updateHud();
        } else if (ev.kind === "caught") {
          // K273: a catch that resets the level is the level restart, the
          // tallies carried to the new chase (the rest of this advance's
          // events belong to the old one).
          if (params.minoRestart) {
            restartSolve(true);
            updateHud();
            showCaughtToast(liveMino()?.catches ?? 1, true);
            break;
          }
          chaseRoute = [];
          fc.markCaught();
          fc.respawn(params.minoRefog);
          scene.fabric.stopMove();
          scene.fabric.clearYarn();
          pendingWin = false;
          scene.fabric.update(fc);
          updateHud();
          showCaughtToast(scene.chase.catches);
        }
      }
    }
    // A restart above swapped the chase.
    if (!scene.chase) return;
    if (scene.chase.playerMoving) scene.fabric.setMoveProgress(scene.chase.playerProgress, fc);
    else if (scene.fabric.animating) scene.fabric.setMoveProgress(1, fc);
    scene.fabric.syncMinotaur(scene.chase, params.minoFog);
  };

  // K114 stage 2, THE REAL-TIME FIRE (game/fire_clock.ts), in tickAnim's
  // place: the clock runs from the first move until the fire reaches you
  // or the winning move lands, while the page is visible. A dot the clock
  // has carried past its run's end lands at the arrival first, so a
  // waiting tap (keyStep) leaves at the arrival; fireSet, after keyStep,
  // hands the clock to the controller and the dot.
  const tickFire = (dt: number): void => {
    const c = scene.fabricController;
    if (!c || !scene.fabric) return;
    const running = c.taps.length > 0 && !c.fireLost && (!c.solved || scene.fabric.animating);
    if (running && !document.hidden) fireClock.advance(dt);
    if (scene.fabric.animating && fireClock.L >= c.fireArriveL) {
      c.setFireNow(c.fireArriveL);
      scene.fabric.setMoveProgress(1, c);
    }
  };
  // The controller reads the clock (where you stand, the fire may reach
  // you: the Burnt banner), the dot its place on the run, the HUD the lead.
  const fireSet = (): void => {
    const c = scene.fabricController;
    if (!c || !scene.fabric) return;
    const L = fireClock.L;
    if (c.setFireNow(L)) {
      pendingLoss = true;
      scene.fabric.update(c);
    }
    if (scene.fabric.animating) {
      const len = c.fireArriveL - c.fireDepartL;
      scene.fabric.setMoveProgress(len > 0 ? (L - c.fireDepartL) / len : 1, c);
    }
    hud.setFireLead(c.fire && !c.solved && !c.fireLost ? c.fireLeadHere : null);
  };

  // K80 TURNS (game/minotaur_turns.ts). A move the controller accepted is
  // the minotaur's turn too (turnAfterMove); a tap on your own junction is a
  // wait (waitTurn). The game state moves at once, as a turn-based move
  // does; the minotaur's run plays over the player's move animation (its
  // progress, tickTurnMino), a wait's over the time the player's dot would
  // take over the same thread. A CATCH happens at the tap that makes it
  // (stage 1 shows no catching move: the frame after it has the player at
  // the entrance and the minotaur in its lair, or where it caught you with
  // minoLair off; the feedback moved to stage 3)
  // and goes through real time's path: respawn (re-fog under minoRefog),
  // the counter, the HUD's caught row and the toast. K273: with the level
  // reset on a catch (minoRestart) it is the level restart instead, the
  // tallies carried; with minoLair off the model leaves the minotaur where
  // it caught you. `wait`: caught on a wait (markCaught logs it).
  const turnCaught = (wait = false, atContact = false): void => {
    if (!scene.turnMino || !scene.fabric || !scene.fabricController) return;
    const fc = scene.fabricController;
    // K80 turns 3b (section 2.8; K270): the catch site BEFORE the respawn
    // moves everyone — the burst, the dull pluck and the vibration land
    // there. K270 diagnosed: turnCaught used to update the controller and
    // leave the minotaur's layer showing its pre-catch telegraph and glow
    // at the site until the next frame's syncMinotaur; over the pink and
    // lavender threads that stale red frame read as a lavender band. The
    // immediate syncMinotaur below (as restartSolve already did) clears it
    // in the same call.
    // K481 stage 2: a deferred by-length catch ends its animation here;
    // the marker stands where the respawn already put it.
    if (atContact) scene.turnMino.finishCatchAnim();
    const site = scene.turnMino.lastCatch;
    const sitePt = new Float32Array(2);
    let hasSite = false;
    // K481 stage 2: at the contact's moment the burst lands on the
    // contact spot, not on the player's destination vertex.
    const contact = atContact ? scene.turnMino.lastContact : null;
    if (contact && scene.fabric) {
      hasSite = scene.fabric.minoSpotWorld(scene.turnMino.tg.chase, contact.player, sitePt);
    }
    if (!hasSite && site && scene.walkGraph) {
      const vid = scene.turnMino.tg.chase.ids[site.player];
      if (vid) { scene.fabric.vertexWorld(vid, sitePt, 0); hasSite = true; }
    }
    if (params.minoRestart) {
      restartSolve(true);
      updateHud();
      showCaughtToast(liveMino()?.catches ?? 1, true);
      return;
    }
    fc.markCaught(wait);
    // The move under way was made in full: its fog lifts as cancelMove's.
    // K481 stage 2: at the contact's moment the player never got past
    // it, so the fog lifts only as far as the dot reached (stopMove);
    // a runs catch was made in full (cancelMove, above).
    if (atContact) scene.fabric.stopMove();
    else scene.fabric.cancelMove();
    fc.respawn(params.minoRefog);
    scene.fabric.clearYarn();
    pendingWin = false;
    turnWait = 0;
    scene.fabric.update(fc);
    // K270: re-sync the minotaur NOW (see above), then the feedback.
    scene.fabric.syncMinotaur(scene.turnMino, params.minoFog, scene.turnMino.telegraph());
    if (hasSite) {
      scene.fabric.showCatchBurst(sitePt[0], sitePt[1], motion.reduced);
      // The caught run's dull pluck, an octave down with its dissonant
      // neighbor (section 2.8), from the head's pitch at the site.
      const v = scene.walkGraph?.vertices.get(fc.head);
      const [lo, nb] = catchNotes(v ? freqForCtrl(v.chain, v.ctrl) : 220);
      synth.pluck(lo, 0.5);
      synth.pluck(nb, 0.3);
      if (!motion.reduced && typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(60);
      }
    }
    updateHud();
    showCaughtToast(scene.turnMino.catches);
  };
  let turnWarned = false;
  const stepPanScratch = new Float32Array(2);
  // After the controller took run `eid`: the minotaur's turn. True when
  // the move ended in a catch (nothing left to animate).
  // K80 turns 3b (section 2.10): the turn's sound cue — a growl when it
  // first sees you, a heartbeat double pluck within two runs, else the
  // quiet footstep of each run it walked (strength by distance,
  // panned by its screen x (K526).
  const minoTurnSound = (wasHunting: boolean): void => {
    if (!scene.turnMino || !scene.walkGraph) return;
    const tm = scene.turnMino;
    const dist = tm.tg.hopd(tm.player, tm.state.v);
    const cue = turnCue(wasHunting, tm.hunting, dist, tm.lastPath.length);
    if (!cue) return;
    const last = tm.lastPath[tm.lastPath.length - 1];
    const we = last ? scene.walkGraph.edges[last[0]] : undefined;
    const freq = we ? freqForCtrl(we.chain, (we.ctrlA + we.ctrlB) / 2) : 196;
    if (cue === "growl") {
      synth.pluck(Math.max(40, freq / 2), 0.55);
      synth.pluck(Math.max(40, (freq / 2) * Math.pow(2, 3 / 12)), 0.4);
    } else if (cue === "heartbeat") {
      const now = synth.audioTime();
      synth.pluck(Math.max(40, freq / 2), 0.45);
      if (now !== null) synth.pluck(Math.max(40, freq / 2), 0.3, now + 0.18);
      else synth.pluck(Math.max(40, freq / 2), 0.3);
    } else {
      const s = footstepStrength(dist);
      if (s > 0) {
        // K526: the footstep pans by the minotaur's screen x.
        let pan = 0;
        const vid = tm.tg.chase.ids[tm.state.v];
        if (scene.fabric && vid !== undefined) {
          scene.fabric.vertexWorld(vid, stepPanScratch, 0);
          pan = footstepPan(
            root.position.x + stepPanScratch[0] * root.scale.x,
            app.screen.width
          );
        }
        synth.pluck(freq / 2, s, undefined, false, pan);
      }
    }
  };
  const turnAfterMove = (eid: number): boolean => {
    if (!scene.turnMino) return false;
    const wasHunting = scene.turnMino.hunting;
    const r = scene.turnMino.turn(eid);
    turnWait = 0;
    if (r === "reject" && !turnWarned) {
      turnWarned = true;
      console.warn(`K80 turns: the minotaur refused run ${eid} (out of step)`);
    }
    if (r !== "caught") {
      if (r === "moved" || r === "win") minoTurnSound(wasHunting);
      return false;
    }
    if (deferLengthCatch(false)) return false;
    turnCaught();
    return true;
  };
  // K481 stage 2: defer a by-length catch to its contact moment (the
  // game state has already caught and respawned; the move animation
  // plays on and tickTurnMino calls turnCaught there). True when the
  // catch was deferred - the caller then animates the move as usual.
  // Mid-move input keeps Levi's correction (3b1612f): pointer taps are
  // ignored while the dot travels and keys/pad/gamepad gate on
  // held-at-arrival, exactly as for a runs move - the pending catch
  // rides the same animation and the same gates.
  const deferLengthCatch = (wait: boolean): boolean => {
    const tm = scene.turnMino;
    if (!tm || !tm.cfg.byLength || !tm.lastContact || tm.lastContact.t <= 0.001) return false;
    pendingTurnCatch = { tm, t: tm.lastContact.t, wait };
    return true;
  };
  // K481 stage 2: how long a wait's turn plays. By runs it is the time
  // the dot would take over the minotaur's runs; by length, over the
  // thread it actually travels (its last, possibly partial, segment
  // counted by its travelled share).
  const turnWaitSeconds = (): number => {
    const tm = scene.turnMino;
    if (!tm || !scene.fabric) return 0;
    let ctrl = 0;
    if (tm.cfg.byLength) {
      for (let i = 0; i < tm.lastPath.length; i++) {
        const e = tm.lastPath[i][0];
        const we = scene.walkGraph?.edges[e];
        const len = tm.tg.chase.len[e];
        if (we && len > 0) ctrl += ((tm.lastSegLens[i] ?? len) * Math.abs(we.ctrlB - we.ctrlA)) / len;
      }
    } else {
      for (const [e] of tm.lastPath) {
        const we = scene.walkGraph?.edges[e];
        if (we) ctrl += we.ctrlB - we.ctrlA;
      }
    }
    return ctrl > 0 ? scene.fabric.moveSeconds(ctrl) : 0;
  };
  // Is world point (x, y) a tap on the player's own junction (the wait)?
  // Within max(1.5 head discs, 0.9) world of it AND nearer it than any
  // run's tappable part (runDistance, the head neighborhood excluded): the
  // choices' arms leave the junction inside that radius (their tap points,
  // 1.5 ctrl out, sat in it and every tap on them waited), so the space
  // splits between the junction and the runs and a tap on an arm moves.
  const waitPt = new Float32Array(2);
  const onHead = (x: number, y: number): boolean => {
    if (!scene.fabric || !scene.fabricController) return false;
    scene.fabric.vertexWorld(scene.fabricController.head, waitPt, 0);
    const r = Math.max(scene.fabric.markerRadius() * 1.5, 0.9);
    const dx = waitPt[0] - x;
    const dy = waitPt[1] - y;
    const d = Math.sqrt(dx * dx + dy * dy);
    return d <= r && d < scene.fabric.runDistance(x, y, scene.fabricController);
  };
  // K80 turns 3a: (x, y) is in the WAIT ZONE now - the turn minotaur is on,
  // the maze still open and the point on the head (onHead). A click there
  // waits (handleFabricTap) and the hover shows the wait cue there, both
  // through this, so hover and click agree everywhere.
  const inWaitZone = (x: number, y: number): boolean =>
    scene.turnMino !== null &&
    !scene.turnMino.finished &&
    scene.fabricController !== null &&
    !scene.fabricController.solved &&
    !scene.fabricController.fireLost &&
    !pendingWin &&
    onHead(x, y);
  // K80 turns 3a: the head's wait cue on or off (the hover over the wait
  // zone). The head swaps to the "hourglass" glyph and back to the one it
  // wore; a rebuild drops the cue with the renderer it was set on.
  const setWaitCue = (on: boolean): void => {
    if (waitCueFabric !== null && waitCueFabric !== scene.fabric) {
      waitCueGlyph = null;
      waitCueFabric = null;
      waitCueHead = null;
    }
    if (!scene.fabric || on === (waitCueGlyph !== null)) return;
    if (on) {
      waitCueGlyph = scene.fabric.markerGlyphId("head");
      waitCueFabric = scene.fabric;
      waitCueHead = scene.fabricController?.head ?? null;
      scene.fabric.setMarkerStyle({ head: "hourglass" });
    } else {
      const g = waitCueGlyph!;
      waitCueGlyph = null;
      waitCueFabric = null;
      waitCueHead = null;
      scene.fabric.setMarkerStyle({ head: g });
    }
  };
  // The wait move: a turn passes with the player where they stand. Only
  // while the turn minotaur is on and the maze is still open. K80 turns 3a:
  // inputWait is the way in (the key, the pad, a tap on the head): mid-turn
  // it waits for the arrival (MoveWait), so the move under way is never
  // snapped to its end here.
  const waitTurn = (): boolean => {
    if (!scene.turnMino || !scene.fabric || !scene.fabricController) return false;
    if (scene.fabricController.solved || pendingWin || scene.turnMino.finished) return false;
    const wasHunting = scene.turnMino.hunting;
    const r = scene.turnMino.turn(-1);
    if (r === "reject" || r === "noop") return false;
    noteMove();
    if (r === "moved") minoTurnSound(wasHunting);
    if (r === "caught") {
      // K481 stage 2: by length, the catch shows at its contact moment
      // in the wait's own clock too.
      if (deferLengthCatch(true)) {
        turnWaitDur = turnWaitSeconds();
        turnWait = turnWaitDur;
        updateHud();
        return true;
      }
      turnCaught(true);
      return true;
    }
    // Its run(s) play over what the player's dot would take on them.
    turnWaitDur = turnWaitSeconds();
    turnWait = turnWaitDur;
    if (turnWaitDur === 0) scene.turnMino.setProgress(1);
    updateHud();
    return true;
  };
  // Every frame: the minotaur's progress through its turn (the player's
  // move animation, or the wait's clock), then its marker and telegraph.
  const tickTurnMino = (dt: number): void => {
    if (!scene.turnMino || !scene.fabric) return;
    let frac = 1;
    if (turnWait > 0) {
      turnWait = Math.max(0, turnWait - dt);
      frac = turnWaitDur > 0 ? 1 - turnWait / turnWaitDur : 1;
    } else if (scene.fabric.animating) {
      frac = scene.fabric.moveProgress;
    }
    if (pendingTurnCatch && pendingTurnCatch.tm !== scene.turnMino) pendingTurnCatch = null;
    scene.fabric.tickCatchFx(dt);
    scene.turnMino.setProgress(frac);
    // K481 stage 2: the by-length catch shows at its contact moment.
    if (
      pendingTurnCatch &&
      pendingTurnCatch.tm === scene.turnMino &&
      frac >= pendingTurnCatch.t
    ) {
      const w = pendingTurnCatch.wait;
      pendingTurnCatch = null;
      turnCaught(w, true);
      return;
    }
    scene.fabric.telegraphCoarse =
      coarsePointer || window.innerWidth <= 700;
    scene.fabric.syncMinotaur(scene.turnMino, params.minoFog, scene.turnMino.telegraph());
  };

  // Native share sheet on phones, the clipboard elsewhere (ui/share.ts).
  const shareResult = async (
    what: { text: string; url: string } | null
  ): Promise<void> => {
    if (!what) return;
    const outcome = await shareOrCopy(what.text, what.url);
    if (outcome === "copied") showToast("Result copied - paste it anywhere");
    else if (outcome === "failed") showToast("Couldn't share or copy here");
  };
  const showDailyStats = (): void =>
    openDailyStats({
      store: dailyStore,
      today: todayNumber(),
      // The view's Play button is today's daily; a history row a day (a
      // past one plays as practice unless it has an attempt that counts).
      onPlay: (n, today) => playDaily(n, today),
      onShare: (n) => {
        const r = dailyStore.day(n)?.official;
        if (!r) return;
        void shareResult({
          text: shareText({
            daily: n,
            replay: false,
            timeMs: r.timeMs,
            efficiency: r.efficiency,
            moves: r.moves,
            stars: ratingForResult(r)?.stars ?? null,
          }),
          url: dailyUrl(n),
        });
      },
    });

  // Load daily n (the panel's Daily button, the stats view; `floating` =
  // asked for as TODAY's daily): its pinned design with the stored
  // prefs, and its saved attempt (rebuild restores it). Another daily on
  // screen saves its own attempt first. Already on it: say so.
  const playDaily = (n: number, floating = false): void => {
    if (dailyN === n) {
      showToast(`Already playing Daily #${n}`);
      return;
    }
    savePrefsNow();
    saveAttempt();
    Object.assign(params, applyDailyPrefs(dailyParams(n), dailyStore.prefs()));
    dailyN = n;
    dailyFloating = floating;
    prefsFrom = { ...params };
    panel.syncFromParams();
    dailyChanged();
    rebuild();
    app.canvas.style.cursor = "default";
    wake();
  };

  // K92: put design `s` back as loading its link would (an undo or redo):
  // the address bar, the maze, and a daily with its saved attempt (K47). A
  // daily on screen is left first, as any change that leaves it is (its
  // attempt and prefs saved, the toast), or saved as the Daily button saves
  // it when another daily comes back. Only live params changed (a hue, the
  // volume, the fog radius): their rows' effects run as the edit's own did
  // and the solve goes on. Anything else rebuilds.
  const restoreDesign = (s: DesignState): void => {
    const entersDaily = s.daily !== null && s.daily !== dailyN;
    const plan = restorePlan({ ...params }, s.params, entersDaily);
    undoRestoring = true;
    try {
      if (s.daily === null) {
        leaveDaily();
      } else if (entersDaily) {
        savePrefsNow();
        saveAttempt();
      }
      Object.assign(params, s.params);
      if (entersDaily) {
        dailyN = s.daily;
        prefsFrom = { ...params };
      }
      dailyFloating = s.floating;
      panel.syncFromParams();
      if (plan.rebuild) {
        if (entersDaily) dailyChanged();
        rebuild();
        app.canvas.style.cursor = "default";
        wake();
      } else {
        for (const e of plan.effects) panel.callbacks[e]();
        writeParams(params);
      }
    } finally {
      undoRestoring = false;
    }
    syncUndoButtons();
  };
  const undoDesign = (): void => {
    if (!undoStack) return;
    // A design on screen but not recorded yet: record it, so redo can bring
    // it back.
    undoStack.commit(liveDesign());
    const s = undoStack.undo();
    if (s) restoreDesign(s);
    else syncUndoButtons();
  };
  const redoDesign = (): void => {
    if (!undoStack?.isCurrent(liveDesign())) return;
    const s = undoStack.redo();
    if (s) restoreDesign(s);
  };
  // K92 probe: the history (depth, the recorded and the live design's keys),
  // the buttons, the maze on screen (its walk fingerprint) and the address
  // bar; undo() and redo() as the buttons do them.
  (window as unknown as Record<string, unknown>).__knotUndo = {
    state: () => ({
      depth: undoStack?.depth ?? null,
      current: undoStack ? designKey(undoStack.current) : null,
      live: designKey(liveDesign()),
      flags: undoButtons.flags,
      shown: getComputedStyle(undoButtons.el).display !== "none",
      maze: scene.walkGraph ? walkFingerprint(scene.walkGraph) : null,
      daily: dailyN,
      floating: dailyFloating,
      search: location.search,
    }),
    undo: () => undoDesign(),
    redo: () => redoDesign(),
  };

  // The panel's daily button names TODAY's daily (it turns at midnight).
  let labelDay = 0;
  const updateDailyLabel = (): void => {
    const t = todayNumber();
    if (t === labelDay) return;
    labelDay = t;
    panel.setDailyLabel(
      `Daily #${t}`,
      `Play today's daily maze, #${t} (${formatDayDate(t)}): the same maze for everyone today. An unfinished attempt picks up where you left it; results are kept in your daily stats (the chart button).`
    );
  };
  // The daily on screen changed (entered or left): mode badge, tab title.
  const dailyChanged = (): void => {
    document.title = dailyN !== null ? `KnotMaze · Daily #${dailyN}` : "KnotMaze";
    panel.setOnDaily(dailyN !== null); // K552: the title row.
    updateDailyLabel();
    updateHud();
  };
  dailyChanged();
  // The ticking clock, a restored clock's resume, the running attempt's
  // periodic save (a crash or a killed tab loses at most this much time -
  // which must not be a way to stop the clock), and the midnight turn -
  // independent of the render loop.
  const AUTOSAVE_MS = 10000;
  let lastAutosave = 0;
  window.setInterval(() => {
    resumeWhenReady();
    if (clock.state === "running") {
      const t = performance.now();
      hud.setTime(clock.elapsed(t));
      if (t - lastAutosave >= AUTOSAVE_MS && !document.hidden) {
        lastAutosave = t;
        saveAttempt();
      }
    }
    if (todayNumber() !== labelDay) {
      updateDailyLabel();
      // A daily on screen gains its date once it isn't today's (its badge),
      // and one not begun yet would now begin as practice.
      updateHud();
    }
  }, 250);

  // K480 (stage 1; game/route_plan.ts, design docs/design/K480.md): a tap
  // on any shown run within the pulseReach arc of the head walks there
  // run by run. tapReach is handRendererLook's reach (under the thread
  // reveal the pulses - and so the taps - stop at the reveal distance).
  const tapReach = (): number =>
    params.mazeFabric && params.exploration === "threads"
      ? Math.min(params.pulseReach, params.revealDistance)
      : params.pulseReach;
  const clearRoute = (): void => {
    routeRuns = [];
    routeFc = null;
  };
  // The turn minotaur's telegraph in walk terms (its steps are walk-edge
  // ids; its vertices are chase indices, ids[] maps them back).
  const teleOf = (): { edges: number[]; verts: string[] } => {
    if (!scene.turnMino) return { edges: [], verts: [] };
    const t = scene.turnMino.telegraph();
    if (!t) return { edges: [], verts: [] };
    const ids = scene.turnMino.tg.chase.ids;
    return {
      edges: t.steps.map((s) => s[0]),
      verts: [...t.steps.map((s) => ids[s[1]]), ids[t.dest]],
    };
  };
  // Walk the route's next run, as a tap on it. A turn-clock smolder stops
  // the route before the run, with the tap's toast; a real-time refusal
  // (tested at its departure clock) ends it the same way, in moveAlong.
  const executeRouteRun = (): void => {
    const fc = scene.fabricController;
    if (!fc || routeRuns.length === 0) return;
    const eid = routeRuns[0];
    if (fc.fire?.clock === "turn" && fc.smoldering(eid)) {
      clearRoute();
      smolderToast();
      return;
    }
    routeRuns.shift();
    const taps0 = fc.taps.length;
    const catches0 = liveMino()?.catches ?? 0;
    moveAlong(eid);
    if (
      fc.solved ||
      fc.fireLost ||
      (liveMino()?.catches ?? 0) !== catches0 ||
      fc.taps.length === taps0
    ) {
      clearRoute();
    }
  };
  // Take a planned route (issued while stationary; a tap mid-move is
  // ignored, below): the first run now, the rest one per arrival.
  const startRoute = (route: readonly number[]): boolean => {
    if (!scene.fabricController || route.length === 0) return false;
    moveWait.clear();
    routeRuns = [...route];
    routeFc = scene.fabricController;
    if (dotMoving()) return false; // Issued at rest only (the caller's tap).
    executeRouteRun();
    return true;
  };
  // K334: the turn is under way: the dot travels, or (K80 turns 3a) a
  // wait's turn plays (turnWait), so the minotaur's marker is never cut
  // short either. Turn by turn only: real time queues in the chase, so
  // nothing waits for it here.
  const dotMoving = (): boolean =>
    !scene.chase && ((scene.fabric?.animating ?? false) || turnWait > 0);
  // Every frame on arrival (keyStep, after a waiting input - a newer tap
  // or key replaces the route): the stop rules (game/route_plan.ts).
  // True while a route is in charge of the next move.
  const routeStep = (): boolean => {
    if (routeRuns.length === 0) return false;
    const fc = scene.fabricController;
    if (!fc || fc !== routeFc || scene.chase) {
      clearRoute();
      return false;
    }
    if (dotMoving()) return true;
    if (fc.solved || fc.fireLost || pendingWin || pendingLoss) {
      clearRoute();
      return false;
    }
    const tele = teleOf();
    const smolderAt =
      fc.fire?.clock === "turn"
        ? firstSmolderIndex(fc.walk, fc.fire, fc.walkedDist, fc.head, routeRuns)
        : -1;
    const warn = routeWarning({
      huntWas: moveHuntWas,
      huntIs: scene.turnMino?.hunting ?? false,
      walk: fc.walk,
      head: fc.head,
      remaining: routeRuns,
      teleEdges: tele.edges,
      teleVertices: tele.verts,
      smolderAt,
    });
    if (warn) {
      if (warn === "smolder") smolderToast();
      clearRoute();
      return true;
    }
    executeRouteRun();
    return true;
  };

  // Fabric maze: a tap on a run incident to the current branch point is a
  // move (advance or backtrack); anywhere else falls through to grab/tug,
  // which stays live in fabric mode. Returns true when the tap was a move.
  // K480: a tap on a shown run past the branch point walks its route
  // (targetAt + startRoute); either replaces a route in flight.
  const handleFabricTap = (x: number, y: number, pt: string): boolean => {
    if (!scene.fabric || !scene.fabricController) return false;
    // K80: the real-time mode queues the run with the chase instead.
    if (scene.chase) return handleChaseTap(x, y, pt);
    // K114: a lost race takes no moves. A tap on the maze brings the Burnt
    // banner (and its Try again) back if it was closed; otherwise the tap
    // plucks as anywhere else.
    if (scene.fabricController.fireLost) {
      if (pendingLoss || lossBanner.shown) return false;
      showFireLoss();
      return true;
    }
    // K80 turns: with the turn minotaur on, a tap on your own junction is
    // the wait move (before the runs: a short run's tap zone reaches the
    // junction, and the head disc sits over it; onHead leaves the runs'
    // arms to the runs). K80 turns 3a: through inputWait, so mid-turn it
    // waits for the arrival as a tap on a run does.
    if (inWaitZone(x, y)) return inputWait();
    // Levi's correction (2026-10-15, over K334): a tap or click on a run
    // while the dot travels is IGNORED - it queues nothing and replaces
    // nothing (a route in flight walks on; keys gate on held-at-arrival).
    if (tapWhileMoving(dotMoving()) === "ignore") return false;
    const eid = scene.fabric.edgeAt(x, y, scene.fabricController, pickRadius(pt, true));
    if (eid < 0) {
      // K480: a shown run past the branch point, within the reach: walk
      // its route run by run (a current choice above keeps K479's pick).
      const t = scene.fabric.targetAt(
        x,
        y,
        scene.fabricController,
        pickRadius(pt, true),
        tapReach()
      );
      if (!t) return false;
      return startRoute(t.route);
    }
    clearRoute();
    return moveAlong(eid);
  };
  // K114: a refused (smoldering) tap's toast, at most once per 1.5 s (a
  // held key retries every frame).
  let smolderToastAt = -Infinity;
  const smolderToast = (): void => {
    const t = performance.now();
    if (t - smolderToastAt < 1500) return;
    smolderToastAt = t;
    showToast("Smoldering: the fire gets to the end of that run first.", 2500);
  };
  // One move along run `eid` from the head, as a tap on it (K120's keys
  // share it). Returns true when the move was taken.
  const moveAlong = (eid: number): boolean => {
    if (!scene.fabric || !scene.fabricController) return false;
    const hunt0 = scene.turnMino?.hunting ?? false;
    const result = scene.fabricController.tapEdge(eid);
    moveHuntWas = hunt0;
    scene.fabric.setHover(-1);
    scene.fabric.setTelegraphHover(null);
    // The game state moved instantly; the dot + gold front animate along
    // the thread to catch up. The win banner waits for the arrival.
    if (result === "advance" || result === "backtrack" || result === "win") {
      noteMove();
      // K80 turns: the move is the minotaur's turn too; a catch leaves
      // nothing to animate (the player is back at the entrance).
      if (turnAfterMove(eid)) return true;
      scene.fabric.beginMove(
        eid,
        result === "backtrack" ? "backtrack" : "advance",
        scene.fabricController
      );
      if (result === "win") pendingWin = true;
      // K114: no safe arm at the new junction loses the race; the Burnt
      // banner waits for the dot, as the win's does.
      else if (scene.fabricController.fireLost) pendingLoss = true;
    } else {
      scene.fabric.update(scene.fabricController);
      // K114: the fire reaches that arm's far end first. Say why nothing
      // moved (the tap is taken: no tug).
      if (result === "smolder") smolderToast();
    }
    updateHud();
    // No wake(): a move touches markers, paint and the yarn only, and the
    // traversal (tickAnim) runs in every ticker branch - waking cost ~45
    // frames of full simulation per move (about a second at the heavy
    // settings), for nothing.
    return result !== "reject";
  };

  // K5 M6: key input (K120's moves by direction, the move pad, the
  // gamepad poll) is src/app/input_keys.ts. The session functions it
  // moves through stay here for M7 and come in as its deps; keyHold and
  // tapsWait are `keyInput`'s, read through it.
  const keyInput = createKeyInput(
    {
      params,
      sceneReady,
      moveAlong,
      chaseAlong,
      waitTurn,
      clearRoute,
      routeStep: () => routeStep(),
      dotMoving,
      smolderToast,
      teleOf,
      moveHuntWas: () => moveHuntWas,
      get turnWait() {
        return turnWait;
      },
      get pendingWin() {
        return pendingWin;
      },
      get pendingLoss() {
        return pendingLoss;
      },
    },
    scene
  );
  const {
    keyStep,
    keysLive,
    keyDepartures,
    keyVertex,
    heldKeys,
    moveWait,
    movePad,
    pollGamepad,
    inputWait,
  } = keyInput;

  // K5 M6: the auto audio (Stage 20's auto plucks, music mode's
  // scheduler) is src/app/auto_audio.ts.
  const autoAudio = createAutoAudio(
    {
      params,
      settings,
      synth,
      songSched,
      audioMap,
      host,
      pluckUnit,
      startRipple,
      tugAt,
    },
    scene
  );
  const { autoAudioTick, songLog } = autoAudio;

  let perfLine = "";
  const { stamp, perf, updateStamp } = createStamp(
    { app, host, settings, perfLine: () => perfLine },
    scene
  );

  // K5 M3: the frame loop (the ticker callback, tick, the rest frame, the
  // sleep gate's call, the cost rings) is src/app/frame_loop.ts, created
  // here because it reads perf and updateStamp. halted and the counters are
  // `loop.<name>`, never destructured.
  const loop = createFrameLoop(
    {
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
      dragPos: pointer.dragPos,
      grabOrigin: pointer.grabOrigin,
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
      // K6-1 polls (read-only): the chase's clock, the turn minotaur's wait,
      // a key hold, a waiting move.
      gameNeedsFrame: () =>
        (scene.chase !== null && chaseRunning && !scene.chase.finished) ||
        (scene.turnMino !== null && turnWait > 0) ||
        keyInput.keyHold ||
        moveWait.waiting !== null,
      // The auto sound's clock (random plucks, the music's grid).
      audioNeedsFrame: () =>
        audioMap.audioAssign !== null &&
        !settings.muted &&
        (params.soundMode === "random" || params.soundMode === "music"),
      // The camera has not converged, or an indicator's show delay runs.
      cameraNeedsFrame: () => !camera.converged() || indicators.needsFrame() > 0,
      get physState() {
        return life.state;
      },
      get settleWall0() {
        return life.settleWall0;
      },
      get warmHoldFrom() {
        return life.warmHoldFrom;
      },
      get waitCueGlyph() {
        return waitCueGlyph;
      },
      get waitCueHead() {
        return waitCueHead;
      },
      get snapMode() {
        return pointer.snapMode;
      },
      set snapMode(v) {
        pointer.snapMode = v;
      },
      get pendingWin() {
        return pendingWin;
      },
      set pendingWin(v) {
        pendingWin = v;
      },
      get pendingLoss() {
        return pendingLoss;
      },
      set pendingLoss(v) {
        pendingLoss = v;
      },
      get perfLine() {
        return perfLine;
      },
      set perfLine(v) {
        perfLine = v;
      },
    },
    scene
  );
  const { wake, invalidate, frameCost, revealCost } = loop;
  loop.start();

  // The probe hooks (window.__knot*): src/app/probe_hooks.ts.
  installProbeHooks({
    scene,
    a11y,
    app,
    background,
    clock,
    confetti,
    contrast,
    dailyStore,
    fitCur,
    frameCost,
    heldKeys,
    host,
    indicators,
    loopFlags: flags,
    stampEl: stamp,
    lossBanner,
    modeBadge,
    motion,
    movePad,
    moveWait,
    panAllow,
    params,
    revealCost,
    ripples,
    root,
    snore,
    songLog,
    synth,
    view,
    applyPhysicsMode,
    attemptLate,
    freqForCtrl,
    handRendererLook,
    keyDepartures,
    keysLive,
    keyVertex,
    look,
    moveAlong,
    nowSec,
    openPanel,
    physicsInputsChanged,
    physicsTuning,
    playDaily,
    pluckUnit,
    replaySettle,
    startRipple,
    syncBackground,
    syncExploration,
    throwConfetti,
    tugAt,
    // K80 turns 3a: the hook's wait goes the way every input's does.
    waitTurn: inputWait,
    wake,
    writeParams,
    get attemptDaily() {
      return attemptDaily;
    },
    get attemptDay() {
      return attemptDay;
    },
    get attemptRecord() {
      return attemptRecord;
    },
    get attemptStartedAt() {
      return attemptStartedAt;
    },
    get camFollow() {
      return camera.camFollow;
    },
    get camTouchedAt() {
      return camera.camTouchedAt;
    },
    get camTween() {
      return camera.camTween;
    },
    get canvasInk() {
      return scene.canvasInk;
    },
    get dailyFloating() {
      return dailyFloating;
    },
    get dailyN() {
      return dailyN;
    },
    get finishWhy() {
      return finishWhy;
    },
    get fitRight() {
      return camera.fitRight;
    },
    get frameCostN() {
      return loop.frameCostN;
    },
    get frameCostTotal() {
      return loop.frameCostTotal;
    },
    get headWhy() {
      return headWhy;
    },
    get keyHold() {
      return keyInput.keyHold;
    },
    get lastWin() {
      return lastWin;
    },
    get loaderShownAt() {
      return life.loaderShownAt;
    },
    get panelT() {
      return camera.panelT;
    },
    get pendingLoss() {
      return pendingLoss;
    },
    get physState() {
      return life.state;
    },
    get revealMsTotal() {
      return loop.revealMsTotal;
    },
    get sceneWasAnimating() {
      return loop.sceneWasAnimating;
    },
    get loopHalted() {
      return loop.halted;
    },
    get loopStopped() {
      return loop.stopped;
    },
    setLoopContinuous: (on: boolean) => loop.setContinuous(on),
    get turnWait() {
      return turnWait;
    },
    get chaseRunning() {
      return chaseRunning;
    },
    set chaseRunning(v) {
      chaseRunning = v;
    },
    get hcLookChoice() {
      return hcLookChoice;
    },
    set hcLookChoice(v) {
      hcLookChoice = v;
    },
    get tapsWait() {
      return keyInput.tapsWait;
    },
    set tapsWait(v) {
      keyInput.tapsWait = v;
    },
    invalidate,
  });

  rebuild();
}

main().catch(console.error);
