// K868 S3a7: the GPU pieces' per-frame tables (S3a5 section 4's form), and
// the checks' float32 reference of what the GPU tube shader computes. With
// the label's GPU pieces on (`labelGpu`, URL `lbp`), the tubes are one
// instance per chain segment (chain row, k): the vertex shader places the
// segment from the point table, and the fragment shader evaluates
// s = s[k] + t·segLen[k], the cluster (the span table) and the depth (the
// pin table: plateauDepth exactly, never a linear z) per fragment. The CPU
// writes the tables each frame from that frame's FieldModel, into
// preallocated arrays; nothing carried from an earlier frame changes an
// answer (only the arrays' capacity carries over).
//
// TABLE (one RGBA32F texture, TBL_W texels a row, texelFetch only):
//   [0, 3 nChains)  chain table, 3 texels a chain:
//     (ptBase, nseg, closed, len), (spanBase, nSpans, pinBase, nPins),
//     (s0, 1 / len, 0, 0)
//   points, nseg + 1 texels a chain: (x, y, s, segLen) at each segment's
//     start, then the chain's end point (a closed chain's point 0 again, at
//     s0 + len, segLen 0). These are the label's polys (FieldModel.polys),
//     not SAMP's samples: makePoly drops repeated points, and an open
//     chain's polys carry the END extensions (s0 < 0).
//   spans, at least 1 texel a chain: (lo, cluster, rank, 0), sorted by lo,
//     a partition of [s0, s0 + len]: clusterAt (first match over
//     chainSpans, a closed chain's three shifts) resolved between every
//     two span bounds; the cluster at s is the last span with lo <= s.
//   pins: the chain's depth pins in order, (s, z, rL, rR).
//
// RANK: the stable tie-break, the cluster's key (1e6 + cluster), else the
// chain's (its id), ranked among the keys present, as buildLabelPieces
// ranks its pieces' keys.
import type { FieldModel } from "../field/oracle";

export const TBL_W = 2048;
/** Floats per segment instance: chain row, k. */
export const SEG_FLOATS = 2;

export interface LabelTables {
  /** RGBA32F texels, TBL_W a row (capacity rows; `rows` in use). */
  data: Float32Array;
  rows: number;
  texels: number;
  /** Instances: (chain row, k) per segment. */
  segs: Float32Array;
  nSegs: number;
  nChains: number;
  ptOff: number;
  spanOff: number;
  pinOff: number;
  nSpanTexels: number;
  nPins: number;
  /** The depth's normalisation, as buildLabelPieces' (z over the pins'
   * exact range with 0, s over every chain's span, ranks over the keys). */
  zmin: number;
  zr: number;
  smax: number;
  nKeys: number;
  keys: number[];
  rankOf: Map<number, number>;
  win: number;
  rho: number;
}

/** Writes the tables of one frame; its arrays grow and are reused. */
export class LabelTableBuilder {
  private data = new Float32Array(TBL_W * 4 * 4);
  private segs = new Float32Array(1024);
  private bounds: number[] = [];
  private spanLo: number[] = [];
  private spanCl: number[] = [];
  private spanStart: number[] = [];
  private spanCount: number[] = [];

  build(m: FieldModel): LabelTables {
    const polys = m.polys;
    const nC = polys.length;
    const dcs = m.depthChains;
    // Sizes: chain table, points, spans (resolved below), pins.
    let nPts = 0;
    let nSegs = 0;
    let nPins = 0;
    for (let ci = 0; ci < nC; ci++) {
      const p = polys[ci];
      nPts += p.nseg + 1;
      nSegs += p.nseg;
      nPins += dcs[ci].pins.length;
    }
    // Spans: clusterAt resolved between bounds (float64, the oracle's own
    // rule), merged where the cluster repeats.
    const spanLo = this.spanLo;
    const spanCl = this.spanCl;
    spanLo.length = 0;
    spanCl.length = 0;
    const present = new Set<number>();
    for (let ci = 0; ci < nC; ci++) {
      const p = polys[ci];
      const a0 = p.s0;
      const a1 = p.s0 + p.len;
      const B = this.bounds;
      B.length = 0;
      for (const [lo, hi] of m.chainSpans[ci]) {
        if (p.closed) {
          for (const sh of [-p.len, 0, p.len]) {
            if (lo + sh > a0 && lo + sh < a1) B.push(lo + sh);
            if (hi + sh > a0 && hi + sh < a1) B.push(hi + sh);
          }
        } else {
          if (lo > a0 && lo < a1) B.push(lo);
          if (hi > a0 && hi < a1) B.push(hi);
        }
      }
      B.sort((x, y) => x - y);
      this.spanStart[ci] = spanLo.length;
      let x0 = a0;
      let prev = -2;
      for (let i = 0; i <= B.length; i++) {
        const x1 = i < B.length ? B[i] : a1;
        if (x1 <= x0 && i < B.length) continue;
        const cl = m.clusterAt(ci, (x0 + x1) / 2);
        if (cl !== prev) {
          spanLo.push(x0);
          spanCl.push(cl);
          present.add(cl >= 0 ? 1e6 + cl : m.idOf[ci]);
          prev = cl;
        }
        x0 = x1;
      }
      if (spanLo.length === this.spanStart[ci]) {
        // A chain of no length: one span at s0.
        const cl = m.clusterAt(ci, a0);
        spanLo.push(a0);
        spanCl.push(cl);
        present.add(cl >= 0 ? 1e6 + cl : m.idOf[ci]);
      }
      this.spanCount[ci] = spanLo.length - this.spanStart[ci];
    }
    const keys = [...present].sort((x, y) => x - y);
    const rankOf = new Map<number, number>();
    for (let i = 0; i < keys.length; i++) rankOf.set(keys[i], i);
    const nSpanTexels = spanLo.length;

    const ptOff = 3 * nC;
    const spanOff = ptOff + nPts;
    const pinOff = spanOff + nSpanTexels;
    const texels = pinOff + nPins;
    const rows = Math.max(1, Math.ceil(texels / TBL_W));
    if (this.data.length < rows * TBL_W * 4) this.data = new Float32Array(Math.ceil(rows * 1.25 + 1) * TBL_W * 4);
    if (this.segs.length < nSegs * SEG_FLOATS) this.segs = new Float32Array(Math.ceil(nSegs * 1.25 + 16) * SEG_FLOATS);
    const D = this.data;
    const S = this.segs;

    let zmin = 0;
    let zmax = 0;
    let smax = 1;
    let pt = ptOff;
    let pin = pinOff;
    let seg = 0;
    for (let ci = 0; ci < nC; ci++) {
      const p = polys[ci];
      const pins = dcs[ci].pins;
      const c = 12 * ci;
      D[c] = pt;
      D[c + 1] = p.nseg;
      D[c + 2] = p.closed ? 1 : 0;
      D[c + 3] = p.len;
      D[c + 4] = spanOff + this.spanStart[ci];
      D[c + 5] = this.spanCount[ci];
      D[c + 6] = pin;
      D[c + 7] = pins.length;
      D[c + 8] = p.s0;
      D[c + 9] = 1 / Math.max(p.len, 1e-9);
      D[c + 10] = 0;
      D[c + 11] = 0;
      if (p.n > 0) smax = Math.max(smax, Math.abs(p.s[0]) + p.len + 1);
      for (let k = 0; k < p.nseg; k++) {
        const o = 4 * pt++;
        D[o] = p.x[k];
        D[o + 1] = p.y[k];
        D[o + 2] = p.s[k];
        D[o + 3] = p.segLen[k];
        S[seg++] = ci;
        S[seg++] = k;
      }
      const e = p.closed ? 0 : p.n - 1;
      const o = 4 * pt++;
      D[o] = e >= 0 ? p.x[e] : 0;
      D[o + 1] = e >= 0 ? p.y[e] : 0;
      D[o + 2] = p.nseg > 0 ? p.s[p.nseg - 1] + p.segLen[p.nseg - 1] : p.s0;
      D[o + 3] = 0;
      for (const q of pins) {
        const o2 = 4 * pin++;
        D[o2] = q.s;
        D[o2 + 1] = q.z;
        D[o2 + 2] = q.rL ?? 0;
        D[o2 + 3] = q.rR ?? 0;
        zmin = Math.min(zmin, q.z);
        zmax = Math.max(zmax, q.z);
      }
    }
    for (let i = 0; i < nSpanTexels; i++) {
      const o = 4 * (spanOff + i);
      const cl = spanCl[i];
      D[o] = spanLo[i];
      D[o + 1] = cl;
      D[o + 2] = 0;
      D[o + 3] = 0;
    }
    for (let ci = 0; ci < nC; ci++) {
      const id = m.idOf[ci];
      for (let i = this.spanStart[ci]; i < this.spanStart[ci] + this.spanCount[ci]; i++) {
        const cl = spanCl[i];
        D[4 * (spanOff + i) + 2] = rankOf.get(cl >= 0 ? 1e6 + cl : id)!;
      }
    }
    return {
      data: D,
      rows,
      texels,
      segs: S,
      nSegs,
      nChains: nC,
      ptOff,
      spanOff,
      pinOff,
      nSpanTexels,
      nPins,
      zmin,
      zr: Math.max(zmax - zmin, 1e-9),
      smax,
      nKeys: Math.max(1, keys.length),
      keys,
      rankOf,
      win: m.depthWin,
      rho: m.depthWin,
    };
  }
}

// ---------------------------------------------------------------------------
// The checks' reference: the GPU tube shader's arithmetic in float32
// (Math.fround after every operation), line for line with GPU_TUBE_VS/FS in
// label_glsl.ts. It reads the tables as the shader does (their float32
// values), so the GPU path and this reference agree by construction; the
// checks compare it with the oracle (depthAt, clusterAt) and with
// buildLabelPieces' vertices.

const f = Math.fround;

/** A texel of the tables, as float32 (what the shader fetches). */
function tx(T: LabelTables, i: number, c: number): number {
  return f(T.data[4 * i + c]);
}

/** The point at t along segment k of chain ci: a + (b - a) t. */
export function refPoint(T: LabelTables, ci: number, k: number, t: number): [number, number] {
  const pb = Math.round(tx(T, 3 * ci, 0)) + k;
  const ax = tx(T, pb, 0);
  const ay = tx(T, pb, 1);
  const dx = f(tx(T, pb + 1, 0) - ax);
  const dy = f(tx(T, pb + 1, 1) - ay);
  const tt = f(t);
  return [f(ax + f(dx * tt)), f(ay + f(dy * tt))];
}

/** s at t along segment k: s[k] + t·segLen[k]. */
export function refS(T: LabelTables, ci: number, k: number, t: number): number {
  const pb = Math.round(tx(T, 3 * ci, 0)) + k;
  return f(tx(T, pb, 2) + f(f(t) * tx(T, pb, 3)));
}

/** The span (cluster, rank) at s: the last span with lo <= s; an open chain
 * clamps s into [s0, s0 + len] first (clusterAt's endSnap). */
export function refCluster(T: LabelTables, ci: number, s: number): [number, number] {
  const sb = Math.round(tx(T, 3 * ci + 1, 0));
  const ns = Math.round(tx(T, 3 * ci + 1, 1));
  const closed = tx(T, 3 * ci, 2) > 0.5;
  const len = tx(T, 3 * ci, 3);
  const s0 = tx(T, 3 * ci + 2, 0);
  let u = f(s);
  if (!closed) u = Math.min(Math.max(u, s0), f(s0 + len));
  let lo = 0;
  let hi = ns - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (tx(T, sb + mid, 0) <= u) lo = mid;
    else hi = mid - 1;
  }
  return [tx(T, sb + lo, 1), tx(T, sb + lo, 2)];
}

function hat(z: number, d: number, w: number): number {
  if (w <= f(1e-12)) return d <= 0 ? z : 0;
  return d >= w ? 0 : f(z * f(1 - f(d / w)));
}
function trap(z: number, d: number, r: number, w: number): number {
  if (d <= r) return z;
  return hat(z, f(d - r), w);
}
function pair(zL: number, sL: number, aL: number, zR: number, sR: number, aR: number, u: number, win: number, rho: number): number {
  const g = f(sR - sL);
  let a = aL;
  let b = aR;
  if (zL === zR) {
    if (f(a + b) >= g) return zL;
  } else if (f(a + b) > 0) {
    const k = Math.min(1, f(Math.max(0, f(g - rho)) / f(a + b)));
    a = f(a * k);
    b = f(b * k);
  }
  const w = Math.min(win, f(f(g - a) - b));
  return f(trap(zL, f(u - sL), a, w) + trap(zR, f(sR - u), b, w));
}

/** plateauDepth over the pin table, in float32 (depth.ts's rule). */
export function refDepth(T: LabelTables, ci: number, s: number): number {
  const pb = Math.round(tx(T, 3 * ci + 1, 2));
  const n = Math.round(tx(T, 3 * ci + 1, 3));
  if (n === 0) return 0;
  const closed = tx(T, 3 * ci, 2) > 0.5;
  const len = tx(T, 3 * ci, 3);
  const s0 = tx(T, 3 * ci + 2, 0);
  const win = f(T.win);
  const rho = f(T.rho);
  let u = f(s);
  if (closed) {
    u = f(u - s0);
    u = f(u - f(len * Math.floor(f(u / len))));
    u = f(u + s0);
  }
  let lo = -1;
  let hi = n;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (tx(T, pb + mid, 0) <= u) lo = mid;
    else hi = mid;
  }
  const P = (i: number, c: number): number => tx(T, pb + i, c);
  if (closed) {
    const iL = lo < 0 ? n - 1 : lo;
    const sL = lo < 0 ? f(P(iL, 0) - len) : P(iL, 0);
    const iR = lo + 1 >= n ? 0 : lo + 1;
    const sR = lo + 1 >= n ? f(P(iR, 0) + len) : P(iR, 0);
    if (n === 1) return trap(P(0, 1), Math.min(f(u - sL), f(sR - u)), Math.max(P(0, 2), P(0, 3)), Math.min(win, f(len * 0.5)));
    return pair(P(iL, 1), sL, P(iL, 3), P(iR, 1), sR, P(iR, 2), u, win, rho);
  }
  if (lo < 0) return trap(P(0, 1), f(P(0, 0) - u), P(0, 2), win);
  if (lo + 1 >= n) return trap(P(n - 1, 1), f(u - P(n - 1, 0)), P(n - 1, 3), win);
  return pair(P(lo, 1), P(lo, 0), P(lo, 3), P(lo + 1, 1), P(lo + 1, 0), P(lo + 1, 2), u, win, rho);
}

/** The tube depth a fragment writes (label_glsl.ts's formula), float32. */
export function refFragDepth(T: LabelTables, z: number, rank: number, s: number): number {
  const zinv = f(1 / T.zr);
  const rinv = f(1 / T.nKeys);
  const sinv = f(1 / T.smax);
  const a = f(f(f(0.45) * f(z - f(T.zmin))) * zinv);
  const b = f(f(f(2e-4) * rank) * rinv);
  const c = f(f(f(2e-6) * f(s)) * sinv);
  return f(f(f(0.5 - a) - b) - c);
}
