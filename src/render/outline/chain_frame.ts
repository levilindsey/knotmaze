// K1247 s18: a chain's smooth local frame, the records' placement (oe=1). Position is linear between
// the chain's samples; the tangent is the samples' central-difference tangents interpolated and
// renormalized, and the signed curvature is interpolated the same way, so a point held at (s, b)
// across the chain moves smoothly as the chain bends: what a vertex shader does from the chain
// texture (BandGpu.chainTex holds the same samples). Off by default; today's look never reads it.

export interface FrameChain { closed: boolean; len: number; xs: Float64Array; ys: Float64Array; s: Float64Array; n: number }

/** K1341 s1 (perf): ((d % L) + L) % L bit for bit for a finite L > 0, without V8's fmod runtime call
 *  in the common case. fmod is exact, so d % L is d itself when |d| < L (signed zero included); then
 *  t = r + L rounds exactly as before and lies in (0, 2L], where t % L is t below L, t - L (exact,
 *  Sterbenz; +0 at t = L) for L <= t < 2L and +0 at t = 2L. NaN passes through. */
export function wrapL(d: number, L: number): number {
  const r = d > -L && d < L ? d : d % L;
  const t = r + L;
  return t >= L ? (t < 2 * L ? t - L : 0) : t;
}

/** Per-sample tangents and signed curvature of one chain, rebuilt each frame. */
export interface ChainTangents { tx: Float64Array; ty: Float64Array; k: Float64Array }

export function chainTangents(c: FrameChain): ChainTangents {
  const n = c.n; const tx = new Float64Array(n); const ty = new Float64Array(n); const k = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = c.closed ? (i - 1 + n) % n : Math.max(0, i - 1);
    const b = c.closed ? (i + 1) % n : Math.min(n - 1, i + 1);
    const ax = c.xs[i] - c.xs[a]; const ay = c.ys[i] - c.ys[a]; const bx = c.xs[b] - c.xs[i]; const by = c.ys[b] - c.ys[i];
    const dx = ax + bx; const dy = ay + by; const l = Math.sqrt(dx * dx + dy * dy) || 1;
    tx[i] = dx / l; ty[i] = dy / l;
    const la = Math.sqrt(ax * ax + ay * ay); const lb = Math.sqrt(bx * bx + by * by);
    if (la > 1e-12 && lb > 1e-12) {
      const cr = (ax * by - ay * bx) / (la * lb); const dt = (ax * bx + ay * by) / (la * lb);
      k[i] = Math.atan2(cr, dt) / (0.5 * (la + lb));
    }
  }
  return { tx, ty, k };
}

/** Writes (x, y, tx, ty, kappa) at arc s into out; hint is the segment to start the walk from (the
 *  previous call's, for s running along a strip). Returns the segment. */
export function frameAt(c: FrameChain, t: ChainTangents, s: number, hint: number, out: Float64Array): number {
  const m = c.n - 1;
  const loop = c.closed && c.len > 0;
  const u = loop ? wrapL(s, c.len) : Math.min(Math.max(s, 0), c.s[m]);
  let k = hint < 0 || hint > m ? 0 : hint;
  const segEnd = (q: number): number => (q < m ? c.s[q + 1] : loop ? c.len : c.s[m]);
  let guard = 0;
  while (guard++ < 64 && !(c.s[k] <= u && u <= segEnd(k))) {
    if (u < c.s[k]) k--; else k++;
    if (k < 0) k = loop ? m : 0; else if (k > m || (!loop && k > m - 1)) k = loop ? 0 : Math.max(0, m - 1);
  }
  if (guard >= 64) {
    let lo = 0; let hi = m;
    while (hi - lo > 1) { const q = (lo + hi) >> 1; if (c.s[q] <= u) lo = q; else hi = q; }
    k = u >= c.s[m] ? (loop ? m : Math.max(0, m - 1)) : lo;
  }
  if (!loop && k > m - 1) k = Math.max(0, m - 1);
  const j = k < m ? k + 1 : 0;
  const L = segEnd(k) - c.s[k]; const f = L > 0 ? Math.min(1, Math.max(0, (u - c.s[k]) / L)) : 0;
  out[0] = c.xs[k] + (c.xs[j] - c.xs[k]) * f; out[1] = c.ys[k] + (c.ys[j] - c.ys[k]) * f;
  const tx = t.tx[k] + (t.tx[j] - t.tx[k]) * f; const ty = t.ty[k] + (t.ty[j] - t.ty[k]) * f; const l = Math.sqrt(tx * tx + ty * ty) || 1;
  out[2] = tx / l; out[3] = ty / l; out[4] = t.k[k] + (t.k[j] - t.k[k]) * f;
  return k;
}

/** The convex side's sagitta push, as a share of the chord's sagitta (probes vary it). */
export const SAG = { f: 0 };
/** Columns uniform in the SIDE's length, not in s (probes vary it). */
export const ARC = { on: false, sub: 3 };

/** A side's column s values, uniform in its border length (1 - sgn kap b) ds between sA and sA + dS:
 *  sub x N midpoint steps, then the inverse. What a vertex shader would read from a per-chain prefix
 *  of the side's length. */
function arcColumns(c: FrameChain, t: ChainTangents, sA: number, dS: number, N: number, sgn: number, h: number): Float64Array {
  const M = ARC.sub * N; const cum = new Float64Array(M + 1); const fa = new Float64Array(5); let hint = -1;
  const step = Math.abs(dS) / M;
  for (let q = 1; q <= M; q++) {
    hint = frameAt(c, t, sA + (dS * (q - 0.5)) / M, hint, fa); const kap = fa[4]; const ak = Math.abs(kap);
    const b = sgn * kap > 0 ? Math.min(h, 0.9 / ak) : h;
    cum[q] = cum[q - 1] + Math.max(0.05, 1 - sgn * kap * b) * step;
  }
  const us = new Float64Array(N + 1); let q = 1;
  for (let i = 1; i < N; i++) {
    const tg = (cum[M] * i) / N; while (q < M && cum[q] < tg) q++;
    const a = cum[q - 1]; const w = cum[q] - a; const f = w > 0 ? (tg - a) / w : 0;
    us[i] = sA + (dS * (q - 1 + f)) / M;
  }
  return us;
}

/** Row i = 1..N-1 of a strip side: C(s) + sgn b N(s) at s = sA + dS i / N, b = h clamped to 0.9 of the
 *  radius on the concave side; into out[2i], out[2i+1]. A cursor walks the segments (rows run along s).
 *  POLY.mode >= 1 (K1247 s20): polyRow's columns instead, their s into sOut; false where it folds. */
export function offsetRow(c: FrameChain, t: ChainTangents, sA: number, dS: number, N: number, sgn: number, h: number, out: Float64Array, sOut: Float64Array | null = null): boolean {
  if (POLY.mode > 0) return polyRow(c, sA, dS, N, sgn, h, 1, N - 1, out, sOut);
  const m = c.n - 1; const loop = c.closed && c.len > 0; const L = c.len;
  const xs = c.xs; const ys = c.ys; const ss = c.s; const tx = t.tx; const ty = t.ty; const kk = t.k;
  const us = ARC.on ? arcColumns(c, t, sA, dS, N, sgn, h) : null;
  let k = -1;
  for (let i = 1; i < N; i++) {
    let u = us ? us[i] : sA + (dS * i) / N;
    if (loop) { if (u < 0 || u >= L) u = wrapL(u, L); } else u = u < 0 ? 0 : u > ss[m] ? ss[m] : u;
    if (k < 0 || u < ss[k] || u > (k < m ? ss[k + 1] : L)) {
      if (k >= 0 && k < m && u > ss[k + 1] && (k + 1 >= m || u <= ss[k + 2])) k++;
      else { let lo = 0; let hi = m; while (hi - lo > 1) { const q = (lo + hi) >> 1; if (ss[q] <= u) lo = q; else hi = q; } k = u >= ss[m] ? (loop ? m : m - 1) : lo; }
    }
    const j = k < m ? k + 1 : 0; const e = k < m ? ss[k + 1] : L; const sl = e - ss[k];
    const f = sl > 0 ? (u - ss[k]) / sl : 0;
    const x = xs[k] + (xs[j] - xs[k]) * f; const y = ys[k] + (ys[j] - ys[k]) * f;
    let ax = tx[k] + (tx[j] - tx[k]) * f; let ay = ty[k] + (ty[j] - ty[k]) * f; const l = Math.sqrt(ax * ax + ay * ay) || 1; ax /= l; ay /= l;
    const kap = kk[k] + (kk[j] - kk[k]) * f;
    // Convex side: out by the chord's sagitta, (dS/N)^2 |kap| (1 + h |kap|) / 8 (the border's chord is
    // (1 + h|kap|) times a centreline step, its curvature |kap| / (1 + h|kap|)), so the side's chords
    // do not cut inside form B's arc (columns are uniform in s, not in border length).
    const ak = Math.abs(kap); const st = dS / N;
    const b = sgn * kap > 0 ? Math.min(h, 0.9 / ak) : h + SAG.f * st * st * ak * (1 + h * ak) / 8;
    out[2 * i] = x - sgn * b * ay; out[2 * i + 1] = y + sgn * b * ax;
  }
  return true;
}

/** z (the chain's depth, linear between samples) at s = sA + dS i / N, i = 0..N, into out[i]. */
export function zRow(c: FrameChain & { z: Float64Array }, sA: number, dS: number, N: number, out: Float64Array): void {
  const m = c.n - 1; const loop = c.closed && c.len > 0; const L = c.len; const ss = c.s; const z = c.z;
  let k = -1;
  for (let i = 0; i <= N; i++) {
    let u = sA + (dS * i) / N;
    if (loop) { if (u < 0 || u >= L) u = wrapL(u, L); } else u = u < 0 ? 0 : u > ss[m] ? ss[m] : u;
    if (!loop && u >= ss[m]) { out[i] = z[m]; continue; }
    if (k < 0 || u < ss[k] || u > (k < m ? ss[k + 1] : L)) {
      if (k >= 0 && k < m && u > ss[k + 1] && (k + 1 >= m || u <= ss[k + 2])) k++;
      else { let lo = 0; let hi = m; while (hi - lo > 1) { const q = (lo + hi) >> 1; if (ss[q] <= u) lo = q; else hi = q; } k = u >= ss[m] ? m : lo; }
    }
    const j = k < m ? k + 1 : 0; const e = k < m ? ss[k + 1] : L; const sl = e - ss[k];
    out[i] = z[k] + (z[j] - z[k]) * (sl > 0 ? (u - ss[k]) / sl : 0);
  }
}

// K1247 s19 (oe=1 places the records on the GPU): single points of the same frame, the tangents taken
// on the fly from the samples (chainTangents' formula, so the values equal its rows), for the few
// columns the CPU still places (a strip's moving ends and the columns beside them).

/** chainTangents' (tx, ty, k) at sample i, into out[0..2]. */
export function tanAt(c: FrameChain, i: number, out: Float64Array, o = 0): void {
  const n = c.n;
  const a = c.closed ? (i - 1 + n) % n : Math.max(0, i - 1);
  const b = c.closed ? (i + 1) % n : Math.min(n - 1, i + 1);
  const ax = c.xs[i] - c.xs[a]; const ay = c.ys[i] - c.ys[a]; const bx = c.xs[b] - c.xs[i]; const by = c.ys[b] - c.ys[i];
  const dx = ax + bx; const dy = ay + by; const l = Math.sqrt(dx * dx + dy * dy) || 1;
  out[o] = dx / l; out[o + 1] = dy / l; out[o + 2] = 0;
  const la = Math.sqrt(ax * ax + ay * ay); const lb = Math.sqrt(bx * bx + by * by);
  if (la > 1e-12 && lb > 1e-12) {
    const cr = (ax * by - ay * bx) / (la * lb); const dt = (ax * bx + ay * by) / (la * lb);
    out[o + 2] = Math.atan2(cr, dt) / (0.5 * (la + lb));
  }
}

/** K1247 s20: how a record side's columns are placed. 0: C(s) +- b N(s) in the smooth frame (s18, s19),
 *  whose points sit inside the border wherever the polyline turns (the cracks against form B); 1: on the
 *  border's own polygon (outline.ts buildBorder: each segment's offset line, trimmed at a concave
 *  vertex's miter, a convex vertex's fan of pi/16 chords). Both sides share one parameter u, the chain's
 *  s with each vertex given its fan's length w (the convex side walks the fan over it, the concave side
 *  waits at the miter), so a column's two side points stay across the strip from each other; columns are
 *  uniform in u. 2: as 1, and the column nearest each polygon vertex (within half a step; the sharpest
 *  vertex first) moves onto it, so no column chord cuts a corner off. */
export const POLY = { mode: 4, folds: 0, calls: 0 };
const FAN_STEP = Math.PI / 16;
const CW = new Float64Array(10);

/** Vertex v's corner on side sgn (none at an open chain's ends or a straight vertex): into o, [type
 *  (0 none, 1 convex fan, 2 concave miter), trim h tan(theta / 2) (concave), the fan's length w (either
 *  side: the shared u's width at v), a0, da, steps, miter x, miter y, theta]. */
function cornerAt(c: FrameChain, v: number, sgn: number, h: number, o: Float64Array): void {
  const m = c.n - 1; const loop = c.closed && c.len > 0; o[0] = 0; o[1] = 0; o[2] = 0; o[5] = 0; o[8] = 0;
  if (!loop && (v <= 0 || v >= m)) return;
  const p = v > 0 ? v - 1 : m; const q = v < m ? v + 1 : 0;
  const xs = c.xs; const ys = c.ys;
  let ax = xs[v] - xs[p]; let ay = ys[v] - ys[p]; let bx = xs[q] - xs[v]; let by = ys[q] - ys[v];
  const la = Math.sqrt(ax * ax + ay * ay); const lb = Math.sqrt(bx * bx + by * by);
  if (!(la > 0 && lb > 0)) return;
  ax /= la; ay /= la; bx /= lb; by /= lb;
  const cr = ax * by - ay * bx; const dt = ax * bx + ay * by;
  if (Math.abs(cr) < 1e-12) return;
  // Side normals sgn (-dy, dx), as offsetRow's.
  const n1x = -sgn * ay; const n1y = sgn * ax; const n2x = -sgn * by; const n2y = sgn * bx;
  const da = Math.atan2(n1x * n2y - n1y * n2x, n1x * n2x + n1y * n2y); const th = Math.abs(da);
  const steps = Math.max(1, Math.ceil(th / FAN_STEP));
  o[2] = steps * 2 * h * Math.sin(th / (2 * steps)); o[5] = steps; o[8] = th;
  if (sgn * cr > 0) {
    o[0] = 2; o[1] = (h * Math.abs(cr)) / (1 + dt);
    const d = 1 + n1x * n2x + n1y * n2y;
    o[6] = xs[v] + (h * (n1x + n2x)) / d; o[7] = ys[v] + (h * (n1y + n2y)) / d;
  } else { o[0] = 1; o[3] = Math.atan2(n1y, n1x); o[4] = da; o[5] = steps; }
}

// A side's pieces along u, PS floats each: [type, u0, uLen, s0, s1, ...]: type 0 an edge from (x0, y0)
// to (x1, y1) at [5..8]; 1 a fan about (cx, cy) [5, 6], a0, da, steps [7..9]; 2 a fixed point (x, y)
// [5, 6] (a miter).
const PS = 10; let PC = new Float64Array(64 * PS);
// Polygon vertices for the snap: [u, sharpness].
let VX = new Float64Array(128);
// Mode 4: the strip's interior chain vertices, [u at the fan's start, w, steps] (steps 0: a straight one).
let FV = new Float64Array(96);

/** Columns i = iLo..iHi (1 <= i <= N-1) of a record side on the border's polygon (POLY.mode >= 1)
 *  into out[2i], out[2i+1], and their centreline s into sOut[i] when given. False when the side folds
 *  (two miters' trims overlap on a segment: the border there is cutFolds', not this). */
export function polyRow(c: FrameChain, sA: number, dS: number, N: number, sgn: number, h: number, iLo: number, iHi: number, out: Float64Array, sOut: Float64Array | null): boolean {
  const n = c.n; const m = n - 1; const loop = c.closed && c.len > 0; const L = c.len;
  const xs = c.xs; const ys = c.ys; const ss = c.s;
  const segEnd = (k: number): number => (k < m ? ss[k + 1] : L);
  let a = sA; let base = 0;
  if (loop) { const w = wrapL(a, L); base = a - w; a = w; } else a = a < 0 ? 0 : a > ss[m] ? ss[m] : a;
  const sB = loop ? sA + dS : Math.min(Math.max(sA + dS, 0), ss[m]);
  let k: number;
  if (a >= ss[m]) k = loop ? m : m - 1;
  else { let lo = 0; let hi = m; while (hi - lo > 1) { const q = (lo + hi) >> 1; if (ss[q] <= a) lo = q; else hi = q; } k = lo; }
  const sStart = a + base; const eps = 1e-9;
  let np = 0; let nv = 0; let nf = 0; let U = 0; let bs = base; let first = true; let ok = true;
  const grow = (): void => {
    if ((np + 8) * PS > PC.length) { const t = new Float64Array(PC.length * 2); t.set(PC); PC = t; }
    if (2 * (nv + 40) > VX.length) { const t = new Float64Array(VX.length * 2); t.set(VX); VX = t; }
    if (3 * (nf + 2) > FV.length) { const t = new Float64Array(FV.length * 2); t.set(FV); FV = t; }
  };
  const piece = (type: number, uLen: number, s0: number, s1: number, p5: number, p6: number, p7: number, p8: number, p9 = 0): void => {
    if (!(uLen > 0)) return;
    const o = np * PS; PC[o] = type; PC[o + 1] = U; PC[o + 2] = uLen; PC[o + 3] = s0; PC[o + 4] = s1;
    PC[o + 5] = p5; PC[o + 6] = p6; PC[o + 7] = p7; PC[o + 8] = p8; PC[o + 9] = p9; np++; U += uLen;
  };
  const vtx = (u: number, sharp: number): void => { VX[2 * nv] = u; VX[2 * nv + 1] = sharp; nv++; };
  for (let g = 0; g <= n + 1; g++) {
    grow();
    const st = ss[k] + bs; const en = segEnd(k) + bs; const last = en >= sB - eps;
    const j = k < m ? k + 1 : 0;
    let dx = xs[j] - xs[k]; let dy = ys[j] - ys[k]; const l = Math.sqrt(dx * dx + dy * dy) || 1; dx /= l; dy /= l;
    const nx = -sgn * dy; const ny = sgn * dx;
    cornerAt(c, k, sgn, h, CW); const eS = CW[0] === 2 ? CW[1] : 0; const mSx = CW[6]; const mSy = CW[7];
    cornerAt(c, j, sgn, h, CW); const eE = CW[0] === 2 ? CW[1] : 0; const mEx = CW[6]; const mEy = CW[7];
    let es = st + eS; let ee = en - eE;
    if (ee < es) { ok = false; const mid = st + ((en - st) * eS) / (eS + eE); es = mid; ee = mid; }
    const ca = first ? Math.max(st, Math.min(en, sStart)) : st; const cb = last ? Math.max(ca, Math.min(en, sB)) : en;
    first = false;
    // [ca, cb] in s: the start miter's trim, the edge, the end miter's trim.
    const t1 = Math.min(cb, es); if (t1 > ca) piece(2, t1 - ca, ca, t1, mSx, mSy, 0, 0);
    const e0 = Math.max(ca, es); const e1 = Math.min(cb, ee);
    if (e1 > e0) piece(0, e1 - e0, e0, e1, xs[k] + dx * (e0 - st) + h * nx, ys[k] + dy * (e0 - st) + h * ny, xs[k] + dx * (e1 - st) + h * nx, ys[k] + dy * (e1 - st) + h * ny);
    const t2 = Math.max(ca, ee); if (cb > t2) piece(2, cb - t2, t2, cb, mEx, mEy, 0, 0);
    if (last) break;
    // Vertex j, inside the strip: its width w in u.
    cornerAt(c, j, sgn, h, CW);
    FV[3 * nf] = U; FV[3 * nf + 1] = CW[2]; FV[3 * nf + 2] = CW[5]; nf++;
    if (CW[0] === 1) {
      const steps = CW[5]; const w = CW[2]; const th = CW[8];
      vtx(U, th / (2 * steps));
      const u0 = U; piece(1, w, en, en, xs[j], ys[j], CW[3], CW[4], steps);
      for (let f = 1; f < steps; f++) vtx(u0 + (w * f) / steps, th / steps);
      vtx(U, th / (2 * steps));
    } else if (CW[0] === 2) {
      vtx(U + CW[2] / 2, CW[8]); piece(2, CW[2], en, en, CW[6], CW[7], 0, 0);
    }
    if (k < m - (loop ? 0 : 1)) k++; else if (loop) { k = 0; bs += L; } else break;
  }
  // Column targets, uniform in u; mode 2 moves the nearest column onto each vertex, sharpest first.
  const T = targets(N, U, nv, nf);
  let p = 0;
  for (let i = iLo; i <= iHi; i++) {
    const t = T[i];
    while (p + 1 < np && t > PC[(p + 1) * PS + 1]) p++;
    const o = p * PS; const len = PC[o + 2]; const f = len > 0 ? Math.min(1, Math.max(0, (t - PC[o + 1]) / len)) : 0;
    const ty = PC[o];
    if (ty === 0) { out[2 * i] = PC[o + 5] + (PC[o + 7] - PC[o + 5]) * f; out[2 * i + 1] = PC[o + 6] + (PC[o + 8] - PC[o + 6]) * f; }
    else if (ty === 2) { out[2 * i] = PC[o + 5]; out[2 * i + 1] = PC[o + 6]; }
    else {
      const steps = PC[o + 9]; const qq = f * steps; const jf = Math.min(steps - 1, Math.floor(qq)); const fr = qq - jf;
      const c0 = PC[o + 7] + (PC[o + 8] * jf) / steps; const c1 = PC[o + 7] + (PC[o + 8] * (jf + 1)) / steps;
      out[2 * i] = PC[o + 5] + h * (Math.cos(c0) + (Math.cos(c1) - Math.cos(c0)) * fr);
      out[2 * i + 1] = PC[o + 6] + h * (Math.sin(c0) + (Math.sin(c1) - Math.sin(c0)) * fr);
    }
    if (sOut) sOut[i] = PC[o + 3] + (PC[o + 4] - PC[o + 3]) * f;
  }
  POLY.calls++; if (!ok) POLY.folds++;
  return ok;
}

let TG = new Float64Array(64); let TS = new Float64Array(64);
/** The columns' u: U i / N, then (mode 2) each polygon vertex (VX) claims its nearest column within half
 *  a step when no sharper vertex has: what a vertex shader decides per column from the vertices within
 *  half a step of it. */
function targets(N: number, U: number, nv: number, nf: number): Float64Array {
  if (TG.length < N + 1) { TG = new Float64Array(2 * (N + 1)); TS = new Float64Array(2 * (N + 1)); }
  const du = U / N;
  for (let i = 0; i <= N; i++) { TG[i] = du * i; TS[i] = -1; }
  if (POLY.mode === 4 && du > 0) {
    // Each interior vertex's fan takes `steps` columns, one per fan point, from column
    // round(S_before B / S) + F_before (S: the straight length, B = N - F the straight columns, F the
    // fan steps; *_before: before this vertex); the straight parts between take the columns left,
    // evenly in u. Per column, a later vertex's fan wins. Decidable per column (a vertex shader's
    // search over the chain's prefix of steps), unlike mode 3.
    let wsum = 0; let ft = 0;
    for (let f = 0; f < nf; f++) { wsum += FV[3 * f + 1]; ft += FV[3 * f + 2]; }
    const S = U - wsum; const B = N - ft;
    if (S > 0 && B >= 1) {
      let pc = 0; let pu = 0; let wb = 0; let fb = 0;
      for (let f = 0; f < nf; f++) {
        const u0 = FV[3 * f]; const w = FV[3 * f + 1]; const st = FV[3 * f + 2];
        const cs = Math.round(((u0 - wb) * B) / S) + fb;
        for (let i = pc + 1; i < cs && i < N; i++) TG[i] = pu + ((u0 - pu) * (i - pc)) / (cs - pc);
        for (let g = 0; g <= st; g++) { const i = cs + g; if (i >= 1 && i <= N - 1) TG[i] = st > 0 ? u0 + (w * g) / st : u0; }
        pc = cs + st; pu = u0 + w; wb += w; fb += st;
      }
      for (let i = pc + 1; i < N; i++) TG[i] = pu + ((U - pu) * (i - pc)) / (N - pc);
      return TG;
    }
  }
  if (POLY.mode === 3 && du > 0) {
    // As the off fill's resample: every vertex its own column, at the index nearest its u, kept
    // increasing; the columns between two kept vertices spread evenly in u between them.
    let cnt = 0; const e = 1e-9 * (U + 1);
    for (let q = 0; q < nv; q++) { const u = VX[2 * q]; if (u > e && u < U - e) cnt++; }
    if (cnt <= N - 1) {
      let prev = 0; let pu = 0; let left = cnt; let lastU = -1;
      for (let q = 0; q < nv; q++) {
        const u = VX[2 * q]; if (!(u > e && u < U - e)) continue;
        left--; if (Math.abs(u - lastU) <= e) continue; lastU = u;
        const idx = Math.min(N - 1 - left, Math.max(prev + 1, Math.round(u / du)));
        for (let i = prev + 1; i < idx; i++) TG[i] = pu + ((u - pu) * (i - prev)) / (idx - prev);
        TG[idx] = u; prev = idx; pu = u;
      }
      for (let i = prev + 1; i < N; i++) TG[i] = pu + ((U - pu) * (i - prev)) / (N - prev);
      return TG;
    }
  }
  if (POLY.mode >= 2 && du > 0) {
    for (let q = 0; q < nv; q++) {
      const u = VX[2 * q]; const sh = VX[2 * q + 1]; const j = Math.round(u / du);
      if (j < 1 || j > N - 1 || Math.abs(u - du * j) > 0.5 * du) continue;
      if (sh > TS[j]) { TS[j] = sh; TG[j] = u; }
    }
  }
  return TG;
}

/** K1247 s20 (POLY.mode 4): vertex v's fan steps (side-independent; 0 at an open chain's end, a
 *  degenerate or a straight vertex), its miter trim h tan(theta / 2) and on which side that trim is (the
 *  sign of the turn): [steps, trim, sign]. As cornerAt. */
function stepsAt(c: FrameChain, v: number, h: number, o: Float64Array): void {
  const m = c.n - 1; const loop = c.closed && c.len > 0; o[0] = 0; o[1] = 0; o[2] = 0;
  if (!loop && (v <= 0 || v >= m)) return;
  const p = v > 0 ? v - 1 : m; const q = v < m ? v + 1 : 0;
  const xs = c.xs; const ys = c.ys;
  let ax = xs[v] - xs[p]; let ay = ys[v] - ys[p]; let bx = xs[q] - xs[v]; let by = ys[q] - ys[v];
  const la = Math.sqrt(ax * ax + ay * ay); const lb = Math.sqrt(bx * bx + by * by);
  if (!(la > 0 && lb > 0)) return;
  ax /= la; ay /= la; bx /= lb; by /= lb;
  const cr = ax * by - ay * bx; const dt = ax * bx + ay * by;
  if (Math.abs(cr) < 1e-12) return;
  // K1247 s28 (perf): a turn under FAN_STEP is one step without Math.atan2 (most samples of a smooth
  // chain). TAN_STEP sits 1e-9 (relative) inside tan(FAN_STEP), far past atan2's and the product's
  // rounding, so atan2 / FAN_STEP is below 1 there and the ceil would give 1 too: the same steps.
  o[0] = dt > 0 && Math.abs(cr) <= dt * TAN_STEP ? 1 : Math.max(1, Math.ceil(Math.abs(Math.atan2(cr, dt)) / FAN_STEP));
  o[1] = (h * Math.abs(cr)) / (1 + dt); o[2] = cr > 0 ? 1 : -1;
}
const TAN_STEP = Math.tan(FAN_STEP) * (1 - 1e-9);

/** K1247 s20: the record placement's chain tables, one entry a chain sample in band_gpu's chainTex
 *  layout (chains back to back): pf the fan steps of samples 0..v (inclusive prefix; the shader's
 *  uRecPf), fp / fm the folds on side +1 / -1 of segments 0..v (segment v runs from sample v to v + 1;
 *  a fold: the two miters' trims overlap on it).
 *  K1247 s28 (perf): the last call's tables are reused for the same chains and h (fillFrame and the
 *  band both ask for them each frame, on one zChains); nobody writes them, and the outline worker
 *  transfers a buffer the two share once. */
export interface RecTables { pf: Float32Array; fp: Int32Array; fm: Int32Array; base: number[] }
let RT_ZC: readonly FrameChain[] | null = null; let RT_H = NaN; let RT_T: RecTables | null = null;
export function recTables(zc: readonly FrameChain[], h: number): RecTables {
  if (zc === RT_ZC && h === RT_H && RT_T && RT_T.pf.length > 0) return RT_T;
  const base: number[] = []; let nS = 0;
  for (const c of zc) { base.push(nS); nS += c.n; }
  const pf = new Float32Array(Math.max(1, nS)); const fp = new Int32Array(Math.max(1, nS)); const fm = new Int32Array(Math.max(1, nS));
  // Each sample's steps once (the fold test reads a segment's two ends: the next segment's first is this one's last).
  let A = new Float64Array(3); let Bc = new Float64Array(3); const A0 = new Float64Array(3);
  zc.forEach((c, ci) => {
    const o = base[ci]; const n = c.n; const m = n - 1; const loop = c.closed && c.len > 0;
    let sp = 0; let cp = 0; let cm = 0;
    if (n > 0) { stepsAt(c, 0, h, A); A0[0] = A[0]; A0[1] = A[1]; A0[2] = A[2]; }
    for (let v = 0; v < n; v++) {
      sp += A[0]; pf[o + v] = sp;
      if (v < m || loop) {
        if (v < m) stepsAt(c, v + 1, h, Bc); else { Bc[0] = A0[0]; Bc[1] = A0[1]; Bc[2] = A0[2]; }
        const len = (v < m ? c.s[v + 1] : c.len) - c.s[v];
        if ((A[2] > 0 ? A[1] : 0) + (Bc[2] > 0 ? Bc[1] : 0) > len) cp++;
        if ((A[2] < 0 ? A[1] : 0) + (Bc[2] < 0 ? Bc[1] : 0) > len) cm++;
        const t = A; A = Bc; Bc = t;
      }
      fp[o + v] = cp; fm[o + v] = cm;
    }
  });
  RT_ZC = zc; RT_H = h; RT_T = { pf, fp, fm, base };
  return RT_T;
}

// A record side's span: [a (the start, wrapped into [0, L) on a loop), sB (the end, same frame), k (the
// first segment), V1, V2 (the interior vertices, unwrapped: sample V % n, s(V) = s[V % n] + floor(V / n)
// L), base (sA minus a: colAt's s is in sA's frame)]. As polyRow's walk.
// K1247 s27 (K1327): a sample within SPAN_EPS of the span's start or end counts as at it (k takes it,
// V2 leaves it out). A piece often ends on a chain sample, and the table's float32 sA, dS put that end
// a few float32 ulps either side of it: float64 here and float32 in rec_glsl's recSpan split such a tie
// differently, and a corner's fan steps then moved in or out of the span, shifting every column after
// it by a step (muse_hash o375, o850: 1.85 px). The tolerance is far above float32's error at these s
// (2e-4 against an ulp of 4e-6 at s 40) and far below a column (h / 8), and recSpan uses the same one.
export const SPAN_EPS = 2e-4;
const SPN = new Float64Array(8);
// K1341 s1 (perf): spanOf's last results while fillFrame runs (spanMemo(true) .. spanMemo(false)). A record's
// two sides ask for the same span four to eight times (fill_tri's sides(), recSideOk, sideAt), on chains
// fillFrame never writes; a hit is the same chain object and the same sA and dS, signed zeros included,
// so the same SPN.
const SPM = 4; let SP_ON = false; let SPI = 0;
const SPC: (FrameChain | null)[] = [null, null, null, null]; const SPA = new Float64Array(SPM); const SPD = new Float64Array(SPM);
const SPV = new Float64Array(8 * SPM);
export function spanMemo(on: boolean): void { SP_ON = on; SPC.fill(null); SPI = 0; }
const sameF = (x: number, y: number): boolean => x === y && (x !== 0 || 1 / x === 1 / y);
function spanOf(c: FrameChain, sA: number, dS: number): Float64Array {
  if (!SP_ON) return spanCalc(c, sA, dS);
  for (let e = 0; e < SPM; e++) {
    if (SPC[e] === c && sameF(SPA[e], sA) && sameF(SPD[e], dS)) { const o = 8 * e; for (let i = 0; i < 8; i++) SPN[i] = SPV[o + i]; return SPN; }
  }
  spanCalc(c, sA, dS);
  const e = SPI; SPI = SPI + 1 === SPM ? 0 : SPI + 1; SPC[e] = c; SPA[e] = sA; SPD[e] = dS;
  const o = 8 * e; for (let i = 0; i < 8; i++) SPV[o + i] = SPN[i];
  return SPN;
}
function spanCalc(c: FrameChain, sA: number, dS: number): Float64Array {
  const n = c.n; const m = n - 1; const loop = c.closed && c.len > 0; const L = c.len; const ss = c.s;
  let a = sA; let base = 0;
  if (loop) { const w = wrapL(a, L); base = a - w; a = w; } else a = a < 0 ? 0 : a > ss[m] ? ss[m] : a;
  const sB = (loop ? sA + dS : Math.min(Math.max(sA + dS, 0), ss[m])) - base;
  let k: number;
  if (a + SPAN_EPS >= ss[m]) k = loop ? m : m - 1;
  else { let lo = 0; let hi = m; while (hi - lo > 1) { const q = (lo + hi) >> 1; if (ss[q] <= a + SPAN_EPS) lo = q; else hi = q; } k = lo; }
  // V2: the last V with s(V) < sB - SPAN_EPS (V1 - 1 = k when none).
  const lim = sB - SPAN_EPS; let lo = k; let hi = loop ? k + 1 + n * (Math.floor(Math.max(0, sB) / L) + 2) : m;
  while (hi - lo > 1) { const q = (lo + hi) >> 1; if (sOfV(c, q) < lim) lo = q; else hi = q; }
  // recSpan's own float32 a and S = sB - a (SPN[6], SPN[7]), for colR's column rounding.
  const F = Math.fround; const sA32 = F(sA); const L32 = loop ? F(L) : 0; const sm32 = F(ss[m]);
  const a32 = loop ? F(sA32 - F(L32 * Math.floor(F(sA32 / L32)))) : Math.min(Math.max(sA32, 0), sm32);
  const base32 = loop ? F(sA32 - a32) : 0;
  const sB32 = F((loop ? F(sA32 + F(dS)) : Math.min(Math.max(F(sA32 + F(dS)), 0), sm32)) - base32);
  const S32 = F(sB32 - a32); SPN[6] = a32; SPN[7] = S32 > 0 ? S32 : sB - a;
  SPN[0] = a; SPN[1] = sB; SPN[2] = k; SPN[3] = k + 1; SPN[4] = lo; SPN[5] = base;
  return SPN;
}
/** K1247 s27 (K1327): sample V's column before its fans, (s(V) - a) B / S rounded to the nearest, as the
 *  largest m with (m - 0.5) S <= (s(V) - a) B, from the shader's float32 inputs (the table's s; recSpan's a and
 *  S, spanOf's SPN[6] and SPN[7]) with float32 products, the same rule recCs runs. A sample about half a column
 *  between two columns was rounded one way here (float64 s, a and division) and the other way on the GPU,
 *  whose s - a loses about B / S float32 ulps of s (to 3e-4 of a column) and whose division is not IEEE on
 *  D3D11. That shifted the columns around it by one (def o927 R V828: x = 104.0000018 here, 103.99993 there;
 *  0.54-0.59 px). The division only guesses m here and in recCs; the products and compares settle it. */
function colR(c: FrameChain, V: number, a32: number, B: number, S32: number): number {
  const F = Math.fround; const n = c.n; const q = Math.floor(V / n);
  const sv = q > 0 ? F(F(c.s[V - q * n]) + F(q * F(c.len))) : F(c.s[V]);
  const r = F(F(sv - a32) * B); let m = Math.floor(r / S32 + 0.5);
  if (F((m - 0.5) * S32) > r) m -= 1; else if (F((m + 0.5) * S32) <= r) m += 1;
  return m;
}
function sOfV(c: FrameChain, V: number): number { const n = c.n; const q = Math.floor(V / n); return c.s[V - q * n] + q * c.len; }
function pfU(c: FrameChain, pf: ArrayLike<number>, o: number, V: number): number {
  if (V < 0) return 0; const n = c.n; const q = Math.floor(V / n); return pf[o + V - q * n] + q * pf[o + n - 1];
}
function foldU(c: FrameChain, f: ArrayLike<number>, o: number, V: number): number {
  if (V < 0) return 0; const n = c.n; const q = Math.floor(V / n); return f[o + V - q * n] + q * f[o + n - 1];
}

/** Whether a record side places by mode 4 (else the strip falls back to off): no fold among its
 *  segments, straight length and a straight column left after the fans' columns. */
export function recSideOk(c: FrameChain, T: RecTables, ci: number, sA: number, dS: number, N: number, sgn: number): boolean {
  const o = T.base[ci]; const sp = spanOf(c, sA, dS); const a = sp[0]; const sB = sp[1]; const k = sp[2]; const V1 = sp[3]; const V2 = sp[4];
  const F = pfU(c, T.pf, o, V2) - pfU(c, T.pf, o, V1 - 1);
  if (!(sB - a > 0) || N - F < 1) return false;
  const fd = sgn > 0 ? T.fp : T.fm;
  return foldU(c, fd, o, V2) - foldU(c, fd, o, k - 1) === 0;
}

/** Column i (1 <= i <= N - 1) of a record side placed by mode 4 into out[oi], out[oi + 1]; returns its
 *  centreline s. Each interior vertex V's fan takes the columns cs(V) .. cs(V) + steps(V), one per fan
 *  point (a concave side's miter for each), cs(V) = (s(V) - a) B / S rounded, + F_before(V) (S the straight
 *  length, B = N - F the straight columns); the straight parts take the columns between, evenly in s; a
 *  later fan wins a shared column. Every polygon vertex of the border (outline.ts buildBorder) lands on a
 *  column, so no chord between two columns cuts a corner. The shader's recCol is this, line for line. */
export function colAt(c: FrameChain, pf: ArrayLike<number>, o: number, sA: number, dS: number, N: number, sgn: number, h: number, i: number, out: Float64Array, oi: number): number {
  const sp = spanOf(c, sA, dS); const a = sp[0]; const sB = sp[1]; const k = sp[2]; const V1 = sp[3]; const V2 = sp[4];
  const p0 = pfU(c, pf, o, V1 - 1); const B = N - (pfU(c, pf, o, V2) - p0);
  const a32 = sp[6]; const S32 = sp[7]; const cs = (V: number): number => colR(c, V, a32, B, S32) + pfU(c, pf, o, V - 1) - p0;
  // The last interior V with cs(V) <= i (V1 - 1: none).
  let lo = V1 - 1; let hi = V2 + 1;
  while (hi - lo > 1) { const q = (lo + hi) >> 1; if (cs(q) <= i) lo = q; else hi = q; }
  const V = lo; let s: number; let K: number;
  if (V >= V1) {
    const st = pfU(c, pf, o, V) - pfU(c, pf, o, V - 1); const c0 = cs(V); const g = i - c0;
    if (g <= st) { fanPt(c, V % c.n, sgn, h, st, g, out, oi); return sOfV(c, V) + sp[5]; }
    const ce = c0 + st; const sv = sOfV(c, V); const cn = V < V2 ? cs(V + 1) : N; const sn = V < V2 ? sOfV(c, V + 1) : sB;
    s = sv + ((sn - sv) * (i - ce)) / (cn - ce); K = V;
  } else {
    const cn = V2 >= V1 ? cs(V1) : N; const sn = V2 >= V1 ? sOfV(c, V1) : sB;
    s = a + ((sn - a) * i) / cn; K = k;
  }
  edgePt(c, K, s, sgn, h, out, oi);
  return s + sp[5];
}
const CWF = new Float64Array(10);
/** Fan point g of st at sample v on side sgn: the miter on the concave side, else P + h (cos, sin)(a0 +
 *  da g / st); st 0: the offset line's point. */
function fanPt(c: FrameChain, v: number, sgn: number, h: number, st: number, g: number, out: Float64Array, oi: number): void {
  const w = corner(c, v, sgn, h);
  if (w[0] === 2) { out[oi] = w[6]; out[oi + 1] = w[7]; return; }
  if (w[0] === 1 && st > 0) { const an = w[3] + (w[4] * g) / st; out[oi] = c.xs[v] + h * Math.cos(an); out[oi + 1] = c.ys[v] + h * Math.sin(an); return; }
  edgePt(c, v, c.s[v], sgn, h, out, oi);
}
/** The border's point at s (unwrapped) along segment K (unwrapped) on side sgn: the offset line, or a
 *  miter within its trim. */
function edgePt(c: FrameChain, K: number, s: number, sgn: number, h: number, out: Float64Array, oi: number): void {
  const n = c.n; const m = n - 1; const k = K % n; const j = k < m ? k + 1 : 0;
  const st = sOfV(c, K); const en = st + ((k < m ? c.s[k + 1] : c.len) - c.s[k]);
  let w = corner(c, k, sgn, h);
  if (w[0] === 2 && s - st < w[1]) { out[oi] = w[6]; out[oi + 1] = w[7]; return; }
  w = corner(c, j, sgn, h);
  if (w[0] === 2 && en - s < w[1]) { out[oi] = w[6]; out[oi + 1] = w[7]; return; }
  let dx = c.xs[j] - c.xs[k]; let dy = c.ys[j] - c.ys[k]; const l = Math.sqrt(dx * dx + dy * dy) || 1; dx /= l; dy /= l;
  out[oi] = c.xs[k] + dx * (s - st) - sgn * h * dy; out[oi + 1] = c.ys[k] + dy * (s - st) + sgn * h * dx;
}
// K1247 s21: colRow's corner cache, the last two vertices' cornerAt on its one side (c, sgn, h fixed
// while CR_ON). Off (colAt): each call computes into CWF, as before.
let CR_ON = false; let CRN = 0; const CRK = new Float64Array(2); const CRV = [new Float64Array(10), new Float64Array(10)];
function corner(c: FrameChain, v: number, sgn: number, h: number): Float64Array {
  if (!CR_ON) { cornerAt(c, v, sgn, h, CWF); return CWF; }
  if (CRK[0] === v) return CRV[0];
  if (CRK[1] === v) return CRV[1];
  const sl = CRN; CRN ^= 1; cornerAt(c, v, sgn, h, CRV[sl]); CRK[sl] = v; return CRV[sl];
}

/** K1247 s21: colAt for columns i = iLo..iHi of one side, bit for bit, into out[2i], out[2i + 1] and
 *  their s into sOut[i]: one span and a walk along V instead of a span and a binary search per column,
 *  each vertex's corner once. The walk finds the same V as colAt's search wherever cs is monotone in V
 *  (S > 0, B >= 0); otherwise each column is colAt's. */
export function colRow(c: FrameChain, pf: ArrayLike<number>, o: number, sA: number, dS: number, N: number, sgn: number, h: number, iLo: number, iHi: number, out: Float64Array, sOut: Float64Array): void {
  const sp = spanOf(c, sA, dS); const a = sp[0]; const sB = sp[1]; const k = sp[2]; const V1 = sp[3]; const V2 = sp[4]; const base = sp[5];
  const S = sB - a; const p0 = pfU(c, pf, o, V1 - 1); const B = N - (pfU(c, pf, o, V2) - p0);
  if (!(S > 0) || !(B >= 0)) { for (let i = iLo; i <= iHi; i++) sOut[i] = colAt(c, pf, o, sA, dS, N, sgn, h, i, out, 2 * i); return; }
  const a32 = sp[6]; const S32 = sp[7]; const cs = (V: number): number => colR(c, V, a32, B, S32) + pfU(c, pf, o, V - 1) - p0;
  CR_ON = true; CRK[0] = -1; CRK[1] = -1;
  try {
    // V: the last interior vertex with cs(V) <= i (V1 - 1: none); c0 = cs(V), cN = cs(V + 1).
    let V = V1 - 1; let c0 = 0; let cN = V1 <= V2 ? cs(V1) : Infinity;
    for (let i = iLo; i <= iHi; i++) {
      while (V + 1 <= V2 && cN <= i) { V++; c0 = cN; cN = V + 1 <= V2 ? cs(V + 1) : Infinity; }
      const oi = 2 * i; let s: number; let K: number;
      if (V >= V1) {
        const st = pfU(c, pf, o, V) - pfU(c, pf, o, V - 1); const g = i - c0;
        if (g <= st) { fanPt(c, V % c.n, sgn, h, st, g, out, oi); sOut[i] = sOfV(c, V) + base; continue; }
        const ce = c0 + st; const sv = sOfV(c, V); const cn = V < V2 ? cN : N; const sn = V < V2 ? sOfV(c, V + 1) : sB;
        s = sv + ((sn - sv) * (i - ce)) / (cn - ce); K = V;
      } else {
        const cn = V < V2 ? cN : N; const sn = V < V2 ? sOfV(c, V1) : sB;
        s = a + ((sn - a) * i) / cn; K = k;
      }
      edgePt(c, K, s, sgn, h, out, oi);
      sOut[i] = s + base;
    }
  } finally { CR_ON = false; }
}

/** K1247 s24 (band records): colRow's columns at the ends of [sA, sA + dS] at N columns, into out: [cs(V1), the
 *  column of the last interior vertex's last fan point cs(V2) + st(V2), B, the sample of V1, of V2]. False: no
 *  interior vertex, or a span colRow hands to colAt. */
export function colEnds(c: FrameChain, pf: ArrayLike<number>, o: number, sA: number, dS: number, N: number, out: Float64Array): boolean {
  const sp = spanOf(c, sA, dS); const a = sp[0]; const sB = sp[1]; const V1 = sp[3]; const V2 = sp[4];
  if (V1 > V2) return false;
  const S = sB - a; const p0 = pfU(c, pf, o, V1 - 1); const B = N - (pfU(c, pf, o, V2) - p0);
  if (!(S > 0) || !(B >= 0)) return false;
  out[0] = colR(c, V1, sp[6], B, sp[7]);
  out[1] = colR(c, V2, sp[6], B, sp[7]) + pfU(c, pf, o, V2) - p0; out[2] = B;
  out[3] = V1 % c.n; out[4] = V2 % c.n;
  return true;
}

/** offsetRow's segment and fraction for arc u (wrapped or clamped as it does): [k, f]. */
function segOf(c: FrameChain, u0: number, kf: Float64Array): void {
  const m = c.n - 1; const loop = c.closed && c.len > 0; const L = c.len; const ss = c.s;
  let u = u0;
  if (loop) { if (u < 0 || u >= L) u = wrapL(u, L); } else u = u < 0 ? 0 : u > ss[m] ? ss[m] : u;
  let k: number;
  if (u >= ss[m]) k = loop ? m : m - 1;
  else { let lo = 0; let hi = m; while (hi - lo > 1) { const q = (lo + hi) >> 1; if (ss[q] <= u) lo = q; else hi = q; } k = lo; }
  const e = k < m ? ss[k + 1] : L; const sl = e - ss[k];
  kf[0] = k; kf[1] = sl > 0 ? (u - ss[k]) / sl : 0; kf[2] = u;
}

const KF = new Float64Array(3); const TA = new Float64Array(6);

/** One point of offsetRow (column at arc u, side sgn, step st = dS / N), into out[0..1]. */
export function offsetAt(c: FrameChain, u: number, sgn: number, h: number, st: number, out: Float64Array, o = 0): void {
  segOf(c, u, KF); const k = KF[0]; const f = KF[1]; const m = c.n - 1; const j = k < m ? k + 1 : 0;
  tanAt(c, k, TA, 0); tanAt(c, j, TA, 3);
  const x = c.xs[k] + (c.xs[j] - c.xs[k]) * f; const y = c.ys[k] + (c.ys[j] - c.ys[k]) * f;
  let ax = TA[0] + (TA[3] - TA[0]) * f; let ay = TA[1] + (TA[4] - TA[1]) * f; const l = Math.sqrt(ax * ax + ay * ay) || 1; ax /= l; ay /= l;
  const kap = TA[2] + (TA[5] - TA[2]) * f; const ak = Math.abs(kap);
  const b = sgn * kap > 0 ? Math.min(h, 0.9 / ak) : h + SAG.f * st * st * ak * (1 + h * ak) / 8;
  out[o] = x - sgn * b * ay; out[o + 1] = y + sgn * b * ax;
}

/** frameAt's (x, y, tx, ty) at arc s without ChainTangents (the side guess). */
export function pointAt(c: FrameChain, s: number, out: Float64Array): void {
  segOf(c, s, KF); const k = KF[0]; const f = KF[1]; const m = c.n - 1; const j = k < m ? k + 1 : 0;
  tanAt(c, k, TA, 0); tanAt(c, j, TA, 3);
  out[0] = c.xs[k] + (c.xs[j] - c.xs[k]) * f; out[1] = c.ys[k] + (c.ys[j] - c.ys[k]) * f;
  const tx = TA[0] + (TA[3] - TA[0]) * f; const ty = TA[1] + (TA[4] - TA[1]) * f; const l = Math.sqrt(tx * tx + ty * ty) || 1;
  out[2] = tx / l; out[3] = ty / l;
}

/** zRow's value at one arc u. */
export function zAt1(c: FrameChain & { z: Float64Array }, u0: number): number {
  const m = c.n - 1; const loop = c.closed && c.len > 0; const ss = c.s;
  let u = u0;
  if (loop) { if (u < 0 || u >= c.len) u = wrapL(u, c.len); } else u = u < 0 ? 0 : u > ss[m] ? ss[m] : u;
  if (!loop && u >= ss[m]) return c.z[m];
  segOf(c, u, KF); const k = KF[0]; const j = k < m ? k + 1 : 0;
  return c.z[k] + (c.z[j] - c.z[k]) * KF[1];
}
