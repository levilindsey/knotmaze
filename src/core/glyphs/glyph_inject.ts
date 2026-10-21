// K643, probe only: injected cases that calibrate the glyph lint's bounds
// on stills. `#glyphs2=crotch<L>` (text_graph.ts) passes widenCrotch to the
// builder's `glyphFor`; without the flag nothing here runs, so no link and
// no golden moves. The bulge case needs no glyph change: it is the
// builder's `taperBulge` (tangentRoot's `bulgeGu`).

import type { Glyph, Pt } from "./glyph_types";
import { densePath } from "./glyph_eval";
import { GU_PER_XH, tangentRoot, TAPER_PART_LU, TAPER_THREAD_LU } from "./glyph_graph";

/** The held centerline gap (LU): between the thread width and CLEAR (0.6). */
export const CROTCH_HOLD_GAP_LU = 0.56;
/** Where the release ends (LU of C's arc before its first joint): C is unmoved from there on. */
const RELEASE_END_LU = 0.15;
/** How far before R (LU of C) the turn onto the offset starts. */
const IN_LU = 0.3;
/** Refit knot spacing (GU) and the quantum (1/Q GU) that keeps every new joint G1 exact. */
const KNOT_GU = 3;
const Q = 256;

const quant = (x: number): number => Math.round(x * Q) / Q;

/**
 * Widens a glyph's tangent join's crotch: the arriving stroke C is redrawn
 * as the departing stroke O's offset at CROTCH_HOLD_GAP_LU (under CLEAR,
 * so the lint counts it as crotch) for `holdLU` of C's arc, then returns
 * to its own path. C, not O, moves: the a's O turns away from C, so C wraps
 * O's bend from outside, where an offset never folds. The turn onto the
 * offset starts IN_LU before R (at R the strokes already part at about
 * 40 degrees, too fast to turn inside the gap the lint allows), so R moves
 * a little later. C from its first joint (the entry, or the previous spur's
 * junction) to J is refit as Hermite cubics through the redrawn curve
 * (knots every KNOT_GU, coordinates in 1/256 GU, handles exactly parallel at
 * every new joint, so the lint's G1 check passes); the first joint and its
 * direction stay, and later spurs are renumbered. Label stills with the
 * lint's crotch (`lintGlyph(widenCrotch(...))`), not with `holdLU`. The a's
 * C is short: smooth crotches reach 0.67 LU at xh 2 and 0.79 at xh 3;
 * longer holds leave the release too little arc, and the lint's radius
 * rule reports the bends it draws down C (K643 Handoff).
 */
export function widenCrotch(g: Glyph, xh: number, holdLU: number, partLU: number = TAPER_PART_LU): Glyph {
  const k = GU_PER_XH / xh;
  const s = g.spurs.find((o) => o.tangent);
  if (!s) return g;
  const j = s.at;
  const body: Pt[] = g.body.map((p) => [p[0], p[1]] as Pt);
  const root = tangentRoot(body, j, partLU * k, TAPER_THREAD_LU * k);
  if (!root) return g;
  const S0 = Math.max(0, ...g.spurs.filter((o) => o.at < j).map((o) => o.at));
  const N = Math.min(body.length - 1, ...g.spurs.filter((o) => o.at > j).map((o) => o.at));
  const ds = densePath(body);
  const iJ = (j / 3) * 64;
  const iS = (S0 / 3) * 64;
  const iN = (N / 3) * 64;
  const sJ = ds[iJ].s;
  // O, from J to the next spur's junction: what C is pulled toward.
  const ox: number[] = [];
  const oy: number[] = [];
  for (let i = iJ; i <= iN; i++) {
    ox.push(ds[i].pos[0]);
    oy.push(ds[i].pos[1]);
  }
  const D = CROTCH_HOLD_GAP_LU * k;
  // C is redrawn as O's offset at a gap g(a) (a = C's arc from J): g = d
  // (C unmoved) up to a0, IN_LU before R; from a0 a parabola that leaves d with its slope and
  // lands flat on D, so C turns onto the offset as gently as the gap lets
  // it; D through the hold; then back to d by a smootherstep that ends
  // RELEASE_END_LU before C's first joint, so the entry and its direction
  // never move. The release has what C has left: a long hold on a short C
  // turns sharply (the lint's radius rule reports it).
  const aS = sJ - ds[iS].s;
  const aE = aS - RELEASE_END_LU * k;
  const n = iJ - iS + 1;
  const A: number[] = [];
  const dd: number[] = [];
  const ux: number[] = [];
  const uy: number[] = [];
  for (let i = iS; i <= iJ; i++) {
    const a = sJ - ds[i].s;
    const cx = ds[i].pos[0];
    const cy = ds[i].pos[1];
    let best = Infinity;
    let nx = cx;
    let ny = cy;
    for (let m = 0; m + 1 < ox.length; m++) {
      const ex = ox[m + 1] - ox[m];
      const ey = oy[m + 1] - oy[m];
      const ll = ex * ex + ey * ey;
      let t = ll > 0 ? ((cx - ox[m]) * ex + (cy - oy[m]) * ey) / ll : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const qx = ox[m] + ex * t;
      const qy = oy[m] + ey * t;
      const d2 = (cx - qx) * (cx - qx) + (cy - qy) * (cy - qy);
      if (d2 < best) {
        best = d2;
        nx = qx;
        ny = qy;
      }
    }
    const d = Math.sqrt(best);
    A.push(a);
    dd.push(d);
    ux.push(d > 0 ? (nx - cx) / d : 0);
    uy.push(d > 0 ? (ny - cy) / d : 0);
  }
  // d and its slope (per unit a) at a0. A falls with i (S0 first, J last).
  const a0 = Math.max(0.2 * k, root.aR - IN_LU * k);
  let iR = 0;
  while (iR < n - 1 && A[iR] > a0) iR++;
  const fr = iR > 0 ? (A[iR - 1] - a0) / (A[iR - 1] - A[iR]) : 0;
  const dR = iR > 0 ? dd[iR - 1] + (dd[iR] - dd[iR - 1]) * fr : dd[0];
  const j0 = Math.max(0, iR - 2);
  const j1 = Math.min(n - 1, iR + 1);
  const mR = Math.max(0.05, (dd[j0] - dd[j1]) / (A[j0] - A[j1]));
  // The parabola from (dR, mR) to D, flat there: x1 past a0.
  const x1 = dR < D ? (2 * (D - dR)) / mR : 0;
  const aH = Math.min(a0 + Math.max(x1, holdLU * k), aE - 0.3 * k);
  const Lf = aE - aH;
  const smoother = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (x * (6 * x - 15) + 10));
  const px: number[] = [];
  const py: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = A[i];
    const d = dd[i];
    let g: number;
    if (a <= a0 || holdLU <= 0) g = d;
    else if (a <= aH) {
      const x = a - a0;
      g = x < x1 ? dR + mR * x - ((mR * mR) / (4 * (D - dR))) * x * x : D;
    } else g = D + (d - D) * smoother((a - aH) / Lf);
    const delta = d - g;
    const c = ds[iS + i].pos;
    px.push(c[0] + ux[i] * delta);
    py.push(c[1] + uy[i] * delta);
  }
  // Refit S0..J through the deformed samples.
  const pa: number[] = [0];
  for (let i = 1; i < px.length; i++) {
    const dx = px[i] - px[i - 1];
    const dy = py[i] - py[i - 1];
    pa.push(pa[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  const total = pa[pa.length - 1];
  const M = Math.max(2, Math.ceil(total / KNOT_GU));
  const step = total / M;
  const at = (a: number): [number, number] => {
    let lo = 0;
    let hi = pa.length - 1;
    if (a <= 0) return [px[0], py[0]];
    if (a >= total) return [px[hi], py[hi]];
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (pa[mid] <= a) lo = mid;
      else hi = mid;
    }
    const t = (a - pa[lo]) / (pa[hi] - pa[lo] || 1);
    return [px[lo] + (px[hi] - px[lo]) * t, py[lo] + (py[hi] - py[lo]) * t];
  };
  /** A handle exactly parallel to the integer direction d, step/3 long. */
  const along = (d: Pt): Pt => {
    const l = Math.sqrt(d[0] * d[0] + d[1] * d[1]);
    const lam = quant(step / 3 / l);
    return [d[0] * lam, d[1] * lam];
  };
  const knots: Pt[] = [];
  const hand: Pt[] = [];
  for (let i = 0; i <= M; i++) {
    if (i === 0) {
      knots.push([body[S0][0], body[S0][1]]);
      hand.push(along([body[S0 + 1][0] - body[S0][0], body[S0 + 1][1] - body[S0][1]]));
    } else if (i === M) {
      knots.push([body[j][0], body[j][1]]);
      hand.push(along([body[j][0] - body[j - 1][0], body[j][1] - body[j - 1][1]]));
    } else {
      const p = at(i * step);
      const p0 = at(i * step - 0.5);
      const p1 = at(i * step + 0.5);
      const ux = p1[0] - p0[0];
      const uy = p1[1] - p0[1];
      const l = Math.sqrt(ux * ux + uy * uy);
      knots.push([quant(p[0]), quant(p[1])]);
      hand.push([quant((ux / l) * (step / 3)), quant((uy / l) * (step / 3))]);
    }
  }
  const mid: Pt[] = [knots[0]];
  for (let i = 0; i < M; i++) {
    mid.push([knots[i][0] + hand[i][0], knots[i][1] + hand[i][1]]);
    mid.push([knots[i + 1][0] - hand[i + 1][0], knots[i + 1][1] - hand[i + 1][1]]);
    mid.push([knots[i + 1][0], knots[i + 1][1]]);
  }
  const out = [...body.slice(0, S0), ...mid, ...body.slice(j + 1)];
  const shift = 3 * M - (j - S0);
  return { ...g, body: out, spurs: g.spurs.map((o) => (o.at >= j ? { ...o, at: o.at + shift } : o)) };
}
