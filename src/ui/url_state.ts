// URL-as-complete-state: every design is fully specified by (seed, params)
// serialized in the query string - one compact token (ui/param_codec.ts),
// `?<seed>` or `?<seed>.<blob>`. key=value pairs (`?s=<seed>&am=instant`)
// still parse, against today's defaults.

import { decodeToken, encodeToken } from "./param_codec";
import type { ParamValue } from "./param_codec";
import type { ColorScheme, GamutPalette } from "../core/section_colors";
import { COLOR_SCHEMES, GAMUT_PALETTES } from "../core/section_colors";
import type { PitchSpace } from "../audio/pitch_space";
import { PITCH_SPACES } from "../audio/pitch_space";
import type { AppearSequence, AppearFxMode } from "../core/reveal_plan";
import { APPEAR_SEQUENCES, APPEAR_FX_MODES } from "../core/reveal_plan";
import type { ShapeId, AnchorId } from "../core/shapes";
import { SHAPES, ANCHORS } from "../core/shapes";
import type { ChaseParams, ClockMode } from "../game/minotaur";
import type { FireClock } from "../game/fire";
import {
  DEFAULT_CHASE_PARAMS,
  HUNT_PACE_FRACTION,
  WANDER_PACE_FRACTION,
} from "../game/minotaur";
import type {
  TurnMinoParams,
  TurnMinotaurSetting,
  TurnSpeed,
} from "../game/minotaur_turns";
import {
  DEFAULT_TURN_MINO,
  MINOTAUR_SETTINGS,
  TURN_MODEL_DEFAULTS,
  TURN_SPEEDS,
} from "../game/minotaur_turns";
import { CONFETTI_AMOUNT_MAX } from "../render/confetti_model";
import type {
  PluckCrossings,
  PluckGlow,
  PluckRipple,
} from "../render/pluck_model";
import {
  PLUCK_CROSSINGS,
  PLUCK_GLOWS,
  PLUCK_RIPPLES,
  PLUCK_WHOLE_MAX,
  RIPPLE_STRENGTH_MAX,
} from "../render/pluck_model";
import { MARKER_SIZE_DEFAULT, sanitizeMarkerSize } from "../render/marker_glyphs";
import { PAINT_CONST } from "../render/paint_const";
import type {
  BackgroundColorMode,
  BackgroundId,
} from "../render/background_model";
import {
  BACKGROUNDS,
  BACKGROUND_ANGLE_AUTO,
  BACKGROUND_COLOR_MODES,
  BACKGROUND_SPEED_AUTO,
  BACKGROUND_SPEED_MAX,
  isAutoSpeed,
  sanitizeBackgroundAngle,
  sanitizeBackgroundDetail,
  sanitizeBackgroundScale,
  sanitizeBackgroundTexture,
} from "../render/background_model";

// Pluck audio behavior: silent | user plucks only | ambient random plucks
// | scripted song playback.
export type SoundMode = "none" | "manual" | "random" | "music";
export const SOUND_MODES: SoundMode[] = ["none", "manual", "random", "music"];

// Release feel: soft eased snap-back vs sharp ringing string.
export type PluckStyle = "soft" | "string";
export const PLUCK_STYLES: PluckStyle[] = ["soft", "string"];

// What a render-only pluck sets vibrating: the whole walk run (in knot
// mode, the plucked lobe +-2) or only the plucked lobe.
export type PluckReach = "run" | "lobe";
export const PLUCK_REACHES: PluckReach[] = ["run", "lobe"];

// Traversal-path visualization: full gold recolor | short memory trail |
// an unspooled Ariadne string laid along everywhere you have walked.
export type PathViz = "gold" | "trail" | "string";
export const PATH_VIZ_MODES: PathViz[] = ["gold", "trail", "string"];

// Camera: fit = frame the whole knot (or, under fog, what you can see);
// follow = chase the player's head (maze mode).
export type CameraMode = "fit" | "follow";
export const CAMERA_MODES: CameraMode[] = ["fit", "follow"];

// The maze clock (K80; game/minotaur.ts ClockMode): turn = the turn-based
// maze, realtime = the real-time minotaur mode. K114's beat clock would
// append an option.
export const CLOCK_MODES: ClockMode[] = ["turn", "realtime"];

// K114's burn race (game/fire.ts): off, or a fuse lit at the entrance that
// burns the maze behind you. Never with K80's real-time minotaur clock or
// the turn-aligned minotaur (fireSettingsOf); fireClock picks its clock.
export type FireMode = "off" | "fuse";
export const FIRE_MODES: FireMode[] = ["off", "fuse"];
// The fire's clock (K114 stage 2; game/fire_clock.ts): turn (L = the
// distance walked, stage 1) or realtime (L = FIRE_V_REF lattice units a
// second since the first move; the dot runs at that pace). Not `clock`,
// the maze clock, whose realtime is K80's minotaur.
export type FireClockMode = FireClock;
export const FIRE_CLOCKS: FireClockMode[] = ["turn", "realtime"];
// How a burnt stretch draws (K290, burn stage 3a): gone (not drawn: the
// paint shader hides it through the thread reveal's visibility, so its
// crossings close their gaps and its junction fans drop it) or char (a
// burnt coloring that keeps the crossing gaps). A look only: the fire's
// model, its arms and the attempt never read it.
export type BurntMode = "gone" | "char";
export const BURNT_MODES: BurntMode[] = ["gone", "char"];

// The maze's EXPLORATION mode (K76 stage 2c; the fogOfWar flag before it):
// off (the whole maze shows), fog (the fog of war hides what you have not
// been close to) or threads (the thread reveal: only the threads you have
// walked and the arms of the junctions you have reached show,
// game/explore_view.ts).
export type Exploration = "off" | "fog" | "threads";
export const EXPLORATION_MODES: Exploration[] = ["off", "fog", "threads"];

// The thread reveal's END LOOKS (K76): how a frontier's fade ends. The
// order is render/explore_glsl.ts EXPLORE_LOOKS' (a look's index is its
// shader code); test/ui/param_codec.test.ts holds the two lists equal.
export type RevealLook = "fade" | "halo" | "glow" | "dots" | "fray" | "beacon";
export const REVEAL_LOOKS: RevealLook[] = ["fade", "halo", "glow", "dots", "fray", "beacon"];
// K466 THE ENDS: where a frontier's fade goes when it would lie under a
// crossing (under: where it falls, K76's placement; past: pushed beyond
// the crossing, so a little more thread shows; back: pulled in before
// it), and the end halo's strength (soft: K76's; bright: larger and
// brighter).
export type RevealEndCross = "under" | "past" | "back";
export const REVEAL_END_CROSSES: RevealEndCross[] = ["under", "past", "back"];
export type RevealEndGlow = "soft" | "bright";
export const REVEAL_END_GLOWS: RevealEndGlow[] = ["soft", "bright"];
// The reveal's reach and its fade, lattice units (the renderer uses
// min(fade, reach)).
export const REVEAL_DISTANCE_MIN = 1;
export const REVEAL_DISTANCE_MAX = 12;
export const REVEAL_FADE_MIN = 0.35;
export const REVEAL_FADE_MAX = 4;

// How the real-time minotaur shows under the fog of war (K80): always, only
// while it hunts the player, or never (only where the fog has cleared).
// Under the thread reveal (K76 stage 2c) the same setting reads "where its
// thread shows" for "where the fog has cleared".
export type MinoFog = "always" | "hunting" | "never";
export const MINO_FOG_MODES: MinoFog[] = ["always", "hunting", "never"];

// Scale root for manual/random sound modes ("seed" derives it from the
// design seed, the long-standing default).
export const ROOT_NOTES = [
  "seed",
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;
export type RootNote = (typeof ROOT_NOTES)[number];

// APPEARANCE MODE (the appearMode dropdown): one choice sets the three
// appearance params - appearSequence, appearFx and appearSpeed - together.
// instant = no reveal; each hand-tailored preset fixes all three; random
// rolls fresh values on every page load (and whenever it is picked);
// custom keeps whatever the three rows say. Editing any of the three
// re-derives the mode (appearModeFor): custom, unless the values still
// match instant or a preset exactly.
export type AppearPreset =
  | "ink-dust"
  | "trace-burn"
  | "trace-rainbow"
  | "trace-roots"
  | "bloom-comet";
export type AppearMode = "instant" | AppearPreset | "random" | "custom";
export const APPEAR_MODES: AppearMode[] = [
  "instant",
  "ink-dust",
  "trace-burn",
  "trace-rainbow",
  "trace-roots",
  "bloom-comet",
  "random",
  "custom",
];
export const APPEAR_PRESETS: Record<
  AppearPreset,
  { sequence: AppearSequence; fx: AppearFxMode; speed: number }
> = {
  "ink-dust": { sequence: "ink", fx: "dust", speed: 3 },
  "trace-burn": { sequence: "trace", fx: "burn", speed: 3 },
  "trace-rainbow": { sequence: "trace", fx: "rainbow", speed: 2 },
  "trace-roots": { sequence: "trace", fx: "roots", speed: 1.5 },
  "bloom-comet": { sequence: "bloom", fx: "comet", speed: 2.2 },
};
// random: any real reveal (never instant), any visible effect (never
// none), a speed across the presets' range on the slider's 0.05 grid.
const RANDOM_SPEED_MIN = 1.5;
const RANDOM_SPEED_MAX = 3;

type AppearParams = Pick<
  UrlParams,
  "appearMode" | "appearSequence" | "appearFx" | "appearSpeed"
>;

// The mode these values describe: instant, the preset they match exactly,
// else custom. Never random - random is only ever chosen.
export function appearModeFor(p: AppearParams): AppearMode {
  if (p.appearSequence === "instant") return "instant";
  for (const id of Object.keys(APPEAR_PRESETS) as AppearPreset[]) {
    const v = APPEAR_PRESETS[id];
    if (
      v.sequence === p.appearSequence &&
      v.fx === p.appearFx &&
      Math.abs(v.speed - p.appearSpeed) < 1e-9
    ) {
      return id;
    }
  }
  return "custom";
}

// Make the three values match p.appearMode: a preset sets all three,
// instant sets the sequence (the effect and speed are inert), random rolls
// them, custom leaves them.
export function applyAppearMode(
  p: AppearParams,
  rand: () => number = Math.random
): void {
  const mode = p.appearMode;
  if (mode === "custom") return;
  if (mode === "instant") {
    p.appearSequence = "instant";
    return;
  }
  if (mode === "random") {
    const pick = <T>(options: readonly T[]): T =>
      options[Math.min(options.length - 1, Math.floor(rand() * options.length))];
    p.appearSequence = pick(APPEAR_SEQUENCES.filter((s) => s !== "instant"));
    p.appearFx = pick(APPEAR_FX_MODES.filter((f) => f !== "none"));
    const speed =
      RANDOM_SPEED_MIN + rand() * (RANDOM_SPEED_MAX - RANDOM_SPEED_MIN);
    p.appearSpeed = Math.round(speed * 20) / 20;
    return;
  }
  const v = APPEAR_PRESETS[mode];
  p.appearSequence = v.sequence;
  p.appearFx = v.fx;
  p.appearSpeed = v.speed;
}

export interface UrlParams {
  seed: number;
  gridSize: number;
  // Lattice silhouette: rect (full lattice) or a sculpted mask shape.
  shape: ShapeId;
  // Maze entrance/exit anchors: which boundary region of the shape hosts
  // each cut (compass points; mazeFabric only).
  startAnchor: AnchorId;
  exitAnchor: AnchorId;
  weaveDensity: number;
  turnBias: number;
  slack: number; // [0, 1] rest-state looseness (physics, applies live).
  simSpeed: number; // [0, 10] simulation speed: 0 paused, 5 normal, 10 = 5x.
  drag: number; // [0, 1] wave damping (physics, applies live).
  repulsion: number; // Repulsion distance multiplier (applies live).
  bend: number; // Bending stiffness multiplier (applies live).
  smooth: number; // [0, 1] Laplacian fairing (applies live).
  stiffness: number; // Structural spring multiplier (applies live).
  // [0, 1] pull toward the original lattice positions (applies live).
  gridAlign: number;
  threadWidth: number; // Ribbon width in lattice units (applies live).
  gap: number; // Space between an under-thread cut end and the over thread.
  moveSpeed: number; // [0.25, 4] maze traversal-animation speed multiplier.
  cuspRadius: number; // [0, 6] junction cusp-rounding (fillet) radius mult.
  fadeLength: number; // [0, 1.2] under-thread fade-out length at crossings.
  flowStrength: number; // [0, 1] flow-undulation amplitude (render-only).
  flowSpeed: number; // [0, 3] flow-undulation drift speed multiplier.
  tugLimit: number; // [0.5, 6] max tug excursion, in thread widths.
  snapBack: number; // [0, 12] post-release return rate (1/s); 0 = off.
  soundMode: SoundMode; // none | manual | random | music.
  pitchSpace: PitchSpace; // Scale for segment pitches.
  octaves: number; // [1, 4] octave span of the pitch space.
  soundSpeed: number; // [0.25, 6] music tempo / random-pluck cadence mult.
  volume: number; // [0, 1] master output gain.
  reverb: number; // [0, 1] hall wet mix.
  brightness: number; // [0, 1] string brightness (loop damping). 0.5 = stock.
  sustain: number; // [0, 1] ring length (T60 scale). 0.5 = stock.
  shimmer: number; // [0, 1] course detune (x3 cents). 0.4 = stock.
  pickPosition: number; // [0, 1] pluck point along the string. 0.4 = stock.
  rootNote: RootNote; // Scale root for manual/random modes; "seed" = auto.
  // [0, 1] tonal gravity of the segment pitch buckets (manual/random):
  // the tonic/dominant/mediant buckets widen up to 3x/2x/1.5x at 1.
  tonicEmphasis: number;
  pulseSpacing: number; // [0.8, 6] world units between traversal pulses.
  // [0.5, 15] lattice units of thread, measured from the current junction,
  // that its traveling pulses reach along each arm before fading out (K75;
  // the trains used to run whole arms). Live.
  pulseReach: number;
  hueShift: number; // [0, 360) rotation added to the seed's base hue.
  gamutArc: number; // [40, 360] hue-arc width of the color gamut.
  palette: GamutPalette; // Saturation/lightness preset for the gamut.
  pathColor: string; // "#rrggbb" traversal-highlight (gold) color.
  branchDensity: number; // [0, 1] extra maze junctions beyond the backbone.
  fourWayFraction: number; // [0, 1] share of junctions as 4-way merges.
  deadEndDensity: number; // [0.05, 1] strands cut into dead ends (de on).
  // K74: [0, 40] doubled-lattice units of junction-free tail each dead end
  // is given (core/maze_plan.ts deadEndLength); 0 = the older spread
  // placement, whose tails are often a few units long.
  deadEndLength: number;
  // K74 stage 2, H1: [0, 1] share of splice H's whose junction moves to a
  // crossing (core/maze_plan.ts hCutShare); 0 = off.
  hCutShare: number;
  pluckStyle: PluckStyle; // Drag-release feel: soft ease vs ringing string.
  // RETIRED with the render-only plucks (2026-10-11): the old render ring's
  // frequency/decay scale - the time-exposure vibration has no visible
  // frequency, and its decay follows the sound's sustain. Nothing reads it;
  // it stays only because the codec table lists it (dropping a param is a
  // codec version bump).
  snappiness: number;
  // RENDER-ONLY PLUCKS (taps, auto plucks, string releases): visual swing
  // multiplier [0, 2] (0 = sound only), strobe-ghost strength [0, 1] (the
  // speed cue; 0 = pure time-exposure blur), and what vibrates. Live.
  pluckSize: number;
  pluckGhost: number;
  pluckReach: PluckReach;
  // Physics simulation on (default). Off: each build settles hidden behind
  // a loading indicator, then the layout freezes (no stepping at all) -
  // threads can be plucked but not tugged. Applies live.
  physics: boolean;
  // P4 branching maze: generate the spliced maze FABRIC (junctions, 4-way
  // merges, corner entrance/exit) and play it (branch-point taps).
  mazeFabric: boolean;
  // Dead-end threads in the fabric (wrong turns that end in a tip). ON by
  // default since K74 (off = a pure braided maze where every wrong turn
  // loops back).
  deadEnds: boolean;
  // Traversal-path visualization (fabric gameplay). gold = the classic
  // full recolor. trail = memory mode: no backtracking concept, only a
  // short gold trail of recent path behind the head. string = Ariadne's
  // thread: a thin wavy white yarn unspools along everywhere you walk,
  // U-turning at junctions on backtracks, never erased. Gameplay
  // interpretation + paint only; applies live (no rebuild).
  pathViz: PathViz;
  // Camera framing (see CAMERA_MODES). Pinch/wheel/drag still zoom and
  // pan in both; in follow mode a delayed, eased spring pulls back.
  cameraMode: CameraMode;
  // [1, 30] lattice units of recent path kept lit in memory-trail mode
  // (the panel's recentPath).
  trailLength: number;
  // [0, 1] Ariadne string tension: 1 = taut along the centerline, 0 =
  // slack cotton laid loose. Applies live to the whole laid string.
  tension: number;
  // Exploration (fabric gameplay; K76 stage 2c, the fogOfWar flag before
  // it): off, fog (the maze hides under fog until you have been close by;
  // explored areas stay visible) or threads (the thread reveal). Live.
  exploration: Exploration;
  fowRadius: number; // [1.5, 10] visibility radius, lattice units.
  // With fog or threads: still play the intro appearance animation in the
  // open, then close the fog in (fade + contracting reveal radius) or
  // close the thread reveal in (a front contracting onto what was seen,
  // never a dissolve). Live.
  fowIntro: boolean;
  // The thread reveal (exploration "threads", K76): how far the arms of
  // the junctions you have reached show ([REVEAL_DISTANCE_MIN,
  // REVEAL_DISTANCE_MAX] lattice units), how long their fade-out is
  // ([REVEAL_FADE_MIN, REVEAL_FADE_MAX]) and how a fade ends. Live.
  revealDistance: number;
  revealFade: number;
  revealLook: RevealLook;
  // K465 (Levi, 2026-10-15: "we should show where the destination marker
  // is, by default"): under the thread reveal the finish (the exit marker,
  // its gap slot and its off-screen indicator) shows from the start instead
  // of waiting until the exit has been seen (K76's decision 6, which off
  // keeps). Live; only the thread reveal reads it.
  revealFinish: boolean;
  // K466 (Levi, 2026-10-15: "emphasize the unexplored thread ends a bit
  // more, maybe especially for ends that lie under a crossing"): where a
  // frontier's fade goes when it would lie under a crossing, and how
  // strong the end's halo is. Live; only the thread reveal reads them.
  revealEndCross: RevealEndCross;
  revealEndGlow: RevealEndGlow;
  // Section color scheme (fabric mode; knot mode supports mono/strands):
  // mono | strands | depth | segments | noise.
  colorScheme: ColorScheme;
  // [0, 6] lattice units: how far a junction's blended color bleeds into
  // the sections meeting there, beyond the short built-in blend (segments +
  // strands schemes). 0 = the blend stays inside the junction; a section
  // shorter than twice this is one gradient between its junctions. Live.
  junctionBlend: number;
  // Appearance animation (how the design draws itself in on build): the
  // MODE sets the three params below together (see APPEAR_MODES).
  appearMode: AppearMode;
  // How the reveal travels: instant (default - today's pop-in,
  // byte-identical) | trace | bloom | draw | ink. trace/bloom need the walk
  // graph and fall back to draw in knot mode. (URL key ap=, from before
  // the rename from appearMode.)
  appearSequence: AppearSequence;
  appearSpeed: number; // [0.3, 4] reveal frontier speed multiplier.
  // Frontier particle effect while the appearance animation runs: none |
  // rainbow (6-stripe rainbow on the fresh thread + saturated sparks) |
  // comet (blue-green streaked head) | dust (twinkling motes) | burn |
  // roots. Inert when appearSequence is instant; applies live.
  appearFx: AppearFxMode;
  // The last maze-plan knobs (core/maze_plan.ts MazeParams), serialized
  // since 2026-10-12 so every maze is reproducible from its link. All in
  // doubled-lattice units (the plan's coordinates): junction-free radii
  // around the entrance / exit anchors, and the minimum distance between
  // junction sites. Regenerate the maze.
  entranceClearance: number;
  exitClearance: number;
  junctionSpacing: number;
  // SHADER BACKGROUND (K21, render/background.ts): none (the flat page
  // color) or a slow, low-contrast noise effect in the design's colors,
  // drawn beneath the knot (crossing gaps show it). Applies live.
  background: BackgroundId;
  // [0, 1] the background's contrast: 0 = flat ink (the layer is off),
  // 1 = the effect's strongest designed look. Applies live.
  backgroundIntensity: number;
  // The background's animation speed (K79; render/background_model.ts):
  // -1 = AUTO, each effect's own pace (vellum static); 0 = static; else
  // [0, 8] x the effect's designed drift (BACKGROUND_SPEED_MAX). Applies live.
  backgroundSpeed: number;
  // The background's SHAPE (K79 stage B; BackgroundShape in
  // render/background_model.ts), all live: pattern size [0.5, 2] for every
  // effect (K129: it was 3), fbm roughness [0, 2] for mist, wash, silk and
  // contours (1 = as designed), vellum's fiber and grain strengths [0, 3],
  // silk's streak direction in degrees counterclockwise from screen right
  // (-1 = AUTO, the seed's).
  backgroundScale: number;
  backgroundDetail: number;
  backgroundFibers: number;
  backgroundGrain: number;
  backgroundAngle: number;
  // Background colors (K79 stage B): "gamut" = the design's own (the page
  // ink + three accents from its gamut), "custom" = backgroundBase (the
  // page color itself - also behind none and under the flat fog) plus
  // three accents ("#rrggbb"; accent 1 is the main one). Applies live.
  backgroundColorMode: BackgroundColorMode;
  backgroundBase: string;
  backgroundAccent1: string;
  backgroundAccent2: string;
  backgroundAccent3: string;
  // THE LOAD SETTLE (K147, main.ts). settleBudget: [0, SETTLE_BUDGET_MAX]
  // wall ms of physics a frame may spend from the intro's start until the
  // first sleep; the rest of the settle plays in slow motion instead of
  // dropping the frame rate (0 = off: every frame steps all the time it
  // asks for, today's stepping). loadSettle: [0, LOAD_SETTLE_MAX] seconds
  // of physics the page runs before the knot appears (0 = none; the max =
  // until the knot sleeps). Both apply at the next load or Replay settle.
  settleBudget: number;
  loadSettle: number;
  // K7: the physics runs in a module worker (physics/worker_host.ts; falls
  // back to the main thread when it cannot). On by default since stage 6
  // (call F6); `&phw=0` runs it on the main thread. Read once at page start,
  // so a change takes effect on reload. Link-only, no panel row.
  physicsWorker: boolean;
  // THE MAZE CLOCK (K80): turn = the turn-based maze; realtime = the
  // real-time minotaur mode (game/minotaur.ts): the player runs at
  // playerPace with no undo, and a minotaur that starts at the finish roams
  // the threads, hunts the player from within minoDetect (arc length along
  // the threads) until they are beyond minoLose, and a catch (within
  // minoCatch) sends the player back to the entrance. Restarts the solve.
  clock: ClockMode;
  // The chase's tuning (chaseParamsOf; lattice units, u/s, seconds). Each
  // applies live. The minotaur's paces are fractions of playerPace (K174:
  // 0.7 = 0.7 x the player's pace).
  playerPace: number;
  minoWanderPace: number;
  minoHuntPace: number;
  minoPaceJitter: number;
  minoPauseChance: number;
  minoPauseMin: number;
  minoPauseMax: number;
  minoDetect: number;
  minoLose: number;
  minoCatch: number;
  minoDeadEnds: number;
  minoRoam: number;
  minoWake: number;
  // How the minotaur shows under the fog of war (MINO_FOG_MODES).
  minoFog: MinoFog;
  // K174: the minotaur roams toward the player (DEFAULT_CHASE_PARAMS
  // .roamPull; off = K80's roam), and a catch returns the fog of war to
  // the solve's start (off = explored fog stays, K100).
  minoToward: boolean;
  minoRefog: boolean;
  // K140's finish confetti: on/off, and the amount in [0,
  // CONFETTI_AMOUNT_MAX] (1 = the designed burst). Viewer preferences.
  confetti: boolean;
  confettiAmount: number;
  // K180's pluck params (render/pluck_model.ts PLUCK PARAMS): W's amount in
  // [0, PLUCK_WHOLE_MAX] (0 = the pre-K104 pluck), how W meets the unit's
  // crossings, and the glow. Viewer preferences.
  pluckWhole: number;
  pluckCrossings: PluckCrossings;
  pluckGlow: PluckGlow;
  // K279's pluck emphasis (render/pluck_model.ts K279 params): the ripple's
  // look and its player / auto strengths, the sheen, the tug (and whether
  // auto plucks tug), and auto plucks' volume. Viewer preferences.
  pluckRipple: PluckRipple;
  rippleStrength: number;
  rippleAuto: number;
  pluckSheen: number;
  pluckTug: number;
  tugAuto: boolean;
  autoPluckGain: number;
  // K98: the markers' diameter in thread widths (render/marker_glyphs.ts,
  // [MARKER_SIZE_MIN, MARKER_SIZE_MAX]): the player's dot, and the start,
  // the finish and the minotaur at the same size. A viewer preference.
  markerSize: number;
  // K145's hover glow: how strongly a run that is not a choice glows along
  // both rims under the pointer (or a touch press), in [0, 1]; 0 = off.
  // A viewer preference.
  hoverGlow: number;
  // K111 stage 4 (K264): how far in from each edge that glow reaches, in
  // half-widths ([HOVER_GLOW_WIDTH_MIN, HOVER_GLOW_WIDTH_MAX]; 1 = the two
  // rims meet in the middle). The shader reads it as a scale, uKGold.w =
  // kRimScale(width) = 0.85 / width (paint_math.ts). A viewer preference.
  hoverGlowWidth: number;
  // K298: the glow's own length (world arc from the hover point to where it
  // has faded out; pulseReach's until K298, after K219) and its fade-in past
  // each end gap, in world units ([HOVER_GLOW_LENGTH_MIN,
  // HOVER_GLOW_LENGTH_MAX] and [0, HOVER_GLOW_FADE_MAX]; RIM_END_FADE 0.75
  // until K298). Viewer preferences.
  hoverGlowLength: number;
  hoverGlowFade: number;
  // K298, the MOUSE's pick margins (a pen's too; touch keeps today's
  // radii, main.ts pickRadius): how far past a thread's edge a pointer
  // still picks it, in CSS px ([0, PICK_MARGIN_MAX]; hover, click, the
  // thread cursor, the grab), and a choice's margin as a multiple of it
  // ([PICK_CHOICE_RATIO_MIN, PICK_CHOICE_RATIO_MAX]). Viewer preferences.
  pickMargin: number;
  pickChoiceRatio: number;
  // K80 turns: the TURN-ALIGNED minotaur (game/minotaur_turns.ts), a
  // modifier of the turn clock (clk=realtime runs real time's own model and
  // ignores these): off | hunter | guard | stalker; the runs it takes a
  // turn; whether its next move shows. Its behavior, in runs and turns
  // (real time's knobs are in thread length and seconds): it hunts within
  // minoSight runs (gives up beyond sight + minoGiveUp), the hunter roams
  // minoRoamMin (or minoRoamRuns, if less) to minoRoamRuns runs, the guard
  // keeps within minoTerritory runs of the exit, a hunting step is a best
  // one with chance minoAccuracy, it stands still a turn with chance
  // minoPause, and sleeps minoSleep turns. minoSight and minoAccuracy are
  // the HUNTER's (and the stalker's charge reads minoSight); the guard has
  // its own sight and accuracy and the stalker its own accuracy (K294, K80
  // turns 3a: url_state turnMinoParamsOf picks them by model). With chance
  // minoTurnPull a roam destination is one nearer you (the hunter, the
  // guard). Applies live except `minotaur`, which restarts the solve.
  minotaur: TurnMinotaurSetting;
  minoSpeed: TurnSpeed;
  minoTelegraph: boolean;
  minoSight: number;
  minoRoamRuns: number;
  minoTerritory: number;
  minoAccuracy: number;
  minoPause: number;
  minoSleep: number;
  minoGiveUp: number;
  minoRoamMin: number;
  minoTurnPull: number;
  minoGuardSight: number;
  minoGuardAccuracy: number;
  minoStalkerAccuracy: number;
  // K114 burn race (game/fire.ts, brief docs/design/K114_burn.md): the
  // fire, off | fuse; on the turn clock its speed r (fire distance per unit
  // walked, in [FIRE_SPEED_MIN, FIRE_SPEED_MAX]) and its delay h (units
  // walked before it spreads, [0, FIRE_DELAY_MAX]); the real-time clock
  // has its own pair (fireSpeedRt, fireDelayRt; K440). It never plays on
  // K80's real-time chase (`clock`) nor with the turn minotaur
  // (fireSettingsOf); its own clock is fireClock (stage 2). Every change
  // restarts the solve.
  fire: FireMode;
  fireSpeed: number;
  fireDelay: number;
  // K290 (burn stage 3a): how burnt runs draw, gone | char (BURNT_MODES).
  // Live; the solve goes on.
  burnt: BurntMode;
  // K114 stage 2: the fire's clock, turn | realtime (FIRE_CLOCKS). Every
  // change restarts the solve.
  fireClock: FireClockMode;
  // K440: the real-time clock's own speed (a fraction of the dot's fixed
  // pace FIRE_V_REF, [FIRE_SPEED_MIN, FIRE_SPEED_MAX]) and delay (fire-clock
  // units, FIRE_V_REF a second, before it spreads: [0, FIRE_DELAY_MAX]).
  // Two params, not a default that depends on the clock: a link lists only
  // what differs from PARAM_DEFAULTS (K132), so `&fi=fuse&fck=realtime`
  // plays this pair's defaults and a turn link keeps the turn pair's.
  // Every change restarts the solve.
  fireSpeedRt: number;
  fireDelayRt: number;
  // K80 turns stage 2 (K273): what a minotaur's catch resets, on both
  // clocks. minoRestart on restarts the level (main.ts restartSolve: path,
  // fog, clock and minotaur; its tallies carry over). Off is the respawn:
  // you to the entrance, the minotaur to its lair under minoLair (off: it
  // stays where it caught you), the fog under minoRefog (above).
  minoRestart: boolean;
  minoLair: boolean;
}

// The turn minotaur's slider tops (url_state clamps; the panel's ranges).
// Roam and territory start at MINO_RUNS_MIN (K272: 0 stood still or
// walked at random), sight at 0 (it never hunts).
export const MINO_RUNS_MIN = 1;
export const MINO_SIGHT_MAX = 20;
export const MINO_ROAM_RUNS_MAX = 30;
export const MINO_TERRITORY_MAX = 20;
export const MINO_SLEEP_MAX = 99;
// K324 section 4.3's ranges: give up [0, 10] runs past sight, the nearest
// roam [MINO_RUNS_MIN, 10] runs.
export const MINO_GIVE_UP_MAX = 10;
export const MINO_ROAM_MIN_MAX = 10;

// The burn race's ranges (K114; url_state clamps, the panel's sliders),
// the same for both clocks' pairs. K440 lowered the speed's floor from 0.3
// to 0.1 (the real-time default is 0.2).
export const FIRE_SPEED_MIN = 0.1;
export const FIRE_SPEED_MAX = 0.95;
export const FIRE_DELAY_MAX = 40;

// The hover glow's width range (K111 stage 4; url_state clamps, the panel's
// slider). Above 0: the glow's scale divides by it (paint_math kRimScale).
export const HOVER_GLOW_WIDTH_MIN = 0.3;
export const HOVER_GLOW_WIDTH_MAX = 1;
// Its length's and end fade's (K298; world units). The length's is
// pulseReach's panel range.
export const HOVER_GLOW_LENGTH_MIN = 0.5;
export const HOVER_GLOW_LENGTH_MAX = 15;
export const HOVER_GLOW_FADE_MAX = 1.5;
// The mouse's pick margins (K298): CSS px past the edge, and the choices'
// multiple of it.
export const PICK_MARGIN_MAX = 20;
export const PICK_CHOICE_RATIO_MIN = 1;
export const PICK_CHOICE_RATIO_MAX = 4;

// The two load-settle sliders' tops (K147). LOAD_SETTLE_MAX is a sentinel
// as well: there the page waits for the first sleep (or main.ts's wall cap).
export const SETTLE_BUDGET_MAX = 30;
export const LOAD_SETTLE_MAX = 5;

// COMPLETE per-param defaults (everything but seed): the panel's per-row
// reset buttons + modified indicators, and the Reset-to-defaults button.
// The Omit type keeps it provably in sync with UrlParams. The user's chosen
// settings (2026-10-11).
// LINKS OMIT DEFAULTS, so a default edit changes what every link that
// leaves the param out means, and moves every daily (K132: accepted
// before launch). A new param must be appended to the codec's
// CODEC_PARAMS as well (param_codec.ts; a test fails until it is).
export const PARAM_DEFAULTS: Omit<UrlParams, "seed"> = {
  gridSize: 18,
  shape: "rect",
  startAnchor: "nw",
  exitAnchor: "se",
  weaveDensity: 0.35,
  turnBias: 0.7,
  slack: 0.55,
  simSpeed: 5,
  drag: 0.5,
  repulsion: 1.45,
  bend: 2,
  smooth: 0.75,
  stiffness: 1,
  gridAlign: 0.1,
  threadWidth: 0.52,
  gap: 0.04,
  moveSpeed: 1,
  cuspRadius: 3,
  fadeLength: 0.14,
  flowStrength: 0.3,
  flowSpeed: 0.5,
  tugLimit: 2,
  snapBack: 4,
  soundMode: "music",
  pitchSpace: "chromatic",
  octaves: 3,
  soundSpeed: 1,
  volume: 0.33,
  reverb: 0.42,
  brightness: 0.5,
  sustain: 0.5,
  shimmer: 0.4,
  pickPosition: 0.4,
  snappiness: 0.88, // Retired (see UrlParams).
  rootNote: "seed",
  tonicEmphasis: 0.5,
  pulseSpacing: 2.5,
  pulseReach: 3, // K75.
  hueShift: 300,
  gamutArc: 130,
  palette: "pastel",
  pathColor: "#eccc41",
  branchDensity: 0.35,
  fourWayFraction: 0.12,
  deadEndDensity: 0.5, // K74 (was 0.25).
  deadEndLength: 20, // K74.
  hCutShare: 1, // K74 stage 2 (H1): every H.
  pluckStyle: "string",
  pluckSize: 2, // K279 (was 1.75 from 2026-10-11, 1 before).
  pluckGhost: 0.5, // K279 (was 0.35).
  pluckReach: "run",
  physics: true,
  mazeFabric: true,
  deadEnds: true, // K74 (was off).
  pathViz: "gold",
  cameraMode: "fit",
  trailLength: 10, // K73 (was 5).
  tension: 0.45,
  exploration: "off",
  fowRadius: 4,
  fowIntro: false,
  colorScheme: "segments",
  junctionBlend: 0.88, // Was 0 until 2026-10-11.
  // trace + burn at 2.2 matches no preset.
  appearMode: "custom",
  appearSequence: "trace",
  appearSpeed: 2.2,
  appearFx: "burn",
  // = DEFAULT_MAZE_PARAMS (core/maze_plan.ts). exitClearance was 5 until
  // K74.
  entranceClearance: 2.5,
  exitClearance: 12,
  junctionSpacing: 2,
  // K21: the subtlest backdrop - static, keeps the page's ink on average.
  background: "vellum",
  backgroundIntensity: 0.5,
  // K79: auto - every effect's pre-K79 pace.
  backgroundSpeed: BACKGROUND_SPEED_AUTO,
  // K79 stage B: the designed pattern and the design's gamut colors - the
  // look every earlier link had. The custom colors start as the page ink
  // and the default design's accents.
  backgroundScale: 1,
  backgroundDetail: 1,
  backgroundFibers: 1,
  backgroundGrain: 1,
  backgroundAngle: BACKGROUND_ANGLE_AUTO,
  backgroundColorMode: "gamut",
  backgroundBase: "#151b28",
  backgroundAccent1: "#7ab8cd",
  backgroundAccent2: "#cdb17a",
  backgroundAccent3: "#aa7acd",
  // K147: see the LOAD SETTLE comment in main.ts.
  settleBudget: 12,
  loadSettle: 0.45,
  physicsWorker: true, // K7 stage 6 (call F6): on; `&phw=0` runs in-thread.
  // K80: the turn-based maze. The chase's tuning is the simulation-picked
  // DEFAULT_CHASE_PARAMS (game/minotaur.ts); K174 made the minotaur's
  // paces fractions of the player's.
  clock: "turn",
  playerPace: DEFAULT_CHASE_PARAMS.playerPace,
  minoWanderPace: WANDER_PACE_FRACTION,
  minoHuntPace: HUNT_PACE_FRACTION,
  minoPaceJitter: DEFAULT_CHASE_PARAMS.paceJitter,
  minoPauseChance: DEFAULT_CHASE_PARAMS.pauseChance,
  minoPauseMin: DEFAULT_CHASE_PARAMS.pauseMin,
  minoPauseMax: DEFAULT_CHASE_PARAMS.pauseMax,
  minoDetect: DEFAULT_CHASE_PARAMS.detectStart,
  minoLose: DEFAULT_CHASE_PARAMS.detectEnd,
  minoCatch: DEFAULT_CHASE_PARAMS.catchDist,
  minoDeadEnds: DEFAULT_CHASE_PARAMS.deadEndBias,
  minoRoam: DEFAULT_CHASE_PARAMS.roamRange,
  minoWake: DEFAULT_CHASE_PARAMS.wake,
  minoFog: "always",
  minoToward: true,
  minoRefog: true,
  confetti: true,
  confettiAmount: 1,
  pluckWhole: 0.75, // K279 (was 0.5, K104's WHOLE_AMP).
  pluckCrossings: "through",
  pluckGlow: "off",
  // K279 stage 2 (Levi's K288 pick; stage 1 had wave). Neutral: off.
  pluckRipple: "glint",
  rippleStrength: 1,
  rippleAuto: 0.35,
  pluckSheen: 0.5, // Neutral: 0.
  // 0 since the K279 wake probe (docs/design/K279.md, "Wake follow-up"): a
  // tug wakes the solver, and awake physics runs at 7-9 fps at default
  // sizes on the desktop (3-4 in a dense maze), so a tap would drop the
  // frame rate for ~2.6 sim-s.
  // The panel and `&ptg=` still reach it (stage 1 had 0.3).
  pluckTug: 0,
  tugAuto: false,
  autoPluckGain: 0.5, // -6 dB; neutral: 1.
  markerSize: MARKER_SIZE_DEFAULT,
  hoverGlow: 0.4,
  hoverGlowWidth: PAINT_CONST.RIM_EDGE, // 0.85 (K111 stage 3's width)
  hoverGlowLength: 3, // K298: pulseReach's default, the length it had
  hoverGlowFade: 0.2, // K298: was RIM_END_FADE 0.75 (the fade sheet)
  // K298: the mouse picked 0.7 world from the centerline (9.6 CSS px past
  // the edge at 1400x900) and a choice 0.9 (14 px, 1.45x as far past the
  // edge); now 4 px, and a choice 1.5x that (6 px).
  pickMargin: 4,
  pickChoiceRatio: 1.5,
  minotaur: DEFAULT_TURN_MINO.model,
  minoSpeed: DEFAULT_TURN_MINO.speed,
  minoTelegraph: DEFAULT_TURN_MINO.telegraph,
  minoSight: DEFAULT_TURN_MINO.sight,
  minoRoamRuns: DEFAULT_TURN_MINO.roam,
  minoTerritory: DEFAULT_TURN_MINO.territory,
  minoAccuracy: DEFAULT_TURN_MINO.accuracy,
  minoPause: DEFAULT_TURN_MINO.pause,
  minoSleep: DEFAULT_TURN_MINO.sleep,
  minoGiveUp: DEFAULT_TURN_MINO.giveUp,
  minoRoamMin: DEFAULT_TURN_MINO.roamMin,
  minoTurnPull: DEFAULT_TURN_MINO.pull,
  minoGuardSight: TURN_MODEL_DEFAULTS.guard.sight,
  minoGuardAccuracy: TURN_MODEL_DEFAULTS.guard.accuracy,
  minoStalkerAccuracy: TURN_MODEL_DEFAULTS.stalker.accuracy,
  // K114: off; the brief's speed and delay. R.6.1 measured them hot (one
  // wrong branch in ten traps 38% of careful players); r 0.6 or a delay of
  // 10-20 is Levi's call (the brief's stage 1 handoff).
  fire: "off",
  fireSpeed: 0.75,
  fireDelay: 0,
  // K273: today's respawn (the level goes on, the minotaur to its lair).
  minoRestart: false,
  minoLair: DEFAULT_TURN_MINO.lair,
  // K76 stage 2c: the thread reveal (the design's section 4 defaults).
  revealDistance: 2.5,
  revealFade: 1,
  revealLook: "beacon",
  // K290: burnt runs are gone (the brief's "burnt runs are gone").
  burnt: "gone",
  // K114 stage 2: the turn clock (stage 1's fire).
  fireClock: "turn",
  // K440 (Levi, 2026-10-15: "yes and yes"; docs/design/K440.md): the
  // real-time fire's own pair, stage 2's proposal (docs/design/
  // K114_stage2.md, the Stage 2 handoff's item 7): a 20 / 12 = 1.7 s head
  // start, and on every test daily the best route allows at least 1.1 s of
  // thinking a decision. The turn pair keeps 0.75 / 0.
  fireSpeedRt: 0.2,
  fireDelayRt: 20,
  // K465: the finish shows under the thread reveal (Levi, 2026-10-15).
  revealFinish: true,
  // K466: ends move out from under crossings, and their halos are bright.
  revealEndCross: "past",
  revealEndGlow: "bright",
};

// The burn race a design plays (K114), or null without one. Never on K80's
// real-time minotaur clock (`clock`) nor with the turn-aligned minotaur
// (call 3: one antagonist at a time; the panel switches the other off,
// and a link that sets both plays the minotaur). `clock` is the fire's own
// clock (fireClock, stage 2), and the speed and delay are that clock's
// pair (K440: fireSpeed / fireDelay on turn, fireSpeedRt / fireDelayRt on
// realtime).
export function fireSettingsOf(
  p: Omit<UrlParams, "seed">
): { speed: number; delay: number; clock: FireClockMode } | null {
  if (p.fire !== "fuse" || p.clock === "realtime" || p.minotaur !== "off") {
    return null;
  }
  if (p.fireClock === "realtime") {
    return {
      speed: clampFireSpeed(p.fireSpeedRt, PARAM_DEFAULTS.fireSpeedRt),
      delay: clampTo(p.fireDelayRt, FIRE_DELAY_MAX),
      clock: "realtime",
    };
  }
  return {
    speed: clampFireSpeed(p.fireSpeed),
    delay: clampTo(p.fireDelay, FIRE_DELAY_MAX),
    clock: "turn",
  };
}

// [HOVER_GLOW_WIDTH_MIN, HOVER_GLOW_WIDTH_MAX]; garbage reads as the default.
export function clampHoverGlowWidth(v: number): number {
  if (!Number.isFinite(v)) return PARAM_DEFAULTS.hoverGlowWidth;
  return Math.min(HOVER_GLOW_WIDTH_MAX, Math.max(HOVER_GLOW_WIDTH_MIN, v));
}

// K298: [HOVER_GLOW_LENGTH_MIN, HOVER_GLOW_LENGTH_MAX] and [0,
// HOVER_GLOW_FADE_MAX]; garbage reads as the default.
export function clampHoverGlowLength(v: number): number {
  if (!Number.isFinite(v)) return PARAM_DEFAULTS.hoverGlowLength;
  return Math.min(HOVER_GLOW_LENGTH_MAX, Math.max(HOVER_GLOW_LENGTH_MIN, v));
}
export function clampHoverGlowFade(v: number): number {
  if (!Number.isFinite(v)) return PARAM_DEFAULTS.hoverGlowFade;
  return Math.min(HOVER_GLOW_FADE_MAX, Math.max(0, v));
}
// K298: [0, PICK_MARGIN_MAX] and [PICK_CHOICE_RATIO_MIN,
// PICK_CHOICE_RATIO_MAX]; garbage reads as the default.
export function clampPickMargin(v: number): number {
  if (!Number.isFinite(v)) return PARAM_DEFAULTS.pickMargin;
  return Math.min(PICK_MARGIN_MAX, Math.max(0, v));
}
export function clampPickChoiceRatio(v: number): number {
  if (!Number.isFinite(v)) return PARAM_DEFAULTS.pickChoiceRatio;
  return Math.min(PICK_CHOICE_RATIO_MAX, Math.max(PICK_CHOICE_RATIO_MIN, v));
}
// K76 stage 2c: [REVEAL_DISTANCE_MIN, REVEAL_DISTANCE_MAX] and
// [REVEAL_FADE_MIN, REVEAL_FADE_MAX]; garbage reads as the default.
export function clampRevealDistance(v: number): number {
  if (!Number.isFinite(v)) return PARAM_DEFAULTS.revealDistance;
  return Math.min(REVEAL_DISTANCE_MAX, Math.max(REVEAL_DISTANCE_MIN, v));
}
export function clampRevealFade(v: number): number {
  if (!Number.isFinite(v)) return PARAM_DEFAULTS.revealFade;
  return Math.min(REVEAL_FADE_MAX, Math.max(REVEAL_FADE_MIN, v));
}

// [FIRE_SPEED_MIN, FIRE_SPEED_MAX]; garbage reads as the pair's default
// (the turn pair's unless told otherwise; K440's real-time pair passes its
// own).
function clampFireSpeed(v: number, fallback: number = PARAM_DEFAULTS.fireSpeed): number {
  if (!Number.isFinite(v)) return fallback;
  return Math.min(FIRE_SPEED_MAX, Math.max(FIRE_SPEED_MIN, v));
}

// The turn-aligned minotaur's settings from a design's params (K80 turns).
// K294 (K80 turns 3a): sight and accuracy are the model's own rows; the
// stalker's charge reads the shared (the hunter's) sight.
export function turnMinoParamsOf(p: Omit<UrlParams, "seed">): TurnMinoParams {
  const guard = p.minotaur === "guard";
  const accuracy = guard
    ? p.minoGuardAccuracy
    : p.minotaur === "stalker"
      ? p.minoStalkerAccuracy
      : p.minoAccuracy;
  return {
    model: p.minotaur,
    speed: p.minoSpeed,
    telegraph: p.minoTelegraph,
    sight: clampTo(guard ? p.minoGuardSight : p.minoSight, MINO_SIGHT_MAX),
    giveUp: clampTo(p.minoGiveUp, MINO_GIVE_UP_MAX),
    roam: clampRuns(p.minoRoamRuns, MINO_ROAM_RUNS_MAX),
    roamMin: clampRuns(p.minoRoamMin, MINO_ROAM_MIN_MAX),
    territory: clampRuns(p.minoTerritory, MINO_TERRITORY_MAX),
    accuracy: clampTo(accuracy, 1),
    pause: clampTo(p.minoPause, 1),
    sleep: clampTo(p.minoSleep, MINO_SLEEP_MAX),
    pull: clampTo(p.minoTurnPull, 1),
    lair: p.minoLair,
  };
}

// The real-time chase's tuning from a design's params (K80). Negative or
// non-finite values read as 0; the chase keeps detectEnd >= detectStart
// and pauseMax >= pauseMin itself. The minotaur's paces are fractions of
// the player's (K174), taken here, so the chase stays in u/s.
export function chaseParamsOf(
  p: Omit<UrlParams, "seed">
): ChaseParams {
  const pos = (v: number): number => (Number.isFinite(v) && v > 0 ? v : 0);
  return {
    playerPace: pos(p.playerPace),
    wanderPace: pos(p.minoWanderPace) * pos(p.playerPace),
    approachPace: pos(p.minoHuntPace) * pos(p.playerPace),
    paceJitter: Math.min(0.5, pos(p.minoPaceJitter)),
    pauseChance: clamp01(pos(p.minoPauseChance)),
    pauseMin: pos(p.minoPauseMin),
    pauseMax: pos(p.minoPauseMax),
    detectStart: pos(p.minoDetect),
    detectEnd: pos(p.minoLose),
    catchDist: pos(p.minoCatch),
    deadEndBias: clamp01(pos(p.minoDeadEnds)),
    roamRange: pos(p.minoRoam),
    wake: pos(p.minoWake),
    roamPull: p.minoToward ? DEFAULT_CHASE_PARAMS.roamPull : 0,
    lair: p.minoLair,
  };
}

export function newSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}

// A seed as players see it: the link's base-36 token (?<seed>...).
export function seedText(seed: number): string {
  return (seed >>> 0).toString(36);
}

// A typed seed (the panel's seed row): a base-36 token reads exactly as a
// link would (case-insensitive), and any other text - a word too long to
// be a token, a phrase, punctuation - hashes (FNV-1a) to a seed, so typing
// a word gives "that word's" maze. Blank text is no seed (null).
export function seedFromText(text: string): number | null {
  const t = text.trim().toLowerCase();
  if (t === "") return null;
  if (/^[0-9a-z]{1,7}$/.test(t)) return Number.parseInt(t, 36) >>> 0;
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) {
    h = Math.imul(h ^ t.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h;
}

// The option list of every enum param: what this build accepts from any
// link (anything else reads as the default) - and, in the tests, what the
// codec's lists must equal.
export const ENUM_OPTIONS: {
  readonly [K in keyof typeof PARAM_DEFAULTS]?: readonly string[];
} = {
  shape: SHAPES,
  startAnchor: ANCHORS,
  exitAnchor: ANCHORS,
  soundMode: SOUND_MODES,
  pitchSpace: PITCH_SPACES,
  rootNote: ROOT_NOTES,
  palette: GAMUT_PALETTES,
  pluckStyle: PLUCK_STYLES,
  pluckReach: PLUCK_REACHES,
  pathViz: PATH_VIZ_MODES,
  cameraMode: CAMERA_MODES,
  colorScheme: COLOR_SCHEMES,
  appearMode: APPEAR_MODES,
  appearSequence: APPEAR_SEQUENCES,
  appearFx: APPEAR_FX_MODES,
  background: BACKGROUNDS,
  backgroundColorMode: BACKGROUND_COLOR_MODES,
  clock: CLOCK_MODES,
  minoFog: MINO_FOG_MODES,
  pluckCrossings: PLUCK_CROSSINGS,
  pluckGlow: PLUCK_GLOWS,
  pluckRipple: PLUCK_RIPPLES,
  minotaur: MINOTAUR_SETTINGS,
  minoSpeed: TURN_SPEEDS,
  fire: FIRE_MODES,
  exploration: EXPLORATION_MODES,
  revealLook: REVEAL_LOOKS,
  burnt: BURNT_MODES,
  fireClock: FIRE_CLOCKS,
  revealEndCross: REVEAL_END_CROSSES,
  revealEndGlow: REVEAL_END_GLOWS,
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

// A decoded token's values as app params. A value this build cannot use
// (wrong type, an option it no longer has) reads as the default; the clamps
// match the key=value reader's.
function fromCodecValues(
  values: Readonly<Record<string, ParamValue>>
): Omit<UrlParams, "seed"> {
  const out: Record<string, ParamValue> = { ...PARAM_DEFAULTS };
  for (const name of Object.keys(PARAM_DEFAULTS)) {
    if (!Object.hasOwn(values, name)) continue;
    const value = values[name];
    if (typeof value !== typeof out[name]) continue;
    const options = ENUM_OPTIONS[name as keyof typeof PARAM_DEFAULTS];
    if (options && !options.includes(value as string)) continue;
    out[name] = value;
  }
  const p = out as unknown as Omit<UrlParams, "seed">;
  p.gridAlign = clamp01(p.gridAlign);
  p.junctionBlend = Math.max(0, p.junctionBlend);
  p.backgroundIntensity = clamp01(p.backgroundIntensity);
  p.backgroundSpeed = sanitizeBackgroundSpeed(p.backgroundSpeed);
  p.backgroundScale = sanitizeBackgroundScale(p.backgroundScale);
  p.backgroundDetail = sanitizeBackgroundDetail(p.backgroundDetail);
  p.backgroundFibers = sanitizeBackgroundTexture(p.backgroundFibers);
  p.backgroundGrain = sanitizeBackgroundTexture(p.backgroundGrain);
  p.backgroundAngle = sanitizeBackgroundAngle(p.backgroundAngle);
  p.settleBudget = clampTo(p.settleBudget, SETTLE_BUDGET_MAX);
  p.loadSettle = clampTo(p.loadSettle, LOAD_SETTLE_MAX);
  p.confettiAmount = clampTo(p.confettiAmount, CONFETTI_AMOUNT_MAX);
  p.pluckWhole = clampTo(p.pluckWhole, PLUCK_WHOLE_MAX);
  p.markerSize = sanitizeMarkerSize(p.markerSize);
  p.hoverGlow = clampTo(p.hoverGlow, 1);
  p.hoverGlowWidth = clampHoverGlowWidth(p.hoverGlowWidth);
  p.hoverGlowLength = clampHoverGlowLength(p.hoverGlowLength);
  p.hoverGlowFade = clampHoverGlowFade(p.hoverGlowFade);
  p.pickMargin = clampPickMargin(p.pickMargin);
  p.pickChoiceRatio = clampPickChoiceRatio(p.pickChoiceRatio);
  p.revealDistance = clampRevealDistance(p.revealDistance);
  p.revealFade = clampRevealFade(p.revealFade);
  clampTurnMino(p);
  p.hCutShare = clamp01(p.hCutShare);
  p.fireSpeed = clampFireSpeed(p.fireSpeed);
  p.fireDelay = clampTo(p.fireDelay, FIRE_DELAY_MAX);
  p.fireSpeedRt = clampFireSpeed(p.fireSpeedRt, PARAM_DEFAULTS.fireSpeedRt);
  p.fireDelayRt = clampTo(p.fireDelayRt, FIRE_DELAY_MAX);
  clampPluckEmphasis(p);
  return p;
}

// K279's pluck emphasis clamps, shared by both link readers.
function clampPluckEmphasis(p: Omit<UrlParams, "seed">): void {
  p.rippleStrength = clampTo(p.rippleStrength, RIPPLE_STRENGTH_MAX);
  p.rippleAuto = clampTo(p.rippleAuto, RIPPLE_STRENGTH_MAX);
  p.pluckSheen = clamp01(p.pluckSheen);
  p.pluckTug = clamp01(p.pluckTug);
  p.autoPluckGain = clamp01(p.autoPluckGain);
}

// The turn minotaur's clamps, shared by both link readers.
function clampTurnMino(p: Omit<UrlParams, "seed">): void {
  p.minoSight = clampTo(p.minoSight, MINO_SIGHT_MAX);
  p.minoRoamRuns = clampRuns(p.minoRoamRuns, MINO_ROAM_RUNS_MAX);
  p.minoTerritory = clampRuns(p.minoTerritory, MINO_TERRITORY_MAX);
  p.minoAccuracy = clampTo(p.minoAccuracy, 1);
  p.minoPause = clampTo(p.minoPause, 1);
  p.minoSleep = clampTo(p.minoSleep, MINO_SLEEP_MAX);
  p.minoGiveUp = clampTo(p.minoGiveUp, MINO_GIVE_UP_MAX);
  p.minoRoamMin = clampRuns(p.minoRoamMin, MINO_ROAM_MIN_MAX);
  p.minoTurnPull = clampTo(p.minoTurnPull, 1);
  p.minoGuardSight = clampTo(p.minoGuardSight, MINO_SIGHT_MAX);
  p.minoGuardAccuracy = clampTo(p.minoGuardAccuracy, 1);
  p.minoStalkerAccuracy = clampTo(p.minoStalkerAccuracy, 1);
}

// [0, max]; garbage reads 0.
function clampTo(v: number, max: number): number {
  return v > 0 ? Math.min(max, v) : 0;
}

// [MINO_RUNS_MIN, max] (K272); garbage reads MINO_RUNS_MIN.
function clampRuns(v: number, max: number): number {
  return Math.max(MINO_RUNS_MIN, clampTo(v, max));
}

// backgroundSpeed: any negative value (or garbage) is AUTO, anything else
// clamps to the slider's [0, BACKGROUND_SPEED_MAX].
function sanitizeBackgroundSpeed(v: number): number {
  return isAutoSpeed(v)
    ? BACKGROUND_SPEED_AUTO
    : Math.min(BACKGROUND_SPEED_MAX, v);
}

function readNumber(
  query: URLSearchParams,
  key: string,
  fallback: number
): number {
  const raw = query.get(key);
  if (raw === null) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function readBool(
  query: URLSearchParams,
  key: string,
  fallback: boolean
): boolean {
  const raw = query.get(key);
  if (raw === null) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value > 0.5 : fallback;
}

// The key=value seed: s= (base-36) or seed= (decimal); neither = a fresh
// random design.
function readSeed(query: URLSearchParams): number {
  const s = query.get("s");
  if (s && /^[0-9a-z]{1,7}$/.test(s)) return Number.parseInt(s, 36) >>> 0;
  return Math.floor(readNumber(query, "seed", newSeed())) >>> 0;
}

export function readParams(): UrlParams {
  return parseParams(window.location.search);
}

// Reads every link form, always against TODAY's defaults:
// - COMPACT: `?<seed>` / `?<seed>.<blob>` (param_codec.ts). key=value
//   pairs AFTER the token override it (probes: `?<token>&am=instant`);
//   unknown keys (fbclid, utm_*) are ignored.
// - KEY=VALUE: `?s=<base-36 seed>&<params>` or `?seed=<decimal>&...`; with
//   no seed (`?am=instant`), a fresh random design.
// Never throws: an unreadable token, or one of another codec version, keeps
// whatever seed it has and warns once.
export function parseParams(search: string): UrlParams {
  const query = search.startsWith("?") ? search.slice(1) : search;
  const amp = query.indexOf("&");
  // A query re-serialized through URLSearchParams gains a "=" after the
  // valueless token (new URL(link).searchParams.append(...) does that).
  const head = (amp < 0 ? query : query.slice(0, amp)).replace(/=$/, "");
  if (head === "" || head.includes("=")) {
    const legacy = new URLSearchParams(query);
    return { seed: readSeed(legacy), ...readLegacy(legacy, PARAM_DEFAULTS) };
  }
  const decoded = decodeToken(head, PARAM_DEFAULTS);
  if (decoded.error !== null) {
    console.warn(
      decoded.seed === null
        ? `KnotMaze: unreadable link "?${head}" (${decoded.error}); ` +
            "showing a new random design."
        : `KnotMaze: unreadable link settings (${decoded.error}); ` +
            "kept the seed, every setting is at its default."
    );
  }
  const seed = decoded.seed ?? newSeed();
  const values = fromCodecValues(decoded.values);
  // A preset (re)writes its three values; random re-rolls on every load.
  applyAppearMode(values);
  if (amp < 0) return { seed, ...values };
  const overrides = new URLSearchParams(query.slice(amp + 1));
  return { seed, ...readLegacy(overrides, values) };
}

// The key=value readers: each key the query lacks reads `base` (today's
// defaults for a key=value link; the decoded token for overrides after
// one). A param needs no key here - without one it simply reads base.
function readLegacy(
  query: URLSearchParams,
  base: Omit<UrlParams, "seed">
): Omit<UrlParams, "seed"> {
  const D = base;
  return {
    ...base,
    gridSize: readNumber(query, "gs", D.gridSize),
    shape: readChoice(query, "shp", SHAPES, D.shape),
    startAnchor: readChoice(query, "sa", ANCHORS, D.startAnchor),
    exitAnchor: readChoice(query, "xa", ANCHORS, D.exitAnchor),
    weaveDensity: readNumber(query, "wd", D.weaveDensity),
    turnBias: readNumber(query, "tb", D.turnBias),
    slack: readNumber(query, "sl", D.slack),
    simSpeed: readNumber(query, "sp", D.simSpeed),
    drag: readNumber(query, "dr", D.drag),
    repulsion: readNumber(query, "rep", D.repulsion),
    bend: readNumber(query, "bd", D.bend),
    smooth: readNumber(query, "sm", D.smooth),
    stiffness: readNumber(query, "st", D.stiffness),
    // Old checkbox URLs (ga=0 / ga=1) read as the same strengths.
    gridAlign: clamp01(readNumber(query, "ga", D.gridAlign)),
    threadWidth: readNumber(query, "tw", D.threadWidth),
    gap: readNumber(query, "gap", D.gap),
    moveSpeed: readNumber(query, "ms", D.moveSpeed),
    cuspRadius: readNumber(query, "cr", D.cuspRadius),
    fadeLength: readNumber(query, "fl", D.fadeLength),
    flowStrength: readNumber(query, "fw", D.flowStrength),
    flowSpeed: readNumber(query, "fv", D.flowSpeed),
    tugLimit: readNumber(query, "tl", D.tugLimit),
    snapBack: readNumber(query, "sb", D.snapBack),
    soundMode: readChoice(query, "snd", SOUND_MODES, D.soundMode),
    pitchSpace: readChoice(query, "sc", PITCH_SPACES, D.pitchSpace),
    octaves: readNumber(query, "oct", D.octaves),
    soundSpeed: readNumber(query, "ss", D.soundSpeed),
    volume: readNumber(query, "vol", D.volume),
    reverb: readNumber(query, "rv", D.reverb),
    brightness: readNumber(query, "brt", D.brightness),
    sustain: readNumber(query, "sus", D.sustain),
    shimmer: readNumber(query, "shm", D.shimmer),
    pickPosition: readNumber(query, "pp", D.pickPosition),
    snappiness: readNumber(query, "snpy", D.snappiness),
    rootNote: readChoice(query, "rn", ROOT_NOTES, D.rootNote),
    tonicEmphasis: readNumber(query, "tnc", D.tonicEmphasis),
    pulseSpacing: readNumber(query, "psp", D.pulseSpacing),
    hueShift: readNumber(query, "hs", D.hueShift),
    gamutArc: readNumber(query, "arc", D.gamutArc),
    palette: readChoice(query, "pal", GAMUT_PALETTES, D.palette),
    pathColor: readHexColor(query, "pc", D.pathColor),
    branchDensity: readNumber(query, "brd", D.branchDensity),
    fourWayFraction: readNumber(query, "fwf", D.fourWayFraction),
    deadEndDensity: readNumber(query, "ded", D.deadEndDensity),
    pluckStyle: readChoice(query, "pk", PLUCK_STYLES, D.pluckStyle),
    // Added after compact links (no legacy link carries them): keys only
    // so a token can take overrides - probe URLs write `&phy=0`.
    pluckSize: readNumber(query, "psz", D.pluckSize),
    pluckGhost: readNumber(query, "pgh", D.pluckGhost),
    pluckReach: readChoice(query, "prc", PLUCK_REACHES, D.pluckReach),
    physics: readBool(query, "phy", D.physics),
    mazeFabric: readBool(query, "mf", D.mazeFabric),
    deadEnds: readBool(query, "de", D.deadEnds),
    pathViz: readChoice(query, "pv", PATH_VIZ_MODES, D.pathViz),
    cameraMode: readChoice(query, "cam", CAMERA_MODES, D.cameraMode),
    trailLength: readNumber(query, "trl", D.trailLength),
    tension: readNumber(query, "tn", D.tension),
    // K76 stage 2c: `xp=off|fog|threads`; the old fog flag `fow=1` (or
    // `fow=0`) and `trv=1` (the thread reveal) still read.
    exploration: readExploration(query, D.exploration),
    fowRadius: readNumber(query, "fr", D.fowRadius),
    fowIntro: readBool(query, "fwi", D.fowIntro),
    colorScheme: readChoice(query, "cs", COLOR_SCHEMES, D.colorScheme),
    junctionBlend: Math.max(0, readNumber(query, "jbl", D.junctionBlend)),
    ...readAppearance(query, D),
    entranceClearance: readNumber(query, "ecl", D.entranceClearance),
    exitClearance: readNumber(query, "xcl", D.exitClearance),
    junctionSpacing: readNumber(query, "jsp", D.junctionSpacing),
    // Shader backgrounds (K21) postdate compact links: override keys only
    // (probe URLs write `&bg=mist&bgi=.7`).
    background: readChoice(query, "bg", BACKGROUNDS, D.background),
    backgroundIntensity: clamp01(
      readNumber(query, "bgi", D.backgroundIntensity)
    ),
    // The pulse reach (K75) too (probe URLs write `&pr=2`).
    pulseReach: readNumber(query, "pr", D.pulseReach),
    // And the background's animation speed (K79: `&bgs=2`; -1 = auto).
    backgroundSpeed: sanitizeBackgroundSpeed(
      readNumber(query, "bgs", D.backgroundSpeed)
    ),
    // And K74's dead-end length (&del=30; 0 = the spread placement).
    deadEndLength: readNumber(query, "del", D.deadEndLength),
    // And K74 stage 2's H1 share (&hcs=0.5; 0 = off).
    hCutShare: clamp01(readNumber(query, "hcs", D.hCutShare)),
    // Its shape and colors (K79 stage B: `&bgsz=2&bgan=90&bgcm=custom
    // &bgc0=101820&bgc1=ffcc66`; colors as pc= takes them, no "#").
    backgroundScale: sanitizeBackgroundScale(
      readNumber(query, "bgsz", D.backgroundScale)
    ),
    backgroundDetail: sanitizeBackgroundDetail(
      readNumber(query, "bgdt", D.backgroundDetail)
    ),
    backgroundFibers: sanitizeBackgroundTexture(
      readNumber(query, "bgfb", D.backgroundFibers)
    ),
    backgroundGrain: sanitizeBackgroundTexture(
      readNumber(query, "bggr", D.backgroundGrain)
    ),
    backgroundAngle: sanitizeBackgroundAngle(
      readNumber(query, "bgan", D.backgroundAngle)
    ),
    backgroundColorMode: readChoice(
      query,
      "bgcm",
      BACKGROUND_COLOR_MODES,
      D.backgroundColorMode
    ),
    backgroundBase: readHexColor(query, "bgc0", D.backgroundBase),
    backgroundAccent1: readHexColor(query, "bgc1", D.backgroundAccent1),
    backgroundAccent2: readHexColor(query, "bgc2", D.backgroundAccent2),
    backgroundAccent3: readHexColor(query, "bgc3", D.backgroundAccent3),
    // And K147's load settle (`&stb=0` = today's real-time stepping for
    // probes that time the sim; `&lds=5` = settle until the knot sleeps).
    settleBudget: clampTo(
      readNumber(query, "stb", D.settleBudget),
      SETTLE_BUDGET_MAX
    ),
    loadSettle: clampTo(readNumber(query, "lds", D.loadSettle), LOAD_SETTLE_MAX),
    // K7's physics worker (default on since stage 6; `&phw=0` = in-thread).
    physicsWorker: readBool(query, "phw", D.physicsWorker),
    // And K80's real-time mode (`&clk=realtime&mhp=0.9`).
    clock: readChoice(query, "clk", CLOCK_MODES, D.clock),
    playerPace: readNumber(query, "plp", D.playerPace),
    minoWanderPace: readNumber(query, "mwp", D.minoWanderPace),
    minoHuntPace: readNumber(query, "mhp", D.minoHuntPace),
    minoPaceJitter: readNumber(query, "mpj", D.minoPaceJitter),
    minoPauseChance: readNumber(query, "mpc", D.minoPauseChance),
    minoPauseMin: readNumber(query, "mpn", D.minoPauseMin),
    minoPauseMax: readNumber(query, "mpx", D.minoPauseMax),
    minoDetect: readNumber(query, "mdt", D.minoDetect),
    minoLose: readNumber(query, "mls", D.minoLose),
    minoCatch: readNumber(query, "mct", D.minoCatch),
    minoDeadEnds: readNumber(query, "mde", D.minoDeadEnds),
    minoRoam: readNumber(query, "mrm", D.minoRoam),
    minoWake: readNumber(query, "mwk", D.minoWake),
    minoFog: readChoice(query, "mfg", MINO_FOG_MODES, D.minoFog),
    // K174 (`&mtw=0&mrf=0`).
    minoToward: readBool(query, "mtw", D.minoToward),
    minoRefog: readBool(query, "mrf", D.minoRefog),
    // K140's finish confetti (`&cf=0`, `&cfa=2`).
    confetti: readBool(query, "cf", D.confetti),
    confettiAmount: clampTo(
      readNumber(query, "cfa", D.confettiAmount),
      CONFETTI_AMOUNT_MAX
    ),
    // K180's pluck params (`&pw=1&pcx=ride&pgl=fallback`).
    pluckWhole: clampTo(readNumber(query, "pw", D.pluckWhole), PLUCK_WHOLE_MAX),
    pluckCrossings: readChoice(query, "pcx", PLUCK_CROSSINGS, D.pluckCrossings),
    pluckGlow: readChoice(query, "pgl", PLUCK_GLOWS, D.pluckGlow),
    // K279's pluck emphasis (`&prp=ring&prs=1.5&pra=0&psh=1&ptg=0.5&pta=1
    // &pag=1`), clamped as a token's are.
    pluckRipple: readChoice(query, "prp", PLUCK_RIPPLES, D.pluckRipple),
    rippleStrength: clampTo(
      readNumber(query, "prs", D.rippleStrength),
      RIPPLE_STRENGTH_MAX
    ),
    rippleAuto: clampTo(readNumber(query, "pra", D.rippleAuto), RIPPLE_STRENGTH_MAX),
    pluckSheen: clamp01(readNumber(query, "psh", D.pluckSheen)),
    pluckTug: clamp01(readNumber(query, "ptg", D.pluckTug)),
    tugAuto: readBool(query, "pta", D.tugAuto),
    autoPluckGain: clamp01(readNumber(query, "pag", D.autoPluckGain)),
    // K98's marker size (`&mks=2`).
    markerSize: sanitizeMarkerSize(readNumber(query, "mks", D.markerSize)),
    // K145's hover glow (`&hg=0`), clamped to [0, 1].
    hoverGlow: clampTo(readNumber(query, "hg", D.hoverGlow), 1),
    // K111 stage 4's hover glow width (`&hgw=0.6`), clamped to [0.3, 1].
    hoverGlowWidth: clampHoverGlowWidth(readNumber(query, "hgw", D.hoverGlowWidth)),
    // K298's hover glow length and end fade (`&hgl=5&hgf=0.1`).
    hoverGlowLength: clampHoverGlowLength(readNumber(query, "hgl", D.hoverGlowLength)),
    hoverGlowFade: clampHoverGlowFade(readNumber(query, "hgf", D.hoverGlowFade)),
    // K298's mouse pick margins (`&pkm=2&pkr=3`).
    pickMargin: clampPickMargin(readNumber(query, "pkm", D.pickMargin)),
    pickChoiceRatio: clampPickChoiceRatio(readNumber(query, "pkr", D.pickChoiceRatio)),
    // K80 turns' turn-aligned minotaur (`&mt=hunter&msp=two&mtg=0`).
    minotaur: readChoice(query, "mt", MINOTAUR_SETTINGS, D.minotaur),
    minoSpeed: readChoice(query, "msp", TURN_SPEEDS, D.minoSpeed),
    minoTelegraph: readBool(query, "mtg", D.minoTelegraph),
    minoSight: clampTo(readNumber(query, "msi", D.minoSight), MINO_SIGHT_MAX),
    minoRoamRuns: clampRuns(
      readNumber(query, "mro", D.minoRoamRuns),
      MINO_ROAM_RUNS_MAX
    ),
    minoTerritory: clampRuns(
      readNumber(query, "mtr", D.minoTerritory),
      MINO_TERRITORY_MAX
    ),
    minoAccuracy: clampTo(readNumber(query, "mac", D.minoAccuracy), 1),
    minoPause: clampTo(readNumber(query, "mpa", D.minoPause), 1),
    minoSleep: clampTo(readNumber(query, "msl", D.minoSleep), MINO_SLEEP_MAX),
    // K80 turns 3a: K324 section 4.3's two knobs, the turn pull and K294's
    // per-model rows (`&mlm=5&mrn=1&mtp=0.5&mgs=3&mga=0.5&msa=0.5`).
    minoGiveUp: clampTo(readNumber(query, "mlm", D.minoGiveUp), MINO_GIVE_UP_MAX),
    minoRoamMin: clampRuns(readNumber(query, "mrn", D.minoRoamMin), MINO_ROAM_MIN_MAX),
    minoTurnPull: clampTo(readNumber(query, "mtp", D.minoTurnPull), 1),
    minoGuardSight: clampTo(readNumber(query, "mgs", D.minoGuardSight), MINO_SIGHT_MAX),
    minoGuardAccuracy: clampTo(readNumber(query, "mga", D.minoGuardAccuracy), 1),
    minoStalkerAccuracy: clampTo(readNumber(query, "msa", D.minoStalkerAccuracy), 1),
    // K114's burn race (`&fi=fuse&fsp=0.6&fdl=15`).
    fire: readChoice(query, "fi", FIRE_MODES, D.fire),
    fireSpeed: clampFireSpeed(readNumber(query, "fsp", D.fireSpeed)),
    fireDelay: clampTo(readNumber(query, "fdl", D.fireDelay), FIRE_DELAY_MAX),
    // K273's catch resets (`&mrs=1`, `&mlr=0`).
    minoRestart: readBool(query, "mrs", D.minoRestart),
    minoLair: readBool(query, "mlr", D.minoLair),
    // K76 stage 2c's thread reveal (`&xp=threads&rvd=4&rvf=1.5&rvl=halo`).
    revealDistance: clampRevealDistance(readNumber(query, "rvd", D.revealDistance)),
    revealFade: clampRevealFade(readNumber(query, "rvf", D.revealFade)),
    revealLook: readChoice(query, "rvl", REVEAL_LOOKS, D.revealLook),
    // K290's burnt look (`&fbt=char`).
    burnt: readChoice(query, "fbt", BURNT_MODES, D.burnt),
    // K114 stage 2's fire clock (`&fck=realtime`).
    fireClock: readChoice(query, "fck", FIRE_CLOCKS, D.fireClock),
    // K440's real-time pair (`&fck=realtime&fsr=0.3&fdr=10`).
    fireSpeedRt: clampFireSpeed(readNumber(query, "fsr", D.fireSpeedRt), D.fireSpeedRt),
    fireDelayRt: clampTo(readNumber(query, "fdr", D.fireDelayRt), FIRE_DELAY_MAX),
    // K465's finish under the thread reveal (`&xp=threads&rvx=0` hides it).
    revealFinish: readBool(query, "rvx", D.revealFinish),
    // K466's ends (`&xp=threads&rve=under&rvg=soft` is K76's look).
    revealEndCross: readChoice(query, "rve", REVEAL_END_CROSSES, D.revealEndCross),
    revealEndGlow: readChoice(query, "rvg", REVEAL_END_GLOWS, D.revealEndGlow),
  };
}

// The exploration mode a key=value query names: `xp` wins, then `trv=1`
// (the thread reveal), then the fog of war's old flag (`fow=1` fog,
// `fow=0` off); none of them keeps `base`.
function readExploration(query: URLSearchParams, base: Exploration): Exploration {
  if (query.has("xp")) return readChoice(query, "xp", EXPLORATION_MODES, base);
  if (query.has("trv") && readBool(query, "trv", false)) return "threads";
  if (query.has("fow")) return readBool(query, "fow", base === "fog") ? "fog" : "off";
  return base;
}

// A design from codec values (a decoded token, or a daily's pinned
// values): every value this build can use, the rest at today's defaults,
// sanitized like a token's; a preset or random appearMode (re)writes its
// three values.
export function paramsFromValues(
  seed: number,
  values: Readonly<Record<string, ParamValue>>
): UrlParams {
  const p = { seed: seed >>> 0, ...fromCodecValues(values) };
  applyAppearMode(p);
  return p;
}

// `base` with the legacy key=value pairs of `query` applied on top (the
// overrides a link may carry after its token: `&am=instant`, `&mf=0`).
export function applyLegacyOverrides(
  base: UrlParams,
  query: string
): UrlParams {
  return { seed: base.seed, ...readLegacy(new URLSearchParams(query), base) };
}

// The appearance group (see APPEAR_MODES). A URL without am= (a short link
// in custom mode, or any link made before the mode existed) gets the mode
// its values describe; a preset or random mode then (re)writes the three
// values - so random re-rolls on every page load. A query with none of
// the four keys keeps base's group as it is.
function readAppearance(
  query: URLSearchParams,
  base: AppearParams
): AppearParams {
  const keep: AppearParams = {
    appearMode: base.appearMode,
    appearSequence: base.appearSequence,
    appearSpeed: base.appearSpeed,
    appearFx: base.appearFx,
  };
  if (!["am", "ap", "as", "afx"].some((key) => query.has(key))) return keep;
  const p: AppearParams = {
    appearMode: "custom",
    appearSequence: readChoice(
      query,
      "ap",
      APPEAR_SEQUENCES,
      base.appearSequence
    ),
    appearSpeed: readNumber(query, "as", base.appearSpeed),
    // Legacy afx=sparks URLs fall through readChoice's validation to the
    // default.
    appearFx: readChoice(query, "afx", APPEAR_FX_MODES, base.appearFx),
  };
  const raw = query.get("am");
  p.appearMode =
    raw && (APPEAR_MODES as string[]).includes(raw)
      ? (raw as AppearMode)
      : appearModeFor(p);
  applyAppearMode(p);
  return p;
}

function readHexColor(
  query: URLSearchParams,
  key: string,
  fallback: string
): string {
  const raw = query.get(key);
  if (raw && /^[0-9a-fA-F]{6}$/.test(raw)) return "#" + raw.toLowerCase();
  return fallback;
}

function readChoice<T extends string>(
  query: URLSearchParams,
  key: string,
  options: readonly T[],
  fallback: T
): T {
  const raw = query.get(key);
  return raw && (options as readonly string[]).includes(raw)
    ? (raw as T)
    : fallback;
}

// The three values a preset, random or instant appearMode implies, so a
// link in one of those modes leaves them out.
const APPEAR_IMPLIED: ReadonlySet<string> = new Set([
  "appearSequence",
  "appearSpeed",
  "appearFx",
]);
const NOTHING_IMPLIED: ReadonlySet<string> = new Set();

// The params a link of this design leaves out because its appearMode
// implies them.
export function impliedParams(params: UrlParams): ReadonlySet<string> {
  return params.appearMode === "custom" ? NOTHING_IMPLIED : APPEAR_IMPLIED;
}

// The link token for a design, without the "?": `<seed>` when every
// setting is at its default, else `<seed>.<blob>` listing only the params
// that differ (param_codec.ts). Numbers compare after 6-decimal rounding,
// so slider float noise that equals a default is no change.
export function encodeParams(params: UrlParams): string {
  return encodeToken(
    params.seed,
    params as unknown as Record<string, unknown>,
    PARAM_DEFAULTS,
    impliedParams(params)
  );
}

// RELATIVE ("?<token>"): the path survives, so the same build works at the
// root and under a prefix (levi.dev/knotmaze/).
export function writeParams(params: UrlParams): void {
  history.replaceState(null, "", `?${encodeParams(params)}`);
}