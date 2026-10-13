// URL-as-complete-state: every design is fully specified by (seed, params)
// serialized in the query string - one compact token (ui/param_codec.ts),
// `?<seed>` or `?<seed>.<blob>`. The older key=value links still parse.

import { codecDefaults, decodeToken, encodeToken } from "./param_codec";
import type { ParamValue } from "./param_codec";
import type { ColorScheme, GamutPalette } from "../core/section_colors";
import { COLOR_SCHEMES, GAMUT_PALETTES } from "../core/section_colors";
import type { PitchSpace } from "../audio/pitch_space";
import { PITCH_SPACES } from "../audio/pitch_space";
import type { AppearSequence, AppearFxMode } from "../core/reveal_plan";
import { APPEAR_SEQUENCES, APPEAR_FX_MODES } from "../core/reveal_plan";
import type { ShapeId, AnchorId } from "../core/shapes";
import { SHAPES, ANCHORS } from "../core/shapes";
import type { BackgroundId } from "../render/background_model";
import { BACKGROUNDS } from "../render/background_model";

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
  hueShift: number; // [0, 360) rotation added to the seed's base hue.
  gamutArc: number; // [40, 360] hue-arc width of the color gamut.
  palette: GamutPalette; // Saturation/lightness preset for the gamut.
  pathColor: string; // "#rrggbb" traversal-highlight (gold) color.
  branchDensity: number; // [0, 1] extra maze junctions beyond the backbone.
  fourWayFraction: number; // [0, 1] share of junctions as 4-way merges.
  deadEndDensity: number; // [0.05, 1] strands cut into dead ends (de on).
  pluckStyle: PluckStyle; // Drag-release feel: soft ease vs ringing string.
  // RETIRED with the render-only plucks (2026-10-11): the old render ring's
  // frequency/decay scale - the time-exposure vibration has no visible
  // frequency, and its decay follows the sound's sustain. Nothing reads it;
  // it stays only because the codec tables list it (dropping a param is a
  // codec version bump), so links that carry it still read.
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
  // Dead-end stubs in the fabric (classic wrong-turn spurs). OFF by default:
  // a pure braided maze where every wrong turn loops back.
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
  // [1, 15] lattice units of recent path kept lit in memory-trail mode.
  trailLength: number;
  // [0, 1] Ariadne string tension: 1 = taut along the centerline, 0 =
  // slack cotton laid loose. Applies live to the whole laid string.
  tension: number;
  // Fog of war (fabric gameplay): the maze hides under fog until you
  // have been close by; explored areas stay visible. Applies live.
  fogOfWar: boolean;
  fowRadius: number; // [1.5, 10] visibility radius, lattice units.
  // With fog on: still play the intro appearance animation unfogged, then
  // close the fog in (fade + contracting reveal radius). Live.
  fowIntro: boolean;
  // Section color scheme (fabric mode; knot mode supports mono/strands):
  // mono | strands | depth | segments | noise. Replaces the old multiColor
  // checkbox (mc=1 reads as "strands").
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
}

// COMPLETE per-param defaults (everything but seed): the panel's per-row
// reset buttons + modified indicators, and the Reset-to-defaults button.
// The Omit type keeps it provably in sync with UrlParams. The user's chosen
// settings (2026-10-11).
// LINKS OMIT DEFAULTS, so the defaults are part of every link's meaning -
// and the codec keeps its own frozen copy per version (param_codec.ts
// CODEC_V1, which legacy s=/seed= links read with too). The tests pin this
// table and require it to equal the current codec table's defaults:
// changing a default means a new codec version (see param_codec.ts), and a
// new param must be appended to the codec table as well.
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
  hueShift: 300,
  gamutArc: 130,
  palette: "pastel",
  pathColor: "#eccc41",
  branchDensity: 0.35,
  fourWayFraction: 0.12,
  deadEndDensity: 0.25,
  pluckStyle: "string",
  pluckSize: 1.75, // Since codec v3 (v2 links read 1).
  pluckGhost: 0.35,
  pluckReach: "run",
  physics: true,
  mazeFabric: true,
  deadEnds: false,
  pathViz: "gold",
  cameraMode: "fit",
  trailLength: 5,
  tension: 0.45,
  fogOfWar: false,
  fowRadius: 4,
  fowIntro: false,
  colorScheme: "segments",
  junctionBlend: 0.88, // Since codec v2 (v1 links read 0).
  // trace + burn at 2.2 matches no preset.
  appearMode: "custom",
  appearSequence: "trace",
  appearSpeed: 2.2,
  appearFx: "burn",
  // = DEFAULT_MAZE_PARAMS (core/maze_plan.ts), the values every link read
  // before these params existed.
  entranceClearance: 2.5,
  exitClearance: 5,
  junctionSpacing: 2,
  // K21: the subtlest backdrop - static, keeps the page's ink on average.
  background: "vellum",
  backgroundIntensity: 0.5,
};

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

// The CURRENT option list of every enum param: what this build accepts
// from any link (anything else reads as the default) - and, in the tests,
// what every codec table must still list.
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
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

// A decoded token's values as app params. A value this build cannot use
// (wrong type, an option it no longer has) reads as the default; the clamps
// match the legacy reader's.
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
  return p;
}

// What legacy links (s=, seed=) read for a missing key: the codec's v1
// defaults - the table s= links were written against. Equal to
// PARAM_DEFAULTS until a default changes; then the codec moves to v2 and
// legacy links keep their meaning.
const LEGACY_BASE = fromCodecValues(codecDefaults(1));

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

// The legacy seed: s= (base-36, short links) or seed= (decimal, every link
// made before short links); neither = a fresh random design.
function readSeed(query: URLSearchParams): number {
  const s = query.get("s");
  if (s && /^[0-9a-z]{1,7}$/.test(s)) return Number.parseInt(s, 36) >>> 0;
  return Math.floor(readNumber(query, "seed", newSeed())) >>> 0;
}

export function readParams(): UrlParams {
  return parseParams(window.location.search);
}

// Reads every link form:
// - COMPACT: `?<seed>` / `?<seed>.<blob>` (param_codec.ts). Legacy
//   key=value pairs AFTER the token override it (probes:
//   `?<token>&am=instant`); unknown keys (fbclid, utm_*) are ignored.
// - LEGACY: `?s=<base-36 seed>&<changed params>` short links and
//   `?seed=<decimal>&<every param>` links, legacy keys (mc, trm) included.
// No seed at all = a fresh random design. Never throws: an unreadable
// token keeps whatever seed it has and warns once.
export function parseParams(search: string): UrlParams {
  const query = search.startsWith("?") ? search.slice(1) : search;
  const amp = query.indexOf("&");
  // A query re-serialized through URLSearchParams gains a "=" after the
  // valueless token (new URL(link).searchParams.append(...) does that).
  const head = (amp < 0 ? query : query.slice(0, amp)).replace(/=$/, "");
  if (head === "" || head.includes("=")) {
    const legacy = new URLSearchParams(query);
    // A legacy LINK (s= / seed=) means what it meant when written: the v1
    // defaults. Without a seed it is no link at all - a fresh design at
    // TODAY's defaults (the bare page, or a `?am=instant` probe URL).
    const linked = legacy.has("s") || legacy.has("seed");
    return {
      seed: readSeed(legacy),
      ...readLegacy(legacy, linked ? LEGACY_BASE : { ...PARAM_DEFAULTS }),
    };
  }
  const decoded = decodeToken(head);
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

// The legacy key=value readers: each key the query lacks reads `base`
// (LEGACY_BASE for a legacy link; the decoded token for overrides after
// one). A param added after compact links needs no key here - it simply
// reads base.
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
    pathViz: readPathViz(query, D.pathViz),
    cameraMode: readChoice(query, "cam", CAMERA_MODES, D.cameraMode),
    trailLength: readNumber(query, "trl", D.trailLength),
    tension: readNumber(query, "tn", D.tension),
    fogOfWar: readBool(query, "fow", D.fogOfWar),
    fowRadius: readNumber(query, "fr", D.fowRadius),
    fowIntro: readBool(query, "fwi", D.fowIntro),
    colorScheme: readScheme(query, D.colorScheme),
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
  };
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

function readPathViz(query: URLSearchParams, fallback: PathViz): PathViz {
  const raw = query.get("pv");
  if (raw && (PATH_VIZ_MODES as readonly string[]).includes(raw)) {
    return raw as PathViz;
  }
  // Back-compat: the short-lived Stage 23 trailMode checkbox.
  if (query.has("trm")) {
    return readNumber(query, "trm", 0) > 0.5 ? "trail" : "gold";
  }
  return fallback;
}

function readScheme(
  query: URLSearchParams,
  fallback: ColorScheme
): ColorScheme {
  const raw = query.get("cs");
  if (raw && (COLOR_SCHEMES as string[]).includes(raw)) {
    return raw as ColorScheme;
  }
  // Back-compat: the old multiColor checkbox.
  if (query.has("mc")) {
    return readNumber(query, "mc", 0) > 0.5 ? "strands" : "mono";
  }
  return fallback;
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
    impliedParams(params)
  );
}

// RELATIVE ("?<token>"): the path survives, so the same build works at the
// root and under a prefix (levi.dev/knotmaze/).
export function writeParams(params: UrlParams): void {
  history.replaceState(null, "", `?${encodeParams(params)}`);
}