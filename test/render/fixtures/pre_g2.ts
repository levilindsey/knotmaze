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
