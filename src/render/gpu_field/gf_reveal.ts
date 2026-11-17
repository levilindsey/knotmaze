// K1383 s1: the appearance reveal under rp=gf. Today's look (ribbon/reveal_fx.ts
// widthMulFor) scales each drawn sample's width by its reveal mask
// (paint_math kRevealMaskAt) and the mesh interpolates the width linearly
// between samples. gf draws from its own tables (gf_pack.ts), which hold no
// reveal, so this file gives the gf pass the same mask:
//
// - REVEAL TABLE (its own RGBA32F texture, never the K1362 tables, whose
//   digest stays bit-identical): per chain a header (state, k0, kn, ring
//   length), state 0 = not started (hidden), 1 = revealed, 2 = knots; then a
//   flag per corner (1 = shown); then the knots (s, m), s the arc along the
//   chain's drawn polyline (gfRawChain's: hypot between the samples, exact
//   duplicates adding nothing, so a tucked end's run sits at one s). The
//   masks are widthMulFor's, sample for sample; only the samples where the
//   mask changes are kept (a run of equal masks keeps its two ends), which
//   is exact under the linear interpolation both sides use.
// - A tucked end's duplicate run draws one point: the start run shows its
//   last sample's mask, the end run its first (the segments the ribbon
//   draws there).
// - PROGRAM FORM (revealForm): the same programs plus a mask lookup at each
//   scanned segment's nearest point: m <= 0 drops the segment, else its
//   distance is divided by m (the ribbon's width times m, the whole
//   cross-section scaling as the mesh's does). A corner draws only once the
//   masks at both its arms are 1: form B's junction has no partly revealed
//   counterpart, and the nearest reading of today's (a joint's fan shows
//   once every arm is revealed, reveal_fx jointGate) is "no corner until
//   both arms are in". Every program of the set gets the same form, so the
//   tier routing stays exact (a tier and the full program compute the same
//   pixel).
// - K1395 (24D): each knot also carries the WIDTH (mask x rainbow swell,
//   widthMulFor's width, not just its mask): rvM returns the width, so the
//   rainbow's swell widens the thread as today's mesh does. The corner gate
//   still reads the mask (revealAt). A chain whose mask is done but whose
//   swell still runs stays in knots until the swell ends.
// - Only while the reveal runs: once it ends gf draws its original programs
//   (gf_pass.ts), so the rest frame is the same program as before by
//   construction.
import { kCA, kFxAge, kIgnition, kRevealMaskAt, kSampleArc, kSwell, kWall, smoothInv, type KChain, type KData, type KIgn } from "../paint_math";
import { FX_STYLE, PAINT_CONST } from "../paint_const";
import { knotUniformValues } from "../paint_model";
import { GF_TW } from "./gf_pack";
import type { GfTables } from "./tables";

/** What the reveal table reads from the ribbon renderer (its reveal state is today's). */
export interface GfRevealSource {
  revealOn: boolean;
  fxLive: boolean;
  kd: KData;
  kcv: KChain[];
  chainSamples: ({ positions: ArrayLike<number>; count: number } | null)[];
  paintScene: { revealSpan(chain: number): [number, number] | readonly number[] };
}

/** True while today's look would draw a reveal mask (widthMulFor's `reveal`). */
export function gfRevealing(r: Pick<GfRevealSource, "revealOn" | "fxLive"> | null | undefined): boolean {
  return !!r && r.fxLive && r.revealOn;
}

// widthMulFor's swell window (reveal_fx.ts RAINBOW_SWELL_END).
const SWELL_END = PAINT_CONST.RAINBOW_HOLD + PAINT_CONST.RAINBOW_FADE * smoothInv(1 - PAINT_CONST.RAINBOW_SWELL_MIN_P);
const HIDDEN = 0;
const FULL = 1;
const KNOTS = 2;

/** A chain's knots: arcs, masks and widths (exact under linear interpolation). */
export function revealKnots(s: ArrayLike<number>, m: ArrayLike<number>, w: ArrayLike<number>, n: number, closed: boolean, out: number[]): void {
  out.length = 0;
  if (n <= 0) return;
  // the start and end duplicate runs of an open chain draw one point each
  let a = 0; let b = n - 1;
  if (!closed) {
    while (a + 1 < n && s[a + 1] === s[0]) a++;
    while (b - 1 > a && s[b - 1] === s[n - 1]) b--;
  }
  out.push(s[a], m[a], w[a]);
  for (let k = a + 1; k < b; k++) {
    const keep = m[k] !== m[k - 1] || m[k] !== m[k + 1] || w[k] !== w[k - 1] || w[k] !== w[k + 1] || s[k] === s[k - 1] || s[k] === s[k + 1];
    if (keep) out.push(s[k], m[k], w[k]);
  }
  if (b > a) out.push(s[b], m[b], w[b]);
}

/** The shader's lookup (rvM), in JS: the mask at arc s of a chain's knots (knots are (s, mask, width) triples). */
export function revealAt(K: ArrayLike<number>, k0: number, kn: number, ring: number, s: number): number {
  if (kn <= 0) return 0;
  if (ring > 0) s -= ring * Math.floor(s / ring);
  if (s <= K[3 * k0]) return K[3 * k0 + 1];
  const last = k0 + kn - 1;
  if (s >= K[3 * last]) return K[3 * last + 1];
  let a = 0; let b = kn - 1;
  while (b - a > 1) { const h = (a + b) >> 1; if (K[3 * (k0 + h)] <= s) a = h; else b = h; }
  const P = 3 * (k0 + a); const Q = 3 * (k0 + b);
  return K[Q] > K[P] ? K[P + 1] + (K[Q + 1] - K[P + 1]) * ((s - K[P]) / (K[Q] - K[P])) : K[Q + 1];
}

/** The width (mask x rainbow swell) at arc s of a chain's knots: the shader's rvM. */
export function revealWidthAt(K: ArrayLike<number>, k0: number, kn: number, ring: number, s: number): number {
  if (kn <= 0) return 0;
  if (ring > 0) s -= ring * Math.floor(s / ring);
  if (s <= K[3 * k0]) return K[3 * k0 + 2];
  const last = k0 + kn - 1;
  if (s >= K[3 * last]) return K[3 * last + 2];
  let a = 0; let b = kn - 1;
  while (b - a > 1) { const h = (a + b) >> 1; if (K[3 * (k0 + h)] <= s) a = h; else b = h; }
  const P = 3 * (k0 + a); const Q = 3 * (k0 + b);
  return K[Q] > K[P] ? K[P + 2] + (K[Q + 2] - K[P + 2]) * ((s - K[P]) / (K[Q] - K[P])) : K[Q + 2];
}

export class GfRevealTable {
  data = new Float32Array(GF_TW * 4);
  rows = 0;
  /** First corner texel (= the chain count). */
  oK = 0;
  /** Knots this frame and chains drawing knots (the probe's stats). */
  nKnots = 0;
  nActive = 0;
  ms = 0;
  private sArr = new Float64Array(0);
  private mArr = new Float64Array(0);
  private wArr = new Float64Array(0);
  private ign: KIgn = { hit: false, tA: 0, cFrom: 0, dir: 1, t0: 0, rate: 1, tEnd: 0, span: 0 };
  private knots: number[] = [];
  private all: number[] = [];
  private head: number[] = [];

  /** Rebuild from the renderer's state this frame, against the installed tables' corners. */
  build(r: GfRevealSource, T: Pick<GfTables, "nK" | "kCa" | "kCb" | "kSa" | "kSb">): void {
    const t0 = performance.now();
    const U = knotUniformValues();
    const D = r.kd;
    const t = U.uKFx[1];
    const nC = r.chainSamples.length;
    const head = this.head; head.length = 0;
    const all = this.all; all.length = 0;
    let active = 0;
    for (let ch = 0; ch < nC; ch++) {
      const samples = r.chainSamples[ch];
      const c = r.kcv[ch];
      const span = r.paintScene.revealSpan(ch);
      const tStart = span[0]; const tDone = span[1];
      // K1395: a mask-done chain whose rainbow swell still runs stays in knots (widthMulFor's swellHere)
      const swell = Math.round(U.uKFx[0]) === FX_STYLE.rainbow && U.uKFx[3] > 0.5;
      const swellHere = swell && t >= tStart && U.uKFx[2] < kWall(U, tDone) + SWELL_END;
      if (!samples || !c || (t >= tDone && !swellHere)) { head.push(FULL, 0, 0, 0); continue; }
      if (t < tStart) { head.push(HIDDEN, 0, 0, 0); continue; }
      const count = samples.count;
      if (this.sArr.length < count) { this.sArr = new Float64Array(count * 2); this.mArr = new Float64Array(count * 2); this.wArr = new Float64Array(count * 2); }
      const S = this.sArr; const M = this.mArr; const W = this.wArr;
      const P = samples.positions;
      // widthMulFor's walk: each sample's ctrl from this frame's arc table
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
        M[k] = kRevealMaskAt(D, U, c, ctrl);
        // widthMulFor's width: the mask times the rainbow swell at the sample's age
        let w = M[k];
        if (swell && w > 0) {
          const g = kIgnition(D, U, c, ctrl, this.ign);
          if (g.hit && t >= g.tA) w *= kSwell(kFxAge(U, g));
        }
        W[k] = w;
      }
      let ring = 0; let cnt = count;
      if (c.closed && count > 1) {
        // the closing segment back to sample 0, which carries sample 0's mask
        const dx = P[0] - P[2 * count - 2]; const dy = P[1] - P[2 * count - 1];
        ring = acc + Math.hypot(dx, dy);
        S[count] = ring; M[count] = M[0]; W[count] = W[0]; cnt = count + 1;
      }
      revealKnots(S, M, W, cnt, c.closed, this.knots);
      const k0 = all.length / 3;
      for (let i = 0; i < this.knots.length; i++) all.push(this.knots[i]);
      head.push(KNOTS, k0, this.knots.length / 3, ring);
      active++;
    }
    const nK = T.nK;
    const oN = nC + nK;
    const nN = all.length / 3;
    const texels = oN + nN;
    const rows = Math.max(1, Math.ceil(texels / GF_TW));
    if (this.data.length < rows * GF_TW * 4) this.data = new Float32Array(rows * GF_TW * 4);
    const d = this.data;
    for (let ch = 0; ch < nC; ch++) {
      const i = 4 * ch; const st = head[i];
      d[i] = st; d[i + 1] = st === KNOTS ? head[i + 1] + oN : 0; d[i + 2] = head[i + 2]; d[i + 3] = head[i + 3];
    }
    const mAt = (ch: number, s: number): number => {
      if (ch < 0 || ch >= nC) return 1;
      const st = head[4 * ch];
      if (st !== KNOTS) return st === FULL ? 1 : 0;
      return revealAt(all, head[4 * ch + 1], head[4 * ch + 2], head[4 * ch + 3], s);
    };
    for (let k = 0; k < nK; k++) {
      const i = 4 * (nC + k);
      const on = mAt(T.kCa[k], T.kSa[k]) >= 1 && mAt(T.kCb[k], T.kSb[k]) >= 1;
      d[i] = on ? 1 : 0; d[i + 1] = 0; d[i + 2] = 0; d[i + 3] = 0;
    }
    for (let q = 0; q < nN; q++) {
      const i = 4 * (oN + q);
      d[i] = all[3 * q]; d[i + 1] = all[3 * q + 1]; d[i + 2] = all[3 * q + 2]; d[i + 3] = 0;
    }
    this.rows = rows;
    this.oK = nC;
    this.nKnots = nN;
    this.nActive = active;
    this.ms = performance.now() - t0;
  }
}

const RV_FN = `
uniform highp sampler2D uRv; uniform int uORvK;
vec4 RV(int i) { return texelFetch(uRv, ivec2(i & TWM, i >> LOG), 0); }
// K1383 s1: the reveal WIDTH (mask x rainbow swell, K1395) at arc s of chain c (gf_reveal.ts revealWidthAt)
float rvM(int c, float s) {
  vec4 H = RV(c);
  if (H.x < 0.5) return 0.0;
  if (H.x < 1.5) return 1.0;
  int lo = int(H.y); int n = int(H.z);
  if (H.w > 0.0) s -= H.w * floor(s / H.w);
  vec4 P = RV(lo);
  if (s <= P.x) return P.z;
  vec4 Q = RV(lo + n - 1);
  if (s >= Q.x) return Q.z;
  int a = 0; int b = n - 1;
  for (int it = 0; it < 24; it++) { if (b - a <= 1) break; int h = (a + b) >> 1; if (RV(lo + h).x <= s) a = h; else b = h; }
  P = RV(lo + a); Q = RV(lo + b);
  return Q.x > P.x ? mix(P.z, Q.z, (s - P.x) / (Q.x - P.x)) : Q.z;
}
`;
const F_DEF = "vec4 F(int i) { return texelFetch(uD, ivec2(i & TWM, i >> LOG), 0); }\n";
const SEG = "float d = sqrt(d2); float s = A.z + u * (B.z - A.z); int k = v - cV0;";
const SEG_RV = "float d = sqrt(d2); float s = A.z + u * (B.z - A.z); float rvm = rvM(c, s); if (rvm <= 0.0) continue; d /= rvm; if (d >= uRc) continue; int k = v - cV0;";
const CORNER = /int k = int\(L4\(uOKL, q\)\);/g;

/** A gf program's reveal form (see the header); throws when an anchor is missing. */
export function revealForm(src: string): string {
  const nF = src.split(F_DEF).length - 1;
  const nS = src.split(SEG).length - 1;
  if (nF !== 1 || nS < 1) throw new Error(`gf reveal: anchors F ${nF}, scan ${nS}`);
  return src.replace(F_DEF, F_DEF + RV_FN).split(SEG).join(SEG_RV)
    .replace(CORNER, (m) => `${m} if (RV(uORvK + k).x < 0.5) continue;`);
}

