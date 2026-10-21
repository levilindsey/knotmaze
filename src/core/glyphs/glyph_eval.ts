// K115 stage 9: exact evaluation of the authored cubics (K108: + - * /
// and Math.sqrt only, so every engine builds the same title). At the
// 65 parameters t = k/64 a point is an integer sum over 2^18
// (glyphs doc section 3): with |P| <= 2^12 every intermediate is an
// integer below 2^31, and the division by a power of two is exact.

import type { CubicPath, Pt } from "./glyph_types";

export const K_STEPS = 64;

/** The four control points of segment `seg` of a path. */
export function segOf(path: CubicPath, seg: number): [Pt, Pt, Pt, Pt] {
  const i = seg * 3;
  return [path[i], path[i + 1], path[i + 2], path[i + 3]];
}

export function segCount(path: CubicPath): number {
  return (path.length - 1) / 3;
}

/** B(k/64) in GU, exact. */
export function bezAtK(s: readonly [Pt, Pt, Pt, Pt], k: number): [number, number] {
  const u = K_STEPS - k;
  const w0 = u * u * u;
  const w1 = 3 * u * u * k;
  const w2 = 3 * u * k * k;
  const w3 = k * k * k;
  const x = w0 * s[0][0] + w1 * s[1][0] + w2 * s[2][0] + w3 * s[3][0];
  const y = w0 * s[0][1] + w1 * s[1][1] + w2 * s[2][1] + w3 * s[3][1];
  return [x / 262144, y / 262144];
}

/** B(t) for any t in [0, 1] (+ - * / only). */
export function bezAt(s: readonly [Pt, Pt, Pt, Pt], t: number): [number, number] {
  const u = 1 - t;
  const w0 = u * u * u;
  const w1 = 3 * u * u * t;
  const w2 = 3 * u * t * t;
  const w3 = t * t * t;
  return [
    w0 * s[0][0] + w1 * s[1][0] + w2 * s[2][0] + w3 * s[3][0],
    w0 * s[0][1] + w1 * s[1][1] + w2 * s[2][1] + w3 * s[3][1],
  ];
}

/** B'(t) (+ - * / only). */
export function bezDeriv(s: readonly [Pt, Pt, Pt, Pt], t: number): [number, number] {
  const u = 1 - t;
  const a = 3 * u * u;
  const b = 6 * u * t;
  const c = 3 * t * t;
  return [
    a * (s[1][0] - s[0][0]) + b * (s[2][0] - s[1][0]) + c * (s[3][0] - s[2][0]),
    a * (s[1][1] - s[0][1]) + b * (s[2][1] - s[1][1]) + c * (s[3][1] - s[2][1]),
  ];
}

/** B''(t) (+ - * / only). */
export function bezDeriv2(s: readonly [Pt, Pt, Pt, Pt], t: number): [number, number] {
  const u = 1 - t;
  const e0x = s[2][0] - 2 * s[1][0] + s[0][0];
  const e0y = s[2][1] - 2 * s[1][1] + s[0][1];
  const e1x = s[3][0] - 2 * s[2][0] + s[1][0];
  const e1y = s[3][1] - 2 * s[2][1] + s[1][1];
  return [6 * (u * e0x + t * e1x), 6 * (u * e0y + t * e1y)];
}

/** Signed curvature (1/GU, y up: positive turns counter-clockwise). */
export function bezCurvature(s: readonly [Pt, Pt, Pt, Pt], t: number): number {
  const d = bezDeriv(s, t);
  const dd = bezDeriv2(s, t);
  const sp2 = d[0] * d[0] + d[1] * d[1];
  if (sp2 <= 0) return 0;
  return (d[0] * dd[1] - d[1] * dd[0]) / (sp2 * Math.sqrt(sp2));
}

/** Arc length of one segment: the sum of the 64 exact chords (GU). */
export function segLength(s: readonly [Pt, Pt, Pt, Pt]): number {
  let len = 0;
  let prev = bezAtK(s, 0);
  for (let k = 1; k <= K_STEPS; k++) {
    const p = bezAtK(s, k);
    const dx = p[0] - prev[0];
    const dy = p[1] - prev[1];
    len += Math.sqrt(dx * dx + dy * dy);
    prev = p;
  }
  return len;
}

export function pathLength(path: CubicPath): number {
  let len = 0;
  for (let i = 0; i < segCount(path); i++) len += segLength(segOf(path, i));
  return len;
}

/** Translate a path by an integer offset (origin added before scaling). */
export function offsetPath(path: CubicPath, dx: number, dy: number): Pt[] {
  return path.map((p) => [p[0] + dx, p[1] + dy] as Pt);
}

// ---------------------------------------------------------------------------
// G1 checks.
// ---------------------------------------------------------------------------

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}

/** The primitive integer vector along v (0,0 stays 0,0). */
export function primitive(v: Pt): [number, number] {
  const g = gcd(v[0], v[1]);
  return g === 0 ? [0, 0] : [v[0] / g, v[1] / g];
}

/**
 * Every joint of a path is G1 exact: integer handles, nonzero, parallel
 * (cross 0) and pointing the same way (dot > 0). Returns the failing
 * joint indices (point indices).
 */
export function g1Failures(path: CubicPath): number[] {
  const bad: number[] = [];
  for (let j = 3; j + 3 < path.length; j += 3) {
    const hin: Pt = [path[j][0] - path[j - 1][0], path[j][1] - path[j - 1][1]];
    const hout: Pt = [path[j + 1][0] - path[j][0], path[j + 1][1] - path[j][1]];
    const cross = hin[0] * hout[1] - hin[1] * hout[0];
    const dot = hin[0] * hout[0] + hin[1] * hout[1];
    const zero =
      (hin[0] === 0 && hin[1] === 0) || (hout[0] === 0 && hout[1] === 0);
    if (zero || cross !== 0 || dot <= 0) bad.push(j);
  }
  return bad;
}

/** True when every coordinate is an integer of magnitude <= 2^12. */
export function integerBounded(path: CubicPath): boolean {
  for (const p of path) {
    for (const c of p) {
      if (!Number.isInteger(c) || Math.abs(c) > 4096) return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Crossings: candidates from the exact chords, then 4 Newton steps on
// Bi(s) - Bj(t) (Jacobian [Bi'(s), -Bj'(t)]). A pair that does not converge
// to 1e-9 GU is reported (a lint error).
// ---------------------------------------------------------------------------

export interface SegRef {
  /** Caller's id for the path (any number). */
  path: number;
  seg: number;
  ctrl: readonly [Pt, Pt, Pt, Pt];
}

export interface CrossingHit {
  a: SegRef;
  b: SegRef;
  /** Parameters on a and b. */
  s: number;
  t: number;
  pos: [number, number];
  /** |sin| of the angle between the two tangents. */
  sin: number;
  converged: boolean;
}

function orient(a: readonly number[], b: readonly number[], c: readonly number[]): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function chordsOf(c: readonly [Pt, Pt, Pt, Pt]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let k = 0; k <= K_STEPS; k++) out.push(bezAtK(c, k));
  return out;
}

function bboxOf(pts: Array<[number, number]>): [number, number, number, number] {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of pts) {
    if (p[0] < x0) x0 = p[0];
    if (p[1] < y0) y0 = p[1];
    if (p[0] > x1) x1 = p[0];
    if (p[1] > y1) y1 = p[1];
  }
  return [x0, y0, x1, y1];
}

/**
 * Proper crossings between segments. `skip(a, b)` excludes pairs that
 * share a joint by construction (adjacent segments of one path, a spur's
 * first segment at its junction); a touch at a shared endpoint is never
 * proper anyway, so it only saves work.
 */
export function findCrossings(
  segs: readonly SegRef[],
  skip: (a: SegRef, b: SegRef) => boolean
): CrossingHit[] {
  const chords = segs.map((s) => chordsOf(s.ctrl));
  const boxes = chords.map(bboxOf);
  const hits: CrossingHit[] = [];
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const bi = boxes[i];
      const bj = boxes[j];
      if (bi[2] < bj[0] || bj[2] < bi[0] || bi[3] < bj[1] || bj[3] < bi[1]) continue;
      if (skip(segs[i], segs[j])) continue;
      const ci = chords[i];
      const cj = chords[j];
      for (let p = 0; p < K_STEPS; p++) {
        for (let q = 0; q < K_STEPS; q++) {
          const a = ci[p];
          const b = ci[p + 1];
          const c = cj[q];
          const d = cj[q + 1];
          const o1 = orient(a, b, c);
          const o2 = orient(a, b, d);
          if (!((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0))) continue;
          const o3 = orient(c, d, a);
          const o4 = orient(c, d, b);
          if (!((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0))) continue;
          // Chord-chord intersection as the Newton start.
          const fa = o3 / (o3 - o4);
          const fc = o1 / (o1 - o2);
          let s = (p + fa) / K_STEPS;
          let t = (q + fc) / K_STEPS;
          for (let it = 0; it < 4; it++) {
            const P = bezAt(segs[i].ctrl, s);
            const Q = bezAt(segs[j].ctrl, t);
            const dP = bezDeriv(segs[i].ctrl, s);
            const dQ = bezDeriv(segs[j].ctrl, t);
            const fx = P[0] - Q[0];
            const fy = P[1] - Q[1];
            // [dP, -dQ] [ds, dt]^T = -f
            const det = dP[0] * -dQ[1] - -dQ[0] * dP[1];
            if (det === 0) break;
            const ds = (-fx * -dQ[1] - -dQ[0] * -fy) / det;
            const dt = (dP[0] * -fy - -fx * dP[1]) / det;
            s += ds;
            t += dt;
          }
          const P = bezAt(segs[i].ctrl, s);
          const Q = bezAt(segs[j].ctrl, t);
          const ex = P[0] - Q[0];
          const ey = P[1] - Q[1];
          const dP = bezDeriv(segs[i].ctrl, s);
          const dQ = bezDeriv(segs[j].ctrl, t);
          const lp = Math.sqrt(dP[0] * dP[0] + dP[1] * dP[1]);
          const lq = Math.sqrt(dQ[0] * dQ[0] + dQ[1] * dQ[1]);
          const sin = lp > 0 && lq > 0 ? Math.abs(dP[0] * dQ[1] - dP[1] * dQ[0]) / (lp * lq) : 0;
          hits.push({
            a: segs[i],
            b: segs[j],
            s,
            t,
            pos: [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2],
            sin,
            converged:
              Math.sqrt(ex * ex + ey * ey) <= 1e-9 && s >= 0 && s <= 1 && t >= 0 && t <= 1,
          });
        }
      }
    }
  }
  return hits;
}

/**
 * Dense samples of a path: per segment the 64 exact chords, with the
 * cumulative arc length, the parameter and the curvature at each sample.
 */
export interface DenseSample {
  seg: number;
  k: number;
  pos: [number, number];
  s: number;
  kappa: number;
}

export function densePath(path: CubicPath): DenseSample[] {
  const out: DenseSample[] = [];
  let acc = 0;
  let prev: [number, number] | null = null;
  for (let i = 0; i < segCount(path); i++) {
    const c = segOf(path, i);
    for (let k = i === 0 ? 0 : 1; k <= K_STEPS; k++) {
      const p = bezAtK(c, k);
      if (prev) {
        const dx = p[0] - prev[0];
        const dy = p[1] - prev[1];
        acc += Math.sqrt(dx * dx + dy * dy);
      }
      out.push({ seg: i, k, pos: p, s: acc, kappa: bezCurvature(c, k / K_STEPS) });
      prev = p;
    }
  }
  return out;
}
