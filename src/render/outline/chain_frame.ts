// K1247 s18: a chain's smooth local frame, the records' placement (oe=1). Position is linear between
// the chain's samples; the tangent is the samples' central-difference tangents interpolated and
// renormalized, and the signed curvature is interpolated the same way, so a point held at (s, b)
// across the chain moves smoothly as the chain bends: what a vertex shader does from the chain
// texture (BandGpu.chainTex holds the same samples). Off by default; today's look never reads it.

export interface FrameChain { closed: boolean; len: number; xs: Float64Array; ys: Float64Array; s: Float64Array; n: number }

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
  const u = loop ? ((s % c.len) + c.len) % c.len : Math.min(Math.max(s, 0), c.s[m]);
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

/** Row i = 1..N-1 of a strip side: C(s) + sgn b N(s) at s = sA + dS i / N, b = h clamped to 0.9 of the
 *  radius on the concave side; into out[2i], out[2i+1]. A cursor walks the segments (rows run along s). */
export function offsetRow(c: FrameChain, t: ChainTangents, sA: number, dS: number, N: number, sgn: number, h: number, out: Float64Array): void {
  const m = c.n - 1; const loop = c.closed && c.len > 0; const L = c.len;
  const xs = c.xs; const ys = c.ys; const ss = c.s; const tx = t.tx; const ty = t.ty; const kk = t.k;
  let k = -1;
  for (let i = 1; i < N; i++) {
    let u = sA + (dS * i) / N;
    if (loop) { if (u < 0 || u >= L) u = ((u % L) + L) % L; } else u = u < 0 ? 0 : u > ss[m] ? ss[m] : u;
    if (k < 0 || u < ss[k] || u > (k < m ? ss[k + 1] : L)) {
      if (k >= 0 && k < m && u > ss[k + 1] && (k + 1 >= m || u <= ss[k + 2])) k++;
      else { let lo = 0; let hi = m; while (hi - lo > 1) { const q = (lo + hi) >> 1; if (ss[q] <= u) lo = q; else hi = q; } k = u >= ss[m] ? (loop ? m : m - 1) : lo; }
    }
    const j = k < m ? k + 1 : 0; const e = k < m ? ss[k + 1] : L; const sl = e - ss[k];
    const f = sl > 0 ? (u - ss[k]) / sl : 0;
    const x = xs[k] + (xs[j] - xs[k]) * f; const y = ys[k] + (ys[j] - ys[k]) * f;
    let ax = tx[k] + (tx[j] - tx[k]) * f; let ay = ty[k] + (ty[j] - ty[k]) * f; const l = Math.sqrt(ax * ax + ay * ay) || 1; ax /= l; ay /= l;
    const kap = kk[k] + (kk[j] - kk[k]) * f;
    const b = sgn * kap > 0 ? Math.min(h, 0.9 / Math.abs(kap)) : h;
    out[2 * i] = x - sgn * b * ay; out[2 * i + 1] = y + sgn * b * ax;
  }
}

/** z (the chain's depth, linear between samples) at s = sA + dS i / N, i = 0..N, into out[i]. */
export function zRow(c: FrameChain & { z: Float64Array }, sA: number, dS: number, N: number, out: Float64Array): void {
  const m = c.n - 1; const loop = c.closed && c.len > 0; const L = c.len; const ss = c.s; const z = c.z;
  let k = -1;
  for (let i = 0; i <= N; i++) {
    let u = sA + (dS * i) / N;
    if (loop) { if (u < 0 || u >= L) u = ((u % L) + L) % L; } else u = u < 0 ? 0 : u > ss[m] ? ss[m] : u;
    if (!loop && u >= ss[m]) { out[i] = z[m]; continue; }
    if (k < 0 || u < ss[k] || u > (k < m ? ss[k + 1] : L)) {
      if (k >= 0 && k < m && u > ss[k + 1] && (k + 1 >= m || u <= ss[k + 2])) k++;
      else { let lo = 0; let hi = m; while (hi - lo > 1) { const q = (lo + hi) >> 1; if (ss[q] <= u) lo = q; else hi = q; } k = u >= ss[m] ? m : lo; }
    }
    const j = k < m ? k + 1 : 0; const e = k < m ? ss[k + 1] : L; const sl = e - ss[k];
    out[i] = z[k] + (z[j] - z[k]) * (sl > 0 ? (u - ss[k]) / sl : 0);
  }
}
