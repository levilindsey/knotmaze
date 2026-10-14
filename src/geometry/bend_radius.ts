// Over-tight folds (K90): the ONE definition of "this thread turns tighter
// than its ribbon can draw", shared by physics (K90's census and bend
// floor) and the renderer (K8's fold windows), so the two can never
// disagree about which folds exist.
//
// The quantity is the renderer's own local turn radius at a ribbon
// sample (ribbon_mesh.ts update(), the concave-side clamp): the radius of
// the circle tangent to the sample's two legs at their midpoints,
//
//   R = ((|a| + |b|) / 4) * cos(phi / 2) / sin(phi / 2),
//
// phi = the turn angle between the incoming leg a and the outgoing leg b.
// On a circle of radius r sampled at spacing s it reads r cos(s / 2r): at
// the ribbon's spacing (0.09 world or less) 2% short of r at r = one
// half-width of the default width, closer for gentler bends, so it errs
// toward calling a fold tight. The ribbon's concave edge self-overlaps
// (the triangle strip folds back past the center of curvature, the
// "merged threads" seam of P3.34) where R falls below the half-width; the
// renderer clamps its inner offset to 0.95 R there and the ribbon thins
// into the fold. Measure the rendered centerline (the centripetal
// Catmull-Rom resampled at uniform arc), not the particle polyline: the
// spline can turn tighter than the polyline it passes through.
//
// One deliberate difference from the renderer: the renderer clamps
// cos(phi / 2) at 0.5 (a turn of 120 degrees per sample) to bound its
// miter, and its radius inherits the clamp; this module does not. The two
// differ only where one sample turns more than 120 degrees, a fold of
// about 0.12 half-widths at the default width, over-tight either way.

// A sample is OVER-TIGHT (the strip self-overlaps; the renderer's
// fold fallback - the concave clamp today, K8's pinch next - has to
// act) when its turn radius is below this many half-widths.
export const OVER_TIGHT_RATIO = 1.0;

// The physics floor's target (applyTurnRadiusFloor, K90's bend floor):
// 15% above the over-tight line, so a fold the floor holds never reaches
// the renderer's fallback.
export const BEND_FLOOR_RATIO = 1.15;

// Legs shorter than this have no direction (a fused bridge's tucked tip
// collapses samples onto one point): ribbon_mesh's threshold.
const LEG_EPS = 1e-6;
// Below this sin(phi / 2) the sample is straight (ribbon_mesh's).
const STRAIGHT_EPS = 1e-4;

// Turn radius at a sample from its two legs (a = this - prev, b = next -
// this), with the renderer's leg rules: a zero leg borrows the other
// one, both zero is straight. Infinity = straight.
export function legTurnRadius(
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  let la = Math.sqrt(ax * ax + ay * ay);
  let lb = Math.sqrt(bx * bx + by * by);
  if (la < LEG_EPS && lb < LEG_EPS) return Infinity;
  if (la < LEG_EPS) {
    ax = bx;
    ay = by;
    la = lb;
  } else if (lb < LEG_EPS) {
    bx = ax;
    by = ay;
    lb = la;
  }
  const dot = (ax * bx + ay * by) / (la * lb);
  const sinHalf = Math.sqrt(Math.max((1 - dot) / 2, 0));
  if (sinHalf <= STRAIGHT_EPS) return Infinity;
  const cosHalf = Math.sqrt(Math.max((1 + dot) / 2, 0));
  return ((la + lb) / 4) * (cosHalf / sinHalf);
}

// Turn radius at every sample of a polyline (flat [x0, y0, x1, y1, ...]),
// with the renderer's neighbor rules: a closed ring wraps; an OPEN run's
// two tips have one real leg each and read straight (Infinity), as
// ribbon_mesh duplicates the real leg there. Written into `out` (grown if
// short) and returned.
export function turnRadii(
  positions: ArrayLike<number>,
  count: number,
  closed: boolean,
  out?: Float64Array
): Float64Array {
  const r = out && out.length >= count ? out : new Float64Array(count);
  for (let i = 0; i < count; i++) {
    if (!closed && (i === 0 || i === count - 1)) {
      r[i] = Infinity;
      continue;
    }
    const p = ((i - 1 + count) % count) * 2;
    const c = i * 2;
    const n = ((i + 1) % count) * 2;
    r[i] = legTurnRadius(
      positions[c] - positions[p],
      positions[c + 1] - positions[p + 1],
      positions[n] - positions[c],
      positions[n + 1] - positions[c + 1]
    );
  }
  return r;
}

// True when a turn radius is over-tight for a ribbon of `halfWidth`.
export function isOverTight(
  radius: number,
  halfWidth: number,
  ratio: number = OVER_TIGHT_RATIO
): boolean {
  return radius < ratio * halfWidth;
}

// A run of consecutive over-tight samples. `start` is the first sample,
// `length` the run's sample count; on a closed ring the run may wrap past
// the last sample (indices are modulo the count). minRatio is the
// tightest radius in half-widths, at sample minIndex.
export interface FoldWindow {
  start: number;
  length: number;
  minIndex: number;
  minRatio: number;
}

// The over-tight windows of one ribbon: every maximal run of samples whose
// turn radius is below `ratio` half-widths. A closed ring's run across
// sample 0 is reported once, starting before 0. K8's renderer takes its
// pinch windows from here; K90's census counts them.
export function overTightWindows(
  positions: ArrayLike<number>,
  count: number,
  closed: boolean,
  halfWidth: number,
  ratio: number = OVER_TIGHT_RATIO,
  radii?: Float64Array
): FoldWindow[] {
  const r = turnRadii(positions, count, closed, radii);
  const limit = ratio * halfWidth;
  const out: FoldWindow[] = [];
  if (count === 0) return out;
  // A closed ring starts scanning just after a sample that is NOT
  // over-tight, so a run across sample 0 is never split in two.
  let first = 0;
  if (closed) {
    let free = -1;
    for (let i = count - 1; i >= 0; i--) {
      if (!(r[i] < limit)) {
        free = i;
        break;
      }
    }
    if (free < 0) {
      // The whole ring is over-tight.
      let minIndex = 0;
      for (let i = 1; i < count; i++) if (r[i] < r[minIndex]) minIndex = i;
      return [
        { start: 0, length: count, minIndex, minRatio: r[minIndex] / halfWidth },
      ];
    }
    first = (free + 1) % count;
  }
  let cur: FoldWindow | null = null;
  for (let k = 0; k < count; k++) {
    const i = (first + k) % count;
    if (r[i] < limit) {
      if (!cur) {
        cur = { start: i, length: 0, minIndex: i, minRatio: Infinity };
        out.push(cur);
      }
      cur.length++;
      const q = r[i] / halfWidth;
      if (q < cur.minRatio) {
        cur.minRatio = q;
        cur.minIndex = i;
      }
    } else {
      cur = null;
    }
  }
  return out;
}

// The tightest turn radius of a ribbon, in half-widths (Infinity when it
// never turns), and where.
export function minTurnRatio(
  positions: ArrayLike<number>,
  count: number,
  closed: boolean,
  halfWidth: number,
  radii?: Float64Array
): { ratio: number; index: number } {
  const r = turnRadii(positions, count, closed, radii);
  let index = -1;
  let best = Infinity;
  for (let i = 0; i < count; i++) {
    if (r[i] < best) {
      best = r[i];
      index = i;
    }
  }
  return { ratio: best / halfWidth, index };
}
