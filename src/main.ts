import { Application, Container } from "pixi.js";
import type { Ticker } from "pixi.js";
import { buildSceneGraph } from "./core/scene_graph";
import { buildSectionRuns, setGamutConfig } from "./core/section_colors";
import { buildWalkGraph } from "./core/walk_graph";
import type { WalkGraph } from "./core/walk_graph";
// K7: main never steps or writes the physics itself - every write goes
// through the PhysicsHost (physics/physics_host.ts); `ps` is its read view.
import type { ParticleSystem, PhysicsTuning } from "./physics/particle_system";
import { InThreadHost, LOAD_SIM_CAP } from "./physics/physics_host";
import type { PhysicsHost } from "./physics/physics_host";
import { WorkerHost } from "./physics/worker_host";
import { RibbonRenderer } from "./render/ribbon_renderer";
import { DebugRenderer } from "./render/debug_renderer";
import { FabricMazeRenderer } from "./render/fabric_maze_renderer";
import { EXPLORE_LOOKS } from "./render/explore_glsl";
import { FabricMazeController } from "./game/fabric_controller";
import { buildFire } from "./game/fire";
import type { Fire } from "./game/fire";
import {
  HeldKeys,
  KEY_REACH,
  MoveWait,
  absorbsChord,
  chordEdges,
  chordMatters,
  departureVectors,
  holdDue,
  keyBelongsElsewhere,
  keyDirOf,
  pickHold,
  pickMove,
} from "./ui/key_moves";
import type { Departure, KeyDir, LastPress, WaitingMove } from "./ui/key_moves";
import { MOVE_PAD_KEY, MovePad, movePadPref } from "./ui/move_pad";
import { MinotaurChase } from "./game/minotaur";
import type { ChaseEvent } from "./game/minotaur";
import { TurnMinotaur, turnConfig, turnSeed } from "./game/minotaur_turns";
import { RevealAnimator } from "./render/reveal";
import { BackgroundLayer } from "./render/background";
import {
  accentHexes,
  backgroundColors,
  customBackgroundColors,
  parseHexColor,
} from "./render/background_model";
import {
  chaseParamsOf,
  clampHoverGlowFade,
  clampHoverGlowLength,
  clampHoverGlowWidth,
  fireSettingsOf,
  turnMinoParamsOf,
  writeParams as writeTokenParams,
  newSeed,
  ROOT_NOTES,
  LOAD_SETTLE_MAX,
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
  resetPathAction,
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
import {
  PANEL_TWEEN_S,
  clampFitView,
  easePanel,
  noAllowance,
  stepPanelTween,
  stepRange,
  type OpenPanel,
} from "./ui/view_clamp";
import {
  DARK_DISC,
  GLYPH_R,
  HEAD_INDICATOR_KEY,
  INDICATOR_SIZE_KEY,
  MINOTAUR_INDICATOR_KEY,
  OffscreenIndicators,
  indicatorPrefs,
} from "./ui/offscreen_indicators";
import type { IndicatorStyle, Rect } from "./ui/offscreen_indicators";
import {
  DEFAULT_GLYPHS,
  markerDotRadiusFor,
  markerGlyphSvgFit,
  markerRadiusFor,
} from "./render/marker_glyphs";
import { ConfettiLayer } from "./render/confetti";
import { confettiPlan, sprayUnit } from "./render/confetti_model";
import { PLUCK_WHOLE_MAX, type PluckRipple } from "./render/pluck_model";
import { PluckRipples } from "./render/pluck_ripple";
import { startShaderWarmup, warmContextFor } from "./render/shader_warmup";
import { openDailyStats } from "./ui/daily_stats_view";
import { shareOrCopy, showToast } from "./ui/share";
import { buildPanel } from "./ui/tweakpane_panel";
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
  highContrastChoice,
  overriddenKeys,
  reducedMotionChoice,
  type A11yFlags,
  type A11yKey,
} from "./ui/accessibility";
import { KnotSynth } from "./audio/knot_synth";
import { SnoreSfx, fetchSnore } from "./audio/snore_sfx";
import { attachSnoreLink } from "./ui/snore_link";
import {
  assignPitches,
  assignPitchesFromList,
  segmentsNear,
  noteToFreq,
} from "./audio/pitch_space";
import type { PitchAssignment } from "./audio/pitch_space";
import { SCARBOROUGH_FAIR } from "./audio/songs";
import { SongScheduler } from "./audio/song_scheduler";
import { createLoader } from "./ui/loader";
import type { SceneRef } from "./app/scene_ref";
import { createStamp } from "./app/stamp";
import { installProbeHooks } from "./app/probe_hooks";

const BACKGROUND = 0x151b28;
const FIT_MARGIN = 40;

// The stamp/perf readout's visibility persists per browser.
const STATS_KEY = "knotmaze.showStats";
const MAZE_STATS_KEY = "knotmaze.showMazeStats";
// K73 viewer preferences for the off-screen indicators (both default on;
// K84 sorts every param into preference vs design later).
const FINISH_INDICATOR_KEY = "knotmaze.finishIndicator";
const TAP_TO_PAN_KEY = "knotmaze.tapToPan";
// Pinch / wheel zoom ceiling, as a multiple of the auto-fit scale.
const MAX_ZOOM = 8;
// FOLLOW camera (cameraMode follow): framing span (lattice units across
// the short screen side), the grace period after a pan/zoom gesture
// before the pull-back spring engages, its ease-in time, and its
// full-strength angular rate (critically damped - weak, no overshoot).
const FOLLOW_SPAN = 13;
const FOLLOW_DELAY = 1.2;
const FOLLOW_RAMP = 1.0;
const FOLLOW_W = 2.4;
// K96: the camera steps by REAL elapsed time (the ticker's deltaMS is
// capped at 100 ms), the spring in substeps of at most CAM_STEP so it stays
// stable, so a low frame rate no longer means a slow-motion camera. A
// stall longer than CAM_MAX_DT (a hidden tab) counts as that long.
const CAM_STEP = 0.05;
const CAM_MAX_DT = 1;

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

// PHYSICS OFF (the `physics` param unchecked): every build settles HIDDEN
// behind the loading indicator (the host's load slices) until the sleep
// gate trips, then the simulation stops for good and the appearance
// animation plays over the frozen layout. A later visible re-settle
// (unchecking while awake, or a physics slider moved while frozen) gives
// up after SETTLE_WALL_CAP_MS.
const SETTLE_WALL_CAP_MS = 12000;

// RENDER-ONLY PLUCK input (see render/pluck_overlay.ts): a press that
// stays within the slop (CSS px, per pointer type) until release is a TAP
// - it plucks, touching no physics; moving past it commits a tug (or, with
// physics off, a camera pan). Taps sound at TAP_STRENGTH.
const TAP_SLOP_PX: Record<string, number> = { mouse: 4, pen: 6, touch: 10 };
const TAP_STRENGTH = 0.55;
// Lobes kept each side of the plucked one: the fabric walk run (capped)
// and the local window used in knot mode / off the walk graph.
const RUN_REACH = 6;
const LOBE_REACH = 2;
// K101: how far ahead (seconds of audio clock) music mode schedules its
// notes. A frame longer than this makes a note start late, never early.
const MUSIC_LOOKAHEAD = 0.3;

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
    ? new WorkerHost(() => rebuild(), { prebuild: params })
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
  // K307 stage 2: THE SHADER WARM-UP (render/shader_warmup.ts, lore:
  // render-shaders.md). Wave 1, what this mode's intro draws, compiles now,
  // in parallel with the hidden pre-settle; the first visible frame waits
  // for it (presettleTick's mayFinish, beginSettle's instant hold). Until
  // then the background draws nothing (pixi would link it cold), and the
  // ripple pools its texture after (K279 stage 2; its program is wave 1's).
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

  // The physics host (`host`) is made before app.init (K7 stage 5's start
  // gate, above).
  let ps: ParticleSystem | null = null;
  let renderer: RibbonRenderer | null = null;
  let debug: DebugRenderer | null = null;
  let walkGraph: WalkGraph | null = null;
  // The build's strand hue groups (maze plan; undefined in knot mode) +
  // strand count, kept for live recolors (the Look color controls).
  let buildHueGroup: number[] | undefined;
  let buildStrandCount = 0;
  let fabric: FabricMazeRenderer | null = null;
  // K80's real-time mode (params.clock "realtime"): the chase over the walk
  // graph (game/minotaur.ts), built with the fabric. Its clock starts at the
  // player's first accepted tap (chaseRunning) and stops at the finish.
  let chase: MinotaurChase | null = null;
  let chaseRunning = false;
  // K80 TURNS: the turn-aligned minotaur (params.minotaur under the turn
  // clock, game/minotaur_turns.ts), built with the fabric. Every accepted
  // move is a turn, and so is a wait (a tap on your own junction); its run
  // plays over the player's move animation, a wait's over turnWaitDur.
  let turnMino: TurnMinotaur | null = null;
  let turnWait = 0; // Seconds left of a wait's animation (0: none).
  let turnWaitDur = 0;
  // The minotaur on screen, whichever clock moves it.
  const liveMino = (): MinotaurChase | TurnMinotaur | null => chase ?? turnMino;
  let fabricController: FabricMazeController | null = null;
  // K114 BURN RACE (game/fire.ts): the fire for walk graph `w` under the
  // params on screen, or null (off, real time, or the turn minotaur on:
  // fireSettingsOf). The controller's `fire`; a change restarts the solve.
  const fireOf = (w: WalkGraph): Fire | null => {
    const s = params.mazeFabric ? fireSettingsOf(params) : null;
    return s ? buildFire(w, s.speed, s.delay) : null;
  };
  // Set when a losing move lands; the Burnt banner waits for the dot.
  let pendingLoss = false;
  // Stage 22: the running appearance animation (null = instant / done
  // long ago). Rebuilds and "Replay settle" restart it.
  let reveal: RevealAnimator | null = null;
  // K5: the scene lets above, for code moved out of main()
  // (src/app/scene_ref.ts). Built once; never destructure it or cache a
  // value read through it.
  const scene: SceneRef = {
    get ps() {
      return ps;
    },
    get renderer() {
      return renderer;
    },
    get debug() {
      return debug;
    },
    get walkGraph() {
      return walkGraph;
    },
    get buildHueGroup() {
      return buildHueGroup;
    },
    get buildStrandCount() {
      return buildStrandCount;
    },
    get fabric() {
      return fabric;
    },
    get chase() {
      return chase;
    },
    get turnMino() {
      return turnMino;
    },
    get fabricController() {
      return fabricController;
    },
    get reveal() {
      return reveal;
    },
  };

  // PHYSICS MODE. live = physics on (today's behavior: awake until the
  // sleep gate, woken by input). With the `physics` param off: loading =
  // the hidden chunked settle behind the indicator; settling = a VISIBLE
  // settle-then-freeze (unchecked while awake, or a physics slider moved
  // while frozen); frozen = no ps.step() at all - only render-side motion
  // (flow, pulses, traversal, the reveal, plucks) runs.
  type PhysState = "live" | "loading" | "settling" | "frozen";
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
  const loader = createLoader();

  // Stage 20 audio: every segment (walk-graph run in fabric mode, whole
  // strand otherwise) owns one pitch from the chosen space, assigned by
  // length bucket. audioRuns maps a chain ctrl to its run for manual
  // plucks; audioSegSite is where auto plucks physically tug.
  let audioAssign: PitchAssignment | null = null;
  let audioRuns: Map<
    number,
    Array<{ c0: number; c1: number; seg: number }>
  > | null = null;
  let audioSegSite: Array<{ chain: number; ctrl: number }> = [];
  let nextRandomPluck = 0;
  // K101: music mode's notes, on the audio clock once it runs.
  const songSched = new SongScheduler();

  // The unanchored knot finds its own shape, so the viewport fit follows
  // the live particle bounds, easing toward the target to avoid popping.
  const fitTarget = { scale: 1, x: 0, y: 0 };
  // K198: the framed maze's drawn right edge, world x (the pan range's).
  let fitRight = 0;
  function computeFitTarget(): void {
    if (!ps) return;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < ps.particleCount; i++) {
      const x = ps.positions[i * 2];
      const y = ps.positions[i * 2 + 1];
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
      params.mazeFabric && fabric
        ? (fabric.fogVisibleBounds() ?? fabric.exploreVisibleBounds())
        : null;
    if (fogBox) {
      minX = fogBox.minX;
      minY = fogBox.minY;
      maxX = fogBox.maxX;
      maxY = fogBox.maxY;
      pad = 0.3;
    }
    // The threads' edge, or a start/head/exit disc poking past it; under
    // fog, the visible region's.
    fitRight = fogBox
      ? maxX
      : Math.max(
          maxX + params.threadWidth / 2,
          params.mazeFabric && fabric ? fabric.markersRight() : -Infinity
        );
    minX -= pad;
    minY -= pad;
    maxX += pad;
    maxY += pad;
    const w = Math.max(maxX - minX, 1);
    const h = Math.max(maxY - minY, 1);
    // Fit the knot, but never zoom in past a comfortable thread scale.
    fitTarget.scale = Math.min(
      (app.screen.width - FIT_MARGIN * 2) / w,
      (app.screen.height - FIT_MARGIN * 2) / h,
      90
    );
    fitTarget.x = (app.screen.width - w * fitTarget.scale) / 2 - minX * fitTarget.scale;
    fitTarget.y =
      (app.screen.height - h * fitTarget.scale) / 2 - minY * fitTarget.scale;
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
  const readPanel = (): boolean => {
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
  }
  const placeWorldAt = (
    wx: number,
    wy: number,
    sx: number,
    sy: number,
    s: number
  ): void => {
    const lo = camFollow
      ? Math.min(fitTarget.scale, followScale()) * 0.85
      : fitCur.scale;
    const hi = camFollow ? followScale() * 4 : fitCur.scale * MAX_ZOOM;
    const sc = Math.min(hi, Math.max(lo, s));
    const px = sx - wx * sc;
    const py = sy - wy * sc;
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
      clampView();
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
    camTween = null;
    if (camFollow) camTouchedAt = -1e9; // Full-strength pull at once.
    else viewHoming = true;
  };
  // How long a follow camera stays on a framing an indicator's tap moved it
  // to, beyond the usual FOLLOW_DELAY, before it eases back to the head.
  const PEEK_HOLD = 1.3;
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
      s
    );
    // The follow spring stays off through the move, then for the hold.
    camTouchedAt = nowSec() + (u >= 1 ? tw.hold : 0);
    viewHoming = false;
    if (u >= 1) camTween = null;
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
  const introPlaying = (): boolean => reveal !== null && !reveal.done;

  // Per-frame camera step, in EVERY ticker branch (fog reveals grow and
  // the head travels while the physics sleeps).
  let fitFrames = 0;
  const updateCamera = (dt: number): void => {
    stepPanel(dt);
    if (fitFrames++ % 3 === 0) computeFitTarget();
    fitCur.scale += (fitTarget.scale - fitCur.scale) * 0.08;
    fitCur.x += (fitTarget.x - fitCur.x) * 0.08;
    fitCur.y += (fitTarget.y - fitCur.y) * 0.08;
    setCamFollow(
      params.cameraMode === "follow" && params.mazeFabric && fabric !== null
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
    if (!intro && fabric && fabric.headPosition(headScratch)) {
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

  // Stage 22: (re)start the appearance animation: hand the renderer a
  // fresh animator. Instant mode detaches everything: the render path is
  // byte-identical to the pre-Stage-22 build. The settle before the reveal
  // is the caller's (K147: the hidden pre-settle, or the physics-off load).
  function startAppearance(): void {
    if (!ps || !renderer) return;
    if (params.appearSequence === "instant") {
      reveal = null;
      renderer.beginReveal(null);
      if (fabric) fabric.revealQuery = null;
      return;
    }
    reveal = new RevealAnimator(
      params.appearSequence,
      walkGraph,
      ps,
      params.seed
    );
    // The ticker re-syncs this from the slider every frame (an x1.8 burn
    // factor applied here was overwritten before it ever ticked - the
    // appearMode presets are tuned at the plain slider speed).
    reveal.speed = params.appearSpeed;
    renderer.beginReveal(reveal);
    if (fabric) {
      const r = renderer;
      fabric.revealQuery = (chain, ctrl) => r.revealMulAtCtrl(chain, ctrl);
    }
  }

  // PHYSICS OFF, step 1: hide the scene and settle it in slices (the
  // ticker calls loadingTick every frame) behind the loading indicator.
  function beginLoading(): void {
    if (!ps || !renderer) return;
    physState = "loading";
    warmHoldFrom = -1;
    host.beginLoad();
    reveal = null;
    renderer.beginReveal(null);
    if (fabric) fabric.revealQuery = null;
    root.visible = false;
    indicators.hideAll();
    loader.show();
  }

  // One slice of the hidden settle (the host's loadFrame: virtual 60 fps
  // frames through the normal step() and the normal sleep gate).
  function loadingTick(): void {
    if (!ps) return;
    const status = host.loadFrame(physicsTuning());
    if (status === "halted") {
      halted = true;
      loader.hide();
      root.visible = true;
      perfLine = " | HALTED: physics went non-finite (regenerate to reset)";
      console.error("KnotMaze: physics state went non-finite; simulation halted.");
    } else if (status === "done" && warmup.wave1Done) {
      finishLoading(); // K307: not before the warm-up's wave 1.
    }
  }

  // PHYSICS OFF, step 2: the layout is final. Build the render once, start
  // the appearance animation over it, show the scene, and stop simulating
  // (or go live, if physics was switched back on meanwhile).
  function finishLoading(): void {
    if (!ps || !renderer) return;
    host.endLoad();
    // Reveal first, so the very first visible frame already wears its
    // (collapsed) masks - no one-frame flash of the finished knot.
    startAppearance();
    handRendererLook(); // K239: the first frame wears the worn fade and flow.
    renderer.update();
    if (fabric && fabricController) fabric.update(fabricController);
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
    renderer?.plucks.clear();
    if (!params.physics) {
      // Physics off: the replay is a fresh hidden load + reveal.
      beginLoading();
      return;
    }
    // Replay the appearance too: fresh pre-settle, fresh reveal clock.
    beginSettle();
    wake();
  }

  // The page color: the shared ink, or a custom background's base color
  // (K79), which then shows behind none and under the flat fog too.
  function pageInk(): number {
    return look("backgroundColorMode") === "custom"
      ? parseHexColor(look("backgroundBase"), BACKGROUND)
      : BACKGROUND;
  }
  let canvasInk = BACKGROUND;

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

  // K147, PHYSICS ON: settle a new (or replayed) knot. A non-instant
  // appear mode with loadSettle > 0 first settles it HIDDEN (the ticker's
  // loading branch runs presettleTick); otherwise the scene shows at once.
  // Either way the budgeted settle then runs from the first visible frame
  // to the first sleep.
  function beginSettle(): void {
    if (!ps || !renderer) return;
    host.disarm();
    warmHoldFrom = -1;
    if (params.appearSequence === "instant" || params.loadSettle <= 0) {
      if (!warmup.wave1Done) {
        // K307: hidden, inputs off as in a load, until wave 1 is in.
        physState = "loading";
        warmHoldFrom = performance.now();
        loaderShownAt = -1;
        root.visible = false;
        indicators.hideAll();
        loader.hide();
        return;
      }
      physState = "live";
      startAppearance();
      // A physics-off load cut short by this rebuild left these behind.
      root.visible = true;
      loader.hide();
      host.armBudget(params.settleBudget);
      return;
    }
    physState = "loading";
    host.beginPresettle();
    loaderShownAt = -1;
    reveal = null;
    renderer.beginReveal(null);
    if (fabric) fabric.revealQuery = null;
    root.visible = false;
    indicators.hideAll();
    loader.hide();
  }

  // One slice of the hidden pre-settle (the host's presettleFrame: virtual
  // 60 fps frames through the normal step() and the normal sleep gate). It
  // may end at the first sleep, after PRESETTLE_SIM simulated seconds or
  // loadSettle seconds of stepping (at loadSettle's max: LOAD_SIM_CAP or
  // LOAD_WALL_CAP_MS); it does end once the loader, if it showed, has
  // shown for LOADER_MIN_MS, and steps on meanwhile unless asleep.
  function presettleTick(): void {
    if (!ps) return;
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
      halted = true;
      physState = "live"; // Keeps the HALTED line on the stamp.
      loader.hide();
      root.visible = true;
      perfLine = " | HALTED: physics went non-finite (regenerate to reset)";
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
        loader.show();
        loaderShownAt = performance.now();
      }
    }
    // K307: so does the warm-up's wave 1, still compiling at LOADER_DELAY_MS.
    if (loaderShownAt < 0 && !warmup.wave1Done && pr.elapsed > LOADER_DELAY_MS) {
      loader.show();
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
      loader.show();
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
    if (!ps || !renderer) return;
    host.finishPresettle(loaderShownAt >= 0);
    // Reveal first, so the very first visible frame already wears its
    // (collapsed) masks - no one-frame flash of the finished knot.
    startAppearance();
    handRendererLook(); // K239: the first frame wears the worn fade and flow.
    renderer.update();
    if (fabric && fabricController) fabric.update(fabricController);
    fitToScreen();
    root.visible = true;
    loader.hide();
    physState = "live";
    host.goLive(params.settleBudget);
  }

  // The background follows the design: effect + intensity + animation
  // speed + shape, the page ink and the design's gamut accents (or the
  // custom colors), the seed - and the fog of war (when on) draws as the
  // background instead of a flat color.
  function syncBackground(): void {
    const effHue = (((params.seed % 360) + params.hueShift) % 360 + 360) % 360;
    setGamutConfig(params.gamutArc, look("palette"));
    const ink = pageInk();
    if (ink !== canvasInk) {
      canvasInk = ink;
      app.canvas.style.background = `#${ink.toString(16).padStart(6, "0")}`;
    }
    // Shape first: an effect that turns on below lays out at its scale.
    background.setShape({
      scale: params.backgroundScale,
      detail: params.backgroundDetail,
      fibers: params.backgroundFibers,
      grain: params.backgroundGrain,
      angle: params.backgroundAngle,
    });
    background.configure(
      look("background"),
      params.backgroundIntensity,
      params.backgroundSpeed
    );
    background.setDesign(
      look("backgroundColorMode") === "custom"
        ? customBackgroundColors(
            look("backgroundBase"),
            params.backgroundAccent1,
            params.backgroundAccent2,
            params.backgroundAccent3,
            BACKGROUND
          )
        : backgroundColors(BACKGROUND, effHue),
      params.seed
    );
    fabric?.setFogColor(ink);
    fabric?.setFogBackdrop(background.texture);
  }

  // Recolor the live scene in place (the look color rows, and K111's high
  // contrast, which swaps the palette and the route color): no rebuild, no
  // wake. The background follows through syncBackground().
  function recolorScene(): void {
    if (!renderer || !ps) return;
    const effHue = (((params.seed % 360) + params.hueShift) % 360 + 360) % 360;
    setGamutConfig(params.gamutArc, look("palette"));
    renderer.recolor(
      effHue,
      parseInt(look("pathColor").slice(1), 16),
      params.colorScheme === "strands"
        ? buildHueGroup
        : new Array<number>(buildStrandCount).fill(0),
      buildSectionRuns(
        params.colorScheme,
        walkGraph,
        ps.chains.map((c, i) => ({ len: c.length, closed: ps!.chainBreakAfter[i] < 0 })),
        buildHueGroup,
        params.seed,
        effHue
      ),
      params.colorScheme,
      params.seed,
      params.junctionBlend
    );
    if (fabric && fabricController) fabric.update(fabricController);
  }

  function rebuild(): void {
    // K47/K56: a change that leaves the daily parks its attempt first; one
    // that keeps it (a rebuild of the daily itself) saves the attempt now,
    // to restore it into the new scene below.
    syncDaily();
    saveAttempt();
    // K140: the old maze's finish is gone, and so is its confetti.
    confetti.clear();
    // K279: and its ripples.
    ripples.clear();
    renderer?.destroy();
    debug?.container.destroy({ children: true });
    fabric?.destroy();
    root.removeChildren();

    // The lattice, and in fabric mode the maze plan's graph surgery
    // (core/scene_graph.ts; K7 stage 1 moved it there unchanged).
    const { graph, hueGroup } = buildSceneGraph(params);

    // K7: the host owns the system; `ps` is main's read-only view of it.
    ps = host.build(graph, params);
    buildHueGroup = hueGroup;
    buildStrandCount = graph.strands.length;

    // Color space for this build: seed hue rotated by hueShift; arc width
    // and palette preset configure gamutRgb for every consumer (schemes
    // AND the renderer's per-sample noise path).
    const effHue = (((params.seed % 360) + params.hueShift) % 360 + 360) % 360;
    setGamutConfig(params.gamutArc, look("palette"));

    // The walk graph feeds both the section coloring and (in fabric mode)
    // the gameplay, so it builds before the renderer.
    walkGraph = params.mazeFabric ? buildWalkGraph(graph) : null;

    renderer = new RibbonRenderer(ps, {
      threadWidth: params.threadWidth,
      casingWidth: params.threadWidth + look("gap") * 2,
      baseHue: effHue,
      pathColor: parseInt(look("pathColor").slice(1), 16),
      // Knot-mode tints only (palette mode colors via the section field):
      // per-strand hues for the strands scheme, mono otherwise.
      hueGroup:
        params.colorScheme === "strands"
          ? hueGroup
          : graph.strands.map(() => 0),
      // Fabric gameplay recolors the actual threads via palette textures.
      paletteMode: params.mazeFabric,
      flowSeed: params.seed,
    });
    renderer.setSectionRuns(
      buildSectionRuns(
        params.colorScheme,
        walkGraph,
        ps.chains.map((c, i) => ({ len: c.length, closed: ps!.chainBreakAfter[i] < 0 })),
        hueGroup,
        params.seed,
        effHue // The gamut anchor; matches style.baseHue.
      ),
      params.colorScheme,
      params.seed,
      params.junctionBlend
    );

    // Branching gameplay over the fabric: branch-point-only solve state +
    // the thread-true paint overlay (the walk graph was built above).
    if (params.mazeFabric && walkGraph) {
      fabricController = new FabricMazeController(
        walkGraph,
        params.pathViz === "trail",
        fireOf(walkGraph) // K114: null with the fire off.
      );
      fabric = new FabricMazeRenderer(
        ps,
        walkGraph,
        params.threadWidth,
        renderer
      );
      fabric.trailMode = params.pathViz === "trail";
      fabric.pathViz = params.pathViz;
      fabric.tension = params.tension;
      fabric.trailLength = params.trailLength;
      syncExploration(fabric);
      fabric.markerSize = look("markerSize");
      fabric.fogColor = pageInk();
      fabric.update(fabricController);
    } else {
      fabricController = null;
      fabric = null;
    }
    syncBackground();
    pendingWin = false;
    pendingLoss = false;
    restartChase();
    resetAttempt();
    hideWin();
    rebuildAudioMap();

    // Appearance animation: settle hidden first, then attach the reveal
    // (K147: beginSettle's pre-settle, finishPresettle; physics off: the
    // whole layout, finishLoading) - or, instant, show and settle at once.
    if (params.physics) {
      beginSettle();
    } else {
      beginLoading();
    }
    // K47: a daily opens where its saved attempt left off.
    restoreSavedAttempt();

    debug = new DebugRenderer();
    debug.render(graph);
    // The debug renderer draws at cellSize px per lattice unit; the root
    // container already maps lattice units to screen, so counter-scale.
    debug.container.scale.set(1 / debug.cellSize);
    debug.container.visible = settings.showDebug;

    // Order: head glow UNDER the weave, ribbons, the fabric gameplay
    // overlay, debug.
    if (fabric) root.addChild(fabric.underContainer);
    root.addChild(renderer.root);
    if (fabric) root.addChild(fabric.overContainer);
    root.addChild(debug.container);
    // A new scene starts at the home view (user zoom/pan reset); a
    // follow camera takes over from this framing on the next frame.
    setCamFollow(false);
    view.zoom = 1;
    view.panX = 0;
    view.panY = 0;
    viewHoming = false;
    camTween = null;
    // The off-screen indicators decide again on the new scene's first
    // frame.
    indicators.hideAll();
    fitToScreen();
    writeParams(params);

    console.log(
      `KnotMaze: seed ${params.seed}, ${graph.nodes.size} nodes, ` +
        `${graph.edges.size} edges, ${graph.strands.length} strands.`
    );
  }

  // Re-derive the per-segment pitch assignment (cheap; no scene rebuild).
  function rebuildAudioMap(): void {
    if (!ps) return;
    let assignFor: (lengths: number[]) => PitchAssignment;
    if (params.soundMode === "music") {
      // Music mode: the buckets are EXACTLY the song's distinct pitches,
      // so every thread belongs to some note the piece actually plays
      // and every note has segments to animate. pitchSpace/octaves do
      // not apply here (the panel hides them).
      const set = new Set<number>();
      for (const r of SCARBOROUGH_FAIR.notes) {
        if (!r.note) continue;
        const f = noteToFreq(r.note);
        if (Number.isFinite(f)) set.add(Math.round(f * 1000) / 1000);
      }
      const pitches = [...set].sort((a, b) => a - b);
      assignFor = (lengths) => assignPitchesFromList(pitches, lengths);
    } else {
      // Root: seed-derived unless the rootNote param picks a fixed class.
      const rootIdx = ROOT_NOTES.indexOf(params.rootNote) - 1;
      const root = rootIdx >= 0 ? rootIdx : params.seed % 12;
      assignFor = (lengths) =>
        assignPitches(
          params.pitchSpace,
          params.octaves,
          root,
          lengths,
          params.tonicEmphasis
        );
    }
    if (walkGraph) {
      audioAssign = assignFor(walkGraph.edges.map((e) => e.length));
      audioRuns = new Map();
      audioSegSite = walkGraph.edges.map((e) => ({
        chain: e.chain,
        ctrl: (e.ctrlA + e.ctrlB) / 2,
      }));
      for (const e of walkGraph.edges) {
        let list = audioRuns.get(e.chain);
        if (!list) {
          list = [];
          audioRuns.set(e.chain, list);
        }
        list.push({ c0: e.ctrlA, c1: e.ctrlB, seg: e.id });
      }
    } else {
      audioAssign = assignFor(ps.chains.map((c) => c.length));
      audioRuns = null;
      audioSegSite = ps.chains.map((c, i) => ({
        chain: i,
        ctrl: Math.floor(c.length / 2),
      }));
    }
    nextRandomPluck = 0;
    songSched.reset();
    synth.cancelScheduled();
  }

  // The walk run (fabric) holding a chain ctrl, or null (knot mode, or a
  // decorative chain outside the walk graph).
  function runForCtrl(
    chain: number,
    ctrl: number
  ): { c0: number; c1: number; seg: number } | null {
    if (!audioRuns || !ps) return null;
    const list = audioRuns.get(chain);
    if (!list) return null;
    const len = ps.chains[chain].length;
    for (const r of list) {
      if (
        (ctrl >= r.c0 && ctrl <= r.c1) ||
        (ctrl + len >= r.c0 && ctrl + len <= r.c1)
      ) {
        return r;
      }
    }
    return null;
  }

  // Pitch of the segment at a chain ctrl. Chains outside the walk graph
  // (decorative culled loops) hash onto the assignment.
  function freqForCtrl(chain: number, ctrl: number): number {
    if (!audioAssign || !ps) return 220;
    const n = audioAssign.segFreq.length;
    if (n === 0) return 220;
    if (!audioRuns) return audioAssign.segFreq[chain % n];
    const list = audioRuns.get(chain);
    if (!list || list.length === 0) return audioAssign.segFreq[chain % n];
    const r = runForCtrl(chain, ctrl);
    return audioAssign.segFreq[(r ?? list[0]).seg];
  }

  // What a pluck at a chain ctrl sets ringing (the pluckReach param):
  // the whole walk run (capped at RUN_REACH lobes each side) - exactly the
  // segment the audio sounds - or, in knot mode and off the walk graph,
  // the plucked lobe +-LOBE_REACH; "lobe" = only the plucked lobe.
  function pluckUnit(
    chain: number,
    ctrl: number
  ): { spanCtrl: [number, number] | null; reach: number } {
    if (params.pluckReach === "lobe") return { spanCtrl: null, reach: 0 };
    const r = runForCtrl(chain, ctrl);
    if (r) return { spanCtrl: [r.c0, r.c1], reach: RUN_REACH };
    return { spanCtrl: null, reach: LOBE_REACH };
  }

  const panel = buildPanel(params, settings, {
    onRegenerate: () => {
      rebuild();
      wake();
    },
    onReseed: () => {
      params.seed = newSeed();
      rebuild();
      wake();
    },
    onSetSeed: (seed: number) => {
      if (seed === params.seed) return;
      params.seed = seed;
      rebuild();
      wake();
    },
    onReplaySettle: () => replaySettle(),
    onPhysicsToggle: () => {
      writeParams(params);
      applyPhysicsMode();
    },
    onStatsToggle: (visible) => {
      stamp.style.display = visible ? "" : "none";
      try {
        localStorage.setItem(STATS_KEY, visible ? "1" : "0");
      } catch {
        // Storage unavailable: the choice just doesn't persist.
      }
    },
    onMazeStatsToggle: (visible) => {
      updateHud();
      try {
        localStorage.setItem(MAZE_STATS_KEY, visible ? "1" : "0");
      } catch {
        // Storage unavailable: the choice just doesn't persist.
      }
    },
    // The next frame shows or hides the indicator / makes it inert.
    onFinishIndicatorToggle: (visible) => {
      try {
        localStorage.setItem(FINISH_INDICATOR_KEY, visible ? "1" : "0");
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
        localStorage.setItem(TAP_TO_PAN_KEY, on ? "1" : "0");
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
      if (debug) debug.container.visible = visible;
    },
    onSlackChange: () => {
      writeParams(params);
      physicsInputsChanged();
      wake();
    },
    onStyleChange: () => {
      renderer?.setWidths(params.threadWidth, look("gap"));
      fabric?.setWidths(params.threadWidth);
      if (fabric && fabricController) fabric.update(fabricController);
      writeParams(params);
      physicsInputsChanged();
      wake();
    },
    onTemperatureChange: () => wake(),
    // Memory-trail mode + trail length apply LIVE: they change only the
    // gameplay interpretation (controller flag) and the paint declaration,
    // never the scene - no rebuild, and no wake (the paint pass runs in the
    // asleep/paused ticker branches).
    onTrailChange: () => {
      if (fabricController) {
        fabricController.trailMode = params.pathViz === "trail";
      }
      if (fabric && fabricController) {
        fabric.trailMode = params.pathViz === "trail";
        fabric.pathViz = params.pathViz;
        fabric.tension = params.tension;
        fabric.trailLength = params.trailLength;
        syncExploration(fabric);
        fabric.update(fabricController);
      }
      updateHud();
      writeParams(params);
    },
    // Look color controls: recolor the live scene in place (the full
    // rebuild they used to trigger reset the knot, replayed the reveal and
    // wiped the player's progress for a hue tweak).
    onRecolor: () => {
      recolorScene();
      // The background wears the design's gamut too.
      syncBackground();
      writeParams(params);
      wake();
    },
    // Background effect / intensity / speed / shape / colors: the layer
    // (and the page color) only - no scene change.
    onBackgroundChange: () => {
      syncBackground();
      writeParams(params);
    },
    backgroundGamutColors: () => gamutAccentHexes(),
    onModeChange: () => {
      // Mode changes alter the graph TOPOLOGY (fabric surgery, color
      // field), which is baked in at build time, so a full rebuild is
      // required rather than a visibility toggle.
      writeParams(params);
      rebuild();
      app.canvas.style.cursor = "default";
      wake();
    },
    onResetPath: () => {
      // A winning move whose dot is still on its way counts: finish it.
      if (pendingWin && fabricController) {
        pendingWin = false;
        fabric?.cancelMove();
        showFabricWin();
      }
      // K47 (game/daily_attempt.ts resetPathAction): inside a daily's
      // attempt - the one that will be official - Reset path is
      // backtracking to the entrance: every run retracted like a tap would
      // (logged, on the backtrack meter), the clock running on. It never
      // restarts the attempt.
      const action = resetPathAction({
        dailyAttempt: dailyAttemptLive(),
        official: dailyN !== null && dailyStore.hasOfficial(dailyN),
        solved: fabricController?.solved ?? false,
        trailMode: fabricController?.trailMode ?? false,
        // K80: a real-time solve always starts over (a fresh chase), and so
        // does one with the turn minotaur (K80 turns, section 2.10: backing
        // out run by run past it would be suicide; a restart, not a catch).
        // K114 call 2: and a burn race (the fuse relit): the way back to the
        // entrance is the way into the fire.
        realtime:
          chase !== null || turnMino !== null || fabricController?.fire != null,
        // K146: so does a practice run (a past daily, not scored).
        practice: attemptLate(),
      });
      if (action === "refuse") {
        showToast("recentPath mode has no way back: keep exploring.");
        return;
      }
      if (action === "backtrack" && fabric && fabricController) {
        fabric.cancelMove();
        const depart = fabricController.head;
        const retraced = fabricController.retreatToStart();
        if (retraced.length > 0) {
          // The fog stays (K100) and lifts along the way back again, each
          // run stamped from the head's end as walking it back by hand
          // would and as a restore of these taps will (exploreRuns).
          fabric.exploreRuns(retraced, depart);
          // The Ariadne string keeps every pass, the way back included.
          fabric.restoreYarn(fabricController.taps);
          fabric.update(fabricController);
          updateHud();
          saveAttempt();
          showToast("Back at the start. The clock keeps running.");
        }
        return;
      }
      // Anywhere else a fresh attempt (a daily's replay or practice run
      // starts over).
      if (dailyN !== null && attemptDaily === dailyN && attemptRecord === null) {
        dailyStore.clearAttempt(dailyN);
      }
      // K80 turns section 2.10 (stage 2): under a minotaur, an unsolved run
      // with a move made restarts COUNTED, not as a catch: the tallies carry
      // to the new minotaur and its `restarts` goes up.
      const c = fabricController;
      if (liveMino() && c && !c.solved && c.moveCount > 0) {
        restartSolve(true);
        const m = liveMino();
        if (m) m.restarts++;
        updateHud();
        return;
      }
      restartSolve();
    },
    // K80: the maze clock. The graph is the same, so no rebuild: the solve
    // starts over in the new mode (a fresh chase, or none).
    onClockChange: () => {
      writeParams(params);
      restartSolve();
      updateHud();
    },
    // K80: the chase's tuning, live (the chase goes on).
    onChaseChange: () => {
      chase?.setParams(chaseParamsOf(params));
      // K273: the shared catch rows (minoLair) reach the turn minotaur too.
      // Re-committing its next move under unchanged settings decides the
      // same move (its draws are counter-based).
      turnMino?.setConfig(turnConfig(turnMinoParamsOf(params)));
      writeParams(params);
    },
    // K80 turns: the turn minotaur's tuning, live (the solve goes on; its
    // next move is committed again under the new settings).
    onTurnMinoChange: () => {
      turnMino?.setConfig(turnConfig(turnMinoParamsOf(params)));
      writeParams(params);
    },
    // K140: the finish confetti (render-only, live; off drops the pieces
    // still in the air).
    onConfettiChange: () => {
      if (!params.confetti) confetti.clear();
      writeParams(params);
    },
    // K98: the markers' size. One render pass (the start/exit gap slots
    // and the markers) without waking the physics.
    onMarkerSizeChange: () => {
      if (fabric) fabric.markerSize = look("markerSize");
      writeParams(params);
      renderDirty = true;
    },
    onPlayDaily: () => playDaily(todayNumber(), true),
    onShowDailyStats: () => showDailyStats(),
    onAudioChange: () => {
      writeParams(params);
      rebuildAudioMap();
    },
    onVolumeChange: () => {
      writeParams(params);
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
  panelWrap = panel.pane.element.parentElement; // K198 (display none closed).
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
    if (renderer && ps) {
      recolorScene();
      renderer.setWidths(params.threadWidth, look("gap"));
    }
    syncBackground();
    if (fabric) fabric.markerSize = look("markerSize");
    panel.markOverridden(overriddenKeys(a11y));
    // One render pass for an asleep or frozen scene (the flow standing still
    // or coming back, the new gap and palette). Every pass hands the
    // renderer the worn fade and flow first (handRendererLook, K239), so the
    // pass solves the crossing cuts with the NEW values.
    renderDirty = true;
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
  function handRendererLook(): void {
    if (!renderer) return;
    renderer.fadeLength = look("fadeLength");
    renderer.flowStrength = look("flowStrength");
    renderer.flowSpeed = look("flowSpeed");
    renderer.cuspRadius = params.cuspRadius;
    renderer.pulseSpacing = params.pulseSpacing;
    // K76 stage 2c (question 5): under the thread reveal the pulses never
    // reach past the reveal distance.
    renderer.pulseReach =
      params.mazeFabric && params.exploration === "threads"
        ? Math.min(params.pulseReach, params.revealDistance)
        : params.pulseReach;
    renderer.hoverGlow = Math.max(0, Math.min(1, params.hoverGlow));
    renderer.hoverGlowWidth = clampHoverGlowWidth(params.hoverGlowWidth);
    renderer.hoverGlowLength = clampHoverGlowLength(params.hoverGlowLength);
    renderer.hoverGlowFade = clampHoverGlowFade(params.hoverGlowFade);
    renderer.hcLook = a11y.highContrast ? hcLookChoice : 0;
    renderer.appearFx = params.appearFx;
  }
  motion.subscribe(applyAccessibility);
  contrast.subscribe(applyAccessibility);
  panel.markOverridden(overriddenKeys(a11y));
  synth.setVolume(params.volume);
  synth.setReverb(params.reverb);
  synth.setVoice({
    brightness: params.brightness,
    sustain: params.sustain,
    shimmer: params.shimmer,
    pickPosition: params.pickPosition,
  });

  window.addEventListener("resize", () => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    background.resize(app.screen.width, app.screen.height);
    fitToScreen();
  });

  // Pointer tug: grab the nearest thread particle, drag it (springs carry
  // the tug through the knot), and pluck the strand on release.
  const toLattice = (e: PointerEvent): [number, number] => [
    (e.clientX - root.position.x) / root.scale.x,
    (e.clientY - root.position.y) / root.scale.y,
  ];
  const GRAB_RADIUS = 0.7;
  // K298, PICK MARGINS (Levi: "reduce the amount of mouse margin we allow
  // for clicking/hovering over a thread ... And add a slider"). The pick
  // radius from a thread's centerline (world) for a pointer type. A MOUSE
  // (a pen too) reaches the half-width plus `pickMargin` CSS px past the
  // ribbon's edge, and a CHOICE (edgeAt: a run from the current junction)
  // `pickChoiceRatio` times that margin. Screen px, because aim error is
  // in screen px; a world margin balloons when zoomed in. TOUCH keeps its
  // world radii exactly: GRAB_RADIUS for threads, max(0.9, 1.6 tw) for
  // choices. Hover, click, the thread cursor and the tug's grab all read
  // these, so the cursor never promises a grab that the click then misses.
  const pickRadius = (pt: string, choice = false): number => {
    if (pt === "touch") {
      return choice ? Math.max(0.9, 1.6 * params.threadWidth) : GRAB_RADIUS;
    }
    const px = params.pickMargin * (choice ? params.pickChoiceRatio : 1);
    return 0.5 * params.threadWidth + px / Math.max(1e-6, root.scale.x);
  };
  // Is a thread within the pointer's pick radius? A particle, or the
  // rendered ribbon between particles: particles sit up to ~0.64 world
  // apart, so at a tight mouse margin a point on the ribbon's edge can be
  // ~0.4 world from both of its particles.
  // K76 stage 2c: under the thread reveal only pickThread asks (it skips
  // hidden thread; a particle knows nothing of the reveal).
  const onThread = (x: number, y: number, pt: string): boolean => {
    const r = pickRadius(pt);
    return (
      (!renderer?.exploreOn && !!ps && ps.nearest(x, y, r) >= 0) ||
      !!renderer?.pickThread(x, y, r)
    );
  };
  // The particle a press grabs: the nearest one, or under the thread reveal
  // the particle at the shown thread point pickThread finds (a particle's
  // ctrl is its index in its chain), so a tug never grabs hidden thread.
  const grabAt = (x: number, y: number, pt: string): number => {
    if (!ps) return -1;
    const r = grabRadius(pt);
    if (!renderer?.exploreOn) return ps.nearest(x, y, r);
    const hit = renderer.pickThread(x, y, r);
    if (!hit) return -1;
    const arr = ps.chains[hit.chain];
    if (!arr || arr.length === 0) return -1;
    const closed = ps.chainBreakAfter[hit.chain] < 0;
    const k = Math.round(hit.ctrl);
    return arr[closed ? ((k % arr.length) + arr.length) % arr.length : Math.max(0, Math.min(arr.length - 1, k))];
  };
  // The tug's grab radius: touch's as before; for a mouse, wide enough
  // that a press onThread accepted always finds a particle (the press may
  // sit on the ribbon between two of them).
  const grabRadius = (pt: string): number => {
    const r = pickRadius(pt);
    return pt === "touch" ? r : Math.sqrt(r * r + GRAB_RADIUS * GRAB_RADIUS);
  };

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
  const fitModeBadge = (): void =>
    modeBadge.fit([hud.el, banner.el, lossBanner.el]);
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
    panel: () => ({ box: panelBox, open: panelT }),
  });
  // Start an eased move that puts world (x1, y1) at the screen's center at
  // scale s1 (placeWorldAt clamps it every frame); see camTween.
  const startCamTween = (
    x1: number,
    y1: number,
    s1: number,
    dur: number,
    hold: number
  ): void => {
    const s0 = root.scale.x;
    camTween = {
      t: 0,
      dur,
      s0,
      x0: (app.screen.width / 2 - root.position.x) / s0,
      y0: (app.screen.height / 2 - root.position.y) / s0,
      s1,
      x1,
      y1,
      hold,
    };
  };
  // A tap on an indicator: ease the camera to frame its target - and the
  // head, as far as the zoom allows (placeWorldAt clamps the zoom-out: the
  // home view in fit mode, the whole knot in follow mode, which then holds
  // the framing a moment before it eases back to the head).
  const frameWorld = (wx: number, wy: number): void => {
    let minX = wx;
    let maxX = wx;
    let minY = wy;
    let maxY = wy;
    if (fabric && fabric.headPosition(headScratch)) {
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
    if (!params.mazeFabric || !walkGraph) return null;
    return walkGraph.vertices.get(walkGraph.exit) ?? null;
  };
  const exitScratch = new Float32Array(2);
  let finishWhy = "init";
  // The exit marker's glyph (K83) in the indicator's glyph box. icon() is
  // read every frame while shown, so the markup is built once per glyph.
  let finishIconId = "";
  let finishIconSvg = "";
  const finishIcon = (): string => {
    const id = fabric?.markerGlyphId("exit") ?? DEFAULT_GLYPHS.exit;
    if (id !== finishIconId) {
      finishIconId = id;
      finishIconSvg = markerGlyphSvgFit(id, "exit", GLYPH_R, DARK_DISC.ink);
    }
    return finishIconSvg;
  };
  const finishIndicator = indicators.add({
    id: "finish",
    world: (out) => {
      const v = exitVertex();
      if (!v || !renderer) return false;
      // Where fabric draws the marker: the renderer's own sample.
      renderer.markerWorld(v.chain, v.ctrl, out);
      return true;
    },
    // The exit marker's own radius: its colored dot (K98), the outermost
    // thing it draws (FabricMazeRenderer.markerDotRadius).
    radius: () =>
      fabric?.markerDotRadius() ??
      markerDotRadiusFor(params.threadWidth, look("markerSize")),
    icon: finishIcon,
    style: DARK_DISC,
    visible: () => {
      const v = exitVertex();
      finishWhy = !settings.finishIndicator
        ? "setting off"
        : !v || !renderer || !fabric || !fabricController
          ? "no maze"
          : fabricController.solved
            ? "solved"
            : !root.visible || physState === "loading"
              ? "loading"
              : renderer.revealMulAtCtrl(v.chain, v.ctrl) < 0.98
                ? "exit unrevealed"
                : // K76 stage 2c (decision 6): the thread reveal keeps the
                  // exit's direction to itself until its marker shows (the
                  // marker's own rule; 1 with the mode off).
                  renderer.exploreVisAt(v.chain, v.ctrl) < 0.98
                  ? "exit unseen"
                  : "";
      return finishWhy === "";
    },
    label: () =>
      params.exploration === "fog"
        ? "The exit lies this way, still under the fog."
        : settings.tapToPan
          ? "The exit is off screen, this way. Tap to bring it into view."
          : "The exit is off screen, this way.",
    onTap: () => {
      if (params.exploration === "fog") {
        showToast("The exit lies this way. Explore to lift the fog.", 3000);
        return;
      }
      const v = exitVertex();
      if (!v || !renderer) return;
      renderer.markerWorld(v.chain, v.ctrl, exitScratch);
      frameWorld(exitScratch[0], exitScratch[1]);
    },
  });
  // K76 (Decision 6): until the exit marker has been seen, the finish's
  // indicator would give its direction away; visible() above holds it back
  // ("exit unseen") under the thread reveal.
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
    const id = fabric?.markerGlyphId("head") ?? DEFAULT_GLYPHS.head;
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
    if (!fabric || !fabric.headPosition(headScratch)) return;
    const plan = headReturnPlan({
      follow: camFollow,
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
      camTween = null;
    }
    if (plan.resume) camTouchedAt = -1e9; // Full-strength pull at once.
    viewHoming = false;
  };
  indicators.add({
    id: "head",
    world: (out) => !!fabric && fabric.headPosition(out),
    // The head marker's radius: the one disc radius every marker wears
    // (K83; sized by markerSize since K98).
    radius: () =>
      fabric?.markerRadius() ??
      markerRadiusFor(params.threadWidth, look("markerSize")),
    icon: headIcon,
    style: DARK_DISC,
    visible: () => {
      headWhy = headIndicatorWhy({
        mazeFabric: params.mazeFabric,
        built: !!fabric && !!fabricController && !!renderer,
        shown: root.visible && physState !== "loading",
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
    world: (out) => liveMino() !== null && !!fabric && fabric.minotaurWorld(out),
    radius: () =>
      fabric?.minotaurRadius() ??
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
      !!fabric &&
      !fabric.minotaurUnderFog &&
      fabric.minotaurWorld(minoScratch),
    label: () =>
      settings.tapToPan
        ? "The minotaur is off screen, this way. Tap to bring it into view."
        : "The minotaur is off screen, this way.",
    onTap: () => {
      if (fabric?.minotaurWorld(minoScratch)) {
        frameWorld(minoScratch[0], minoScratch[1]);
      }
    },
  });

  // (K151: the daily's name, date and state moved from the HUD's title row
  // to the mode badge - ui/mode_badge.ts modeBadgeText.)
  const hudSnapshot = (): HudSnapshot | null => {
    if (!params.mazeFabric || !fabricController) return null;
    const c = fabricController;
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
      deadEnds: params.deadEnds ? c.deadEndTips.size : null,
      // K80: times caught so far (null: no minotaur).
      catches: liveMino()?.catches ?? null,
      // K80 turns stage 2: the turn minotaur's close calls and turns seen
      // (null on real time), and the Reset-path restarts on either clock.
      closeCalls: turnMino ? turnMino.closeCalls : null,
      seen: turnMino ? turnMino.seen : null,
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
    fabricController !== null &&
    clock.started;

  // K47: write the daily attempt in progress (the store re-reads first, so
  // two tabs never lose each other's results).
  const saveAttempt = (): void => {
    if (adopting || !dailyAttemptLive() || !fabricController || !walkGraph) {
      return;
    }
    const n = dailyN!;
    const rec = savedAttemptOf(fabricController, {
      startedAt: attemptStartedAt,
      day: attemptDay,
      elapsedMs: clock.elapsed(performance.now()),
      maze: walkFingerprint(walkGraph),
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
    if (dailyN === null || document.hidden || !fabricController) return;
    const saved = dailyStore.attempt(dailyN);
    if (!saved || saved.savedAt <= attemptSyncedAt) return;
    const mine = fabricController.taps;
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
    if (dailyN === null || !fabricController || !fabric || !walkGraph) return;
    const saved = dailyStore.attempt(dailyN);
    if (!saved) return;
    attemptSyncedAt = Math.max(attemptSyncedAt, saved.savedAt);
    const outcome = restoreAttempt(
      fabricController,
      saved,
      walkFingerprint(walkGraph)
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
    fabric.restoreYarn(fabricController.taps);
    pendingExplored = exploredRuns(fabricController);
    fabric.exploreRestore(fabricController); // K76 stage 2c: the reveal too.
    fabric.update(fabricController);
    if (fabricController.solved) pendingWin = true;
    updateHud();
  };

  // The scene is on screen (no hidden settle, no intro still drawing): a
  // restored clock runs on from here, and the fog re-explores.
  const sceneReady = (): boolean =>
    root.visible && physState !== "loading" && (reveal === null || reveal.done);
  const resumeWhenReady = (): void => {
    if (clock.state !== "paused" && pendingExplored === null) return;
    if (!sceneReady()) return;
    if (clock.state === "paused") clock.resume(performance.now(), document.hidden);
    if (pendingExplored !== null && fabric) {
      fabric.exploreRuns(pendingExplored);
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
    if (!fabricController) return;
    const c = fabricController;
    clock.stop(performance.now());
    const timeMs = clock.elapsed(performance.now());
    const efficiency = efficiencyOf(c.walk.optimalLength, c.pathLength);
    const backtrack = params.pathViz === "trail" ? null : c.backtrackDist;
    const deadEnds = params.deadEnds ? c.deadEndTips.size : null;
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
    // and so does a solve with the turn minotaur (K80 turns).
    const mino = liveMino();
    const rating = mino
      ? rateRun(c.walkedDist, c.walk.optimalLength, mino.catches)
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
        closeCalls: turnMino ? turnMino.closeCalls : null,
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
      chasedMs: chase ? chase.huntSeconds * 1000 : null,
      // K80 turns stage 2: the turn minotaur's close calls and turns seen,
      // and the restarts under either clock's minotaur.
      closeCalls: turnMino ? turnMino.closeCalls : null,
      seen: turnMino ? turnMino.seen : null,
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
    if (!fabricController) return;
    const c = fabricController;
    if (clock.state === "running") clock.stop(performance.now());
    lossBanner.show({
      timeMs: clock.elapsed(performance.now()),
      walked: c.walkedDist,
      closest: c.fireClosest,
    });
    updateHud();
  };

  // K140: a finish's confetti, with its banner (every finish: dailies, free
  // play, replays, real time) - the rain over the screen and the spray
  // around the exit marker, in units of the marker's radius with a CSS px
  // floor (sprayUnit). Reduced motion keeps only a small, slow spray.
  const throwConfetti = (): void => {
    const plan = confettiPlan(
      params.confetti,
      params.confettiAmount,
      motion.reduced,
      app.screen.width,
      app.screen.height
    );
    if (plan.rain === 0 && plan.spray === 0) return;
    let cx = NaN;
    let cy = NaN;
    const v = exitVertex();
    if (v && renderer) {
      // Where fabric draws the exit marker: the renderer's own sample.
      renderer.markerWorld(v.chain, v.ctrl, exitScratch);
      cx = exitScratch[0];
      cy = exitScratch[1];
    }
    // The finish's outer edge: its colored dot (K98).
    const radius =
      fabric?.markerDotRadius() ??
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
    const prevChase = carry ? chase : null;
    const prevTurn = carry ? turnMino : null;
    chase =
      params.mazeFabric && params.clock === "realtime" && walkGraph && fabric
        ? new MinotaurChase(walkGraph, chaseParamsOf(params), params.seed)
        : null;
    if (chase && prevChase) chase.carry(prevChase);
    chaseRunning = false;
    // K80 turns: the turn clock's minotaur, when one is chosen. Its stream
    // is the seed's own (turnSeed), so the same taps meet the same minotaur.
    turnMino =
      params.mazeFabric &&
      params.clock === "turn" &&
      params.minotaur !== "off" &&
      walkGraph &&
      fabric
        ? new TurnMinotaur(
            walkGraph,
            turnConfig(turnMinoParamsOf(params)),
            turnSeed(params.seed)
          )
        : null;
    if (turnMino && prevTurn) turnMino.carry(prevTurn);
    turnWait = 0;
    fabric?.syncMinotaur(liveMino(), params.minoFog, turnMino?.telegraph() ?? null);
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
    if (fabricController) fabricController.fire = fireOf(fabricController.walk);
    fabricController?.reset();
    fabric?.cancelMove();
    fabric?.clearYarn();
    pendingWin = false;
    pendingLoss = false;
    restartChase(carry);
    hideWin();
    if (fabric && fabricController) fabric.update(fabricController);
    resetAttempt();
    wake();
  };

  // A tap queues a run from the decision vertex (where the player stands,
  // or the end of the run under way; the latest tap wins); the chase sets
  // off along it on its next tick. Returns true when the tap was taken.
  const handleChaseTap = (x: number, y: number, pt: string): boolean => {
    if (!chase || !fabric || !fabricController) return false;
    return chaseAlong(
      fabric.edgeAt(x, y, fabricController, pickRadius(pt, true))
    );
  };
  // Queue run `eid` as a tap on it would (K120's keys share it).
  const chaseAlong = (eid: number): boolean => {
    if (!chase || !fabric || !fabricController) return false;
    if (eid < 0 || chase.tap(eid) === "reject") return false;
    chaseRunning = true;
    if (fabric.setHover(-1)) fabric.update(fabricController);
    return true;
  };

  const chaseEvents: ChaseEvent[] = [];
  let chaseWarned = false;
  const tickChase = (dt: number): void => {
    if (!chase || !fabric || !fabricController) return;
    const fc = fabricController;
    if (chaseRunning && !chase.finished && !document.hidden) {
      chaseEvents.length = 0;
      chase.advance(dt, chaseEvents);
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
          fabric.setHover(-1);
          fabric.beginMove(
            ev.edge,
            result === "backtrack" ? "backtrack" : "advance",
            fc
          );
          // The finish is the exit tail's far end: the banner waits for it.
          if (result === "win") pendingWin = true;
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
          fc.markCaught();
          fc.respawn(params.minoRefog);
          fabric.stopMove();
          fabric.clearYarn();
          pendingWin = false;
          fabric.update(fc);
          updateHud();
          showCaughtToast(chase.catches);
        }
      }
    }
    // A restart above swapped the chase.
    if (!chase) return;
    if (chase.playerMoving) fabric.setMoveProgress(chase.playerProgress, fc);
    else if (fabric.animating) fabric.setMoveProgress(1, fc);
    fabric.syncMinotaur(chase, params.minoFog);
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
  const turnCaught = (wait = false): void => {
    if (!turnMino || !fabric || !fabricController) return;
    const fc = fabricController;
    if (params.minoRestart) {
      restartSolve(true);
      updateHud();
      showCaughtToast(liveMino()?.catches ?? 1, true);
      return;
    }
    fc.markCaught(wait);
    // The move under way was made in full: its fog lifts as cancelMove's.
    fabric.cancelMove();
    fc.respawn(params.minoRefog);
    fabric.clearYarn();
    pendingWin = false;
    turnWait = 0;
    fabric.update(fc);
    updateHud();
    showCaughtToast(turnMino.catches);
  };
  let turnWarned = false;
  // After the controller took run `eid`: the minotaur's turn. True when
  // the move ended in a catch (nothing left to animate).
  const turnAfterMove = (eid: number): boolean => {
    if (!turnMino) return false;
    const r = turnMino.turn(eid);
    turnWait = 0;
    if (r === "reject" && !turnWarned) {
      turnWarned = true;
      console.warn(`K80 turns: the minotaur refused run ${eid} (out of step)`);
    }
    if (r !== "caught") return false;
    turnCaught();
    return true;
  };
  // Is world point (x, y) a tap on the player's own junction (the wait)?
  // Within max(1.5 head discs, 0.9) world of it AND nearer it than any
  // run's tappable part (runDistance, the head neighborhood excluded): the
  // choices' arms leave the junction inside that radius (their tap points,
  // 1.5 ctrl out, sat in it and every tap on them waited), so the space
  // splits between the junction and the runs and a tap on an arm moves.
  const waitPt = new Float32Array(2);
  const onHead = (x: number, y: number): boolean => {
    if (!fabric || !fabricController) return false;
    fabric.vertexWorld(fabricController.head, waitPt, 0);
    const r = Math.max(fabric.markerRadius() * 1.5, 0.9);
    const dx = waitPt[0] - x;
    const dy = waitPt[1] - y;
    const d = Math.sqrt(dx * dx + dy * dy);
    return d <= r && d < fabric.runDistance(x, y, fabricController);
  };
  // The wait move: a turn passes with the player where they stand. Only
  // while the turn minotaur is on and the maze is still open.
  const waitTurn = (): boolean => {
    if (!turnMino || !fabric || !fabricController) return false;
    if (fabricController.solved || pendingWin || turnMino.finished) return false;
    // A wait mid-flight lands the move under way first.
    if (fabric.animating) {
      fabric.cancelMove();
      fabric.update(fabricController);
    }
    const r = turnMino.turn(-1);
    if (r === "reject" || r === "noop") return false;
    noteMove();
    if (r === "caught") {
      turnCaught(true);
      return true;
    }
    // Its run(s) play over what the player's dot would take on them.
    let ctrl = 0;
    for (const [e] of turnMino.lastPath) {
      const we = walkGraph?.edges[e];
      if (we) ctrl += we.ctrlB - we.ctrlA;
    }
    turnWaitDur = ctrl > 0 ? fabric.moveSeconds(ctrl) : 0;
    turnWait = turnWaitDur;
    if (turnWaitDur === 0) turnMino.setProgress(1);
    updateHud();
    return true;
  };
  // Every frame: the minotaur's progress through its turn (the player's
  // move animation, or the wait's clock), then its marker and telegraph.
  const tickTurnMino = (dt: number): void => {
    if (!turnMino || !fabric) return;
    let frac = 1;
    if (turnWait > 0) {
      turnWait = Math.max(0, turnWait - dt);
      frac = turnWaitDur > 0 ? 1 - turnWait / turnWaitDur : 1;
    } else if (fabric.animating) {
      frac = fabric.moveProgress;
    }
    turnMino.setProgress(frac);
    fabric.syncMinotaur(turnMino, params.minoFog, turnMino.telegraph());
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
      maze: walkGraph ? walkFingerprint(walkGraph) : null,
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

  // Fabric maze: a tap on a run incident to the current branch point is a
  // move (advance or backtrack); anywhere else falls through to grab/tug,
  // which stays live in fabric mode. Returns true when the tap was a move.
  const handleFabricTap = (x: number, y: number, pt: string): boolean => {
    if (!fabric || !fabricController) return false;
    // K80: the real-time mode queues the run with the chase instead.
    if (chase) return handleChaseTap(x, y, pt);
    // K114: a lost race takes no moves. A tap on the maze brings the Burnt
    // banner (and its Try again) back if it was closed; otherwise the tap
    // plucks as anywhere else.
    if (fabricController.fireLost) {
      if (pendingLoss || lossBanner.shown) return false;
      showFireLoss();
      return true;
    }
    // K80 turns: with the turn minotaur on, a tap on your own junction is
    // the wait move (before the runs: a short run's tap zone reaches the
    // junction, and the head disc sits over it; onHead leaves the runs'
    // arms to the runs).
    if (turnMino && onHead(x, y)) return waitTurn();
    const eid = fabric.edgeAt(x, y, fabricController, pickRadius(pt, true));
    if (eid < 0) return false;
    // K334: with tapsWait a tap while the dot travels waits for the
    // arrival, as a key press does; off (the default for now), it snaps
    // the dot to the run's end.
    if (tapsWait && fabric.animating) return queueTap(eid);
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
    if (!fabric || !fabricController) return false;
    const result = fabricController.tapEdge(eid);
    fabric.setHover(-1);
    // The game state moved instantly; the dot + gold front animate along
    // the thread to catch up. The win banner waits for the arrival.
    if (result === "advance" || result === "backtrack" || result === "win") {
      noteMove();
      // K80 turns: the move is the minotaur's turn too; a catch leaves
      // nothing to animate (the player is back at the entrance).
      if (turnAfterMove(eid)) return true;
      fabric.beginMove(
        eid,
        result === "backtrack" ? "backtrack" : "advance",
        fabricController
      );
      if (result === "win") pendingWin = true;
      // K114: no safe arm at the new junction loses the race; the Burnt
      // banner waits for the dot, as the win's does.
      else if (fabricController.fireLost) pendingLoss = true;
    } else {
      fabric.update(fabricController);
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

  // K120: moves by direction - the arrow keys, WASD and the move pad (the
  // rules are in ui/key_moves.ts). A press moves at once along the run its
  // key picks, through moveAlong / chaseAlong, so it is a tap on that run
  // to everything that records one (the move log, the saved attempt, the
  // stats, the chase's inputs). A key still down when the dot arrives
  // takes the next matching run (keyStep, every frame after the move
  // animation), and the choice hover shows that run while the dot travels.
  // K333: two keys beside each other pressed together are a chord (a
  // diagonal); a lone key that is ambiguous at its junction waits
  // CHORD_WINDOW_MS for one. K334: a press while the dot travels waits for
  // the arrival (the latest press wins) instead of snapping the dot.
  const heldKeys = new HeldKeys();
  let keyHold = false; // A press moved and its key may still be down.
  let keyHoldSince = 0; // performance.now() of that press.
  // What the hold moved in: a tap, a reset, a catch or a rebuild ends it.
  let keyHoldFc: FabricMazeController | null = null;
  let keyHoldTaps = 0;
  let keyHoldChase: MinotaurChase | null = null;
  let keyHoldTurnMino: TurnMinotaur | null = null;
  let keyHoldInputs = 0;
  let keyHoldCatches = 0;
  let keyHoldTick = 0;
  // Real time: a press while running queues its run for the arrival; the
  // hover shows it until the player leaves the run it was queued on.
  let keyQueued = -1;
  let keyQueuedOn = -1;
  let keyQueuedDir = 0;
  let keyHover = false; // The choice hover is the hold's.
  // What a waiting press was pressed in: a tap, a reset, a catch or a
  // rebuild since drops it.
  const keyStamp = () => ({
    fc: fabricController,
    chase,
    turnMino,
    taps: fabricController?.taps.length ?? 0,
    inputs: chase?.inputs.length ?? 0,
    catches: chase?.catches ?? turnMino?.catches ?? 0,
  });
  type KeyStamp = ReturnType<typeof keyStamp>;
  const sameStamp = (a: KeyStamp, b: KeyStamp): boolean =>
    a.fc === b.fc &&
    a.chase === b.chase &&
    a.turnMino === b.turnMino &&
    a.taps === b.taps &&
    a.inputs === b.inputs &&
    a.catches === b.catches;
  // K333/K334: the move not taken yet (ui/key_moves.ts MoveWait), and the
  // solve it was made in (keyStep drops it when that changes).
  const moveWait = new MoveWait();
  let moveWaitStamp: KeyStamp | null = null;
  // K333: the last lone press that moved at once (absorbsChord).
  let keyLast: LastPress | null = null;
  // K334 (Levi, 2026-10-14: every input waits, so every move animates): a
  // tap while the dot travels waits for the arrival too. The hook
  // `__knotKeyMoves().setTapsWait(false)` brings back the snap, for A/Bs.
  let tapsWait = true;
  const keyPt = new Float32Array(2);
  const keyFlow = new Float32Array(2);
  // A chain's world position as the ribbons draw it (with the flow field).
  const keyPointAt = (chain: number, ctrl: number, out: Float32Array): void => {
    ps!.pointOnChain(chain, ctrl, out, 0);
    renderer!.flowOffset(out[0], out[1], keyFlow);
    out[0] += keyFlow[0];
    out[1] += keyFlow[1];
  };
  // The junction a key move leaves from: the head (the destination while a
  // move animates), or in real time the chase's decision vertex.
  const keyVertex = (): string | null => {
    if (!fabricController || fabricController.solved) return null;
    if (chase) return chase.finished ? null : chase.decisionVertex;
    return fabricController.head;
  };
  const keyDepartures = (v: string, reach = KEY_REACH): Departure[] => {
    const wv = walkGraph?.vertices.get(v);
    if (!wv || !walkGraph || !fabric) return [];
    fabric.vertexWorld(v, keyPt, 0);
    // K114: a burnt run is no choice (choices() drops it); a smoldering arm
    // stays, its refusal toasts as a tap's does.
    const fc = fabricController;
    const edges = fc?.fire && v === fc.head ? fc.choices() : wv.edges;
    return departureVectors(
      walkGraph.edges,
      edges,
      v,
      keyPt[0],
      keyPt[1],
      keyPointAt,
      reach
    );
  };
  // Keys play only a maze on screen and still open: not in knot mode,
  // during the intro, once solved or while the finish lands.
  const keysLive = (): boolean =>
    params.mazeFabric &&
    fabric !== null &&
    fabricController !== null &&
    walkGraph !== null &&
    ps !== null &&
    renderer !== null &&
    sceneReady() &&
    !fabricController.solved &&
    !pendingWin &&
    // K114: a lost burn race (or one whose loss is landing) takes no moves.
    !fabricController.fireLost &&
    !pendingLoss &&
    !(chase?.finished ?? false);
  const setKeyHover = (eid: number): void => {
    if (!fabric || !fabricController) return;
    keyHover = eid >= 0;
    if (fabric.setHover(eid)) fabric.update(fabricController);
  };
  // A waiting press outlives the hold (a quick press mid-move is still
  // taken on arrival); keyStep drops it when its stamp changes.
  const endKeyHold = (): void => {
    keyHold = false;
    keyQueued = -1;
    if (keyHover && moveWait.waiting === null) setKeyHover(-1);
  };
  const noteKeyMove = (): void => {
    keyHold = true;
    keyHoldFc = fabricController;
    keyHoldTaps = fabricController?.taps.length ?? 0;
    keyHoldChase = chase;
    keyHoldTurnMino = turnMino;
    if (chase) {
      keyHoldInputs = chase.inputs.length;
      keyHoldCatches = chase.catches;
      keyHoldTick = chase.tick;
    } else if (turnMino) {
      keyHoldCatches = turnMino.catches; // K80 turns.
    }
  };
  // One move by direction; true when it moved (queued, in real time).
  const keyMoveAlong = (eid: number): boolean => {
    if (!fabricController) return false;
    if (chase) {
      const p = chase.player;
      if (!chaseAlong(eid)) return false;
      keyQueued = p.edge >= 0 ? eid : -1;
      keyQueuedOn = p.edge;
      keyQueuedDir = p.dir;
      return true;
    }
    const before = fabricController.taps.length;
    const caught = turnMino?.catches ?? 0;
    moveAlong(eid);
    // K80 turns: a move that was caught ends the hold at once (the keys
    // must come up first, as in real time).
    if (turnMino && turnMino.catches !== caught) {
      heldKeys.clear();
      endKeyHold();
      return false;
    }
    return fabricController.taps.length > before;
  };
  // A press taken: one key, or a chord (two keys beside each other, oldest
  // first), from the junction the keys leave from, as a tap. No match does
  // nothing; a hold already running keeps going. `at`: when its first key
  // went down.
  const pressMove = (dirs: readonly KeyDir[], at: number): void => {
    const v = keyVertex();
    if (v === null) return;
    const deps = keyDepartures(v);
    const p = pickMove(deps, dirs, { hold: false });
    if (p.edge < 0) return;
    const lone = dirs.length === 1 ? dirs[0] : null;
    const chords = lone ? chordEdges(deps, lone) : {};
    if (keyHover) setKeyHover(-1);
    if (keyMoveAlong(p.edge)) {
      keyHoldSince = at;
      noteKeyMove();
      keyLast = lone ? { dir: lone, at, edge: p.edge, chords } : null;
    }
  };
  // Take a waiting move: keys along what they pick now, or a tap's run.
  const takeWaiting = (w: WaitingMove | null): void => {
    if (w === null) return;
    if (w.edge >= 0) {
      if (keyHover) setKeyHover(-1);
      moveAlong(w.edge); // K334: the tap, on the arrival.
      return;
    }
    pressMove(w.dirs, w.at);
  };
  // K334: the dot travels (turn by turn; real time queues in the chase, so
  // nothing waits for it here).
  const dotMoving = (): boolean => !chase && (fabric?.animating ?? false);
  // K334: a tap's run while the dot travels waits for the arrival (the
  // latest press or tap wins). True when it waits.
  const queueTap = (eid: number): boolean => {
    if (!moveWait.tap(eid, performance.now(), dotMoving())) return false;
    moveWaitStamp = keyStamp();
    return true;
  };
  // A fresh press (or a pad press) at `at` (performance.now()).
  const keyPress = (dir: KeyDir, at: number): void => {
    if (keyVertex() === null) return;
    // A press waiting out its window that this key does not join goes
    // first.
    takeWaiting(moveWait.before(dir, at));
    const v = keyVertex();
    if (v === null) return;
    const action = moveWait.press(dir, at, {
      moving: dotMoving(),
      absorbed:
        keyLast !== null && absorbsChord(keyLast, dir, at, heldKeys.holds(keyLast.dir)),
      ambiguous: () => chordMatters(keyDepartures(v), dir),
    });
    if (action === "chord") {
      if (!moveWait.waiting?.queued) takeWaiting(moveWait.takeNow());
    } else if (action === "queue" || action === "window") {
      moveWaitStamp = keyStamp();
    } else if (action === "now") {
      pressMove([dir], at);
    }
  };
  // K333/K334: the waiting move, every frame. True while it waits (a hold
  // waits with it) or when it was taken this frame.
  const stepWaiting = (now: number): boolean => {
    const w = moveWait.waiting;
    if (w === null) return false;
    const v = keyVertex();
    if (
      v === null ||
      !keysLive() ||
      moveWaitStamp === null ||
      !sameStamp(moveWaitStamp, keyStamp())
    ) {
      moveWait.clear();
      if (keyHover) setKeyHover(-1);
      return false;
    }
    const moving = dotMoving();
    const due = moveWait.step(now, moving, (d) => chordMatters(keyDepartures(v), d));
    if (due === "wait") {
      // While the dot travels the hover shows what the move takes.
      if (moving) {
        setKeyHover(
          w.edge >= 0 ? w.edge : pickMove(keyDepartures(v), w.dirs, { hold: false }).edge
        );
      }
      return true;
    }
    takeWaiting(due);
    return true;
  };
  // Every frame, after the move animation (or the chase) stepped.
  const keyStep = (): void => {
    if (stepWaiting(performance.now())) return;
    if (!keyHold) return;
    const fc = fabricController;
    if (
      heldKeys.size === 0 ||
      !keysLive() ||
      !fc ||
      fc !== keyHoldFc ||
      chase !== keyHoldChase ||
      turnMino !== keyHoldTurnMino
    ) {
      endKeyHold();
      return;
    }
    // K80 turns: caught, as in real time - the keys must come up first.
    if (turnMino && turnMino.catches !== keyHoldCatches) {
      heldKeys.clear();
      endKeyHold();
      return;
    }
    if (chase) {
      if (chase.catches !== keyHoldCatches) {
        // Caught and back at the entrance: the keys must come up first.
        heldKeys.clear();
        endKeyHold();
        return;
      }
      if (chase.inputs.length !== keyHoldInputs) {
        endKeyHold(); // A tap took over.
        return;
      }
    } else if (fc.taps.length !== keyHoldTaps) {
      endKeyHold(); // A tap, Reset path or a restore moved the solve.
      return;
    }
    const v = keyVertex();
    if (v === null) {
      endKeyHold();
      return;
    }
    const taps = fc.taps;
    const arrival = taps.length > 0 ? taps[taps.length - 1] : -1;
    if (chase && keyQueued >= 0) {
      const p = chase.player;
      if (p.edge === keyQueuedOn && p.dir === keyQueuedDir) {
        setKeyHover(keyQueued); // Still on the run it was queued from.
        return;
      }
      keyQueued = -1;
    }
    const pick = pickHold(keyDepartures(v), heldKeys.dirs, arrival);
    const moving = chase
      ? chase.playerMoving || chase.tick === keyHoldTick
      : fabric!.animating;
    if (!holdDue({ moving, now: performance.now(), since: keyHoldSince })) {
      setKeyHover(pick.edge); // What the hold takes next.
      return;
    }
    // Arrived: the next run on this same frame (a held key chains with no
    // pause and no snap), or the hold stops here (no match, a tie, a
    // dead-end tip - its only run is the arrival).
    if (pick.edge < 0 || !keyMoveAlong(pick.edge)) {
      endKeyHold();
      return;
    }
    noteKeyMove();
  };
  window.addEventListener("keydown", (e) => {
    const dir = keyDirOf(e);
    if (dir === null) return;
    const id = e.code || e.key;
    if (e.repeat) {
      // The browser's own repeat: the hold does the repeating.
      if (heldKeys.has(id)) e.preventDefault();
      return;
    }
    if (keyBelongsElsewhere(e) || !keysLive()) return;
    e.preventDefault();
    const at = performance.now();
    if (!heldKeys.press(id, dir, at)) return;
    keyPress(dir, at);
  });
  // K333: a key that comes up ends its press's chord window: no second key
  // is coming.
  const releaseKey = (id: string): void => {
    heldKeys.release(id);
    takeWaiting(moveWait.release((d) => heldKeys.holds(d)));
    if (heldKeys.size === 0) endKeyHold();
  };
  // Capture: a keyup always lands, whoever handles it.
  window.addEventListener("keyup", (e) => releaseKey(e.code || e.key), true);
  const dropKeys = (): void => {
    heldKeys.clear();
    moveWait.clear();
    endKeyHold();
  };
  window.addEventListener("blur", dropKeys);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) dropKeys();
  });
  // K120 Part B: the move pad (ui/move_pad.ts) - each finger on it is a
  // held key; fabricTick shows it while the keys are live.
  // K333: two fingers on arms beside each other within the window are a
  // chord, as two keys are.
  const movePad = new MovePad({
    press: (id, dir) => {
      const at = performance.now();
      if (!keysLive() || !heldKeys.press(id, dir, at)) return;
      keyPress(dir, at);
    },
    release: (id) => releaseKey(id),
  });

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

  const boundedDragTo = (x: number, y: number): void => {
    if (!ps) return;
    const L = Math.max(0.1, params.tugLimit * params.threadWidth);
    const dx = x - grabOrigin[0];
    const dy = y - grabOrigin[1];
    const r = Math.hypot(dx, dy);
    const s = r > 1e-9 ? (L * Math.tanh(r / L)) / r : 0;
    dragPos[0] = grabOrigin[0] + dx * s;
    dragPos[1] = grabOrigin[1] + dy * s;
    host.dragTo(dragPos[0], dragPos[1]);
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
    if (!renderer || look === "off" || !(strength > 0)) return;
    ripples.look = look;
    ripples.reducedMotion = motion.reduced;
    const pt = renderer.pluckPoint(chain, at);
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
    if (!ps || !renderer || !(amount > 0) || !physicsLive() || motion.reduced) {
      return;
    }
    const span = renderer.tugSpan(chain, at, TUG_MAX_CTRL);
    if (!span) return;
    const amp = Math.min(1, amount) * params.threadWidth;
    // The host wakes the physics for a tug that moved anything; wake()
    // here also asks for the render pass (a paused scene).
    if (host.tug(chain, span.c0, span.c1, span.tap, side, amp) > 0) wake();
  };

  // Release the current drag. string: free the physics now and set the
  // released unit vibrating (amplitude from the release offset, swinging
  // from the side it was pulled toward); soft: ease home (snapBack).
  const beginRelease = (style: "soft" | "string", freq: number): void => {
    if (style === "string" && ps && renderer && ps.grabbedParticle >= 0) {
      const p = ps.grabbedParticle;
      const chain = ps.chainOfParticle(p);
      if (chain >= 0) {
        const arr = ps.chains[chain];
        const slot = arr.indexOf(p);
        const dx = dragPos[0] - grabOrigin[0];
        const dy = dragPos[1] - grabOrigin[1];
        const off = Math.hypot(dx, dy);
        // Pulled side, against the thread's local normal (-ty, tx).
        const len = arr.length;
        const a = arr[Math.max(0, slot - 1)];
        const b = arr[Math.min(len - 1, slot + 1)];
        const tx = ps.positions[b * 2] - ps.positions[a * 2];
        const ty = ps.positions[b * 2 + 1] - ps.positions[a * 2 + 1];
        const side = off > 1e-6 && tx * dy - ty * dx < 0 ? -1 : 1;
        const unit = pluckUnit(chain, slot);
        renderer.pluck({
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
    if (!ps || !renderer) return;
    const hit = renderer.pickThread(x, y, pickRadius(pt));
    if (!hit) return;
    const freq = freqForCtrl(hit.chain, hit.ctrl);
    const unit = pluckUnit(hit.chain, hit.ctrl);
    // (renderer.pluck can return before the overlay runs: clear its verdict.)
    renderer.plucks.resetSkip();
    const drawn = renderer.pluck({
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
    // no sound either. Every other tap sounds as before, drawn or not (a
    // chain mid-reveal, pluckSize 0, a degenerate lobe).
    if (!drawn && renderer.plucks.lastSkip === "core") return;
    if (!settings.muted && params.soundMode !== "none") {
      synth.pluck(freq, TAP_STRENGTH);
    }
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
    if (ps && ps.grabbedParticle >= 0) {
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
    !!ps &&
    !onThread(x, y, pt) &&
    !(
      params.mazeFabric &&
      fabric &&
      fabricController &&
      fabric.edgeAt(x, y, fabricController, pickRadius(pt, true)) >= 0
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
    if (!params.mazeFabric || !fabric) return false;
    if (eid >= 0) return fabric.setGlowRun(eid, x, y);
    const hit = renderer?.pickThread(x, y, pickRadius(pt));
    return fabric.setGlow(hit ? hit.chain : -1, hit ? hit.ctrl : 0);
  };
  const clearGlow = (): void => {
    if (fabric && fabricController && fabric.setGlow(-1, 0)) {
      fabric.update(fabricController);
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
    if (!ps) return;
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
      renderer?.requestInspect(x, y);
      wake();
      return;
    }
    // While the hidden settle runs there is nothing on screen to touch.
    if (physState === "loading") return;
    if (params.mazeFabric) {
      if (e.pointerType === "touch") {
        if (
          fabric &&
          fabricController &&
          fabric.edgeAt(x, y, fabricController, pickRadius("touch", true)) >= 0
        ) {
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
      if (setGlowAt(x, y, -1, e.pointerType) && fabric && fabricController) {
        fabric.update(fabricController);
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
    if (!pp || !ps) return;
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
    const p = ps.grabbedParticle;
    grabOrigin[0] = ps.positions[p * 2];
    grabOrigin[1] = ps.positions[p * 2 + 1];
    dragPos[0] = grabOrigin[0];
    dragPos[1] = grabOrigin[1];
    dragVel = 0;
    lastMoveT = e.timeStamp;
    app.canvas.style.cursor = "grabbing";
    wake();
  };
  app.canvas.addEventListener("pointermove", (e) => {
    if (!ps) return;
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
        // The finger is dragging, not tapping: it pans instead.
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
    if (ps.grabbedParticle >= 0 && snapMode === "none") {
      const px = dragPos[0];
      const py = dragPos[1];
      boundedDragTo(x, y);
      const dt = Math.max(1e-3, (e.timeStamp - lastMoveT) / 1000);
      lastMoveT = e.timeStamp;
      dragVel =
        dragVel * 0.6 +
        (Math.hypot(dragPos[0] - px, dragPos[1] - py) / dt) * 0.4;
      wake();
    } else if (params.mazeFabric && fabric && fabricController) {
      // Hover: light the choosable run under the pointer (the paint pass
      // animates it even while the physics sleeps - no wake needed), or
      // glow subtly along any other run under it (K145).
      const eid = fabric.edgeAt(
        x,
        y,
        fabricController,
        pickRadius(e.pointerType, true)
      );
      const glow = setGlowAt(x, y, eid, e.pointerType);
      if (fabric.setHover(eid) || glow) fabric.update(fabricController);
      app.canvas.style.cursor =
        eid >= 0
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
    if (!ps) return;
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
      const glow = !!fabric && fabric.setGlow(-1, 0);
      if (fabric && fabricController && (fabric.setHover(-1) || glow)) {
        fabric.update(fabricController);
      }
      if (touches.size === 0) touchLocked = false;
    }
    if (pendingPluck && pendingPluck.id === e.pointerId) {
      // Lifted within the slop: a TAP. Cancels (pointercancel, a pinch -
      // beginPinch drops pendingPluck) never pluck.
      const pp = pendingPluck;
      pendingPluck = null;
      if (e.type === "pointerup") tapPluck(pp.x, pp.y, pp.pt);
    } else if (ps.grabbedParticle >= 0 && snapMode === "none") {
      wake();
      const chain = ps.chainOfParticle(ps.grabbedParticle);
      const freq =
        chain >= 0
          ? freqForCtrl(chain, ps.chains[chain].indexOf(ps.grabbedParticle))
          : 220;
      if (!settings.muted && params.soundMode !== "none" && chain >= 0) {
        synth.pluck(freq, Math.max(0.35, Math.min(1, dragVel / 25)));
      }
      beginRelease(params.pluckStyle, freq);
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
  });

  // ---- Stage 20: auto plucks (random + music modes), RENDER-ONLY: the
  // sound plays and the segment's unit vibrates (render/pluck_overlay.ts) -
  // no grab, no pull, no wake, so they never disturb the knot and may play
  // during a user drag (only a unit holding the grabbed particle stays
  // sound-only). The visual waits out the audio output latency so sight
  // lands on the sound. `when` (audio clock) and `lead` (seconds from now)
  // place a note scheduled ahead (K101): its visual waits for it too.
  const triggerAutoPluck = (
    seg: number,
    freq: number,
    amp: number,
    when?: number,
    lead = 0
  ): void => {
    if (!ps || !renderer || !Number.isFinite(freq)) return;
    if (!settings.muted && params.soundMode !== "none") {
      // K279: on the synth's auto bus (autoPluckGain).
      synth.pluck(freq, amp, when, true);
    }
    const site = audioSegSite[seg];
    if (!site) return;
    const chainArr = ps.chains[site.chain];
    if (!chainArr || chainArr.length === 0) return;
    const len = chainArr.length;
    // Knot mode: the audio segment is the whole strand - excite a random
    // place along it (the fixed mid-strand site rang one spot forever).
    const ctrl = walkGraph ? site.ctrl : Math.random() * len;
    const unit = pluckUnit(site.chain, ctrl);
    // A unit the user is holding stays sound-only.
    const g = ps.grabbedParticle;
    const avoidCtrl =
      g >= 0 && ps.chainOfParticle(g) === site.chain
        ? chainArr.indexOf(g)
        : undefined;
    const side = Math.random() < 0.5 ? -1 : 1;
    const drawn = renderer.pluck({
      avoidCtrl,
      chain: site.chain,
      ctrl,
      side,
      // Auto strengths 0.4-0.75 -> amplitude gains 0.75-1.25.
      gain: Math.max(0.75, Math.min(1.25, 0.75 + ((amp - 0.4) / 0.35) * 0.5)),
      freq,
      reach: unit.reach,
      spanCtrl: unit.spanCtrl,
      beta: 0.3 + Math.random() * 0.2,
      delay: lead + synth.outputLatency(),
    });
    // K279: an auto pluck ripples at rippleAuto (subtler than a tap's), on
    // the vibration's delay, and tugs only with tugAuto.
    if (drawn) {
      const delay = lead + synth.outputLatency();
      startRipple(site.chain, { ctrl }, params.rippleAuto, delay);
      if (params.tugAuto && params.pluckTug > 0) {
        const gen = host.gen;
        window.setTimeout(() => {
          if (host.gen === gen) tugAt(site.chain, { ctrl }, side, params.pluckTug);
        }, delay * 1000);
      }
    }
  };

  // K101: the last music notes handed out, for probes (__knotSong).
  const songLog: Array<{
    at: number;
    lead: number;
    note: string | null;
    clock: string;
  }> = [];
  const autoAudioTick = (): void => {
    if (!ps) return;
    if (!audioAssign || settings.muted) {
      synth.cancelScheduled();
      return;
    }
    const nowS = performance.now() / 1000;
    if (params.soundMode === "random") {
      if (nextRandomPluck === 0) nextRandomPluck = nowS + 0.8;
      if (nowS >= nextRandomPluck) {
        nextRandomPluck =
          nowS + (0.45 + Math.random() * 1.75) / Math.max(0.1, params.soundSpeed);
        const n = audioSegSite.length;
        if (n > 0) {
          const seg = Math.floor(Math.random() * n);
          triggerAutoPluck(
            seg,
            audioAssign.segFreq[seg] ?? 220,
            0.4 + Math.random() * 0.35
          );
        }
      }
    } else if (params.soundMode === "music") {
      // K101: notes start on the audio clock's grid, handed out
      // MUSIC_LOOKAHEAD ahead so a slow frame cannot delay or stretch them.
      // Before the autoplay gate (silent plucks, visuals only) the grid runs
      // on wall time with no lookahead.
      const audioNow = synth.audioTime();
      const clock = audioNow === null ? "wall" : "audio";
      const now = audioNow ?? nowS;
      const notes = songSched.due(
        SCARBOROUGH_FAIR,
        now,
        clock,
        audioNow === null ? 0 : MUSIC_LOOKAHEAD,
        params.soundSpeed
      );
      for (const { row, at } of notes) {
        songLog.push({ at, lead: at - now, note: row.note, clock });
        if (songLog.length > 64) songLog.shift();
        if (!row.note) continue;
        const f = noteToFreq(row.note);
        const segs = segmentsNear(audioAssign, f);
        if (segs.length > 0 && Number.isFinite(f)) {
          // The song's true pitch plays; the matching segment moves.
          triggerAutoPluck(
            segs[Math.floor(Math.random() * segs.length)],
            f,
            0.62,
            audioNow === null ? undefined : at,
            at - now
          );
        }
      }
    } else {
      nextRandomPluck = 0;
      songSched.reset();
      synth.cancelScheduled();
    }
  };

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
    } else if (host.asleep && ps && ps.grabbedParticle < 0) {
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
    if (moved || !ps || !renderer) return true;
    // K140: confetti in the air (false again once its last piece is gone).
    if (confetti.active) return true;
    // K279: a pluck ripple spreading.
    if (ripples.activeCount > 0) return true;
    // K169: a fully traveled gold web fading in (0.25 s).
    if (fabric !== null && fabric.webFading) return true;
    if (physState === "loading" || physState === "settling" || !host.asleep) {
      return true;
    }
    if (look("flowStrength") > 0 || (reveal !== null && !reveal.done)) {
      return true;
    }
    if (renderer.needsFxRender() || renderer.plucks.activeCount > 0) {
      return true;
    }
    // Fabric gameplay paint (pulses, hover breathing, traversal, the fog's
    // wobble) animates continuously.
    return params.mazeFabric && fabric !== null;
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

  app.ticker.add((ticker) => {
    const c0 = performance.now();
    revealMs = 0;
    warmup.poll(); // K307: the warm-up's compiles, once a frame.
    tick(ticker);
    // K307: wave 2 once the intro is over (the reveal done, or asleep).
    if (warmup.wave1Done && physState !== "loading" && (host.asleep || !introPlaying())) {
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
  });

  const tick = (ticker: Ticker): void => {
    if (!ps || !renderer) return;
    if (halted) return;

    if (physState === "loading") {
      if (warmHoldFrom >= 0) warmHoldTick();
      else if (host.presettling) presettleTick();
      else loadingTick();
      if (physState === "loading") perfLine = " | loading";
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
      physState === "settling" && rawMult === 0 ? 1 : rawMult;

    // Stage 22: the appearance reveal advances on WALL time in every
    // branch (awake, asleep, paused). While it runs, the render pass must
    // execute even when the physics does not (see flowRender's guard);
    // once it completes, every branch returns to its exact pre-reveal
    // behavior.
    const revealing = reveal !== null && !reveal.done;
    if (revealing && reveal) {
      reveal.speed = params.appearSpeed;
      const r0 = performance.now();
      reveal.tick(ticker.deltaMS / 1000);
      revealMs = performance.now() - r0;
    }
    // G2: the paint clock advances here, BEFORE any update() this frame
    // (the shader uniforms and update()'s CPU mirror read one clock).
    renderer.advanceClocks(ticker.deltaMS / 1000);
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
      renderer!.plucks.size = Math.max(0, Math.min(3, params.pluckSize));
      renderer!.plucks.ghost = Math.max(0, Math.min(1, params.pluckGhost));
      // K180's pluck params: W's amount and the glow reach the next pluck,
      // a crossings change re-lays the ringing ones out.
      renderer!.plucks.setWhole(
        Math.max(0, Math.min(PLUCK_WHOLE_MAX, params.pluckWhole)),
        params.pluckCrossings,
        params.pluckGlow
      );
      renderer!.plucks.sustain = params.sustain;
      // K279: the time exposure's sheen (live), and auto plucks' level.
      renderer!.plucks.sheen = Math.max(0, Math.min(1, params.pluckSheen));
      synth.setAutoGain(Math.max(0, Math.min(1, params.autoPluckGain)));
      // Reduced motion (the Motion setting, live; WCAG 2.3.3): a pluck
      // started under it is STILL - the plucked segment brightens briefly
      // and nothing moves (K104); the sound is unchanged. Plucks already
      // ringing when it turns on finish without the ghost and the attack.
      renderer!.plucks.reducedMotion = motion.reduced;
      if (params.mazeFabric && fabric && fabricController) {
        fabric.moveSpeed = params.moveSpeed;
        fabric.trailMode = params.pathViz === "trail";
        fabric.pathViz = params.pathViz;
        fabric.tension = params.tension;
        fabric.trailLength = params.trailLength;
        syncExploration(fabric);
        fabric.markerSize = look("markerSize"); // K98 (a no-op unless moved).
        // K76 stage 2c: the reveal's halo follows the Accessibility flags.
        fabric.exploreStill = a11y.reducedMotion;
        fabric.exploreContrast = a11y.highContrast;
        // fowIntro: keep the fog off while the intro animation plays; the
        // release closes it in (fade + contracting radius). K76 stage 2c:
        // the thread reveal's hold shows every thread while the intro plays,
        // and its release closes in on what you have explored the same way.
        fabric.setFogHold(params.exploration === "fog" && params.fowIntro && revealing);
        fabric.setExploreHold(
          params.exploration === "threads" && params.fowIntro && revealing
        );
        fabric.tickFog(ticker.deltaMS / 1000);
        // K76 stage 2c: the reveal's clock (growth, the close-in) in every
        // clock mode - the real-time chase never runs tickAnim (K324).
        fabric.tickExplore(ticker.deltaMS / 1000);
        fabricController.trailMode = params.pathViz === "trail";
        // K80: in the real-time mode the chase moves the dot (tickChase).
        if (chase) tickChase(ticker.deltaMS / 1000);
        else {
          fabric.tickAnim(ticker.deltaMS / 1000, fabricController);
          // K80 turns: the turn minotaur rides the move just stepped.
          if (turnMino) tickTurnMino(ticker.deltaMS / 1000);
        }
        // K120: a held key's next move, once the dot has arrived.
        keyStep();
        if (pendingWin && !fabric.animating) {
          pendingWin = false;
          showFabricWin();
        }
        if (pendingLoss && !fabric.animating) {
          pendingLoss = false;
          showFireLoss();
        }
        // K114: the fire's look rides the dot (the cheap first look; a no-op
        // without a fire once cleared).
        fabric.drawFire(fabricController);
      }
      // K120: the move pad shows while the keys are live (knot mode too:
      // there it hides). K224: and the panel is closed (an open panel is
      // the whole screen on a phone, and the pad sat on its rows).
      movePad.setShown(settings.movePad && keysLive() && !panel.isOpen());
      renderer!.tickPaint(ticker.deltaMS / 1000);
      // After the paint pass: fabric pluck colors read this frame's paint.
      renderer!.tickPlucks(ticker.deltaMS / 1000);
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
        !renderer!.needsFxRender()
      ) {
        return;
      }
      handRendererLook(); // K239: before the update(), not after it.
      renderer!.update();
      if (params.mazeFabric && fabric && fabricController) {
        fabric.update(fabricController);
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
      if (force || flowParity || revealing || renderer!.needsFxRender()) {
        flowRender(force);
      }
      fabricTick();
      perfLine = label;
      updateStamp();
    };
    if (physState === "frozen") {
      restFrame(" | asleep (physics off)");
      return;
    }

    if (speedMult === 0) {
      flowRender(takeDirty());
      fabricTick();
      perfLine = " | paused";
      updateStamp();
      return;
    }

    // Release animation (soft style): ease the freed target back to the
    // grab origin, then free the grab. (The STRING style frees the physics
    // at once and vibrates render-only.) Runs ahead of the asleep check
    // (wake() keeps the sim stepping while the thread moves); skipped
    // while paused - a frozen world holds.
    if (snapMode === "soft") {
      if (ps.grabbedParticle >= 0) {
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
          snapMode = "none";
          host.release();
        }
      } else {
        snapMode = "none";
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
      physState === "live",
      params.settleBudget
    );
    const t1 = performance.now();
    if (!finite) {
      halted = true;
      perfLine = " | HALTED: physics went non-finite (regenerate to reset)";
      updateStamp();
      console.error(
        "KnotMaze: physics state went non-finite; simulation halted."
      );
      return;
    }
    handRendererLook(); // K239: a toggle between frames is worn at once.
    renderer.update();
    renderDirty = false;
    // Keep the gameplay overlay locked to the deforming knot.
    if (params.mazeFabric && fabric && fabricController) {
      fabric.update(fabricController);
    }
    fabricTick();
    const t2 = performance.now();

    // The sleep gate, fed this frame's SIMULATED time (frame-rate
    // independent), after the render: fabricTick may have woken the knot.
    // A physics-off settle freezes where live physics would fall asleep (or
    // at its wall-clock cap).
    const settling = physState === "settling";
    if (host.gateFrame(settling) && settling) freeze();
    if (
      settling &&
      physState === "settling" &&
      performance.now() - settleWall0 > SETTLE_WALL_CAP_MS
    ) {
      freeze();
    }

    perf.physMs += t1 - t0;
    perf.renderMs += t2 - t1;
    perf.frames++;
    if (t2 - perf.flushedAt >= 500) {
      const fps = (perf.frames * 1000) / (t2 - perf.flushedAt);
      perfLine =
        (settling ? " | settling" : "") +
        ` | phys ${(perf.physMs / perf.frames).toFixed(2)}ms` +
        ` render ${(perf.renderMs / perf.frames).toFixed(2)}ms` +
        ` ${fps.toFixed(0)}fps mv ${ps.maxMove.toExponential(1)}`;
      perf.physMs = perf.renderMs = perf.frames = 0;
      perf.flushedAt = t2;
    }
    updateStamp();
  };

  let perfLine = "";
  const { stamp, perf, updateStamp } = createStamp(
    { app, host, settings, perfLine: () => perfLine },
    scene
  );

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
    waitTurn,
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
      return camFollow;
    },
    get camTouchedAt() {
      return camTouchedAt;
    },
    get camTween() {
      return camTween;
    },
    get canvasInk() {
      return canvasInk;
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
      return fitRight;
    },
    get frameCostN() {
      return frameCostN;
    },
    get frameCostTotal() {
      return frameCostTotal;
    },
    get headWhy() {
      return headWhy;
    },
    get keyHold() {
      return keyHold;
    },
    get lastWin() {
      return lastWin;
    },
    get loaderShownAt() {
      return loaderShownAt;
    },
    get panelT() {
      return panelT;
    },
    get pendingLoss() {
      return pendingLoss;
    },
    get physState() {
      return physState;
    },
    get revealMsTotal() {
      return revealMsTotal;
    },
    get sceneWasAnimating() {
      return sceneWasAnimating;
    },
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
      return tapsWait;
    },
    set tapsWait(v) {
      tapsWait = v;
    },
    invalidate: () => {
      renderDirty = true;
    },
  });

  rebuild();
}

main().catch(console.error);
