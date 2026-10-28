// K868 S1b: polyline geometry for the field oracle (docs/design/
// K868_field_border.md §3.1, §3.4). Pure TypeScript: no DOM, no pixi,
// nothing the app imports. Shares no code with the app's renderer.
//
// A Poly is a chain's centreline: vertices with arc length s (s[0] may be
// negative when an END arm is extended to c′, §3.6) and depth z, linear
// between vertices. Segment k runs from vertex k to vertex k + 1 (a closed
// chain's last segment closes back to vertex 0, and s wraps at len).

export interface Poly {
  id: number;
  n: number;
  x: Float64Array;
  y: Float64Array;
  s: Float64Array;
  z: Float64Array;
  segLen: Float64Array;
  closed: boolean;
  nseg: number;
  /** Arc length of the whole chain (including the closing segment). */
  len: number;
  /** s[0]: 0, or −(extension length) for a start END extended to c′. */
  s0: number;
}

export function makePoly(
  id: number,
  pts: ArrayLike<number>,
  z: ArrayLike<number> | null,
  closed: boolean,
  s0 = 0,
): Poly {
  const xs: number[] = [];
  const ys: number[] = [];
  const zs: number[] = [];
  const m = pts.length >> 1;
  for (let i = 0; i < m; i++) {
    const x = pts[2 * i];
    const y = pts[2 * i + 1];
    const k = xs.length;
    if (k > 0 && Math.abs(x - xs[k - 1]) + Math.abs(y - ys[k - 1]) < 1e-12) continue;
    xs.push(x);
    ys.push(y);
    zs.push(z ? z[i] : 0);
  }
  if (closed && xs.length > 2) {
    const k = xs.length - 1;
    if (Math.abs(xs[0] - xs[k]) + Math.abs(ys[0] - ys[k]) < 1e-12) {
      xs.pop();
      ys.pop();
      zs.pop();
    }
  }
  const n = xs.length;
  const nseg = closed ? n : n - 1;
  const p: Poly = {
    id,
    n,
    x: Float64Array.from(xs),
    y: Float64Array.from(ys),
    s: new Float64Array(n),
    z: Float64Array.from(zs),
    segLen: new Float64Array(Math.max(nseg, 0)),
    closed,
    nseg,
    len: 0,
    s0,
  };
  p.s[0] = s0;
  for (let k = 0; k < nseg; k++) {
    const b = k + 1 === n ? 0 : k + 1;
    const l = Math.sqrt((p.x[b] - p.x[k]) ** 2 + (p.y[b] - p.y[k]) ** 2);
    p.segLen[k] = l;
    if (k + 1 < n) p.s[k + 1] = p.s[k] + l;
  }
  p.len = closed ? p.s[n - 1] - s0 + p.segLen[n - 1] : p.s[n - 1] - s0;
  return p;
}

export function segB(p: Poly, k: number): number {
  return k + 1 === p.n ? 0 : k + 1;
}

/** Wrap s into [s0, s0 + len) on a closed chain; clamp on an open one. */
export function normS(p: Poly, s: number): number {
  if (p.closed) {
    let u = (s - p.s0) % p.len;
    if (u < 0) u += p.len;
    return p.s0 + u;
  }
  return Math.min(Math.max(s, p.s0), p.s0 + p.len);
}

/** Signed arc-length difference b − a, the short way round on a closed chain. */
export function dS(p: Poly, a: number, b: number): number {
  let d = b - a;
  if (p.closed) {
    d %= p.len;
    if (d > p.len / 2) d -= p.len;
    if (d < -p.len / 2) d += p.len;
  }
  return d;
}

export interface At {
  x: number;
  y: number;
  /** Unit tangent toward larger s. */
  tx: number;
  ty: number;
  k: number;
  t: number;
}

export function segOfS(p: Poly, s: number): { k: number; t: number } {
  const u = normS(p, s);
  let lo = 0;
  let hi = p.n - 1;
  if (u >= p.s[p.n - 1]) {
    if (p.closed) {
      const k = p.n - 1;
      return { k, t: Math.min(1, (u - p.s[k]) / (p.segLen[k] || 1)) };
    }
    return { k: p.nseg - 1, t: 1 };
  }
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (p.s[mid] <= u) lo = mid;
    else hi = mid;
  }
  return { k: lo, t: (u - p.s[lo]) / (p.segLen[lo] || 1) };
}

export function pointAt(p: Poly, s: number): At {
  const { k, t } = segOfS(p, s);
  const b = segB(p, k);
  const l = p.segLen[k] || 1;
  const tx = (p.x[b] - p.x[k]) / l;
  const ty = (p.y[b] - p.y[k]) / l;
  return { x: p.x[k] + (p.x[b] - p.x[k]) * t, y: p.y[k] + (p.y[b] - p.y[k]) * t, tx, ty, k, t };
}

export function zAt(p: Poly, s: number): number {
  const { k, t } = segOfS(p, s);
  const b = segB(p, k);
  return p.z[k] + (p.z[b] - p.z[k]) * t;
}

/** Closest point on segment ab to (px, py): clamped parameter and squared distance. */
export function closestOnSeg(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): { t: number; d2: number } {
  const ex = bx - ax;
  const ey = by - ay;
  const l2 = ex * ex + ey * ey;
  let t = l2 > 0 ? ((px - ax) * ex + (py - ay) * ey) / l2 : 0;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  const dx = ax + ex * t - px;
  const dy = ay + ey * t - py;
  return { t, d2: dx * dx + dy * dy };
}

export interface Foot {
  d: number;
  x: number;
  y: number;
  s: number;
  k: number;
  t: number;
}

/**
 * Closest point of the sub-polyline s ∈ [lo, hi] (both inside the chain's
 * domain or, on a closed chain, any window shorter than len) to (px, py).
 * Brute force over the segments the window touches.
 *
 * S3a4: only the segments the window touches are visited, found by binary
 * search on the same float tests the loop applies (sa + sh <= hi and
 * sb + sh >= lo, both monotonic in k since s is a running sum), and in the
 * same order (k ascending, then the shifts in order), so the result is the
 * full scan's to the bit, ties included. The full scan was 78% of a label
 * rebuild's CPU (the corner solver's Newton steps call it per iterate).
 */
export function footInWindow(p: Poly, px: number, py: number, lo: number, hi: number): Foot {
  let best: Foot = { d: Infinity, x: 0, y: 0, s: 0, k: -1, t: 0 };
  if (p.closed) {
    FIW_SH[0] = -p.len;
    FIW_SH[1] = 0;
    FIW_SH[2] = p.len;
  } else FIW_SH[0] = 0;
  const ns = p.closed ? 3 : 1;
  const nseg = p.nseg;
  // Per shift j, the k range [K0[j], K1[j]) whose segment meets the window.
  let kMin = nseg;
  let kMax = 0;
  for (let j = 0; j < ns; j++) {
    const sh = FIW_SH[j];
    let a = 0;
    let b = nseg;
    while (a < b) {
      const m = (a + b) >> 1;
      if (p.s[m] + p.segLen[m] + sh >= lo) b = m;
      else a = m + 1;
    }
    const k0 = a;
    b = nseg;
    while (a < b) {
      const m = (a + b) >> 1;
      if (p.s[m] + sh > hi) b = m;
      else a = m + 1;
    }
    FIW_K0[j] = k0;
    FIW_K1[j] = a;
    if (a > k0) {
      if (k0 < kMin) kMin = k0;
      if (a > kMax) kMax = a;
    }
  }
  for (let k = kMin; k < kMax; k++) {
    // Skip the gap between two shifts' ranges in one step.
    let inAny = false;
    let next = kMax;
    for (let j = 0; j < ns; j++) {
      if (k >= FIW_K0[j] && k < FIW_K1[j]) inAny = true;
      else if (FIW_K0[j] > k && FIW_K0[j] < FIW_K1[j] && FIW_K0[j] < next) next = FIW_K0[j];
    }
    if (!inAny) {
      k = next - 1;
      continue;
    }
    const sa = p.s[k];
    const sb = sa + p.segLen[k];
    for (let j = 0; j < ns; j++) {
      if (k < FIW_K0[j] || k >= FIW_K1[j]) continue;
      const sh = FIW_SH[j];
      const a = Math.max(lo, sa + sh);
      const b = Math.min(hi, sb + sh);
      if (b < a) continue;
      const l = p.segLen[k] || 1;
      const ta = (a - sh - sa) / l;
      const tb = (b - sh - sa) / l;
      const kb = segB(p, k);
      const ax = p.x[k] + (p.x[kb] - p.x[k]) * ta;
      const ay = p.y[k] + (p.y[kb] - p.y[k]) * ta;
      const bx = p.x[k] + (p.x[kb] - p.x[k]) * tb;
      const by = p.y[k] + (p.y[kb] - p.y[k]) * tb;
      const c = closestOnSeg(px, py, ax, ay, bx, by);
      const d = Math.sqrt(c.d2);
      if (d < best.d) {
        const tt = ta + (tb - ta) * c.t;
        best = {
          d,
          x: ax + (bx - ax) * c.t,
          y: ay + (by - ay) * c.t,
          s: sa + tt * (sb - sa),
          k,
          t: tt,
        };
      }
    }
  }
  return best;
}
const FIW_SH = new Float64Array(3);
const FIW_K0 = new Int32Array(3);
const FIW_K1 = new Int32Array(3);

// ---------------------------------------------------------------------------
// Spatial hash over every chain's segments.

export class SegGrid {
  readonly cell: number;
  readonly x0: number;
  readonly y0: number;
  readonly nx: number;
  readonly ny: number;
  private cells: Int32Array[];
  /** Global segment id → chain index, segment index. */
  readonly segChain: Int32Array;
  readonly segK: Int32Array;
  private stamp: Int32Array;
  private tick = 0;
  readonly polys: Poly[];

  constructor(polys: Poly[], cell: number, pad: number) {
    this.polys = polys;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    let total = 0;
    for (const p of polys) {
      total += p.nseg;
      for (let i = 0; i < p.n; i++) {
        x0 = Math.min(x0, p.x[i]);
        y0 = Math.min(y0, p.y[i]);
        x1 = Math.max(x1, p.x[i]);
        y1 = Math.max(y1, p.y[i]);
      }
    }
    if (!isFinite(x0)) {
      x0 = y0 = 0;
      x1 = y1 = 1;
    }
    this.cell = cell;
    this.x0 = x0 - pad;
    this.y0 = y0 - pad;
    this.nx = Math.max(1, Math.ceil((x1 - x0 + 2 * pad) / cell));
    this.ny = Math.max(1, Math.ceil((y1 - y0 + 2 * pad) / cell));
    this.segChain = new Int32Array(total);
    this.segK = new Int32Array(total);
    this.stamp = new Int32Array(total);
    const lists: number[][] = Array.from({ length: this.nx * this.ny }, () => []);
    let g = 0;
    polys.forEach((p, ci) => {
      for (let k = 0; k < p.nseg; k++, g++) {
        this.segChain[g] = ci;
        this.segK[g] = k;
        const b = segB(p, k);
        const ix0 = this.ix(Math.min(p.x[k], p.x[b]));
        const ix1 = this.ix(Math.max(p.x[k], p.x[b]));
        const iy0 = this.iy(Math.min(p.y[k], p.y[b]));
        const iy1 = this.iy(Math.max(p.y[k], p.y[b]));
        for (let iy = iy0; iy <= iy1; iy++)
          for (let ix = ix0; ix <= ix1; ix++) lists[iy * this.nx + ix].push(g);
      }
    });
    this.cells = lists.map((l) => Int32Array.from(l));
  }

  ix(x: number): number {
    return Math.min(this.nx - 1, Math.max(0, Math.floor((x - this.x0) / this.cell)));
  }
  iy(y: number): number {
    return Math.min(this.ny - 1, Math.max(0, Math.floor((y - this.y0) / this.cell)));
  }

  /** Global ids of segments whose bounding cells meet the square of half-side R. */
  query(px: number, py: number, R: number, out: number[]): void {
    out.length = 0;
    this.tick++;
    if (this.tick > 2e9) {
      this.tick = 1;
      this.stamp.fill(0);
    }
    const ix0 = this.ix(px - R);
    const ix1 = this.ix(px + R);
    const iy0 = this.iy(py - R);
    const iy1 = this.iy(py + R);
    for (let iy = iy0; iy <= iy1; iy++)
      for (let ix = ix0; ix <= ix1; ix++) {
        const c = this.cells[iy * this.nx + ix];
        for (let j = 0; j < c.length; j++) {
          const g = c[j];
          if (this.stamp[g] !== this.tick) {
            this.stamp[g] = this.tick;
            out.push(g);
          }
        }
      }
  }
}

export interface Cand {
  chain: number;
  s: number;
  d: number;
  fx: number;
  fy: number;
}

const qBuf: number[] = [];

/**
 * Every local minimum over s of |p − c_i(s)| on every chain within R
 * (design §3.4): segment-interior feet, and vertices where the feet of
 * both neighbouring segments clamp onto the vertex (an open chain's end
 * vertex counts when its one segment clamps there). With only >= 0, chain
 * only's alone (K868 S3a4: each chain's are found from its own segments,
 * so they are the same, in the same order).
 */
export function candidates(grid: SegGrid, px: number, py: number, R: number, out: Cand[], only = -1): void {
  out.length = 0;
  grid.query(px, py, R, qBuf);
  if (only >= 0) {
    let n = 0;
    for (let j = 0; j < qBuf.length; j++) if (grid.segChain[qBuf[j]] === only) qBuf[n++] = qBuf[j];
    qBuf.length = n;
  }
  if (qBuf.length === 0) return;
  // Per chain: map k → (t, d2) for the queried segments within R.
  qBuf.sort((a, b) => a - b);
  const R2 = R * R;
  const polys = grid.polys;
  let i = 0;
  while (i < qBuf.length) {
    const ci = grid.segChain[qBuf[i]];
    const p = polys[ci];
    const ks: number[] = [];
    const ts: number[] = [];
    const ds: number[] = [];
    while (i < qBuf.length && grid.segChain[qBuf[i]] === ci) {
      const k = grid.segK[qBuf[i]];
      const b = segB(p, k);
      const c = closestOnSeg(px, py, p.x[k], p.y[k], p.x[b], p.y[b]);
      if (c.d2 <= R2) {
        ks.push(k);
        ts.push(c.t);
        ds.push(c.d2);
      }
      i++;
    }
    const tOf = (k: number): number => {
      const j = ks.indexOf(k);
      return j < 0 ? NaN : ts[j];
    };
    const TOL = 1e-9;
    for (let j = 0; j < ks.length; j++) {
      const k = ks[j];
      const t = ts[j];
      if (t > TOL && t < 1 - TOL) {
        const b = segB(p, k);
        out.push({
          chain: ci,
          s: p.s[k] + t * p.segLen[k],
          d: Math.sqrt(ds[j]),
          fx: p.x[k] + (p.x[b] - p.x[k]) * t,
          fy: p.y[k] + (p.y[b] - p.y[k]) * t,
        });
      } else if (t <= TOL) {
        // Vertex k is the foot of segment k; a minimum if the previous
        // segment's foot is also vertex k (or there is none).
        let prev: number;
        if (k > 0) prev = k - 1;
        else prev = p.closed ? p.nseg - 1 : -1;
        const tp = prev < 0 ? 1 : tOf(prev);
        if (tp >= 1 - TOL) {
          out.push({ chain: ci, s: p.s[k], d: Math.sqrt(ds[j]), fx: p.x[k], fy: p.y[k] });
        }
      } else if (!p.closed && k === p.nseg - 1) {
        // t ≈ 1 on the last segment of an open chain: the end vertex.
        const v = p.n - 1;
        out.push({ chain: ci, s: p.s[v], d: Math.sqrt(ds[j]), fx: p.x[v], fy: p.y[v] });
      }
    }
  }
}
