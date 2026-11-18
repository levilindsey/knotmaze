// K1396 (24E): the K76 thread reveal (explore view) under rp=gf. Today's look evaluates the
// visibility pieces per pixel (explore_glsl.ts kExploreAt over the paint declaration's VIS
// items) and multiplies the fragment's alpha, reshaped at a frontier by the end look. gf draws
// from its own tables, which hold no pieces, so this file gives the gf pass the same state:
//
// - EXPLORE TABLE (its own RGBA32F texture, beside the K1362 tables, whose digest never sees
//   it): per chain a header (state, k0, kn, ring length) in gf_reveal.ts's layout, state 0 =
//   hidden (no piece), 1 = whole (exploreWhole), 2 = knots; then a flag per corner (1 = drawn:
//   both arms visible past EXPLORE_JOINT_MIN at their slots, the joint gate's rule); then the
//   knots (s, vis, tip, lf) plus a burn texel (char, ember, smolder) per knot (K1434): s the arc along the chain's drawn polyline (gf_reveal.ts's walk),
//   vis the piece visibility at that sample, tip the frontier progress there (-1 outside a
//   frontier fade) and lf that fade's world arc length. Only the samples where a channel
//   changes are kept, exact under the linear interpolation the shader's exAt uses.
// - The look form (gf_look.ts) reads it: the segment scan drops a hidden segment, a corner
//   draws only under its flag, and at the label the visibility (reshaped by the end look,
//   lkExploreLook) multiplies the ink and coverage, so a hidden over thread cuts no gap and
//   hides nothing beneath it, as today's gates do.
// - K1434: under a burn (K290) the bake also carries each sample's char, ember and smolder
//   (burnAt, explore_glsl.ts kCharAt's rule), and a corner's gate reads the burn's gate pieces
//   (the reveal's own pieces), not the declared ones, as today's joint gate does. With no burn
//   the burn texels are 0 and the gates are the declared rule, so the frame is unchanged.
// - Only while the renderer declares pieces: outside the explore view gf draws its original
//   programs' frame (the pass's uExLive is 0 and every explore site reads as 1).
import { kArcU, kCA, kSampleArc, type KChain, type KData } from "../paint_math";
import type { ExploreBurn, ExplorePiece } from "../../game/explore_view";
import {
  EXPLORE_CHAR_EDGE,
  EXPLORE_EMBER_AHEAD,
  EXPLORE_EMBER_BEHIND,
  EXPLORE_FRONT_BAND,
  EXPLORE_FRONT_FUSE,
  EXPLORE_FRONT_GONE,
  frontShape,
} from "../explore_glsl";
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
  /** K1434: the burn's part of the declaration (char spans, fronts, smolder, gate pieces), if any. */
  exploreBurn?: ExploreBurn | null;
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

const sstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const ramp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** A chain point's burn state (char, ember, smolder), each 0..1 (K1434). */
export interface GfBurnState { char: number; ember: number; smolder: number }

/**
 * K1434: how burnt a chain point is under a burn (explore_glsl.ts kCharAt's
 * rule over the declared spans and fronts, K409's world widths and shapes;
 * paint_math.ts kCharAtCpu is the same rule over the paint declaration).
 * `gone` is the burnt look: gone (char spans null) puts the whole ember
 * ahead of the cut. With no burn every channel is 0.
 */
export function burnAt(
  burn: ExploreBurn | null | undefined,
  D: KData,
  c: KChain,
  ctrl: number,
  out: GfBurnState = { char: 0, ember: 0, smolder: 0 }
): GfBurnState {
  out.char = 0; out.ember = 0; out.smolder = 0;
  if (!burn) return out;
  const n = c.nCtrl;
  const inv = 1 / EXPLORE_CHAR_EDGE;
  const gone = burn.char == null;
  let sum = 0;
  const spanAt = (b0: number, b1: number): number => {
    let x = ctrl;
    if (c.closed) x += n * Math.floor((0.5 * (b0 + b1) - x) / n + 0.5);
    return ramp01((x - b0) * inv + 0.5) * ramp01((b1 - x) * inv + 0.5);
  };
  for (const s of burn.char ?? []) if (s.chain === c.ch && s.b1 > s.b0) sum += spanAt(s.b0, s.b1);
  for (const s of burn.smolder ?? []) {
    if (s.chain !== c.ch || !(s.b1 > s.b0)) continue;
    const cr = spanAt(s.b0, s.b1);
    if (cr > out.smolder) out.smolder = cr;
  }
  for (const f of burn.fronts ?? []) {
    if (f.chain !== c.ch) continue;
    let x = ctrl;
    if (c.closed) x += n * Math.floor((f.c - x) / n + 0.5);
    const dir = f.dir < 0 ? -1 : 1;
    const s = (x - f.c) * dir;
    const w = (kArcU(D, c, x) - kArcU(D, c, f.c)) * dir;
    const shape = frontShape(f.kind, gone);
    if (Math.abs(shape - EXPLORE_FRONT_FUSE) > 0.5) {
      sum += (1 - sstep(0, EXPLORE_FRONT_BAND, w)) * ramp01(s * inv + 0.5);
    }
    const ahead = shape > EXPLORE_FRONT_GONE - 0.5 ? EXPLORE_EMBER_AHEAD + EXPLORE_EMBER_BEHIND : EXPLORE_EMBER_AHEAD;
    const e = w >= 0 ? 1 - sstep(0, ahead, w) : 1 - sstep(0, EXPLORE_EMBER_BEHIND, -w);
    if (e > out.ember) out.ember = e;
  }
  out.char = Math.min(sum, 1);
  return out;
}

/** A chain's knots: arcs, visibilities, frontier tips and fade lengths (exact under linear interpolation). */
export function exploreKnots(s: ArrayLike<number>, v: ArrayLike<number>, tip: ArrayLike<number>, lf: ArrayLike<number>, n: number, closed: boolean, out: number[], bc?: ArrayLike<number> | null, be?: ArrayLike<number> | null, bs?: ArrayLike<number> | null, bout?: number[]): void {
  out.length = 0;
  if (n <= 0) return;
  // the start and end duplicate runs of an open chain draw one point each (gf_reveal.ts's rule)
  let a = 0; let b = n - 1;
  if (!closed) {
    while (a + 1 < n && s[a + 1] === s[0]) a++;
    while (b - 1 > a && s[b - 1] === s[n - 1]) b--;
  }
  if (bout) { bout.length = 0; bout.push(bc ? bc[a] : 0, be ? be[a] : 0, bs ? bs[a] : 0, 0); }
  out.push(s[a], v[a], tip[a], lf[a]);
  for (let k = a + 1; k < b; k++) {
    const keepB = !!bc && !!be && !!bs && (bc[k] !== bc[k - 1] || bc[k] !== bc[k + 1] || be[k] !== be[k - 1] || be[k] !== be[k + 1] || bs[k] !== bs[k - 1] || bs[k] !== bs[k + 1]);
    const keep = keepB || v[k] !== v[k - 1] || v[k] !== v[k + 1] || tip[k] !== tip[k - 1] || tip[k] !== tip[k + 1]
      || lf[k] !== lf[k - 1] || lf[k] !== lf[k + 1] || s[k] === s[k - 1] || s[k] === s[k + 1];
    if (keep) { out.push(s[k], v[k], tip[k], lf[k]); if (bout) bout.push(bc ? bc[k] : 0, be ? be[k] : 0, bs ? bs[k] : 0, 0); }
  }
  if (b > a) { out.push(s[b], v[b], tip[b], lf[b]); if (bout) bout.push(bc ? bc[b] : 0, be ? be[b] : 0, bs ? bs[b] : 0, 0); }
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
  const last = k0 + 2 * (kn - 1);
  if (s >= K[4 * last]) return [K[4 * last + 1], K[4 * last + 2], K[4 * last + 3]];
  let a = 0; let b = kn - 1;
  while (b - a > 1) { const m = (a + b) >> 1; if (K[4 * (k0 + 2 * m)] <= s) a = m; else b = m; }
  const P = 4 * (k0 + 2 * a); const Q = 4 * (k0 + 2 * b);
  const t = K[Q] > K[P] ? (s - K[P]) / (K[Q] - K[P]) : 0;
  return [K[P + 1] + (K[Q + 1] - K[P + 1]) * t, K[P + 2] + (K[Q + 2] - K[P + 2]) * t, K[P + 3] + (K[Q + 3] - K[P + 3]) * t];
}

/** The burn lookup (K1434), in JS: (char, ember, smolder) at arc s of chain ch in a built table's data. */
export function exBurnAt(K: ArrayLike<number>, ch: number, s: number): [number, number, number] {
  const h = 4 * ch;
  const st = K[h];
  if (st < 1.5) return [0, 0, 0];
  const k0 = K[h + 1];
  const kn = K[h + 2];
  const ring = K[h + 3];
  if (kn <= 0) return [0, 0, 0];
  if (ring > 0) s -= ring * Math.floor(s / ring);
  if (s <= K[4 * k0]) return [K[4 * (k0 + 1)], K[4 * (k0 + 1) + 1], K[4 * (k0 + 1) + 2]];
  const last = k0 + 2 * (kn - 1);
  if (s >= K[4 * last]) return [K[4 * (last + 1)], K[4 * (last + 1) + 1], K[4 * (last + 1) + 2]];
  let a = 0; let b = kn - 1;
  while (b - a > 1) { const m = (a + b) >> 1; if (K[4 * (k0 + 2 * m)] <= s) a = m; else b = m; }
  const P = 4 * (k0 + 2 * a + 1); const Q = 4 * (k0 + 2 * b + 1);
  const A = 4 * (k0 + 2 * a);
  const t = K[4 * (k0 + 2 * b)] > K[A] ? (s - K[A]) / (K[4 * (k0 + 2 * b)] - K[A]) : 0;
  return [K[P] + (K[Q] - K[P]) * t, K[P + 1] + (K[Q + 1] - K[P + 1]) * t, K[P + 2] + (K[Q + 2] - K[P + 2]) * t];
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
  private ctArr = new Float64Array(0);
  private bcArr = new Float64Array(0);
  private beArr = new Float64Array(0);
  private bsArr = new Float64Array(0);
  private bknots: number[] = [];
  private ball: number[] = [];
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
    const ball = this.ball; ball.length = 0;
    // K1434: the burn's gate pieces (which junctions hide) and the chains it touches
    const burn = r.exploreBurn ?? null;
    const gateByChain = new Map<number, ExplorePiece[]>();
    if (burn?.gate) for (const p of burn.gate) { let l = gateByChain.get(p.chain); if (!l) gateByChain.set(p.chain, (l = [])); l.push(p); }
    const burntChains = new Set<number>();
    if (burn) {
      for (const s of burn.char ?? []) if (s.b1 > s.b0) burntChains.add(s.chain);
      for (const s of burn.smolder ?? []) if (s.b1 > s.b0) burntChains.add(s.chain);
      for (const f of burn.fronts ?? []) burntChains.add(f.chain);
    }
    // per-chain (drawn arc, ctrl) at each sample, kept for the gate lookup at corners
    const sampleCtrl = new Map<number, { s: Float64Array; ctrl: Float64Array; cnt: number }>();
    const recordCtrl = (ch: number, samples: { positions: ArrayLike<number>; count: number }, c: KChain): void => {
      if (sampleCtrl.has(ch)) return;
      const count = samples.count; const P = samples.positions; const n = c.nCtrl;
      const ss = new Float64Array(count + 1); const cc = new Float64Array(count + 1);
      let slot = 0; let acc = 0;
      for (let k = 0; k < count; k++) {
        if (k > 0) { const dx = P[2 * k] - P[2 * k - 2]; const dy = P[2 * k + 1] - P[2 * k - 1]; if (dx !== 0 || dy !== 0) acc += Math.hypot(dx, dy); }
        ss[k] = acc;
        const a = kSampleArc(c, k);
        while (slot < n - 1 && kCA(D, c, slot + 1) <= a) slot++;
        const a0 = kCA(D, c, slot); const a1 = slot < n - 1 ? kCA(D, c, slot + 1) : c.total;
        cc[k] = slot + (a1 > a0 ? Math.min(1, (a - a0) / (a1 - a0)) : 0);
      }
      let cnt = count;
      if (c.closed && count > 1) { const dx = P[0] - P[2 * count - 2]; const dy = P[1] - P[2 * count - 1]; ss[count] = acc + Math.hypot(dx, dy); cc[count] = cc[0]; cnt = count + 1; }
      sampleCtrl.set(ch, { s: ss, ctrl: cc, cnt });
    };
    let active = 0;
    for (let ch = 0; ch < nC; ch++) {
      const samples = r.chainSamples[ch];
      const c = r.kcv[ch];
      const pieces = byChain.get(ch);
      if (!samples || !c) { head.push(HIDDEN, 0, 0, 0); continue; }
      // K1434: a burnt chain bakes knots even when whole (its burn channels must read)
      if (r.exploreWhole[ch] && !burntChains.has(ch)) { if (gateByChain.size > 0) recordCtrl(ch, samples, c); head.push(FULL, 0, 0, 0); continue; }
      if (!pieces) { if (gateByChain.size > 0) recordCtrl(ch, samples, c); head.push(HIDDEN, 0, 0, 0); continue; }
      const count = samples.count;
      const cap = count + 1;
      if (this.sArr.length < cap) {
        this.sArr = new Float64Array(cap * 2); this.vArr = new Float64Array(cap * 2);
        this.tArr = new Float64Array(cap * 2); this.lArr = new Float64Array(cap * 2);
        this.ctArr = new Float64Array(cap * 2);
        this.bcArr = new Float64Array(cap * 2); this.beArr = new Float64Array(cap * 2); this.bsArr = new Float64Array(cap * 2);
      }
      const S = this.sArr; const V = this.vArr; const Tp = this.tArr; const L = this.lArr;
      const Ct = this.ctArr; const Bc = this.bcArr; const Be = this.beArr; const Bs = this.bsArr;
      const burnt = burntChains.has(ch);
      const bst: GfBurnState = { char: 0, ember: 0, smolder: 0 };
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
        Ct[k] = ctrl;
        if (burnt) { burnAt(burn, D, c, ctrl, bst); Bc[k] = bst.char; Be[k] = bst.ember; Bs[k] = bst.smolder; }
        else { Bc[k] = 0; Be[k] = 0; Bs[k] = 0; }
      }
      let ring = 0; let cnt = count;
      if (c.closed && count > 1) {
        const dx = P[0] - P[2 * count - 2]; const dy = P[1] - P[2 * count - 1];
        ring = acc + Math.hypot(dx, dy);
        S[count] = ring; V[count] = V[0]; Tp[count] = Tp[0]; L[count] = L[0]; Ct[count] = Ct[0]; Bc[count] = Bc[0]; Be[count] = Be[0]; Bs[count] = Bs[0]; cnt = count + 1;
      }
      if (gateByChain.size > 0) sampleCtrl.set(ch, { s: Float64Array.from(S.slice(0, cnt)), ctrl: Float64Array.from(Ct.slice(0, cnt)), cnt });
      exploreKnots(S, V, Tp, L, cnt, c.closed, this.knots, burnt ? Bc : null, burnt ? Be : null, burnt ? Bs : null, this.bknots);
      const k0 = all.length / 4;
      for (let i = 0; i < this.knots.length; i++) all.push(this.knots[i]);
      for (let i = 0; i < this.bknots.length; i++) ball.push(this.bknots[i]);
      head.push(KNOTS, k0, this.knots.length / 4, ring);
      active++;
    }
    const nK = T.nK;
    const oN = nC + nK;
    const nN = all.length / 4;
    const texels = oN + 2 * nN;
    const rows = Math.max(1, Math.ceil(texels / GF_TW));
    if (this.data.length < rows * GF_TW * 4) this.data = new Float32Array(rows * GF_TW * 4);
    const d = this.data;
    for (let ch = 0; ch < nC; ch++) {
      const i = 4 * ch; const st = head[i];
      d[i] = st; d[i + 1] = st === KNOTS ? head[i + 1] * 2 + oN : 0; d[i + 2] = head[i + 2]; d[i + 3] = head[i + 3];
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
    // K1434: a corner's gate visibility (the reveal's own pieces under a burn;
    // 1 with a burn and the reveal off, the declared visibility with no burn)
    const gateAt = (ch: number, s: number): number => {
      if (!burn) return vAt(ch, s);
      if (gateByChain.size === 0) return 1;
      const gp = gateByChain.get(ch);
      if (!gp || gp.length === 0) return 0;
      const rec = sampleCtrl.get(ch);
      const c = r.kcv[ch];
      if (!rec || !c) return 0;
      let x = s;
      const ring = rec.s[rec.cnt - 1];
      if (c.closed && ring > 0) x -= ring * Math.floor(x / ring);
      if (x <= rec.s[0]) return exploreStateAt(gp, D, c, rec.ctrl[0]).v;
      if (x >= rec.s[rec.cnt - 1]) return exploreStateAt(gp, D, c, rec.ctrl[rec.cnt - 1]).v;
      let a = 0; let b = rec.cnt - 1;
      while (b - a > 1) { const m = (a + b) >> 1; if (rec.s[m] <= x) a = m; else b = m; }
      const t = rec.s[b] > rec.s[a] ? (x - rec.s[a]) / (rec.s[b] - rec.s[a]) : 0;
      const ctrl = rec.ctrl[a] + (rec.ctrl[b] - rec.ctrl[a]) * t;
      return exploreStateAt(gp, D, c, ctrl).v;
    };
    for (let k = 0; k < nK; k++) {
      const i = 4 * (nC + k);
      const dA = vAt(T.kCa[k], T.kSa[k]); const dB = vAt(T.kCb[k], T.kSb[k]);
      const on = gateAt(T.kCa[k], T.kSa[k]) > GF_EXPLORE_JOINT_MIN && gateAt(T.kCb[k], T.kSb[k]) > GF_EXPLORE_JOINT_MIN
        && (dA > GF_EXPLORE_JOINT_MIN || dB > GF_EXPLORE_JOINT_MIN);
      d[i] = on ? 1 : 0; d[i + 1] = 0; d[i + 2] = 0; d[i + 3] = 0;
    }
    for (let q = 0; q < nN; q++) {
      const i = 4 * (oN + 2 * q);
      d[i] = all[4 * q]; d[i + 1] = all[4 * q + 1]; d[i + 2] = all[4 * q + 2]; d[i + 3] = all[4 * q + 3];
      const j = 4 * (oN + 2 * q + 1);
      d[j] = ball[4 * q]; d[j + 1] = ball[4 * q + 1]; d[j + 2] = ball[4 * q + 2]; d[j + 3] = ball[4 * q + 3];
    }
    this.rows = rows;
    this.oK = nC;
    this.nKnots = nN;
    this.nActive = active;
    this.ms = performance.now() - t0;
  }
}
