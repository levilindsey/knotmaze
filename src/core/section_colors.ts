// P4 section coloring: assign every stretch of thread a SECTION COLOR -
// an RGB value - as piecewise-linear functions of chain ctrl. Pure
// combinatorics: schemes are deterministic from (graph, walk, seed), per
// URL-as-complete-state.
//
// THE BLENDING CONTRACT: at a junction several runs meet, and their colors
// must transition smoothly through it in every direction. Each junction
// gets ONE converged color, and every incident run ramps from its own
// color to it over the last RAMP_CTRL of ctrl - so any number of arms
// always meet in a single shared color. Schemes whose field is already
// continuous across junctions (depth) need no ramps.
//
// RGB, NOT GAMUT COORDINATES (Stage 26): segments are emitted as RGB
// endpoints and the renderer interpolates them PER VERTEX in RGB space
// (a custom shader mixes the gameplay accent on top). Two consequences:
//   - Arbitrary color pairs blend DIRECTLY (straight line through RGB -
//     a desaturated middle for near-complementary pairs is correct),
//     which is what the "segments" scheme wants: fully random unrelated
//     run colors, junctions showing just the blend of whatever meets.
//     The old 1D palette V axis swept the hue PATH between two colors,
//     so distant pairs rendered rainbow stripes - the bounded random
//     walk that used to constrain segments existed only as a workaround
//     for that axis, and is retired with it.
//   - Schemes that MEAN "sweep the gamut" between two coordinates
//     (depth's gradient, strands' bridge transitions) keep that look by
//     SUBDIVIDING at emit: a coordinate span is cut into small steps,
//     each converted through the gamut curve, so chained RGB lerps
//     follow the hue arc.

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

// One piecewise-linear piece of a chain's rgb(ctrl) function.
export interface VSegment {
  c0: number; // Ctrl span, unwrapped (sampled modulo chain length).
  c1: number;
  rgb0: RGB; // Channels in [0, 1].
  rgb1: RGB;
}

// Ramp length at each end of a discontinuous run (ctrl units; ~1.2 world).
const RAMP_CTRL = 2.4;
// Segments scheme only: much shorter junction blends (see its loop).
const SEG_RAMP_CTRL = 1.0;

// THE GAMUT: a 280-degree hue arc around the seed hue at the fabric's
// saturation/lightness - wide enough to read as distinct sections, no full
// wrap so a coordinate sweep never has a long-way-around ambiguity. This
// is the design's color space: every scheme picks its colors from it
// (coordinate v in [0, 1] -> hue), so sections always read as one family.
const GAMUT_SWEEP = 280;
// Max gamut-coordinate span per emitted segment for schemes that sweep
// the gamut (depth, strands): ~17 degrees of hue per linear-RGB piece
// keeps the chained lerps on the hue arc.
const GAMUT_EMIT_STEP = 0.06;

function hslToRgb(h: number, s: number, l: number): RGB {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

// Gamut coordinate -> RGB (shared with the renderer, which uses it to
// convert the spatial noise field per sample).
export function gamutRgb(baseHue: number, v: number): RGB {
  const h = (((baseHue + (v - 0.5) * GAMUT_SWEEP) % 360) + 360) % 360;
  return hslToRgb(h, 0.45, 0.64);
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

// Emit a straight RGB-lerp segment.
function pushRgb(
  segs: VSegment[],
  c0: number,
  c1: number,
  rgb0: RGB,
  rgb1: RGB
): void {
  segs.push({ c0, c1, rgb0, rgb1 });
}

// Emit a GAMUT sweep between two coordinates, subdivided so the chained
// RGB lerps track the hue arc (see GAMUT_EMIT_STEP).
function pushGamut(
  segs: VSegment[],
  c0: number,
  c1: number,
  v0: number,
  v1: number,
  baseHue: number
): void {
  const n = Math.max(1, Math.ceil(Math.abs(v1 - v0) / GAMUT_EMIT_STEP));
  let prev = gamutRgb(baseHue, v0);
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const next = gamutRgb(baseHue, v0 + (v1 - v0) * t);
    segs.push({
      c0: c0 + (c1 - c0) * ((i - 1) / n),
      c1: c0 + (c1 - c0) * t,
      rgb0: prev,
      rgb1: next,
    });
    prev = next;
  }
}

// Build per-chain rgb(ctrl) segment lists. `chainLens` are the physics
// chain lengths (slot counts). The "noise" scheme returns EMPTY lists -
// the renderer evaluates it spatially per sample instead (it is
// continuous everywhere, junctions included). `baseHue` anchors the gamut
// (the renderer's style.baseHue; seed % 360).
export function buildSectionField(
  scheme: ColorScheme,
  walk: WalkGraph | null,
  chainLens: number[],
  hueGroup: number[] | undefined,
  seed: number,
  baseHue: number
): VSegment[][] {
  const nChains = chainLens.length;
  const field: VSegment[][] = chainLens.map(() => []);
  if (scheme === "noise") return field;

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

  if (scheme === "mono" || !walk) {
    for (let c = 0; c < nChains; c++) {
      const rgb = gamutRgb(baseHue, chainCoord(c));
      pushRgb(field[c], 0, chainLens[c], rgb, rgb);
    }
    return field;
  }

  if (scheme === "depth") {
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
    const coordJ = new Map<string, number>();
    for (const [id, d] of dist) {
      coordJ.set(id, Number.isFinite(d) && maxD > 0 ? d / maxD : 1);
    }
    for (const e of walk.edges) {
      pushGamut(
        field[e.chain],
        e.ctrlA,
        e.ctrlB,
        coordJ.get(e.va)!,
        coordJ.get(e.vb)!,
        baseHue
      );
    }
    for (let c = 0; c < nChains; c++) {
      if (field[c].length === 0) {
        const rgb = gamutRgb(baseHue, 1);
        pushRgb(field[c], 0, chainLens[c], rgb, rgb);
      }
    }
    for (const segs of field) segs.sort((p, q) => p.c0 - q.c0);
    return field;
  }

  if (scheme === "strands") {
    // Per-thread colors; the through-thread keeps its color across each
    // junction (hosts never shift hue) and bridges carry the whole
    // transition along their own end ramps - as a GAMUT sweep, so a
    // bridge between distant thread colors walks the hue arc instead of
    // fading through grey.
    for (const e of walk.edges) {
      const vA = chainCoord(walk.vertices.get(e.va)!.chain);
      const vB = chainCoord(walk.vertices.get(e.vb)!.chain);
      const mid = chainCoord(e.chain);
      const span = e.ctrlB - e.ctrlA;
      const r = Math.min(RAMP_CTRL, span / 2.5);
      const segs = field[e.chain];
      pushGamut(segs, e.ctrlA, e.ctrlA + r, vA, mid, baseHue);
      pushGamut(segs, e.ctrlA + r, e.ctrlB - r, mid, mid, baseHue);
      pushGamut(segs, e.ctrlB - r, e.ctrlB, mid, vB, baseHue);
    }
    for (let c = 0; c < nChains; c++) {
      if (field[c].length === 0) {
        const rgb = gamutRgb(baseHue, chainCoord(c));
        pushRgb(field[c], 0, chainLens[c], rgb, rgb);
      }
    }
    for (const segs of field) segs.sort((p, q) => p.c0 - q.c0);
    return field;
  }

  // segments: a FULLY RANDOM gamut color per run - adjacent runs have
  // zero association (pure hash; the old bounded-random-walk locality
  // machinery is retired, see the header). Each junction converges to
  // the RGB MEAN of its incident runs' colors (self-loops touch twice):
  // a channel-wise mean, NOT a coordinate mean - hue coordinates do not
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
    vJ.set(
      id,
      n > 0
        ? [sr / n, sg / n, sb / n]
        : gamutRgb(baseHue, 0.5)
    );
  }
  for (const e of walk.edges) {
    const rgbA = vJ.get(e.va)!;
    const rgbB = vJ.get(e.vb)!;
    const mid = runRgb[e.id];
    const span = e.ctrlB - e.ctrlA;
    // SHORT blend zones: with the generic RAMP_CTRL (2.4) a typical run
    // was ~80% ramp toward its junctions' MEAN colors, which diffused
    // every neighborhood toward a shared average - the maze rendered as
    // large same-hued fields ("neighboring segments with matching
    // colors"). Independence IS the scheme: each run must wear its own
    // color for most of its length, with just enough junction blend to
    // avoid a hard seam.
    const r = Math.min(SEG_RAMP_CTRL, span * 0.18);
    const segs = field[e.chain];
    pushRgb(segs, e.ctrlA, e.ctrlA + r, rgbA, mid);
    pushRgb(segs, e.ctrlA + r, e.ctrlB - r, mid, mid);
    pushRgb(segs, e.ctrlB - r, e.ctrlB, mid, rgbB);
  }
  // Chains (or chain stretches) outside the walk keep a constant color.
  for (let c = 0; c < nChains; c++) {
    if (field[c].length === 0) {
      const rgb = gamutRgb(baseHue, chainCoord(c));
      pushRgb(field[c], 0, chainLens[c], rgb, rgb);
    }
  }
  for (const segs of field) segs.sort((p, q) => p.c0 - q.c0);
  return field;
}
