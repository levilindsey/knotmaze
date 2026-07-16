// Layer 2: centripetal Catmull-Rom splines through strand control points,
// resampled at uniform arc-length spacing for ribbon extrusion.

export interface SplineSamples {
  count: number;
  positions: Float32Array; // 2 * count, uniformly spaced along arc, closed.
  tangents: Float32Array;  // 2 * count, unit length.
  totalLength: number;
  controlArcLengths: number[]; // Arc position of each control point.
}

// Subsamples per control segment when measuring arc length.
const SUBDIVISIONS = 6;
const EPSILON = 1e-6;

// Evaluate one centripetal Catmull-Rom segment (p1 -> p2) at u in [0, 1]
// via Barry-Goldman, writing the result into out.
function evalSegment(
  p0x: number, p0y: number,
  p1x: number, p1y: number,
  p2x: number, p2y: number,
  p3x: number, p3y: number,
  u: number,
  out: [number, number]
): void {
  const d01 = Math.max(Math.hypot(p1x - p0x, p1y - p0y), EPSILON);
  const d12 = Math.max(Math.hypot(p2x - p1x, p2y - p1y), EPSILON);
  const d23 = Math.max(Math.hypot(p3x - p2x, p3y - p2y), EPSILON);

  // Centripetal parameterization: knot spacing = sqrt(chord length).
  const t0 = 0;
  const t1 = t0 + Math.sqrt(d01);
  const t2 = t1 + Math.sqrt(d12);
  const t3 = t2 + Math.sqrt(d23);
  const t = t1 + (t2 - t1) * u;

  const w01 = (t - t0) / (t1 - t0);
  const a1x = p0x + (p1x - p0x) * w01;
  const a1y = p0y + (p1y - p0y) * w01;
  const w12 = (t - t1) / (t2 - t1);
  const a2x = p1x + (p2x - p1x) * w12;
  const a2y = p1y + (p2y - p1y) * w12;
  const w23 = (t - t2) / (t3 - t2);
  const a3x = p2x + (p3x - p2x) * w23;
  const a3y = p2y + (p3y - p2y) * w23;

  const w02 = (t - t0) / (t2 - t0);
  const b1x = a1x + (a2x - a1x) * w02;
  const b1y = a1y + (a2y - a1y) * w02;
  const w13 = (t - t1) / (t3 - t1);
  const b2x = a2x + (a3x - a2x) * w13;
  const b2y = a2y + (a3y - a2y) * w13;

  out[0] = b1x + (b2x - b1x) * w12;
  out[1] = b1y + (b2y - b1y) * w12;
}

// Sample a closed spline through `controls` (flat [x0,y0,x1,y1,...]) at
// `count` uniformly arc-spaced points.
export function sampleClosedSpline(
  controls: ArrayLike<number>,
  count: number
): SplineSamples {
  const n = controls.length / 2;
  if (n < 3) {
    throw new Error("Closed spline needs at least 3 control points.");
  }

  // Fine polyline through all segments, plus cumulative arc length.
  const fineCount = n * SUBDIVISIONS;
  const fine = new Float32Array(fineCount * 2);
  const cumulative = new Float32Array(fineCount + 1);
  const point: [number, number] = [0, 0];

  for (let i = 0; i < n; i++) {
    const i0 = ((i - 1 + n) % n) * 2;
    const i1 = i * 2;
    const i2 = ((i + 1) % n) * 2;
    const i3 = ((i + 2) % n) * 2;
    for (let s = 0; s < SUBDIVISIONS; s++) {
      evalSegment(
        controls[i0], controls[i0 + 1],
        controls[i1], controls[i1 + 1],
        controls[i2], controls[i2 + 1],
        controls[i3], controls[i3 + 1],
        s / SUBDIVISIONS,
        point
      );
      const f = i * SUBDIVISIONS + s;
      fine[f * 2] = point[0];
      fine[f * 2 + 1] = point[1];
    }
  }

  for (let f = 0; f < fineCount; f++) {
    const g = (f + 1) % fineCount;
    cumulative[f + 1] =
      cumulative[f] +
      Math.hypot(fine[g * 2] - fine[f * 2], fine[g * 2 + 1] - fine[f * 2 + 1]);
  }
  const totalLength = cumulative[fineCount];

  const controlArcLengths: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    controlArcLengths[i] = cumulative[i * SUBDIVISIONS];
  }

  // Uniform arc-length resampling by walking the fine polyline.
  const positions = new Float32Array(count * 2);
  const tangents = new Float32Array(count * 2);
  let cursor = 0;

  for (let k = 0; k < count; k++) {
    const target = (k / count) * totalLength;
    while (cursor < fineCount - 1 && cumulative[cursor + 1] < target) {
      cursor++;
    }
    const segLen = cumulative[cursor + 1] - cumulative[cursor];
    const frac = segLen > EPSILON ? (target - cumulative[cursor]) / segLen : 0;
    const a = cursor * 2;
    const b = ((cursor + 1) % fineCount) * 2;
    positions[k * 2] = fine[a] + (fine[b] - fine[a]) * frac;
    positions[k * 2 + 1] = fine[a + 1] + (fine[b + 1] - fine[a + 1]) * frac;
  }

  // Tangents from centered differences over the uniform samples.
  for (let k = 0; k < count; k++) {
    const prev = ((k - 1 + count) % count) * 2;
    const next = ((k + 1) % count) * 2;
    let tx = positions[next] - positions[prev];
    let ty = positions[next + 1] - positions[prev + 1];
    const len = Math.hypot(tx, ty);
    if (len > EPSILON) {
      tx /= len;
      ty /= len;
    } else {
      tx = 1;
      ty = 0;
    }
    tangents[k * 2] = tx;
    tangents[k * 2 + 1] = ty;
  }

  return { count, positions, tangents, totalLength, controlArcLengths };
}
