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

import { PAINT_CONST } from "./paint_const";

const SHIFT = PAINT_CONST.K_ROW_SHIFT;

// The data texture mirrors (FloatRows .data) a mirror call reads.
export interface KData {
  stat: Float32Array; // KSTATIC: chains, ctrl index, runs, sources.
  geom: Float32Array; // KGEOM: per-chain arc tables (per update()).
  paint: Float32Array; // KPAINT: per-run gameplay paint records.
}

// texelFetch twins: linear texel index -> RGBA at out (no allocation).
export function texel(d: Float32Array, i: number, c: number): number {
  return d[i * 4 + c];
}

// One chain's header (GLSL struct KChain): CHAINS texels C0 = (nCtrl,
// closed, sampleCount, idxBase), C1 = (geomBase, srcFirst, srcCount, -),
// and KGEOM G0 = (total, arcPer, -, -).
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
}

// GLSL twin: kChain.
export function kChain(D: KData, ch: number): KChain {
  const s = D.stat;
  const o = ch * 8;
  const geom = Math.round(s[o + 4]);
  return {
    ch,
    nCtrl: Math.round(s[o]),
    closed: s[o + 1] > 0.5,
    count: Math.round(s[o + 2]),
    idx: Math.round(s[o + 3]),
    geom,
    src0: Math.round(s[o + 5]),
    srcN: Math.round(s[o + 6]),
    total: D.geom[geom * 4],
    arcPer: D.geom[geom * 4 + 1],
  };
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
  stat[o + 7] = 0;
}

// KGEOM: G0 = (total, arcPer) + the control arcs packed 4 per texel.
// Returns the texel count written.
export function writeGeomTable(
  geom: Float32Array,
  base: number,
  total: number,
  count: number,
  closed: boolean,
  cal: ArrayLike<number>
): number {
  const o = base * 4;
  geom[o] = total;
  geom[o + 1] = total / (closed ? count : Math.max(1, count - 1));
  geom[o + 2] = 0;
  geom[o + 3] = 0;
  const n = cal.length;
  const a = o + 4;
  for (let i = 0; i < n; i++) geom[a + i] = cal[i];
  const padded = Math.ceil(n / 4) * 4;
  for (let i = n; i < padded; i++) geom[a + i] = 0;
  return 1 + Math.ceil(n / 4);
}
