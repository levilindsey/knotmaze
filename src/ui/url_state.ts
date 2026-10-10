// URL-as-complete-state: every design is fully specified by (seed, params)
// serialized in the query string.

import type { ColorScheme } from "../core/section_colors";
import { COLOR_SCHEMES } from "../core/section_colors";
import type { PitchSpace } from "../audio/pitch_space";
import { PITCH_SPACES } from "../audio/pitch_space";
import type { AppearMode } from "../core/reveal_plan";
import { APPEAR_MODES } from "../core/reveal_plan";

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

export interface UrlParams {
  seed: number;
  gridSize: number;
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
  pluckStyle: PluckStyle; // Release feel: soft ease vs ringing string.
  mazeMode: boolean; // P4: trace a solve path instead of tugging threads.
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
  trailLength: 5,
  tension: 0.45,
  appearSpeed: 1,
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
    pluckStyle: readChoice(query, "pk", PLUCK_STYLES, "string"),
    mazeMode: readNumber(query, "md", 0) > 0.5,
    mazeFabric: readNumber(query, "mf", 0) > 0.5,
    deadEnds: readNumber(query, "de", 0) > 0.5,
    pathViz: readPathViz(query),
    trailLength: readNumber(query, "trl", DEFAULTS.trailLength),
    tension: readNumber(query, "tn", DEFAULTS.tension),
    colorScheme: readScheme(query),
    appearMode: readAppear(query),
    appearSpeed: readNumber(query, "as", DEFAULTS.appearSpeed),
  };
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
  query.set("pk", params.pluckStyle);
  query.set("md", params.mazeMode ? "1" : "0");
  query.set("mf", params.mazeFabric ? "1" : "0");
  query.set("de", params.deadEnds ? "1" : "0");
  query.set("pv", params.pathViz);
  query.set("trl", String(params.trailLength));
  query.set("tn", String(params.tension));
  query.set("cs", params.colorScheme);
  query.set("ap", params.appearMode);
  query.set("as", String(params.appearSpeed));
  history.replaceState(null, "", `?${query.toString()}`);
}
