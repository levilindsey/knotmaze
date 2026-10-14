import { Application, Container } from "pixi.js";
import type { Ticker } from "pixi.js";
import { generateLatticeKnotwork } from "./core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "./core/maze_plan";
import { buildSectionRuns, setGamutConfig } from "./core/section_colors";
import { planAnchors } from "./core/shapes";
import { applyMazePlan, applyMazeCuts } from "./core/maze_apply";
import { buildWalkGraph } from "./core/walk_graph";
import type { WalkGraph } from "./core/walk_graph";
import { checkStructure, checkAlternation } from "./core/tangle_graph";
import {
  ParticleSystem,
  SUBSTEP,
  MAX_FRAME_DT,
  MAX_SUBSTEPS_PER_FRAME,
} from "./physics/particle_system";
import { SleepGate, physicsQuiet } from "./physics/sleep_gate";
import {
  budgetedStep,
  newSettleBudget,
  recordStepCost,
  VisibleClock,
} from "./physics/settle_budget";
import type { SettleBudget, StepLimits } from "./physics/settle_budget";
import { RibbonRenderer } from "./render/ribbon_renderer";
import { DebugRenderer } from "./render/debug_renderer";
import {
  FabricMazeRenderer,
  MINO_MIN_CSS_R,
} from "./render/fabric_maze_renderer";
import { FabricMazeController } from "./game/fabric_controller";
import {
  HOLD_DELAY_MS,
  HeldKeys,
  KEY_REACH,
  departureVectors,
  keyBelongsElsewhere,
  keyDirOf,
  pickDeparture,
  pickHold,
} from "./ui/key_moves";
import type { Departure, KeyDir } from "./ui/key_moves";
import { MOVE_PAD_KEY, MovePad, movePadPref } from "./ui/move_pad";
import { MinotaurChase } from "./game/minotaur";
import type { ChaseEvent } from "./game/minotaur";
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
  writeParams as writeTokenParams,
  newSeed,
  ROOT_NOTES,
  LOAD_SETTLE_MAX,
} from "./ui/url_state";
import type { UrlParams } from "./ui/url_state";
import {
  DAILY_EXEMPT_KEYS,
  applyDailyPrefs,
  dailyDefinition,
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
  dailyHistory,
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
import { MazeHud, WinBanner } from "./ui/maze_hud";
import type { HudSnapshot } from "./ui/maze_hud";
import { ModeBadge, modeBadgeFor } from "./ui/mode_badge";
import { headIndicatorWhy, headReturnPlan } from "./ui/head_indicator";
import { clampFitView } from "./ui/view_clamp";
import {
  DARK_DISC,
  GLYPH_R,
  OffscreenIndicators,
} from "./ui/offscreen_indicators";
import type { IndicatorStyle } from "./ui/offscreen_indicators";
import {
  DEFAULT_GLYPHS,
  markerGlyphSvgFit,
  markerRadiusFor,
} from "./render/marker_glyphs";
import { ConfettiLayer } from "./render/confetti";
import { confettiPlan, sprayUnit } from "./render/confetti_model";
import { PLUCK_WHOLE_MAX } from "./render/pluck_model";
import { openDailyStats } from "./ui/daily_stats_view";
import { shareOrCopy, showToast } from "./ui/share";
import { buildPanel } from "./ui/tweakpane_panel";
import type { PanelSettings } from "./ui/tweakpane_panel";
import { MotionSetting, browserMotionQuery, whenReduced } from "./ui/motion";
import type { GenerationParams } from "./core/types";
import { KnotSynth } from "./audio/knot_synth";
import {
  assignPitches,
  assignPitchesFromList,
  segmentsNear,
  noteToFreq,
} from "./audio/pitch_space";
import type { PitchAssignment } from "./audio/pitch_space";
import { SCARBOROUGH_FAIR } from "./audio/songs";
import { SongScheduler } from "./audio/song_scheduler";
import { APP_VERSION, BUILD_SHA, BUILD_TIME } from "./build_info";

const BACKGROUND = 0x151b28;
const FIT_MARGIN = 40;

// Code-state stamp, so a tab's build is verifiable at a glance (repos sync
// across machines with lag; stale tabs and stale checkouts happen). DERIVED
// at build time (vite.config.ts): version + git short SHA ("+" = built with
// uncommitted changes) + build time - it can no longer drift like the old
// hand-bumped description did. Leads with the roadmap phase: the diag
// scripts find the stamp by its /^P\d/ prefix.
const BUILD_STAMP =
  `P4 v${APP_VERSION} ${BUILD_SHA}` + (BUILD_TIME ? ` ${BUILD_TIME}` : "");
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

// THE LOAD SETTLE (K147, docs/design/K147.md). With physics on, a new or
// replayed knot settles in two phases, both through the normal step():
// (1) THE PRE-SETTLE: with any non-instant appear mode the knot first
// settles HIDDEN, in the physics-off loader's SETTLE_CHUNK_MS slices, so the
// reveal plays over a calmer fabric than the initial snap. It ends after
// PRESETTLE_SIM simulated seconds or `loadSettle` seconds of STEPPING WORK
// (the time inside step(), so a device's speed, not the frame overhead
// between chunks, sets it), whichever first (until K147 a blocking loop
// with these two caps froze the page for them); at loadSettle's max it
// lasts until the first sleep (LOAD_SIM_CAP /
// LOAD_WALL_CAP_MS as for the physics-off load): settle first, then the
// intro. The trefoil shows only for a settle predicted past
// LOADER_DELAY_MS, and then for at least LOADER_MIN_MS (no flash).
// (2) THE BUDGETED SETTLE: from the first visible frame until the first
// sleep, the physics gets at most `settleBudget` ms a frame
// (physics/settle_budget.ts) and the rest of a frame's request is DROPPED,
// so the settle plays in slow motion at the render's frame rate instead of
// the catch-up spiral (a gs 18 settle ran ~12 ms a substep, 5 fps for the
// whole intro). It stands aside while a thread is grabbed, and ends at the
// first sleep or at LOAD_SIM_CAP simulated seconds - a SIMULATED cap like
// the loader's: a wall cap would hand a slow device back to the spiral
// mid-settle - or, last resort, BUDGET_WALL_CAP_MS. Both phases' wall caps
// count VISIBLE time (VisibleClock): a hidden tab's gap does not count.
const PRESETTLE_SIM = 1.2;
const LOADER_DELAY_MS = 300;
const LOADER_MIN_MS = 400;
// Sim seconds a settle-first load is predicted to run (K63: every design
// sleeps ~5.0 sim-s in), for the loader's show-or-not call.
const NOMINAL_SLEEP_SIM = 5;
// Last resort only. Under 4x CPU throttle a gs 18 settle's budget ran 96-
// 106 s to its first sleep (.claude/probes/K147/results.md), and with one
// substep a frame LOAD_SIM_CAP ends even a never-sleeper's budget within
// 1200 frames, before this on any device rendering under 250 ms a frame.
const BUDGET_WALL_CAP_MS = 300000;
// At least one substep every frame, even when one costs more than the
// budget (measured against one every k frames: .claude/probes/K147).
const SETTLE_MIN_ONE = true;
const STEP_LIMITS: StepLimits = {
  substep: SUBSTEP,
  maxFrameDt: MAX_FRAME_DT,
  maxSubsteps: MAX_SUBSTEPS_PER_FRAME,
};

// PHYSICS OFF (the `physics` param unchecked): every build settles HIDDEN
// behind the loading indicator - normal step() calls at a virtual 60 fps,
// in SETTLE_CHUNK_MS slices per animation frame so the page stays live -
// until the regular sleep gate trips, then the simulation stops for good
// and the appearance animation plays over the frozen layout. A knot that
// never trips the gate (the rare loud attractor) freezes anyway after
// LOAD_SIM_CAP simulated seconds - a SIMULATED cap, so a slow phone still
// gets a settled layout (a 9 s wall cap froze one at 1.1 sim-s under 4x
// CPU throttle, mid-relaxation) - and LOAD_WALL_CAP_MS is only the last
// resort. A later visible re-settle (unchecking while awake, or a physics
// slider moved while frozen) gives up after SETTLE_WALL_CAP_MS.
const SETTLE_CHUNK_MS = 22;
const LOAD_SIM_CAP = 10;
const LOAD_WALL_CAP_MS = 45000;
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

// The loading indicator: a trefoil knot (with real over/under gaps,
// alternating along the strand like the app's own weave) turning slowly in
// the middle of the screen. No text - it reads in any language. Rotation
// and breathing are CSS transforms, which the compositor animates even
// while a settle slice keeps the main thread busy.
function createLoader(): { show: () => void; hide: () => void; el: HTMLElement } {
  const N = 240;
  const P: Array<[number, number]> = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    P.push([
      Math.sin(t) + 2 * Math.sin(2 * t),
      -(Math.cos(t) - 2 * Math.cos(2 * t)),
    ]);
  }
  // Self-intersections between non-adjacent chords -> crossing events
  // (parameter along the strand), then over/under alternating in order.
  const events: Array<{ s: number; id: number }> = [];
  let id = 0;
  for (let i = 0; i < N; i++) {
    const [ax, ay] = P[i];
    const [bx, by] = P[(i + 1) % N];
    for (let j = i + 2; j < N; j++) {
      if (i === 0 && j === N - 1) continue;
      const [cx, cy] = P[j];
      const [dx, dy] = P[(j + 1) % N];
      const den = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
      if (Math.abs(den) < 1e-12) continue;
      const u = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / den;
      const v = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / den;
      if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
      events.push({ s: i + u, id }, { s: j + v, id });
      id++;
    }
  }
  events.sort((a, b) => a.s - b.s);
  // Every other event (along the strand) dives UNDER: cut a gap there,
  // 0.6 units of curve each side (the strand is 0.42 wide).
  let curve = 0;
  for (let i = 0; i < N; i++) {
    const [ax, ay] = P[i];
    const [bx, by] = P[(i + 1) % N];
    curve += Math.hypot(bx - ax, by - ay);
  }
  const GAP = 0.6 / (curve / N);
  const under = events.filter((_, k) => k % 2 === 1).map((e) => e.s);
  const inGap = (s: number): boolean =>
    under.some((g) => {
      const d = Math.abs(s - g);
      return Math.min(d, N - d) < GAP;
    });
  const pieces: string[] = [];
  let cur: string[] = [];
  // Start just past a gap so no piece straddles the parameter seam.
  const s0 = under.length > 0 ? Math.ceil(under[0] + GAP) : 0;
  for (let k = 0; k <= N; k++) {
    const s = (s0 + k) % N;
    if (inGap(s)) {
      if (cur.length > 1) pieces.push("M" + cur.join("L"));
      cur = [];
      continue;
    }
    cur.push(`${P[s][0].toFixed(3)} ${P[s][1].toFixed(3)}`);
  }
  if (cur.length > 1) pieces.push("M" + cur.join("L"));
  const el = document.createElement("div");
  el.id = "knot-loading";
  el.setAttribute("role", "progressbar");
  el.setAttribute("aria-busy", "true");
  el.setAttribute("aria-label", "Loading");
  el.style.cssText =
    "position:fixed;inset:0;display:flex;align-items:center;" +
    "justify-content:center;pointer-events:none;z-index:15;opacity:0;" +
    "visibility:hidden;transition:opacity .25s ease,visibility 0s .25s";
  const style = document.createElement("style");
  style.textContent =
    "@keyframes kl-spin{to{transform:rotate(360deg)}}" +
    "@keyframes kl-breathe{0%,100%{transform:scale(.9);opacity:.75}" +
    "50%{transform:scale(1.04);opacity:1}}" +
    "#knot-loading .kl-b{animation:kl-breathe 1.6s ease-in-out infinite;" +
    "will-change:transform,opacity}" +
    "#knot-loading svg{animation:kl-spin 3.2s linear infinite;" +
    "will-change:transform;overflow:visible}" +
    // Reduced motion (the Motion setting): a slow spin, no breathing.
    whenReduced("#knot-loading svg", "animation-duration:12s") +
    whenReduced("#knot-loading .kl-b", "animation:none");
  document.head.appendChild(style);
  el.innerHTML =
    '<div class="kl-b"><svg width="76" height="76" viewBox="-4 -4 8 8" ' +
    'aria-hidden="true"><g fill="none" stroke="#e7c56f" ' +
    'stroke-width="0.42" stroke-linecap="round" stroke-linejoin="round">' +
    pieces.map((d) => `<path d="${d}"/>`).join("") +
    "</g></svg></div>";
  document.body.appendChild(el);
  let timer = 0;
  return {
    el,
    // A short delay keeps fast settles from flashing the indicator.
    show: () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        el.style.transition = "opacity .25s ease,visibility 0s";
        el.style.visibility = "visible";
        el.style.opacity = "1";
      }, 120);
    },
    hide: () => {
      window.clearTimeout(timer);
      el.style.transition = "opacity .25s ease,visibility 0s .25s";
      el.style.opacity = "0";
      el.style.visibility = "hidden";
    },
  };
}

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
  // The daily on screen, or null for an ordinary design. It ends the moment
  // a param other than a preference changes (syncDaily).
  let dailyN: number | null = launch.daily;
  // The player came for TODAY's daily (the bare page, `?daily`, the Daily
  // button) rather than a numbered one: the address bar stays bare.
  let dailyFloating = launch.floating;
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
  };
  let statsShown = false;
  let mazeStatsShown = false;
  let finishIndicatorShown = true;
  let tapToPan = true;
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
    tapToPan,
    movePad: movePadOn,
    motion: motion.pref,
  };
  const synth = new KnotSynth();

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

  // K140 FINISH CONFETTI (render/confetti.ts): two particle layers over the
  // world root - the world-space spray around the exit, then the
  // screen-space rain on top. Render-only (never wakes the physics), no
  // pointer events, and the win banner and HUD are DOM above the canvas.
  const confetti = new ConfettiLayer();
  app.stage.addChild(confetti.sprayContainer, confetti.rainContainer);

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
  let fabricController: FabricMazeController | null = null;
  // Stage 22: the running appearance animation (null = instant / done
  // long ago). Rebuilds and "Replay settle" restart it.
  let reveal: RevealAnimator | null = null;

  // PHYSICS MODE. live = physics on (today's behavior: awake until the
  // sleep gate, woken by input). With the `physics` param off: loading =
  // the hidden chunked settle behind the indicator; settling = a VISIBLE
  // settle-then-freeze (unchecked while awake, or a physics slider moved
  // while frozen); frozen = no ps.step() at all - only render-side motion
  // (flow, pulses, traversal, the reveal, plucks) runs.
  type PhysState = "live" | "loading" | "settling" | "frozen";
  let physState: PhysState = "live";
  // The sleep gate (physics/sleep_gate.ts, a SIM-TIME window since K63):
  // shared by the live ticker, the visible settle and the hidden load.
  const sleepGate = new SleepGate();
  let loadWall0 = 0;
  let loadMs = 0; // Last hidden load's wall time (diagnostics)...
  let loadStepMs = 0; // ...of which inside ps.step()...
  let loadSteps = 0; // ...over this many virtual frames...
  let loadFrames = 0; // ...across this many real frames.
  let settleWall0 = 0;
  // Physics inputs the frozen layout was settled with: a change while
  // frozen re-settles (visibly) instead of being silently ignored.
  let frozenSig = "";
  // ps.step() calls ever made (probes: physics off must add none).
  let stepCount = 0;
  // K147 LOAD SETTLE (see the note at the top). The hidden pre-settle runs
  // while `presettle` is set (physState "loading", the loader's ticker
  // branch); presettleEnd says why it may end ("" = still settling).
  let presettle = false;
  let presettleWall0 = 0;
  const presettleClock = new VisibleClock();
  let presettleSim0 = 0;
  let presettleWorkMs = 0; // Wall ms inside its step() slices.
  let presettleEnd = "";
  let loaderShownAt = -1;
  // The budgeted settle, armed from the first visible frame until the first
  // sleep (null = not armed).
  let armedBudget: SettleBudget | null = null;
  let budgetWall0 = 0;
  const budgetClock = new VisibleClock();
  // The last pre-settle and budgeted settle (probes: __knotSettle).
  const settleInfo = {
    presettle: { ms: 0, workMs: 0, sim: 0, loader: false, endedBy: "" },
    budget: { ms: 0, sim: 0, lagS: 0, costMs: 0, endedBy: "" },
  };
  const physicsTuning = (): {
    temperature: number;
    slack: number;
    drag: number;
    repulsion: number;
    bend: number;
    smooth: number;
    stiffness: number;
    gridAlign: number;
    threadWidth: number;
  } => ({
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
    // region grown by the reveal radius) - it widens as you explore.
    const fogBox =
      params.mazeFabric && fabric ? fabric.fogVisibleBounds() : null;
    if (fogBox) {
      minX = fogBox.minX;
      minY = fogBox.minY;
      maxX = fogBox.maxX;
      maxY = fogBox.maxY;
      pad = 0.3;
    }
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
  //   (ui/view_clamp.ts, K149) so the zoomed fit frame covers the screen
  //   to within PAN_SLACK of its size per side, at every zoom: the maze
  //   can be dragged partly off screen, clear of the open panel, even at
  //   zoom 1. A reset (double-click) eases back to zoom 1, pan 0.
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
  // The fit camera's zoom range and pan range (K149: with slack, see
  // ui/view_clamp.ts).
  const clampView = (): void => {
    clampFitView(view, app.screen.width, app.screen.height, MAX_ZOOM);
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
  // side - or under fog, the visible disc plus a margin.
  const followScale = (): number => {
    const span = params.fogOfWar
      ? 2 * (params.fowRadius + 1.2)
      : FOLLOW_SPAN;
    return Math.min(app.screen.width, app.screen.height) / span;
  };
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
    if (fitFrames++ % 3 === 0) computeFitTarget();
    fitCur.scale += (fitTarget.scale - fitCur.scale) * 0.08;
    fitCur.x += (fitTarget.x - fitCur.x) * 0.08;
    fitCur.y += (fitTarget.y - fitCur.y) * 0.08;
    setCamFollow(
      params.cameraMode === "follow" && params.mazeFabric && fabric !== null
    );
    if (camTween) {
      stepCamTween(dt);
      return;
    }
    if (!camFollow) {
      if (viewHoming) {
        view.zoom += (1 - view.zoom) * 0.15;
        view.panX -= view.panX * 0.15;
        view.panY -= view.panY * 0.15;
        // K149: zoom 1 has a pan range now, so the pan must settle too (a
        // reset from a slack-panned zoom-1 view used to snap on frame one).
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
    clampView();
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
    presettle = false;
    armedBudget = null;
    settleInfo.budget = { ms: 0, sim: 0, lagS: 0, costMs: 0, endedBy: "" };
    loadWall0 = performance.now();
    sleepGate.reset();
    loadStepMs = 0;
    loadSteps = 0;
    loadFrames = 0;
    reveal = null;
    renderer.beginReveal(null);
    if (fabric) fabric.revealQuery = null;
    root.visible = false;
    indicators.hideAll();
    loader.show();
  }

  // One slice of the hidden settle: virtual 60 fps frames through the
  // normal step() and the normal sleep gate, for SETTLE_CHUNK_MS.
  function loadingTick(): void {
    if (!ps) return;
    const t0 = performance.now();
    const tuning = physicsTuning();
    tuning.temperature = 0;
    loadFrames++;
    do {
      const s0 = performance.now();
      const sim0 = ps.simTime;
      ps.step(1 / 60, tuning);
      loadStepMs += performance.now() - s0;
      loadSteps++;
      stepCount++;
      if (!Number.isFinite(ps.maxMove)) {
        halted = true;
        loader.hide();
        root.visible = true;
        perfLine = " | HALTED: physics went non-finite (regenerate to reset)";
        console.error("KnotMaze: physics state went non-finite; simulation halted.");
        return;
      }
      if (sleepGate.frame(quietNow(true), ps.simTime - sim0)) {
        finishLoading();
        return;
      }
      if (
        ps.simTime > LOAD_SIM_CAP ||
        performance.now() - loadWall0 > LOAD_WALL_CAP_MS
      ) {
        finishLoading();
        return;
      }
    } while (performance.now() - t0 < SETTLE_CHUNK_MS);
  }

  // PHYSICS OFF, step 2: the layout is final. Build the render once, start
  // the appearance animation over it, show the scene, and stop simulating
  // (or go live, if physics was switched back on meanwhile).
  function finishLoading(): void {
    if (!ps || !renderer) return;
    loadMs = performance.now() - loadWall0;
    // Reveal first, so the very first visible frame already wears its
    // (collapsed) masks - no one-frame flash of the finished knot.
    startAppearance();
    renderer.update();
    if (fabric && fabricController) fabric.update(fabricController);
    fitToScreen();
    root.visible = true;
    loader.hide();
    sleepGate.reset();
    if (params.physics) {
      physState = "live";
      asleep = false;
    } else {
      physState = "frozen";
      asleep = true;
      frozenSig = physSig();
    }
  }

  // "Replay settle": back to the lattice state, settle and appear again.
  function replaySettle(): void {
    ps?.reset();
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
    return params.backgroundColorMode === "custom"
      ? parseHexColor(params.backgroundBase, BACKGROUND)
      : BACKGROUND;
  }
  let canvasInk = BACKGROUND;

  // The design's own background accents in the panel's order (accent 1 =
  // the main one): what switching the colors to custom starts from.
  function gamutAccentHexes(): [string, string, string] {
    const effHue = (((params.seed % 360) + params.hueShift) % 360 + 360) % 360;
    setGamutConfig(params.gamutArc, params.palette);
    return accentHexes(backgroundColors(BACKGROUND, effHue));
  }

  // K147, PHYSICS ON: settle a new (or replayed) knot. A non-instant
  // appear mode with loadSettle > 0 first settles it HIDDEN (the ticker's
  // loading branch runs presettleTick); otherwise the scene shows at once.
  // Either way the budgeted settle then runs from the first visible frame
  // to the first sleep.
  function beginSettle(): void {
    if (!ps || !renderer) return;
    presettle = false;
    armedBudget = null;
    settleInfo.budget = { ms: 0, sim: 0, lagS: 0, costMs: 0, endedBy: "" };
    if (params.appearSequence === "instant" || params.loadSettle <= 0) {
      physState = "live";
      startAppearance();
      // A physics-off load cut short by this rebuild left these behind.
      root.visible = true;
      loader.hide();
      armBudget();
      return;
    }
    physState = "loading";
    presettle = true;
    presettleWall0 = performance.now();
    presettleClock.start(presettleWall0);
    presettleSim0 = ps.simTime;
    presettleWorkMs = 0;
    presettleEnd = "";
    loaderShownAt = -1;
    sleepGate.reset();
    reveal = null;
    renderer.beginReveal(null);
    if (fabric) fabric.revealQuery = null;
    root.visible = false;
    indicators.hideAll();
    loader.hide();
  }

  // One slice of the hidden pre-settle: virtual 60 fps frames through the
  // normal step() and the normal sleep gate, for SETTLE_CHUNK_MS. It may
  // end at the first sleep, after PRESETTLE_SIM simulated seconds or
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
    const canFinish = (): boolean =>
      presettleEnd !== "" &&
      (loaderShownAt < 0 || performance.now() - loaderShownAt >= LOADER_MIN_MS);
    const tuning = physicsTuning();
    const t0 = performance.now();
    while (presettleEnd !== "sleep" && !canFinish()) {
      const s0 = performance.now();
      const sim0 = ps.simTime;
      ps.step(1 / 60, tuning);
      stepCount++;
      presettleWorkMs += performance.now() - s0;
      if (!Number.isFinite(ps.maxMove)) {
        halted = true;
        presettle = false;
        physState = "live"; // Keeps the HALTED line on the stamp.
        loader.hide();
        root.visible = true;
        perfLine = " | HALTED: physics went non-finite (regenerate to reset)";
        console.error("KnotMaze: physics state went non-finite; simulation halted.");
        return;
      }
      if (sleepGate.frame(quietNow(false), ps.simTime - sim0)) {
        presettleEnd = "sleep";
      } else if (presettleEnd === "") {
        if (ps.simTime - presettleSim0 >= simCap) presettleEnd = "sim";
        else if (settleFirst) {
          if (presettleClock.tick(performance.now()) > LOAD_WALL_CAP_MS) presettleEnd = "wall";
        } else if (presettleWorkMs >= workCap) presettleEnd = "work";
      }
      if (performance.now() - t0 >= SETTLE_CHUNK_MS) break;
    }
    const elapsed = presettleClock.tick(performance.now());
    if (presettleEnd === "" && loaderShownAt < 0) {
      // Show the loader for a settle that will run past LOADER_DELAY_MS.
      const simDone = ps.simTime - presettleSim0;
      const simLeft = (settleFirst ? NOMINAL_SLEEP_SIM : simCap) - simDone;
      let workLeft = simDone > 0 ? (simLeft * presettleWorkMs) / simDone : Infinity;
      if (!settleFirst) workLeft = Math.min(workLeft, workCap - presettleWorkMs);
      if (elapsed + workLeft > LOADER_DELAY_MS || elapsed > LOADER_DELAY_MS) {
        loader.show();
        loaderShownAt = performance.now();
      }
    }
    if (canFinish()) finishPresettle();
  }

  // The pre-settle is over: start the appearance over the settled layout,
  // show the scene and go live - asleep if the sleep gate already tripped,
  // else under the settle budget.
  function finishPresettle(): void {
    if (!ps || !renderer) return;
    presettle = false;
    settleInfo.presettle = {
      ms: performance.now() - presettleWall0,
      workMs: presettleWorkMs,
      sim: ps.simTime,
      loader: loaderShownAt >= 0,
      endedBy: presettleEnd,
    };
    // Reveal first, so the very first visible frame already wears its
    // (collapsed) masks - no one-frame flash of the finished knot.
    startAppearance();
    renderer.update();
    if (fabric && fabricController) fabric.update(fabricController);
    fitToScreen();
    root.visible = true;
    loader.hide();
    physState = "live";
    if (presettleEnd === "sleep") {
      asleep = true;
    } else {
      asleep = false;
      armBudget();
    }
  }

  function armBudget(): void {
    armedBudget = newSettleBudget(params.settleBudget, SETTLE_MIN_ONE);
    budgetWall0 = performance.now();
    budgetClock.start(budgetWall0);
  }
  function endBudget(by: string): void {
    if (!armedBudget || !ps) return;
    settleInfo.budget = {
      ms: performance.now() - budgetWall0,
      sim: ps.simTime,
      lagS: armedBudget.lagS,
      costMs: armedBudget.costMs,
      endedBy: by,
    };
    armedBudget = null;
  }
  // This live frame's settle budget, or null. Ends it once the physics is
  // not live, after LOAD_SIM_CAP simulated seconds or BUDGET_WALL_CAP_MS of
  // visible time (the first sleep ends it in the ticker); stands aside,
  // still armed, while a thread is grabbed or the slider is at 0.
  function activeBudget(): SettleBudget | null {
    const b = armedBudget;
    if (!b || !ps) return null;
    const visibleMs = budgetClock.tick(performance.now());
    if (physState !== "live") endBudget("mode");
    else if (ps.simTime > LOAD_SIM_CAP) endBudget("sim");
    else if (visibleMs > BUDGET_WALL_CAP_MS) endBudget("wall");
    if (!armedBudget || ps.grabbedParticle >= 0 || params.settleBudget <= 0) {
      return null;
    }
    b.budgetMs = params.settleBudget;
    return b;
  }

  // The background follows the design: effect + intensity + animation
  // speed + shape, the page ink and the design's gamut accents (or the
  // custom colors), the seed - and the fog of war (when on) draws as the
  // background instead of a flat color.
  function syncBackground(): void {
    const effHue = (((params.seed % 360) + params.hueShift) % 360 + 360) % 360;
    setGamutConfig(params.gamutArc, params.palette);
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
      params.background,
      params.backgroundIntensity,
      params.backgroundSpeed
    );
    background.setDesign(
      params.backgroundColorMode === "custom"
        ? customBackgroundColors(
            params.backgroundBase,
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

  function rebuild(): void {
    // K47/K56: a change that leaves the daily parks its attempt first; one
    // that keeps it (a rebuild of the daily itself) saves the attempt now,
    // to restore it into the new scene below.
    syncDaily();
    saveAttempt();
    // K140: the old maze's finish is gone, and so is its confetti.
    confetti.clear();
    renderer?.destroy();
    debug?.container.destroy({ children: true });
    fabric?.destroy();
    root.removeChildren();

    const genParams: GenerationParams = {
      gridSize: params.gridSize,
      weaveDensity: params.weaveDensity,
      turnBias: params.turnBias,
      randSeed: params.seed,
      shape: params.shape,
    };
    const graph = generateLatticeKnotwork(genParams);

    // Branching maze fabric (mazeFabric): plan + apply the splice/merge/stub
    // surgery and carve the corner entrance/exit at GRAPH level, so the
    // particle system builds the fabric natively (open chains, fused
    // junctions, anchored ends).
    let hueGroup: number[] | undefined;
    if (params.mazeFabric) {
      const plan = buildMazePlan(graph, {
        ...DEFAULT_MAZE_PARAMS,
        branchDensity: params.branchDensity,
        fourWayFraction: params.fourWayFraction,
        deadEndDensity: params.deadEnds ? params.deadEndDensity : 0,
        deadEndLength: params.deadEndLength,
        entranceClearance: params.entranceClearance,
        exitClearance: params.exitClearance,
        junctionSpacing: params.junctionSpacing,
        // Entrance/exit anchored to the shape's boundary (shp/sa/xa).
        ...planAnchors(
          params.shape,
          params.gridSize,
          params.startAnchor,
          params.exitAnchor
        ),
      });
      hueGroup = applyMazePlan(graph, plan);
      applyMazeCuts(graph, plan, hueGroup);
    }

    if (!checkStructure(graph) || !checkAlternation(graph)) {
      console.warn("Knot invariants violated; generation bug.");
    }

    ps = new ParticleSystem(graph);
    buildHueGroup = hueGroup;
    buildStrandCount = graph.strands.length;

    // Color space for this build: seed hue rotated by hueShift; arc width
    // and palette preset configure gamutRgb for every consumer (schemes
    // AND the renderer's per-sample noise path).
    const effHue = (((params.seed % 360) + params.hueShift) % 360 + 360) % 360;
    setGamutConfig(params.gamutArc, params.palette);

    // The walk graph feeds both the section coloring and (in fabric mode)
    // the gameplay, so it builds before the renderer.
    walkGraph = params.mazeFabric ? buildWalkGraph(graph) : null;

    renderer = new RibbonRenderer(ps, {
      threadWidth: params.threadWidth,
      casingWidth: params.threadWidth + params.gap * 2,
      baseHue: effHue,
      pathColor: parseInt(params.pathColor.slice(1), 16),
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
        params.pathViz === "trail"
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
      fabric.fogOfWar = params.fogOfWar;
      fabric.fowRadius = params.fowRadius;
      fabric.fogColor = pageInk();
      fabric.update(fabricController);
    } else {
      fabricController = null;
      fabric = null;
    }
    syncBackground();
    pendingWin = false;
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
    onDebugToggle: (visible) => {
      if (debug) debug.container.visible = visible;
    },
    onSlackChange: () => {
      writeParams(params);
      physicsInputsChanged();
      wake();
    },
    onStyleChange: () => {
      renderer?.setWidths(params.threadWidth, params.gap);
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
        fabric.fogOfWar = params.fogOfWar;
        fabric.fowRadius = params.fowRadius;
        fabric.update(fabricController);
      }
      updateHud();
      writeParams(params);
    },
    // Look color controls: recolor the live scene in place (the full
    // rebuild they used to trigger reset the knot, replayed the reveal and
    // wiped the player's progress for a hue tweak).
    onRecolor: () => {
      if (renderer && ps) {
        const effHue =
          (((params.seed % 360) + params.hueShift) % 360 + 360) % 360;
        setGamutConfig(params.gamutArc, params.palette);
        renderer.recolor(
          effHue,
          parseInt(params.pathColor.slice(1), 16),
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
        // K80: a real-time solve always starts over (a fresh chase).
        realtime: chase !== null,
        // K146: so does a practice run (a past daily, not scored).
        practice: attemptLate(),
      });
      if (action === "refuse") {
        showToast("recentPath mode has no way back: keep exploring.");
        return;
      }
      if (action === "backtrack" && fabric && fabricController) {
        fabric.cancelMove();
        const retraced = fabricController.retreatToStart();
        if (retraced.length > 0) {
          // The fog stays (K100) and lifts along the way back again, as
          // walking it back by hand would and as a restore of these taps
          // will (exploreRuns).
          fabric.exploreRuns(retraced);
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
      writeParams(params);
    },
    // K140: the finish confetti (render-only, live; off drops the pieces
    // still in the air).
    onConfettiChange: () => {
      if (!params.confetti) confetti.clear();
      writeParams(params);
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
  const hideWin = (): void => banner.hide();
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
  const fitModeBadge = (): void => modeBadge.fit([hud.el, banner.el]);
  window.addEventListener("resize", fitModeBadge);
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
      panel.pane.element.parentElement, // The panel (display none closed).
      stamp,
      document.querySelector<HTMLElement>(".km-pad"), // K120 (hidden: none).
    ],
    // The tap-to-pan preference: off, indicators let taps through.
    tapEnabled: () => settings.tapToPan,
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
    // The exit marker's own radius (FabricMazeRenderer.markerRadius).
    radius: () => fabric?.markerRadius() ?? markerRadiusFor(params.threadWidth),
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
                : "";
      return finishWhy === "";
    },
    label: () =>
      params.fogOfWar
        ? "The exit lies this way, still under the fog."
        : settings.tapToPan
          ? "The exit is off screen, this way. Tap to bring it into view."
          : "The exit is off screen, this way.",
    onTap: () => {
      if (params.fogOfWar) {
        showToast("The exit lies this way. Explore to lift the fog.", 3000);
        return;
      }
      const v = exitVertex();
      if (!v || !renderer) return;
      renderer.markerWorld(v.chain, v.ctrl, exitScratch);
      frameWorld(exitScratch[0], exitScratch[1]);
    },
  });
  // K76 HOOK (thread-reveal mode, Decision 6): until the exit marker has
  // been seen, the finish's indicator would give its direction away. The
  // mode adds a gate here, e.g.
  //   finishIndicator.gate(() => !params.threadReveal || exitSeen);
  // (gate() returns its remover). Nothing else in the indicator changes.
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
    // The head marker's radius: the one K83 radius all three markers wear.
    radius: () => fabric?.markerRadius() ?? markerRadiusFor(params.threadWidth),
    icon: headIcon,
    style: DARK_DISC,
    visible: () => {
      headWhy = headIndicatorWhy({
        mazeFabric: params.mazeFabric,
        built: !!fabric && !!fabricController && !!renderer,
        shown: root.visible && physState !== "loading",
      });
      return headWhy === "";
    },
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
    world: (out) => !!chase && !!fabric && fabric.minotaurWorld(out),
    radius: () =>
      fabric?.minotaurRadius() ?? markerRadiusFor(params.threadWidth),
    icon: () =>
      minoIconSvg ||
      (minoIconSvg = markerGlyphSvgFit(
        DEFAULT_GLYPHS.minotaur,
        "minotaur",
        GLYPH_R,
        MINO_DISC.ink
      )),
    style: MINO_DISC,
    visible: () =>
      chase !== null &&
      !chase.finished &&
      chase.mode !== "lair" &&
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
      // K80: times caught so far (null: turn-based).
      catches: chase ? chase.catches : null,
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
      def: dailyDefinition(n).version,
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
        def: dailyDefinition(daily).version,
      };
      attemptRecord = dailyStore.recordSolve(daily, result);
    }
    const replay = attemptRecord === "replay";
    // K146: a practice finish shares too, titled as practice (like a
    // replay); the banner says so.
    const practice = attemptRecord === "practice";
    // K155: the stars. Turn-based walks rate from path + 2 x backtrack, as
    // a stored daily result does (the stats view agrees to the bit); a
    // chase rates from the walked meter (a catch's re-walk) and its catches.
    const rating = chase
      ? rateRun(c.walkedDist, c.walk.optimalLength, chase.catches)
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
      // K80: a chase's catches and time hunted (null: turn-based).
      catches: chase ? chase.catches : null,
      chasedMs: chase ? chase.huntSeconds * 1000 : null,
      rating,
    });
    updateHud();
    throwConfetti();
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
    const radius =
      fabric?.markerRadius() ?? markerRadiusFor(params.threadWidth);
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
  // the path and the string start over, and the fog keeps what was
  // explored, up to where the catch stopped the dot (K100).
  const restartChase = (): void => {
    chase =
      params.mazeFabric && params.clock === "realtime" && walkGraph && fabric
        ? new MinotaurChase(walkGraph, chaseParamsOf(params), params.seed)
        : null;
    chaseRunning = false;
    fabric?.syncMinotaur(chase, params.minoFog);
  };

  // A fresh solve on the same maze (Reset path, a clock change): a new
  // chase or none, nothing recorded.
  const restartSolve = (): void => {
    fabricController?.reset();
    fabric?.cancelMove();
    fabric?.clearYarn();
    pendingWin = false;
    restartChase();
    hideWin();
    if (fabric && fabricController) fabric.update(fabricController);
    resetAttempt();
    wake();
  };

  // A tap queues a run from the decision vertex (where the player stands,
  // or the end of the run under way; the latest tap wins); the chase sets
  // off along it on its next tick. Returns true when the tap was taken.
  const handleChaseTap = (x: number, y: number): boolean => {
    if (!chase || !fabric || !fabricController) return false;
    return chaseAlong(fabric.edgeAt(x, y, fabricController));
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
          fc.respawn();
          fabric.stopMove();
          fabric.clearYarn();
          pendingWin = false;
          fabric.update(fc);
          updateHud();
          showToast(
            chase.catches === 1
              ? "Caught! Back to the entrance."
              : `Caught ${chase.catches} times. Back to the entrance.`,
            2500
          );
        }
      }
    }
    if (chase.playerMoving) fabric.setMoveProgress(chase.playerProgress, fc);
    else if (fabric.animating) fabric.setMoveProgress(1, fc);
    fabric.minoMinRadius = MINO_MIN_CSS_R / Math.max(1e-6, root.scale.x);
    fabric.syncMinotaur(chase, params.minoFog);
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
  const handleFabricTap = (x: number, y: number): boolean => {
    if (!fabric || !fabricController) return false;
    // K80: the real-time mode queues the run with the chase instead.
    if (chase) return handleChaseTap(x, y);
    const eid = fabric.edgeAt(x, y, fabricController);
    if (eid < 0) return false;
    return moveAlong(eid);
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
      fabric.beginMove(
        eid,
        result === "backtrack" ? "backtrack" : "advance",
        fabricController
      );
      if (result === "win") pendingWin = true;
    } else {
      fabric.update(fabricController);
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
  const heldKeys = new HeldKeys();
  let keyHold = false; // A press moved and its key may still be down.
  let keyHoldSince = 0; // performance.now() of that press.
  // What the hold moved in: a tap, a reset, a catch or a rebuild ends it.
  let keyHoldFc: FabricMazeController | null = null;
  let keyHoldTaps = 0;
  let keyHoldChase: MinotaurChase | null = null;
  let keyHoldInputs = 0;
  let keyHoldCatches = 0;
  let keyHoldTick = 0;
  // Real time: a press while running queues its run for the arrival; the
  // hover shows it until the player leaves the run it was queued on.
  let keyQueued = -1;
  let keyQueuedOn = -1;
  let keyQueuedDir = 0;
  let keyHover = false; // The choice hover is the hold's.
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
    return departureVectors(
      walkGraph.edges,
      wv.edges,
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
    !(chase?.finished ?? false);
  const setKeyHover = (eid: number): void => {
    if (!fabric || !fabricController) return;
    keyHover = eid >= 0;
    if (fabric.setHover(eid)) fabric.update(fabricController);
  };
  const endKeyHold = (): void => {
    keyHold = false;
    keyQueued = -1;
    if (keyHover) setKeyHover(-1);
  };
  const noteKeyMove = (): void => {
    keyHold = true;
    keyHoldFc = fabricController;
    keyHoldTaps = fabricController?.taps.length ?? 0;
    keyHoldChase = chase;
    if (chase) {
      keyHoldInputs = chase.inputs.length;
      keyHoldCatches = chase.catches;
      keyHoldTick = chase.tick;
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
    moveAlong(eid);
    return fabricController.taps.length > before;
  };
  // A fresh press (or a pad press): the best match, as a tap. No match
  // does nothing; a hold already running keeps going.
  const keyPress = (dir: KeyDir): void => {
    const v = keyVertex();
    if (v === null) return;
    const p = pickDeparture(keyDepartures(v), dir, { hold: false });
    if (p.edge < 0) return;
    if (keyMoveAlong(p.edge)) {
      keyHoldSince = performance.now();
      noteKeyMove();
    }
  };
  // Every frame, after the move animation (or the chase) stepped.
  const keyStep = (): void => {
    if (!keyHold) return;
    const fc = fabricController;
    if (
      heldKeys.size === 0 ||
      !keysLive() ||
      !fc ||
      fc !== keyHoldFc ||
      chase !== keyHoldChase
    ) {
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
    if (moving || performance.now() - keyHoldSince < HOLD_DELAY_MS) {
      setKeyHover(pick.edge); // What the hold takes next.
      return;
    }
    // Arrived: the next run, or the hold stops here (no match, a tie, a
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
    if (!heldKeys.press(id, dir)) return;
    keyPress(dir);
  });
  // Capture: a keyup always lands, whoever handles it.
  window.addEventListener(
    "keyup",
    (e) => {
      heldKeys.release(e.code || e.key);
      if (heldKeys.size === 0) endKeyHold();
    },
    true
  );
  const dropKeys = (): void => {
    heldKeys.clear();
    endKeyHold();
  };
  window.addEventListener("blur", dropKeys);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) dropKeys();
  });
  // K120 Part B: the move pad (ui/move_pad.ts) - each finger on it is a
  // held key; fabricTick shows it while the keys are live.
  const movePad = new MovePad({
    press: (id, dir) => {
      if (!keysLive() || !heldKeys.press(id, dir)) return;
      keyPress(dir);
    },
    release: (id) => {
      heldKeys.release(id);
      if (heldKeys.size === 0) endKeyHold();
    },
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
    ps.dragTo(dragPos[0], dragPos[1]);
  };

  // End any release animation immediately (new grab, regenerate): free
  // the grab with no sound - the pluck already played.
  const cancelSnap = (): void => {
    if (snapMode === "none") return;
    snapMode = "none";
    ps?.release();
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
      }
      snapMode = "none";
      ps.release();
    } else if (style === "soft" && params.snapBack > 0) {
      snapMode = "soft";
    } else {
      snapMode = "none";
      ps?.release();
    }
  };

  // A TAP on a thread: the render-only pluck, sounding and vibrating on
  // RELEASE (how a real pluck works, and what tells a tap from a drag).
  // Re-picks at the press point so a knot that moved meanwhile still
  // plucks the thread that is there now.
  const tapPluck = (x: number, y: number): void => {
    if (!ps || !renderer) return;
    const hit = renderer.pickThread(x, y, GRAB_RADIUS);
    if (!hit) return;
    const freq = freqForCtrl(hit.chain, hit.ctrl);
    if (!settings.muted && params.soundMode !== "none") {
      synth.pluck(freq, TAP_STRENGTH);
    }
    const unit = pluckUnit(hit.chain, hit.ctrl);
    renderer.pluck({
      chain: hit.chain,
      arc: hit.arc,
      side: hit.side,
      gain: 1,
      freq,
      reach: unit.reach,
      spanCtrl: unit.spanCtrl,
    });
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
      ps.release();
      snapMode = "none";
    }
    pendingTap = null;
    pendingPluck = null;
    dragPan = null;
    touchLocked = true;
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
  // gestures - pan, double-tap reset - may take over).
  const emptyAt = (x: number, y: number): boolean =>
    !!ps &&
    ps.nearest(x, y, GRAB_RADIUS) < 0 &&
    !(
      params.mazeFabric &&
      fabric &&
      fabricController &&
      fabric.edgeAt(x, y, fabricController) >= 0
    );

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
    if (emptyAt(x, y)) resetCamera();
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
          fabric.edgeAt(x, y, fabricController) >= 0
        ) {
          pendingTap = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x, y };
          return;
        }
      } else if (handleFabricTap(x, y)) {
        return;
      }
    }
    if (
      ps.nearest(x, y, GRAB_RADIUS) >= 0 ||
      renderer?.pickThread(x, y, GRAB_RADIUS)
    ) {
      // A thread: undecided until it moves past the slop or lifts.
      pendingPluck = {
        id: e.pointerId,
        slop: TAP_SLOP_PX[e.pointerType] ?? TAP_SLOP,
        sx: e.clientX,
        sy: e.clientY,
        x,
        y,
      };
      app.canvas.setPointerCapture(e.pointerId);
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
    if (!physicsLive()) {
      dragPan = { id: pp.id, x: pp.sx, y: pp.sy, moved: pp.slop + 1 };
      return;
    }
    cancelSnap();
    if (ps.grab(pp.x, pp.y, GRAB_RADIUS) < 0) {
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
      // animates it even while the physics sleeps - no wake needed).
      const eid = fabric.edgeAt(x, y, fabricController);
      if (fabric.setHover(eid)) fabric.update(fabricController);
      app.canvas.style.cursor =
        eid >= 0
          ? "pointer"
          : ps.nearest(x, y, GRAB_RADIUS) >= 0
            ? threadCursor()
            : "default";
    } else {
      app.canvas.style.cursor =
        ps.nearest(x, y, GRAB_RADIUS) >= 0 ? threadCursor() : "default";
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
          handleFabricTap(tap.x, tap.y);
        }
      }
      // A lifted finger leaves no hover behind (touch has no pointer
      // to move off the run).
      if (fabric && fabricController && fabric.setHover(-1)) {
        fabric.update(fabricController);
      }
      if (touches.size === 0) touchLocked = false;
    }
    if (pendingPluck && pendingPluck.id === e.pointerId) {
      // Lifted within the slop: a TAP. Cancels (pointercancel, a pinch -
      // beginPinch drops pendingPluck) never pluck.
      const pp = pendingPluck;
      pendingPluck = null;
      if (e.type === "pointerup") tapPluck(pp.x, pp.y);
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
      synth.pluck(freq, amp, when);
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
    renderer.pluck({
      avoidCtrl,
      chain: site.chain,
      ctrl,
      side: Math.random() < 0.5 ? -1 : 1,
      // Auto strengths 0.4-0.75 -> amplitude gains 0.75-1.25.
      gain: Math.max(0.75, Math.min(1.25, 0.75 + ((amp - 0.4) / 0.35) * 0.5)),
      freq,
      reach: unit.reach,
      spanCtrl: unit.spanCtrl,
      beta: 0.3 + Math.random() * 0.2,
      delay: lead + synth.outputLatency(),
    });
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
  // external input, so once the sleep gate trips (sleepGate, above: its
  // quiet run spans QUIET_WINDOW simulated seconds), skip both physics and
  // rendering entirely until something wakes it.
  let asleep = false;
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
    sleepGate.reset();
    asleep = false;
    renderDirty = true;
  };
  // The sleep gate's per-frame test: physicsQuiet (settle complete, no
  // grab, motion under QUIET_EPS, no standing rider) plus the temperature
  // rule - agitation holds the knot awake (ignoreTemp: physics-off settles
  // never agitate, so temperature cannot hold them awake).
  const quietNow = (ignoreTemp: boolean): boolean =>
    !!ps &&
    physicsQuiet(ps) &&
    (ignoreTemp || settings.temperature === 0);
  const startSettling = (): void => {
    physState = "settling";
    settleWall0 = performance.now();
    sleepGate.reset();
    asleep = false;
  };
  const freeze = (): void => {
    physState = "frozen";
    asleep = true;
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
    } else if (asleep && ps && ps.grabbedParticle < 0) {
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
    // K169: a fully traveled gold web fading in (0.25 s).
    if (fabric !== null && fabric.webFading) return true;
    if (physState === "loading" || physState === "settling" || !asleep) {
      return true;
    }
    if (params.flowStrength > 0 || (reveal !== null && !reveal.done)) {
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
    background.tick(dt, sceneWasAnimating);
  };

  app.ticker.add((ticker) => {
    const c0 = performance.now();
    tick(ticker);
    // K140: the confetti steps in every branch (asleep, paused, loading);
    // a single early return once nothing is in the air.
    confetti.tick(ticker.deltaMS / 1000, app.screen.height, root);
    // After the scene's frame (the background's render-texture pass, when
    // due, precedes the stage render either way).
    backgroundTick(ticker.deltaMS / 1000);
    const c = performance.now() - c0;
    frameCost[frameCostN++ % frameCost.length] = c;
    frameCostTotal += c;
  });

  const tick = (ticker: Ticker): void => {
    if (!ps || !renderer) return;
    if (halted) return;

    if (physState === "loading") {
      if (presettle) presettleTick();
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
      reveal.tick(ticker.deltaMS / 1000);
    }
    // G2: the paint clock advances here, BEFORE any update() this frame
    // (the shader uniforms and update()'s CPU mirror read one clock).
    renderer.advanceClocks(ticker.deltaMS / 1000);
    // The gameplay animations (traversal, pulse, hover) run even while
    // paused or asleep - they touch only markers and UV buffers, never
    // physics or splines.
    const fabricTick = (): void => {
      autoAudioTick();
      renderer!.cuspRadius = params.cuspRadius;
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
      // Reduced motion (the Motion setting, live; WCAG 2.3.3): a pluck
      // started under it is STILL - the plucked segment brightens briefly
      // and nothing moves (K104); the sound is unchanged. Plucks already
      // ringing when it turns on finish without the ghost and the attack.
      renderer!.plucks.reducedMotion = motion.reduced;
      // Applies to knot mode too: the erase grids re-read it in the next
      // renderer.update(), and the slider's onSlackChange wakes the sim.
      renderer!.fadeLength = params.fadeLength;
      renderer!.flowStrength = params.flowStrength;
      renderer!.flowSpeed = params.flowSpeed;
      renderer!.pulseSpacing = params.pulseSpacing;
      renderer!.pulseReach = params.pulseReach;
      // Frontier particle style: live dropdown, consumed by the
      // appearance-FX pass inside tickPaint while a reveal runs.
      renderer!.appearFx = params.appearFx;
      if (params.mazeFabric && fabric && fabricController) {
        fabric.moveSpeed = params.moveSpeed;
        fabric.trailMode = params.pathViz === "trail";
        fabric.pathViz = params.pathViz;
        fabric.tension = params.tension;
        fabric.trailLength = params.trailLength;
        fabric.fogOfWar = params.fogOfWar;
        fabric.fowRadius = params.fowRadius;
        // fowIntro: keep the fog off while the intro animation plays; the
        // release closes it in (fade + contracting radius).
        fabric.setFogHold(params.fogOfWar && params.fowIntro && revealing);
        fabric.tickFog(ticker.deltaMS / 1000);
        fabricController.trailMode = params.pathViz === "trail";
        // K80: in the real-time mode the chase moves the dot (tickChase).
        if (chase) tickChase(ticker.deltaMS / 1000);
        else fabric.tickAnim(ticker.deltaMS / 1000, fabricController);
        // K120: a held key's next move, once the dot has arrived.
        keyStep();
        if (pendingWin && !fabric.animating) {
          pendingWin = false;
          showFabricWin();
        }
      }
      // K120: the move pad shows while the keys are live (knot mode too:
      // there it hides).
      movePad.setShown(settings.movePad && keysLive());
      renderer!.tickPaint(ticker.deltaMS / 1000);
      // After the paint pass: fabric pluck colors read this frame's paint.
      renderer!.tickPlucks(ticker.deltaMS / 1000);
      updateCamera(Math.min(ticker.elapsedMS / 1000, CAM_MAX_DT));
      // After the camera step: the indicators read this frame's framing.
      indicators.update();
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
        params.flowStrength <= 0 &&
        !revealing &&
        !renderer!.needsFxRender()
      ) {
        return;
      }
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
        ps.dragTo(dragPos[0], dragPos[1]);
        wake();
        if (
          Math.hypot(
            dragPos[0] - grabOrigin[0],
            dragPos[1] - grabOrigin[1]
          ) < 0.02
        ) {
          snapMode = "none";
          ps.release();
        }
      } else {
        snapMode = "none";
      }
    }

    if (asleep) {
      restFrame(" | asleep");
      return;
    }
    const t0 = performance.now();
    const sim0 = ps.simTime;
    const requestDt = (ticker.deltaMS / 1000) * speedMult;
    // K147: while the load settle's budget is armed, this frame steps only
    // the substeps the budget affords (none: no step() call at all).
    const budget = activeBudget();
    if (budget) {
      const s = budgetedStep(budget, requestDt, ps.pendingTime, STEP_LIMITS);
      if (s.dt > 0) {
        ps.step(s.dt, physicsTuning());
        stepCount++;
        recordStepCost(budget, performance.now() - t0, s.n);
      }
    } else {
      ps.step(requestDt, physicsTuning());
      stepCount++;
    }
    const t1 = performance.now();
    if (!Number.isFinite(ps.maxMove)) {
      halted = true;
      perfLine = " | HALTED: physics went non-finite (regenerate to reset)";
      updateStamp();
      console.error(
        "KnotMaze: physics state went non-finite; simulation halted."
      );
      return;
    }
    renderer.update();
    renderDirty = false;
    // Keep the gameplay overlay locked to the deforming knot.
    if (params.mazeFabric && fabric && fabricController) {
      fabric.update(fabricController);
    }
    fabricTick();
    const t2 = performance.now();

    // The sleep gate, fed this frame's SIMULATED time (frame-rate
    // independent). A physics-off settle freezes where live physics would
    // fall asleep (or at its wall-clock cap).
    const settling = physState === "settling";
    if (sleepGate.frame(quietNow(settling), ps.simTime - sim0)) {
      asleep = true;
      if (settling) freeze();
      endBudget("sleep");
    }
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

  // Verifiable code-state stamp: on screen and in the console, with the
  // environment facts that matter when debugging rendering discrepancies.
  // sim vs wall time exposes rAF throttling (an under-simulated knot is
  // frozen mid-settle and looks kinked/notched).
  // Hidden unless the panel's showStats is on (the text still updates, so
  // probes reading it via textContent keep working either way).
  const stamp = document.createElement("div");
  stamp.style.cssText =
    "position:fixed;left:max(6px,env(safe-area-inset-left));" +
    "bottom:max(4px,env(safe-area-inset-bottom));font:10px monospace;" +
    "color:#5a6478;pointer-events:none;z-index:10";
  stamp.style.display = settings.showStats ? "" : "none";
  document.body.appendChild(stamp);
  const wallStart = performance.now();
  // Rolling per-frame cost, flushed twice a second.
  const perf = { physMs: 0, renderMs: 0, frames: 0, flushedAt: wallStart };
  let perfLine = "";
  const updateStamp = (): void => {
    const wall = (performance.now() - wallStart) / 1000;
    const sim = ps?.simTime ?? 0;
    // K147: simulated time the load settle's budget dropped (slow motion),
    // while it runs or after it ended; sim trails wall by at least this.
    const lag = armedBudget ? armedBudget.lagS : settleInfo.budget.lagS;
    stamp.textContent =
      `${BUILD_STAMP} | sim ${sim.toFixed(1)}s / wall ${wall.toFixed(1)}s` +
      (lag > 0.05 ? ` | settle lag ${lag.toFixed(1)}s` : "") +
      perfLine;
  };
  updateStamp();

  const gl = (app.renderer as unknown as { gl?: WebGLRenderingContext }).gl;
  console.log(
    `KnotMaze ${BUILD_STAMP} | dpr ${window.devicePixelRatio} | ` +
      `gpu ${gl ? gl.getParameter(gl.RENDERER) : "unknown"}`
  );

  // The live design params (a copy). The address bar holds one compact
  // token (ui/param_codec.ts), so probes read settings here, not the URL.
  (window as unknown as Record<string, unknown>).__knotParams = () => ({
    ...params,
  });
  // K19/K20 probes: the daily on screen, the attempt, the clock and the
  // stored records (as the stats view reads them).
  (window as unknown as Record<string, unknown>).__knotDaily = () => ({
    daily: dailyN,
    floating: dailyFloating,
    today: todayNumber(),
    attemptDaily,
    attemptDay,
    attemptStartedAt,
    attemptRecord,
    clock: { state: clock.state, ms: clock.elapsed(performance.now()) },
    junctions: fabricController ? [...fabricController.visitedJunctions] : [],
    deadEnds: fabricController ? [...fabricController.deadEndTips] : [],
    moves: fabricController ? fabricController.moveLog.join("") : "",
    taps: fabricController ? [...fabricController.taps] : [],
    path: fabricController ? [...fabricController.pathEdges] : [],
    head: fabricController?.head ?? null,
    backtrack: fabricController?.backtrackDist ?? 0,
    // K47/K56: the saved attempt of the daily on screen, and the prefs.
    saved: dailyN !== null ? (dailyStore.attempt(dailyN) ?? null) : null,
    exempt: [...DAILY_EXEMPT_KEYS],
    prefs: dailyStore.prefs(),
    share: lastWin,
    storeStatus: dailyStore.status,
    store: dailyStore.data(),
    // K73/K151: the mode badge on screen ("free" | "daily" | "replay" |
    // "practice"), its label, and K146's practice test for this attempt.
    badge: modeBadge.kind,
    badgeText: modeBadge.el.hidden ? "" : modeBadge.el.innerText.trim(),
    late: attemptLate(),
    // K146: the stats view's History as it reads it.
    history: dailyHistory(dailyStore.data(), todayNumber()),
  });
  (window as unknown as Record<string, unknown>).__knotPlayDaily = (n: number) =>
    playDaily(n);
  // K73 probes: every off-screen indicator's last decision (status, the
  // target's screen point, its placement), why the finish's hides, and the
  // camera tween a tap runs.
  (window as unknown as Record<string, unknown>).__knotIndicators = () => ({
    indicators: indicators.state(),
    finishWhy,
    headWhy,
    tween: camTween !== null,
    follow: camFollow,
    // Seconds since the last gesture: the follow spring is at full strength
    // from FOLLOW_DELAY + FOLLOW_RAMP (K148's return to the head sets it).
    followIdle: nowSec() - camTouchedAt,
  });
  // Diagnostic hooks for the automated crossing scanner.
  (window as unknown as Record<string, unknown>).__knotDiag = () =>
    renderer ? Array.from(renderer.getDiag().data) : [];
  (window as unknown as Record<string, unknown>).__knotView = () => ({
    x: root.position.x,
    y: root.position.y,
    s: root.scale.x,
    // The fit camera's own state (K149 probes; stale under the follow
    // camera): the zoom on top of the auto-fit and its screen-space pan.
    zoom: view.zoom,
    panX: view.panX,
    panY: view.panY,
  });
  // K101: the music notes handed out lately (start time on their clock,
  // lead = how far ahead of the tick that scheduled them) and the clocks.
  (window as unknown as Record<string, unknown>).__knotSong = () => ({
    notes: songLog.slice(),
    audioTime: synth.audioTime(),
    wallTime: performance.now() / 1000,
  });
  (window as unknown as Record<string, unknown>).__knotInspect = (
    x: number,
    y: number
  ) => renderer?.requestInspect(x, y);
  // Physics-side twin of __knotDiag: binding state per crossing (world
  // position, ctrls, separation), contact regime, emergent count.
  (window as unknown as Record<string, unknown>).__knotPhys = () => {
    const sys = ps;
    if (!sys) return null;
    const scratch = new Float32Array(4);
    return {
      sticky: sys.contactsStatic,
      simTime: sys.simTime,
      emergent: sys.emergentCrossings.length,
      emergentList: sys.emergentCrossings.map((em) => {
        sys.bindingPoint(em.over, scratch, 0);
        return { x: scratch[0], y: scratch[1] };
      }),
      crossings: sys.crossings.map((c) => {
        sys.bindingPoint(c.over, scratch, 0);
        sys.bindingPoint(c.under, scratch, 2);
        return {
          x: (scratch[0] + scratch[2]) / 2,
          y: (scratch[1] + scratch[3]) / 2,
          over: `${c.over.chain}:${c.over.ctrl.toFixed(2)}`,
          under: `${c.under.chain}:${c.under.ctrl.toFixed(2)}`,
          sep: sys.crossingSeparation(c),
        };
      }),
      slide: sys.readSlideStats(),
    };
  };
  // Raw system access for probe scripting (phase probe, slide stats).
  (window as unknown as Record<string, unknown>).__knotPS = () => ps;
  // Appearance-reveal diagnostics: mode, clock, completion, frontier FX.
  (window as unknown as Record<string, unknown>).__knotReveal = () =>
    reveal
      ? {
          mode: reveal.mode,
          done: reveal.done,
          clock: reveal.clock,
          duration: reveal.planDuration,
          fx: params.appearFx,
          fxAlive: renderer?.appearFxAlive() ?? 0,
        }
      : null;
  // Raw renderer access for probe scripting (patch visibility/tinting).
  (window as unknown as Record<string, unknown>).__knotRenderer = () =>
    renderer;
  // K80 real-time chase diagnostics (null outside the real-time mode): the
  // chase's state, with the minotaur's SCREEN point while fabric draws it.
  // __knotChaseTap(edge) queues a run as a tap on it would (and starts the
  // chase); __knotChaseObj() is the live MinotaurChase.
  (window as unknown as Record<string, unknown>).__knotChase = () => {
    if (!chase) return null;
    const ch = chase;
    const out = new Float32Array(2);
    const shown = !!fabric && fabric.minotaurWorld(out);
    const at = (s: { edge: number; vertex: number }): string | null =>
      s.edge < 0 ? ch.g.ids[s.vertex] : null;
    return {
      running: chaseRunning,
      tick: ch.tick,
      seconds: ch.seconds,
      catches: ch.catches,
      huntSeconds: ch.huntSeconds,
      finished: ch.finished,
      mode: ch.mode,
      player: { ...ch.player },
      playerAt: at(ch.player),
      mino: { ...ch.mino },
      minoAt: at(ch.mino),
      decisionVertex: ch.decisionVertex,
      playerMoving: ch.playerMoving,
      playerProgress: ch.playerProgress,
      // Infinity (the player is on a tail) serializes as null.
      huntDistance: ch.huntDistance(),
      contactDistance: ch.contactDistance(),
      params: { ...ch.params },
      inputs: ch.inputs.map((i) => ({ ...i })),
      minoShown: shown,
      minoUnderFog: fabric?.minotaurUnderFog ?? false,
      minoRadius: fabric?.minotaurRadius() ?? 0,
      minoScreen: shown
        ? {
            x: out[0] * root.scale.x + root.position.x,
            y: out[1] * root.scale.y + root.position.y,
          }
        : null,
    };
  };
  (window as unknown as Record<string, unknown>).__knotChaseTap = (
    edge: number
  ): "queued" | "reject" | null => {
    if (!chase) return null;
    const r = chase.tap(edge);
    if (r === "queued") chaseRunning = true;
    return r;
  };
  (window as unknown as Record<string, unknown>).__knotChaseObj = () => chase;
  // Fabric-maze diagnostics: solve state, metrics, and each current choice
  // with a tappable SCREEN point (via the live root transform) plus its
  // cost-to-exit, for scripted solve verification.
  (window as unknown as Record<string, unknown>).__knotFabric = () => {
    if (!fabric || !fabricController || !walkGraph) return null;
    const c = fabricController;
    const wg = walkGraph;
    const fb = fabric;
    const out = new Float32Array(2);
    const toScreen = (wx: number, wy: number): { x: number; y: number } => ({
      x: wx * root.scale.x + root.position.x,
      y: wy * root.scale.y + root.position.y,
    });
    const sys = ps!;
    return {
      head: c.head,
      solved: c.solved,
      animating: fb.animating,
      pathLength: c.pathLength,
      optimal: wg.optimalLength,
      backtrack: c.backtrackDist,
      walked: c.walkedDist, // K155
      trailMode: c.trailMode,
      pathViz: params.pathViz,
      trailLength: params.trailLength,
      pathEdges: [...c.pathEdges],
      choices: c.choices().map((eid) => {
        const e = wg.edges[eid];
        const far = e.va === c.head ? e.vb : e.va;
        const f =
          e.va === c.head
            ? Math.min(e.ctrlA + 1.5, (e.ctrlA + e.ctrlB) / 2)
            : Math.max(e.ctrlB - 1.5, (e.ctrlA + e.ctrlB) / 2);
        const len = sys.chains[e.chain].length;
        sys.pointOnChain(e.chain, ((f % len) + len) % len, out, 0);
        return {
          edge: eid,
          far,
          // The far vertex is a dead-end tip (an END that is neither the
          // start nor the exit) - probes steer into dead ends with it.
          farDeadEnd:
            (wg.vertices.get(far)?.isEnd ?? false) &&
            far !== wg.start &&
            far !== wg.exit,
          cost: e.length + (wg.distToExit.get(far) ?? Infinity),
          screen: toScreen(out[0], out[1]),
        };
      }),
      vertexScreen: (id: string) => {
        fb.vertexWorld(id, out, 0);
        return toScreen(out[0], out[1]);
      },
      // Probe helper: the walk-edge ids of a fewest-runs route from the
      // head to the nearest dead-end tip not in `exclude` (BFS, never
      // through the exit), or null when there is none.
      routeToDeadEnd: (exclude: string[] = []): number[] | null => {
        const skip = new Set(exclude);
        const prev = new Map<string, [string, number]>();
        const seen = new Set([c.head]);
        const queue = [c.head];
        while (queue.length > 0) {
          const v = queue.shift()!;
          const tip =
            v !== c.head &&
            (wg.vertices.get(v)?.isEnd ?? false) &&
            v !== wg.start &&
            !skip.has(v);
          if (tip) {
            const route: number[] = [];
            for (let u = v; u !== c.head; ) {
              const [p, eid] = prev.get(u)!;
              route.unshift(eid);
              u = p;
            }
            return route;
          }
          for (const eid of wg.vertices.get(v)!.edges) {
            const e = wg.edges[eid];
            const u = e.va === v ? e.vb : e.va;
            if (seen.has(u) || u === wg.exit) continue;
            seen.add(u);
            prev.set(u, [v, eid]);
            queue.push(u);
          }
        }
        return null;
      },
      // Diagnostic: everything within `r` lattice units of a LATTICE point -
      // walk vertices (live position) and walk edges (nearest sample), with
      // chains and path membership. Attribution beats speculation.
      near: (x: number, y: number, r = 1.2) => {
        const verts: Array<Record<string, unknown>> = [];
        for (const [id, v] of wg.vertices) {
          fb.vertexWorld(id, out, 0);
          const d = Math.hypot(out[0] - x, out[1] - y);
          if (d <= r) {
            verts.push({
              id,
              d: +d.toFixed(3),
              isEnd: v.isEnd,
              chain: v.chain,
              ctrl: v.ctrl,
              edges: [...v.edges],
            });
          }
        }
        const edges: Array<Record<string, unknown>> = [];
        for (const e of wg.edges) {
          const len = sys.chains[e.chain].length;
          let bd = Infinity;
          for (let f = e.ctrlA; f <= e.ctrlB; f += 0.5) {
            sys.pointOnChain(e.chain, ((f % len) + len) % len, out, 0);
            const d = Math.hypot(out[0] - x, out[1] - y);
            if (d < bd) bd = d;
          }
          if (bd <= r) {
            edges.push({
              edge: e.id,
              d: +bd.toFixed(3),
              va: e.va,
              vb: e.vb,
              chain: e.chain,
              ctrlA: e.ctrlA,
              ctrlB: e.ctrlB,
              onPath: c.pathEdges.includes(e.id),
            });
          }
        }
        return { verts, edges };
      },
    };
  };
  // K120 probes: the key-move state at the junction the keys leave from
  // (its departures and what each key picks, for a press and a hold), and
  // census(reaches): every junction's departure directions at each reach.
  (window as unknown as Record<string, unknown>).__knotKeyMoves = () => {
    const v = keyVertex();
    const taps = fabricController?.taps ?? [];
    const arrival = taps.length > 0 ? taps[taps.length - 1] : -1;
    const deps = v !== null && keysLive() ? keyDepartures(v) : [];
    const dirs: KeyDir[] = ["up", "down", "left", "right"];
    return {
      vertex: v,
      live: keysLive(),
      hold: keyHold,
      held: heldKeys.dirs,
      pad: movePad.isShown,
      arrival,
      scaleX: root.scale.x,
      scaleY: root.scale.y,
      departures: deps,
      press: Object.fromEntries(
        dirs.map((d) => [d, pickDeparture(deps, d, { hold: false })])
      ),
      holdPick: Object.fromEntries(
        dirs.map((d) => [d, pickHold(deps, [d], arrival)])
      ),
      census: (reaches: number[]) => {
        if (!walkGraph || !fabric || !ps || !renderer) return null;
        const out: Array<Record<string, unknown>> = [];
        for (const [id, wv] of walkGraph.vertices) {
          if (wv.isEnd) continue;
          out.push({
            id,
            edges: [...wv.edges],
            lengths: wv.edges.map((e) => walkGraph!.edges[e].length),
            deps: reaches.map((r) => keyDepartures(id, r)),
          });
        }
        return { start: walkGraph.start, exit: walkGraph.exit, junctions: out };
      },
    };
  };
  // The fabric overlay itself (K83 probes: setMarkerStyle swaps the marker
  // glyphs and size, markerStyle reads them).
  (window as unknown as Record<string, unknown>).__knotFabricRenderer = () =>
    fabric;
  // RENDER-ONLY PLUCK probes: fire a pluck on a chain at a ctrl (as a tap
  // there would, unless opts override), and read the live plucks + stats.
  (window as unknown as Record<string, unknown>).__knotPluck = (
    chain: number,
    ctrl: number,
    opts: { side?: number; gain?: number; beta?: number; delay?: number } = {}
  ) => {
    if (!renderer || !ps) return false;
    const unit = pluckUnit(chain, ctrl);
    return renderer.pluck({
      chain,
      ctrl,
      side: opts.side ?? 1,
      gain: opts.gain ?? 1,
      freq: freqForCtrl(chain, ctrl),
      reach: unit.reach,
      spanCtrl: unit.spanCtrl,
      beta: opts.beta,
      delay: opts.delay,
    });
  };
  (window as unknown as Record<string, unknown>).__knotPluckState = () =>
    renderer
      ? {
          active: renderer.plucks.state(),
          stats: { ...renderer.plucks.stats },
          updates: renderer.updateCount,
        }
      : null;
  // Frame-cost + physics-mode probe: main-thread ms per ticker callback
  // over the last `n` frames, renderer.update() and ps.step() call counts.
  (window as unknown as Record<string, unknown>).__knotPerf = (n = 120) => {
    const k = Math.min(n, frameCostN, frameCost.length);
    const xs: number[] = [];
    for (let i = 0; i < k; i++) {
      xs.push(frameCost[(frameCostN - 1 - i + frameCost.length * 4) % frameCost.length]);
    }
    xs.sort((a, b) => a - b);
    const mean = xs.reduce((s, v) => s + v, 0) / Math.max(1, xs.length);
    return {
      frames: k,
      mean,
      p50: xs[Math.floor(xs.length * 0.5)] ?? 0,
      p95: xs[Math.floor(xs.length * 0.95)] ?? 0,
      max: xs[xs.length - 1] ?? 0,
      updates: renderer?.updateCount ?? 0,
      steps: stepCount,
      state: physState,
      asleep,
      loadMs,
      loadStepMs,
      loadSteps,
      loadFrames,
      totalFrames: frameCostN,
      totalCostMs: frameCostTotal,
      plucks: renderer?.plucks.activeCount ?? 0,
    };
  };
  // K147 load-settle probe: the phase now (presettle | budget | off), the
  // armed budget's state, and the last pre-settle and budgeted settle.
  (window as unknown as Record<string, unknown>).__knotSettle = () => ({
    phase: presettle ? "presettle" : armedBudget ? "budget" : "off",
    budgetMs: armedBudget?.budgetMs ?? null,
    costMs: armedBudget?.costMs ?? null,
    lagS: armedBudget ? armedBudget.lagS : settleInfo.budget.lagS,
    loaderShown: presettle && loaderShownAt >= 0,
    presettle: { ...settleInfo.presettle },
    budget: { ...settleInfo.budget },
  });
  // The physics checkbox, as the panel drives it (probe scripting).
  (window as unknown as Record<string, unknown>).__knotSetPhysics = (
    on: boolean
  ) => {
    params.physics = on;
    writeParams(params);
    applyPhysicsMode();
    return physState;
  };
  // A Physics-folder slider, as the panel drives it (probe scripting).
  (window as unknown as Record<string, unknown>).__knotSetPhysicsParam = (
    key: "slack" | "drag" | "repulsion" | "bend" | "smooth" | "stiffness" | "gridAlign",
    value: number
  ) => {
    params[key] = value;
    writeParams(params);
    physicsInputsChanged();
    wake();
    return physState;
  };
  // SHADER BACKGROUND probes: state, the raw layer (pin its clock, force a
  // texture pass), and the panel's dropdown + slider.
  (window as unknown as Record<string, unknown>).__knotBackground = () => ({
    id: background.id,
    active: background.active,
    // The last texture pass's program (bg-<program> in GPU timings).
    program: background.programId,
    speed: params.backgroundSpeed,
    stats: { ...background.stats },
    time: background.clock.time,
    drifting: background.clock.isDrifting,
    needsFrame: background.needsFrame(),
  });
  (window as unknown as Record<string, unknown>).__knotBackgroundLayer = () =>
    background;
  // K140 probes: the confetti's state (pieces alive, bursts thrown, frames
  // stepped - frozen once idle - the plan a finish would throw, and the last
  // frame's sceneAnimating()), and a finish's burst on demand.
  (window as unknown as Record<string, unknown>).__knotConfetti = () => ({
    active: confetti.active,
    rain: confetti.sim.rain.alive,
    spray: confetti.sim.spray.alive,
    stats: { ...confetti.stats },
    plan: confettiPlan(
      params.confetti,
      params.confettiAmount,
      motion.reduced,
      app.screen.width,
      app.screen.height
    ),
    sceneAnimating: sceneWasAnimating,
    rainVisible: confetti.rainContainer.visible,
    sprayVisible: confetti.sprayContainer.visible,
  });
  (window as unknown as Record<string, unknown>).__knotConfettiBurst = () => {
    throwConfetti();
    return confetti.active;
  };
  (window as unknown as Record<string, unknown>).__knotSetBackground = (
    id: UrlParams["background"],
    intensity?: number,
    speed?: number
  ) => {
    params.background = id;
    if (intensity !== undefined) params.backgroundIntensity = intensity;
    if (speed !== undefined) params.backgroundSpeed = speed;
    syncBackground();
    writeParams(params);
    return background.id;
  };
  // Any background params at once (K79 stage B: shape + colors), e.g.
  // {backgroundScale: 2, backgroundColorMode: "custom"}; unknown keys are
  // ignored. Returns the program the next texture pass will use.
  (window as unknown as Record<string, unknown>).__knotSetBackgroundParams = (
    values: Partial<UrlParams>
  ) => {
    const p = params as unknown as Record<string, unknown>;
    for (const [k, v] of Object.entries(values)) {
      if (k.startsWith("background") && Object.hasOwn(p, k)) p[k] = v;
    }
    syncBackground();
    writeParams(params);
    background.renderTexture();
    return background.programId;
  };
  // THE MOTION SETTING probe: the choice, the OS's answer, the result and
  // the root attribute the stylesheets read.
  (window as unknown as Record<string, unknown>).__knotMotion = () => ({
    pref: motion.pref,
    system: motion.system,
    reduced: motion.reduced,
    attr: document.documentElement.dataset.motion ?? null,
  });
  // The "Replay settle" button (probe scripting).
  (window as unknown as Record<string, unknown>).__knotReplay = () => {
    replaySettle();
    return physState;
  };
  // World point at a fractional ctrl along a chain (probe scripting).
  (window as unknown as Record<string, unknown>).__knotPoint = (
    chain: number,
    f: number
  ) => {
    const sys = ps;
    if (!sys) return null;
    const scratch = new Float32Array(2);
    sys.pointOnChain(chain, f, scratch, 0);
    return { x: scratch[0], y: scratch[1] };
  };

  rebuild();
}

main().catch(console.error);
