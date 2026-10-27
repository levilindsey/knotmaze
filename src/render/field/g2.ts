// K868 S2 (§3.7): G2 corner candidates for the CPU oracle. Each candidate
// is an exact curve from a point on side A's outline to one on side B's,
// tangent to both and matching each outline's curvature there, sampled
// densely with its exact curvature at every sample. The oracle sizes it
// against the G1 arc of the corner's r (oracle.ts, sizeG2) and draws it as
// a chain of short segments.
//
// Conventions: an end's `t` is the travel direction (into the corner at A,
// out of it at B), and curvature is signed, + turning left (CCW), in that
// travel direction. A corner always turns right in this orientation (the
// hole is on the right), so its curvature is negative.

export interface CornerEnd {
  p: [number, number];
  t: [number, number];
  /** Signed curvature of the side outline at p (travel orientation). */
  k: number;
}

export interface CurveSamples {
  x: number[];
  y: number[];
  /** Exact signed curvature at each sample. */
  k: number[];
  /** Arc length from the start. */
  s: number[];
  /** |Δκ| at the curve's interior curvature steps (the arc spline's). */
  steps: number[];
  ok: boolean;
  note?: string;
}

export type G2Kind = "clothoid" | "bezier5" | "arcs3";

/** The quintic's handle length e = λ·ℓ as a share of each end's tangent
 * length ℓ. No single λ works: below a threshold that depends on the turn
 * the comb has two humps (the control polygon's two corners), above it the
 * peak rises fast (.claude/probes/K868/s2/lambda.ts: one hump from 0.38 at
 * a 20° turn, 0.33 at 90°, 0.28 at 120°, under 0.2 at 150°). bezier5()
 * therefore picks λ per corner: the lowest peak among one-hump λ in
 * [BEZIER5_LAMBDA_MIN, BEZIER5_LAMBDA_MAX]. */
export const BEZIER5_LAMBDA_MIN = 0.05;
export const BEZIER5_LAMBDA_MAX = 0.6;

function wrapPi(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a <= -Math.PI) a += 2 * Math.PI;
  return a;
}

function angleOf(t: [number, number]): number {
  return Math.atan2(t[1], t[0]);
}

/** Heading change from A's travel direction to B's (the corner's turn). */
export function turnOf(a: CornerEnd, b: CornerEnd): number {
  return wrapPi(angleOf(b.t) - angleOf(a.t));
}

/** Where the tangent lines meet: distances along A's travel direction from
 * a.p and back along B's from b.p. Null when parallel or behind. */
export function tangentLengths(a: CornerEnd, b: CornerEnd): [number, number] | null {
  // a.p + u·a.t = b.p − v·b.t, i.e. u·a.t + v·b.t = b.p − a.p.
  const det = a.t[0] * b.t[1] - a.t[1] * b.t[0];
  if (Math.abs(det) < 1e-12) return null;
  const rx = b.p[0] - a.p[0];
  const ry = b.p[1] - a.p[1];
  const u = (rx * b.t[1] - ry * b.t[0]) / det;
  const v = (a.t[0] * ry - a.t[1] * rx) / det;
  if (!(u > 0 && v > 0)) return null;
  return [u, v];
}

// ---------------------------------------------------------------------------
// Clothoid pair: curvature linear in arc length from k_A to a peak and back
// to k_B. Unknowns L1, L2 (the peak follows from the turn); Newton on the
// end position.

interface Piece {
  k0: number;
  k1: number;
  L: number;
}

function walk(x0: number, y0: number, phi0: number, pieces: Piece[], n: number, out?: CurveSamples): [number, number, number] {
  let x = x0;
  let y = y0;
  let phi = phi0;
  if (out) {
    out.x.push(x);
    out.y.push(y);
    out.k.push(pieces[0].k0);
    out.s.push(0);
  }
  let s = 0;
  for (const pc of pieces) {
    const m = Math.max(2, n);
    const du = pc.L / m;
    for (let i = 0; i < m; i++) {
      // Simpson on cos/sin of the quadratic heading over [u, u + du].
      const u0 = i * du;
      const head = (u: number) => phi + pc.k0 * u + ((pc.k1 - pc.k0) * u * u) / (2 * pc.L);
      const h0 = head(u0);
      const h1 = head(u0 + du / 2);
      const h2 = head(u0 + du);
      x += (du / 6) * (Math.cos(h0) + 4 * Math.cos(h1) + Math.cos(h2));
      y += (du / 6) * (Math.sin(h0) + 4 * Math.sin(h1) + Math.sin(h2));
      s += du;
      if (out) {
        out.x.push(x);
        out.y.push(y);
        out.k.push(pc.k0 + ((pc.k1 - pc.k0) * (u0 + du)) / pc.L);
        out.s.push(s);
      }
    }
    phi = phi + pc.k0 * pc.L + ((pc.k1 - pc.k0) * pc.L) / 2;
  }
  return [x, y, phi];
}

export function clothoidPair(a: CornerEnd, b: CornerEnd, samples = 160): CurveSamples {
  const turn = turnOf(a, b);
  const chord = Math.hypot(b.p[0] - a.p[0], b.p[1] - a.p[1]);
  const pieces = (L1: number, L2: number): Piece[] => {
    const kp = (2 * turn - a.k * L1 - b.k * L2) / (L1 + L2);
    return [
      { k0: a.k, k1: kp, L: L1 },
      { k0: kp, k1: b.k, L: L2 },
    ];
  };
  const phi0 = angleOf(a.t);
  const F = (L1: number, L2: number): [number, number] => {
    const [x, y] = walk(a.p[0], a.p[1], phi0, pieces(L1, L2), 48);
    return [x - b.p[0], y - b.p[1]];
  };
  // Damped Newton from a start; several starts (scaled and lopsided copies
  // of the circular arc over the chord), the first that converges wins. A
  // single start stalled on curved arms (L1 driven to 0).
  const half = Math.max(Math.abs(turn) / 2, 1e-6);
  const arc = (0.5 * chord * half) / Math.sin(half);
  const newton = (L1: number, L2: number): [number, number, number] => {
    for (let it = 0; it < 60; it++) {
      const f = F(L1, L2);
      if (Math.hypot(f[0], f[1]) < 1e-12 * Math.max(1, chord)) break;
      const e = 1e-7 * Math.max(chord, 1e-6);
      const f1 = F(L1 + e, L2);
      const f2 = F(L1, L2 + e);
      const j11 = (f1[0] - f[0]) / e;
      const j21 = (f1[1] - f[1]) / e;
      const j12 = (f2[0] - f[0]) / e;
      const j22 = (f2[1] - f[1]) / e;
      const det = j11 * j22 - j12 * j21;
      if (Math.abs(det) < 1e-18) break;
      let d1 = (-f[0] * j22 + f[1] * j12) / det;
      let d2 = (-j11 * f[1] + j21 * f[0]) / det;
      // Damp: keep both lengths positive and the step under half of each.
      const lim = 0.5;
      const sc = Math.min(1, (lim * L1) / Math.max(Math.abs(d1), 1e-300), (lim * L2) / Math.max(Math.abs(d2), 1e-300));
      d1 *= sc;
      d2 *= sc;
      L1 += d1;
      L2 += d2;
    }
    const f = F(L1, L2);
    return [L1, L2, Math.hypot(f[0], f[1])];
  };
  const starts: [number, number][] = [
    [1, 1],
    [0.7, 0.7],
    [1.5, 1.5],
    [0.6, 1.2],
    [1.2, 0.6],
    [2, 2],
    [0.4, 0.4],
    [0.4, 1.6],
    [1.6, 0.4],
  ];
  let L1 = arc;
  let L2 = arc;
  let res = Infinity;
  for (const [s1, s2] of starts) {
    const [l1, l2, r] = newton(s1 * arc, s2 * arc);
    if (r < res) [L1, L2, res] = [l1, l2, r];
    if (res < 1e-9 * Math.max(1, chord)) break;
  }
  const f = F(L1, L2);
  // A zero chord (both ends at one point) "converges" with L = 0: not a curve.
  const ok = chord > 1e-12 && L1 + L2 > 0 && res < 1e-9 * Math.max(1, chord);
  const out: CurveSamples = { x: [], y: [], k: [], s: [], steps: [], ok };
  const pc = pieces(L1, L2);
  walk(a.p[0], a.p[1], phi0, pc, Math.ceil(samples / 2), out);
  // Snap the last sample onto b.p (the walk's error is below 1e-9·chord).
  out.x[out.x.length - 1] = b.p[0];
  out.y[out.y.length - 1] = b.p[1];
  if (!ok) out.note = `clothoid solve residual ${Math.hypot(f[0], f[1]).toExponential(2)}`;
  out.note = (out.note ? out.note + "; " : "") + `L1 ${L1.toFixed(4)} L2 ${L2.toFixed(4)} peak ${pc[0].k1.toFixed(4)}`;
  return out;
}

// ---------------------------------------------------------------------------
// Quintic Bézier: P0..P2 off A's end, P3..P5 off B's. P1 − P0 = λℓ_A·t_A and
// P2 = P1 + λℓ_A·t_A + c_A·n_A with c_A = (5/4)·k_A·(λℓ_A)², so the end
// curvature (4/5)·c_A/(λℓ_A)² is k_A; the same at B.

function bezPoint(P: number[][], t: number): [number, number, number, number, number, number] {
  // de Casteljau for the point; derivatives from the difference polygons.
  const n = P.length - 1;
  const d1: number[][] = [];
  for (let i = 0; i < n; i++) d1.push([n * (P[i + 1][0] - P[i][0]), n * (P[i + 1][1] - P[i][1])]);
  const d2: number[][] = [];
  for (let i = 0; i < n - 1; i++) d2.push([(n - 1) * (d1[i + 1][0] - d1[i][0]), (n - 1) * (d1[i + 1][1] - d1[i][1])]);
  const ev = (Q: number[][]): [number, number] => {
    const q = Q.map((v) => [v[0], v[1]]);
    for (let r = q.length - 1; r > 0; r--)
      for (let i = 0; i < r; i++) {
        q[i][0] = q[i][0] * (1 - t) + q[i + 1][0] * t;
        q[i][1] = q[i][1] * (1 - t) + q[i + 1][1] * t;
      }
    return [q[0][0], q[0][1]];
  };
  const [x, y] = ev(P);
  const [dx, dy] = ev(d1);
  const [ddx, ddy] = ev(d2);
  return [x, y, dx, dy, ddx, ddy];
}

/** The quintic at the λ with the lowest peak curvature among one-hump λ
 * (a 0.01 grid, refined to 0.001 around the best). Without a one-hump λ it
 * takes the grid's smallest hump fall and says so. */
export function bezier5(a: CornerEnd, b: CornerEnd, lambda?: number, samples = 160): CurveSamples {
  if (lambda !== undefined) return bezier5At(a, b, lambda, samples);
  const sense = turnOf(a, b) < 0 ? -1 : 1;
  const peakOf = (c: CurveSamples) => c.k.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  let best: { l: number; c: CurveSamples; pk: number } | null = null;
  let leastFall: { l: number; c: CurveSamples; f: number } | null = null;
  const consider = (l: number) => {
    const c = bezier5At(a, b, l, samples);
    if (!c.ok) return;
    const pk = peakOf(c);
    const f = humpFall(c, sense);
    if (!leastFall || f < leastFall.f) leastFall = { l, c, f };
    if (f <= 1e-9 * pk && (!best || pk < best.pk)) best = { l, c, pk };
  };
  for (let l = BEZIER5_LAMBDA_MIN; l <= BEZIER5_LAMBDA_MAX + 1e-9; l += 0.01) consider(l);
  if (best) {
    const l0 = (best as { l: number }).l;
    for (let l = l0 - 0.01; l <= l0 + 0.01 + 1e-9; l += 0.001) if (l >= BEZIER5_LAMBDA_MIN) consider(l);
  }
  if (best) return (best as { c: CurveSamples }).c;
  if (leastFall) {
    const lf = leastFall as { c: CurveSamples; l: number; f: number };
    lf.c.note = `${lf.c.note}; no one-hump λ in [${BEZIER5_LAMBDA_MIN}, ${BEZIER5_LAMBDA_MAX}]: least hump fall ${lf.f.toExponential(2)} at λ ${lf.l.toFixed(3)}`;
    return lf.c;
  }
  return bezier5At(a, b, 0.5, samples);
}

function bezier5At(a: CornerEnd, b: CornerEnd, lambda: number, samples = 160): CurveSamples {
  const tl = tangentLengths(a, b);
  const chord = Math.hypot(b.p[0] - a.p[0], b.p[1] - a.p[1]);
  const [la, lb] = tl ?? [chord / 2, chord / 2];
  const ea = lambda * la;
  const eb = lambda * lb;
  const na = [-a.t[1], a.t[0]];
  const nb = [-b.t[1], b.t[0]];
  const ca = 1.25 * a.k * ea * ea;
  const cb = 1.25 * b.k * eb * eb;
  const P = [
    [a.p[0], a.p[1]],
    [a.p[0] + ea * a.t[0], a.p[1] + ea * a.t[1]],
    [a.p[0] + 2 * ea * a.t[0] + ca * na[0], a.p[1] + 2 * ea * a.t[1] + ca * na[1]],
    [b.p[0] - 2 * eb * b.t[0] + cb * nb[0], b.p[1] - 2 * eb * b.t[1] + cb * nb[1]],
    [b.p[0] - eb * b.t[0], b.p[1] - eb * b.t[1]],
    [b.p[0], b.p[1]],
  ];
  const out: CurveSamples = { x: [], y: [], k: [], s: [], steps: [], ok: tl !== null };
  let s = 0;
  for (let i = 0; i <= samples; i++) {
    const [x, y, dx, dy, ddx, ddy] = bezPoint(P, i / samples);
    if (i > 0) s += Math.hypot(x - out.x[i - 1], y - out.y[i - 1]);
    out.x.push(x);
    out.y.push(y);
    out.k.push((dx * ddy - dy * ddx) / Math.pow(dx * dx + dy * dy, 1.5));
    out.s.push(s);
  }
  if (!tl) out.note = "tangent lines do not meet ahead: no handle length";
  out.note = (out.note ? out.note + "; " : "") + `λ ${lambda} ℓA ${la.toFixed(4)} ℓB ${lb.toFixed(4)}`;
  return out;
}

// ---------------------------------------------------------------------------
// Arc spline: three arcs, the end arcs at half the middle arc's curvature
// and each turning a quarter of the corner, so its four curvature steps are
// equal (κ_m/2) on straight arms. Built for straight, symmetric ends only
// (equal tangent lengths, k_A = k_B = 0); otherwise it reports why not.

export function arcs3(a: CornerEnd, b: CornerEnd, samples = 160): CurveSamples {
  const turn = turnOf(a, b);
  const tl = tangentLengths(a, b);
  const out: CurveSamples = { x: [], y: [], k: [], s: [], steps: [], ok: false };
  if (!tl || Math.abs(tl[0] - tl[1]) > 1e-6 * Math.max(tl[0], tl[1]) || Math.abs(a.k) > 1e-9 || Math.abs(b.k) > 1e-9) {
    out.note = "arc spline: built for straight, symmetric ends only";
    return out;
  }
  // Unit shape: middle curvature sign(turn)·1, end arcs half that.
  const sg = Math.sign(turn);
  const km = sg;
  const ke = sg / 2;
  const be = Math.abs(turn) / 4;
  const bm = Math.abs(turn) / 2;
  const unit: Piece[] = [
    { k0: ke, k1: ke, L: be / Math.abs(ke) },
    { k0: km, k1: km, L: bm / Math.abs(km) },
    { k0: ke, k1: ke, L: be / Math.abs(ke) },
  ];
  // Tangent length of the unit shape: walk it from the origin heading 0.
  const [ux, uy] = walk(0, 0, 0, unit, 64);
  const uEnd: CornerEnd = { p: [ux, uy], t: [Math.cos(turn), Math.sin(turn)], k: 0 };
  const ut = tangentLengths({ p: [0, 0], t: [1, 0], k: 0 }, uEnd);
  if (!ut) {
    out.note = "arc spline: degenerate unit shape";
    return out;
  }
  const scale = tl[0] / ut[0];
  const pieces = unit.map((p) => ({ k0: p.k0 / scale, k1: p.k1 / scale, L: p.L * scale }));
  const per = Math.ceil(samples / 3);
  walk(a.p[0], a.p[1], angleOf(a.t), pieces, per, out);
  // walk() labels a step's samples with the arriving piece's curvature;
  // relabel each sample by the piece it lies in (the joins take the next).
  out.k.length = 0;
  let acc = 0;
  for (let i = 0; i < out.s.length; i++) {
    const s = out.s[i];
    const L0 = pieces[0].L;
    const L1 = L0 + pieces[1].L;
    out.k.push(s < L0 - 1e-12 ? pieces[0].k0 : s < L1 - 1e-12 ? pieces[1].k0 : pieces[2].k0);
    acc = s;
  }
  void acc;
  out.x[out.x.length - 1] = b.p[0];
  out.y[out.y.length - 1] = b.p[1];
  out.steps = [Math.abs(pieces[1].k0 - pieces[0].k0), Math.abs(pieces[2].k0 - pieces[1].k0)];
  out.ok = true;
  out.note = `R_mid ${(1 / Math.abs(pieces[1].k0)).toFixed(4)} R_end ${(1 / Math.abs(pieces[0].k0)).toFixed(4)}`;
  return out;
}

export function buildG2(kind: G2Kind, a: CornerEnd, b: CornerEnd): CurveSamples {
  if (kind === "clothoid") return clothoidPair(a, b);
  if (kind === "bezier5") return bezier5(a, b);
  return arcs3(a, b);
}

/** Distance from v along the unit ray u to the sampled curve, or NaN. */
export function rayHit(c: CurveSamples, vx: number, vy: number, ux: number, uy: number): number {
  let best = NaN;
  for (let i = 0; i + 1 < c.x.length; i++) {
    const ax = c.x[i] - vx;
    const ay = c.y[i] - vy;
    const ex = c.x[i + 1] - c.x[i];
    const ey = c.y[i + 1] - c.y[i];
    const det = ux * -ey - uy * -ex;
    if (Math.abs(det) < 1e-300) continue;
    // v + t·u = c_i + w·e  →  t·u − w·e = a
    const t = (ax * -ey - ay * -ex) / det;
    const w = (ux * ay - uy * ax) / det;
    if (w < -1e-12 || w > 1 + 1e-12 || t < 0) continue;
    if (Number.isNaN(best) || t < best) best = t;
  }
  return best;
}

/** One-hump test: |κ| (in the corner's turning sense) never falls on the
 * way from either end to the peak, within tol. Returns the worst fall. */
export function humpFall(c: CurveSamples, sense: number): number {
  const k = c.k.map((v) => v * sense);
  let ip = 0;
  for (let i = 1; i < k.length; i++) if (k[i] > k[ip]) ip = i;
  let worst = 0;
  for (let i = 1; i <= ip; i++) worst = Math.max(worst, k[i - 1] - k[i]);
  for (let i = k.length - 2; i >= ip; i--) worst = Math.max(worst, k[i + 1] - k[i]);
  return worst;
}
