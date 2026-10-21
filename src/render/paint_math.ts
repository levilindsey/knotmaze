// G2 SHADER PAINT - the CPU MIRROR. Pure TypeScript (no pixi): every
// function here is a line-for-line twin of a GLSL function in
// paint_glsl.ts (same name, a `// GLSL twin` note), reading the SAME
// Float32Array mirrors the shaders sample (the FloatRows .data arrays) and a
// plain object holding the SAME uniform values. It is the single reference
// for everything the CPU still needs to know about a pixel's color or
// visibility - marker colors, the reveal width masks (until G3), crossing
// and joint gate times, the pluck overlay's colors, probes, censuses and
// the vitest parity suites - generalizing the cpuJunctionField pattern.
//
// Precision: the GPU evaluates in fp32 from the same fp32 texel values; the
// mirror runs in f64. Censuses compare at <= 2/255.

import { FX_STYLE, ITEM_FLAG, PAINT_CONST, PAINT_ITEM, RUN_FLAG } from "./paint_const";
import {
  EXPLORE_CHAR_EDGE,
  EXPLORE_DOT_AT,
  EXPLORE_DOT_R,
  EXPLORE_DOTS_SPAN,
  EXPLORE_EMBER_AHEAD,
  EXPLORE_EMBER_BEHIND,
  EXPLORE_FRONT_BAND,
  EXPLORE_FRONT_FUSE,
  EXPLORE_FRONT_GONE,
  EXPLORE_ITEM_CHAR,
  EXPLORE_ITEM_FRONT,
  EXPLORE_ITEM_SMOLDER,
  EXPLORE_ITEM_VIS,
} from "./explore_glsl";
import { GAP_PROF_F0, GAP_PROF_MAX, GAP_PROF_R0 } from "./gap_mask";

const SHIFT = PAINT_CONST.K_ROW_SHIFT;

// The data texture mirrors (FloatRows .data) a mirror call reads.
export interface KData {
  stat: Float32Array; // KSTATIC: chains, ctrl index, runs.
  geom: Float32Array; // KGEOM: per-chain arc tables (per update()).
  reveal: Float32Array; // KREVEAL: reveal sources (per reveal start).
  paint: Float32Array; // KPAINT: per-run gameplay paint records.
}

// texelFetch twins: linear texel index -> RGBA at out (no allocation).
export function texel(d: Float32Array, i: number, c: number): number {
  return d[i * 4 + c];
}

// One chain's header (GLSL struct KChain): CHAINS texels C0 = (nCtrl,
// closed, sampleCount, idxBase), C1 = (geomBase, srcFirst, srcCount,
// paintBase), and KGEOM G0 = (total, arcPer, fxDone, -). fxDone = the wall
// time (reveal-relative) from which every appearance FX on the chain is
// the identity - its last ignition plus the style's settle tail - so the
// FX evaluation is skipped there with an identical result (1e9 = never).
export interface KChain {
  ch: number;
  nCtrl: number;
  closed: boolean;
  count: number;
  idx: number;
  geom: number;
  src0: number;
  srcN: number;
  total: number;
  arcPer: number;
  fxDone: number;
  paintOn: boolean; // KGEOM G0.w: the chain carries gameplay paint items.
}

// GLSL twin: kChain. `out` (optional) is filled in place - hot CPU loops
// keep one view per chain instead of allocating.
export function kChain(D: KData, ch: number, out?: KChain): KChain {
  const s = D.stat;
  const o = ch * 8;
  const geom = Math.round(s[o + 4]);
  const r = out ?? ({} as KChain);
  r.ch = ch;
  r.nCtrl = Math.round(s[o]);
  r.closed = s[o + 1] > 0.5;
  r.count = Math.round(s[o + 2]);
  r.idx = Math.round(s[o + 3]);
  r.geom = geom;
  r.src0 = Math.round(s[o + 5]);
  r.srcN = Math.round(s[o + 6]);
  r.total = D.geom[geom * 4];
  r.arcPer = D.geom[geom * 4 + 1];
  r.fxDone = D.geom[geom * 4 + 2];
  r.paintOn = D.geom[geom * 4 + 3] > 0.5;
  return r;
}

// GLSL twin: kCA - control i's arc (controlArcLengths, packed 4 per texel
// after the chain's G0 header texel).
export function kCA(D: KData, c: KChain, i: number): number {
  return D.geom[(c.geom + 1 + (i >> 2)) * 4 + (i & 3)];
}

// GLSL twin: kLapOf - floor(fl / n) EXACTLY for an integer-valued fl and
// n > 0 (K299). The GPU's float division is approximate (floor(28.0 / 28.0)
// came out 0 on an RX 6800 XT under ANGLE D3D11), so the shader corrects
// the quotient by one integer step. JS division is correctly rounded, so
// here the step never fires; `q` lets the tests pass the GPU's quotient.
export function kLapOf(fl: number, n: number, q = fl / n): number {
  const k = Math.floor(q);
  const r = fl - k * n;
  return r < 0 ? k - 1 : r >= n ? k + 1 : k;
}

// GLSL twin: kWrap - x wrapped into [0, m) for m > 0, whatever the
// division's rounding (K299; `q` as in kLapOf).
export function kWrap(x: number, m: number, q = x / m): number {
  let r = x - m * Math.floor(q);
  if (r < 0) r += m;
  if (r >= m) r -= m;
  return r;
}

// GLSL twin: kRingArc - a closed ring's arc of ctrl x within x's lap, in
// [0, total] (total only where the slot's fraction rounds to its end); the
// lap goes to kRingLap.
let kRingLap = 0;
export function kRingArc(D: KData, c: KChain, x: number): number {
  const n = c.nCtrl;
  const fl = Math.floor(x);
  kRingLap = kLapOf(fl, n);
  const i0 = fl - n * kRingLap;
  const a0 = kCA(D, c, i0);
  const a1 = i0 + 1 < n ? kCA(D, c, i0 + 1) : c.total;
  return a0 + (a1 - a0) * (x - fl);
}

// GLSL twin: kArcOfCtrl - the renderer's paintArcAt: closed chains wrap
// (arcAt), open chains clamp the slot (a ctrl below 0 extrapolates to a
// NEGATIVE arc, exactly as paintArcAt does).
export function kArcOfCtrl(D: KData, c: KChain, x: number): number {
  const n = c.nCtrl;
  if (c.closed) {
    const a = kRingArc(D, c, x);
    return a >= c.total ? a - c.total : a;
  }
  const i = Math.max(0, Math.min(n - 1, Math.floor(x)));
  const a0 = kCA(D, c, i);
  const a1 = i + 1 < n ? kCA(D, c, i + 1) : c.total;
  return Math.min(c.total, a0 + (a1 - a0) * (x - i));
}

// GLSL twin: kArcU - monotone UNWRAPPED arc of an unwrapped ctrl (closed
// rings add one total per lap; open chains = kArcOfCtrl).
export function kArcU(D: KData, c: KChain, x: number): number {
  if (!c.closed) return kArcOfCtrl(D, c, x);
  const a = kRingArc(D, c, x);
  return a + c.total * kRingLap;
}

// GLSL twin: kCtrlOfArc - the per-sample bake's arc -> ctrl map (largest
// slot whose arc <= a, then the clamped fraction), as a binary search.
export function kCtrlOfArc(D: KData, c: KChain, a: number): number {
  let lo = 0;
  let hi = c.nCtrl - 1;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if (kCA(D, c, m) <= a) lo = m;
    else hi = m - 1;
  }
  const a0 = kCA(D, c, lo);
  const a1 = lo < c.nCtrl - 1 ? kCA(D, c, lo + 1) : c.total;
  return lo + (a1 > a0 ? Math.min(1, (a - a0) / (a1 - a0)) : 0);
}

// GLSL twin: kCtrlNear - the exact ctrl at arc `a` from an APPROXIMATE
// ctrl (a fragment's interpolated vertex ctrl, off by a fraction of a slot
// where a control breakpoint falls inside a quad): step the slot until its
// arc span holds `a` (ring-aware), then the clamped fraction. Agrees with
// kCtrlOfArc wherever the walk converges (a handful of steps).
export function kCtrlNear(
  D: KData,
  c: KChain,
  a: number,
  approx: number
): number {
  const n = c.nCtrl;
  let s = Math.floor(approx);
  if (c.closed) s -= n * kLapOf(s, n);
  else s = Math.max(0, Math.min(n - 1, s));
  let a0 = 0;
  let a1 = 0;
  for (let it = 0; it < 6; it++) {
    a0 = kCA(D, c, s);
    a1 = s + 1 < n ? kCA(D, c, s + 1) : c.total;
    let d = a - a0;
    if (c.closed) d -= c.total * Math.floor(d / c.total + 0.5);
    if (d < 0) {
      if (!c.closed && s === 0) break;
      s = s === 0 ? n - 1 : s - 1;
    } else if (d >= a1 - a0) {
      if (!c.closed && s === n - 1) break;
      s = s + 1 === n ? 0 : s + 1;
    } else {
      break;
    }
  }
  let d = a - a0;
  if (c.closed) d -= c.total * Math.floor(d / c.total + 0.5);
  const t = a1 > a0 ? Math.max(0, Math.min(1, d / (a1 - a0))) : 0;
  return s + t;
}

// A sample's arc (uniform arc resampling: closed rings put sample k at
// k / count of the total, open runs at k / (count - 1)).
export function kSampleArc(c: KChain, k: number): number {
  return c.closed ? (k / c.count) * c.total : (k / (c.count - 1)) * c.total;
}

// Row/column of a linear texel index (the GLSL `ivec2(i & W-1, i >> S)`).
export function texelRowCol(i: number): [number, number] {
  return [i & ((1 << SHIFT) - 1), i >> SHIFT];
}

// ---- Layout WRITERS (pure; paint_model.ts and the tests share them) ----

export interface KChainLayout {
  nCtrl: number;
  closed: boolean;
  count: number;
  idxBase: number;
  geomBase: number;
  srcFirst: number;
  srcCount: number;
  // First texel of the chain in the junction field's PAINT texture (G2.1;
  // gone with that texture in G2.3).
  paintBase: number;
}

// CHAINS texels C0/C1 of chain `ch`.
export function writeChainHeader(
  stat: Float32Array,
  ch: number,
  L: KChainLayout
): void {
  const o = ch * 8;
  stat[o] = L.nCtrl;
  stat[o + 1] = L.closed ? 1 : 0;
  stat[o + 2] = L.count;
  stat[o + 3] = L.idxBase;
  stat[o + 4] = L.geomBase;
  stat[o + 5] = L.srcFirst;
  stat[o + 6] = L.srcCount;
  stat[o + 7] = L.paintBase;
}

// KGEOM: G0 = (total, arcPer, fxDone) + the control arcs packed 4 per
// texel. Returns the texel count written.
export function writeGeomTable(
  geom: Float32Array,
  base: number,
  total: number,
  count: number,
  closed: boolean,
  cal: ArrayLike<number>,
  fxDone = 1e9,
  paintOn = 0
): number {
  const o = base * 4;
  geom[o] = total;
  geom[o + 1] = total / (closed ? count : Math.max(1, count - 1));
  geom[o + 2] = fxDone;
  geom[o + 3] = paintOn;
  const n = cal.length;
  const a = o + 4;
  for (let i = 0; i < n; i++) geom[a + i] = cal[i];
  const padded = Math.ceil(n / 4) * 4;
  for (let i = n; i < padded; i++) geom[a + i] = 0;
  return 1 + Math.ceil(n / 4);
}

// ======================================================================
// G2.1 REVEAL + APPEARANCE FX (per pixel on the GPU; mirrored here for the
// width masks, gate times, markers and censuses).
//
// SRC (the KREVEAL texture): one source per 2 texels, sorted by cLo within
// each chain (C1.y = the chain's first, C1.z = its count):
//   S0 = (cLo, cHi, cFrom, dir)   - the ctrl range this PIECE covers, and
//                                   the front's origin in the piece's frame
//                                   (closed-ring sources are split at the
//                                   seam with cFrom shifted by whole laps,
//                                   so |ctrl - cFrom| stays the unwrapped
//                                   travel distance)
//   S1 = (t0, rate, tEnd, span)   - start (anim s), ctrl/s, finish, extent
// CTRLIDX (KSTATIC at C0.w + slot): (runId, srcHint, noiseV, inkTign) -
// srcHint = the first source touching [slot, slot + 1] (global index, -1 =
// none); inkTign = the ink ignition time (anim s) of the control.
// ======================================================================

// The uniform values a mirror call reads (the same Float32Arrays the
// knotUniforms group uploads).
export interface KUniforms {
  uKBase: Float32Array; // (runBase, -, debugView, paletteMode)
  uKFx: Float32Array; // (style, animT, fxNow, fxOn)
  uKFx2: Float32Array; // (phase13, phase29, revealOn, flTime)
  uKShape: Float32Array; // (taperArc, tipFloor, glowArc, glowHold)
  uKInk: Float32Array; // (inkSpeed, isInk, -, -)
  uKKnots: Float32Array; // 8 x (animT, wallT, invSpeed, valid)
  uKGamut: Float32Array; // (baseHue, arcDeg, sat, light)
  uKSect: Float32Array; // (blendDist, ease, glowLen, glowFade) the hover glow's (K298)
  uKPaint: Float32Array; // (on, refBase, itemBase, hover)
  uKPulse: Float32Array; // (travelIn, travelOut, spacing, fadeIn)
  uKReach: Float32Array; // (reach, fade, rim, rimAt) pulse trains (K75), hover glow (K145)
  uKGold: Float32Array; // (gold rgb, rimScale) rimScale: kRimScale (K111 stage 4)
  // K76 thread reveal (on, look, breath, threadWidth): read only by the
  // explore program (explore_glsl.ts); absent = the mode is off.
  uKExplore?: Float32Array;
}

export const MAX_KNOTS = 8;

// One reveal source, before layout.
export interface KSource {
  chain: number;
  cFrom: number;
  cTo: number;
  t0: number;
  rate: number;
}

// Split / shift one chain's sources into layout pieces: closed rings
// normalize each source's unwrapped range into [0, n) and split at the
// seam (cFrom shifted by the same laps); open chains clamp to [0, n - 1].
// Sorted by cLo. Pure (tests share it).
export function sourcePieces(
  srcs: KSource[],
  n: number,
  closed: boolean
): Array<{
  cLo: number;
  cHi: number;
  cFrom: number;
  dir: number;
  t0: number;
  rate: number;
  tEnd: number;
  span: number;
}> {
  const out: ReturnType<typeof sourcePieces> = [];
  for (const s of srcs) {
    const span = Math.abs(s.cTo - s.cFrom);
    if (!(span > 1e-9) || !(s.rate > 0)) continue;
    const dir = s.cTo >= s.cFrom ? 1 : -1;
    const tEnd = s.t0 + span / s.rate;
    let lo = Math.min(s.cFrom, s.cTo);
    let hi = Math.max(s.cFrom, s.cTo);
    if (!closed) {
      lo = Math.max(0, lo);
      hi = Math.min(n - 1, hi);
      if (hi > lo) out.push({ cLo: lo, cHi: hi, cFrom: s.cFrom, dir, t0: s.t0, rate: s.rate, tEnd, span });
      continue;
    }
    const lap = Math.floor(lo / n);
    let from = s.cFrom - lap * n;
    lo -= lap * n;
    hi -= lap * n;
    // At most one full lap per source (fronts never wrap a whole ring).
    while (hi > lo + 1e-12) {
      const pHi = Math.min(hi, n);
      out.push({ cLo: lo, cHi: pHi, cFrom: from, dir, t0: s.t0, rate: s.rate, tEnd, span });
      // A piece reaching the seam exactly also covers ctrl 0 (== n): a
      // zero-length companion there, so the seam point sees this front too
      // (a wrap run ending at the seam - revealMaskFor's interval covered it).
      if (hi >= n - 1e-9 && hi <= n + 1e-9) {
        out.push({ cLo: 0, cHi: 0, cFrom: from - n, dir, t0: s.t0, rate: s.rate, tEnd, span });
      }
      lo = 0;
      hi -= n;
      from -= n;
    }
  }
  out.sort((a, b) => a.cLo - b.cLo || a.cHi - b.cHi);
  return out;
}

// The ignition of a material point (GLSL twin: kIgnition).
export interface KIgn {
  hit: boolean;
  tA: number; // Anim time the front reaches it.
  cFrom: number;
  dir: number;
  t0: number;
  rate: number;
  tEnd: number;
  span: number;
}

const SRC_SCAN = 4;

// GLSL twin: kIgnition - the earliest-arriving source covering ctrl (ink:
// the control ignition times, interpolated). `out` (optional) is reused.
export function kIgnition(
  D: KData,
  U: KUniforms,
  c: KChain,
  ctrl: number,
  out?: KIgn
): KIgn {
  const r = out ?? ({} as KIgn);
  r.hit = false;
  r.tA = 1e9;
  r.cFrom = 0;
  r.dir = 1;
  r.t0 = 0;
  r.rate = 1;
  r.tEnd = 0;
  r.span = 0;
  const n = c.nCtrl;
  const sl = Math.max(0, Math.min(n - 1, Math.floor(ctrl)));
  const io = (c.idx + sl) * 4;
  if (U.uKInk[1] > 0.5) {
    const j = c.closed ? (sl + 1 === n ? 0 : sl + 1) : Math.min(sl + 1, n - 1);
    const a = D.stat[io + 3];
    const b = D.stat[(c.idx + j) * 4 + 3];
    r.hit = true;
    r.tA = a + (b - a) * (ctrl - sl);
    return r;
  }
  // The slot's hint: its first touching source + (count - 1) / 8.
  const hint = D.stat[io + 1];
  if (hint < -0.5) return r;
  const s0 = Math.floor(hint);
  const cnt = Math.round((hint - s0) * 8) + 1;
  const R = D.reveal;
  for (let k = 0; k < SRC_SCAN; k++) {
    if (k >= cnt) break;
    const s = s0 + k;
    if (s >= c.src0 + c.srcN) break;
    const A = 2 * s * 4;
    const cLo = R[A];
    const cHi = R[A + 1];
    if (ctrl < cLo - 1e-4 || ctrl > cHi + 1e-4) continue;
    const cFrom = R[A + 2];
    const t0 = R[A + 4];
    const rate = R[A + 5];
    const t = t0 + Math.abs(ctrl - cFrom) / rate;
    // NEAR-TIES go to the first source scanned (|dt| < 1e-4 s): at a
    // junction several fronts start at once with different speeds and hot
    // heads, and the GPU's f32 ctrl must not flip the choice (the joint-web
    // census caught exactly that). Invisible elsewhere: ties only occur
    // within ~1e-3 ctrl of a junction or a meeting point.
    if (t < r.tA - 1e-4) {
      r.hit = true;
      r.tA = t;
      r.cFrom = cFrom;
      r.dir = R[A + 3];
      r.t0 = t0;
      r.rate = rate;
      r.tEnd = R[A + 6];
      r.span = R[A + 7];
    }
  }
  return r;
}

// GLSL twin: kWall - anim time -> reveal-relative wall time through the
// speed knots (knot 0 always valid; a FLOOR knot (invSpeed 0, wall -1e4)
// stands for collapsed history that is long since fully cooled).
export function kWall(U: KUniforms, tA: number): number {
  const K = U.uKKnots;
  let a = K[0];
  let w = K[1];
  let inv = K[2];
  for (let i = 1; i < MAX_KNOTS; i++) {
    const o = i * 4;
    if (K[o + 3] < 0.5 || K[o] > tA) break;
    a = K[o];
    w = K[o + 1];
    inv = K[o + 2];
  }
  return w + (tA - a) * inv;
}

const smooth01 = (x: number): number => {
  const c = x < 0 ? 0 : x > 1 ? 1 : x;
  return c * c * (3 - 2 * c);
};

// The inverse of smooth01 on [0, 1] (gate times).
export function smoothInv(y: number): number {
  const c = y < 0 ? 0 : y > 1 ? 1 : y;
  return 0.5 - Math.sin(Math.asin(1 - 2 * c) / 3);
}

// GLSL twin: knotRevealMask - the reveal WIDTH multiplier at a material
// point (revealMaskFor per sample). `ctrl` is the point's ctrl; for
// interval modes the earliest source decides (sources covering one point
// meet there at one time - a run's two fronts at cMeet, a junction's
// starting fronts at the joint).
export function knotRevealMask(
  D: KData,
  U: KUniforms,
  c: KChain,
  g: KIgn,
  ctrl: number
): number {
  if (U.uKFx2[2] < 0.5) return 1;
  const t = U.uKFx[1];
  if (!g.hit || t < g.tA) return 0;
  if (U.uKInk[1] > 0.5) {
    return Math.max(0, Math.min(1, ((t - g.tA) * U.uKInk[0]) / PAINT_CONST.INK_TAPER_WORLD));
  }
  const prog = (t - g.t0) * g.rate;
  if (prog >= g.span - 1e-9) return 1;
  const dIn = g.dir * (kArcU(D, c, g.cFrom + g.dir * prog) - kArcU(D, c, ctrl));
  let m = Math.min(1, dIn / U.uKShape[0]);
  const tf = U.uKShape[1];
  if (tf > 0 && m < 1) m = tf + (1 - tf) * m;
  return Math.max(0, m);
}

// GLSL twin: kHeadLeave - the anim time the burn's HOT HEAD (BURN_HOT_ARC
// of arc behind the front's tip) leaves a point: when the tip reaches the
// point's arc + BURN_HOT_ARC in its direction (the arc table inverted by a
// short walk), clamped to [arrival, the source's finish]. Continuous along
// the chain - the first form divided the head's arc by the point's own
// slot's arc per ctrl, which stepped at every slot boundary (the joint-web
// census caught GPU and CPU on different sides of such a step).
export function kHeadLeave(D: KData, c: KChain, g: KIgn, ctrl: number): number {
  const aU = kArcU(D, c, ctrl) + g.dir * PAINT_CONST.BURN_HOT_ARC;
  let ch: number;
  if (c.closed) {
    const n = c.nCtrl;
    const lap = Math.floor(aU / c.total);
    const seed = lap > 0 ? 0 : lap < 0 ? n - 1 : ctrl - n * Math.floor(ctrl / n);
    ch = kCtrlOfArcNear(D, c, aU - lap * c.total, seed) + lap * n;
  } else {
    ch = kCtrlOfArcNear(D, c, Math.max(0, Math.min(c.total, aU)), ctrl);
  }
  const t = g.t0 + (g.dir * (ch - g.cFrom)) / g.rate;
  return Math.max(g.tA, Math.min(g.tEnd, t));
}

// GLSL twin: kBurnAge - wall seconds since the hot head left the point
// (0 inside the head; a finished front's head dies at its finish).
export function kBurnAge(
  D: KData,
  U: KUniforms,
  c: KChain,
  g: KIgn,
  ctrl: number
): number {
  return Math.max(0, U.uKFx[2] - kWall(U, kHeadLeave(D, c, g, ctrl)));
}

// GLSL twin: kFxAge - wall seconds since the front reached the point.
export function kFxAge(U: KUniforms, g: KIgn): number {
  return U.uKFx[2] - kWall(U, g.tA);
}

// GLSL twin: kRainbowP - rainbow progress (1 = just appeared -> 0).
export function kRainbowP(age: number): number {
  const end = PAINT_CONST.RAINBOW_HOLD + PAINT_CONST.RAINBOW_FADE;
  return age >= end ? 0 : 1 - smooth01((age - PAINT_CONST.RAINBOW_HOLD) / PAINT_CONST.RAINBOW_FADE);
}

// GLSL twin: kMaterialize - dust/comet alpha (style 3 dust, 2 comet).
export function kMaterialize(age: number, style: number): number {
  const end = style === 3 ? PAINT_CONST.DUST_FADE_IN : PAINT_CONST.COMET_FADE_IN;
  return age >= end ? 1 : smooth01(age / end);
}

// GLSL twin: kBurn - the burn/roots cooling envelope applied to a color
// (in place on out[0..2]). k = the continuous sample index (the flicker's
// spatial phase), roots = the brown tint instead of fire.
export function kBurn(
  U: KUniforms,
  rgb: Float32Array | number[],
  t: number,
  k: number,
  roots: boolean
): void {
  const C = PAINT_CONST;
  if (t >= C.BURN_RECOVER_END) return;
  if (roots) {
    const brown = 1 - smooth01((t - C.ROOTS_START) / C.ROOTS_FADE);
    if (brown > 0.004) {
      rgb[0] += (0.35 - rgb[0]) * brown;
      rgb[1] += (0.25 - rgb[1]) * brown;
      rgb[2] += (0.18 - rgb[2]) * brown;
    }
    return;
  }
  const heatW = 1 - smooth01((t - 0.015) / 0.05);
  const heatY = smooth01(t / 0.02) * (1 - smooth01((t - 0.1) / 0.12));
  const ember = smooth01(t / 0.08) * (1 - smooth01((t - C.BURN_EMBER_END) / 0.25));
  const char =
    smooth01((t - C.BURN_EMBER_END * 0.55) / 0.25) *
    (1 - smooth01((t - C.BURN_CHAR_END) / (C.BURN_RECOVER_END - C.BURN_CHAR_END)));
  let r = rgb[0];
  let g = rgb[1];
  let b = rgb[2];
  r += (0.14 - r) * char * 0.92;
  g += (0.11 - g) * char * 0.92;
  b += (0.1 - b) * char * 0.92;
  if (ember > 0.01) {
    const spatial = 1 - char;
    const fl =
      0.5 +
      spatial * (0.3 * Math.sin(U.uKFx2[0] + k * 0.31) + 0.2 * Math.sin(U.uKFx2[1] + k * 0.83)) +
      (1 - spatial) * U.uKFx2[3];
    const e = ember * 0.85 * (1 - heatW * 0.7);
    r += (1.0 - 0.3 * fl - r) * e;
    g += (0.54 - 0.35 * fl - g) * e;
    b += (0.16 - 0.08 * fl - b) * e;
  }
  if (heatY > 0.001) {
    r += (1.0 - r) * heatY;
    g += (0.84 - g) * heatY;
    b += (0.3 - b) * heatY;
  }
  if (heatW > 0.001) {
    r += (1.0 - r) * heatW;
    g += (0.97 - g) * heatW;
    b += (0.88 - b) * heatW;
  }
  rgb[0] = r;
  rgb[1] = g;
  rgb[2] = b;
}

// The FX weight at an age (the old per-sample aFx: (0, 1] rainbow
// progress, [-1, 0) materialize transparency, 0 inert) - fans and gates.
export function kFxWeight(style: number, age: number): number {
  if (style === 1) return kRainbowP(age);
  if (style === 2 || style === 3) return kMaterialize(age, style) - 1;
  return 0;
}

// How settled a thread looks at an FX weight (1 = normal): fans fade in as
// their least-settled arm settles (GLSL twin: kFxSolid).
export function kFxSolid(w: number): number {
  if (w < 0) return 1 + w;
  if (w > 0) return 1 - smooth01((w - 0.06) / 0.34);
  return 1;
}

// GLSL twin: kFanAlpha - a fan's alpha from its solidity (invisible below
// FAN_SOLID_START, smoothstepping to opaque).
export function kFanAlpha(solid: number): number {
  const a = smooth01((solid - PAINT_CONST.FAN_SOLID_START) / (1 - PAINT_CONST.FAN_SOLID_START));
  return a >= 0.999 ? 1 : a;
}

// GLSL twin: knotFanAlpha - the joint gate: invisible before tOn, then the
// FX solidity of its latest-ignited arm (tLast, wall).
export function knotFanAlpha(U: KUniforms, tOn: number, tLast: number): number {
  const now = U.uKFx[2];
  if (now < tOn) return 0;
  return kFanAlpha(kFxSolid(kFxWeight(Math.round(U.uKFx[0]), now - tLast)));
}

// GLSL twin: kGateRamp - a crossing's gap strength ramp after tShow.
export function kGateRamp(U: KUniforms, tShow: number): number {
  return smooth01((U.uKFx[2] - tShow) / PAINT_CONST.CROSSING_FADE_IN);
}

// ---- Gate TIMES (CPU only; the GPU animates from them) -----------------

// Ctrl at an UNWRAPPED arc (closed rings: lap-aware; open: clamped).
export function kCtrlOfArcU(D: KData, c: KChain, aU: number): number {
  if (!c.closed) return kCtrlOfArc(D, c, Math.max(0, Math.min(c.total, aU)));
  const lap = Math.floor(aU / c.total);
  return kCtrlOfArc(D, c, aU - lap * c.total) + lap * c.nCtrl;
}

// Anim time a material point's reveal mask reaches REVEAL_CROSSING_MIN
// (+Infinity before any ignition is planned: `fallback`, the plan end).
export function kRevealTime(
  D: KData,
  U: KUniforms,
  c: KChain,
  g: KIgn,
  ctrl: number,
  fallback: number
): number {
  if (!g.hit) return fallback;
  const need = PAINT_CONST.REVEAL_CROSSING_MIN;
  if (U.uKInk[1] > 0.5) {
    return g.tA + (need * PAINT_CONST.INK_TAPER_WORLD) / U.uKInk[0];
  }
  const tf = U.uKShape[1];
  const q = tf >= need ? 0 : (need - tf) / (1 - tf);
  const d98 = U.uKShape[0] * q;
  const c98 = kCtrlOfArcU(D, c, kArcU(D, c, ctrl) + g.dir * d98);
  const t98 = g.t0 + (g.dir * (c98 - g.cFrom)) / g.rate;
  return Math.min(Math.max(t98, g.tA), g.tEnd);
}

// Wall time a point's appearance FX has settled enough for a crossing gap
// through it (rainbow: progress <= RAINBOW_SWELL_MIN_P - also the end of
// its width swell; dust/comet: alpha >= 1 - FX_SOLID_EPS); -Infinity for
// styles that never gate.
export function kFxSettleWall(U: KUniforms, g: KIgn): number {
  const st = Math.round(U.uKFx[0]);
  if (!g.hit) return -Infinity;
  const C = PAINT_CONST;
  let after: number;
  if (st === 1) after = C.RAINBOW_HOLD + C.RAINBOW_FADE * smoothInv(1 - C.RAINBOW_SWELL_MIN_P);
  else if (st === 3) after = C.DUST_FADE_IN * smoothInv(1 - C.FX_SOLID_EPS);
  else if (st === 2) after = C.COMET_FADE_IN * smoothInv(1 - C.FX_SOLID_EPS);
  else return -Infinity;
  return kWall(U, g.tA) + after;
}

// RAINBOW SWELL width multiplier at an age (1 = normal; the outer side of
// the ribbon grows up to 1 + RAINBOW_SWELL while the stripes are fresh).
export function kSwell(age: number): number {
  const p = kRainbowP(age);
  const C = PAINT_CONST;
  const x = smooth01((p - C.RAINBOW_SWELL_MIN_P) / (1 - C.RAINBOW_SWELL_MIN_P));
  return 1 + C.RAINBOW_SWELL * x;
}

// GLSL twin: kFxTail - wall seconds after a point's ignition by which its
// appearance FX is the identity (rainbow p = 0, materialize alpha = 1,
// burn / roots recovered), plus a margin that keeps the shaders' f32
// comparisons on the identity side.
export function kFxTail(st: number): number {
  const C = PAINT_CONST;
  const t =
    st === FX_STYLE.rainbow
      ? C.RAINBOW_HOLD + C.RAINBOW_FADE
      : st === FX_STYLE.comet
        ? C.COMET_FADE_IN
        : st === FX_STYLE.dust
          ? C.DUST_FADE_IN
          : C.BURN_RECOVER_END;
  return t + 0.02;
}

// A chain's FX SETTLE time (KChain.fxDone, KGEOM G0.z): the wall time from
// which every appearance FX on a chain whose sources all finish by anim
// time tDone is the identity. Every point's FX age is at least fxNow -
// kWall(tDone) (burn's hot head never outlives its source's finish), so
// past the style's settle tail kFxColor changes nothing. 1e9 = never skip.
// (The same bound per control slot: CTRLIDX .w, kFxColor.)
export function kFxDoneWall(U: KUniforms, tDone: number): number {
  const st = Math.round(U.uKFx[0]);
  if (!Number.isFinite(tDone) || st === FX_STYLE.none) return 1e9;
  return kWall(U, tDone) + kFxTail(st);
}

// GLSL twin: kFxColor - FX on a material color at a ribbon point (burn /
// roots tint in place on rgb; rainbow progress and materialize alpha into
// out). Points ahead of the front: materializing styles transparent.
export function kFxColor(
  D: KData,
  U: KUniforms,
  c: KChain,
  ctrl: number,
  kSample: number,
  rgb: Float32Array | number[],
  out: { pRain: number; alpha: number }
): void {
  out.pRain = 0;
  out.alpha = 1;
  const st = Math.round(U.uKFx[0]);
  if (U.uKFx[3] < 0.5 || st === 0 || U.uKFx[2] >= c.fxDone) return;
  // A SETTLED SLOT: every source the slot's points can ignite from has
  // finished more than the style's tail ago (CTRLIDX .w = the latest such
  // finish, interval mode) - the FX is the identity there.
  if (U.uKInk[1] < 0.5) {
    const sl = Math.max(0, Math.min(c.nCtrl - 1, Math.floor(ctrl)));
    if (U.uKFx[2] >= kWall(U, D.stat[(c.idx + sl) * 4 + 3]) + kFxTail(st)) return;
  }
  const g = kIgnition(D, U, c, ctrl);
  if (!g.hit || U.uKFx[1] < g.tA) {
    if (st === 2 || st === 3) out.alpha = 0;
    return;
  }
  if (st === 4 || st === 5) {
    kBurn(U, rgb, kBurnAge(D, U, c, g, ctrl), kSample, st === 5);
    return;
  }
  const age = kFxAge(U, g);
  if (st === 1) out.pRain = kRainbowP(age);
  else out.alpha = kMaterialize(age, st);
}

export type KPiece = ReturnType<typeof sourcePieces>[number];

// Pack every chain's pieces into the SRC texel layout (2 texels each,
// chains in order). Returns the data and each chain's first index/count.
export function layoutSources(per: KPiece[][]): {
  data: Float32Array;
  first: Int32Array;
  count: Int32Array;
} {
  let total = 0;
  for (const p of per) total += p.length;
  const data = new Float32Array(Math.max(1, total) * 8);
  const first = new Int32Array(per.length);
  const count = new Int32Array(per.length);
  let s = 0;
  per.forEach((pieces, ch) => {
    first[ch] = s;
    count[ch] = pieces.length;
    for (const p of pieces) {
      const o = s * 8;
      data[o] = p.cLo;
      data[o + 1] = p.cHi;
      data[o + 2] = p.cFrom;
      data[o + 3] = p.dir;
      data[o + 4] = p.t0;
      data[o + 5] = p.rate;
      data[o + 6] = p.tEnd;
      data[o + 7] = p.span;
      s++;
    }
  });
  return { data, first, count };
}

// Per control slot: the first piece (global index) touching [slot,
// slot + 1], -1 = none. `overflow` counts slots touched by a piece beyond
// the shader's scan window (hint .. hint + 3) - must stay 0.
// Per control slot (CTRLIDX): the scan hint = the first source touching
// the slot + (number to scan - 1) / 8 (-1 = none), and the slot's LATEST
// FINISH (anim) over the sources kIgnition can pick there (1e9 = none: the
// settled-slot skip never fires). "Touching" uses kIgnition's own 1e-4
// range tolerance, so every source it can accept for a point of the slot
// is inside the scan and inside the finish bound.
export function sourceHints(
  pieces: KPiece[],
  first: number,
  nCtrl: number
): { hints: Float64Array; tLate: Float64Array; overflow: number } {
  const hints = new Float64Array(nCtrl).fill(-1);
  const tLate = new Float64Array(nCtrl).fill(1e9);
  let overflow = 0;
  for (let s = 0; s < nCtrl; s++) {
    let h = -1;
    let last = -1;
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      if (p.cHi < s - 1e-4 || p.cLo > s + 1 + 1e-4) continue;
      if (h < 0) h = i;
      last = i;
    }
    if (h >= 0) {
      if (last - h >= SRC_SCAN) overflow++;
      const end = Math.min(last, h + SRC_SCAN - 1);
      hints[s] = first + h + (end - h) / 8;
      let t = -Infinity;
      for (let i = h; i <= end; i++) {
        const p = pieces[i];
        if (p.cHi < s - 1e-4 || p.cLo > s + 1 + 1e-4) continue;
        t = Math.max(t, p.tEnd);
      }
      tLate[s] = t;
    }
  }
  return { hints, tLate, overflow };
}

const RAINBOW_STRIPES = [
  [0.92, 0.15, 0.18],
  [1.0, 0.55, 0.08],
  [1.0, 0.88, 0.12],
  [0.12, 0.78, 0.3],
  [0.15, 0.42, 1.0],
  [0.58, 0.25, 0.95],
];
// GLSL smoothstep(e0, e1, x).
function smoothstepGl(e0: number, e1: number, x: number): number {
  return smooth01((x - e0) / (e1 - e0));
}

// GLSL twin: kRainbowBlend (in place on rgb).
export function kRainbowBlend(
  rgb: Float32Array | number[],
  pIn: number,
  side: number
): void {
  const p = Math.min(pIn, 1);
  const bi = Math.floor(Math.min(side, 0.99999) * 6);
  const s = RAINBOW_STRIPES[bi];
  const rb = smoothstepGl(0.3, 0.52, p);
  const wh = smoothstepGl(0.06, 0.26, p) * (1 - smoothstepGl(0.38, 0.6, p));
  for (let i = 0; i < 3; i++) {
    const v = rgb[i] + (s[i] - rgb[i]) * rb;
    rgb[i] = v + ([0.93, 0.93, 0.95][i] - v) * wh * 0.6;
  }
}

// The ribbon section shader's color at a material point, before the
// gameplay accent (G2.1 census reference): the FX on S (in place), then the
// rainbow stripes across the side; returns the materialize alpha.
export function kShadeFx(
  D: KData,
  U: KUniforms,
  c: KChain,
  ctrl: number,
  kSample: number,
  side: number,
  rgb: Float32Array | number[]
): number {
  const out = { pRain: 0, alpha: 1 };
  kFxColor(D, U, c, ctrl, kSample, rgb, out);
  if (out.pRain > 0) kRainbowBlend(rgb, out.pRain, side);
  return out.alpha;
}

// Scratch for kRevealMaskAt (single-threaded, not reentrant).
const MASK_IGN: KIgn = { hit: false, tA: 0, cFrom: 0, dir: 1, t0: 0, rate: 1, tEnd: 0, span: 0 };

// The reveal WIDTH mask at a point as the CPU computes it for the ribbon
// geometry: the MAX over every covering source (revealMaskFor's union of
// intervals), not just the earliest-arriving one - they differ only where
// two fronts touch one point (a junction's starting fronts at different
// rates). Ink: the interpolated control ignition. (No GPU twin: the mask is
// geometry, CPU until G3.)
export function kRevealMaskAt(
  D: KData,
  U: KUniforms,
  c: KChain,
  ctrl: number
): number {
  if (U.uKFx2[2] < 0.5) return 1;
  if (U.uKInk[1] > 0.5) {
    return knotRevealMask(D, U, c, kIgnition(D, U, c, ctrl, MASK_IGN), ctrl);
  }
  const n = c.nCtrl;
  const sl = Math.max(0, Math.min(n - 1, Math.floor(ctrl)));
  const hint = D.stat[(c.idx + sl) * 4 + 1];
  if (hint < -0.5) return 0;
  const R = D.reveal;
  const t = U.uKFx[1];
  let best = 0;
  for (let k = 0; k < SRC_SCAN; k++) {
    const s = Math.round(hint) + k;
    if (s >= c.src0 + c.srcN) break;
    const A = 2 * s * 4;
    if (ctrl < R[A] - 1e-4 || ctrl > R[A + 1] + 1e-4) continue;
    const g = MASK_IGN;
    g.hit = true;
    g.tA = R[A + 4] + Math.abs(ctrl - R[A + 2]) / R[A + 5];
    g.cFrom = R[A + 2];
    g.dir = R[A + 3];
    g.t0 = R[A + 4];
    g.rate = R[A + 5];
    g.tEnd = R[A + 6];
    g.span = R[A + 7];
    if (t < g.tA) continue;
    const m = knotRevealMask(D, U, c, g, ctrl);
    if (m > best) best = m;
    if (best >= 1) break;
  }
  return best;
}
// ======================================================================
// G2.2 SECTION COLORS (the ribbon vertex shader evaluates them per vertex,
// the fans per pixel through the ribbon's own Gouraud; mirrored here for
// markers, the junction-field probe and the censuses).
//
// RUNS (KSTATIC at uKBase.x, 4 texels per run; core/section_colors
// RunSection):
//   R0 = (ctrlA, ctrlB, r0A, r0B)   unwrapped span + base ramp lengths
//   R1 = (colA, flags)              A-end color (RGB, or a gamut coordinate
//   R2 = (colMid, perLattice)       in .x under RF_GAMUT), RUN_FLAG bits;
//   R3 = (colB, -)                  own color, ctrl per lattice unit; B end
// CTRLIDX.x = the slot's run, .z = the slot's noise coordinate (NOISE runs).
// uKGamut = (baseHue, arcDeg, sat, light); uKSect = (blendDist, ease, ...),
// its .zw the hover glow's length and end fade (K298, kPaintAt's RIM).
// ======================================================================

// GLSL twin: kHsl (core/section_colors hslToRgb).
function kHsl(h: number, s: number, l: number, out: Float32Array | number[]): void {
  const a = s * Math.min(l, 1 - l);
  for (let i = 0; i < 3; i++) {
    const n = i === 0 ? 0 : i === 1 ? 8 : 4;
    const x = n + h / 30;
    const k = x - 12 * Math.floor(x / 12);
    out[i] = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  }
}

// GLSL twin: kGamut - gamut coordinate -> RGB (core gamutRgb).
export function kGamut(U: KUniforms, v: number, out: Float32Array | number[]): void {
  const G = U.uKGamut;
  const x = G[0] + (v - 0.5) * G[1];
  kHsl(x - 360 * Math.floor(x / 360), G[2], G[3], out);
}

// GLSL twin: kEase - the junctionBlend ease (core easeAt).
function kEase(U: KUniforms, u: number): number {
  return u + (u * u * (3 - 2 * u) - u) * U.uKSect[1];
}

// GLSL twin: knotSection - the section color at a chain ctrl (the slot's
// run, evaluated exactly; core evalRunSection). Into out[0..2].
export function knotSection(
  D: KData,
  U: KUniforms,
  c: KChain,
  ctrl: number,
  out: Float32Array | number[]
): void {
  const S = D.stat;
  const n = c.nCtrl;
  const sl = Math.max(0, Math.min(n - 1, Math.floor(ctrl)));
  const io = (c.idx + sl) * 4;
  const b = (Math.round(U.uKBase[0]) + 4 * Math.round(S[io])) * 4;
  const fl = Math.round(S[b + 7]);
  if (fl & RUN_FLAG.NOISE) {
    const j = c.closed ? (sl + 1 === n ? 0 : sl + 1) : Math.min(sl + 1, n - 1);
    const z0 = S[io + 2];
    kGamut(U, z0 + (S[(c.idx + j) * 4 + 2] - z0) * (ctrl - sl), out);
    return;
  }
  const cA = S[b];
  const cB = S[b + 1];
  const cu = c.closed && ctrl < cA - 1e-4 ? ctrl + n : ctrl;
  let w = 0; // Blend weight toward the far color (0 = colMid).
  let far = b + 12; // R3 (colB) or R1 (colA).
  if (fl & RUN_FLAG.SWEEP) {
    const t = Math.max(0, Math.min(1, (cu - cA) / Math.max(cB - cA, 1e-6)));
    const v = S[b + 4] + (S[b + 12] - S[b + 4]) * t;
    if (fl & RUN_FLAG.GAMUT) {
      kGamut(U, v, out);
    } else {
      out[0] = v;
      out[1] = 0;
      out[2] = 0;
    }
    return;
  }
  const sp = cB - cA;
  const extra = U.uKSect[0] * S[b + 11];
  const ra = fl & RUN_FLAG.RAMP_A ? Math.min(0.5 * sp, S[b + 2] + extra) : 0;
  const rb = fl & RUN_FLAG.RAMP_B ? Math.min(0.5 * sp, S[b + 3] + extra) : 0;
  const da = cu - cA;
  const db = cB - cu;
  if (ra > 0 && da < ra) {
    w = 1 - kEase(U, Math.max(0, Math.min(1, da / ra)));
    far = b + 4;
  } else if (rb > 0 && db < rb) {
    w = 1 - kEase(U, Math.max(0, Math.min(1, db / rb)));
    far = b + 12;
  }
  // mix(colFar, colMid, e) = colMid + (colFar - colMid) * (1 - e).
  const m = b + 8;
  const r = S[m] + (S[far] - S[m]) * w;
  if (fl & RUN_FLAG.GAMUT) {
    kGamut(U, r, out);
    return;
  }
  out[0] = r;
  out[1] = S[m + 1] + (S[far + 1] - S[m + 1]) * w;
  out[2] = S[m + 2] + (S[far + 2] - S[m + 2]) * w;
}

// GLSL twin: kCtrlOfArcNear - kCtrlOfArc's exact answer (the largest slot
// whose arc is <= a) by a short walk from a nearby ctrl, falling back to
// the binary search when the walk would be long.
export function kCtrlOfArcNear(D: KData, c: KChain, a: number, seed: number): number {
  const n = c.nCtrl;
  let s = Math.max(0, Math.min(n - 1, Math.floor(seed)));
  let ok = false;
  for (let it = 0; it < 8; it++) {
    if (s < n - 1 && kCA(D, c, s + 1) <= a) {
      s++;
      continue;
    }
    if (s > 0 && kCA(D, c, s) > a) {
      s--;
      continue;
    }
    ok = true;
    break;
  }
  if (!ok) return kCtrlOfArc(D, c, a);
  const a0 = kCA(D, c, s);
  const a1 = s < n - 1 ? kCA(D, c, s + 1) : c.total;
  return s + (a1 > a0 ? Math.min(1, (a - a0) / (a1 - a0)) : 0);
}

// Sample bracketing of an arc - the ribbon's own Gouraud (closed rings
// wrap, open runs clamp): [k0, k1, fraction, normalized arc].
export function kSampleBracket(c: KChain, a: number, out: number[]): void {
  const total = c.total;
  const count = c.count;
  if (!(total > 0) || count < 2) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    return;
  }
  if (c.closed) {
    const an = kWrap(a, total);
    const f = (an / total) * count;
    const fl = Math.floor(f);
    out[0] = fl % count;
    out[1] = (out[0] + 1) % count;
    out[2] = f - fl;
    out[3] = an;
  } else {
    const an = Math.max(0, Math.min(total, a));
    const f = (an / total) * (count - 1);
    const fl = Math.floor(f);
    out[0] = Math.min(fl, count - 1);
    out[1] = Math.min(count - 1, out[0] + 1);
    out[2] = f - fl;
    out[3] = an;
  }
}

const SEC_A = new Float32Array(3);
const SEC_B = new Float32Array(3);
const SEC_K = [0, 0, 0, 0];

// GLSL twin: kSectionAtArc - the RIBBON's section color at an arc: the
// section at the two bracketing samples' ctrls (exactly what the vertex
// shader evaluates there), lerped. `seed` = a ctrl near the arc (< 0: none).
// Returns the first sample's ctrl (a seed for nearby queries).
export function kSectionAtArc(
  D: KData,
  U: KUniforms,
  c: KChain,
  a: number,
  seed: number,
  out: Float32Array | number[]
): number {
  if (!(c.total > 0) || c.count < 2) {
    knotSection(D, U, c, 0, out);
    return 0;
  }
  kSampleBracket(c, a, SEC_K);
  const k0 = SEC_K[0];
  const k1 = SEC_K[1];
  const fr = SEC_K[2];
  const c0 = seed >= 0 ? kCtrlOfArcNear(D, c, k0 * c.arcPer, seed) : kCtrlOfArc(D, c, k0 * c.arcPer);
  const c1 = k1 === 0 ? kCtrlOfArc(D, c, 0) : kCtrlOfArcNear(D, c, k1 * c.arcPer, c0);
  knotSection(D, U, c, c0, SEC_A);
  knotSection(D, U, c, c1, SEC_B);
  for (let i = 0; i < 3; i++) out[i] = SEC_A[i] + (SEC_B[i] - SEC_A[i]) * fr;
  return c0;
}

// RUNS layout writer: run r at texels base + 4r .. + 3 (see above).
export function writeRunTexels(
  stat: Float32Array,
  base: number,
  r: number,
  run: {
    ctrlA: number;
    ctrlB: number;
    r0A: number;
    r0B: number;
    perLattice: number;
    flags: number;
    colA: ArrayLike<number>;
    colMid: ArrayLike<number>;
    colB: ArrayLike<number>;
  }
): void {
  const o = (base + 4 * r) * 4;
  stat[o] = run.ctrlA;
  stat[o + 1] = run.ctrlB;
  stat[o + 2] = run.r0A;
  stat[o + 3] = run.r0B;
  stat[o + 4] = run.colA[0];
  stat[o + 5] = run.colA[1];
  stat[o + 6] = run.colA[2];
  stat[o + 7] = run.flags;
  stat[o + 8] = run.colMid[0];
  stat[o + 9] = run.colMid[1];
  stat[o + 10] = run.colMid[2];
  stat[o + 11] = run.perLattice;
  stat[o + 12] = run.colB[0];
  stat[o + 13] = run.colB[1];
  stat[o + 14] = run.colB[2];
  stat[o + 15] = 0;
}

// ======================================================================
// G2.3 GAMEPLAY PAINT (per pixel on the GPU; mirrored here for the fans'
// CPU field, the pluck overlay and the censuses).
//
// The renderer's paint DECLARATION (traveled spans, junction caps, pulse
// arms - core of RibbonRenderer.setPaint) becomes KPAINT records:
//   per control slot, at the chain's idxBase (KSTATIC's offsets):
//                                (refFirst, refCount, -, -)
//   REFS from uKPaint.y:         item indices, 4 per texel - each slot's
//                                items in declaration order
//   ITEMS from uKPaint.z:        2 texels each
//     T0 = (type, cA, cB, p0)    SPAN  ctrl cA..cB (unwrapped, cB >= cA),
//                                      gold p0 at cA .. p1 at cB
//                                CAP   cA = ctrl, p0 = gold p
//                                PULSE cA = junction ctrl, cB = far ctrl
//     T1 = (p1, flags, radius, -)       radius: CAP (arc); flags: PULSE
// Evaluation follows the retired per-sample pass's PAINT U semantics
// (spans assign in order, caps never darken, pulses override) and the
// accent strip it sampled is replaced by a closed form: the gold ramp
// mix(S, gold, p) is the thread's own paint - the K4 trail fade: LINEAR in
// p (the strip compressed it into clamp(6p - 2.5)) - and a pulse band or
// the reveal glow brightens THAT color: mix(paint, white, K_BAND v). The
// strip's two bands (S -> white, gold -> white, chosen per pulse arm) are
// its p = 0 and p = 1 cases; K75 retired the per-arm choice, which drew
// gold crest bands over a fading trail. Span / cap edges get a 1-pixel
// coverage ramp (`px`, world arc per pixel; 0 = hard).
// Uniforms: uKPaint = (on, refBase, itemBase, hover), hover = the hover
// breath 0.5 + 0.3 sin(clock W); uKPulse = (travelIn, travelOut, spacing,
// fadeIn), travel reduced mod spacing on the CPU; uKReach = (reach, fade,
// rim, rimAt), the trains' reach window in world arc from the junction
// (K75: the pulseReach param; a train used to run its whole arm), then the
// hover glow's strength and its hover point, an unwrapped ctrl on the RIM
// item's run (K145); uKGold = (gold rgb, rimScale), rimScale the hover
// glow's width as kRimScale gives it (K111 stage 4); uKSect.zw = the hover
// glow's own length along the thread and its end fade (K298: it rode the
// trains' reach and RIM_END_FADE before).
// ======================================================================

// The retired strip's gold-ramp U (ordering only - the caps' never-darken
// comparison follows the old pass exactly): base 115 .. gold 121 (1/256).
function goldUOf(p: number): number {
  return p >= 1 ? 121 / 256 : p <= 0 ? 115 / 256 : (115 + 6 * p) / 256;
}

// GLSL twin: kReachWin - the pulse trains' reach window (K75): full
// strength out to reach - fade from the junction, smoothly gone at reach.
export function kReachWin(U: KUniforms, d: number): number {
  const f = Math.max(U.uKReach[1], 1e-4);
  return 1 - smooth01((d - (U.uKReach[0] - f)) / f);
}

// GLSL twin: kPulseV - the pulse field at distance d along an arm of length
// span (RibbonRenderer's pulseValueAt with its clocks as uniforms), inside
// the reach window. Hover lights the run a tap would take out to the same
// reach, fading over its end as the trains do (K93; Levi: "hover should
// stop at pulseReach (and fade-out toward the end, same as pulseReach)").
// K480 stage 2: a branched arm carries dist0 (arc from the head to its
// junction) and cont (the light carries past its far end); phase, floor
// and the reach window read dist0 + d, and a cont arm has no end fade.
export function kPulseV(
  U: KUniforms,
  d: number,
  span: number,
  inward: boolean,
  hovered: boolean,
  dist0 = 0,
  cont = false
): number {
  const C = PAINT_CONST;
  if (d < 0 || d > span) return 0;
  const dG = dist0 + d;
  const endWin = cont ? 1 : Math.min(1, Math.max(0, (span - d) / C.PULSE_END_WINDOW));
  if (hovered) return endWin * U.uKPaint[3] * kReachWin(U, dG);
  const s = U.uKPulse[2];
  const raw = inward ? dG + U.uKPulse[0] : dG - U.uKPulse[1];
  const ph = raw - s * Math.floor(raw / s);
  const dist = Math.min(ph, s - ph);
  const dC = Math.max(0, dG - (ph <= s - ph ? ph : ph - s));
  const bump = Math.max(0, 1 - dist / C.CREST_WIDTH) * Math.min(1, dC / C.CREST_RAMP);
  const floor =
    (C.PULSE_FLOOR + C.PULSE_CORE_BOOST * Math.max(0, 1 - dG / C.PULSE_CORE_RADIUS)) *
    Math.max(0, 1 - dG / C.PULSE_FLOOR_REACH);
  return Math.min(1, (floor + bump * 0.9) * endWin) * U.uKPulse[3] * kReachWin(U, dG);
}

// Paint state at a point: the gold ramp amount p (the thread's own paint),
// whether a pulse band brightens it, with strength v, and the hover glow
// along the thread (K145; kRimAcross shapes it across the ribbon).
export interface KPaintState {
  p: number;
  band: boolean;
  v: number;
  rim: number;
}

// The hover glow's width (the hoverGlowWidth param, in half-widths) as the
// scale uKGold.w carries (K111 stage 4): RIM_EDGE / width, exactly 1 at the
// default. A width at or below 0 reads as the default; the floor keeps the
// scale finite.
export function kRimScale(width: number): number {
  const w = width > 0 ? Math.min(1, Math.max(0.05, width)) : PAINT_CONST.RIM_EDGE;
  return PAINT_CONST.RIM_EDGE / w;
}

// GLSL twin: kRimAcross - the hover glow across the ribbon (K145, K111
// stage 3; side = the ribbon's vUV.y, the edges at 0 and 1): 1 at either
// edge, fading out smoothly to 0 at the glow's width in from it (K111
// stage 4: scale = uKGold.w, kRimScale(width)).
export function kRimAcross(side: number, scale: number): number {
  const e = Math.abs(2 * side - 1);
  return 1 - smooth01(((1 - e) / PAINT_CONST.RIM_EDGE) * scale);
}

// Ring distance on a closed chain (|a - b| folded), plain on open ones.
function ringDist(a: number, b: number, total: number, closed: boolean): number {
  let d = Math.abs(a - b);
  if (closed) d = Math.min(d, total - d);
  return d;
}

// Coverage of an inside distance over a pixel footprint px (0 = hard).
function kCov(sd: number, px: number): number {
  if (!(px > 0)) return sd >= 0 ? 1 : 0;
  const x = sd / px + 0.5;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

// GLSL twin: kPaintAt - the declaration's paint at (ctrl, arc) of chain c.
export function kPaintAt(
  D: KData,
  U: KUniforms,
  c: KChain,
  ctrl: number,
  arc: number,
  px: number,
  out: KPaintState
): KPaintState {
  out.p = 0;
  out.band = false;
  out.v = 0;
  out.rim = 0;
  if (U.uKPaint[0] < 0.5) return out;
  const P = D.paint;
  const n = c.nCtrl;
  const sl = Math.max(0, Math.min(n - 1, Math.floor(ctrl)));
  const io = (c.idx + sl) * 4;
  const first = Math.round(P[io]);
  const cnt = Math.round(P[io + 1]);
  const total = c.total;
  const refBase = Math.round(U.uKPaint[1]);
  const itemBase = Math.round(U.uKPaint[2]);
  for (let k = 0; k < cnt; k++) {
    const r = first + k;
    const item = Math.round(P[(refBase + (r >> 2)) * 4 + (r & 3)]);
    const o = (itemBase + 2 * item) * 4;
    const type = Math.round(P[o]);
    const cA = P[o + 1];
    const cB = P[o + 2];
    if (type === PAINT_ITEM.SPAN) {
      const a0 = kArcOfCtrl(D, c, cA);
      const a1 = kArcOfCtrl(D, c, cB);
      const wraps = c.closed && a1 <= a0 && cB > cA;
      const inside = wraps ? arc >= a0 || arc <= a1 : arc >= a0 && arc <= a1;
      const dEdge = Math.min(ringDist(arc, a0, total, c.closed), ringDist(arc, a1, total, c.closed));
      const cov = kCov(inside ? dEdge : -dEdge, px);
      if (cov <= 0) continue;
      const p0 = P[o + 3];
      const p1 = P[o + 4];
      let p = 1;
      if (p0 < 1 || p1 < 1) {
        const spanLen = Math.max(wraps ? total - a0 + a1 : a1 - a0, 1e-9);
        const da = wraps && arc < a0 ? total - a0 + arc : arc - a0;
        const t = Math.min(1, Math.max(0, da / spanLen));
        p = p0 + (p1 - p0) * t;
      }
      out.p += (p - out.p) * cov;
    } else if (type === PAINT_ITEM.CAP) {
      const pc = P[o + 3];
      if (!(goldUOf(pc) > goldUOf(out.p))) continue;
      const d = ringDist(arc, kArcOfCtrl(D, c, cA), total, c.closed);
      const cov = kCov(P[o + 6] - d, px);
      if (cov <= 0) continue;
      out.p += (pc - out.p) * cov;
    } else if (type === PAINT_ITEM.PULSE) {
      const flags = Math.round(P[o + 5]);
      const aJ = kArcOfCtrl(D, c, cA);
      const aF = kArcOfCtrl(D, c, cB);
      let dirPos: boolean;
      let span: number;
      if (c.closed) {
        // Unwrapped (K299): a run that goes once around has span = total.
        dirPos = cB > cA;
        const uJ = kArcU(D, c, cA);
        const uF = kArcU(D, c, cB);
        span = dirPos ? uF - uJ : uJ - uF;
      } else {
        dirPos = aF >= aJ;
        span = Math.abs(aF - aJ);
      }
      if (span <= 1e-6) continue;
      let d: number;
      if (c.closed) {
        d = kWrap(dirPos ? arc - aJ : aJ - arc, total);
      } else {
        d = dirPos ? arc - aJ : aJ - arc;
      }
      const v = kPulseV(U, d, span, (flags & ITEM_FLAG.INWARD) !== 0, (flags & ITEM_FLAG.HOVER) !== 0, P[o + 3], P[o + 6] > 0.5);
      if (v > PAINT_CONST.PULSE_MIN_V) {
        out.band = true;
        out.v = v;
      }
    } else if (type === PAINT_ITEM.RIM) {
      // K145, the hover glow: T0 = (RIM, c0, c1, gap) - the run's unwrapped
      // ctrl span and the stretch at each end it keeps clear of (the
      // junction web's reach). The hover point (an unwrapped ctrl in the
      // span) and the strength are uniforms (uKReach.w, .z): a pointer
      // moving along one run rewrites no texel. Along the thread the glow
      // falls off to 0 at its own length from the hover point (uKSect.z,
      // hoverGlowLength, K298), and it fades in from each end gap over the
      // end fade (uKSect.w, hoverGlowFade, K298; RIM_END_FADE before), or
      // over RIM_END_SHARE of the stretch between the gap and the run's
      // middle where that is shorter.
      const u0 = kArcU(D, c, cA);
      const u1 = kArcU(D, c, cB);
      let u = arc;
      if (c.closed) u = u0 + kWrap(arc - u0, total);
      if (u < u0 || u > u1) continue;
      const d = Math.abs(u - kArcU(D, c, U.uKReach[3]));
      const dEnd = Math.min(u - u0, u1 - u);
      const fade = Math.min(
        Math.max(U.uKSect[3], 1e-4),
        Math.max(1e-4, PAINT_CONST.RIM_END_SHARE * (0.5 * (u1 - u0) - P[o + 3])),
      );
      const g =
        U.uKReach[2] *
        (1 - smooth01(d / Math.max(U.uKSect[2], 1e-4))) *
        smooth01((dEnd - P[o + 3]) / fade);
      if (g > out.rim) out.rim = g;
    }
  }
  return out;
}

// K76 THREAD REVEAL: a point's visibility and the frontier fade it lies in
// (kExploreAt's globals: tip = progress 0 -> 1 through the fade, -1 when
// none; solid = the ctrl where the fade starts, end = the ctrl where it ends
// (K397) and x = the point's ctrl, all unwrapped toward the piece).
export interface KExploreState {
  v: number;
  tip: number;
  solid: number;
  end: number;
  x: number;
}

// GLSL twin: kExploreAt (explore_glsl.ts) - the VIS items of the point's
// control slot, or 1 on a whole chain (KPAINT texel `chain` .x).
export function kExploreAt(
  D: KData,
  U: KUniforms,
  c: KChain,
  ctrl: number,
  out: KExploreState
): KExploreState {
  out.v = 0;
  out.tip = -1;
  out.solid = 0;
  out.end = 0;
  out.x = ctrl;
  const P = D.paint;
  if (P[c.ch * 4] > 0.5) {
    out.v = 1;
    return out;
  }
  const n = c.nCtrl;
  const sl = Math.max(0, Math.min(n - 1, Math.floor(ctrl)));
  const io = (c.idx + sl) * 4;
  const first = Math.round(P[io]);
  const cnt = Math.min(32, Math.round(P[io + 1]));
  const refBase = Math.round(U.uKPaint[1]);
  const itemBase = Math.round(U.uKPaint[2]);
  let best = 0;
  for (let k = 0; k < cnt; k++) {
    const r = first + k;
    const item = Math.round(P[(refBase + (r >> 2)) * 4 + (r & 3)]);
    const o = (itemBase + 2 * item) * 4;
    if (Math.round(P[o]) !== EXPLORE_ITEM_VIS) continue;
    const c0 = P[o + 1];
    const c1 = P[o + 2];
    const f0 = P[o + 3];
    const f1 = P[o + 4];
    const tips = Math.round(P[o + 5]);
    let x = ctrl;
    if (c.closed) x += n * Math.floor((0.5 * (c0 + c1) - x) / n + 0.5);
    let v = 1;
    let u = -1;
    let cs = 0;
    let ce = 0;
    if (x < c0 - 1e-3) {
      if (f0 <= 1e-4) continue;
      const t = Math.min(1, (c0 - x) / f0);
      v = 1 - t * t * (3 - 2 * t);
      if ((tips & 1) !== 0) {
        u = t;
        cs = c0;
        ce = c0 - f0;
      }
    } else if (x > c1 + 1e-3) {
      if (f1 <= 1e-4) continue;
      const t = Math.min(1, (x - c1) / f1);
      v = 1 - t * t * (3 - 2 * t);
      if ((tips & 2) !== 0) {
        u = t;
        cs = c1;
        ce = c1 + f1;
      }
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
  return out;
}

// K410: the burn's globals beside kCharAt's return (kFireEmber, kFireSmolder).
export interface KFireState {
  ember: number;
  smolder: number;
}

// GLSL twin: kCharAt (explore_glsl.ts; K290 stages 3a and 3b, K409's world
// widths and shapes) - how charred a chain point is (the CHAR items and each
// FRONT's band, summed, at most 1), and in `out` the ember (the max over the
// FRONT items) and the smolder (the max over the SMOLDER items). Only a
// chain whose KPAINT flag .y is set scans.
export function kCharAtCpu(
  D: KData,
  U: KUniforms,
  c: KChain,
  ctrl: number,
  out: KFireState
): number {
  out.ember = 0;
  out.smolder = 0;
  const P = D.paint;
  if (P[c.ch * 4 + 1] < 0.5) return 0;
  const n = c.nCtrl;
  const sl = Math.max(0, Math.min(n - 1, Math.floor(ctrl)));
  const io = (c.idx + sl) * 4;
  const first = Math.round(P[io]);
  const cnt = Math.min(32, Math.round(P[io + 1]));
  const refBase = Math.round(U.uKPaint[1]);
  const itemBase = Math.round(U.uKPaint[2]);
  const inv = 1 / EXPLORE_CHAR_EDGE;
  const ramp = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
  let sum = 0;
  for (let k = 0; k < cnt; k++) {
    const r = first + k;
    const item = Math.round(P[(refBase + (r >> 2)) * 4 + (r & 3)]);
    const o = (itemBase + 2 * item) * 4;
    const ty = Math.round(P[o]);
    if (ty === EXPLORE_ITEM_FRONT) {
      const fc = P[o + 1];
      const dir = P[o + 2];
      const shape = P[o + 3];
      let x = ctrl;
      if (c.closed) x += n * Math.floor((fc - x) / n + 0.5);
      // s > 0 on the unburnt side (ctrl), w the same in world arc.
      const s = (x - fc) * dir;
      const w = (kArcU(D, c, x) - kArcU(D, c, fc)) * dir;
      if (Math.abs(shape - EXPLORE_FRONT_FUSE) > 0.5) {
        sum += (1 - smoothstepGl(0, EXPLORE_FRONT_BAND, w)) * ramp(s * inv + 0.5);
      }
      const ahead =
        shape > EXPLORE_FRONT_GONE - 0.5
          ? EXPLORE_EMBER_AHEAD + EXPLORE_EMBER_BEHIND
          : EXPLORE_EMBER_AHEAD;
      const e =
        w >= 0
          ? 1 - smoothstepGl(0, ahead, w)
          : 1 - smoothstepGl(0, EXPLORE_EMBER_BEHIND, -w);
      if (e > out.ember) out.ember = e;
      continue;
    }
    if (ty !== EXPLORE_ITEM_CHAR && ty !== EXPLORE_ITEM_SMOLDER) continue;
    const c0 = P[o + 1];
    const c1 = P[o + 2];
    let x = ctrl;
    if (c.closed) x += n * Math.floor((0.5 * (c0 + c1) - x) / n + 0.5);
    const cr = ramp((x - c0) * inv + 0.5) * ramp((c1 - x) * inv + 0.5);
    if (ty === EXPLORE_ITEM_CHAR) sum += cr;
    else if (cr > out.smolder) out.smolder = cr;
  }
  return Math.min(sum, 1);
}

// GLSL twin: kExDotsSd (explore_glsl.ts, K397) - the signed world distance
// from a point of a frontier fade (s along from the solid end, la across, lf
// the fade's world length) to the nearest of the dots look's cap (half an
// ellipse, 0.5 tw across, 0.5 tw g along) and its two dots (at EXPLORE_DOT_AT
// of the fade, radii EXPLORE_DOT_R tw g), g = min(1, lf / (EXPLORE_DOTS_SPAN
// tw)). `out.dot` is kExDot: 1 where the nearest shape is a dot.
export function kExDotsSdCpu(
  s: number,
  la: number,
  lf: number,
  tw: number,
  out?: { dot: number }
): number {
  const g0 = lf / (EXPLORE_DOTS_SPAN * tw);
  const g = g0 < 1e-3 ? 1e-3 : g0 > 1 ? 1 : g0;
  const ca = 0.5 * tw * g;
  const cb = 0.5 * tw;
  const k0 = Math.sqrt((s / ca) * (s / ca) + (la / cb) * (la / cb));
  const k1 = Math.sqrt((s / (ca * ca)) * (s / (ca * ca)) + (la / (cb * cb)) * (la / (cb * cb)));
  const dCap = k1 > 1e-6 ? (k0 * (k0 - 1)) / k1 : -ca;
  const x0 = s - EXPLORE_DOT_AT[0] * lf;
  const x1 = s - EXPLORE_DOT_AT[1] * lf;
  const dDot = Math.min(
    Math.sqrt(x0 * x0 + la * la) - EXPLORE_DOT_R[0] * tw * g,
    Math.sqrt(x1 * x1 + la * la) - EXPLORE_DOT_R[1] * tw * g
  );
  if (out) out.dot = dDot < dCap ? 1 : 0;
  return Math.min(dCap, dDot);
}

// GLSL twin: kExploreLook (explore_glsl.ts) - the end look's coverage at a
// point of a frontier fade (u = progress through it, < 0 outside one; s =
// world arc from the solid end; lf = the fade's world arc length (K397);
// lat = vUV.y - 0.5; sideFw = vUV.y per pixel; tw = uKExplore.w). The fade
// and halo looks, and every look outside a frontier, return v. K76 stage
// 2d: `hc` is High contrast (uKExplore.x 2), under which the dots draw at
// full strength; `out.dot` is the GLSL's kExDot (1 where the point's
// nearest shape is a dot, which the thread's main paints pure white; 0 on
// the cap and in every other look).
export function kExploreLookCpu(
  look: number,
  v: number,
  u: number,
  s: number,
  lf: number,
  lat: number,
  sideFw: number,
  pxW: number,
  tw: number,
  hc = false,
  out?: { dot: number }
): number {
  if (out) out.dot = 0;
  if (u < 0 || look < 2) return v;
  if (look === 2) return 1 - smooth01((u - 0.4) / 0.6);
  if (look === 4) {
    const fl = lat * 2;
    let cov = 0;
    for (let i = -1; i <= 1; i++) {
      const cf = i * (0.5 + 0.3 * u) + 0.12 * u * Math.sin(s * 7 + i * 2.1);
      const wf = 0.34 + (0.1 - 0.34) * u;
      const c = (wf - Math.abs(fl - cf)) / Math.max(4 * sideFw, 1e-4) + 0.5;
      cov = Math.max(cov, c < 0 ? 0 : c > 1 ? 1 : c);
    }
    const g = smooth01(u / 0.12);
    cov = 1 + (cov - 1) * g;
    return cov * (1 - smooth01((u - 0.5) / 0.5));
  }
  const dd = kExDotsSdCpu(s, lat * tw, lf, tw, out);
  const c = -dd / pxW + 0.5;
  return (c < 0 ? 0 : c > 1 ? 1 : c) * (hc ? 1 : 1 - 0.55 * u * u);
}

// GLSL twin: exploreCutCover (explore_glsl.ts, K268) - the over thread's
// coverage at arc A of a shaped slot's frame, from its 12 profile floats
// (P0, P1 = the ramps [aS, F, dK, tK], P2 = [strength, flags, 0, 0]). `hc`:
// High contrast (K76 stage 2d; the dots cut at full strength). K397: `lat` is
// the point's world distance from the over centerline; in the dots and
// beacon looks a frontier fade (and past its end) returns only the look's
// strength and sets `out.on` (kExCutOn) and `out.sd` (kExCutSd, the dots'
// signed distance there, which gapKeepAt's casing is measured from).
export function exploreCutCoverCpu(
  prof: ArrayLike<number>,
  A: number,
  look: number,
  tw: number,
  pxW: number,
  hc = false,
  lat = 0,
  out?: { on: boolean; sd: number }
): number {
  if (out) {
    out.on = false;
    out.sd = 0;
  }
  const dots = look === 3 || look === 5;
  const fl = Math.round(prof[9]);
  const mx = (fl & GAP_PROF_MAX) !== 0;
  let best = mx ? -1 : 2;
  let bu = -1;
  let bs = 0;
  let bf = 0;
  for (let r = 0; r < 2; r++) {
    if ((fl & (GAP_PROF_R0 << r)) === 0) continue;
    const aS = prof[r * 4];
    const F = prof[r * 4 + 1];
    const dK = prof[r * 4 + 2];
    const tK = prof[r * 4 + 3];
    const d = (A - aS) / F;
    let v = 1;
    let u = -1;
    if (d > 0) {
      let t = d < dK ? d * (tK / dK) : tK + (d - dK) * ((1 - tK) / Math.max(1 - dK, 1e-6));
      t = Math.min(t, 1);
      v = 1 - t * t * (3 - 2 * t);
      if ((t < 1 || dots) && (fl & (GAP_PROF_F0 << r)) !== 0) u = t;
    }
    if (mx ? v > best || (v === best && u < 0) : v < best) {
      best = v;
      bu = u;
      bs = Math.abs(A - aS);
      bf = Math.abs(F);
    }
  }
  if (best > 1) return 1;
  if (best < 0) return 0;
  if (dots && bu >= 0) {
    const sd = kExDotsSdCpu(bs, lat, bf, tw);
    if (out) {
      out.on = true;
      out.sd = sd;
    }
    return hc ? 1 : 1 - 0.55 * bu * bu;
  }
  return kExploreLookCpu(look, best, bu, bs, bf, 0, pxW / Math.max(tw, 1e-6), pxW, tw, hc);
}

// GLSL twin: kGlow - the reveal frontier glow at a point (interval modes,
// not burn / roots): the fronts that revealed the point and still move,
// strongest within REVEAL / RAINBOW_GLOW_ARC behind their tips (full over
// glowHold). The retired pass glowed every revealed sample near ANY tip of
// its chain; per pixel, only the point's own fronts are scanned (they are
// the nearest tips except where another front approaches the same run).
export function kGlow(D: KData, U: KUniforms, c: KChain, ctrl: number): number {
  if (U.uKBase[3] < 0.5 || U.uKFx2[2] < 0.5 || U.uKInk[1] > 0.5) return 0;
  const st = Math.round(U.uKFx[0]);
  if (st === FX_STYLE.burn || st === FX_STYLE.roots) return 0;
  const t = U.uKFx[1];
  const n = c.nCtrl;
  const sl = Math.max(0, Math.min(n - 1, Math.floor(ctrl)));
  const hint = D.stat[(c.idx + sl) * 4 + 1];
  if (hint < -0.5) return 0;
  const s0 = Math.floor(hint);
  const cnt = Math.round((hint - s0) * 8) + 1;
  const R = D.reveal;
  const glowArc = U.uKShape[2];
  const hold = U.uKShape[3];
  const aU = kArcU(D, c, ctrl);
  let g = 0;
  for (let k = 0; k < SRC_SCAN; k++) {
    if (k >= cnt) break;
    const s = s0 + k;
    if (s >= c.src0 + c.srcN) break;
    const A = 2 * s * 4;
    if (ctrl < R[A] - 1e-4 || ctrl > R[A + 1] + 1e-4) continue;
    const cFrom = R[A + 2];
    const dir = R[A + 3];
    const t0 = R[A + 4];
    const rate = R[A + 5];
    const prog = (t - t0) * rate;
    if (prog <= 0 || prog >= R[A + 7]) continue; // Not started, or landed.
    const tA = t0 + Math.abs(ctrl - cFrom) / rate;
    if (t < tA) continue; // The tip has not reached the point.
    const d = Math.abs(kArcU(D, c, cFrom + dir * prog) - aU);
    if (d > glowArc) continue;
    const gi = d <= hold ? 1 : 1 - (d - hold) / (glowArc - hold);
    if (gi > g) g = gi;
  }
  return g;
}

// GLSL twin: kComposePaint - the painted color over section S (in place):
// the gold ramp gives the thread's own paint color, then the pulse band or
// the reveal glow (the stronger) brightens that color toward white.
export function kComposePaint(U: KUniforms, S: Float32Array | number[], st: KPaintState, glow: number): void {
  const G = U.uKGold;
  const p = Math.max(0, Math.min(1, st.p));
  const v = Math.max(st.band ? st.v : 0, glow);
  const w = PAINT_CONST.K_BAND * Math.max(0, Math.min(1, v));
  for (let i = 0; i < 3; i++) {
    const under = S[i] + (G[i] - S[i]) * p;
    S[i] = under + (1 - under) * w;
  }
}

// GLSL twin: kRimOver - the hover glow over a painted color (K298, in
// place): the band's whitening, applied after the paint, so a hovered
// choice shows both. Over a color whitened by nothing it is exactly
// kComposePaint's whitening.
export function kRimOver(S: Float32Array | number[], rim: number): void {
  const w = PAINT_CONST.K_BAND * Math.max(0, Math.min(1, rim));
  for (let i = 0; i < 3; i++) S[i] = S[i] + (1 - S[i]) * w;
}

const PAINT_TMP: KPaintState = { p: 0, band: false, v: 0, rim: 0 };

// The ribbon shader's full color at a material point (section S in place,
// FX, then the paint): what a probe vertex there renders, before the
// coverage alpha (returned). Census reference for G2.3. The hover glow
// (K145) shapes its along-thread strength across the ribbon at `side` and
// whitens OVER the composed paint (K298; it joined the reveal glow's max
// before, which hid it under a hovered choice's band); only the ribbons
// draw it (the arm strips and the pluck overlay have no across
// coordinate, and the glow is gone before the junction webs).
export function kShadeAll(
  D: KData,
  U: KUniforms,
  c: KChain,
  ctrl: number,
  arc: number,
  side: number,
  px: number,
  S: Float32Array | number[]
): number {
  const a = kShadeFx(D, U, c, ctrl, arc / c.arcPer, side, S);
  const st = kPaintAt(D, U, c, ctrl, arc, px, PAINT_TMP);
  const rim = st.rim > 0 ? st.rim * kRimAcross(side, U.uKGold[3]) : 0;
  kComposePaint(U, S, st, kGlow(D, U, c, ctrl));
  if (rim > 0) kRimOver(S, rim);
  return a;
}