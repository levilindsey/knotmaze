// FROZEN pre-G2.2 section field (src/core/section_colors.ts at G2.1,
// buildSectionField + the renderer's sectionRgbAt lookup): the reference
// the GPU run form (buildSectionRuns / knotSection) is checked against.
// Do not edit - it pins what the old per-sample bake rendered.

import { gamutRgb, type ColorScheme, type RGB } from "../../../src/core/section_colors";
import type { WalkGraph } from "../../../src/core/walk_graph";

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
const RAMP_EASE_FULL = 1.0;
// Linear pieces per eased ramp (per-vertex RGB lerps fill in between; 6
// pieces keep a smoothstep within ~1/255 per channel).
const RAMP_EASE_PIECES = 6;

// A run end's ramp length (ctrl): the base ramp `r0` plus the blend
// extension, never past the run's midpoint.
function rampLen(r0: number, span: number, extraCtrl: number): number {
  return Math.min(span / 2, r0 + extraCtrl);
}

// The blend extension in a run's ctrl units: `dist` lattice units at the
// run's own lattice-length-per-ctrl.
function extraCtrlFor(dist: number, span: number, length: number): number {
  return dist > 0 && length > 1e-9 ? (dist * span) / length : 0;
}

// Eased-ramp blend weight at ramp parameter u: linear at ease 0 (the
// historic one-piece ramp), smoothstep at ease 1.
function easeAt(u: number, ease: number): number {
  return u + (u * u * (3 - 2 * u) - u) * ease;
}

// Max gamut-coordinate span per emitted segment for schemes that sweep
// the gamut (depth, strands): ~17 degrees of hue per linear-RGB piece
// keeps the chained lerps on the hue arc.
const GAMUT_EMIT_STEP = 0.06;

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

// Emit an RGB end ramp: one straight piece at ease 0 (the historic ramp),
// else RAMP_EASE_PIECES pieces following the eased curve.
function pushRampRgb(
  segs: VSegment[],
  c0: number,
  c1: number,
  rgb0: RGB,
  rgb1: RGB,
  ease: number
): void {
  if (ease <= 0) {
    pushRgb(segs, c0, c1, rgb0, rgb1);
    return;
  }
  let prev = rgb0;
  for (let i = 1; i <= RAMP_EASE_PIECES; i++) {
    const u = i / RAMP_EASE_PIECES;
    const w = easeAt(u, ease);
    const next: RGB = [
      rgb0[0] + (rgb1[0] - rgb0[0]) * w,
      rgb0[1] + (rgb1[1] - rgb0[1]) * w,
      rgb0[2] + (rgb1[2] - rgb0[2]) * w,
    ];
    segs.push({
      c0: c0 + (c1 - c0) * ((i - 1) / RAMP_EASE_PIECES),
      c1: c0 + (c1 - c0) * u,
      rgb0: prev,
      rgb1: next,
    });
    prev = next;
  }
}

// Emit a GAMUT sweep between two coordinates, subdivided so the chained
// RGB lerps track the hue arc (see GAMUT_EMIT_STEP); `ease` shapes an end
// ramp like pushRampRgb.
function pushGamut(
  segs: VSegment[],
  c0: number,
  c1: number,
  v0: number,
  v1: number,
  baseHue: number,
  ease = 0
): void {
  const n = Math.max(
    ease > 0 ? RAMP_EASE_PIECES : 1,
    Math.ceil(Math.abs(v1 - v0) / GAMUT_EMIT_STEP)
  );
  let prev = gamutRgb(baseHue, v0);
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const next = gamutRgb(baseHue, v0 + (v1 - v0) * easeAt(t, ease));
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
// (the renderer's style.baseHue; seed % 360). `blendDist` is the
// junctionBlend param, lattice units (see RAMP_EASE_FULL's comment).
export function buildSectionFieldV1(
  scheme: ColorScheme,
  walk: WalkGraph | null,
  chainLens: number[],
  hueGroup: number[] | undefined,
  seed: number,
  baseHue: number,
  blendDist = 0
): VSegment[][] {
  const dist = Math.max(0, blendDist);
  const ease = Math.min(1, dist / RAMP_EASE_FULL);
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
      const r = rampLen(
        Math.min(RAMP_CTRL, span / 2.5),
        span,
        extraCtrlFor(dist, span, e.length)
      );
      const segs = field[e.chain];
      pushGamut(segs, e.ctrlA, e.ctrlA + r, vA, mid, baseHue, ease);
      if (e.ctrlB - r > e.ctrlA + r) {
        pushGamut(segs, e.ctrlA + r, e.ctrlB - r, mid, mid, baseHue);
      }
      pushGamut(segs, e.ctrlB - r, e.ctrlB, mid, vB, baseHue, ease);
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
    // junctionBlend extends these by a fixed distance on request.
    const r = rampLen(
      Math.min(SEG_RAMP_CTRL, span * 0.18),
      span,
      extraCtrlFor(dist, span, e.length)
    );
    const segs = field[e.chain];
    pushRampRgb(segs, e.ctrlA, e.ctrlA + r, rgbA, mid, ease);
    if (e.ctrlB - r > e.ctrlA + r) {
      pushRgb(segs, e.ctrlA + r, e.ctrlB - r, mid, mid);
    }
    pushRampRgb(segs, e.ctrlB - r, e.ctrlB, mid, rgbB, ease);
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

// The renderer's sectionRgbAt (pre-G2.2) over a chain's segments: wrapped
// lookups try ctrl and ctrl + len; uncovered stretches wear segs[0].rgb0;
// an empty list wears allback (the base color).
export function sectionRgbAtV1(
  segs: VSegment[],
  ctrl: number,
  len: number,
  fallback: RGB
): RGB {
  if (!segs || segs.length === 0) return [fallback[0], fallback[1], fallback[2]];
  for (const c of [ctrl, ctrl + len]) {
    let lo = 0;
    let hi = segs.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (segs[mid].c1 + 1e-6 < c) lo = mid + 1;
      else hi = mid;
    }
    const s = segs[lo];
    if (s && c >= s.c0 - 1e-6) {
      const t = s.c1 > s.c0 ? (c - s.c0) / (s.c1 - s.c0) : 0;
      return [
        s.rgb0[0] + (s.rgb1[0] - s.rgb0[0]) * t,
        s.rgb0[1] + (s.rgb1[1] - s.rgb0[1]) * t,
        s.rgb0[2] + (s.rgb1[2] - s.rgb0[2]) * t,
      ];
    }
  }
  return [segs[0].rgb0[0], segs[0].rgb0[1], segs[0].rgb0[2]];
}