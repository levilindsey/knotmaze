// K1040 S3: the label pass's CPU side - form B's top surface on the GPU.
//
// The label is the reference's (FormB.evalPoint's) top surface per pixel:
// its surface (group g, or the piece's own), chain and s. The GPU draws it
// as capsules of radius h per chain segment plus the corner fills, depth-
// tested on Q1's cone key z - d/K (form_b.ts header). This file builds the
// tables the pass reads, from a FormB frame (the reference's polys, arms,
// groups and corners; S5 makes this prep fast), and mirrors the fragment
// rule in float64 (labelAt) for the pins.
//
// Tables (RGBA32F, TEX_W texels a row, texel i at (i % TEX_W, i / TEX_W)):
//   PTS    per chain its n vertices (x, y, s, z), world units.
//   CHAIN  per chain 2 texels: (ptOff, n, nseg, closed), (s0, len, spanOff,
//          nSpan).
//   SPAN   per chain its surface spans (lo, code, 0, 0), sorted by lo, the
//          first at s0: from lo to the next lo the surface code is code =
//          g + 1 where member(chain, s) puts s in group g's arm span at cap
//          ramp >= 1/2 (a single ramp piece's heaviest configuration,
//          evalPoint's cap mix), else 0 (OWN: the piece's own surface).
//   FILL   per corner with r > 0 and omega > 0, FILL_TEXELS texels (below).
// Instances: one per segment, (chain, k), static: the layout key is the
//   chains' segment counts, so the instance buffer is rebuilt only when a
//   count changes (K985), as label_band_gpu.ts's BandEdgeLayout is.
//
// The fragment rule (a capsule): the pixel's foot on segment k is a
// candidate exactly when geom.ts candidates() takes it - an interior foot,
// or vertex k when the previous segment's foot is clamped at its far end
// (or there is none), or an open chain's last vertex - so a vertex's two
// segments never both claim one foot (K1033). It covers when d < h, and
// when no nearer candidate of its own chain lies within foldR of its s:
// form B's merge (pieces(): a minimum within sigma of a kept one drops into
// its alts) and its fold (a kept far piece within 1.5 sigma has selfW < 1/2
// and does not cover). The scan visits only segment k's window NB, the
// segments that can hold a second minimum for a point within h of k (the
// bound in nbWindows). Its key is z(foot) - d/K; the depth test keeps the
// highest key. A fill covers where FormB.inFill does, keyed z(nearer
// tangent point) - h/K.
//
// The word keeps label_glsl.ts's PACKED layout: bits 0-7 chain + 1 (0 =
// paper), 8-18 s11 = round(clamp((s - s0) / len) * 2047), 19-26 the
// surface code (group + 1, 0 = own), 27 fill, 28 cap (an open chain's end
// foot), 29 closed.

import { FormB, type Corner } from "./form_b";
import { dS, normS, segB, type Poly } from "./geom";

export const TEX_W = 1024;
/** Surface codes in the word: 8 bits, group + 1 (0 = the piece's own). */
export const MAX_GROUPS = 255;
/**
 * FILL texels per corner:
 *   0 (qx, qy, r, Rp)       Rp = min(inFill's reach, rV (1 + 1e-9) + 1e-12):
 *                           evalLayers drops a fill past rV before inFill
 *                           (its key and its cover), so the label's fill
 *                           ends at rV, not at the 2aa overlap's V'
 *   1 (tax, tay, tbx, tby)
 *   2 (zA, zB, sA, sB)
 *   3 (chainA, chainB, code, lim)   lim = h - 2aa
 *   4 (sLoA, sHiA, k0A, cntA)  arm a's foot window (FormB.inFill)
 *   5 (sLoB, sHiB, k0B, cntB)  arm b's
 */
export const FILL_TEXELS = 6;

export interface LabelBTables {
  nChains: number;
  pts: Float32Array;
  ptsRows: number;
  chain: Float32Array;
  chainRows: number;
  span: Float32Array;
  spanRows: number;
  fill: Float32Array;
  fillRows: number;
  nFills: number;
  /** Corner index of each fill. */
  fillCorner: number[];
  /** Instance attribute: (chain, k) per segment, as floats. */
  inst: Float32Array;
  nInst: number;
  /** The chains' segment counts; the instances change only when it does (K985). */
  layoutKey: string;
  nGroups: number;
  /** depth = 0.5 - key * keyScale, in [0.3, 0.7]. */
  keyScale: number;
  h: number;
  /** 1 / K (0 when K is infinite). */
  invK: number;
  /** Per chain: the spans as built (lo, code), for the pins and probes. */
  spans: { lo: number; code: number }[][];
  /** Per chain: point offset. */
  ptOff: number[];
  /** NB: per segment (indexed as PTS) its merge-scan window (m-, m+, 0, 0). */
  nb: Float32Array;
  /** The merge scan's reach in s: 1.5 sigma with the fold (a far piece covers from there), else sigma. */
  foldR: number;
}

function rows(n: number): number {
  return Math.max(1, Math.ceil(n / TEX_W));
}

/** The surface code at (chain, s): group + 1 at ramp >= 1/2, else 0 (own). */
export function surfCode(fb: FormB, pi: number, s: number): number {
  const m = fb.member(pi, s);
  return m.g >= 0 && m.ramp >= 0.5 ? m.g + 1 : 0;
}

/**
 * A chain's surface spans: every switch of surfCode along s, located by
 * bisection between the midpoints of the intervals its arms' bounds cut
 * (the span ends, the cut, the ramp's 1/2 point, F10's root side).
 */
export function chainSpans(fb: FormB, pi: number): { lo: number; code: number }[] {
  const p = fb.polys[pi];
  const lam = fb.lambda;
  const lo0 = p.s0;
  const hi0 = p.s0 + p.len;
  const cand: number[] = [lo0, hi0];
  for (const ai of fb.armsOf[pi]) {
    const a = fb.arms[ai];
    const ds = [0, a.L];
    if (a.Lcut !== Infinity) ds.push(a.Lcut, a.Lcut - lam / 2, a.Lcut - lam);
    for (const d of ds) {
      const s = normS(p, a.sR + a.dir * d);
      if (s >= lo0 && s <= hi0) cand.push(s);
    }
  }
  cand.sort((u, v) => u - v);
  const cs: number[] = [];
  for (const s of cand) if (cs.length === 0 || s - cs[cs.length - 1] > 1e-12) cs.push(s);
  // Interval midpoints and their codes.
  const mids: number[] = [];
  for (let i = 0; i + 1 < cs.length; i++) mids.push((cs[i] + cs[i + 1]) / 2);
  if (mids.length === 0) mids.push(lo0);
  const codes = mids.map((s) => surfCode(fb, pi, s));
  const out: { lo: number; code: number }[] = [{ lo: lo0, code: codes[0] }];
  for (let i = 1; i < mids.length; i++) {
    if (codes[i] === codes[i - 1]) continue;
    let a = mids[i - 1];
    let b = mids[i];
    for (let it = 0; it < 80 && b - a > 1e-13 * Math.max(1, Math.abs(b)); it++) {
      const m = (a + b) / 2;
      if (surfCode(fb, pi, m) === codes[i - 1]) a = m;
      else b = m;
    }
    out.push({ lo: b, code: codes[i] });
  }
  return out;
}

/** The span code at s (s normalized as the shader does). */
export function spanCode(spans: { lo: number; code: number }[], s: number): number {
  let c = spans[0].code;
  for (const e of spans) {
    if (e.lo <= s) c = e.code;
    else break;
  }
  return c;
}

/** An arm's foot window for inFill: s range (unwrapped) and segment walk. */
export function armWindowWalk(fb: FormB, ai: number, d1: number): [number, number, number, number] {
  const a = fb.arms[ai];
  const p = fb.polys[a.pi];
  const [lo, hi] = fb.armWindow(ai, 0, d1);
  let sLo = lo;
  let sHi = hi;
  if (p.closed) {
    const u = normS(p, sLo);
    sHi = u + (sHi - sLo);
    sLo = u;
  } else {
    sLo = Math.max(sLo, p.s0);
    sHi = Math.min(sHi, p.s0 + p.len);
  }
  if (!(sHi >= sLo)) return [0, -1, 0, 0];
  // First segment: the one whose span reaches sLo.
  let k0 = 0;
  while (k0 + 1 < p.nseg && p.s[k0] + p.segLen[k0] < sLo) k0++;
  let cnt = 0;
  let k = k0;
  let off = 0;
  while (cnt < p.nseg) {
    if (p.s[k] + off > sHi) break;
    cnt++;
    k++;
    if (k === p.nseg) {
      if (!p.closed) break;
      k = 0;
      off += p.len;
    }
  }
  return [sLo, sHi, k0, cnt];
}

/**
 * The merge scan's windows (NB), per segment k of chain p: m- and m+, the
 * farthest segments back and ahead that can hold a second distance minimum
 * within foldR of a point p0 within h of segment k. Necessary conditions
 * for a minimum on segment j ahead (behind is symmetric): g(s) =
 * (gamma(s) - p0) . T(s), whose zeros are the minima, rises at rate 1
 * along each segment and jumps by (v_i - p0) . (T_i+ - T_i-) at vertex i;
 * between two minima it falls back, so the vertices between them carry
 * |jumps| >= the arc between them, and |v_i - p0| < h + max(|v_i - v_k|,
 * |v_i - v_k+1|). So: (i) the arc s_j - s_k+1 < foldR; (ii) segments j and
 * k lie within 2h (|mid_j - mid_k| - (l_j + l_k) / 2 < 2h, a lower bound
 * on their distance); (iii) sum over vertices k+1..j of (h + max(...))
 * |T_i+ - T_i-| >= s_j - s_k+1. The adjacent segments always pass (iii).
 * Straight stretches give +-1; a tight turn, more.
 */
export function nbWindows(p: Poly, h: number, foldR: number, out: Float32Array, off: number): void {
  const ns = p.nseg;
  const n = p.n;
  const tx = new Float64Array(ns);
  const ty = new Float64Array(ns);
  const ok = new Uint8Array(ns);
  const mx = new Float64Array(ns);
  const my = new Float64Array(ns);
  const hl = new Float64Array(ns);
  for (let k = 0; k < ns; k++) {
    const kb = segB(p, k);
    const dx = p.x[kb] - p.x[k];
    const dy = p.y[kb] - p.y[k];
    const l = Math.sqrt(dx * dx + dy * dy);
    if (l > 0) {
      tx[k] = dx / l;
      ty[k] = dy / l;
      ok[k] = 1;
    }
    mx[k] = (p.x[k] + p.x[kb]) / 2;
    my[k] = (p.y[k] + p.y[kb]) / 2;
    hl[k] = l / 2;
  }
  // |T_i+ - T_i-| at vertex i (2 when a side has no direction).
  const turn = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = i > 0 ? i - 1 : p.closed ? ns - 1 : -1;
    const b = i < ns ? i : -1;
    if (a < 0 || b < 0) continue;
    turn[i] = ok[a] && ok[b] ? Math.sqrt((tx[b] - tx[a]) ** 2 + (ty[b] - ty[a]) ** 2) : 2;
  }
  const slack = 1e-4;
  const segIx = (i: number) => ((i % ns) + ns) % ns;
  for (let k = 0; k < ns; k++) {
    const kb = segB(p, k);
    const reach = (i: number) =>
      h + Math.max(Math.hypot(p.x[i] - p.x[k], p.y[i] - p.y[k]), Math.hypot(p.x[i] - p.x[kb], p.y[i] - p.y[kb]));
    const near = (j: number) => Math.hypot(mx[j] - mx[k], my[j] - my[k]) - hl[j] - hl[k] < 2 * h + slack;
    let mPlus = 0;
    let S = 0;
    let arc = 0;
    for (let step = 1; step < ns; step++) {
      const jr = k + step;
      if (!p.closed && jr > ns - 1) break;
      if (step > 1) arc += p.segLen[segIx(jr - 1)];
      if (arc >= foldR + slack) break;
      const j = segIx(jr);
      S += reach(j) * turn[j];
      if (near(j) && S >= arc - slack) mPlus = step;
    }
    let mMinus = 0;
    S = 0;
    arc = 0;
    for (let step = 1; step < ns; step++) {
      const jr = k - step;
      if (!p.closed && jr < 0) break;
      if (step > 1) arc += p.segLen[segIx(jr + 1)];
      if (arc >= foldR + slack) break;
      const i = segIx(jr + 1);
      S += reach(i) * turn[i];
      if (near(segIx(jr)) && S >= arc - slack) mMinus = step;
    }
    out[4 * (off + k)] = mMinus;
    out[4 * (off + k) + 1] = mPlus;
  }
}

export function buildLabelB(fb: FormB): LabelBTables {
  const P = fb.polys;
  const nChains = P.length;
  if (nChains > 254) throw new Error(`label_b: ${nChains} chains exceed the word's 8 chain bits`);
  if (fb.nGroups > MAX_GROUPS) throw new Error(`label_b: ${fb.nGroups} groups exceed the word's ${MAX_GROUPS}`);
  let nPts = 0;
  let nInst = 0;
  const ptOff: number[] = [];
  for (const p of P) {
    ptOff.push(nPts);
    nPts += p.n;
    nInst += p.nseg;
  }
  const ptsRows = rows(nPts);
  const pts = new Float32Array(ptsRows * TEX_W * 4);
  const inst = new Float32Array(nInst * 2);
  let zmax = 0;
  let ii = 0;
  P.forEach((p, ci) => {
    const o = ptOff[ci] * 4;
    for (let k = 0; k < p.n; k++) {
      pts[o + 4 * k] = p.x[k];
      pts[o + 4 * k + 1] = p.y[k];
      pts[o + 4 * k + 2] = p.s[k];
      pts[o + 4 * k + 3] = p.z[k];
      zmax = Math.max(zmax, Math.abs(p.z[k]));
    }
    for (let k = 0; k < p.nseg; k++) {
      inst[ii++] = ci;
      inst[ii++] = k;
    }
  });
  const foldR = fb.fold ? 1.5 * fb.sigma : fb.sigma;
  const nb = new Float32Array(ptsRows * TEX_W * 4);
  P.forEach((p, ci) => nbWindows(p, fb.h, foldR, nb, ptOff[ci]));
  const spans = P.map((_, ci) => chainSpans(fb, ci));
  let nSpan = 0;
  for (const s of spans) nSpan += s.length;
  const spanRows = rows(nSpan);
  const span = new Float32Array(spanRows * TEX_W * 4);
  const chainRows = rows(2 * nChains);
  const chain = new Float32Array(chainRows * TEX_W * 4);
  let so = 0;
  P.forEach((p, ci) => {
    const c = 8 * ci;
    chain[c] = ptOff[ci];
    chain[c + 1] = p.n;
    chain[c + 2] = p.nseg;
    chain[c + 3] = p.closed ? 1 : 0;
    chain[c + 4] = p.s0;
    chain[c + 5] = p.len;
    chain[c + 6] = so;
    chain[c + 7] = spans[ci].length;
    for (const e of spans[ci]) {
      span[4 * so] = e.lo;
      span[4 * so + 1] = e.code;
      so++;
    }
  });
  const fillCorner: number[] = [];
  fb.corners.forEach((c, i) => {
    if (c.r > 0 && c.omega > 0) fillCorner.push(i);
  });
  const fillRows = rows(FILL_TEXELS * fillCorner.length);
  const fill = new Float32Array(fillRows * TEX_W * 4);
  const h = fb.h;
  const aa = fb.aa;
  fillCorner.forEach((ci, fi) => {
    const c: Corner = fb.corners[ci];
    const o = FILL_TEXELS * 4 * fi;
    const Rp = Math.min(c.rV + (2 * aa) / Math.max(0.1, Math.sin(c.theta / 2)) + 1e-12, c.rV * (1 + 1e-9) + 1e-12);
    fill.set([c.qx, c.qy, c.r, Rp], o);
    fill.set([c.tax, c.tay, c.tbx, c.tby], o + 4);
    fill.set([c.zA, c.zB, c.sA, c.sB], o + 8);
    fill.set([fb.arms[c.a].pi, fb.arms[c.b].pi, c.g + 1, h - 2 * aa], o + 12);
    fill.set(armWindowWalk(fb, c.a, Math.max(c.dVa, c.dA) + 2 * h), o + 16);
    fill.set(armWindowWalk(fb, c.b, Math.max(c.dVb, c.dB) + 2 * h), o + 20);
  });
  const invK = fb.K === Infinity ? 0 : 1 / fb.K;
  return {
    nChains,
    pts,
    ptsRows,
    chain,
    chainRows,
    span,
    spanRows,
    fill,
    fillRows,
    nFills: fillCorner.length,
    fillCorner,
    inst,
    nInst,
    layoutKey: P.map((p) => p.nseg).join(","),
    nGroups: fb.nGroups,
    keyScale: 0.2 / (zmax + fb.zt + 1e-6),
    h,
    invK,
    spans,
    ptOff,
    nb,
    foldR,
  };
}

/** The packed word (label_glsl.ts PACKED). */
export function packWord(chain: number, s: number, s0: number, len: number, code: number, fill: boolean, cap: boolean, closed: boolean): number {
  const s11 = Math.floor(Math.min(1, Math.max(0, (s - s0) / len)) * 2047 + 0.5);
  return ((chain + 1) | (s11 << 8) | (code << 19) | ((fill ? 1 : 0) << 27) | ((cap ? 1 : 0) << 28) | ((closed ? 1 : 0) << 29)) >>> 0;
}

export function unpackWord(w: number): { chain: number; s11: number; code: number; fill: boolean; cap: boolean; closed: boolean } {
  return {
    chain: (w & 0xff) - 1,
    s11: (w >>> 8) & 0x7ff,
    code: (w >>> 19) & 0xff,
    fill: ((w >>> 27) & 1) === 1,
    cap: ((w >>> 28) & 1) === 1,
    closed: ((w >>> 29) & 1) === 1,
  };
}

export interface LabelHit {
  word: number;
  key: number;
  chain: number;
  s: number;
  code: number;
  fill: boolean;
}

const PAPER: LabelHit = { word: 0, key: -Infinity, chain: -1, s: 0, code: 0, fill: false };

function segT(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  return l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
}

/**
 * The fragment rule's float64 mirror: every capsule and fill at (x, y),
 * the highest key kept (first drawn wins a tie, as LESS does). Brute force
 * over all segments; for pins and small probes.
 */
export function labelAt(fb: FormB, T: LabelBTables, x: number, y: number): LabelHit {
  let best = PAPER;
  const h = T.h;
  fb.polys.forEach((p, ci) => {
    for (let k = 0; k < p.nseg; k++) {
      const hit = capsuleAt(p, ci, k, T, x, y, h);
      if (hit && hit.key > best.key) best = hit;
    }
  });
  for (let fi = 0; fi < T.nFills; fi++) {
    const hit = fillAt(fb, T, fi, x, y);
    if (hit && hit.key > best.key) best = hit;
  }
  return best;
}

/** The candidate foot on segment k (geom.ts candidates()' rule), or null. */
function footAt(p: Poly, k: number, x: number, y: number): { t: number; d: number; cap: boolean } | null {
  const kb = segB(p, k);
  const ax = p.x[k];
  const ay = p.y[k];
  const bx = p.x[kb];
  const by = p.y[kb];
  const tr = segT(x, y, ax, ay, bx, by);
  let cap = false;
  if (tr <= 0) {
    // Vertex k: this segment's only when the previous one's foot is past its end.
    const hasPrev = p.closed || k > 0;
    if (hasPrev) {
      const kp = k > 0 ? k - 1 : p.nseg - 1;
      if (segT(x, y, p.x[kp], p.y[kp], ax, ay) < 1) return null;
    } else cap = true;
  } else if (tr >= 1) {
    const hasNext = p.closed || k + 1 < p.nseg;
    if (hasNext) return null;
    cap = true;
  }
  const t = Math.min(1, Math.max(0, tr));
  const fx = ax + (bx - ax) * t;
  const fy = ay + (by - ay) * t;
  return { t, d: Math.hypot(x - fx, y - fy), cap };
}

/** Whether a nearer candidate of chain p in segment k's window lies within foldR of s (the merge scan). */
function mergedAway(p: Poly, k: number, T: LabelBTables, off: number, x: number, y: number, d: number, s: number): boolean {
  const m0 = T.nb[4 * (off + k)];
  const m1 = T.nb[4 * (off + k) + 1];
  const ns = p.nseg;
  for (let jr = k - m0; jr <= k + m1; jr++) {
    const j = jr < 0 ? jr + ns : jr >= ns ? jr - ns : jr;
    if (j === k) continue;
    const q = footAt(p, j, x, y);
    if (!q || !(q.d < d)) continue;
    const sq = normS(p, p.s[j] + q.t * p.segLen[j]);
    if (Math.abs(dS(p, s, sq)) < T.foldR) return true;
  }
  return false;
}

function capsuleAt(p: Poly, ci: number, k: number, T: LabelBTables, x: number, y: number, h: number): LabelHit | null {
  const f = footAt(p, k, x, y);
  if (!f || !(f.d < h)) return null;
  const { t, d, cap } = f;
  const s = normS(p, p.s[k] + t * p.segLen[k]);
  if (mergedAway(p, k, T, T.ptOff[ci], x, y, d, s)) return null;
  const kb = segB(p, k);
  const z = p.z[k] + (p.z[kb] - p.z[k]) * t;
  const key = z - d * T.invK;
  const code = spanCode(T.spans[ci], s);
  return { word: packWord(ci, s, p.s0, p.len, code, false, cap, p.closed), key, chain: ci, s, code, fill: false };
}

function fillAt(fb: FormB, T: LabelBTables, fi: number, x: number, y: number): LabelHit | null {
  const c = fb.corners[T.fillCorner[fi]];
  if (Math.hypot(x - c.qx, y - c.qy) > c.rV * (1 + 1e-9) + 1e-12 || !fb.inFill(c, x, y)) return null;
  const nearerA = Math.hypot(x - c.tax, y - c.tay) <= Math.hypot(x - c.tbx, y - c.tby);
  const z = nearerA ? c.zA : c.zB;
  const key = z - T.h * T.invK;
  const ci = fb.arms[nearerA ? c.a : c.b].pi;
  const p = fb.polys[ci];
  const s = nearerA ? c.sA : c.sB;
  return { word: packWord(ci, s, p.s0, p.len, c.g + 1, true, false, p.closed), key, chain: ci, s, code: c.g + 1, fill: true };
}
