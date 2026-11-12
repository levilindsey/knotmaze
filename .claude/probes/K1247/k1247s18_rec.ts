// K1247 s18: a chain's smooth local frame. Position linear between samples, tangent = the vertex
// tangents (central differences) interpolated and renormalized, so a point (a along, b across) held
// in it moves smoothly as the chain bends. What a vertex shader would do from the chain texture.
export interface CF { closed: boolean; len: number; xs: Float64Array; ys: Float64Array; s: Float64Array; n: number }

/** Segment k (k .. k+1, the closing one n-1 .. 0 on a loop) and fraction t at arc s. */
export function locate(c: CF, s: number): [number, number] {
  const m = c.n - 1;
  const u = c.closed && c.len > 0 ? ((s % c.len) + c.len) % c.len : Math.min(Math.max(s, 0), c.s[m]);
  if (u >= c.s[m]) {
    if (!c.closed) return [m - 1, 1];
    const l = c.len - c.s[m]; return [m, l > 0 ? (u - c.s[m]) / l : 0];
  }
  let lo = 0; let hi = m;
  while (hi - lo > 1) { const k = (lo + hi) >> 1; if (c.s[k] <= u) lo = k; else hi = k; }
  const l = c.s[lo + 1] - c.s[lo]; return [lo, l > 0 ? (u - c.s[lo]) / l : 0];
}

function vt(c: CF, i: number): [number, number] {
  const n = c.n;
  const a = c.closed ? (i - 1 + n) % n : Math.max(0, i - 1);
  const b = c.closed ? (i + 1) % n : Math.min(n - 1, i + 1);
  const dx = c.xs[b] - c.xs[a]; const dy = c.ys[b] - c.ys[a]; const l = Math.hypot(dx, dy) || 1;
  return [dx / l, dy / l];
}

/** (x, y, tx, ty) at segment k, fraction t. */
export function frameAtIdx(c: CF, k: number, t: number): [number, number, number, number] {
  const j = c.closed ? (k + 1) % c.n : Math.min(k + 1, c.n - 1);
  const x = c.xs[k] + (c.xs[j] - c.xs[k]) * t; const y = c.ys[k] + (c.ys[j] - c.ys[k]) * t;
  const ta = vt(c, k); const tb = vt(c, j);
  const tx = ta[0] + (tb[0] - ta[0]) * t; const ty = ta[1] + (tb[1] - ta[1]) * t; const l = Math.hypot(tx, ty) || 1;
  return [x, y, tx / l, ty / l];
}

export function chainFrameAt(c: CF, s: number): [number, number, number, number] {
  const [k, t] = locate(c, s); return frameAtIdx(c, k, t);
}
