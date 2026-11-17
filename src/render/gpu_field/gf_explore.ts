// K1396 (24E): the K76 thread reveal (explore view) under rp=gf. Today's look evaluates the
// visibility pieces per pixel (explore_glsl.ts kExploreAt over the paint declaration's VIS
// items) and multiplies the fragment's alpha, reshaped at a frontier by the end look. gf draws
// from its own tables, which hold no pieces, so this file gives the gf pass the same state:
//
// - EXPLORE TABLE (its own RGBA32F texture, beside the K1362 tables, whose digest never sees
//   it): per chain a header (state, k0, kn, ring length) in gf_reveal.ts's layout, state 0 =
//   hidden (no piece), 1 = whole (exploreWhole), 2 = knots; then a flag per corner (1 = drawn:
//   both arms visible past EXPLORE_JOINT_MIN at their slots, the joint gate's rule); then the
//   knots (s, vis, tip, lf): s the arc along the chain's drawn polyline (gf_reveal.ts's walk),
//   vis the piece visibility at that sample, tip the frontier progress there (-1 outside a
//   frontier fade) and lf that fade's world arc length. Only the samples where a channel
//   changes are kept, exact under the linear interpolation the shader's exAt uses.
// - The look form (gf_look.ts) reads it: the segment scan drops a hidden segment, a corner
//   draws only under its flag, and at the label the visibility (reshaped by the end look,
//   lkExploreLook) multiplies the ink and coverage, so a hidden over thread cuts no gap and
//   hides nothing beneath it, as today's gates do.
// - Only while the renderer declares pieces: outside the explore view gf draws its original
//   programs' frame (the pass's uExLive is 0 and every explore site reads as 1).
import { kArcU, kCA, kSampleArc, type KChain, type KData } from "../paint_math";
import type { ExplorePiece } from "../../game/explore_view";
import { GF_TW } from "./gf_pack";
import type { GfTables } from "./tables";

/** The joint gate's floor (ribbon/explore_gaps.ts EXPLORE_JOINT_MIN): an arm at or below it hides its junction. */
export const GF_EXPLORE_JOINT_MIN = 0.002;

const HIDDEN = 0;
const FULL = 1;
const KNOTS = 2;

/** What the explore table reads from the ribbon renderer (its declaration is today's). */
export interface GfExploreSource {
  explorePieces: ExplorePiece[] | null;
  exploreWhole: Uint8Array;
  kd: KData;
  kcv: KChain[];
  chainSamples: ({ positions: ArrayLike<number>; count: number } | null)[];
}

/** True while the renderer declares visibility pieces (the thread reveal, or a burn's whole-chain declaration). */
export function gfExploring(r: Pick<GfExploreSource, "explorePieces"> | null | undefined): boolean {
  return !!r && r.explorePieces !== null;
}

/** A chain point's explore state (kExploreAt's rule over one chain's pieces, paint_math's twin in pieces). */
export interface GfExploreState { v: number; tip: number; solid: number; end: number; x: number; lf: number }

export function exploreStateAt(pieces: readonly ExplorePiece[], D: KData, c: KChain, ctrl: number): GfExploreState {
  const out: GfExploreState = { v: 0, tip: -1, solid: 0, end: 0, x: ctrl, lf: 0 };
  const n = c.nCtrl;
  let best = 0;
  for (const p of pieces) {
    let x = ctrl;
    if (c.closed) x += n * Math.floor((0.5 * (p.c0 + p.c1) - x) / n + 0.5);
    let v = 1;
    let u = -1;
    let cs = 0;
    let ce = 0;
    if (x < p.c0 - 1e-3) {
      if (p.f0 <= 1e-4) continue;
      const t = Math.min(1, (p.c0 - x) / p.f0);
      v = 1 - t * t * (3 - 2 * t);
      if (p.tip0) { u = t; cs = p.c0; ce = p.c0 - p.f0; }
    } else if (x > p.c1 + 1e-3) {
      if (p.f1 <= 1e-4) continue;
      const t = Math.min(1, (x - p.c1) / p.f1);
      v = 1 - t * t * (3 - 2 * t);
      if (p.tip1) { u = t; cs = p.c1; ce = p.c1 + p.f1; }
    }
    if (v > best || (v === best && u < 0)) {
      best = v;
      out.tip = u;
      out.solid = cs;
      out.end = ce;
      out.x = x;
    }
  }
  out.v = best;
  if (out.tip >= 0) out.lf = Math.abs(kArcU(D, c, out.end) - kArcU(D, c, out.solid));
  return out;
}

/** A chain's knots: arcs, visibilities, frontier tips and fade lengths (exact under linear interpolation). */
export function exploreKnots(s: ArrayLike<number>, v: ArrayLike<number>, tip: ArrayLike<number>, lf: ArrayLike<number>, n: number, closed: boolean, out: number[]): void {
  out.length = 0;
  if (n <= 0) return;
  // the start and end duplicate runs of an open chain draw one point each (gf_reveal.ts's rule)
  let a = 0; let b = n - 1;
  if (!closed) {
    while (a + 1 < n && s[a + 1] === s[0]) a++;
    while (b - 1 > a && s[b - 1] === s[n - 1]) b--;
  }
  out.push(s[a], v[a], tip[a], lf[a]);
  for (let k = a + 1; k < b; k++) {
    const keep = v[k] !== v[k - 1] || v[k] !== v[k + 1] || tip[k] !== tip[k - 1] || tip[k] !== tip[k + 1]
      || lf[k] !== lf[k - 1] || lf[k] !== lf[k + 1] || s[k] === s[k - 1] || s[k] === s[k + 1];
    if (keep) out.push(s[k], v[k], tip[k], lf[k]);
  }
  if (b > a) out.push(s[b], v[b], tip[b], lf[b]);
}

/** The shader's lookup (exAt), in JS: (vis, tip, lf) at arc s of chain ch in a built table's data. */
export function exAt(K: ArrayLike<number>, ch: number, s: number): [number, number, number] {
  const h = 4 * ch;
  const st = K[h];
  if (st < 0.5) return [0, -1, 0];
  if (st < 1.5) return [1, -1, 0];
  const k0 = K[h + 1];
  const kn = K[h + 2];
  const ring = K[h + 3];
  if (kn <= 0) return [0, -1, 0];
  if (ring > 0) s -= ring * Math.floor(s / ring);
  if (s <= K[4 * k0]) return [K[4 * k0 + 1], K[4 * k0 + 2], K[4 * k0 + 3]];
  const last = k0 + kn - 1;
  if (s >= K[4 * last]) return [K[4 * last + 1], K[4 * last + 2], K[4 * last + 3]];
  let a = 0; let b = kn - 1;
  while (b - a > 1) { const m = (a + b) >> 1; if (K[4 * (k0 + m)] <= s) a = m; else b = m; }
  const P = 4 * (k0 + a); const Q = 4 * (k0 + b);
  const t = K[Q] > K[P] ? (s - K[P]) / (K[Q] - K[P]) : 0;
  return [K[P + 1] + (K[Q + 1] - K[P + 1]) * t, K[P + 2] + (K[Q + 2] - K[P + 2]) * t, K[P + 3] + (K[Q + 3] - K[P + 3]) * t];
}

export class GfExploreTable {
  data = new Float32Array(GF_TW * 4);
  rows = 0;
  /** First corner texel (= the chain count). */
  oK = 0;
  /** Knots this frame and chains drawing knots (the probe's stats). */
  nKnots = 0;
  nActive = 0;
  ms = 0;
  private sArr = new Float64Array(0);
  private vArr = new Float64Array(0);
  private tArr = new Float64Array(0);
  private lArr = new Float64Array(0);
  private knots: number[] = [];
  private all: number[] = [];
  private head: number[] = [];

  /** Rebuild from the renderer's declaration this frame, against the installed tables' corners. */
  build(r: GfExploreSource, T: Pick<GfTables, "nK" | "kCa" | "kCb" | "kSa" | "kSb">): void {
    const t0 = performance.now();
    const D = r.kd;
    const nC = r.chainSamples.length;
    const byChain = new Map<number, ExplorePiece[]>();
    for (const p of r.explorePieces ?? []) {
      let l = byChain.get(p.chain);
      if (!l) byChain.set(p.chain, (l = []));
      l.push(p);
    }
    const head = this.head; head.length = 0;
    const all = this.all; all.length = 0;
    let active = 0;
    for (let ch = 0; ch < nC; ch++) {
      const samples = r.chainSamples[ch];
      const c = r.kcv[ch];
      const pieces = byChain.get(ch);
      if (!samples || !c || !pieces) { head.push(HIDDEN, 0, 0, 0); continue; }
      if (r.exploreWhole[ch]) { head.push(FULL, 0, 0, 0); continue; }
      const count = samples.count;
      const cap = count + 1;
      if (this.sArr.length < cap) {
        this.sArr = new Float64Array(cap * 2); this.vArr = new Float64Array(cap * 2);
        this.tArr = new Float64Array(cap * 2); this.lArr = new Float64Array(cap * 2);
      }
      const S = this.sArr; const V = this.vArr; const Tp = this.tArr; const L = this.lArr;
      const P = samples.positions;
      const n = c.nCtrl;
      let slot = 0; let acc = 0;
      for (let k = 0; k < count; k++) {
        if (k > 0) {
          const dx = P[2 * k] - P[2 * k - 2]; const dy = P[2 * k + 1] - P[2 * k - 1];
          if (dx !== 0 || dy !== 0) acc += Math.hypot(dx, dy);
        }
        S[k] = acc;
        const a = kSampleArc(c, k);
        while (slot < n - 1 && kCA(D, c, slot + 1) <= a) slot++;
        const a0 = kCA(D, c, slot);
        const a1 = slot < n - 1 ? kCA(D, c, slot + 1) : c.total;
        const ctrl = slot + (a1 > a0 ? Math.min(1, (a - a0) / (a1 - a0)) : 0);
        const st = exploreStateAt(pieces, D, c, ctrl);
        V[k] = st.v; Tp[k] = st.tip; L[k] = st.lf;
      }
      let ring = 0; let cnt = count;
      if (c.closed && count > 1) {
        const dx = P[0] - P[2 * count - 2]; const dy = P[1] - P[2 * count - 1];
        ring = acc + Math.hypot(dx, dy);
        S[count] = ring; V[count] = V[0]; Tp[count] = Tp[0]; L[count] = L[0]; cnt = count + 1;
      }
      exploreKnots(S, V, Tp, L, cnt, c.closed, this.knots);
      const k0 = all.length / 4;
      for (let i = 0; i < this.knots.length; i++) all.push(this.knots[i]);
      head.push(KNOTS, k0, this.knots.length / 4, ring);
      active++;
    }
    const nK = T.nK;
    const oN = nC + nK;
    const nN = all.length / 4;
    const texels = oN + nN;
    const rows = Math.max(1, Math.ceil(texels / GF_TW));
    if (this.data.length < rows * GF_TW * 4) this.data = new Float32Array(rows * GF_TW * 4);
    const d = this.data;
    for (let ch = 0; ch < nC; ch++) {
      const i = 4 * ch; const st = head[i];
      d[i] = st; d[i + 1] = st === KNOTS ? head[i + 1] + oN : 0; d[i + 2] = head[i + 2]; d[i + 3] = head[i + 3];
    }
    const vAt = (ch: number, s: number): number => {
      if (ch < 0 || ch >= nC) return 1;
      const st = head[4 * ch];
      if (st !== KNOTS) return st === FULL ? 1 : 0;
      // the knots are not in the texture yet: read them from the flat list
      const k0 = head[4 * ch + 1]; const kn = head[4 * ch + 2]; const ring = head[4 * ch + 3];
      if (kn <= 0) return 0;
      let x = s;
      if (ring > 0) x -= ring * Math.floor(x / ring);
      if (x <= all[4 * k0]) return all[4 * k0 + 1];
      const last = k0 + kn - 1;
      if (x >= all[4 * last]) return all[4 * last + 1];
      let a = 0; let b = kn - 1;
      while (b - a > 1) { const m = (a + b) >> 1; if (all[4 * (k0 + m)] <= x) a = m; else b = m; }
      const Pp = 4 * (k0 + a); const Q = 4 * (k0 + b);
      return all[Q] > all[Pp] ? all[Pp + 1] + (all[Q + 1] - all[Pp + 1]) * ((x - all[Pp]) / (all[Q] - all[Pp])) : all[Q + 1];
    };
    for (let k = 0; k < nK; k++) {
      const i = 4 * (nC + k);
      const on = vAt(T.kCa[k], T.kSa[k]) > GF_EXPLORE_JOINT_MIN && vAt(T.kCb[k], T.kSb[k]) > GF_EXPLORE_JOINT_MIN;
      d[i] = on ? 1 : 0; d[i + 1] = 0; d[i + 2] = 0; d[i + 3] = 0;
    }
    for (let q = 0; q < nN; q++) {
      const i = 4 * (oN + q);
      d[i] = all[4 * q]; d[i + 1] = all[4 * q + 1]; d[i + 2] = all[4 * q + 2]; d[i + 3] = all[4 * q + 3];
    }
    this.rows = rows;
    this.oK = nC;
    this.nKnots = nN;
    this.nActive = active;
    this.ms = performance.now() - t0;
  }
}
