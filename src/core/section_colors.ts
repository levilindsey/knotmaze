// P4 section coloring: assign every stretch of thread a SECTION COLOR.
// Pure combinatorics: schemes are deterministic from (graph, walk, seed),
// per URL-as-complete-state.
//
// THE BLENDING CONTRACT: at a junction several runs meet, and their colors
// must transition smoothly through it in every direction. Each junction
// gets ONE converged color, and every incident run ramps from its own
// color to it near its ends - so any number of arms always meet in a
// single shared color. Schemes whose field is already continuous across
// junctions (depth) need no ramps.
//
// RUN FORM (G2.2): one record per walk RUN - its unwrapped ctrl span, its
// two junction colors and its own color, its base ramp lengths and the
// ctrl-per-lattice-unit factor that turns junctionBlend's fixed lattice
// distance into ctrl - plus each control slot's run. The ribbon VERTEX
// shader evaluates the run at the vertex's exact ctrl every frame
// (paint_glsl knotSection; evalRunSection is the TS twin), so section
// colors follow the material with no per-sample cache, no drift re-bake,
// and junctionBlend (and the hue, for gamut-space schemes) is a uniform.
// The previous form - per-chain piecewise-linear RGB segments, eased ramps
// approximated by 6 linear pieces and gamut sweeps by 0.06-coordinate
// chords - is frozen in test/core/fixtures/section_field_v1.ts.
//
// RGB OR GAMUT SPACE: segments (and knot mode) carry RGB colors and blend
// along straight RGB lines - arbitrary pairs blend DIRECTLY (a desaturated
// middle for near-complementary pairs is correct), which is what segments
// wants: fully random unrelated run colors, junctions showing just the
// blend of whatever meets. Schemes that MEAN "sweep the gamut" between two
// coordinates (depth's gradient, strands' bridge transitions, mono, noise)
// carry gamut COORDINATES and convert per vertex, so a sweep follows the
// hue arc exactly.

import { PAINT_CONST, RUN_FLAG } from "../render/paint_const";
import type { WalkGraph } from "./walk_graph";

export type ColorScheme = "mono" | "strands" | "depth" | "segments" | "noise";

export const COLOR_SCHEMES: ColorScheme[] = [
  "mono",
  "strands",
  "depth",
  "segments",
  "noise",
];

export type RGB = [number, number, number];

// Ramp length at each end of a discontinuous run (ctrl units; ~1.2 world).
const RAMP_CTRL = 2.4;
// Segments scheme only: much shorter junction blends (see its loop).
const SEG_RAMP_CTRL = 1.0;
// JUNCTION BLEND DISTANCE (the junctionBlend param, lattice units >= 0): how
// far each junction's converged color bleeds into its incident runs BEYOND
// the base ramps above - a fixed distance, the same at every junction
// whatever the run's length (converted to ctrl per run through its lattice
// length). 0 = the base ramps, so the blend sits inside the joint. A run
// shorter than twice the ramps becomes one continuous gradient junction ->
// own color -> junction (the two ramps meet at its midpoint). Lengthened
// ramps also EASE toward smoothstep (fully once the extension reaches
// RAMP_EASE_FULL lattice units): a long LINEAR ramp meets the flat run - or
// the opposite ramp - with a slope kink the eye reads as a band.
const RAMP_EASE_FULL = PAINT_CONST.RAMP_EASE_FULL;

// A run end's ramp length (ctrl): the base ramp `r0` plus the blend
// extension, never past the run's midpoint.
function rampLen(r0: number, span: number, extraCtrl: number): number {
  return Math.min(span / 2, r0 + extraCtrl);
}

// Eased-ramp blend weight at ramp parameter u: linear at ease 0 (the
// historic one-piece ramp), smoothstep at ease 1.
function easeAt(u: number, ease: number): number {
  return u + (u * u * (3 - 2 * u) - u) * ease;
}

// The junctionBlend ease for a blend distance (shader uniform uKSect.y).
export function blendEase(dist: number): number {
  return Math.min(1, Math.max(0, dist) / RAMP_EASE_FULL);
}

// THE GAMUT: a 280-degree hue arc around the seed hue at the fabric's
// saturation/lightness - wide enough to read as distinct sections, no full
// wrap so a coordinate sweep never has a long-way-around ambiguity. This
// is the design's color space: every scheme picks its colors from it
// (coordinate v in [0, 1] -> hue), so sections always read as one family.
const GAMUT_SWEEP = 280;

// LIVE GAMUT CONFIG (the gamutArc + palette params): module-level so
// every consumer - the schemes here AND the renderer (which hands it to
// the shaders as a uniform, gamutConfig) - reads the same values without
// threading extra args everywhere. main.ts sets it from params before any
// run table or scene build.
export type GamutPalette = "pastel" | "jewel" | "ember" | "moss" | "ink";
export const GAMUT_PALETTES: GamutPalette[] = [
  "pastel",
  "jewel",
  "ember",
  "moss",
  "ink",
];
// Saturation / lightness per palette preset (hue comes from the arc).
const PALETTE_SL: Record<GamutPalette, [number, number]> = {
  pastel: [0.45, 0.64],
  jewel: [0.62, 0.5],
  ember: [0.72, 0.54],
  moss: [0.34, 0.52],
  ink: [0.16, 0.56],
};
let gamutArcDeg = GAMUT_SWEEP;
let gamutSat = PALETTE_SL.pastel[0];
let gamutLight = PALETTE_SL.pastel[1];
export function setGamutConfig(arcDeg: number, palette: GamutPalette): void {
  gamutArcDeg = Math.max(10, Math.min(360, arcDeg));
  const sl = PALETTE_SL[palette] ?? PALETTE_SL.pastel;
  gamutSat = sl[0];
  gamutLight = sl[1];
}
// The live gamut (arc degrees, saturation, lightness): the shaders' uKGamut.
export function gamutConfig(): [number, number, number] {
  return [gamutArcDeg, gamutSat, gamutLight];
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

// Gamut coordinate -> RGB (GLSL twin: paint_glsl kGamut).
export function gamutRgb(baseHue: number, v: number): RGB {
  const h = (((baseHue + (v - 0.5) * gamutArcDeg) % 360) + 360) % 360;
  return hslToRgb(h, gamutSat, gamutLight);
}

// Deterministic hash -> [0, 1) for per-run colors.
function hash01(s: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = (h ^ s.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return ((h >>> 8) & 0xffffff) / 0x1000000;
}

// ---- RUN FORM -----------------------------------------------------------

export interface RunSection {
  chain: number;
  ctrlA: number; // Unwrapped span (closed wrap runs: ctrlB > chain length).
  ctrlB: number;
  r0A: number; // Base ramp length at each end (ctrl; under RAMP_A / RAMP_B).
  r0B: number;
  perLattice: number; // Ctrl per lattice unit (span / run length; 0 = none).
  flags: number; // RUN_FLAG bits.
  colA: RGB; // RGB, or [gamut coordinate, 0, 0] under RUN_FLAG.GAMUT.
  colMid: RGB;
  colB: RGB;
}

export interface SectionRuns {
  runs: RunSection[];
  // Per chain, per control slot: the run whose half-open span [ctrlA,
  // ctrlB) holds the slot (wrap runs modulo the ring; an open chain's last
  // slot belongs to the run ending there).
  slotRun: Int32Array[];
  // The noise scheme: every run reads per-control coordinates (CTRLIDX.z,
  // from the material's initial positions - the renderer owns those).
  noise: boolean;
}

export interface RunChain {
  len: number; // Control slots.
  closed: boolean;
}

// A run's section color at a ctrl (GLSL twin: paint_glsl knotSection, after
// its run lookup; RUN_FLAG.NOISE is resolved by the caller, which owns the
// per-control coordinates). `dist` = junctionBlend (lattice units).
export function evalRunSection(
  run: RunSection,
  ctrl: number,
  nCtrl: number,
  closed: boolean,
  dist: number,
  baseHue: number
): RGB {
  const cu = closed && ctrl < run.ctrlA - 1e-4 ? ctrl + nCtrl : ctrl;
  let col: RGB;
  if (run.flags & RUN_FLAG.SWEEP) {
    const t = Math.max(
      0,
      Math.min(1, (cu - run.ctrlA) / Math.max(run.ctrlB - run.ctrlA, 1e-6))
    );
    col = [run.colA[0] + (run.colB[0] - run.colA[0]) * t, 0, 0];
  } else {
    const sp = run.ctrlB - run.ctrlA;
    const extra = Math.max(0, dist) * run.perLattice;
    const ease = blendEase(dist);
    const ra = run.flags & RUN_FLAG.RAMP_A ? rampLen(run.r0A, sp, extra) : 0;
    const rb = run.flags & RUN_FLAG.RAMP_B ? rampLen(run.r0B, sp, extra) : 0;
    const da = cu - run.ctrlA;
    const db = run.ctrlB - cu;
    const mix3 = (a: RGB, b: RGB, w: number): RGB => [
      a[0] + (b[0] - a[0]) * w,
      a[1] + (b[1] - a[1]) * w,
      a[2] + (b[2] - a[2]) * w,
    ];
    if (ra > 0 && da < ra) {
      col = mix3(run.colA, run.colMid, easeAt(Math.max(0, Math.min(1, da / ra)), ease));
    } else if (rb > 0 && db < rb) {
      col = mix3(run.colB, run.colMid, easeAt(Math.max(0, Math.min(1, db / rb)), ease));
    } else {
      col = [run.colMid[0], run.colMid[1], run.colMid[2]];
    }
  }
  return run.flags & RUN_FLAG.GAMUT ? gamutRgb(baseHue, col[0]) : col;
}

// Build the run table for a scheme (event time: scene build, Look change).
// The same colors the segment field used - swatches, junction RGB means,
// Dijkstra depth, ramp lengths - now as run records the shader evaluates
// exactly. junctionBlend is NOT an input (a uniform). `baseHue` anchors
// the gamut for the RGB-space segments scheme (the renderer's
// style.baseHue; seed % 360 rotated by hueShift).
export function buildSectionRuns(
  scheme: ColorScheme,
  walk: WalkGraph | null,
  chains: RunChain[],
  hueGroup: number[] | undefined,
  seed: number,
  baseHue: number
): SectionRuns {
  const nChains = chains.length;
  const runs: RunSection[] = [];
  const perChain: number[][] = chains.map(() => []);
  const addRun = (r: RunSection): void => {
    perChain[r.chain].push(runs.length);
    runs.push(r);
  };
  const constRun = (chain: number, col: RGB, gamut: boolean, flags = 0): RunSection => ({
    chain,
    ctrlA: 0,
    ctrlB: chains[chain].len,
    r0A: 0,
    r0B: 0,
    perLattice: 0,
    flags: (gamut ? RUN_FLAG.GAMUT : 0) | flags,
    colA: col,
    colMid: col,
    colB: col,
  });
  // Per-chain gamut coordinate for constant-colored chains (and the
  // strands scheme's per-thread colors).
  const chainCoord = (chain: number): number => {
    if (scheme === "mono") return 0.5;
    if (scheme === "strands") {
      const slot = hueGroup?.[chain] ?? chain;
      return (slot * 0.618034) % 1;
    }
    // depth/segments fallback for chains outside the walk graph
    // (decorative culled loops, knot mode).
    if (scheme === "segments") return hash01(`chain${chain}`, seed);
    return 0.5;
  };
  // Ctrl per lattice unit along a run (junctionBlend's conversion).
  const perLat = (e: { ctrlA: number; ctrlB: number; length: number }): number =>
    e.length > 1e-9 ? (e.ctrlB - e.ctrlA) / e.length : 0;

  if (scheme === "noise") {
    // One constant NOISE run per chain: the shader reads each control's
    // coordinate (continuous everywhere, junctions included).
    const slotRun = chains.map((g) => new Int32Array(g.len));
    for (let c = 0; c < nChains; c++) {
      slotRun[c].fill(runs.length);
      runs.push(constRun(c, [0.5, 0, 0], true, RUN_FLAG.NOISE));
    }
    return { runs, slotRun, noise: true };
  }

  if (scheme === "mono" || !walk) {
    for (let c = 0; c < nChains; c++) addRun(constRun(c, [chainCoord(c), 0, 0], true));
  } else if (scheme === "depth") {
    // Distance from the START (Dijkstra over the walk multigraph; the
    // graph ships distToExit, so run the mirror from the start). The
    // field is continuous across junctions by construction - no ramps;
    // each run sweeps the gamut between its two junction coordinates.
    const dist = new Map<string, number>();
    for (const id of walk.vertices.keys()) dist.set(id, Infinity);
    dist.set(walk.start, 0);
    const done = new Set<string>();
    for (;;) {
      let cur: string | null = null;
      let curD = Infinity;
      for (const [id, d] of dist) {
        if (done.has(id) || d === Infinity) continue;
        if (d < curD || (d === curD && cur !== null && id < cur)) {
          curD = d;
          cur = id;
        }
      }
      if (cur === null) break;
      done.add(cur);
      for (const eid of walk.vertices.get(cur)!.edges) {
        const e = walk.edges[eid];
        const other = e.va === cur ? e.vb : e.va;
        const nd = curD + e.length;
        if (nd < dist.get(other)!) dist.set(other, nd);
      }
    }
    let maxD = 0;
    for (const d of dist.values()) {
      if (Number.isFinite(d) && d > maxD) maxD = d;
    }
    const coordJ = (id: string): number => {
      const d = dist.get(id)!;
      return Number.isFinite(d) && maxD > 0 ? d / maxD : 1;
    };
    for (const e of walk.edges) {
      addRun({
        chain: e.chain,
        ctrlA: e.ctrlA,
        ctrlB: e.ctrlB,
        r0A: 0,
        r0B: 0,
        perLattice: 0,
        flags: RUN_FLAG.GAMUT | RUN_FLAG.SWEEP,
        colA: [coordJ(e.va), 0, 0],
        colMid: [0, 0, 0],
        colB: [coordJ(e.vb), 0, 0],
      });
    }
    for (let c = 0; c < nChains; c++) {
      if (perChain[c].length === 0) addRun(constRun(c, [1, 0, 0], true));
    }
  } else if (scheme === "strands") {
    // Per-thread colors; the through-thread keeps its color across each
    // junction (hosts never shift hue) and bridges carry the whole
    // transition along their own end ramps - as a GAMUT sweep, so a
    // bridge between distant thread colors walks the hue arc instead of
    // fading through grey.
    for (const e of walk.edges) {
      const span = e.ctrlB - e.ctrlA;
      const r0 = Math.min(RAMP_CTRL, span / 2.5);
      addRun({
        chain: e.chain,
        ctrlA: e.ctrlA,
        ctrlB: e.ctrlB,
        r0A: r0,
        r0B: r0,
        perLattice: perLat(e),
        flags: RUN_FLAG.GAMUT | RUN_FLAG.RAMP_A | RUN_FLAG.RAMP_B,
        colA: [chainCoord(walk.vertices.get(e.va)!.chain), 0, 0],
        colMid: [chainCoord(e.chain), 0, 0],
        colB: [chainCoord(walk.vertices.get(e.vb)!.chain), 0, 0],
      });
    }
    for (let c = 0; c < nChains; c++) {
      if (perChain[c].length === 0) addRun(constRun(c, [chainCoord(c), 0, 0], true));
    }
  } else {
    // segments: a FULLY RANDOM gamut color per run - adjacent runs have
    // zero association (pure hash). Each junction converges to the RGB
    // MEAN of its incident runs' colors (self-loops touch twice): a
    // channel-wise mean, NOT a coordinate mean - hue coordinates do not
    // average across an arc. Ramps are straight RGB blends by design:
    // "just the blend given whatever the colors are".
    // Swatch assignment, not raw uniform draws: uniform hues over a pastel
    // arc land in the same color FAMILY constantly (teal next to teal next
    // to mint), which reads as correlated even though it is independent -
    // the "many neighboring segments with matching colors" report. K
    // stride-spread swatches + a collision walk guarantee that runs
    // SHARING A JUNCTION never wear the same swatch, and the stride keeps
    // consecutive swatch indices far apart in the gamut. Seed-determined,
    // order-stable.
    const K = 12;
    const STRIDE = 5; // Coprime with K: neighboring indices sit far apart.
    const vOf = (j: number): number => ((j * STRIDE) % K) / (K - 1);
    const picks = new Array<number>(walk.edges.length).fill(-1);
    const runRgb: RGB[] = new Array(walk.edges.length);
    for (const e of walk.edges) {
      const taken = new Set<number>();
      for (const vid of [e.va, e.vb]) {
        for (const nb of walk.vertices.get(vid)!.edges) {
          if (picks[nb] >= 0) taken.add(picks[nb]);
        }
      }
      let j = Math.floor(hash01(`run${e.id}`, seed) * K) % K;
      for (let t = 0; t < K && taken.has(j); t++) j = (j + 1) % K;
      picks[e.id] = j;
      runRgb[e.id] = gamutRgb(baseHue, vOf(j));
    }
    const vJ = new Map<string, RGB>();
    for (const [id, v] of walk.vertices) {
      let sr = 0;
      let sg = 0;
      let sb = 0;
      let n = 0;
      for (const eid of v.edges) {
        const times =
          walk.edges[eid].va === id && walk.edges[eid].vb === id ? 2 : 1;
        sr += runRgb[eid][0] * times;
        sg += runRgb[eid][1] * times;
        sb += runRgb[eid][2] * times;
        n += times;
      }
      vJ.set(id, n > 0 ? [sr / n, sg / n, sb / n] : gamutRgb(baseHue, 0.5));
    }
    for (const e of walk.edges) {
      // SHORT blend zones: with the generic RAMP_CTRL (2.4) a typical run
      // was ~80% ramp toward its junctions' MEAN colors, which diffused
      // every neighborhood toward a shared average - the maze rendered as
      // large same-hued fields ("neighboring segments with matching
      // colors"). Independence IS the scheme: each run must wear its own
      // color for most of its length, with just enough junction blend to
      // avoid a hard seam. junctionBlend extends these by a fixed distance.
      const span = e.ctrlB - e.ctrlA;
      const r0 = Math.min(SEG_RAMP_CTRL, span * 0.18);
      addRun({
        chain: e.chain,
        ctrlA: e.ctrlA,
        ctrlB: e.ctrlB,
        r0A: r0,
        r0B: r0,
        perLattice: perLat(e),
        flags: RUN_FLAG.RAMP_A | RUN_FLAG.RAMP_B,
        colA: vJ.get(e.va)!,
        colMid: runRgb[e.id],
        colB: vJ.get(e.vb)!,
      });
    }
    // Chains outside the walk keep a constant color.
    for (let c = 0; c < nChains; c++) {
      if (perChain[c].length === 0) {
        addRun(constRun(c, gamutRgb(baseHue, chainCoord(c)), false));
      }
    }
  }

  // Slot -> run. Uncovered stretches (an open chain beyond its walk, a
  // closed one between runs) get a constant PSEUDO run in the color of the
  // chain's first run's A end - the segment field's fallback (segs[0]).
  const slotRun = chains.map((g) => new Int32Array(g.len).fill(-1));
  for (let c = 0; c < nChains; c++) {
    const n = chains[c].len;
    const list = perChain[c];
    for (const idx of list) {
      const r = runs[idx];
      for (let s = Math.ceil(r.ctrlA - 1e-9); s < r.ctrlB - 1e-9; s++) {
        const k = chains[c].closed ? ((s % n) + n) % n : s;
        if (k >= 0 && k < n) slotRun[c][k] = idx;
      }
    }
    if (!chains[c].closed && n > 0 && slotRun[c][n - 1] < 0) {
      for (const idx of list) {
        if (Math.abs(runs[idx].ctrlB - (n - 1)) < 1e-9) slotRun[c][n - 1] = idx;
      }
    }
    let pseudo = -1;
    for (let s = 0; s < n; s++) {
      if (slotRun[c][s] >= 0) continue;
      if (pseudo < 0) {
        let first = -1;
        for (const idx of list) {
          if (first < 0 || runs[idx].ctrlA < runs[first].ctrlA) first = idx;
        }
        const src = first >= 0 ? runs[first] : null;
        const col: RGB = src ? [src.colA[0], src.colA[1], src.colA[2]] : [0.5, 0, 0];
        const gamut = src ? (src.flags & RUN_FLAG.GAMUT) !== 0 : true;
        pseudo = runs.length;
        runs.push(constRun(c, col, gamut));
      }
      slotRun[c][s] = pseudo;
    }
  }
  return { runs, slotRun, noise: false };
}

// ---- K138 STAGE 1: THE MOVEMENT RULES' LOOK -----------------------------

// What the rules paint (FabricMazeController.ruleLook): per walk run, icy
// (1) or not, and the color rule's color (-1 = exempt or icy).
export interface RuleRunLook {
  icy: Uint8Array | null;
  colors: Int8Array | null;
  mode: string; // "off" | "alternate" | "cycle" (game/color_rule.ts)
}

// A pale frost (icy runs) and the neutral grey of a run the color rule
// leaves free. Plain RGB, the same under every hue.
export const FROST_RGB: RGB = [0.86, 0.95, 1.0];
export const RULE_FREE_RGB: RGB = [0.56, 0.56, 0.58];

// Rec. 709 luma of an RGB triple (encoded values; a separation measure).
function luma(c: RGB): number {
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

// The HSL lightness at hue h, saturation s whose color has luma `target`
// (luma rises with lightness, so a bisection finds it).
function rgbAtLuma(h: number, s: number, target: number): RGB {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (luma(hslToRgb(h, s, mid)) < target) lo = mid;
    else hi = mid;
  }
  return hslToRgb(h, s, (lo + hi) / 2);
}

// The rule's colors. alternate: a light and a dark shade of the maze's hue
// (lightness alone). cycle: three hues 120 degrees apart whose lumas sit
// far apart too (light, middle, dark), so they part in grayscale.
export const ALTERNATE_LUMAS = [0.8, 0.3];
export const CYCLE_LUMAS = [0.8, 0.5, 0.22];
export function ruleColorRgb(mode: string, color: number, baseHue: number): RGB {
  const h0 = ((baseHue % 360) + 360) % 360;
  if (mode === "cycle") {
    const h = (h0 + 120 * color) % 360;
    return rgbAtLuma(h, 0.7, CYCLE_LUMAS[color] ?? 0.5);
  }
  return rgbAtLuma(h0, 0.55, ALTERNATE_LUMAS[color] ?? 0.5);
}

// The base table with the rules' looks over it: each icy walk run, and
// each run under the color rule, becomes one FLAT record (one color end
// to end, no ramps): frost, its rule color, or the free grey. Every other
// slot keeps the base scheme's record, the noise scheme's included.
export function ruleRunTable(
  base: SectionRuns,
  walk: WalkGraph,
  chains: RunChain[],
  look: RuleRunLook,
  baseHue: number
): SectionRuns {
  const runs = base.runs.slice();
  const slotRun = base.slotRun.map((a) => a.slice());
  const colorOn = look.colors !== null && look.mode !== "off";
  for (const e of walk.edges) {
    let col: RGB | null = null;
    if (look.icy && look.icy[e.id]) col = FROST_RGB;
    else if (colorOn) {
      const k = look.colors![e.id];
      col = k < 0 ? RULE_FREE_RGB : ruleColorRgb(look.mode, k, baseHue);
    }
    if (col === null) continue;
    const c = e.chain;
    const n = chains[c].len;
    const idx = runs.length;
    runs.push({
      chain: c,
      ctrlA: e.ctrlA,
      ctrlB: e.ctrlB,
      r0A: 0,
      r0B: 0,
      perLattice: 0,
      flags: 0,
      colA: col,
      colMid: col,
      colB: col,
    });
    // The slots buildSectionRuns gives this run (its half-open span, and an
    // open chain's last slot when the run ends there).
    for (let s = Math.ceil(e.ctrlA - 1e-9); s < e.ctrlB - 1e-9; s++) {
      const k = chains[c].closed ? ((s % n) + n) % n : s;
      if (k >= 0 && k < n) slotRun[c][k] = idx;
    }
    if (!chains[c].closed && n > 0 && Math.abs(e.ctrlB - (n - 1)) < 1e-9) {
      slotRun[c][n - 1] = idx;
    }
  }
  return { runs, slotRun, noise: base.noise };
}

// One constant RGB run per chain (knot mode: each strand's tint).
export function constantSectionRuns(
  chains: RunChain[],
  rgbOf: (chain: number) => RGB
): SectionRuns {
  const runs: RunSection[] = [];
  const slotRun = chains.map((g, c) => {
    const col = rgbOf(c);
    runs.push({
      chain: c,
      ctrlA: 0,
      ctrlB: g.len,
      r0A: 0,
      r0B: 0,
      perLattice: 0,
      flags: 0,
      colA: col,
      colMid: col,
      colB: col,
    });
    return new Int32Array(g.len).fill(c);
  });
  return { runs, slotRun, noise: false };
}
