// FROZEN COPIES of the pre-G2 CPU color pipeline (RibbonRenderer on master
// db108af), kept verbatim as the parity reference for the G2 shader paint
// mirror (src/render/paint_math.ts). Do not "fix" these: they define what
// the GPU path must reproduce (or deviate from only where documented in
// docs/design/G2_shader_paint.md). Delete with the G2.5 cleanup only if the
// suites that import them go too.

export interface FrozenSamples {
  count: number;
  totalLength: number;
  controlArcLengths: number[];
  closed: boolean;
}

// RibbonRenderer.arcAt (closed-ring math, used for closed chains).
export function arcAt(samples: FrozenSamples, ctrl: number): number {
  const n = samples.controlArcLengths.length;
  const i = Math.floor(ctrl);
  const t = ctrl - i;
  const i0 = ((i % n) + n) % n;
  const i1 = (i0 + 1) % n;
  const a0 = samples.controlArcLengths[i0];
  let a1 = samples.controlArcLengths[i1];
  if (a1 <= a0) a1 += samples.totalLength;
  return (a0 + (a1 - a0) * t) % samples.totalLength;
}

// RibbonRenderer.paintArcAt.
export function paintArcAt(
  samples: FrozenSamples,
  ctrl: number,
  closed: boolean
): number {
  if (closed) return arcAt(samples, ctrl);
  const n = samples.controlArcLengths.length;
  const i = Math.max(0, Math.min(n - 1, Math.floor(ctrl)));
  const t = ctrl - i;
  const a0 = samples.controlArcLengths[i];
  const a1 = i + 1 < n ? samples.controlArcLengths[i + 1] : samples.totalLength;
  return Math.min(samples.totalLength, a0 + (a1 - a0) * t);
}

// buildRgbCacheFor's per-sample arc -> ctrl walk: the ctrl of every sample.
export function bakeSampleCtrls(samples: FrozenSamples): Float64Array {
  const count = samples.count;
  const cal = samples.controlArcLengths;
  const n = cal.length;
  const total = samples.totalLength;
  const out = new Float64Array(count);
  let slot = 0;
  for (let k = 0; k < count; k++) {
    const a = samples.closed
      ? (k / count) * total
      : (k / (count - 1)) * total;
    while (slot < n - 1 && cal[slot + 1] <= a) slot++;
    const a0 = cal[slot];
    const a1 = slot < n - 1 ? cal[slot + 1] : total;
    const t = a1 > a0 ? Math.min(1, (a - a0) / (a1 - a0)) : 0;
    out[k] = slot + t;
  }
  return out;
}

// ---- G2.1 references: appearance FX + reveal mask (RibbonRenderer) ----

const smooth = (x: number): number => {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
};

// applyBurnColors' per-sample color block (burn and roots), applied to one
// sample's color in place. `t` = the sample's age, `k` = its sample index,
// `paintClock` = the absolute paint clock.
export function oldBurnSample(
  rgb: number[],
  t: number,
  k: number,
  paintClock: number,
  roots: boolean
): void {
  const BURN_EMBER_END = 0.4;
  const BURN_CHAR_END = 0.9;
  const BURN_RECOVER_END = 1.3;
  if (t >= BURN_RECOVER_END) return;
  if (roots) {
    const brown = 1 - smooth((t - 0.05) / 1.0);
    if (brown > 0.004) {
      rgb[0] += (0.35 - rgb[0]) * brown;
      rgb[1] += (0.25 - rgb[1]) * brown;
      rgb[2] += (0.18 - rgb[2]) * brown;
    }
    return;
  }
  const flTime =
    0.3 * Math.sin(13 * paintClock) + 0.2 * Math.sin(29 * paintClock);
  const heatW = 1 - smooth((t - 0.015) / 0.05);
  const heatY = smooth(t / 0.02) * (1 - smooth((t - 0.1) / 0.12));
  const ember = smooth(t / 0.08) * (1 - smooth((t - BURN_EMBER_END) / 0.25));
  const char =
    smooth((t - BURN_EMBER_END * 0.55) / 0.25) *
    (1 - smooth((t - BURN_CHAR_END) / (BURN_RECOVER_END - BURN_CHAR_END)));
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
      spatial *
        (0.3 * Math.sin(13 * paintClock + k * 0.31) +
          0.2 * Math.sin(29 * paintClock + k * 0.83)) +
      (1 - spatial) * flTime;
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

// applyFxWeights' weight of a sample at age t (ignited samples).
export function oldFxWeight(style: "rainbow" | "dust" | "comet", t: number): number {
  const RAINBOW_HOLD = 0.12;
  const RAINBOW_FADE = 0.65;
  const end =
    style === "rainbow"
      ? RAINBOW_HOLD + RAINBOW_FADE
      : style === "dust"
        ? 0.55
        : 1.0;
  if (style === "rainbow") return t >= end ? 0 : 1 - smooth((t - RAINBOW_HOLD) / RAINBOW_FADE);
  if (t >= end) return 0;
  return smooth(t / end) - 1;
}

// fxSolid / fanFx (RibbonRenderer).
export function oldFxSolid(w: number): number {
  if (w < 0) return 1 + w;
  if (w > 0) {
    const x = Math.max(0, Math.min(1, (w - 0.06) / 0.34));
    return 1 - x * x * (3 - 2 * x);
  }
  return 1;
}
export function oldFanFx(solid: number): number {
  const x = Math.max(0, Math.min(1, (solid - 0.55) / (1 - 0.55)));
  const a = x * x * (3 - 2 * x);
  return a >= 0.999 ? 0 : a - 1;
}

// rainbowWidthMul's swell factor at a rainbow weight w.
export function oldSwell(w: number): number {
  const x = Math.max(0, Math.min(1, (w - 0.2) / (1 - 0.2)));
  return 1 + 1.0 * x * x * (3 - 2 * x);
}

// revealMaskFor's interval branch: the per-sample mask from revealed ctrl
// intervals (intervalsAt), the style's taper (arc) and tip floor.
export function oldIntervalMask(
  samples: FrozenSamples,
  intervals: Array<{ c0: number; c1: number; soft0: boolean; soft1: boolean }>,
  taper: number,
  tipFloor: number
): Float64Array {
  const count = samples.count;
  const closed = samples.closed;
  const total = samples.totalLength;
  const mask = new Float64Array(count);
  for (const iv of intervals) {
    const A0 = paintArcAt(samples, iv.c0, closed);
    const A1 = paintArcAt(samples, iv.c1, closed);
    const wraps = closed && A1 <= A0 && iv.c1 > iv.c0 + 1e-9;
    for (let k = 0; k < count; k++) {
      const a = closed ? (k / count) * total : (k / (count - 1)) * total;
      let dIn0: number;
      let dIn1: number;
      if (wraps) {
        if (a < A0 && a > A1) continue;
        dIn0 = a >= A0 ? a - A0 : a + total - A0;
        dIn1 = a <= A1 ? A1 - a : A1 + total - a;
      } else {
        if (a < A0 || a > A1) continue;
        dIn0 = a - A0;
        dIn1 = A1 - a;
      }
      let m = 1;
      if (iv.soft0) m = Math.min(m, dIn0 / taper);
      if (iv.soft1) m = Math.min(m, dIn1 / taper);
      if (tipFloor > 0 && m < 1) m = tipFloor + (1 - tipFloor) * m;
      if (m > mask[k]) mask[k] = m;
    }
  }
  return mask;
}