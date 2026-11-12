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
