// URL-as-complete-state: every design is fully specified by (seed, params)
// serialized in the query string.

import type { ColorScheme, GamutPalette } from "../core/section_colors";
import { COLOR_SCHEMES, GAMUT_PALETTES } from "../core/section_colors";
import type { PitchSpace } from "../audio/pitch_space";
import { PITCH_SPACES } from "../audio/pitch_space";
import type { AppearMode, AppearFxMode } from "../core/reveal_plan";
import { APPEAR_MODES, APPEAR_FX_MODES } from "../core/reveal_plan";
import type { ShapeId, AnchorId } from "../core/shapes";
import { SHAPES, ANCHORS } from "../core/shapes";

// Pluck audio behavior: silent | user plucks only | ambient random plucks
// | scripted song playback.
export type SoundMode = "none" | "manual" | "random" | "music";
export const SOUND_MODES: SoundMode[] = ["none", "manual", "random", "music"];

// Release feel: soft eased snap-back vs sharp ringing string.
export type PluckStyle = "soft" | "string";
export const PLUCK_STYLES: PluckStyle[] = ["soft", "string"];

// Traversal-path visualization: full gold recolor | short memory trail |
// an unspooled Ariadne string laid along everywhere you have walked.
export type PathViz = "gold" | "trail" | "string";
export const PATH_VIZ_MODES: PathViz[] = ["gold", "trail", "string"];

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
  gridAlign: boolean; // Soft-anchor to lattice positions (applies live).
  threadWidth: number; // Ribbon width in lattice units (applies live).
  gap: number; // Space between an under-thread cut end and the over thread.
  moveSpeed: number; // [0.25, 4] maze traversal-animation speed multiplier.
  cuspRadius: number; // [0, 3] junction cusp-rounding (fillet) radius mult.
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
  pluckStyle: PluckStyle; // Release feel: soft ease vs ringing string.
  snappiness: number; // [0, 1] string-ring speed/decay. 0.5 = stock.
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
  // [1, 15] lattice units of recent path kept lit in memory-trail mode.
  trailLength: number;
  // [0, 1] Ariadne string tension: 1 = taut along the centerline, 0 =
  // slack cotton laid loose. Applies live to the whole laid string.
  tension: number;
  // Fog of war (fabric gameplay): the maze hides under fog until you
  // have been close by; explored areas stay visible. Applies live.
  fogOfWar: boolean;
  fowRadius: number; // [1.5, 10] visibility radius, lattice units.
  // Section color scheme (fabric mode; knot mode supports mono/strands):
  // mono | strands | depth | segments | noise. Replaces the old multiColor
  // checkbox (mc=1 reads as "strands").
  colorScheme: ColorScheme;
  // Appearance animation: how the design draws itself in on build.
  // instant (default - today's pop-in, byte-identical) | trace | bloom |
  // draw | ink. trace/bloom need the walk graph and fall back to draw in
  // knot mode.
  appearMode: AppearMode;
  appearSpeed: number; // [0.3, 4] reveal frontier speed multiplier.
  // Frontier particle effect while the appearance animation runs: none |
  // rainbow (6-stripe rainbow on the fresh thread + saturated sparks) |
  // comet (blue-green streaked head) | dust (twinkling motes) | burn |
  // roots. Inert when appearMode is instant; applies live.
  appearFx: AppearFxMode;
}

export const DEFAULTS = {
  gridSize: 12,
  weaveDensity: 0.35,
  turnBias: 0.7,
  slack: 0.55,
  simSpeed: 5,
  drag: 0.5,
  repulsion: 1,
  bend: 1,
  smooth: 0.25,
  stiffness: 1,
  threadWidth: 0.42,
  gap: 0.18,
  moveSpeed: 1,
  cuspRadius: 1,
  fadeLength: 0,
  flowStrength: 0.3,
  flowSpeed: 1,
  tugLimit: 2,
  snapBack: 4,
  octaves: 2,
  soundSpeed: 1,
  volume: 0.85,
  reverb: 0.42,
  brightness: 0.5,
  sustain: 0.5,
  shimmer: 0.4,
  pickPosition: 0.4,
  snappiness: 0.5,
  rootNote: "seed" as RootNote,
  tonicEmphasis: 0.5,
  pulseSpacing: 2.5,
  hueShift: 0,
  gamutArc: 280,
  palette: "pastel" as GamutPalette,
  pathColor: "#ffd24a",
  branchDensity: 0.35,
  fourWayFraction: 0.12,
  deadEndDensity: 0.25,
  trailLength: 5,
  tension: 0.45,
  fowRadius: 4,
  appearSpeed: 1,
};

// COMPLETE per-param defaults (everything but seed), for the panel's
// per-row reset buttons + modified indicators and the Reset-to-defaults
// button. DEFAULTS above feeds readNumber fallbacks (numbers only);
// this adds the booleans and choice strings. The Omit type keeps it
// provably in sync with UrlParams.
export const PARAM_DEFAULTS: Omit<UrlParams, "seed"> = {
  ...DEFAULTS,
  shape: "rect",
  startAnchor: "nw",
  exitAnchor: "se",
  gridAlign: false,
  mazeFabric: false,
  deadEnds: false,
  fogOfWar: false,
  colorScheme: "mono",
  pathViz: "gold",
  soundMode: "manual",
  pitchSpace: "pentMinor",
  pluckStyle: "string",
  appearMode: "instant",
  appearFx: "rainbow",
};

export function newSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
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

export function readParams(): UrlParams {
  const query = new URLSearchParams(window.location.search);
  return {
    seed: Math.floor(readNumber(query, "seed", newSeed())) >>> 0,
    gridSize: readNumber(query, "gs", DEFAULTS.gridSize),
    shape: readChoice(query, "shp", SHAPES, "rect"),
    startAnchor: readChoice(query, "sa", ANCHORS, "nw"),
    exitAnchor: readChoice(query, "xa", ANCHORS, "se"),
    weaveDensity: readNumber(query, "wd", DEFAULTS.weaveDensity),
    turnBias: readNumber(query, "tb", DEFAULTS.turnBias),
    slack: readNumber(query, "sl", DEFAULTS.slack),
    simSpeed: readNumber(query, "sp", DEFAULTS.simSpeed),
    drag: readNumber(query, "dr", DEFAULTS.drag),
    repulsion: readNumber(query, "rep", DEFAULTS.repulsion),
    bend: readNumber(query, "bd", DEFAULTS.bend),
    smooth: readNumber(query, "sm", DEFAULTS.smooth),
    stiffness: readNumber(query, "st", DEFAULTS.stiffness),
    gridAlign: readNumber(query, "ga", 0) > 0.5,
    threadWidth: readNumber(query, "tw", DEFAULTS.threadWidth),
    gap: readNumber(query, "gap", DEFAULTS.gap),
    moveSpeed: readNumber(query, "ms", DEFAULTS.moveSpeed),
    cuspRadius: readNumber(query, "cr", DEFAULTS.cuspRadius),
    fadeLength: readNumber(query, "fl", DEFAULTS.fadeLength),
    flowStrength: readNumber(query, "fw", DEFAULTS.flowStrength),
    flowSpeed: readNumber(query, "fv", DEFAULTS.flowSpeed),
    tugLimit: readNumber(query, "tl", DEFAULTS.tugLimit),
    snapBack: readNumber(query, "sb", DEFAULTS.snapBack),
    soundMode: readChoice(query, "snd", SOUND_MODES, "manual"),
    pitchSpace: readChoice(query, "sc", PITCH_SPACES, "pentMinor"),
    octaves: readNumber(query, "oct", DEFAULTS.octaves),
    soundSpeed: readNumber(query, "ss", DEFAULTS.soundSpeed),
    volume: readNumber(query, "vol", DEFAULTS.volume),
    reverb: readNumber(query, "rv", DEFAULTS.reverb),
    brightness: readNumber(query, "brt", DEFAULTS.brightness),
    sustain: readNumber(query, "sus", DEFAULTS.sustain),
    shimmer: readNumber(query, "shm", DEFAULTS.shimmer),
    pickPosition: readNumber(query, "pp", DEFAULTS.pickPosition),
    snappiness: readNumber(query, "snpy", DEFAULTS.snappiness),
    rootNote: readChoice(query, "rn", ROOT_NOTES, "seed"),
    tonicEmphasis: readNumber(query, "tnc", DEFAULTS.tonicEmphasis),
    pulseSpacing: readNumber(query, "psp", DEFAULTS.pulseSpacing),
    hueShift: readNumber(query, "hs", DEFAULTS.hueShift),
    gamutArc: readNumber(query, "arc", DEFAULTS.gamutArc),
    palette: readChoice(query, "pal", GAMUT_PALETTES, "pastel"),
    pathColor: readHexColor(query, "pc", DEFAULTS.pathColor),
    branchDensity: readNumber(query, "brd", DEFAULTS.branchDensity),
    fourWayFraction: readNumber(query, "fwf", DEFAULTS.fourWayFraction),
    deadEndDensity: readNumber(query, "ded", DEFAULTS.deadEndDensity),
    pluckStyle: readChoice(query, "pk", PLUCK_STYLES, "string"),
    mazeFabric: readNumber(query, "mf", 0) > 0.5,
    deadEnds: readNumber(query, "de", 0) > 0.5,
    pathViz: readPathViz(query),
    trailLength: readNumber(query, "trl", DEFAULTS.trailLength),
    tension: readNumber(query, "tn", DEFAULTS.tension),
    fogOfWar: readNumber(query, "fow", 0) > 0.5,
    fowRadius: readNumber(query, "fr", DEFAULTS.fowRadius),
    colorScheme: readScheme(query),
    appearMode: readAppear(query),
    appearSpeed: readNumber(query, "as", DEFAULTS.appearSpeed),
    // Legacy afx=sparks URLs fall through readChoice's validation to the
    // default, which is the renamed mode itself.
    appearFx: readChoice(query, "afx", APPEAR_FX_MODES, "rainbow"),
  };
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

function readPathViz(query: URLSearchParams): PathViz {
  const raw = query.get("pv");
  if (raw && (PATH_VIZ_MODES as readonly string[]).includes(raw)) {
    return raw as PathViz;
  }
  // Back-compat: the short-lived Stage 23 trailMode checkbox.
  return readNumber(query, "trm", 0) > 0.5 ? "trail" : "gold";
}

function readAppear(query: URLSearchParams): AppearMode {
  const raw = query.get("ap");
  if (raw && (APPEAR_MODES as readonly string[]).includes(raw)) {
    return raw as AppearMode;
  }
  return "instant"; // Existing URLs keep today's pop-in exactly.
}

function readScheme(query: URLSearchParams): ColorScheme {
  const raw = query.get("cs");
  if (raw && (COLOR_SCHEMES as string[]).includes(raw)) {
    return raw as ColorScheme;
  }
  // Back-compat: the old multiColor checkbox.
  return readNumber(query, "mc", 0) > 0.5 ? "strands" : "mono";
}

export function writeParams(params: UrlParams): void {
  const query = new URLSearchParams();
  query.set("seed", String(params.seed));
  query.set("gs", String(params.gridSize));
  query.set("shp", params.shape);
  query.set("sa", params.startAnchor);
  query.set("xa", params.exitAnchor);
  query.set("wd", String(params.weaveDensity));
  query.set("tb", String(params.turnBias));
  query.set("sl", String(params.slack));
  query.set("sp", String(params.simSpeed));
  query.set("dr", String(params.drag));
  query.set("rep", String(params.repulsion));
  query.set("bd", String(params.bend));
  query.set("sm", String(params.smooth));
  query.set("st", String(params.stiffness));
  query.set("ga", params.gridAlign ? "1" : "0");
  query.set("tw", String(params.threadWidth));
  query.set("gap", String(params.gap));
  query.set("ms", String(params.moveSpeed));
  query.set("cr", String(params.cuspRadius));
  query.set("fl", String(params.fadeLength));
  query.set("fw", String(params.flowStrength));
  query.set("fv", String(params.flowSpeed));
  query.set("tl", String(params.tugLimit));
  query.set("sb", String(params.snapBack));
  query.set("snd", params.soundMode);
  query.set("sc", params.pitchSpace);
  query.set("oct", String(params.octaves));
  query.set("ss", String(params.soundSpeed));
  query.set("vol", String(params.volume));
  query.set("rv", String(params.reverb));
  query.set("brt", String(params.brightness));
  query.set("sus", String(params.sustain));
  query.set("shm", String(params.shimmer));
  query.set("pp", String(params.pickPosition));
  query.set("snpy", String(params.snappiness));
  query.set("rn", params.rootNote);
  query.set("tnc", String(params.tonicEmphasis));
  query.set("psp", String(params.pulseSpacing));
  query.set("hs", String(params.hueShift));
  query.set("arc", String(params.gamutArc));
  query.set("pal", params.palette);
  query.set("pc", params.pathColor.replace("#", ""));
  query.set("brd", String(params.branchDensity));
  query.set("fwf", String(params.fourWayFraction));
  query.set("ded", String(params.deadEndDensity));
  query.set("pk", params.pluckStyle);
  query.set("mf", params.mazeFabric ? "1" : "0");
  query.set("de", params.deadEnds ? "1" : "0");
  query.set("pv", params.pathViz);
  query.set("trl", String(params.trailLength));
  query.set("tn", String(params.tension));
  query.set("fow", params.fogOfWar ? "1" : "0");
  query.set("fr", String(params.fowRadius));
  query.set("cs", params.colorScheme);
  query.set("ap", params.appearMode);
  query.set("as", String(params.appearSpeed));
  query.set("afx", params.appearFx);
  history.replaceState(null, "", `?${query.toString()}`);
}
