// K115 stage 9: the glyph builder behind the #glyphs2 switch. It lays a
// word out from the authored cubic glyphs (glyph_data.ts) and builds the
// TangleGraph straight from the exact geometry: no planarisation, no
// Hershey path. Hershey stays the path for any text with a character
// outside the set (the caller counts the fallback).
//
// Graph shape (the Hershey builder's conventions, so attachTitle and the
// walk graph read it unchanged):
// - strands[0] is the whole body, mentr_a (lead-in tail) to mexit_a
//   (lead-out tail), passing through every spur JUNCTION;
// - each spur is its own strand, from its junction to its END tip;
// - each float is a decorative strand with two END tips;
// - every strand is pinned; crossings are shared CROSSING nodes on the
//   Bezier; each glyph after the first starts at a `waypoint` (its entry,
//   never a crossing).
// Layer 2 (glyphs doc section 9): nodes at the crossings, ends, junctions,
// waypoints and curvature maxima (R < 1 LU), elsewhere uniform per run at
// <= min(0.5 LU, 0.6 R); each edge carries its mid-arc point (`mid`).
// Pen keys (K558): the body's arc length from mentr_a; a spur as the pen
// leaves its junction (PEN_EPS per GU); floats after the body, glyph by
// glyph, FLOAT_GAP apart. The caller runs assignPenOrder.

import { NODE_TYPE, type Edge, type Node, type Strand, type TangleGraph } from "../types";
import type { CubicPath, Glyph, Pt } from "./glyph_types";
import {
  K_STEPS,
  bezAt,
  bezAtK,
  bezCurvature,
  bezDeriv,
  findCrossings,
  segCount,
  segOf,
  type CrossingHit,
  type SegRef,
} from "./glyph_eval";
import { A_LANDED, FORK_VARIANTS, GLYPHS, LEAD_STEPS, glyphI } from "./glyph_data";
import { knotsToPath } from "./glyph_knots";

export const GU_PER_XH = 72;
const PEN_EPS = 0.00001;
const FLOAT_GAP = 8;
/** A space: the gap between the exit and the next entry, in GU. */
const SPACE_GU = 40;

export interface GlyphBuildOpts {
  xHeight: number;
  /** Fork measurement: the k-th i takes FORK_VARIANTS[k % 6]. */
  forks?: boolean;
  /** Fork measurement: every i takes this FORK_VARIANTS angle. */
  fork?: number;
  /** Stage 9 kill criterion: every a takes the landed J (A_LANDED). */
  aLanded?: boolean;
  /**
   * K580: build a tangent spur's tapered root (default true; `notaper`
   * turns it off, giving stage 9's form).
   */
  taper?: boolean;
  /**
   * K580: where the root parts into the two strokes, as their centerline
   * separation in LU (default TAPER_PART_LU: the thread width, where the
   * strokes' inner edges meet).
   */
  taperPart?: number;
  /**
   * K643, probe only (`#glyphs2=bulge<b>`): a bump of this many LU added
   * to each side of every tapered root's width (tangentRoot's `bulgeGu`),
   * to calibrate the lint's bulge bound on stills. Absent: no change.
   */
  taperBulge?: number;
  /**
   * K643, probe only (`#glyphs2=crotch<L>`): replaces each glyph before it
   * is placed (text_graph passes glyph_inject's widenCrotch). Absent: no
   * change.
   */
  glyphFor?: (g: Glyph) => Glyph;
}

/** K580: the default part point (LU): the default thread width (0.52). */
export const TAPER_PART_LU = 0.52;
/**
 * K580 stage 2: the thread width (LU) a root's edges are fitted to (the
 * default thread width; the builder does not see the `tw` param).
 */
export const TAPER_THREAD_LU = 0.52;
/** K580: steps of the root's taper profile (Strand.taper.sep). */
export const TAPER_PROFILE_N = 16;
/** K580: Hermite segments in a root. */
const ROOT_SEGS = 4;
/** K580 stage 2: medial samples a root's width is tabulated at. */
const ROOT_TABLE_N = 64;

/**
 * K580: a tangent spur's tapered root (GU, y up), between the two strokes
 * that meet at J: the arriving stroke C (the body walked back from J) and
 * the departing stroke O (the body walked on from J). Stage 2 pairs them
 * by the MEDIAL AXIS: a medial point M sits r from both strokes, touching
 * C at C(a) and O at O(b), a and b being arcs from J. The root is
 * parameterized by a, C's medial foot arc. R is the medial point where
 * 2r = the part distance: at the default part, where the strokes' inner
 * edges meet, so the two ribbons never overlap past R.
 *
 * The centerline is the medial axis. The ribbon is symmetric about it, but
 * the strokes curve differently (at the a's J, O turns down hard while C
 * runs straight), so along the centerline's normal the two strokes' outer
 * edges are not equally far. The half-width is the NEARER one: that side's
 * edge lies on its stroke's outer edge, and the other side sinks into its
 * stroke's ribbon by the difference (the lint's inset, 0.05 LU at most on
 * the a), so the outline never leaves the strokes. A width that reached
 * both edges bulged 0.03 LU out of one stroke; moving the centerline to the
 * edges' midline diverged at R, where the edges' feet jump.
 */
export interface TangentRoot {
  /** The root's cubic path, from the part point R to the junction J. */
  path: Pt[];
  /** C's medial foot arc at R (GU): the root runs from a = aR (R) to a = 0 (J). */
  aR: number;
  /** O's medial foot arc at R (GU). */
  bR: number;
  /**
   * The root's width beyond normal at parameter a (GU): the ribbon's
   * half-width there is h + sepAt(a) / 2, the distance along the root's
   * normal to the nearer stroke's outer edge (the other side lies inside
   * its stroke's ribbon). 0 at J.
   */
  sepAt: (a: number) => number;
  /** The medial radius at parameter a (GU): the strokes' gap is 2r. */
  rAt: (a: number) => number;
  /**
   * Where the root's edges lie at parameter a: the arc from J (GU) along C
   * (footC) and along O (footO) of each stroke's nearest point to the
   * drawn edge on its side. 0 at J. The side facing C (sideC) lies along
   * C, the other along O.
   */
  footC: (a: number) => number;
  footO: (a: number) => number;
  /**
   * The side of the root that faces C: +1 when C lies LEFT of the root's
   * direction R -> J in GU (y up), -1 right; O faces the other side. The
   * graph flips y, so in graph units (y down) the sides swap.
   */
  sideC: 1 | -1;
  /** Cosine of the angle between the strokes' directions away from J at R's feet. */
  cosR: number;
}

/**
 * K580: the root of a tangent spur at body point `at` (a multiple of 3).
 * The body arrives at J (body[at]) and leaves it back along the same
 * tangent line (a cusp). Stage 2 pairs the strokes by the medial axis (the
 * equal-arc pairing of stage 1 skewed the chord: the outline left the
 * strokes and the ribbons overlapped past R). For each foot arc a on C,
 * the medial point is M = C(a) + r n (n: C's normal toward O) with r =
 * the distance from M to O (Newton inside a bracket; O's nearest point by
 * a dense scan and a ternary refinement). The centerline is fit through
 * the medial points as ROOT_SEGS Hermite cubics in a, G1 at J with the
 * arrival tangent (the spur's). Then, at each table sample, along the
 * fitted path's normal, the half-width where the line leaves each stroke's
 * ribbon (more than h from the stroke; stepped out from the medial radius,
 * then bisected) on that stroke's side; the ribbon takes the smaller
 * (TangentRoot's comment). `threadGu` is the thread width the edges are
 * fitted to. `bulgeGu` (K643, probe only) adds a bump of that many GU to
 * each side of the width, centred halfway along the root.
 */
export function tangentRoot(
  body: readonly Pt[],
  at: number,
  partGu: number,
  threadGu: number = partGu,
  bulgeGu = 0
): TangentRoot | null {
  const bp = body as Pt[];
  const tab = arcTable(bp);
  const cum = tab.cum;
  const total = cum[cum.length - 1];
  const iJ = (at / 3) * K_STEPS;
  if (!(iJ > 0 && iJ < cum.length - 1)) return null;
  const arcJ = cum[iJ];
  const h = threadGu / 2;
  const rPart = partGu / 2;
  // Only the crotch's neighbourhood: never a far stroke or the next glyph.
  const win = 8 * Math.max(partGu, threadGu);
  const aMax = Math.min(arcJ, win);
  const bMax = Math.min(total - arcJ, win);
  if (!(aMax > 0) || !(bMax > 0)) return null;
  // O's dense samples, from J to the window's end.
  let iW = iJ;
  while (iW + 1 < cum.length && cum[iW] < arcJ + bMax) iW++;
  const ox: number[] = [];
  const oy: number[] = [];
  for (let i = iJ; i <= iW; i++) {
    const q = posAtP(bp, i / K_STEPS);
    ox.push(q[0]);
    oy.push(q[1]);
  }
  interface Near {
    d: number;
    fx: number;
    fy: number;
    p: number;
  }
  // C's dense samples, from the window's start to J.
  let iC = iJ;
  while (iC > 0 && cum[iC] > arcJ - aMax) iC--;
  const cxs: number[] = [];
  const cys: number[] = [];
  for (let i = iC; i <= iJ; i++) {
    const q = posAtP(bp, i / K_STEPS);
    cxs.push(q[0]);
    cys.push(q[1]);
  }
  /** The nearest point to (x, y) of a stroke's dense samples (body step i0 + i). */
  const nearIn = (xs: number[], ys: number[], i0: number, x: number, y: number): Near => {
    let best = Infinity;
    let bi = 0;
    for (let i = 0; i < xs.length; i++) {
      const dx = xs[i] - x;
      const dy = ys[i] - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < best) {
        best = d2;
        bi = i;
      }
    }
    let lo = (i0 + Math.max(0, bi - 1)) / K_STEPS;
    let hi = (i0 + Math.min(xs.length - 1, bi + 1)) / K_STEPS;
    for (let it = 0; it < 48; it++) {
      const m1 = lo + (hi - lo) / 3;
      const m2 = hi - (hi - lo) / 3;
      const q1 = posAtP(bp, m1);
      const q2 = posAtP(bp, m2);
      const d1 = (q1[0] - x) * (q1[0] - x) + (q1[1] - y) * (q1[1] - y);
      const d2 = (q2[0] - x) * (q2[0] - x) + (q2[1] - y) * (q2[1] - y);
      if (d1 <= d2) hi = m2;
      else lo = m1;
    }
    const p = (lo + hi) / 2;
    const f = posAtP(bp, p);
    const dx = f[0] - x;
    const dy = f[1] - y;
    return { d: Math.sqrt(dx * dx + dy * dy), fx: f[0], fy: f[1], p };
  };
  const nearO = (x: number, y: number): Near => nearIn(ox, oy, iJ, x, y);
  const nearC = (x: number, y: number): Near => nearIn(cxs, cys, iC, x, y);
  /** C at foot arc a > 0: the point and the body's forward derivative. */
  const cAt = (a: number): { c: [number, number]; d: [number, number] } => {
    const [seg, t] = splitP(bp, pAtArc(tab, arcJ - a));
    const sg = segOf(bp, seg);
    return { c: bezAt(sg, t), d: bezDeriv(sg, t) };
  };
  // Which side of C the other stroke lies on (constant: they meet only at J).
  const ref = cAt(Math.min(aMax, partGu));
  const qr = nearO(ref.c[0], ref.c[1]);
  const sgn = ref.d[0] * (qr.fy - ref.c[1]) - ref.d[1] * (qr.fx - ref.c[0]) > 0 ? 1 : -1;
  const J = bp[at];
  interface Medial {
    x: number;
    y: number;
    r: number;
    /** O's foot arc. */
    b: number;
  }
  const medial = (a: number): Medial => {
    if (!(a > 0)) return { x: J[0], y: J[1], r: 0, b: 0 };
    const { c, d } = cAt(a);
    const l = Math.sqrt(d[0] * d[0] + d[1] * d[1]);
    const nx = (-d[1] / l) * sgn;
    const ny = (d[0] / l) * sgn;
    // f(r) = |c + r n, O| - r: positive at r = 0, falls through 0 at M,
    // and f(2 d0) <= 0 while n is within 75 degrees of the direction to
    // O's nearest point (d0 away).
    const q0 = nearO(c[0], c[1]);
    let lo = 0;
    let hi = 2 * q0.d;
    let r = q0.d / 2;
    for (let it = 0; it < 60; it++) {
      const px = c[0] + r * nx;
      const py = c[1] + r * ny;
      const q = nearO(px, py);
      const f = q.d - r;
      if (f > 0) lo = r;
      else hi = r;
      // d|P, O|/dr = n . (P - F) / |P - F|.
      const g = q.d > 0 ? ((px - q.fx) * nx + (py - q.fy) * ny) / q.d - 1 : -1;
      let rn = g < 0 ? r - f / g : (lo + hi) / 2;
      if (!(rn > lo && rn < hi)) rn = (lo + hi) / 2;
      const done = Math.abs(rn - r) <= 1e-10 * (1 + r);
      r = rn;
      if (done) break;
    }
    const x = c[0] + r * nx;
    const y = c[1] + r * ny;
    const q = nearO(x, y);
    return { x, y, r, b: arcAtP(tab, q.p) - arcJ };
  };
  // R: the medial radius reaches partGu / 2. Step out from J to a bracket,
  // then bisect (r grows away from J).
  let lo = 0;
  let hi = Math.min(aMax, partGu / 2);
  while (medial(hi).r < rPart) {
    if (hi >= aMax) return null;
    lo = hi;
    hi = Math.min(aMax, hi * 1.5);
  }
  for (let it = 0; it < 50; it++) {
    const mid = (lo + hi) / 2;
    if (medial(mid).r < rPart) lo = mid;
    else hi = mid;
  }
  const aR = (lo + hi) / 2;
  // The table, J (i = 0) to R (i = N) at a_i = aR i / N: the medial radius
  // and the medial points (the edge midline's first guess).
  const N = ROOT_TABLE_N;
  const da = aR / N;
  const tr: number[] = [];
  const tb: number[] = [];
  const qx: number[] = [];
  const qy: number[] = [];
  for (let i = 0; i <= N; i++) {
    const m = medial(da * i);
    tr.push(m.r);
    tb.push(m.b);
    qx.push(m.x);
    qy.push(m.y);
  }
  // At J the root runs along the arrival tangent (the spur's).
  const ed = bezDeriv(segOf(bp, at / 3 - 1), 1);
  const el = Math.sqrt(ed[0] * ed[0] + ed[1] * ed[1]);
  const tJ: [number, number] = [ed[0] / el, ed[1] / el];
  // O's foot at R and its direction there (for cosR).
  const oq = nearO(qx[N], qy[N]);
  const [os, ot] = splitP(bp, oq.p);
  const od = bezDeriv(segOf(bp, os), ot);
  /** dQ/d(-a) at sample i of (px, py) (second order; along tJ at J). */
  const D = (px: number[], py: number[], i: number): [number, number] => {
    if (i === N) return [(-3 * px[N] + 4 * px[N - 1] - px[N - 2]) / (2 * da), (-3 * py[N] + 4 * py[N - 1] - py[N - 2]) / (2 * da)];
    if (i > 0) return [(px[i - 1] - px[i + 1]) / (2 * da), (py[i - 1] - py[i + 1]) / (2 * da)];
    const x = (3 * px[0] - 4 * px[1] + px[2]) / (2 * da);
    const y = (3 * py[0] - 4 * py[1] + py[2]) / (2 * da);
    const sp = Math.sqrt(x * x + y * y);
    return [tJ[0] * sp, tJ[1] * sp];
  };
  const step = N / ROOT_SEGS;
  const dk = aR / ROOT_SEGS;
  /** The centerline through samples (px, py): ROOT_SEGS Hermite cubics, R to J. */
  const build = (px: number[], py: number[]): Pt[] => {
    const path: Pt[] = [[px[N], py[N]]];
    for (let k = 0; k < ROOT_SEGS; k++) {
      const i0 = N - k * step;
      const i1 = i0 - step;
      const d0 = D(px, py, i0);
      const d1 = D(px, py, i1);
      const p1: [number, number] = i1 === 0 ? [J[0], J[1]] : [px[i1], py[i1]];
      path.push([px[i0] + (d0[0] * dk) / 3, py[i0] + (d0[1] * dk) / 3]);
      path.push([p1[0] - (d1[0] * dk) / 3, p1[1] - (d1[1] * dk) / 3]);
      path.push(p1);
    }
    return path;
  };
  const cR = cAt(aR);
  /** +1 when C lies left of the root's direction at R (toward J). */
  const sideOf = (px: number[], py: number[]): 1 | -1 => {
    const dR = D(px, py, N);
    return -dR[1] * (cR.c[0] - px[N]) + dR[0] * (cR.c[1] - py[N]) > 0 ? 1 : -1;
  };
  interface Sides {
    /** The drawn point and left normal at each table sample. */
    px: number[];
    py: number[];
    nx: number[];
    ny: number[];
    /** Half-widths where the normal line leaves C's ribbon (its side) and O's. */
    wC: number[];
    wO: number[];
  }
  /**
   * Along the drawn normal at each table sample (the path at p = (N - i) /
   * step, where the renderer's arc steps and the lint read sepAt), the
   * half-width at which the line leaves each stroke's ribbon: C's on C's
   * side, O's on the other. From the medial radius (inside that ribbon)
   * outward in steps to the first point more than h from the stroke, then
   * bisection.
   */
  const sides = (path: Pt[], sC: number): Sides => {
    const s: Sides = { px: [], py: [], nx: [], ny: [], wC: [], wO: [] };
    const exit = (near: (x: number, y: number) => Near, x: number, y: number, ux: number, uy: number, w0: number): number => {
      const out = (w: number): boolean => near(x + ux * w, y + uy * w).d > h;
      let lo = w0;
      let hi = w0 + h / 8;
      while (!out(hi)) {
        lo = hi;
        hi += h / 8;
        if (hi > w0 + 4 * h) return hi;
      }
      for (let it = 0; it < 40; it++) {
        const m = (lo + hi) / 2;
        if (out(m)) hi = m;
        else lo = m;
      }
      return (lo + hi) / 2;
    };
    for (let i = 0; i <= N; i++) {
      const p = (N - i) / step;
      const k = Math.min(ROOT_SEGS - 1, Math.floor(p));
      const sg = segOf(path, k);
      const q = bezAt(sg, p - k);
      const d = bezDeriv(sg, p - k);
      const l = Math.sqrt(d[0] * d[0] + d[1] * d[1]);
      const ux = -d[1] / l;
      const uy = d[0] / l;
      s.px.push(q[0]);
      s.py.push(q[1]);
      s.nx.push(ux);
      s.ny.push(uy);
      s.wC.push(i === 0 ? h : exit(nearC, q[0], q[1], ux * sC, uy * sC, tr[i]));
      s.wO.push(i === 0 ? h : exit(nearO, q[0], q[1], -ux * sC, -uy * sC, tr[i]));
    }
    return s;
  };
  const path = build(qx, qy);
  const sC = sideOf(qx, qy);
  const sd = sides(path, sC);
  // The ribbon takes the narrower side: its outline never leaves the
  // strokes' ribbons; the other side sinks into its stroke by the
  // difference (the lint reports it as the inset). Shifting the samples
  // toward the edges' midline and refitting was tried (one pass, damped
  // passes): at xh 2, where O's turn radius is about twice h, it broke
  // the taper's monotone rise.
  const hw = sd.wC.map((w, i) => (i === 0 ? h : Math.min(w, sd.wO[i])));
  const ts = hw.map((w) => 2 * (w - h));
  // K643, probe only: the injected bump, (1 - x^2)^2 over the middle half
  // of the root (x from -1 to 1), b GU a side at its peak.
  if (bulgeGu > 0) {
    for (let i = 1; i < N; i++) {
      const x = (4 * i) / N - 2;
      if (x > -1 && x < 1) ts[i] += 2 * bulgeGu * (1 - x * x) * (1 - x * x);
    }
  }
  // The stroke points under each edge (arcs from J), for paint.
  const fc: number[] = [];
  const fo: number[] = [];
  for (let i = 0; i <= N; i++) {
    if (i === 0) {
      fc.push(0);
      fo.push(0);
      continue;
    }
    const ex = sd.px[i] + sd.nx[i] * sC * hw[i];
    const ey = sd.py[i] + sd.ny[i] * sC * hw[i];
    fc.push(arcJ - arcAtP(tab, nearC(ex, ey).p));
    const ox2 = sd.px[i] - sd.nx[i] * sC * hw[i];
    const oy2 = sd.py[i] - sd.ny[i] * sC * hw[i];
    fo.push(arcAtP(tab, nearO(ox2, oy2).p) - arcJ);
  }
  const lerp = (v: number[], a: number): number => {
    const x = Math.max(0, Math.min(N, (a / aR) * N));
    const i = Math.min(N - 1, Math.floor(x));
    return v[i] + (v[i + 1] - v[i]) * (x - i);
  };
  // The strokes' directions away from J at R's medial feet.
  const cl = Math.sqrt(cR.d[0] * cR.d[0] + cR.d[1] * cR.d[1]);
  const ol = Math.sqrt(od[0] * od[0] + od[1] * od[1]);
  const cosR = (-cR.d[0] * od[0] - cR.d[1] * od[1]) / (cl * ol);
  return {
    path,
    aR,
    bR: tb[N],
    sepAt: (a) => lerp(ts, a),
    rAt: (a) => lerp(tr, a),
    footC: (a) => lerp(fc, a),
    footO: (a) => lerp(fo, a),
    sideC: sC,
    cosR,
  };
}

export interface GlyphBuildStats {
  ends: number;
  junctions: number;
  crossings: number;
  spurs: number;
  floats: number;
  /** Crossings whose Newton refinement failed to converge. */
  unconverged: number;
  nodes: number;
}

export interface GlyphBuild {
  graph: TangleGraph;
  edgePen: Map<string, [number, number]>;
  stats: GlyphBuildStats;
}

/** True when every character of `text` is in the glyph set (or a space). */
export function glyphSetCovers(text: string): boolean {
  let any = false;
  for (const ch of text) {
    if (ch === " ") continue;
    if (!GLYPHS.has(ch)) return false;
    any = true;
  }
  return any;
}

// A placed path: GU, y up.
interface PathRec {
  kind: "body" | "spur" | "float";
  path: Pt[];
  /** Spur: the body point index of its junction. */
  junction: number;
  glyph: number;
  /** K580: the spur's authored def says its junction is a tangent join. */
  tangent?: boolean;
  /** K580: the tapered root this spur's path starts with (its first
   *  `segs` segments, R to J). */
  root?: TangentRoot & { segs: number };
}

// A point on a path the node chain must pass through.
interface Forced {
  p: number; // seg + t
  kind: "start" | "end" | "junction" | "waypoint" | "crossing" | "kmax" | "root";
  id?: string; // shared node id (crossings, junctions)
}

function appendPath(into: Pt[], path: readonly Pt[]): void {
  for (let i = into.length === 0 ? 0 : 1; i < path.length; i++) into.push(path[i]);
}

function place(path: CubicPath, dx: number, dy: number): Pt[] {
  return path.map((p) => [p[0] + dx, p[1] + dy] as Pt);
}

function sameDir(a: Pt, b: Pt): boolean {
  return a[0] * b[1] - a[1] * b[0] === 0 && a[0] * b[0] + a[1] * b[1] > 0;
}

/** A straight run of `steps` primitive steps along `dir`, ending at (or
 *  starting from) `at`. */
function tail(at: Pt, dir: Pt, steps: number, before: boolean): Pt[] {
  const a: Pt = before ? [at[0] - dir[0] * steps, at[1] - dir[1] * steps] : at;
  const b: Pt = before ? at : [at[0] + dir[0] * steps, at[1] + dir[1] * steps];
  const h = Math.max(1, Math.floor(steps / 3));
  return knotsToPath([
    [a[0], a[1], dir[0], dir[1], 0, h],
    [b[0], b[1], dir[0], dir[1], h, 0],
  ]);
}

/** A connector cubic between mismatched tangents (or across a space). */
function connector(a: Pt, da: Pt, b: Pt, db: Pt): Pt[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const d = Math.sqrt(dx * dx + dy * dy);
  const la = Math.sqrt(da[0] * da[0] + da[1] * da[1]);
  const lb = Math.sqrt(db[0] * db[0] + db[1] * db[1]);
  const ha = Math.max(1, Math.round(d / 3 / la));
  const hb = Math.max(1, Math.round(d / 3 / lb));
  return knotsToPath([
    [a[0], a[1], da[0], da[1], 0, ha],
    [b[0], b[1], db[0], db[1], hb, 0],
  ]);
}

// Per path: the dense cumulative arc length (K_STEPS chords per segment).
interface ArcTable {
  path: Pt[];
  cum: Float64Array;
  kappa: Float64Array;
}

function arcTable(path: Pt[]): ArcTable {
  const n = segCount(path);
  const cum = new Float64Array(n * K_STEPS + 1);
  const kappa = new Float64Array(n * K_STEPS + 1);
  let acc = 0;
  let prev: [number, number] | null = null;
  for (let s = 0; s < n; s++) {
    const c = segOf(path, s);
    for (let k = s === 0 ? 0 : 1; k <= K_STEPS; k++) {
      const p = bezAtK(c, k);
      if (prev) {
        const dx = p[0] - prev[0];
        const dy = p[1] - prev[1];
        acc += Math.sqrt(dx * dx + dy * dy);
      }
      const gi = s * K_STEPS + k;
      cum[gi] = acc;
      kappa[gi] = bezCurvature(c, k / K_STEPS);
      prev = p;
    }
  }
  return { path, cum, kappa };
}

function splitP(path: Pt[], p: number): [number, number] {
  const n = segCount(path);
  let seg = Math.floor(p);
  if (seg >= n) seg = n - 1;
  if (seg < 0) seg = 0;
  return [seg, p - seg];
}

function posAtP(path: Pt[], p: number): [number, number] {
  const [seg, t] = splitP(path, p);
  return bezAt(segOf(path, seg), t);
}

function arcAtP(tab: ArcTable, p: number): number {
  const [seg, t] = splitP(tab.path, p);
  const c = segOf(tab.path, seg);
  let k = Math.floor(t * K_STEPS);
  if (k >= K_STEPS) k = K_STEPS - 1;
  const base = bezAtK(c, k);
  const q = bezAt(c, t);
  const dx = q[0] - base[0];
  const dy = q[1] - base[1];
  return tab.cum[seg * K_STEPS + k] + Math.sqrt(dx * dx + dy * dy);
}

function pAtArc(tab: ArcTable, L: number): number {
  const cum = tab.cum;
  let lo = 0;
  let hi = cum.length - 1;
  if (L <= 0) return 0;
  if (L >= cum[hi]) return hi / K_STEPS;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= L) lo = mid;
    else hi = mid;
  }
  const span = cum[hi] - cum[lo];
  const f = span > 0 ? (L - cum[lo]) / span : 0;
  return (lo + f) / K_STEPS;
}

function maxKappa(tab: ArcTable, L0: number, L1: number): number {
  let m = 0;
  for (let i = 0; i < tab.cum.length; i++) {
    if (tab.cum[i] < L0 || tab.cum[i] > L1) continue;
    const k = Math.abs(tab.kappa[i]);
    if (k > m) m = k;
  }
  return m;
}

export function buildGlyphGraph(text: string, opts: GlyphBuildOpts): GlyphBuild | null {
  if (!glyphSetCovers(text)) return null;
  const xh = opts.xHeight > 0 ? opts.xHeight : 3;
  const sc = xh / GU_PER_XH;
  const guPerLu = GU_PER_XH / xh;

  // --- Layout (GU, y up). ---
  const body: Pt[] = [];
  const spurs: PathRec[] = [];
  const floats: PathRec[] = [];
  const entryIdx: number[] = []; // body point index of each glyph's entry
  let prevExit: { at: Pt; dir: Pt } | null = null;
  let pendingSpace = false;
  let iCount = 0;
  let glyphNo = 0;
  for (const ch of text) {
    if (ch === " ") {
      pendingSpace = true;
      continue;
    }
    let g: Glyph = GLYPHS.get(ch)!;
    if (ch === "a" && opts.aLanded) g = A_LANDED;
    if (ch === "i" && (opts.forks || opts.fork !== undefined)) {
      const f = opts.fork !== undefined ? FORK_VARIANTS.find((v) => v === opts.fork) : FORK_VARIANTS[iCount % FORK_VARIANTS.length];
      g = glyphI(f ?? 30);
      iCount++;
    }
    if (opts.glyphFor) g = opts.glyphFor(g);
    let dx: number;
    let dy: number;
    if (!prevExit) {
      dx = 0;
      dy = 0;
      appendPath(body, tail(g.entry.at, g.entry.dir, LEAD_STEPS, true));
    } else if (!pendingSpace && sameDir(prevExit.dir, g.entry.dir)) {
      dx = prevExit.at[0] - g.entry.at[0];
      dy = prevExit.at[1] - g.entry.at[1];
    } else {
      const gap = pendingSpace ? SPACE_GU : SPACE_GU / 2;
      dx = prevExit.at[0] + gap - g.entry.at[0];
      dy = 0;
      const at: Pt = [g.entry.at[0] + dx, g.entry.at[1] + dy];
      appendPath(body, connector(prevExit.at, prevExit.dir, at, g.entry.dir));
    }
    pendingSpace = false;
    const start = body.length - 1;
    entryIdx.push(start);
    appendPath(body, place(g.body, dx, dy));
    for (const s of g.spurs) {
      spurs.push({
        kind: "spur",
        path: place(s.path, dx, dy),
        junction: start + s.at,
        glyph: glyphNo,
        ...(s.tangent ? { tangent: true } : {}),
      });
    }
    for (const f of g.floats) {
      floats.push({ kind: "float", path: place(f, dx, dy), junction: -1, glyph: glyphNo });
    }
    prevExit = {
      at: [g.exit.at[0] + dx, g.exit.at[1] + dy],
      dir: g.exit.dir,
    };
    glyphNo++;
  }
  if (!prevExit) return null;
  appendPath(body, tail(prevExit.at, prevExit.dir, LEAD_STEPS, false));

  // K580: a tangent spur starts with its tapered root (R to J).
  if (opts.taper !== false) {
    const partGu = (opts.taperPart ?? TAPER_PART_LU) * guPerLu;
    for (const r of spurs) {
      if (!r.tangent) continue;
      const root = tangentRoot(body, r.junction, partGu, TAPER_THREAD_LU * guPerLu, (opts.taperBulge ?? 0) * guPerLu);
      if (!root) continue;
      const path = root.path.slice();
      appendPath(path, r.path);
      r.path = path;
      r.root = { ...root, segs: segCount(root.path) };
    }
  }

  const paths: PathRec[] = [
    { kind: "body", path: body, junction: -1, glyph: -1 },
    ...spurs,
    ...floats,
  ];

  // --- Crossings. ---
  const segs: SegRef[] = [];
  paths.forEach((r, pi) => {
    for (let s = 0; s < segCount(r.path); s++) {
      segs.push({ path: pi, seg: s, ctrl: segOf(r.path, s) });
    }
  });
  const skip = (a: SegRef, b: SegRef): boolean => {
    if (a.path === b.path) return Math.abs(a.seg - b.seg) <= 1;
    // A spur's first segment against the body segments at its junction.
    for (const [x, y] of [
      [a, b],
      [b, a],
    ]) {
      const r = paths[x.path];
      if (r.kind === "spur" && y.path === 0) {
        const js = r.junction / 3;
        // K580: a root and the spur's first segment touch the body only
        // at J, where all three run tangent.
        const first = r.root ? r.root.segs : 0;
        if (x.seg <= first && (y.seg === js || y.seg === js - 1)) return true;
      }
    }
    return false;
  };
  const rawHits = findCrossings(segs, skip);
  const hits: CrossingHit[] = [];
  for (const h of rawHits) {
    const dup = hits.some(
      (o) =>
        o.a === h.a &&
        o.b === h.b &&
        Math.abs(o.s - h.s) < 1e-6 &&
        Math.abs(o.t - h.t) < 1e-6
    );
    if (!dup) hits.push(h);
  }
  let unconverged = 0;
  for (const h of hits) if (!h.converged) unconverged++;

  // --- Forced points per path. ---
  const forced: Forced[][] = paths.map((r) => [
    { p: 0, kind: "start" as const },
    { p: segCount(r.path), kind: "end" as const },
  ]);
  for (let gi = 1; gi < entryIdx.length; gi++) {
    forced[0].push({ p: entryIdx[gi] / 3, kind: "waypoint" });
  }
  spurs.forEach((s, si) => {
    const id = `tj${si}`;
    forced[0].push({ p: s.junction / 3, kind: "junction", id });
    if (s.root) {
      // K580: the root's start R is a TURN (the walk never stops there);
      // J sits mid-strand.
      forced[1 + si][0] = { p: 0, kind: "root" };
      forced[1 + si].push({ p: s.root.segs, kind: "junction", id });
    } else {
      forced[1 + si][0] = { p: 0, kind: "junction", id };
    }
  });
  hits.forEach((h, hi) => {
    const id = `tx${hi}`;
    forced[h.a.path].push({ p: h.a.seg + h.s, kind: "crossing", id });
    forced[h.b.path].push({ p: h.b.seg + h.t, kind: "crossing", id });
  });

  const tabs = paths.map((r) => arcTable(r.path));
  // Curvature maxima where R < 1 LU.
  paths.forEach((_r, pi) => {
    const tab = tabs[pi];
    const kap = tab.kappa;
    for (let i = 1; i + 1 < kap.length; i++) {
      const k = Math.abs(kap[i]);
      if (k * guPerLu <= 1) continue;
      if (k > Math.abs(kap[i - 1]) && k >= Math.abs(kap[i + 1])) {
        forced[pi].push({ p: i / K_STEPS, kind: "kmax" });
      }
    }
  });

  // --- Node chains. ---
  const nodePos = new Map<string, [number, number]>(); // GU, y up
  const nodeType = new Map<string, Node["type"]>();
  const waypoints = new Set<string>();
  // K580: tapered roots' start nodes (degree-1 TURNs).
  const rootStarts = new Set<string>();
  let nextNode = 0;
  const freshId = (): string => `tn${nextNode++}`;
  interface ChainNode {
    id: string;
    arc: number;
  }
  const chains: ChainNode[][] = [];
  const hmax = 0.5 * guPerLu;
  paths.forEach((r, pi) => {
    const tab = tabs[pi];
    const total = tab.cum[tab.cum.length - 1];
    const minSep = 0.2 * Math.min(hmax, 6);
    const fs = forced[pi]
      .map((f) => ({ f, arc: arcAtP(tab, f.p) }))
      .sort((x, y) => x.arc - y.arc);
    // Drop a curvature maximum that crowds a structural point.
    const kept: Array<{ f: Forced; arc: number }> = [];
    for (const e of fs) {
      if (e.f.kind === "kmax") {
        const crowded = fs.some(
          (o) => o.f.kind !== "kmax" && Math.abs(o.arc - e.arc) < Math.max(minSep, 0.25 * hmax)
        );
        if (crowded) continue;
        if (kept.length > 0 && kept[kept.length - 1].f.kind === "kmax" && e.arc - kept[kept.length - 1].arc < 0.25 * hmax) continue;
      }
      kept.push(e);
    }
    const chain: ChainNode[] = [];
    const idOf = (f: Forced): string => {
      if (f.id) return f.id;
      if (pi === 0 && f.kind === "start") return "mentr_a";
      if (pi === 0 && f.kind === "end") return "mexit_a";
      return freshId();
    };
    for (let i = 0; i < kept.length; i++) {
      const e = kept[i];
      const id = idOf(e.f);
      if (!nodePos.has(id)) {
        nodePos.set(id, posAtP(r.path, e.f.p));
        let type: Node["type"] = NODE_TYPE.TURN;
        if (e.f.kind === "crossing") type = NODE_TYPE.CROSSING;
        else if (e.f.kind === "junction") type = NODE_TYPE.JUNCTION;
        else if (e.f.kind === "start" || e.f.kind === "end") type = NODE_TYPE.END;
        nodeType.set(id, type);
        if (e.f.kind === "waypoint") waypoints.add(id);
        if (e.f.kind === "root") rootStarts.add(id);
      }
      chain.push({ id, arc: e.arc });
      if (i + 1 < kept.length) {
        const L0 = e.arc;
        const L1 = kept[i + 1].arc;
        const len = L1 - L0;
        const km = maxKappa(tab, L0, L1);
        const h = km > 0 ? Math.min(hmax, 0.6 / km) : hmax;
        const n = Math.max(1, Math.ceil(len / h));
        for (let j = 1; j < n; j++) {
          const L = L0 + (len * j) / n;
          const nid = freshId();
          nodePos.set(nid, posAtP(r.path, pAtArc(tab, L)));
          nodeType.set(nid, NODE_TYPE.TURN);
          chain.push({ id: nid, arc: L });
        }
      }
    }
    void total;
    chains.push(chain);
  });

  // --- Emit (graph units: LU, y down, origin at the minimum). ---
  let minX = Infinity;
  let minY = Infinity;
  const toGraph = (q: readonly [number, number]): [number, number] => [q[0] * sc, -q[1] * sc];
  for (const q of nodePos.values()) {
    const g = toGraph(q);
    if (g[0] < minX) minX = g[0];
    if (g[1] < minY) minY = g[1];
  }
  const norm = (q: readonly [number, number]): [number, number] => {
    const g = toGraph(q);
    return [g[0] - minX, g[1] - minY];
  };
  const nodes = new Map<string, Node>();
  for (const [id, q] of nodePos) {
    nodes.set(id, {
      id,
      type: nodeType.get(id)!,
      latticePos: norm(q),
      ...(waypoints.has(id) ? { waypoint: true } : {}),
      ...(rootStarts.has(id) ? { rootStart: true as const } : {}),
    });
  }
  const edges = new Map<string, Edge>();
  const adjacency = new Map<string, string[]>();
  for (const id of nodes.keys()) adjacency.set(id, []);
  const edgePen = new Map<string, [number, number]>();
  const strands: Strand[] = [];
  let nextEdge = 0;
  // Pen clocks.
  const bodyTotal = tabs[0].cum[tabs[0].cum.length - 1];
  const junctionPen = new Map<string, number>();
  for (const c of chains[0]) junctionPen.set(c.id, c.arc);
  let floatBase = bodyTotal + FLOAT_GAP;
  chains.forEach((chain, pi) => {
    const r = paths[pi];
    const tab = tabs[pi];
    // K580: a rooted spur's arcs count from J (the root's are negative;
    // it carries no crossing, so they order nothing).
    const jIdx = r.root ? chain.findIndex((c) => nodeType.get(c.id) === NODE_TYPE.JUNCTION) : 0;
    const arcJ = chain[jIdx].arc;
    const penOf = (arc: number): number => {
      if (r.kind === "body") return arc;
      if (r.kind === "spur") return (junctionPen.get(chain[jIdx].id) ?? 0) + PEN_EPS * (arc - arcJ);
      return floatBase + arc;
    };
    const edgeIds: string[] = [];
    for (let i = 0; i + 1 < chain.length; i++) {
      const a = chain[i];
      const b = chain[i + 1];
      const id = `te${nextEdge++}`;
      const mid = norm(posAtP(r.path, pAtArc(tab, (a.arc + b.arc) / 2)));
      edges.set(id, {
        id,
        nodeA: a.id,
        nodeB: b.id,
        latticePoints: [nodes.get(a.id)!.latticePos.slice() as [number, number], nodes.get(b.id)!.latticePos.slice() as [number, number]],
        mid,
      });
      adjacency.get(a.id)!.push(id);
      adjacency.get(b.id)!.push(id);
      edgePen.set(id, [penOf(a.arc), penOf(b.arc)]);
      edgeIds.push(id);
    }
    if (r.kind === "float") floatBase += tab.cum[tab.cum.length - 1] + FLOAT_GAP;
    let taper: Strand["taper"];
    if (r.root) {
      // The profile at TAPER_PROFILE_N + 1 even steps of the root's arc,
      // R to J (the root has only 2-3 nodes, too few to carry it).
      const root = r.root;
      const arcR = chain[0].arc;
      const span = chain[jIdx].arc - arcR;
      const sep: number[] = [];
      // K620: each side's foot as a body ctrl (the paint samples the
      // strokes there), at the same steps.
      const body = chains[0];
      const bodyJ = junctionPen.get(chain[jIdx].id) ?? 0;
      const ctrlOfBodyArc = (A: number): number => {
        let i = 0;
        while (i + 2 < body.length && body[i + 1].arc <= A) i++;
        const a0 = body[i].arc;
        const a1 = body[i + 1].arc;
        return 2 * i + 2 * (a1 > a0 ? Math.min(Math.max((A - a0) / (a1 - a0), 0), 1) : 0);
      };
      const footC: number[] = [];
      const footO: number[] = [];
      for (let k = 0; k <= TAPER_PROFILE_N; k++) {
        const p = pAtArc(tab, arcR + (span * k) / TAPER_PROFILE_N);
        const atJ = k === TAPER_PROFILE_N || p >= root.segs;
        sep.push(atJ ? 0 : root.sepAt(root.aR * (1 - p / root.segs)) * sc);
        const a = atJ ? 0 : root.aR * (1 - p / root.segs);
        footC.push(ctrlOfBodyArc(bodyJ - (atJ ? 0 : root.footC(a))));
        footO.push(ctrlOfBodyArc(bodyJ + (atJ ? 0 : root.footO(a))));
      }
      taper = { sep, joint: jIdx, footC, footO, sideC: root.sideC };
    }
    strands.push({
      edgeIds,
      isClosed: false,
      nodes: chain.map((c) => c.id),
      pinned: true,
      ...(r.kind === "float" ? { decorative: true } : {}),
      ...(taper ? { taper } : {}),
      // K580 s5: every glyph strand, in tapered and notaper mode alike
      // (core Strand.glyph; the renderer's stadium cap cover reads it).
      glyph: true,
    });
  });

  const graph: TangleGraph = {
    nodes,
    edges,
    adjacency,
    strands,
    seed: 0,
    params: { gridSize: 0, weaveDensity: 0, turnBias: 0, randSeed: 0 },
  };
  let ends = 0;
  let junctions = 0;
  let crossings = 0;
  for (const n of nodes.values()) {
    if (n.type === NODE_TYPE.END) ends++;
    else if (n.type === NODE_TYPE.JUNCTION) junctions++;
    else if (n.type === NODE_TYPE.CROSSING) crossings++;
  }
  return {
    graph,
    edgePen,
    stats: {
      ends,
      junctions,
      crossings,
      spurs: spurs.length,
      floats: floats.length,
      unconverged,
      nodes: nodes.size,
    },
  };
}
