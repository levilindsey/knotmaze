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

import { FX_STYLE, PAINT_CONST } from "./paint_const";

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
  return r;
}

// GLSL twin: kCA - control i's arc (controlArcLengths, packed 4 per texel
// after the chain's G0 header texel).
export function kCA(D: KData, c: KChain, i: number): number {
  return D.geom[(c.geom + 1 + (i >> 2)) * 4 + (i & 3)];
}

// GLSL twin: kArcOfCtrl - the renderer's paintArcAt: closed chains wrap
// (arcAt), open chains clamp the slot (a ctrl below 0 extrapolates to a
// NEGATIVE arc, exactly as paintArcAt does).
export function kArcOfCtrl(D: KData, c: KChain, x: number): number {
  const n = c.nCtrl;
  if (c.closed) {
    const fl = Math.floor(x);
    const t = x - fl;
    const i0 = fl - n * Math.floor(fl / n);
    const i1 = i0 + 1 >= n ? 0 : i0 + 1;
    const a0 = kCA(D, c, i0);
    let a1 = kCA(D, c, i1);
    if (a1 <= a0) a1 += c.total;
    const a = a0 + (a1 - a0) * t;
    return a - c.total * Math.floor(a / c.total);
  }
  const i = Math.max(0, Math.min(n - 1, Math.floor(x)));
  const a0 = kCA(D, c, i);
  const a1 = i + 1 < n ? kCA(D, c, i + 1) : c.total;
  return Math.min(c.total, a0 + (a1 - a0) * (x - i));
}

// GLSL twin: kArcU - monotone UNWRAPPED arc of an unwrapped ctrl (closed
// rings add one total per lap; open chains = kArcOfCtrl).
export function kArcU(D: KData, c: KChain, x: number): number {
  return c.closed
    ? kArcOfCtrl(D, c, x) + c.total * Math.floor(x / c.nCtrl)
    : kArcOfCtrl(D, c, x);
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
  if (c.closed) s -= n * Math.floor(s / n);
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
  fxDone = 1e9
): number {
  const o = base * 4;
  geom[o] = total;
  geom[o + 1] = total / (closed ? count : Math.max(1, count - 1));
  geom[o + 2] = fxDone;
  geom[o + 3] = 0;
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
    if (t < r.tA) {
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

// Anim seconds the burn's HOT HEAD (BURN_HOT_ARC behind the tip) takes to
// clear a point: the arc at the local arc-per-ctrl over the source rate.
function hotTime(D: KData, c: KChain, g: KIgn, ctrl: number): number {
  const n = c.nCtrl;
  let sl = Math.floor(ctrl);
  if (c.closed) sl -= n * Math.floor(sl / n);
  else sl = Math.max(0, Math.min(n - 1, sl));
  const a0 = kCA(D, c, sl);
  let a1 = sl + 1 < n ? kCA(D, c, sl + 1) : c.total;
  if (c.closed && sl + 1 >= n) a1 = c.total;
  const apc = Math.max(1e-4, a1 - a0);
  return PAINT_CONST.BURN_HOT_ARC / (g.rate * apc);
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
  const tl = Math.min(g.tA + hotTime(D, c, g, ctrl), g.tEnd);
  return Math.max(0, U.uKFx[2] - kWall(U, tl));
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