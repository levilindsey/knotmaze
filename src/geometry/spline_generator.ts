// Layer 2: centripetal Catmull-Rom splines through strand control points,
// resampled at uniform arc-length spacing for ribbon extrusion.

import { legTurnRadius, overTightWindows } from "./bend_radius";

export interface SplineSamples {
  count: number;
  positions: Float32Array; // 2 * count, uniformly spaced along arc.
  tangents: Float32Array;  // 2 * count, unit length.
  totalLength: number;
  controlArcLengths: number[]; // Arc position of each control point, by slot.
  closed: boolean; // Ring (count segments) vs open run (count - 1 segments).
}

// Subsamples per control segment when measuring arc length. Must stay well
// below the renderer's resample spacing, or resampled tangents alias against
// the fine polyline's chords and ribbon edges turn fuzzy.
const SUBDIVISIONS = 12;
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

// K90 option 3 (stage 1b), THE BEND BOUND: a render-side prototype, OFF by
// default and switched only by the debug hook `window.__knotSplineBend`
// (ribbon_renderer.ts), never by a link. The rendered centerline can turn
// tighter than its ribbon's half-width where the particles do not: at a
// corner of the particle polyline the Catmull-Rom's radius is about
// cos(phi / 2) / 2 of the polyline's leg radius (docs/design/
// K90_bend_radius.md), and there the strip self-overlaps. With the bound on,
// each run of resampled samples whose turn radius (bend_radius.ts, the
// renderer's own measure) is under ratio x halfWidth is relaxed in place:
// Gauss-Seidel sweeps move every over-tight sample halfway to its
// neighbors' midpoint, so the turn spreads onto the samples beside the run
// until each holds the radius. Limits: no sample moves more than maxShift
// half-widths from where the spline put it; a run that turns more than
// maxTurn (two samples either side included) is a loop, which a local
// relaxation could only shrink, and is left alone; at most `iterations`
// sweeps; an open run keeps its two end samples. The bound runs before the
// tangents, so they follow the moved samples. Nothing in the physics reads
// these samples: they feed the ribbons, the gaps and the webs.
export interface SplineBend {
  enabled: boolean;
  // The radius to hold, in half-widths (bend_radius's OVER_TIGHT_RATIO
  // is 1).
  ratio: number;
  // The ribbon half-width in world units; the renderer sets it each
  // update().
  halfWidth: number;
  // The largest displacement of any sample, in half-widths.
  maxShift: number;
  // A run turning more than this many radians is left alone.
  maxTurn: number;
  iterations: number;
  // The most samples either side of a run that may take its turn.
  marginMax: number;
  // Detect-and-relax passes: a later pass catches a turn that the first
  // pushed onto the edge of its range.
  passes: number;
  // Clamp each run as a whole instead of each sample: relax the run with
  // no clamp, then blend it back toward where the pass found it until no
  // sample lies more than maxShift from the spline. A sample's second
  // difference is linear in the positions, so a blended sample turns about
  // no tighter than the tighter of the two states; a per-sample clamp can
  // stop one sample while its neighbors straighten, and the turn then
  // gathers on it (census r2's min-ratio regression, K90_bend_radius.md).
  soft: boolean;
  // Diagnostics, accumulated until the caller zeroes them: samples moved,
  // the largest shift (world), runs relaxed and runs left alone.
  moved: number;
  shiftMax: number;
  runs: number;
  skipped: number;
}

// The values are census r2's pick (K90_bend_radius.md): 1.05 left w115
// where it was, a maxShift of 1.0 h bought nothing over 0.5, and three
// passes with room for 24 samples a side cut what one pass left by 3-4x.
export const splineBend: SplineBend = {
  enabled: false,
  ratio: 1.2,
  halfWidth: 0,
  maxShift: 0.5,
  maxTurn: (200 * Math.PI) / 180,
  iterations: 48,
  marginMax: 24,
  passes: 3,
  soft: false,
  moved: 0,
  shiftMax: 0,
  runs: 0,
  skipped: 0,
};

// The fewest samples beside an over-tight run that may take its turn.
const BEND_MARGIN_MIN = 3;
// A sample moving less than this (world) has converged.
const BEND_STILL = 1e-6;
let bendOrig = new Float32Array(0);
// A run's positions before its relaxation (the soft clamp's blend base).
let bendPre = new Float32Array(0);

function bendRadiusAt(
  pos: Float32Array,
  count: number,
  closed: boolean,
  k: number
): number {
  if (!closed && (k <= 0 || k >= count - 1)) return Infinity;
  const p = ((k - 1 + count) % count) * 2;
  const c = k * 2;
  const n = ((k + 1) % count) * 2;
  return legTurnRadius(
    pos[c] - pos[p],
    pos[c + 1] - pos[p + 1],
    pos[n] - pos[c],
    pos[n + 1] - pos[c + 1]
  );
}

// The signed turn at sample k (radians), 0 at an open run's ends.
function bendTurnAt(
  pos: Float32Array,
  count: number,
  closed: boolean,
  k: number
): number {
  if (!closed && (k <= 0 || k >= count - 1)) return 0;
  const p = ((k - 1 + count) % count) * 2;
  const c = k * 2;
  const n = ((k + 1) % count) * 2;
  const ax = pos[c] - pos[p];
  const ay = pos[c + 1] - pos[p + 1];
  const bx = pos[n] - pos[c];
  const by = pos[n + 1] - pos[c + 1];
  return Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
}

// The bound, in place on uniformly resampled positions (before tangents).
export function boundBend(pos: Float32Array, count: number, closed: boolean): void {
  const b = splineBend;
  const R = b.ratio * b.halfWidth;
  if (!(R > 0) || count < 5) return;
  let wins = overTightWindows(pos, count, closed, b.halfWidth, b.ratio);
  if (wins.length === 0) return;
  if (bendOrig.length < count * 2) bendOrig = new Float32Array(count * 2);
  bendOrig.set(pos.subarray(0, count * 2));
  const maxD = b.maxShift * b.halfWidth;
  const maxD2 = maxD * maxD;
  const wrap = (j: number): number => ((j % count) + count) % count;
  let lo = count;
  let hi = -1;
  const passes = Math.max(1, b.passes);
  const marginMax = Math.max(BEND_MARGIN_MIN, b.marginMax);
  for (let pass = 0; pass < passes; pass++) {
    if (pass > 0) {
      wins = overTightWindows(pos, count, closed, b.halfWidth, b.ratio);
      if (wins.length === 0) break;
    }
    for (const w of wins) {
      if (w.length >= count) {
        if (pass === 0) b.skipped++;
        continue;
      }
      let turn = 0;
      let arc = 0;
      let legs = 0;
      for (let j = w.start - 2; j < w.start + w.length + 2; j++) {
        const k = closed ? wrap(j) : j;
        if (k < 0 || k >= count) continue;
        turn += bendTurnAt(pos, count, closed, k);
        if (closed || k + 1 < count) {
          const n = wrap(k + 1);
          arc += Math.sqrt(
            (pos[n * 2] - pos[k * 2]) * (pos[n * 2] - pos[k * 2]) +
              (pos[n * 2 + 1] - pos[k * 2 + 1]) * (pos[n * 2 + 1] - pos[k * 2 + 1])
          );
          legs++;
        }
      }
      if (Math.abs(turn) > b.maxTurn) {
        if (pass === 0) b.skipped++;
        continue;
      }
      b.runs++;
      // Room for the turn at radius R: arc R |turn|, shared by both sides.
      const spacing = legs > 0 ? arc / legs : 0;
      const need = spacing > 0 ? Math.ceil((R * Math.abs(turn)) / spacing / 2) : 0;
      const margin = Math.min(marginMax, Math.max(BEND_MARGIN_MIN, need));
      const j0 = w.start - margin;
      const j1 = w.start + w.length - 1 + margin;
      // The run's distinct samples, s0 .. s0 + span - 1 (wrapped when closed).
      const s0 = closed ? j0 : Math.max(0, j0);
      const span = closed ? Math.min(j1 - j0 + 1, count) : Math.min(count - 1, j1) - s0 + 1;
      if (b.soft) {
        if (bendPre.length < span * 2) bendPre = new Float32Array(span * 2);
        for (let i = 0; i < span; i++) {
          const k = closed ? wrap(s0 + i) : s0 + i;
          bendPre[i * 2] = pos[k * 2];
          bendPre[i * 2 + 1] = pos[k * 2 + 1];
        }
      }
      for (let it = 0; it < b.iterations; it++) {
        let movedAny = false;
        for (let j = j0; j <= j1; j++) {
          const k = closed ? wrap(j) : j;
          if (!closed && (k <= 0 || k >= count - 1)) continue;
          if (!(bendRadiusAt(pos, count, closed, k) < R)) continue;
          const p = wrap(k - 1) * 2;
          const n = wrap(k + 1) * 2;
          const c = k * 2;
          let x = pos[c] + ((pos[p] + pos[n]) * 0.5 - pos[c]) * 0.5;
          let y = pos[c + 1] + ((pos[p + 1] + pos[n + 1]) * 0.5 - pos[c + 1]) * 0.5;
          if (!b.soft) {
            const dx = x - bendOrig[c];
            const dy = y - bendOrig[c + 1];
            const d2 = dx * dx + dy * dy;
            if (d2 > maxD2) {
              const f = maxD / Math.sqrt(d2);
              x = bendOrig[c] + dx * f;
              y = bendOrig[c + 1] + dy * f;
            }
          }
          if (Math.abs(x - pos[c]) + Math.abs(y - pos[c + 1]) < BEND_STILL) continue;
          pos[c] = x;
          pos[c + 1] = y;
          movedAny = true;
          if (closed) {
            lo = 0;
            hi = count - 1;
          } else {
            if (k < lo) lo = k;
            if (k > hi) hi = k;
          }
        }
        if (!movedAny) break;
      }
      if (b.soft) {
        // The largest t in [0, 1] with |pre + t (pos - pre) - orig| <= maxD
        // at every sample of the run: per sample, the larger root of
        // a t^2 + bq t + c = 0 (the numerically stable form).
        let tStar = 1;
        for (let i = 0; i < span; i++) {
          const k = (closed ? wrap(s0 + i) : s0 + i) * 2;
          const px = bendPre[i * 2];
          const py = bendPre[i * 2 + 1];
          const dx = pos[k] - px;
          const dy = pos[k + 1] - py;
          const a = dx * dx + dy * dy;
          if (a === 0) continue;
          const ex = px - bendOrig[k];
          const ey = py - bendOrig[k + 1];
          const bq = 2 * (ex * dx + ey * dy);
          const c = ex * ex + ey * ey - maxD2;
          if (a + bq + c <= 0) continue;
          const sq = Math.sqrt(Math.max(0, bq * bq - 4 * a * c));
          let t = bq >= 0 ? (bq + sq > 0 ? (-2 * c) / (bq + sq) : 0) : (sq - bq) / (2 * a);
          if (!(t > 0)) t = 0;
          if (t < tStar) tStar = t;
        }
        if (tStar < 1) {
          for (let i = 0; i < span; i++) {
            const k = (closed ? wrap(s0 + i) : s0 + i) * 2;
            pos[k] = bendPre[i * 2] + (pos[k] - bendPre[i * 2]) * tStar;
            pos[k + 1] = bendPre[i * 2 + 1] + (pos[k + 1] - bendPre[i * 2 + 1]) * tStar;
          }
        }
      }
    }
  }
  for (let k = lo; k <= hi; k++) {
    const dx = pos[k * 2] - bendOrig[k * 2];
    const dy = pos[k * 2 + 1] - bendOrig[k * 2 + 1];
    if (dx !== 0 || dy !== 0) {
      b.moved++;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > b.shiftMax) b.shiftMax = d;
    }
  }
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

  if (splineBend.enabled) boundBend(positions, count, true);

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

  return {
    count,
    positions,
    tangents,
    totalLength,
    controlArcLengths,
    closed: true,
  };
}

// Sample an OPEN spline: a centripetal Catmull-Rom path through `controls`
// (flat, slot order 0..n-1) whose cyclic seam AFTER slot `breakAfter` is
// removed. The strand runs from the loose end at slot breakAfter+1 (arc 0) the
// long way around to the loose end at slot breakAfter (arc totalLength), with
// clamped (non-wrapping) endpoints. `controlArcLengths` is indexed by SLOT, so
// a crossing's fractional control maps straight through arcAt() - the caller
// keeps its interior crossings well away from the seam, where the arc jumps.
export function sampleOpenSpline(
  controls: ArrayLike<number>,
  count: number,
  breakAfter: number
): SplineSamples {
  const n = controls.length / 2;
  if (n < 3) {
    throw new Error("Open spline needs at least 3 control points.");
  }
  const off = breakAfter + 1; // Traversal slot(r) = (off + r) % n.
  const slotBase = (r: number): number => (((off + r) % n) + n) % n;
  const segCount = n - 1; // Real segments (the seam segment is gone).

  // Fine polyline over the real segments, endpoints clamped (p0=p1 / p3=p2).
  const fineCount = segCount * SUBDIVISIONS + 1;
  const fine = new Float32Array(fineCount * 2);
  const point: [number, number] = [0, 0];
  for (let r = 0; r < segCount; r++) {
    const i0 = slotBase(Math.max(0, r - 1)) * 2;
    const i1 = slotBase(r) * 2;
    const i2 = slotBase(r + 1) * 2;
    const i3 = slotBase(Math.min(segCount, r + 2)) * 2;
    for (let s = 0; s < SUBDIVISIONS; s++) {
      evalSegment(
        controls[i0], controls[i0 + 1],
        controls[i1], controls[i1 + 1],
        controls[i2], controls[i2 + 1],
        controls[i3], controls[i3 + 1],
        s / SUBDIVISIONS,
        point
      );
      const f = r * SUBDIVISIONS + s;
      fine[f * 2] = point[0];
      fine[f * 2 + 1] = point[1];
    }
  }
  // The final endpoint (u = 1 of the last segment == control slot(n-1)).
  const last = slotBase(n - 1) * 2;
  fine[(fineCount - 1) * 2] = controls[last];
  fine[(fineCount - 1) * 2 + 1] = controls[last + 1];

  const cumulative = new Float32Array(fineCount);
  for (let f = 1; f < fineCount; f++) {
    cumulative[f] =
      cumulative[f - 1] +
      Math.hypot(
        fine[f * 2] - fine[(f - 1) * 2],
        fine[f * 2 + 1] - fine[(f - 1) * 2 + 1]
      );
  }
  const totalLength = cumulative[fineCount - 1];

  const controlArcLengths: number[] = new Array(n).fill(0);
  for (let r = 0; r < n; r++) {
    controlArcLengths[slotBase(r)] = cumulative[Math.min(fineCount - 1, r * SUBDIVISIONS)];
  }

  // Uniform arc-length resampling, endpoints inclusive (k = 0 -> arc 0,
  // k = count-1 -> total), walking the open fine polyline.
  const positions = new Float32Array(count * 2);
  const tangents = new Float32Array(count * 2);
  let cursor = 0;
  for (let k = 0; k < count; k++) {
    const target = (k / (count - 1)) * totalLength;
    while (cursor < fineCount - 2 && cumulative[cursor + 1] < target) {
      cursor++;
    }
    const segLen = cumulative[cursor + 1] - cumulative[cursor];
    const frac = segLen > EPSILON ? (target - cumulative[cursor]) / segLen : 0;
    const a = cursor * 2;
    const b = (cursor + 1) * 2;
    positions[k * 2] = fine[a] + (fine[b] - fine[a]) * frac;
    positions[k * 2 + 1] = fine[a + 1] + (fine[b + 1] - fine[a + 1]) * frac;
  }

  if (splineBend.enabled) boundBend(positions, count, false);

  // Tangents from centered differences; one-sided at the two open ends.
  for (let k = 0; k < count; k++) {
    const prev = Math.max(0, k - 1) * 2;
    const next = Math.min(count - 1, k + 1) * 2;
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

  return {
    count,
    positions,
    tangents,
    totalLength,
    controlArcLengths,
    closed: false,
  };
}
