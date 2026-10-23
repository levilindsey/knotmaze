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
import { cuttable } from "./game/cut";
import { finishHold } from "./game/explore_finish";
import { buildFire } from "./game/fire";
import { FireClock } from "./game/fire_clock";
import type { Fire } from "./game/fire";
import { tapWhileMoving } from "./ui/key_moves";
import { MOVE_PAD_KEY, movePadPref } from "./ui/move_pad";

import { MinotaurChase, spotCtrl } from "./game/minotaur";
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
  beatSettingsOf,
  minoClockOf,
  fabricRulesOf,
  fireSettingsOf,
  turnMinoParamsOf,
  writeParams as writeTokenParams,
  pathVizOf,
  PARAM_DEFAULTS,
} from "./ui/url_state";
import type { UrlParams } from "./ui/url_state";
import {
  DAILY_DEF,
  applyDailyPrefs,
  dailyParams,
  dailyQuery,
  isDailyDesign,
  LOOK_KEYS,
  linkLookActive,
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
import { parScore } from "./game/par";
import { spoolPercentUsed } from "./game/spool";
import { hintSecondsOf } from "./game/hints";
import { revealedBy, revealRunsOf, runAtCtrl } from "./game/hidden_runs";
import { catchHeart, heartsToast, livesOf, type HeartLoss } from "./game/lives";
import { newSword, swordSpot, type SwordAvoid, type SwordPhase } from "./game/sword";
import { monsterSpecs, sleeperSpots, sleepersOf } from "./game/monsters";
import { sprintAfterMove, sprintToggle, sprintValue, type SprintState } from "./game/sprint";
import { luresOf } from "./game/lures"; // K137 stage 4
import { snareHoldOf, snaresOf } from "./game/snares";
import { pingsLeft, sonarRuns } from "./game/sonar"; // K137 sonar (4.26)
import { KEY_COLOR_NAMES, KEY_COLORS, lockGateColor } from "./game/locks"; // K138 slice 4
import { lureRangeOf } from "./game/lures"; // K795: the tooltips' range
import type { SwordShown } from "./ui/maze_hud";
import { rateCuts, rateRun, ratingForResult, walkedOf } from "./game/star_rating";
import { LossBanner, MazeHud, WinBanner } from "./ui/maze_hud";
import type { HudSnapshot } from "./ui/maze_hud";
import { ModeBadge, modeBadgeFor } from "./ui/mode_badge";
import { LookChip } from "./ui/look_chip";
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
import { LossFxLayer } from "./render/loss_fx";
import {
  confettiPlanFor,
  planThrows,
  sprayUnit,
} from "./render/confetti_model";
import { PluckRipples } from "./render/pluck_ripple";
import { startShaderWarmup, warmContextFor } from "./render/shader_warmup";
import { openDailyStats } from "./ui/daily_stats_view";
import { setToastAvoid, shareOrCopy, showToast } from "./ui/share";
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
import { CutButtons } from "./ui/cut_buttons";
import { SprintButton } from "./ui/sprint_button";
import { ToolButtons, countWords, type ToolKind } from "./ui/tool_buttons"; // K137 stage 4
import { WalkerButtons } from "./ui/walker_buttons";
import { AidButtons, CHALK_KEY, chalkPref, type AidKey } from "./ui/aid_buttons";
import type { WalkerKey } from "./ui/walker_buttons";
import { walkerMapOf, leadRoute, leadPar, delayNext, delayRoute } from "./game/walker";
import type { WalkerMap, LeadRoute, ParResult, WalkerScore } from "./game/walker";
import type { CutKey } from "./ui/cut_buttons";
import { MotionSetting, browserMotionQuery } from "./ui/motion";
import {
  ContrastSetting,
  browserContrastQuery,
  effectiveParam,
  type A11yFlags,
  type A11yKey,
} from "./ui/accessibility";
import { KnotSynth } from "./audio/knot_synth";
import { createBeat, type BeatFrame } from "./app/beat_frame";
import { createBeatPause } from "./ui/beat_pause";
import { SnoreSfx, fetchSnore } from "./audio/snore_sfx";
import { attachSnoreLink } from "./ui/snore_link";
import { SongScheduler } from "./audio/song_scheduler";
import { createLoader } from "./ui/loader";
import { adoptBootLoader } from "./loader/boot_loader";
import { loaderCfgFromParams, writeLoaderMirror } from "./ui/loader_config";
import { createStamp } from "./app/stamp";
import { GLYPHS2 } from "./app/glyph_switch";
import { installProbeHooks } from "./app/probe_hooks";
import type { WalkerProbe } from "./app/probe_hooks";
import { createFrameLoop } from "./app/frame_loop";
import { createLoopFlags, Flag } from "./app/loop_flags";
import { createLifecycle } from "./app/lifecycle";
import { BACKGROUND, createScene } from "./app/scene";
import { createAudioMap } from "./app/audio_map";
import { createPointerInput } from "./app/input_pointer";
import { createKeyInput } from "./app/input_keys";
import { createLossCover, installContextLoss } from "./app/context_loss";
import { createAutoAudio } from "./app/auto_audio";
import { SNAP_OCTAVE, SNAP_STRENGTH, createRuleLoss, ruleFields, ruleShareTags } from "./app/rule_loss";
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
// K828: keep the loading trefoil on screen (viewer preference).
const LOADER_STAYS_KEY = "knotmaze.loaderStays";


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

  // K792: the grab chase rate's try key (`?<token>&gcr=0.8`), K610's
  // feel A/B (0.6 today; try 0.8 and 1.0). Read once like `hcl`; not a
  // codec param. It rides PhysicsTuning into both physics hosts.
  const gcrAsked = Number(new URLSearchParams(window.location.search).get("gcr"));
  const grabChaseChoice = gcrAsked > 0 && gcrAsked <= 2 ? gcrAsked : 0;

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
  let chalkOn = false; // K137 stage 2: the chalk viewer preference.
  let loaderStaysOn = false; // K828: keep the loading trefoil up.
  try {
    movePadOn = movePadPref(localStorage.getItem(MOVE_PAD_KEY), coarsePointer);
    chalkOn = chalkPref(localStorage.getItem(CHALK_KEY));
    statsShown = localStorage.getItem(STATS_KEY) === "1";
    // Opt-in since 2026-10-12 (Levi: the win banner carries the stats).
    mazeStatsShown = localStorage.getItem(MAZE_STATS_KEY) === "1";
    finishIndicatorShown = localStorage.getItem(FINISH_INDICATOR_KEY) !== "0";
    tapToPan = localStorage.getItem(TAP_TO_PAN_KEY) !== "0";
    loaderStaysOn = localStorage.getItem(LOADER_STAYS_KEY) === "1";
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
    chalk: chalkOn,
    motion: motion.pref,
    reducedMotion: motion.reduced,
    highContrast: contrast.high,
    loaderStays: loaderStaysOn,
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
    warmContextFor(params, look("background"), motion.reduced, n, new URLSearchParams(location.search).get("rp") === "sdf")
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
  // K546 stage 3: the loss effects (burst at the meeting point, ash over
  // the screen), above the confetti.
  const lossFx = new LossFxLayer();
  app.stage.addChild(lossFx.worldContainer, lossFx.screenContainer);
  // K546 stage 3: the loss vignette (index.html's #loss-vignette), driven
  // by opacity on the beat: swells at the contact, released after.
  const lossVignetteEl = document.getElementById("loss-vignette");
  let vignetteTimer = 0;
  const pulseLossVignette = (): void => {
    if (!lossVignetteEl) return;
    lossVignetteEl.style.opacity = motion.reduced ? "0.25" : "0.65";
    window.clearTimeout(vignetteTimer);
    vignetteTimer = window.setTimeout(() => {
      lossVignetteEl.style.opacity = "0";
    }, 1600);
  };
  // K546 stage 3: one loss's effects at its contact point (world): the
  // burst + scheduled ash in the catcher's colours, and the vignette.
  const igniteLoss = (x: number, y: number, unit: number, kind: "mino" | "fire"): void => {
    lossFx.ignite(x, y, unit, kind, params.lossAmount, motion.reduced, app.screen.width, app.screen.height);
    pulseLossVignette();
  };

  // K80's real-time mode (params.clock "realtime"): the chase over the walk
  // graph (game/minotaur.ts), built with the fabric. Its clock starts at the
  // player's first accepted tap (chaseRunning) and stops at the finish.
  let chaseRunning = false;
  // K80 TURNS: the turn-aligned minotaur (params.minotaur under the turn
  // clock, game/minotaur_turns.ts), built with the fabric. Every accepted
  // move is a turn, and so is a wait (a tap on your own junction); its run
  // plays over the player's move animation, a wait's over turnWaitDur.
  let turnWait = 0; // Seconds left of a wait's animation (0: none).
  // K481 stage 2 (by length), K546 stage 1 (by runs too): a catch waiting
  // for its contact moment in the move (or wait) animation; turnCaught runs
  // when progress reaches it. The game state caught it at the tap.
  let pendingCatch: { tm: TurnMinotaur; t: number; wait: boolean } | null = null;
  // K546 stage 2: the real-time catch's ghost rendezvous: the two pre-
  // respawn spots and the deferred ending, over the shared beat. The
  // model has already respawned; only the visible ending waits.
  let pendingGhost: {
    from: number;
    a: { chain: number; ctrl: number };
    b: { chain: number; ctrl: number };
    end: () => void;
  } | null = null;
  const GHOST_MS = 300;
  // K546 stage 2: the fire loss's burn-in beat (both clocks): incident
  // fronts creep to the head, then the Burnt banner lands.
  let fireBeatFrom = -1;
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
  // K137 stage 3a, LIVES (game/lives.ts): the hearts left this attempt and
  // the lives setting they were filled for (0: lives off). restartChase
  // refills them (a new maze, Reset path, the out-of-hearts restart), and
  // so does a change of the Lives row (syncHearts, read at each catch and
  // each HUD snapshot).
  let heartsLeft = 0;
  let heartsOf = 0;
  const refillHearts = (): void => {
    heartsOf = livesOf(params.lives);
    heartsLeft = heartsOf;
  };
  const syncHearts = (): void => {
    if (heartsOf !== livesOf(params.lives)) refillHearts();
  };
  // A catch takes its heart here (catchHeart); the caller restarts the
  // level on "restart" (or on "off" under minoRestart) and respawns
  // otherwise.
  const takeHeart = (): HeartLoss => {
    syncHearts();
    const r = catchHeart(heartsOf, heartsLeft);
    heartsLeft = r.hearts;
    return r.loss;
  };
  // The hearts the HUD, the banner and the hooks show (null: lives off, or
  // no minotaur running).
  const heartsShown = (): { left: number; of: number } | null => {
    syncHearts();
    return liveMino() && heartsOf > 0 ? { left: heartsLeft, of: heartsOf } : null;
  };
  // K137 stage 3b: the sword the HUD, the banner and the hooks show (null:
  // off, none laid, or no minotaur running).
  const swordShown = (): SwordShown | null => {
    const s = liveMino()?.sword ?? null;
    return s ? { phase: s.phase, left: s.left, slainAt: s.slainAt } : null;
  };
  // K137 stage 3c, SPRINT (game/sprint.ts): once a game under either clock's
  // minotaur. restartChase gives it back; a catch spends it (the turn
  // clock's sprintAfterMove, the chase's respawn); the button and F arm it
  // (pressSprint). The real-time chase holds its own two departures
  // (MinotaurChase.sprint); sprintTick follows them.
  let sprintState: SprintState = "ready";
  const sprintOn = (): boolean => params.sprint === "on" && liveMino() !== null;
  // The HUD and the banner's row (null: off, or no minotaur running).
  const sprintShown = (): string | null =>
    sprintOn() ? sprintValue(sprintState, scene.chase !== null) : null;
  // K137 stage 3d: the HUD, banner and share's "woken" (the sleepers woken
  // this attempt; null: no sleeper-kind monster on the turn clock's chase).
  const wokenShown = (): number | null => {
    const tm = scene.turnMino;
    return tm && tm.extras.some((x) => x.kind === "sleeper") ? tm.woken : null;
  };
  // K137 stage 4 (4.10, 4.30): LURES and SNARES (game/lures.ts,
  // game/snares.ts; TurnMinotaur.lure and setSnare). The turn clock only
  // (real time has neither yet), snares by runs only. The stocks left this
  // attempt (restartChase refills them) and the armed tool (null: none; the
  // next tap on a run uses it, toolTap; the buttons and the L and N keys arm
  // it, pressTool).
  let luresLeft = 0;
  let snaresLeft = 0;
  let toolArmed: ToolKind | null = null;
  // K137 stage 7: real time has both tools too (chase.lure/setSnare).
  const luresOn = (): boolean =>
    luresOf(params.lures) > 0 && (scene.turnMino !== null || scene.chase !== null);
  const snaresOn = (): boolean =>
    snaresOf(params.snares) > 0 &&
    (scene.chase !== null || (scene.turnMino !== null && !scene.turnMino.cfg.byLength));
  // The HUD and the banner rows (null: that tool off).
  const luresShown = (): { left: number; of: number } | null =>
    luresOn() ? { left: luresLeft, of: luresOf(params.lures) } : null;
  const snaresShown = (): { left: number; of: number } | null =>
    snaresOn() ? { left: snaresLeft, of: snaresOf(params.snares) } : null;
  // K137 sonar (4.26): pings spent this solve (refilled with the tools).
  let pingsUsed = 0;
  const sonarOn = (): boolean =>
    params.sonar && params.exploration === "fog" && scene.fabricController !== null;
  const pingsShown = (): { left: number; of: number } | null =>
    sonarOn() && params.sonarPings > 0
      ? { left: Math.max(0, params.sonarPings - pingsUsed), of: params.sonarPings }
      : null;
  // K114 CUT: the scissors are armed (the next tap cuts), and a cut tapped
  // while the dot travels, waiting for the move to end (-1: none; the
  // latest wins). The machinery is below, by handleFabricTap.
  let cutArmed = false;
  let pendingCut = -1;
  // K114 WALKER (cut "lead" / "delay"; the machinery is below cutTick):
  // Lead's walker is off along its route ("walk", walkerIdx the next of
  // its states) or waiting for Go ("plan"); walkerDriving is true only
  // inside the walker's own move (in a walker mode nothing else moves the
  // head); walkerScoreFn feeds the HUD and is assigned with the machinery.
  let walkerState: "plan" | "walk" = "plan";
  let walkerIdx = 0;
  let walkerDriving = false;
  // K114 beat rider (app/beat_frame.ts): the beat, and whether a move is its own.
  let beat: BeatFrame | null = null;
  let beatDriving = false;
  let beatTook = false;
  const beatOn = (): boolean => clockOf(params) === "beat" && scene.fabricController !== null;
  // The pause control (item 5): holds the beat and hides the maze.
  const beatPause = createBeatPause((held) => beat?.setHeld(held));
  let walkerScoreFn: () => WalkerScore | null = () => null;
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
    ...(grabChaseChoice > 0 ? { grabChase: grabChaseChoice } : {}),
  });
  // K313: adopt the inline boot loader (on screen since the first
  // paint) when it ran; otherwise today's loader, as before.
  const bootLoader = adoptBootLoader();
  const rawLoader = bootLoader ?? createLoader();
  // K828: the loader wears the design's look (ui/loader_config.ts). The
  // mirror feeds the next load's first paint; setConfig retunes the
  // live worker. The lifecycle sees a hide() the viewer's Keep loading
  // animation switch can veto.
  const pushLoaderCfg = (): void => {
    const cfg = loaderCfgFromParams(params);
    writeLoaderMirror(cfg);
    bootLoader?.setConfig(cfg);
  };
  const loader = {
    show: (): void => rawLoader.show(),
    hide: (): void => {
      if (!settings.loaderStays) rawLoader.hide();
      // K834: a real hide ends the intro - the chrome may show. (With
      // the keep-animation switch on, this hide was vetoed above and
      // the class was never added, so the panel stayed available.)
      document.documentElement.classList.remove("km-intro");
    },
    el: rawLoader.el,
  };
  pushLoaderCfg();
  // K834: chrome gating (index.html's html.km-intro rules): with the
  // keep-loading-animation switch OFF, the settings panel and every
  // other UI overlay stay hidden until the intro animation finishes;
  // with it ON, the panel must always be available, so no gate.
  if (!settings.loaderStays) document.documentElement.classList.add("km-intro");

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
    f.darkMoves = params.darkMoves; // K137 darkness (4.17)
    f.lantern = params.lantern; // K137 darkness (4.17)
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
      previewWin: () => previewWinEffect(),
      previewLoss: () => previewLossEffect(),
      pushLoaderCfg,
      setLoaderStays: (on: boolean) => {
        try {
          localStorage.setItem(LOADER_STAYS_KEY, on ? "1" : "0");
        } catch {
          // Storage unavailable: the choice just doesn't persist.
        }
        // K834: either way the intro gate lifts - ON means the panel
        // must always be available over the permanent animation; OFF
        // is chosen from the (already available) panel.
        document.documentElement.classList.remove("km-intro");
        if (on) rawLoader.show();
        else rawLoader.hide();
      },
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
      cutArmed: () => cutArmed || toolArmed !== null, // K137 stage 4: tools too
      cutPick: () => !!scene.fabricController?.walkerMode,
      onPluck: (chain, ctrl) => revealByPluck(chain, ctrl),
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
  // K137: the rule losses (stranded by fragile runs, out of strokes under
  // strict par) share the Burnt banner and the frame loop's pendingLoss;
  // their sounds obey the volume and sound settings.
  const ruleLoss = createRuleLoss({
    controller: () => scene.fabricController,
    banner: lossBanner,
    animating: () => !!scene.fabric?.animating,
    soundOn: () => !settings.muted && params.soundMode !== "none" && params.volume > 0,
    pluck: (f, s, when) => synth.pluck(f, s, when),
    audioTime: () => synth.audioTime(),
    freqForRun: (eid) => {
      const e = scene.walkGraph?.edges[eid];
      return e ? freqForCtrl(e.chain, (e.ctrlA + e.ctrlB) / 2) : null;
    },
    freqAtHead: () => {
      const fc = scene.fabricController;
      const v = fc ? scene.walkGraph?.vertices.get(fc.head) : undefined;
      return v ? freqForCtrl(v.chain, v.ctrl) : null;
    },
    stopClock: () => {
      if (clock.state === "running") clock.stop(performance.now());
    },
    timeMs: () => clock.elapsed(performance.now()),
    // The taps hold the whole state only without a minotaur or a fire.
    canUndo: () =>
      !scene.chase && !scene.turnMino && !scene.fabricController?.fire && !beatOn(),
    undo: () => undoMove(),
    restart: () => {
      restartSolve();
      updateHud();
    },
    updateHud: () => updateHud(),
  });
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
  // K800: turn the link's look off for this maze (the look params back
  // to today's defaults; not remembered - a reload reads the link).
  const lookChip = new LookChip({
    clear: () => {
      const d = PARAM_DEFAULTS as unknown as Record<string, unknown>;
      const p = params as unknown as Record<string, unknown>;
      for (const k of LOOK_KEYS) p[k] = d[k];
      panel.syncFromParams();
      panel.callbacks.onBackgroundChange();
      writeParams(params);
      lookChip.set(linkLookActive(params));
      wake();
    },
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
  // K114 CUT (ui/cut_buttons.ts): the scissors and Undo, bottom left while
  // the cut is on and the keys are live (cutTick, every frame).
  const cutButtons = new CutButtons({
    arm: () => setCutArmed(!cutArmed),
    undo: () => cutUndo(),
  });
  // K114 WALKER (ui/walker_buttons.ts): Go, Reset and Undo in the scissors'
  // corner while a walker mode is on (cutTick shows them).
  const walkerButtons = new WalkerButtons({
    go: () => walkerGo(),
    reset: () => walkerReset(),
    undo: () => walkerUndo(),
  });
  // K137 stage 2 AIDS (ui/aid_buttons.ts): Hint and Chalk, one row above the
  // scissors' corner (aidTick, every frame, shows them).
  const aidButtons = new AidButtons({
    hint: () => useHint(),
    chalk: () => {
      chalkToggle();
    },
  });
  // K137 stage 3c SPRINT (ui/sprint_button.ts): the lightning button in the
  // scissors' spot (sprintTick, every frame, shows it).
  const sprintButton = new SprintButton({
    press: () => {
      pressSprint();
    },
  });
  // K137 stage 4: the lure and snare buttons (ui/tool_buttons.ts) in the
  // sprint row (toolTick, every frame, shows them).
  const toolButtons = new ToolButtons({
    press: (k) => {
      pressTool(k);
    },
  });
  // The armed tool shown: the button lit, a crosshair; put down, the hover
  // glow goes too (as for the scissors). toolTick applies it every frame, so
  // a restart that drops the tool shows on the next frame.
  let toolArmedShown: ToolKind | null = null;
  const syncToolArmed = (): void => {
    if (toolArmed === toolArmedShown) return;
    toolArmedShown = toolArmed;
    toolButtons.setArmed(toolArmed);
    if (cutArmed) return;
    app.canvas.style.cursor = toolArmed ? "crosshair" : "default";
    if (!toolArmed && scene.fabric && scene.fabricController && scene.fabric.setGlow(-1, 0)) {
      scene.fabric.update(scene.fabricController);
    }
  };
  const setToolArmed = (k: ToolKind | null): void => {
    toolArmed = k;
    syncToolArmed();
  };
  // Armed: the button lit, a crosshair; put down, the cut glow goes too.
  const setCutArmed = (on: boolean): void => {
    if (on === cutArmed) return;
    cutArmed = on;
    cutButtons.setArmed(on);
    app.canvas.style.cursor = on ? "crosshair" : "default";
    if (!on && scene.fabric && scene.fabricController && scene.fabric.setGlow(-1, 0)) {
      scene.fabric.update(scene.fabricController);
    }
  };
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
    lookChip.set(linkLookActive(params)); // K800
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
      cutButtons.el, // K114 (hidden: none).
      walkerButtons.el, // K114 walker (hidden: none).
      sprintButton.isShown ? sprintButton.el : null, // K137 stage 3c
      toolButtons.isShown ? toolButtons.el : null, // K137 stage 4
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
  // K698: the toast sits above the same chrome (only the shown controls in
  // its column at the bottom lift it; ui/toast_place.ts).
  setToastAvoid(() => indicators.chrome());
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
    const mino = liveMino();
    // K546: a catch still travelling to its contact moment (pendingCatch)
    // joins the caught row when it lands, with its toast and sound; the
    // game state counted it at the tap.
    const pending = pendingCatch && pendingCatch.tm === scene.turnMino ? 1 : 0;
    return {
      showStats: settings.showMazeStats,
      timeMs: clock.elapsed(performance.now()),
      path: c.pathLength,
      optimal: c.optimal,
      // A finished route's metric: shown from the arrival on (K139: never
      // in a collapse game, where a long trail is the goal).
      efficiency:
        c.solved && clock.state === "stopped" && !c.collapseOn
          ? efficiencyOf(c.optimal, c.pathLength)
          : null,
      // Memory-trail mode has no backtracking, so no backtrack meter.
      backtrack: pathVizOf(params) === "trail" ? null : c.backtrackDist,
      junctions: c.visitedJunctions.size,
      deadEnds: params.deadEndDensity > 0 ? c.deadEndTips.size : null,
      // K80: times caught so far (null: no minotaur).
      catches: mino ? mino.catches - pending : null,
      // K80 turns stage 2: the turn minotaur's close calls and turns seen
      // (null on real time), and the Reset-path restarts on either clock.
      closeCalls: scene.turnMino ? scene.turnMino.closeCalls : null,
      seen: scene.turnMino ? scene.turnMino.seen : null,
      restarts: mino?.restarts ?? null,
      // K114: the fire's lead at your junction while the race runs, the
      // closest call once it is over (null: no fire).
      fireLead: c.fire && !c.solved && !c.fireLost ? c.fireLeadHere : null,
      closestCall: c.fire && (c.solved || c.fireLost) ? c.fireClosest : null,
      // K137: snapped, par and strokes (null while their rule is off).
      ...ruleFields(c),
      // K137 stage 3a: the hearts left (null: lives off or no minotaur).
      hearts: heartsShown(),
      // K114 walker: Lead's par, Delay's walk and the walk it wanted.
      walker: walkerScoreFn(),
      sword: swordShown(), // K137 stage 3b
      sprint: sprintShown(), // K137 stage 3c
      woken: wokenShown(), // K137 stage 3d
      lures: luresShown(),
      pings: pingsShown(), // K137 sonar (4.26) // K137 stage 4
      snares: snaresShown(),
      // K114 remainder: the beat tempo while the beat is the clock.
      tempo: beatOn()
        ? `${params.beatTempo} bpm${params.beatTiming === "length" ? " · by length" : ` · ${params.beatPerRun} a run`}`
        : null,
    };
  };
  // The HUD and the mode badge (it re-fits around the HUD's new size).
  const updateHud = (): void => {
    hud.render(hudSnapshot());
    syncModeBadge();
    // K138 slice 4: under the colors form the yarn's dye follows the
    // latest key taken (the player's own path color until then).
    const fc = scene.fabricController;
    if (fc && fc.ruleLook?.locks?.mode === "colors" && scene.renderer) {
      const latest = fc.keysLatestColor;
      scene.renderer.setPathColor(
        latest >= 0 ? KEY_COLORS[latest] : parseInt(params.pathColor.replace("#", ""), 16) || 0xffd24a
      );
    }
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
  // K456: true while the WebGL context is lost (src/app/context_loss.ts,
  // installed after the frame loop): the clock stays hidden through it.
  let glContextLost = false;
  document.addEventListener("visibilitychange", () => {
    clock.setHidden(document.hidden || glContextLost, performance.now());
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
    // K139: a collapse game shows no efficiency and no stars (a long trail
    // is its goal), so it records no daily result either; it is never a
    // daily anyway (collapse is no exempt key).
    const efficiency = c.collapseOn
      ? null
      : efficiencyOf(c.optimal, c.pathLength);
    const backtrack = pathVizOf(params) === "trail" ? null : c.backtrackDist;
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
        optimal: c.optimal,
        efficiency,
        backtrack: c.backtrackDist,
        junctions: c.visitedJunctions.size,
        deadEnds,
        moves,
        viz: pathVizOf(params),
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
    // K114 walker: the walker walked, not you, so Lead's stars rate the cuts
    // against par (the brief's call 4: 3 at par, 2 at par + 1, 1 beyond)
    // and Delay has none.
    const walkerScore = walkerScoreFn();
    const rating =
      c.collapseOn
      ? null
      : c.walkerMode
        ? walkerScore?.mode === "lead" && walkerScore.par !== null
          ? rateCuts(c.cutCount, walkerScore.par, walkerScore.upper)
          : null
        : mino
          ? rateRun(c.walkedDist, c.optimal, mino.catches, c.respawns)
          : rateRun(walkedOf(c.pathLength, c.backtrackDist), c.optimal);
    const stars = rating?.stars ?? null;
    // K139: the collapse score against par (null: collapse off).
    const ruleRows = ruleFields(c); // K138: the rules' rows for the banner.
    const collapse = ruleRows.collapse ?? null;
    const collapseMode = c.collapse === "free" ? "free" : "finish";
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
        // K137: the fragile and par tags (K139: collapse's snaps are its
        // score, on a line of its own).
        snapped: c.fragileOn && !c.collapseOn ? c.brokenRuns().length : null,
        parScore: c.parMode !== "off" ? parScore(c.strokes, c.par) : null,
        collapse: collapse ? { mode: collapseMode, ...collapse } : null,
        cuts: c.cutOn ? c.cutCount : null, // K114
        hearts: heartsShown()?.left ?? null, // K137 stage 3a
        walker: walkerScore, // K114 walker
        // K137 stage 3b: the move the sword was taken on (null: never).
        swordTaken: (() => {
          const t = liveMino()?.sword?.takenAt ?? -1;
          return t > 0 ? t : null;
        })(),
        // K137 stage 3c: sprint was spent (null: off).
        sprintUsed: sprintOn() ? sprintState === "first" || sprintState === "used" : null,
        woken: wokenShown(), // K137 stage 3d
        // K137 stage 4: the lures and snares used (null: that tool off).
        luresUsed: luresOn() ? luresOf(params.lures) - luresLeft : null,
        snaresUsed: snaresOn() ? snaresOf(params.snares) - snaresLeft : null,
        pingsUsed: params.sonar ? pingsUsed : null, // K137 sonar (4.26)
        // K137 stage 2: the spool's share used and the hints used.
        spool: c.spoolOn ? { used: c.spoolUsed, cap: c.spoolCap } : null,
        hintsUsed: c.hintsMax > 0 ? c.hintsUsed : null,
        ...ruleShareTags(c), // K138: the rules' tags.
      }),
      url: daily !== null ? dailyUrl(daily) : location.href,
    };
    banner.show({
      // K139: a free collapse game ends where you stand, with its score.
      heading: collapse
        ? collapseMode === "free"
          ? `${collapse.pct}% collapsed`
          : `Solved! ${collapse.pct}% collapsed`
        : daily === null
          ? "Solved!"
          : replay
            ? `Daily #${daily} replay solved`
            : practice
              ? `Daily #${daily} practice solved`
              : `Daily #${daily} solved!`,
      timeMs,
      efficiency,
      path: c.pathLength,
      optimal: c.optimal,
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
      collapse,
      cuts: c.cutOn ? c.cutCount : null, // K114
      hearts: heartsShown(), // K137 stage 3a
      walker: walkerScore, // K114 walker
      sword: swordShown(), // K137 stage 3b
      sprint: sprintShown(), // K137 stage 3c
      woken: wokenShown(), // K137 stage 3d
      lures: luresShown(),
      snares: snaresShown(),
      // K137 stage 2: the share of the spool paid out, and the hints used.
      spoolUsed: c.spoolOn ? spoolPercentUsed(c.spoolUsed, c.spoolCap) : null,
      hintsUsed: c.hintsMax > 0 ? c.hintsUsed : null,
      // K138: the rules row, the turnstiles and the hidden runs found.
      rules: ruleRows.rules,
      turnstiles: ruleRows.turnstiles,
      hidden: ruleRows.hidden,
      // K138 stages 3 and 4: the one-way runs laid, the keys held.
      oneWay: ruleRows.oneWay,
      keys: ruleRows.keys,
      muddy: ruleRows.muddy, // K137 s5
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
    // K546 stage 3: on the first show, the fire's contact burst + ash at
    // the head and its first sound (the catch's pair, from the head's
    // run) — a re-shown banner (a tap after closing it) throws nothing.
    if (!lossBanner.shown && scene.fabric) {
      const out = new Float32Array(2);
      scene.fabric.vertexWorld(c.head, out, 0);
      igniteLoss(out[0], out[1], scene.fabric.markerRadius(), "fire");
      const v = scene.walkGraph?.vertices.get(c.head);
      const [lo, nb] = catchNotes(v ? freqForCtrl(v.chain, v.ctrl) : 220);
      synth.pluck(lo, 0.5);
      synth.pluck(nb, 0.3);
      synth.pluck(Math.max(30, lo / 2), 0.5);
      synth.pluck(Math.max(30, nb / 2), 0.35);
    }
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
  // floor (sprayUnit), and K336's side cannons. Reduced motion throws none
  // (K186: the plan is empty).
  const throwConfetti = (): void => {
    const plan = confettiPlanFor(
      params,
      motion.reduced,
      app.screen.width,
      app.screen.height
    );
    if (!planThrows(plan)) return;
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

  // The panel's Preview buttons (Path & view): fire the win / loss
  // effects' VISUALS ONLY, from the state on screen. Neither calls the
  // game-out functions (showFabricWin / showFireLoss / showLoss): no
  // daily result is recorded, the solve clock keeps its state, no catch
  // or heart counts, the controller, the chases and the attempt are
  // never touched - so there is nothing to roll back afterwards. The
  // one visible change besides the effects themselves is the banner a
  // real finish would show, in its preview form (its only button
  // closes it); if a real banner is already up, the preview fires the
  // particles only and leaves that banner - and the state behind it -
  // exactly as it was. Closing a preview banner re-fits the mode badge
  // (the banners' onHide), as a real banner's close does.
  const previewWinEffect = (): void => {
    throwConfetti();
    const c = scene.fabricController;
    if (!c || banner.shown || lossBanner.shown) return;
    const s = hudSnapshot();
    banner.show({
      heading: "Solved! (preview)",
      timeMs: s?.timeMs ?? clock.elapsed(performance.now()),
      efficiency: s?.efficiency ?? null,
      path: c.pathLength,
      optimal: c.optimal,
      backtrack: s?.backtrack ?? null,
      junctions: c.visitedJunctions.size,
      deadEnds: s?.deadEnds ?? null,
      catches: s?.catches ?? null,
      chasedMs: s?.chasedMs ?? null,
      closeCalls: s?.closeCalls ?? null,
      seen: s?.seen ?? null,
      restarts: s?.restarts ?? null,
      closestCall: s?.closestCall ?? null,
      hearts: s?.hearts ?? null,
      spoolUsed: s?.spoolUsed ?? null,
      hintsUsed: s?.hintsUsed ?? null,
      rules: s?.rules ?? null,
      turnstiles: s?.turnstiles ?? null,
      hidden: s?.hidden ?? null,
      oneWay: s?.oneWay ?? null,
      keys: s?.keys ?? null,
      muddy: s?.muddy ?? null,
      stats: false,
      preview: true,
    });
    updateHud();
  };

  const previewLossEffect = (): void => {
    const c = scene.fabricController;
    if (!c || !scene.fabric) return;
    flags.push(Flag.OVERLAY); // Wake a stopped loop for the fall.
    const out = new Float32Array(2);
    scene.fabric.vertexWorld(c.head, out, 0);
    igniteLoss(out[0], out[1], scene.fabric.markerRadius(), c.fire ? "fire" : "mino");
    // The first-show sound of a real fire loss (showFireLoss), at the head.
    const v = scene.walkGraph?.vertices.get(c.head);
    const [lo, nb] = catchNotes(v ? freqForCtrl(v.chain, v.ctrl) : 220);
    synth.pluck(lo, 0.5);
    synth.pluck(nb, 0.3);
    synth.pluck(Math.max(30, lo / 2), 0.5);
    synth.pluck(Math.max(30, nb / 2), 0.35);
    if (banner.shown || lossBanner.shown) return;
    lossBanner.show(
      {
        timeMs: clock.elapsed(performance.now()),
        walked: c.walkedDist,
        closest: c.fire ? c.fireClosest : Infinity,
        reached: !!c.fire,
      },
      true
    );
    updateHud();
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
    refillHearts(); // K137 stage 3a: every heart back.
    sprintState = "ready"; // K137 stage 3c: sprint back.
    // K137 stage 4: the lures and snares back, the tool put down.
    luresLeft = luresOf(params.lures);
    snaresLeft = snaresOf(params.snares);
    pingsUsed = 0; // K137 sonar (4.26)
    toolArmed = null;
    const prevChase = carry ? scene.chase : null;
    const prevTurn = carry ? scene.turnMino : null;
    scene.chase =
      params.mazeFabric && params.gameMode === "minotaur" && clockOf(params) === "realtime" && scene.walkGraph && scene.fabric
        ? new MinotaurChase(scene.walkGraph, chaseParamsOf(params), params.seed)
        : null;
    if (scene.chase && prevChase) scene.chase.carry(prevChase);
    // Set on the NEW chase (the old one is discarded above): K137 stage 7 + scent (4.34).
    if (scene.chase) {
      scene.chase.snareHoldS = snareHoldOf(params.snareHold);
      scene.chase.scentFadeS = params.minoScent;
    }
    chaseRunning = false;
    // K80 turns: the turn clock's minotaur, when one is chosen. Its stream
    // is the seed's own (turnSeed), so the same taps meet the same minotaur.
    scene.turnMino =
      params.mazeFabric &&
      params.gameMode === "minotaur" &&
      minoClockOf(params) === "turn" && // K114: the beat rider's too
      scene.walkGraph &&
      scene.fabric
        ? new TurnMinotaur(
            scene.walkGraph,
            turnConfig(turnMinoParamsOf(params)),
            turnSeed(params.seed)
          )
        : null;
    if (scene.turnMino && prevTurn) scene.turnMino.carry(prevTurn);
    // K137-b: a run that breaks (fragile, collapse) is gone for the
    // minotaur too: it counts your crossings against the controller's
    // limits (restartSolve resets the controller before this).
    const fcb = scene.fabricController;
    const limits = fcb && fcb.fragileOn ? fcb.breakLimits : null;
    scene.chase?.setBreakLimits(limits);
    scene.turnMino?.setBreakLimits(limits);
    // K137 s5: the muddy runs slow both chases (the controller laid them).
    if (scene.chase) scene.chase.mud = fcb?.mudRuns ?? new Set();
    if (scene.turnMino) scene.turnMino.mud = fcb?.mudRuns ?? new Set();
    laySword();
    layMonsters();
    turnWait = 0;
    scene.fabric?.syncMinotaur(liveMino(), params.minoFog, scene.turnMino?.telegraph() ?? null);
  };

  // K137 stage 3b (4.7, game/sword.ts): a new chase lays the sword down,
  // 4-8 runs off the shortest way on the seed's own stream, clear of the
  // lair's doorstep (one run around the exit tail's junction) or the
  // guard's territory; none while the param is off or no spot qualifies.
  // `swordSeen` is the phase the page last announced (toasts, HUD).
  let swordSeen: SwordPhase | null = null;
  const laySword = (): void => {
    swordSeen = null;
    const m = scene.chase ?? scene.turnMino;
    if (!m || params.sword === "off") return;
    const avoid: SwordAvoid =
      params.minotaur !== "guard"
        ? { hops: 1 }
        : scene.chase
          ? { dist: params.minoGuardRoam }
          : { hops: params.minoTerritory };
    const spot = swordSpot(m.g, params.seed, avoid);
    if (spot < 0) return;
    const s = newSword(spot, params.sword, params.swordMoves);
    scene.chase?.setSword(s);
    scene.turnMino?.setSword(s);
    swordSeen = s.phase;
  };

  // K137 stage 3d (4.9, game/monsters.ts): the extra monsters, turn clock
  // only, 1-3 runs off the shortest way on their own stream, clear of the
  // lair as the sword is and off the sword's spot.
  const layMonsters = (): void => {
    const tm = scene.turnMino;
    if (tm && sleepersOf(params.sleepers) > 0) {
      const avoid: SwordAvoid = params.minotaur !== "guard" ? { hops: 1 } : { hops: params.minoTerritory };
      const skip = tm.sword ? [tm.sword.spot] : [];
      tm.setMonsters(monsterSpecs(tm.g, params.seed, params.sleepers, params.sleepKind, avoid, skip), params.seed);
    }
    // K137 stage 6: the real-time clock's extras - awake hunters on
    // the sleepers' junctions (their own spots, off the sword's).
    const ch = scene.chase;
    if (ch && sleepersOf(params.minoExtras) > 0) {
      const avoid: SwordAvoid = params.minotaur !== "guard" ? { hops: 1 } : { hops: params.minoTerritory };
      const skip = ch.sword ? [ch.sword.spot] : [];
      ch.setExtras(sleeperSpots(ch.g, params.seed, params.minoExtras, avoid, skip));
    }
  };
  // The sword's news since the last look, on either clock: a toast for each
  // change of phase or touch (taken, banished, slain, spent).
  const swordNews = (touch: "banish" | "slay" | null): void => {
    const s = (scene.chase ?? scene.turnMino)?.sword ?? null;
    if (!s) return;
    if (touch === "banish") showToast("Banished to its lair!", 2200);
    else if (touch === "slay") showToast("Slain! The maze is yours.", 2600);
    else if (s.phase !== swordSeen) {
      if (s.phase === "fleeing") showToast("You have the sword! It flees.", 2200);
      else if (s.phase === "used" && swordSeen === "fleeing") showToast("The sword is spent.", 2000);
    }
    swordSeen = s.phase;
  };

  // K137 stage 3d: who made the turn clock's last catch, for its toast
  // (null: the minotaur, or no extras).
  const catcherOf = (): string | null => {
    const tm = scene.turnMino;
    const x = tm && tm.lastCatcher >= 0 ? tm.extras[tm.lastCatcher] : undefined;
    return x ? (x.kind === "sleeper" ? "a sleeper" : "a follower") : null;
  };

  // A catch's toast (K80, both clocks; K273: or the level restarts). `by`
  // (K137 stage 3d): an extra monster that made the catch.
  const showCaughtToast = (n: number, restart = false, heart: HeartLoss = "off", by: string | null = null): void => {
    // K137 stage 3a: under lives the toast counts hearts, not catches.
    if (heart !== "off") {
      const t = heartsToast(heartsLeft, heart === "restart");
      showToast(by && t.startsWith("Caught!") ? `Caught by ${by}!${t.slice(7)}` : t, 2500);
      return;
    }
    const then = restart ? "Starting over." : "Back to the entrance.";
    const what = by
      ? (n === 1 ? `Caught by ${by}!` : `Caught by ${by}: ${n} times now.`)
      : (n === 1 ? "Caught!" : `Caught ${n} times.`);
    showToast(`${what} ${then}`, 2500);
  };

  // K137 stage 2: THE HINT (game/hints.ts). Hint (H) spends one of the
  // `hints` param's hints and lights the next good arm (controller.goodArm:
  // the head's run that starts the shortest live way to the exit) in the
  // telegraph's rim look for the `hintSeconds` param's seconds (K795;
  // HINT_SECONDS, 2, by default, read at each hint); a move puts it out at once
  // (the renderer's beginMove), the timer otherwise. A restart gives the
  // hints back (clearAids). Each change asks one render pass (invalidate),
  // never the physics.
  let hintTimer: ReturnType<typeof setTimeout> | null = null;
  const hintOff = (): void => {
    if (hintTimer !== null) clearTimeout(hintTimer);
    hintTimer = null;
    scene.fabric?.clearHint();
  };
  const useHint = (): void => {
    const fc = scene.fabricController;
    const fabric = scene.fabric;
    if (!fc || !fabric || fc.hintsMax <= 0 || fc.solved) return;
    if (fc.hintsLeft <= 0) {
      showToast("No hints left. A restart gives them back.", 2200);
      return;
    }
    const arm = fc.goodArm();
    if (arm < 0 || !fc.useHint()) return;
    hintOff();
    fabric.showHint(arm);
    hintTimer = setTimeout(() => {
      hintTimer = null;
      scene.fabric?.clearHint();
      invalidate();
    }, hintSecondsOf(params.hintSeconds) * 1000);
    invalidate();
    updateHud();
  };
  // CHALK: a tick on the head's junction, or rubbed out (the viewer's chalk
  // preference on; never in the walker's modes, where the head is not the
  // player's). The marks clear on a restart (clearAids).
  const chalkToggle = (): boolean => {
    const fc = scene.fabricController;
    if (!fc || !scene.fabric || !settings.chalk || fc.walkerMode || fc.solved) return false;
    fc.toggleChalk();
    scene.fabric.update(fc);
    invalidate();
    return true;
  };
  // The keys H and C (input_keys.ts), live while their buttons show.
  let aidHintShown = false;
  let aidChalkShown = false;
  const aidKey = (k: AidKey): boolean => {
    if (k === "hint") {
      if (!aidHintShown) return false;
      useHint();
      return true;
    }
    return aidChalkShown ? chalkToggle() : false;
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
    // K137: fragile runs and par as the params on screen say (a rules row
    // restarts the solve through here).
    const ruleKey0 = scene.fabricController?.ruleKey ?? "";
    scene.fabricController?.setRules(fabricRulesOf(params));
    scene.fabricController?.reset();
    // K138: a new layout of ice or the color rule repaints the runs.
    if ((scene.fabricController?.ruleKey ?? "") !== ruleKey0) scene.recolorScene();
    // K137 stage 2: a restart clears the hints used and the chalk marks; a
    // catch's level restart (carry) keeps them, as it keeps the tallies.
    if (!carry) scene.fabricController?.clearAids();
    hintOff();
    routeRuns = [];
    routeFc = null;
    chaseRoute = [];
    pendingCut = -1; // K114
    setCutArmed(false);
    scene.fabric?.cancelMove();
    scene.fabric?.clearYarn();
    pendingWin = false;
    pendingLoss = false;
    ruleLoss.reset(); // K137
    fireClock.reset(); // K114 stage 2: idle until the next first move.
    beat?.reset(); // K114 beat rider: Restart restarts the beat.
    if (scene.fabric) scene.fabric.beatPulse = -1; // K114 item 6: no pulse at rest
    beatPause.setHeld(false);
    restartChase(carry);
    hideWin();
    if (scene.fabric && scene.fabricController) scene.fabric.update(scene.fabricController);
    resetAttempt();
    wake();
  };

  // K137: the Stranded banner's Undo. The taps but the last, replayed the
  // way a reload restores an attempt: the yarn, the reveal, update() (the
  // replay's reset moved `restarts`, so the fog's stamps clear), then the
  // fog laid again from the taps (exploreRuns); the clock runs on. Offered
  // only while the taps hold the whole state (no minotaur, no fire).
  // K114: with the cut on, Undo pops one ACTION instead (a move, with the
  // runs it carried on along, or a cut), through replayActions.
  const undoMove = (): void => {
    const fc = scene.fabricController;
    if (!fc || !scene.fabric) return;
    // K138: and with ice or the color rule on (a slide is one move).
    const cutting = fc.replaysActions;
    if ((cutting ? fc.actions.length : fc.taps.length) === 0) return;
    pendingCut = -1;
    hintOff(); // K137 stage 2
    if (
      !(cutting
        ? fc.replayActions(fc.actions.slice(0, -1))
        : fc.replay(fc.taps.slice(0, -1)))
    ) {
      restartSolve();
      updateHud();
      return;
    }
    routeRuns = [];
    routeFc = null;
    chaseRoute = [];
    pendingWin = false;
    pendingLoss = false;
    ruleLoss.reset();
    scene.fabric.cancelMove();
    scene.fabric.restoreYarn(fc.taps);
    scene.fabric.exploreRestore(fc);
    scene.fabric.update(fc);
    scene.fabric.exploreRuns(exploredRuns(fc));
    saveAttempt();
    updateHud();
    wake();
  };
  // K137: the frame loop's loss slot: the Burnt banner, or a rule's.
  const showLoss = (): void => {
    if (scene.fabricController?.fireLost) showFireLoss();
    else ruleLoss.show();
  };

  // A tap queues a run from the decision vertex (where the player stands,
  // or the end of the run under way; the latest tap wins); the chase sets
  // off along it on its next tick. Returns true when the tap was taken.
  const handleChaseTap = (x: number, y: number, pt: string): boolean => {
    if (!scene.chase || !scene.fabric || !scene.fabricController) return false;
    if (pendingGhost) return false; // K546 stage 2: the rendezvous gates input.
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
      tapReach(),
      (r) => scene.fabricController!.broken(r) // K137: around broken runs.
    );
    if (!route || !chaseAlong(route[0])) return false;
    // K137 stage 2: a first run the spool refused queues none of the rest.
    if (!scene.fabricController.spoolWouldRefuse(route[0])) chaseRoute = route.slice(1);
    return true;
  };
  // Queue run `eid` as a tap on it would (K120's keys share it).
  const chaseAlong = (eid: number): boolean => {
    if (!scene.chase || !scene.fabric || !scene.fabricController) return false;
    if (pendingGhost) return false; // K546 stage 2.
    chaseRoute = []; // A fresh tap or key replaces a queued route (K480).
    // K137: a broken run is gone.
    if (eid < 0 || scene.fabricController.broken(eid)) return false;
    // K137 stage 2: a run past the spool is refused before the chase sets
    // off along it (its departure taps the controller); taken, so no tug.
    if (scene.fabricController.spoolWouldRefuse(eid)) {
      spoolRefused(eid);
      return true;
    }
    if (scene.chase.tap(eid) === "reject") return false;
    chaseRunning = true;
    if (scene.fabric.setHover(-1)) scene.fabric.update(scene.fabricController);
    return true;
  };

  const chaseEvents: ChaseEvent[] = [];
  let chaseWarned = false;
  const tickChase = (dt: number): void => {
    if (!scene.chase || !scene.fabric || !scene.fabricController) return;
    // K546 stage 2: sweep the rendezvous; at the contact moment the
    // deferred ending lands (burst at the meeting point, then it).
    if (pendingGhost) {
      const g = pendingGhost;
      const t01 = motion.reduced ? 1 : Math.min(1, (performance.now() - g.from) / GHOST_MS);
      scene.fabric.setCatchGhost(g.a, g.b, t01);
      if (t01 >= 1) {
        pendingGhost = null;
        const meet = scene.fabric.catchGhostMeet();
        scene.fabric.clearCatchGhost();
        if (meet) scene.fabric.showCatchBurst(meet[0], meet[1], motion.reduced);
        // K546 stage 3: the burst + ash at the meeting point and the
        // catch's dull pluck + thump (parity with the turn clock).
        if (meet) igniteLoss(meet[0], meet[1], scene.fabric.markerRadius(), "mino");
        {
          const hv = scene.walkGraph?.vertices.get(scene.fabricController.head);
          const [lo, nb] = catchNotes(hv ? freqForCtrl(hv.chain, hv.ctrl) : 220);
          synth.pluck(lo, 0.5);
          synth.pluck(nb, 0.3);
          synth.pluck(Math.max(30, lo / 2), 0.5);
          synth.pluck(Math.max(30, nb / 2), 0.35);
        }
        if (!motion.reduced && typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(60);
        }
        g.end();
      }
    }
    const fc = scene.fabricController;
    // K139: a free collapse game that has ended (anywhere: the controller's
    // solved) holds the chase once the dot is in, so nothing catches you
    // after the end.
    const freeEnded = fc.solved && fc.collapse === "free" && !scene.chase.playerMoving;
    if (chaseRunning && !scene.chase.finished && !document.hidden && !freeEnded) {
      chaseEvents.length = 0;
      scene.chase.advance(dt, chaseEvents);
      for (const ev of chaseEvents) {
        if (ev.kind === "depart") {
          const result = fc.tapEdge(ev.edge);
          if (result === "reject" || result === "noop" || result === "spool") {
            if (!chaseWarned) {
              chaseWarned = true;
              console.warn(`K80: the controller refused run ${ev.edge} (${result})`);
            }
            continue;
          }
          noteMove();
          if (ruleLoss.afterMove(fc)) pendingLoss = true; // K137
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
            const next = chaseRoute[0];
            // K137 stage 2: the spool refuses the next run before it queues.
            if (fc.spoolWouldRefuse(next)) {
              chaseRoute = [];
              spoolRefused(next);
            } else if (fc.broken(next) || scene.chase.tap(next) === "reject") {
              chaseRoute = [];
            }
            else chaseRoute.shift();
          }
          updateHud();
        } else if (ev.kind === "caught") {
          // K273: a catch that resets the level is the level restart, the
          // tallies carried to the new chase (the rest of this advance's
          // events belong to the old one). K137 stage 3a: under lives the
          // catch costs a heart, and only the last one restarts the level
          // (minoRestart is ignored while lives are on).
          // K546 stage 2: the ending waits out the ghost rendezvous (the
          // event carries the pre-respawn spots); game state is unchanged.
          const fabric = scene.fabric;
          const endCaught = (): void => {
            const heart = takeHeart();
            if (heart === "restart" || (heart === "off" && params.minoRestart)) {
              restartSolve(true);
              updateHud();
              showCaughtToast(liveMino()?.catches ?? 1, true, heart);
              return;
            }
            chaseRoute = [];
            fc.markCaught();
            fc.respawn(params.minoRefog);
            fabric.stopMove();
            fabric.clearYarn();
            pendingWin = false;
            // K139: the respawn can end the game (a free collapse game
            // ends with its score; a collapsed start tail strands a
            // finish one).
            if (fc.solved) pendingWin = true;
            else if (fc.collapseOn && ruleLoss.over()) pendingLoss = true;
            fabric.update(fc);
            updateHud();
            showCaughtToast(scene.chase?.catches ?? 1, false, heart);
          };
          if (motion.reduced || !scene.chase || !scene.walkGraph) {
            endCaught();
          } else {
            const g = scene.chase.g;
            const pa = spotCtrl(scene.walkGraph, g, ev.player);
            const pb = spotCtrl(scene.walkGraph, g, ev.mino);
            pendingGhost = {
              from: performance.now(),
              a: { chain: pb.chain, ctrl: pb.ctrl },
              b: { chain: pa.chain, ctrl: pa.ctrl },
              end: endCaught,
            };
          }
          break;
        } else if (ev.kind === "sword") {
          // K137 stage 3b: taken, banished, slain or spent.
          swordNews(ev.what === "banish" || ev.what === "slay" ? ev.what : null);
          updateHud();
        }
      }
    }
    // A restart above swapped the chase.
    if (!scene.chase) return;
    if (scene.chase.playerMoving) scene.fabric.setMoveProgress(scene.chase.playerProgress, fc);
    else if (scene.fabric.animating) scene.fabric.setMoveProgress(1, fc);
    // K324 stage 2: the real-time telegraph, the chase's read-only plan
    // (render only: it draws no RNG and moves no digest).
    scene.fabric.syncMinotaur(
      scene.chase,
      params.minoFog,
      params.minoTelegraph ? scene.chase.plan(params.minoTelegraphRuns) : null
    );
  };

  // K114 stage 2, THE REAL-TIME FIRE (game/fire_clock.ts), in tickAnim's
  // place: the clock runs from the first move until the fire reaches you
  // or the winning move lands, while the page is visible. A dot the clock
  // has carried past its run's end lands at the arrival first, so a
  // waiting tap (keyStep) leaves at the arrival; fireSet, after keyStep,
  // hands the clock to the controller and the dot.
  // K546 stage 2: creep the incident fronts; at ignition the banner.
  // Runs every frame from the keyStep slot (tickFire is real-time only).
  const fireBeatStep = (): void => {
    const c = scene.fabricController;
    if (fireBeatFrom < 0 || !c || !scene.fabric || !c.fireLost) return;
    const t01 = Math.min(1, (performance.now() - fireBeatFrom) / GHOST_MS);
    scene.fabric.fireBurnCreep = t01;
    if (t01 >= 1) {
      fireBeatFrom = -1;
      scene.fabric.fireBurnCreep = 0;
      if (!motion.reduced && typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(60);
      }
      pendingLoss = true;
    }
  };
  // K546 stage 2: start the fire-loss burn-in (idempotent per loss).
  const beginFireBeat = (): void => {
    if (fireBeatFrom >= 0 || pendingLoss) return;
    fireBeatFrom = performance.now();
    if (motion.reduced) {
      fireBeatFrom = -1;
      pendingLoss = true;
    }
  };
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
      beginFireBeat(); // K546 stage 2: burn-in, then the banner.
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
  // take over the same thread. A CATCH is counted at the tap that makes it
  // (the model respawns both there) and SHOWS at its contact moment: the
  // move or wait animation plays on, the minotaur walking its catching
  // route, until it reaches the contact's fraction (pendingCatch,
  // tickTurnMino; K481 stage 2 by length, K546 stage 1 by runs, which until
  // then cut to the respawn at the tap). There turnCaught lands it through
  // real time's path: respawn (re-fog under minoRefog), the HUD's caught
  // row, the toast and the burst. K273: with the level
  // reset on a catch (minoRestart) it is the level restart instead, the
  // tallies carried; with minoLair off the model leaves the minotaur where
  // it caught you. `wait`: caught on a wait (markCaught logs it).
  // `atContact`: the landing of a pending catch (always, since K546; the
  // other path is a fallback).
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
    // K481 stage 2, K546: the catch's animation ends here (either travel
    // mode); the marker stands where the respawn already put it.
    scene.turnMino.finishCatchAnim();
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
    // K137 stage 3a: a heart under lives (see tickChase's catch).
    const heart = takeHeart();
    // K137 stage 3d: the catcher, named before a restart lays a new chase.
    const by = catcherOf();
    if (heart === "restart" || (heart === "off" && params.minoRestart)) {
      restartSolve(true);
      updateHud();
      showCaughtToast(liveMino()?.catches ?? 1, true, heart, by);
      return;
    }
    fc.markCaught(wait);
    // K481 stage 2, K546: at the contact's moment the player never got
    // past it, so the fog lifts only as far as the dot reached (stopMove).
    // The fallback (no contact moment) lifts the whole run (cancelMove).
    if (atContact) scene.fabric.stopMove();
    else scene.fabric.cancelMove();
    fc.respawn(params.minoRefog);
    // K774: the beat rider rests at the entrance (the next tap starts it on
    // the next beat), now: a catch landed from inside a departure's commit
    // (moveAlong) ends the rider's advance there. A restart above rests it
    // through restartSolve's beat.reset().
    beat?.rider()?.restAt(fc.head);
    scene.fabric.clearYarn();
    pendingWin = false;
    // K139: the respawn can end the game (see tickChase's catch).
    if (fc.solved) pendingWin = true;
    else if (fc.collapseOn && ruleLoss.over()) pendingLoss = true;
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
      // K546 stage 3: the low thump under the dull pluck (two more
      // plucks a further octave down), the contact burst + ash in the
      // minotaur's colours, and the vignette.
      synth.pluck(Math.max(30, lo / 2), 0.5);
      synth.pluck(Math.max(30, nb / 2), 0.35);
      igniteLoss(sitePt[0], sitePt[1], scene.fabric.markerRadius(), "mino");
      if (!motion.reduced && typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(60);
      }
    }
    updateHud();
    showCaughtToast(scene.turnMino.catches, false, heart, by);
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
    // K137 stage 3c: an armed sprint makes this move its skipped turn.
    const sa = sprintOn() ? sprintAfterMove(sprintState, true) : null;
    const r = scene.turnMino.turn(eid, sa?.skip ? { sprint: "skip" } : undefined);
    if (sa && (r === "moved" || r === "caught" || r === "win")) sprintState = sa.next(r);
    turnWait = 0;
    swordNews(scene.turnMino.lastTouch?.kind ?? null); // K137 stage 3b
    if (r === "reject" && !turnWarned) {
      turnWarned = true;
      console.warn(`K80 turns: the minotaur refused run ${eid} (out of step)`);
    }
    if (r !== "caught") {
      if (r === "moved" || r === "win") minoTurnSound(wasHunting);
      return false;
    }
    if (deferCatch(false)) return false;
    turnCaught();
    return true;
  };
  // K481 stage 2 (by length), K546 stage 1 (by runs): defer a catch to its
  // contact moment (the game state has already caught and respawned; the
  // move animation plays on and tickTurnMino calls turnCaught there). True
  // when the catch was deferred - the caller then animates the move as
  // usual. A contact at t of 0 or near it defers too, and lands on the
  // next frame with no travel (until K546 it cut at once). Mid-move input
  // keeps Levi's correction (3b1612f): pointer taps are ignored while the
  // dot travels and keys/pad/gamepad gate on held-at-arrival, exactly as
  // for any move - the pending catch rides the same animation and the
  // same gates.
  const deferCatch = (wait: boolean): boolean => {
    const tm = scene.turnMino;
    if (!tm || !tm.lastContact) return false;
    pendingCatch = { tm, t: tm.lastContact.t, wait };
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
    // K137 stage 3c: a wait is never the skipped turn; it ends a sprint
    // under way (its second move), and an armed one stays armed.
    if (sprintOn()) sprintState = sprintAfterMove(sprintState, false).next(r);
    swordNews(scene.turnMino.lastTouch?.kind ?? null); // K137 stage 3b
    noteMove();
    if (r === "moved") minoTurnSound(wasHunting);
    if (r === "caught") {
      // K481 stage 2, K546: the catch shows at its contact moment in the
      // wait's own clock too.
      if (deferCatch(true)) {
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
    if (pendingCatch && pendingCatch.tm !== scene.turnMino) pendingCatch = null;
    scene.fabric.tickCatchFx(dt);
    scene.turnMino.setProgress(frac);
    // K481 stage 2, K546: the catch shows at its contact moment.
    if (pendingCatch && pendingCatch.tm === scene.turnMino && frac >= pendingCatch.t) {
      const w = pendingCatch.wait;
      pendingCatch = null;
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
    // K137: stranded or out of strokes: a tap shows the banner again.
    if (ruleLoss.over()) return ruleLoss.tapWhileOver(pendingLoss);
    // K114 walker: a tap on a run cuts it (no scissors to arm); elsewhere
    // it plucks or pans as anywhere.
    if (scene.fabricController.walkerMode) return walkerTap(x, y, pt);
    // K114: armed scissors: the tap cuts (or puts them down) instead.
    // K137 stage 4: an armed lure or snare: the tap uses it (or puts it down).
    if (toolArmed !== null) return toolTap(x, y, pt);
    if (cutArmed) return cutTap(x, y, pt);
    // K80 turns: with the turn minotaur on, a tap on your own junction is
    // the wait move (before the runs: a short run's tap zone reaches the
    // junction, and the head disc sits over it; onHead leaves the runs'
    // arms to the runs). K80 turns 3a: through inputWait, so mid-turn it
    // waits for the arrival as a tap on a run does.
    // K114 beat rider: a tap on an arm of the junction ahead queues it, mid-
    // run included (the last one before the junction wins).
    if (beatOn()) {
      const eid = scene.fabric.edgeAt(x, y, scene.fabricController, pickRadius(pt, true));
      if (eid < 0) return false;
      if (!(settings.muted || params.soundMode === "none" || !(params.volume > 0))) synth.open();
      return beat?.queue(eid) ?? false;
    }
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
  // K137 stage 2: a move past the spool is refused: the HUD gauge flashes,
  // a dull pluck, and a toast at most once per 1.5 s (as the smolder's).
  let spoolToastAt = -Infinity;
  const spoolRefused = (eid: number): void => {
    hud.flashSpool();
    cutPluck(eid, REFUSE_OCTAVE, REFUSE_STRENGTH);
    const t = performance.now();
    if (t - spoolToastAt < 1500) return;
    spoolToastAt = t;
    showToast("Out of yarn: retrace your last run to reel some in.", 2500);
  };
  // K138: a move the color rule forbids (a run of the wrong color, or a
  // slide over the ice that ends on one) is refused, changing nothing: a
  // dull pluck, and a toast at most once per 1.5 s (as the smolder's).
  let ruleToastAt = -Infinity;
  const ruleRefused = (eid: number): void => {
    cutPluck(eid, REFUSE_OCTAVE, REFUSE_STRENGTH);
    const t = performance.now();
    if (t - ruleToastAt < 1500) return;
    ruleToastAt = t;
    const fc = scene.fabricController;
    const mode = fc?.ruleLook?.mode;
    const why = fc?.refusalOf(eid);
    // K138 s3: a one-way run, against its arrow or backtracked. (The rules
    // run with the cut off, so no Undo button shows beside them; the Stranded
    // banner's Undo replays the taps and is never refused.)
    if (why === "oneWay") {
      showToast(
        eid === fc!.arrivalEdge ? "No going back over a one-way run." : "That run is one-way: follow the arrows.",
        2500
      );
      return;
    }
    // K138 s4: a lock, while the walk lacks a key.
    if (why === "lock") {
      // K138 slice 4: a colored gate names the yarn it wants.
      const lk = fc!.ruleLook?.locks;
      if (lk?.mode === "colors") {
        const want = lockGateColor(lk, eid);
        showToast(
          `Locked: this gate wants ${KEY_COLOR_NAMES[want]} yarn. Take a ${KEY_COLOR_NAMES[want]} key last.`,
          2500
        );
      } else {
        showToast(`Locked: find the keys first (${fc!.keysHeld} of ${fc!.keysTotal}).`, 2500);
      }
      return;
    }
    // K138 s2: a closed turnstile says so (the toast's pluck is the same).
    if (why === "turnstile") {
      showToast("That turnstile is closed this way. It turns one step with every move.", 2500);
      return;
    }
    showToast(
      mode === "cycle"
        ? "Cycle the colors: light, then middle, then dark, then light again."
        : mode === "alternate"
          ? "Alternate the shades: light, then dark, then light."
          : "That move breaks the rules.",
      2500
    );
  };
  // K138 s2: a pluck on a thread (a tap's, or a drag's release) shows the
  // hidden runs of its note within the `hiddenReveal` param's runs (K795;
  // REVEAL_RUNS, 3, by default) of the plucked run, for
  // the rest of the solve (call 3; hidden_runs.ts revealedBy). A reveal is
  // an action, not a move: the strokes, the clock and the turnstiles stay.
  const revealByPluck = (chain: number, ctrl: number): void => {
    const fc = scene.fabricController;
    if (!fc || !scene.fabric || !scene.ps) return;
    const walk = fc.walk;
    const run = runAtCtrl(walk, chain, ctrl, scene.ps.chains[chain]?.length ?? Infinity);
    if (run < 0) return;
    const noteOf = (eid: number): number | null => {
      const e = walk.edges[eid];
      return e ? freqForCtrl(e.chain, (e.ctrlA + e.ctrlB) / 2) : null;
    };
    // K137 sonar (4.26): in fog, the pluck rings the nearby runs of
    // its note and opens a brief hole over each. A ping is spent only
    // when something rings; without budget the pluck just says so.
    if (sonarOn() && !fc.isHidden(run)) {
      if (pingsLeft(params.sonarPings, pingsUsed) > 0) {
        const rings = sonarRuns(walk, run, noteOf);
        if (rings.length > 0) {
          pingsUsed++;
          scene.fabric.sonarPing([run, ...rings]);
          const f = noteOf(run);
          if (f !== null) synth.pluck(f, 0.3);
          updateHud();
        }
      } else {
        showToast("Out of pings.", 1500);
      }
    }
    const hidden = fc.hiddenRuns();
    if (hidden.length === 0) return;
    // A pluck on a hidden run itself does nothing (call 3): the pick skips
    // hidden thread, but a ctrl on a run's boundary can map onto one.
    if (fc.isHidden(run)) return;
    let shown = 0;
    const near = revealRunsOf(params.hiddenReveal);
    for (const h of revealedBy(walk, hidden, new Set(), run, noteOf, near)) {
      if (fc.reveal(h)) shown++;
    }
    if (shown === 0) return;
    scene.fabric.update(fc);
    updateHud();
    showToast(shown === 1 ? "A hidden run appears." : `${shown} hidden runs appear.`, 2000);
  };
  // One move along run `eid` from the head, as a tap on it (K120's keys
  // share it). Returns true when the move was taken.
  const moveAlong = (eid: number): boolean => {
    if (!scene.fabric || !scene.fabricController) return false;
    // K114 walker: in a walker mode only the walker moves (keys, the pad,
    // the gamepad and routes take nothing).
    if (scene.fabricController.walkerMode && !walkerDriving) return false;
    // K114 beat rider: under the beat a key, the pad or a route queues the
    // arm for the junction ahead; only the beat commits moves.
    if (beatOn() && !beatDriving) return beat?.queue(eid) ?? false;
    // K774: a catch still travelling to its contact lands before any next
    // move, with the dot set at the contact first. The beat rider departs
    // in the same advance that reaches the junction, so beginMove would
    // snap the catching move before tickTurnMino saw it reach t: the catch
    // was counted and never shown, and the controller (not yet respawned)
    // walked on while the minotaur refused every turn. The move is refused;
    // turnCaught's respawn rests the rider at the entrance.
    if (pendingCatch && pendingCatch.tm === scene.turnMino) {
      const { t, wait } = pendingCatch;
      pendingCatch = null;
      scene.fabric.setMoveProgress(t, scene.fabricController);
      turnCaught(wait, true);
      return false;
    }
    const hunt0 = scene.turnMino?.hunting ?? false;
    const result = scene.fabricController.tapEdge(eid);
    beatTook = result === "advance" || result === "backtrack" || result === "win";
    moveHuntWas = hunt0;
    scene.fabric.setHover(-1);
    scene.fabric.setTelegraphHover(null);
    // The game state moved instantly; the dot + gold front animate along
    // the thread to catch up. The win banner waits for the arrival.
    if (result === "advance" || result === "backtrack" || result === "win") {
      noteMove();
      if (ruleLoss.afterMove(scene.fabricController!)) pendingLoss = true; // K137
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
      else if (scene.fabricController.fireLost) beginFireBeat(); // K546 stage 2
    } else {
      scene.fabric.update(scene.fabricController);
      // K114: the fire reaches that arm's far end first. Say why nothing
      // moved (the tap is taken: no tug).
      if (result === "smolder") smolderToast();
      else if (result === "spool") spoolRefused(eid); // K137 stage 2
      else if (result === "refused") ruleRefused(eid); // K138
    }
    updateHud();
    // No wake(): a move touches markers, paint and the yarn only, and the
    // traversal (tickAnim) runs in every ticker branch - waking cost ~45
    // frames of full simulation per move (about a second at the heavy
    // settings), for nothing.
    return result !== "reject";
  };
  // K114 beat rider: the beat (app/beat_frame.ts). Its departures commit
  // through moveAlong; the dot rides on the beat's clock.
  const beatSound = (): boolean =>
    !(settings.muted || params.soundMode === "none" || !(params.volume > 0));
  beat = createBeat({
    settings: () => (scene.fabricController && scene.fabric ? beatSettingsOf(params) : null),
    walkKey: () => scene.fabricController?.walk ?? null,
    buildMap: () =>
      scene.tangle && scene.fabricController
        ? walkerMapOf(scene.tangle, scene.fabricController.walk)
        : null,
    head: () => scene.fabricController?.head ?? null,
    commit: (run) => {
      beatDriving = true;
      beatTook = false;
      try {
        moveAlong(run);
      } finally {
        beatDriving = false;
      }
      return beatTook;
    },
    progress: (frac) => {
      if (scene.fabric && scene.fabricController) scene.fabric.setMoveProgress(frac, scene.fabricController);
    },
    animating: () => scene.fabric?.animating ?? false,
    audio: () => {
      if (!beatSound()) return null;
      const time = synth.audioTime();
      return time === null ? null : { time, latency: synth.outputLatency() };
    },
    note: (run, when) => {
      const e = scene.walkGraph?.edges[run];
      if (e) synth.pluck(freqForCtrl(e.chain, (e.ctrlA + e.ctrlB) / 2), 0.8, when);
    },
  });

  // K114 CUT (game/cut.ts; brief docs/design/K114_cut.md). Armed, a tap on
  // any live run cuts it (FabricMazeRenderer.cutAt; empty space or a cut
  // run puts the scissors down). A cut tapped while the dot travels or
  // carries on waits for the move to end (pendingCut, the latest wins;
  // carryStep lands it). A cut puts the scissors down and snaps (K137's
  // snap: the run's pitch, an octave up); a refused cut (no way left to
  // the exit) or a run that cannot be cut says why with a dull pluck, and
  // the scissors stay armed. Render-only: no wake, as for a move.
  const CUT_TOAST_MS = 2500;
  const REFUSE_OCTAVE = 0.5;
  const REFUSE_STRENGTH = 0.35;
  // K138 s4: the last 32 of these plucks asked for, sounded or kept silent
  // (Muted, snd=none, volume 0), for probes (`__knotCutPlucks`): a refused
  // lock's thunk is the refusal octave, and a probe never has to hear it.
  const cutPluckLog: { eid: number; octave: number; strength: number; sounded: boolean }[] = [];
  const cutPluck = (eid: number, octave: number, strength: number): void => {
    const e = scene.walkGraph?.edges[eid];
    const sounded = !!e && !(settings.muted || params.soundMode === "none" || !(params.volume > 0));
    cutPluckLog.push({ eid, octave, strength, sounded });
    if (cutPluckLog.length > 32) cutPluckLog.shift();
    if (sounded) synth.pluck(freqForCtrl(e.chain, (e.ctrlA + e.ctrlB) / 2) * octave, strength);
  };
  const applyCut = (eid: number): void => {
    const fc = scene.fabricController;
    if (!fc || !scene.fabric) return;
    const r = fc.cut(eid);
    if (r === "cut") {
      setCutArmed(false);
      if (routeRuns.includes(eid)) clearRoute();
      cutPluck(eid, SNAP_OCTAVE, SNAP_STRENGTH);
      scene.fabric.update(fc);
      updateHud();
      return;
    }
    if (fc.solved || !fc.cutOn) return;
    cutRefused(fc, eid, r === "refused");
  };
  // Why a cut was not made: a toast and a dull pluck (a run that is
  // cuttable but was not cut, say an "invalid" one, says nothing). K114
  // walker: the refusal is checked from the walker's junction.
  const cutRefused = (fc: FabricMazeController, eid: number, refused: boolean): void => {
    if (!refused && cuttable(fc.walk, eid)) return;
    showToast(
      refused
        ? fc.walkerMode
          ? "That cut would leave the walker no way to the exit."
          : "That cut would leave no way to the exit."
        : fc.walk.titleEdges?.has(eid)
          ? "The title's runs can't be cut."
          : "The runs at the entrance and the exit can't be cut.",
      CUT_TOAST_MS
    );
    cutPluck(eid, REFUSE_OCTAVE, REFUSE_STRENGTH);
  };
  const cutTap = (x: number, y: number, pt: string): boolean => {
    const fc = scene.fabricController;
    if (!fc || !scene.fabric) return false;
    const eid = scene.fabric.cutAt(x, y, fc, pickRadius(pt, true));
    if (eid < 0) {
      setCutArmed(false);
      return true;
    }
    if (dotMoving() || fc.carry.length > 0) {
      pendingCut = eid;
      setCutArmed(false);
      return true;
    }
    applyCut(eid);
    return true;
  };
  // Every frame first in keyStep: the run a move carries on along, on each
  // arrival (a route in flight walks on when its next run is that one), then
  // a waiting cut once the move is over. True while the carry is in charge.
  const carryStep = (): boolean => {
    const fc = scene.fabricController;
    // K138: ice's slides carry on too, with the cut off.
    if (!fc || (!fc.cutOn && fc.carry.length === 0)) return false;
    if (fc.walkerMode) return walkerStep(fc); // K114 walker: always in charge.
    if (fc.carry.length > 0) {
      if (dotMoving()) return true;
      const next = fc.carry[0];
      if (routeRuns.length > 0) {
        if (routeRuns[0] === next) routeRuns.shift();
        else clearRoute();
      }
      if (!moveAlong(next)) fc.carry.length = 0; // Never stall on a refusal.
      return true;
    }
    if (pendingCut >= 0 && !dotMoving()) {
      const eid = pendingCut;
      pendingCut = -1;
      applyCut(eid);
    }
    return false;
  };
  const cutUndo = (): void => {
    const fc = scene.fabricController;
    if (!fc || !fc.cutOn || fc.actions.length === 0) return;
    undoMove();
  };
  // The scissors' keys: X arms or puts down, Esc puts down, U undoes.
  const cutKey = (k: CutKey): boolean => {
    // K137 stage 4: Esc puts an armed lure or snare down first.
    if (k === "disarm" && toolArmed !== null) {
      setToolArmed(null);
      return true;
    }
    // K114 walker: U undoes there too; X and Esc have no scissors to move.
    if (scene.fabricController?.walkerMode) {
      return k === "undo" && walkerButtons.isShown ? walkerKey("undo") : false;
    }
    if (!scene.fabricController?.cutOn || !cutButtons.isShown) return false;
    if (k === "arm") setCutArmed(!cutArmed);
    else if (k === "undo") cutUndo();
    else if (cutArmed) setCutArmed(false);
    else return false;
    return true;
  };
  // Every frame (the frame loop, beside the move pad): the buttons show
  // while the cut is on, the keys are live and no open panel covers them (a
  // phone's settings sheet does; a desktop's side panel, open by default,
  // leaves their corner clear); hidden, the scissors are down, and a
  // finished solve drops a waiting cut.
  const panelCoversCut = (): boolean => {
    if (!panel.isOpen()) return false;
    const r = camera.panelWrap?.getBoundingClientRect();
    return !!r && r.width > 0 && cutButtons.covered(r);
  };
  // K137 stage 2: the aid buttons (shown while their aid is on, the keys are
  // live and no open panel covers them) and the renderer's chalk and
  // compass switches (a change redraws the markers once).
  const aidTick = (): void => {
    const fc = scene.fabricController;
    const live = !!fc && !fc.walkerMode && keysLive();
    const hint = live && fc.hintsMax > 0;
    const chalk = live && settings.chalk === true;
    aidHintShown = hint;
    aidChalkShown = chalk;
    aidButtons.setButtons(hint, chalk);
    const r = panel.isOpen() ? camera.panelWrap?.getBoundingClientRect() : null;
    aidButtons.setVisible((hint || chalk) && !(r && r.width > 0 && aidButtons.covered(r)));
    if (hint) aidButtons.setHint(fc.hintsLeft, (scene.fabric?.hintRun ?? -1) >= 0);
    if (chalk) aidButtons.setChalk(fc.chalk.has(fc.head));
    const fabric = scene.fabric;
    if (!fabric || !fc) return;
    const compass = params.compass && !fc.walkerMode;
    const marks = settings.chalk === true;
    if (fabric.compassOn !== compass || fabric.chalkOn !== marks) {
      fabric.compassOn = compass;
      fabric.chalkOn = marks;
      fabric.update(fc);
      invalidate();
    }
  };
  // K137 stage 3c: SPRINT (game/sprint.ts). A press arms it (the turn clock:
  // the next run is the skipped turn; real time: the chase's next two
  // departures run at twice your pace), a second press before the turn
  // clock's first sprinted move disarms it. Refused while the maze is
  // solved, a win waits or the button is hidden.
  const pressSprint = (): boolean => {
    if (!sprintOn() || !sprintButton.isShown) return false;
    const fc = scene.fabricController;
    if (!fc || fc.solved || pendingWin) return false;
    const chase = scene.chase;
    const next = sprintToggle(sprintState, chase !== null);
    if (next === sprintState) return false;
    if (chase && next === "armed" && chase.sprint() !== "armed") return false;
    sprintState = next;
    sprintTick();
    updateHud();
    return true;
  };
  // Every frame: real time follows the chase (both sprinted departures
  // taken: used; one taken: running), then the button's visibility and look.
  const sprintTick = (): void => {
    const c = scene.chase;
    if (c && (sprintState === "armed" || sprintState === "first")) {
      const was = sprintState;
      if (!c.sprintActive) sprintState = "used";
      else if (c.sprintLeft < 2) sprintState = "first";
      if (sprintState !== was) updateHud();
    }
    const r = panel.isOpen() ? camera.panelWrap?.getBoundingClientRect() : null;
    const on = sprintOn() && keysLive() && !(r && r.width > 0 && sprintButton.covered(r));
    sprintButton.setShown(on);
    sprintButton.setLook(sprintState === "used" ? "used" : sprintState === "ready" ? "ready" : "armed");
  };
  // K137 stage 4 (4.10, 4.30): LURES and SNARES. A press arms the tool (a
  // second press, Esc or a tap off the runs puts it down), and the next tap
  // on a run uses it at once, mid-move too (the turn already happened at the
  // tap). Refused while the maze is solved, a win or a catch waits, the
  // buttons are hidden or that stock is spent.
  const pressTool = (k: ToolKind): boolean => {
    if (!toolButtons.isShown) return false;
    const fc = scene.fabricController;
    if (!fc || fc.solved || pendingWin) return false;
    if (toolArmed === k) {
      setToolArmed(null);
      return true;
    }
    const left = k === "lure" ? (luresOn() ? luresLeft : 0) : snaresOn() ? snaresLeft : 0;
    if (left <= 0) return false;
    if (cutArmed) setCutArmed(false); // one armed thing at a time
    setToolArmed(k);
    return true;
  };
  const LURE_STRENGTH = 0.8;
  const useTool = (kind: ToolKind, eid: number): void => {
    const tm = scene.turnMino;
    const ch = scene.chase;
    if ((!tm && !ch) || pendingCatch) return;
    if (kind === "lure") {
      const heard = tm ? tm.lure(eid) : ch!.lure(eid, lureRangeOf(params.lureRange));
      setToolArmed(null);
      if (heard < 0) return;
      luresLeft = Math.max(0, luresLeft - 1);
      cutPluck(eid, 1, LURE_STRENGTH);
      showToast(
        heard === 0
          ? "Nothing heard the lure."
          : heard === 1
            ? "Something heard the lure."
            : `${heard} heard the lure.`,
        CUT_TOAST_MS
      );
    } else {
      if (!(tm ? tm.setSnare(eid) : ch!.setSnare(eid))) {
        // The snare stays armed: tap a run at your junction.
        showToast("A snare goes on a run at your junction, one to a run.", CUT_TOAST_MS);
        cutPluck(eid, REFUSE_OCTAVE, REFUSE_STRENGTH);
        return;
      }
      snaresLeft = Math.max(0, snaresLeft - 1);
      setToolArmed(null);
      cutPluck(eid, SNAP_OCTAVE, SNAP_STRENGTH);
    }
    updateHud();
    invalidate();
  };
  // The run the last armed tool tap picked (-1: none), for the probes: at
  // phone scale a tap at a run's drawn middle can pick a neighbour.
  let toolTapEdge = -1;
  const toolTap = (x: number, y: number, pt: string): boolean => {
    const fc = scene.fabricController;
    const kind = toolArmed;
    if (!fc || !scene.fabric || kind === null) return false;
    const eid = scene.fabric.cutAt(x, y, fc, pickRadius(pt, true));
    toolTapEdge = eid;
    if (eid < 0) setToolArmed(null);
    else useTool(kind, eid);
    return true;
  };
  // Every frame (cutTick): the buttons show while a tool is on under the
  // turn clock minotaur, the keys are live and no open panel covers them;
  // hidden, the tool goes down. A snare sprung since the last frame says so.
  let snaresSprung = 0;
  const toolTick = (): void => {
    const lure = luresOn();
    const snare = snaresOn();
    toolButtons.setTools(lure, snare);
    toolButtons.setCounts(luresLeft, snaresLeft);
    // K795: the tooltips quote the lure's range and the snare's hold.
    toolButtons.setTips(lureRangeOf(params.lureRange), snareHoldOf(params.snareHold));
    toolButtons.setShift(sprintButton.isShown);
    const r = panel.isOpen() ? camera.panelWrap?.getBoundingClientRect() : null;
    const on = (lure || snare) && keysLive() && !(r && r.width > 0 && toolButtons.covered(r));
    toolButtons.setShown(on);
    if (!on || (toolArmed === "lure" && !lure) || (toolArmed === "snare" && !snare)) {
      toolArmed = null;
    }
    syncToolArmed();
    const tm = scene.turnMino;
    let sprung = 0;
    if (tm) for (const s of tm.snares) if (s.phase !== "set") sprung++;
    const cm = scene.chase; // K137 stage 7
    if (cm) for (const s of cm.snares) if (s.phase !== "set") sprung++;
    if (sprung > snaresSprung) {
      showToast(`Snared! It stands ${countWords(snareHoldOf(params.snareHold), tm ? "turn" : "second")}.`, CUT_TOAST_MS);
    }
    snaresSprung = sprung;
  };
  // K114 beat rider: the pause shows while the beat plays (the keys live);
  // an open panel over it hides it but keeps a pause, and an ended game or
  // the beat going off lets the pause go.
  const beatPauseTick = (): void => {
    const live = beatOn() && keysLive();
    beatPause.setRaised(sprintButton.isShown || toolButtons.isShown);
    if (!live && beatPause.isHeld) {
      beatPause.setHeld(false);
      beat?.setHeld(false);
    }
    const r = live && panel.isOpen() ? camera.panelWrap?.getBoundingClientRect() : null;
    beatPause.setShown(live && !(r && r.width > 0 && beatPause.covered(r)));
  };
  const cutTick = (): void => {
    aidTick();
    sprintTick();
    toolTick(); // K137 stage 4
    const fc = scene.fabricController;
    const walker = fc?.walkerMode ?? null;
    // K114 walker: the walker modes have their own buttons, no scissors.
    const on = !!fc && fc.cutOn && !walker && keysLive() && !panelCoversCut();
    cutButtons.setShown(on);
    beatPauseTick();
    walkerTick(fc, walker);
    if (!on) {
      if (cutArmed) setCutArmed(false);
      if (!fc || fc.solved || !fc.cutOn || walker) pendingCut = -1;
      return;
    }
    cutButtons.setUndo(fc.actions.length > 0);
  };

  // K114 WALKER (game/walker.ts; brief docs/design/K114_walker.md). The cut
  // modes "lead" and "delay" hand the moves to a walker, and a tap on any
  // live run cuts it (walkerTap; the refusals are the scissors', checked
  // from the walker's junction). LEAD: the walker follows the thread from
  // the start, turning the fixed way at a strand end (walker.ts); the
  // player cuts, then Go sends it off, one run per head-dot move (the
  // move's own animation is its clock: walkerStep takes the next run on
  // each arrival). A walk that comes back to a state it was in goes in
  // circles: a toast, and back to the start with the cuts kept. DELAY: the
  // walker takes the shortest way to the exit from where it stands,
  // replanning around every cut; each turn is a cut or a pass (Go, "Let it
  // walk"), then it takes one run. The route thread (syncWalker: the
  // telegraph in the walker's colour, its next run brightest) shows where
  // it will go. The HUD's rows: Lead's cuts against par, Delay's walk
  // against the walk it wanted (walkerScoreFn).
  interface WalkerMemo {
    fc: FabricMazeController;
    map: WalkerMap;
    // leadPar's answer, found the first time the HUD asks.
    par: ParResult | null;
    // Delay's route in runs on the uncut maze.
    shortest: number;
    restarts: number;
    mode: "lead" | "delay" | null;
    routeKey: string;
    route: LeadRoute;
    delayKey: string;
    delayRuns: number[];
  }
  let walkerMemo: WalkerMemo | null = null;
  // The memo for this controller, its Lead route as the cuts stand. A new
  // controller, a restart (reset() moves `restarts`) or a mode change puts
  // Lead back to planning.
  const walkerOf = (fc: FabricMazeController): WalkerMemo | null => {
    if (!fc.walkerMode || !scene.tangle) return null;
    let m = walkerMemo;
    if (!m || m.fc !== fc) {
      m = walkerMemo = {
        fc,
        map: walkerMapOf(scene.tangle, fc.walk),
        par: null,
        shortest: delayRoute(fc.walk, fc.walk.start, new Set()).length,
        restarts: -1,
        mode: null,
        routeKey: "\u0000",
        route: { states: [], end: "none", loopAt: -1 },
        delayKey: "\u0000",
        delayRuns: [],
      };
    }
    if (m.restarts !== fc.restarts || m.mode !== fc.walkerMode) {
      m.restarts = fc.restarts;
      m.mode = fc.walkerMode;
      walkerState = "plan";
      walkerIdx = 0;
    }
    const key = fc.cutRuns().join(",");
    if (key !== m.routeKey) {
      m.routeKey = key;
      m.route = leadRoute(m.map, fc.cuts);
    }
    return m;
  };
  // The walker's own move (moveAlong refuses every other mover).
  const walkerMove = (run: number): boolean => {
    walkerDriving = true;
    try {
      return moveAlong(run);
    } finally {
      walkerDriving = false;
    }
  };
  // The state `actions` rebuild, laid out as undoMove lays it (a replay that
  // fails restarts the solve). Lead's planning keeps its cuts through it.
  const walkerRestore = (actions: FabricMazeController["actions"]): void => {
    const fc = scene.fabricController;
    if (!fc || !scene.fabric) return;
    pendingCut = -1;
    if (!fc.replayActions(actions)) {
      restartSolve();
      updateHud();
      return;
    }
    routeRuns = [];
    routeFc = null;
    chaseRoute = [];
    pendingWin = false;
    pendingLoss = false;
    ruleLoss.reset();
    scene.fabric.cancelMove();
    scene.fabric.restoreYarn(fc.taps);
    scene.fabric.exploreRestore(fc);
    scene.fabric.update(fc);
    scene.fabric.exploreRuns(exploredRuns(fc));
    saveAttempt();
    updateHud();
    wake();
  };
  // Lead's walk ended short of the exit: say why, then back to the start
  // with the cuts kept.
  const walkerBack = (msg: string): void => {
    const fc = scene.fabricController;
    if (!fc) return;
    showToast(msg, CUT_TOAST_MS);
    walkerState = "plan";
    walkerIdx = 0;
    walkerRestore(fc.actions.filter((a) => a.kind === "cut"));
  };
  // Every frame first in keyStep (carryStep): Lead's next run on each
  // arrival. Always true: in a walker mode nothing else moves.
  const walkerStep = (fc: FabricMazeController): boolean => {
    pendingCut = -1;
    if (fc.walkerMode !== "lead" || walkerState !== "walk") return true;
    const m = walkerOf(fc);
    if (!m || walkerState !== "walk") return true;
    if (dotMoving() || pendingWin || pendingLoss || fc.solved) return true;
    if (walkerIdx < m.route.states.length) {
      const run = m.route.states[walkerIdx++] >> 1;
      if (!walkerMove(run)) walkerBack("The walker can't go on.");
      return true;
    }
    walkerBack(
      m.route.end === "loop" ? "It's going in circles." : "The walker has no way to go."
    );
    return true;
  };
  // Delay's turn: the walker takes one run of its way to the exit.
  const walkerTurn = (fc: FabricMazeController): void => {
    const run = delayNext(fc.walk, fc.head, fc.cuts);
    if (run >= 0) walkerMove(run);
  };
  // A tap in a walker mode: on a live run it cuts (Delay's walker then
  // takes its turn); anywhere else, or while Lead's walker walks, it falls
  // through to pluck and pan.
  const walkerTap = (x: number, y: number, pt: string): boolean => {
    const fc = scene.fabricController;
    if (!fc || !scene.fabric) return false;
    if (fc.walkerMode === "lead" && walkerState === "walk") return false;
    const eid = scene.fabric.cutAt(x, y, fc, pickRadius(pt, true));
    if (eid < 0) return false;
    if (fc.solved || dotMoving() || pendingWin) return true;
    const r = fc.cut(eid);
    if (r === "cut") {
      cutPluck(eid, SNAP_OCTAVE, SNAP_STRENGTH);
      scene.fabric.update(fc);
      if (fc.walkerMode === "delay") walkerTurn(fc);
      updateHud();
      return true;
    }
    cutRefused(fc, eid, r === "refused");
    return true;
  };
  const walkerGo = (): void => {
    const fc = scene.fabricController;
    if (!fc || !fc.walkerMode || fc.solved || dotMoving() || pendingWin) return;
    if (fc.walkerMode === "delay") {
      walkerTurn(fc);
      updateHud();
      return;
    }
    const m = walkerOf(fc);
    if (!m || walkerState === "walk") return;
    walkerState = "walk";
    walkerIdx = 0;
    updateHud();
  };
  // Lead: back to the start with the cuts kept (after a finish, a fresh
  // solve); Delay: the walk starts over.
  const walkerReset = (): void => {
    const fc = scene.fabricController;
    if (!fc || !fc.walkerMode) return;
    if (fc.walkerMode === "lead" && !fc.solved) {
      walkerState = "plan";
      walkerIdx = 0;
      walkerRestore(fc.actions.filter((a) => a.kind === "cut"));
      return;
    }
    restartSolve();
    updateHud();
  };
  // Lead (planning): the last cut back. Delay: the last turn back, a cut
  // with the run after it, or a pass's run.
  const walkerUndo = (): void => {
    const fc = scene.fabricController;
    if (!fc || !fc.walkerMode || fc.solved || dotMoving() || pendingWin) return;
    const acts = fc.actions;
    if (acts.length === 0) return;
    if (fc.walkerMode === "lead") {
      if (walkerState === "walk") return;
      walkerRestore(acts.slice(0, -1));
      return;
    }
    let n = acts.length;
    if (acts[n - 1].kind === "move") n--;
    if (n > 0 && acts[n - 1].kind === "cut") n--;
    walkerRestore(acts.slice(0, n));
  };
  // The walker's keys (G goes, U undoes), while its buttons show.
  const walkerKey = (k: WalkerKey): boolean => {
    if (!scene.fabricController?.walkerMode || !walkerButtons.isShown) return false;
    if (k === "go") walkerGo();
    else walkerUndo();
    return true;
  };
  walkerScoreFn = (): WalkerScore | null => {
    const fc = scene.fabricController;
    const m = fc ? walkerOf(fc) : null;
    if (!fc || !m) return null;
    if (fc.walkerMode === "lead") {
      if (!m.par) m.par = leadPar(m.map);
      const par = Number.isFinite(m.par.par) ? m.par.par : null;
      // K713: past the search's budget the par is an upper bound ("par ≤ P").
      return { mode: "lead", par, upper: par !== null && !m.par.exact };
    }
    return { mode: "delay", walk: fc.taps.length, shortest: m.shortest };
  };
  // The probe hook's view (__knotFabric().walker; null: no walker). Lead's
  // par is found on the first read, as the HUD's is.
  const walkerProbe = (): WalkerProbe | null => {
    const fc = scene.fabricController;
    const m = fc ? walkerOf(fc) : null;
    if (!fc || !m || !fc.walkerMode) return null;
    const lead = fc.walkerMode === "lead";
    if (lead && !m.par) m.par = leadPar(m.map);
    const par = lead && m.par ? m.par : null;
    return {
      mode: fc.walkerMode,
      state: lead ? walkerState : "turns",
      idx: walkerIdx,
      par: par && Number.isFinite(par.par) ? par.par : null,
      parCuts: par ? [...par.cuts] : [],
      cuts: fc.cutRuns(),
      route: lead
        ? m.route.states.map((d) => d >> 1)
        : delayRoute(fc.walk, fc.head, fc.cuts),
      end: lead ? m.route.end : null,
      walk: fc.taps.length,
      shortest: m.shortest,
      shown: walkerButtons.isShown,
    };
  };
  const panelCoversWalker = (): boolean => {
    if (!panel.isOpen()) return false;
    const r = camera.panelWrap?.getBoundingClientRect();
    return !!r && r.width > 0 && walkerButtons.covered(r);
  };
  // Every frame (cutTick): the buttons, and the route thread. Lead shows
  // its whole walk (from the run under way while it walks), Delay its way
  // to the exit as the cuts stand.
  const walkerTick = (
    fc: FabricMazeController | null,
    walker: "lead" | "delay" | null
  ): void => {
    const m = fc && walker ? walkerOf(fc) : null;
    let runs: number[] | null = null;
    if (fc && m && !fc.solved) {
      if (walker === "lead") {
        const from = walkerState === "walk" ? Math.max(0, walkerIdx - 1) : 0;
        runs = m.route.states.slice(from).map((d) => d >> 1);
      } else {
        const key = `${fc.head}|${m.routeKey}`;
        if (key !== m.delayKey) {
          m.delayKey = key;
          m.delayRuns = delayRoute(fc.walk, fc.head, fc.cuts);
        }
        runs = m.delayRuns;
      }
    }
    scene.fabric?.syncWalker(runs);
    // After a finish, once the banner is closed, the buttons come back with
    // only Reset live: it starts a fresh solve (walkerReset).
    const after = !!fc && fc.solved && !pendingWin && !banner.shown;
    const shown = !!fc && !!m && (keysLive() || after) && !panelCoversWalker();
    walkerButtons.setShown(shown);
    if (!shown || !fc || !m) return;
    const busy = dotMoving() || pendingWin || fc.solved;
    const walking = walker === "lead" && walkerState === "walk";
    walkerButtons.setGo(
      walker === "lead" ? "Go" : "Let it walk",
      walker === "lead"
        ? "Go (G): send the walker off"
        : "Let it walk (G): no cut this turn, the walker takes one run",
      !walking && !busy && (walker === "delay" || m.route.end !== "none")
    );
    walkerButtons.setReset(walking || fc.actions.length > 0);
    walkerButtons.setUndo(
      !walking && !busy && fc.actions.length > 0,
      walker === "lead" ? "Undo (U): take back the last cut" : "Undo (U): take back the last turn"
    );
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
      contextLost: () => glContextLost,
      carryStep: () => carryStep(),
      cutKey: (k) => cutKey(k),
      walkerKey: (k) => walkerKey(k),
      aidKey: (k) => aidKey(k),
      sprintKey: () => pressSprint(), // K137 stage 3c
      toolKey: (k) => pressTool(k), // K137 stage 4
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
    dropKeys,
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
      lossFx,
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
      cutTick,
      pollGamepad,
      handRendererLook,
      loadingTick,
      presettleTick,
      warmHoldTick,
      showFabricWin,
      showFireLoss: showLoss, // K137: a rule loss too.
      keyStep: () => {
        keyStep();
        ruleLoss.step(); // K137: a snap sounds as the dot arrives.
        fireBeatStep(); // K546 stage 2: the burn-in creep.
      },
      autoAudioTick,
      freeze,
      flags,
      // K6-1 polls (read-only): the chase's clock, the turn minotaur's wait,
      // a catch still travelling to its contact moment (K546; a move or a
      // wait carries it, so this only guards its landing frame), a key
      // hold, a waiting move.
      gameNeedsFrame: () =>
        (scene.chase !== null && chaseRunning && !scene.chase.finished) ||
        (scene.turnMino !== null && turnWait > 0) ||
        (pendingGhost !== null) || // K546 stage 2: the rendezvous runs.
        (fireBeatFrom >= 0) || // K546 stage 2: the burn-in runs.
        (pendingCatch !== null && pendingCatch.tm === scene.turnMino) ||
        keyInput.keyHold ||
        moveWait.waiting !== null ||
        (beat !== null && beat.needsFrame()),
      tickBeat: (dt: number) => {
        const moved = beat?.tick(dt) ?? false;
        // K114 item 6: the head ring pulses on the beat (brightness
        // only under reduced motion).
        if (scene.fabric && beat) {
          scene.fabric.beatPulse = beat.phase();
          scene.fabric.beatPulseReduced = motion.reduced;
          scene.fabric.pulseHead();
        }
        return moved;
      },
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

  // K456: a lost WebGL context (src/app/context_loss.ts). Pixi restores
  // its resources itself; the page saves, stops drawing into the void,
  // covers the canvas and refuses input until the restore, then redraws
  // (the frame loop's resume re-renders the background's texture).
  const contextLoss = installContextLoss({
    canvas: app.canvas,
    isHidden: () => document.hidden,
    now: () => performance.now(),
    cover: createLossCover(
      document,
      () => app.canvas.style.background,
      () => location.reload(),
      // Only a daily's attempt in progress survives a reload (K47); free
      // play starts its maze over. Knot mode and a finished daily: nothing.
      () =>
        dailyAttemptLive()
          ? "Your progress is saved."
          : dailyN === null && scene.fabricController
            ? "Reloading starts this maze over."
            : ""
    ),
    onLost: () => {
      glContextLost = true;
      saveAttempt();
      savePrefsNow();
      clock.setHidden(true, performance.now());
      loop.suspend();
      dropKeys();
    },
    onRestored: () => {
      glContextLost = false;
      clock.setHidden(document.hidden, performance.now());
      loop.resume();
    },
  });

  // The probe hooks (window.__knot*): src/app/probe_hooks.ts.
  installProbeHooks({
    scene,
    a11y,
    app,
    background,
    clock,
    confetti,
    lossFx,
    contrast,
    cutPluckLog,
    dailyStore,
    fitCur,
    frameCost,
    heldKeys,
    host,
    indicators,
    loopFlags: flags,
    stampEl: stamp,
    contextLoss,
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
    get loopSuspended() {
      return loop.suspended;
    },
    get turnWait() {
      return turnWait;
    },
    get cutArmed() {
      return cutArmed;
    },
    get hearts() {
      return heartsShown(); // K137 stage 3a
    },
    // K137 stage 3c: sprint's state, its button and a press.
    get sprint() {
      return sprintOn() ? sprintState : null;
    },
    get sprintShown() {
      return sprintButton.isShown;
    },
    pressSprint: () => pressSprint(),
    // K137 stage 4: the lures and snares (stocks, the armed tool, the laid
    // snares, the model counts) and a press.
    get tools() {
      const tm = scene.turnMino;
      return {
        lures: luresShown(),
      pings: pingsShown(), // K137 sonar (4.26)
        snares: snaresShown(),
        armed: toolArmed,
        shown: toolButtons.isShown,
        laid: tm ? tm.snares.map((s) => ({ ...s })) : [],
        lured: tm?.lured ?? 0,
        heardBy: tm?.heardBy ?? 0,
        tapEdge: toolTapEdge,
      };
    },
    pressTool: (k: ToolKind) => pressTool(k),
    get pendingCut() {
      return pendingCut;
    },
    get cutShown() {
      return cutButtons.isShown;
    },
    get walker() {
      return walkerProbe();
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
