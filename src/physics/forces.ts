// Layer 3 forces, applied as position-based (Jakobsen-style) constraint
// relaxation over Verlet particles.

export interface DistanceConstraint {
  a: number; // Particle index.
  b: number;
  rest: number;
  stiffness: number; // [0, 1] correction fraction per iteration.
  pullOnly?: boolean; // Only act when current < rest (used for bending).
}


const EPSILON = 1e-9;

// restScale/stiffnessScale let the caller animate targets over time (the
// settle ramp) without rebuilding constraint lists.
export function applyDistanceConstraints(
  positions: Float32Array,
  constraints: DistanceConstraint[],
  restScale = 1,
  stiffnessScale = 1
): void {
  for (const c of constraints) {
    const rest = c.rest * restScale;
    const ax = positions[c.a * 2];
    const ay = positions[c.a * 2 + 1];
    const bx = positions[c.b * 2];
    const by = positions[c.b * 2 + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const dist = Math.hypot(dx, dy);
    if (dist < EPSILON) continue;
    if (c.pullOnly && dist >= rest) continue;

    const correction =
      ((dist - rest) / dist) * c.stiffness * stiffnessScale * 0.5;
    positions[c.a * 2] = ax + dx * correction;
    positions[c.a * 2 + 1] = ay + dy * correction;
    positions[c.b * 2] = bx - dx * correction;
    positions[c.b * 2 + 1] = by - dy * correction;
  }
}

// Contact-bubble exemption for crossings: a pair of particles skips
// repulsion only when both lie within `radius` of the shared crossing's
// actual contact point. Threads may touch AT a crossing, but between two
// nearby crossings (a twist) repulsion resumes and holds them apart.
export interface CrossingExemption {
  zoneA: Int32Array; // Up to two crossing ids per particle...
  zoneB: Int32Array; // ...(twist windows overlap).
  contacts: Float32Array; // Per-crossing contact point [x, y].
  radius: number;
}

// Taper slope: how fast the allowed separation ramps from zero at the
// contact bubble's edge back up to the full repulsion/collision distance.
// Sized so a TIGHT twist eye (contacts ~1 apart at slack 0) recovers the
// full thread-width floor at mid-eye: with radius 0.25, (0.5 - 0.25) * 2.0
// = 0.5 >= the 0.44 floor. Too shallow and the eye's strands legitimately
// hug (same-color ribbons touching render as one merged blob - reported
// as a gap-less twist); too cliff-like and the eye buckles and inverts.
export const EXEMPTION_TAPER_SLOPE = 2.0;

// Hard capsule collision between thread segments: no two non-exempt
// segments may come closer (centerline to centerline) than minDist, so
// thread width is honored everywhere except inside a crossing's contact
// lens. This is what point repulsion cannot guarantee: points can spread
// while the segments between them still overlap, and exemption bubbles
// let parallel runs hug.
export interface SegmentTopology {
  next: Int32Array; // Particle -> next particle along its chain.
  chainOf: Int32Array; // Particle -> chain index.
  ctrlOf: Int32Array; // Particle -> control index within its chain.
  chainLen: Int32Array; // Particle -> its chain's length.
}

// Emergent crossing collector: segment pairs that PROPERLY INTERSECT are
// threads that tunneled through each other - real visual crossings with no
// graph entry. Rows of [segA, paramA, segB, paramB].
export interface EmergentCollector {
  data: Float32Array;
  n: number;
}

export function applySegmentCollision(
  positions: Float32Array,
  particleCount: number,
  topology: SegmentTopology,
  minDist: number,
  stiffness: number,
  exemption: CrossingExemption,
  collector?: EmergentCollector
): void {
  const cellSize = Math.max(1, minDist * 2);
  const buckets = new Map<number, number[]>();
  const bucketKey = (cx: number, cy: number): number =>
    (cx + 2048) * 65536 + (cy + 2048);

  for (let i = 0; i < particleCount; i++) {
    const k = bucketKey(
      Math.floor(positions[i * 2] / cellSize),
      Math.floor(positions[i * 2 + 1] / cellSize)
    );
    const bucket = buckets.get(k);
    if (bucket) bucket.push(i);
    else buckets.set(k, [i]);
  }

  const { next, chainOf, ctrlOf, chainLen } = topology;

  for (let i = 0; i < particleCount; i++) {
    const cx = Math.floor(positions[i * 2] / cellSize);
    const cy = Math.floor(positions[i * 2 + 1] / cellSize);

    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const bucket = buckets.get(bucketKey(cx + ox, cy + oy));
        if (!bucket) continue;

        for (const j of bucket) {
          if (j <= i) continue;

          // Skip nearby same-chain segments (they legitimately connect).
          if (chainOf[i] === chainOf[j]) {
            const len = chainLen[i];
            const d = Math.abs(ctrlOf[i] - ctrlOf[j]);
            if (Math.min(d, len - d) <= 6) continue;
          }

          // Crossing-lens exemption with the same smooth taper as point
          // repulsion.
          let pairMinDist = minDist;
          let sharedKx = Number.NaN;
          let sharedKy = Number.NaN;
          const a1 = exemption.zoneA[i];
          const a2 = exemption.zoneB[i];
          const b1 = exemption.zoneA[j];
          const b2 = exemption.zoneB[j];
          let shared = -1;
          if (a1 >= 0 && (a1 === b1 || a1 === b2)) shared = a1;
          else if (a2 >= 0 && (a2 === b1 || a2 === b2)) shared = a2;
          if (shared >= 0) {
            const kx = exemption.contacts[shared * 2];
            const ky = exemption.contacts[shared * 2 + 1];
            sharedKx = kx;
            sharedKy = ky;
            const di = Math.hypot(
              positions[i * 2] - kx,
              positions[i * 2 + 1] - ky
            );
            const dj = Math.hypot(
              positions[j * 2] - kx,
              positions[j * 2 + 1] - ky
            );
            pairMinDist = Math.min(
              minDist,
              Math.max(0, (Math.max(di, dj) - exemption.radius) * EXEMPTION_TAPER_SLOPE)
            );
            if (pairMinDist < 1e-3) continue;
          }

          // Closest points between segment (i -> next[i]) and
          // (j -> next[j]).
          const i2 = next[i];
          const j2 = next[j];
          const p1x = positions[i * 2];
          const p1y = positions[i * 2 + 1];
          const d1x = positions[i2 * 2] - p1x;
          const d1y = positions[i2 * 2 + 1] - p1y;
          const p2x = positions[j * 2];
          const p2y = positions[j * 2 + 1];
          const d2x = positions[j2 * 2] - p2x;
          const d2y = positions[j2 * 2 + 1] - p2y;

          const rx = p1x - p2x;
          const ry = p1y - p2y;
          const a = d1x * d1x + d1y * d1y;
          const e = d2x * d2x + d2y * d2y;
          const f = d2x * rx + d2y * ry;
          const c = d1x * rx + d1y * ry;
          const b = d1x * d2x + d1y * d2y;
          const denom = a * e - b * b;
          let s = denom > 1e-12 ? (b * f - c * e) / denom : 0;
          s = Math.max(0, Math.min(1, s));
          let t = e > 1e-12 ? (b * s + f) / e : 0;
          t = Math.max(0, Math.min(1, t));
          if (t === 0 || t === 1) {
            s = Math.max(
              0,
              Math.min(1, a > 1e-12 ? (b * t - c) / a : 0)
            );
          }

          // Proper intersection: the pair has tunneled - record it as an
          // emergent crossing so the renderer can gap it. Segment pairs at
          // the fringe of a REGISTERED crossing's lens also properly
          // intersect (the coupling holds those threads coincident); those
          // are duplicates of a crossing that already renders, and left in
          // they flood the collector and starve genuine emergent
          // crossings of buffer and pool space - skip any intersection
          // near its shared crossing's contact point.
          if (collector && collector.n * 4 < collector.data.length) {
            const denom2 = d1x * d2y - d1y * d2x;
            // Transversal crossings only: |sin| of the crossing angle
            // >= 0.25. Taut knots hold dozens of GRAZING micro-overlaps
            // (near-parallel threads pressed together by the collision
            // floor penetrate by solver tolerance) - those are not visual
            // crossings and gapping them would be wrong.
            const lenProd = Math.sqrt(a * e);
            if (Math.abs(denom2) > 0.25 * lenProd) {
              const u = (-rx * d2y + ry * d2x) / denom2;
              const v = (-rx * d1y + ry * d1x) / denom2;
              if (u > 0 && u < 1 && v > 0 && v < 1) {
                const ix = p1x + d1x * u;
                const iy = p1y + d1y * u;
                const nearRegistered =
                  shared >= 0 &&
                  Math.hypot(ix - sharedKx, iy - sharedKy) < 0.8;
                if (!nearRegistered) {
                  const idx = collector.n * 4;
                  collector.data[idx] = i;
                  collector.data[idx + 1] = u;
                  collector.data[idx + 2] = j;
                  collector.data[idx + 3] = v;
                  collector.n++;
                }
              }
            }
          }

          const q1x = p1x + d1x * s;
          const q1y = p1y + d1y * s;
          const q2x = p2x + d2x * t;
          const q2y = p2y + d2y * t;
          let nx = q1x - q2x;
          let ny = q1y - q2y;
          const dist = Math.hypot(nx, ny);
          if (dist >= pairMinDist || dist < 1e-9) continue;
          nx /= dist;
          ny /= dist;

          const push = (pairMinDist - dist) * stiffness * 0.5;
          // Distribute to endpoints by closest-point weights.
          positions[i * 2] += nx * push * (1 - s);
          positions[i * 2 + 1] += ny * push * (1 - s);
          positions[i2 * 2] += nx * push * s;
          positions[i2 * 2 + 1] += ny * push * s;
          positions[j * 2] -= nx * push * (1 - t);
          positions[j * 2 + 1] -= ny * push * (1 - t);
          positions[j2 * 2] -= nx * push * t;
          positions[j2 * 2 + 1] -= ny * push * t;
        }
      }
    }
  }
}

// Soft minimum-distance repulsion between non-neighboring particles, using a
// uniform spatial hash. Keeps parallel threads from visually overlapping.
export function applyRepulsion(
  positions: Float32Array,
  particleCount: number,
  minDist: number,
  stiffness: number,
  excludedPairs: Set<number>,
  exemption?: CrossingExemption
): void {
  const cellSize = minDist;
  const buckets = new Map<number, number[]>();

  const bucketKey = (cx: number, cy: number): number =>
    (cx + 2048) * 65536 + (cy + 2048);

  for (let i = 0; i < particleCount; i++) {
    const k = bucketKey(
      Math.floor(positions[i * 2] / cellSize),
      Math.floor(positions[i * 2 + 1] / cellSize)
    );
    const bucket = buckets.get(k);
    if (bucket) bucket.push(i);
    else buckets.set(k, [i]);
  }

  for (let i = 0; i < particleCount; i++) {
    const cx = Math.floor(positions[i * 2] / cellSize);
    const cy = Math.floor(positions[i * 2 + 1] / cellSize);

    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const bucket = buckets.get(bucketKey(cx + ox, cy + oy));
        if (!bucket) continue;

        for (const j of bucket) {
          if (j <= i) continue;
          if (excludedPairs.has(i * 65536 + j)) continue;
          let pairMinDist = minDist;
          if (exemption) {
            const a1 = exemption.zoneA[i];
            const a2 = exemption.zoneB[i];
            const b1 = exemption.zoneA[j];
            const b2 = exemption.zoneB[j];
            let shared = -1;
            if (a1 >= 0 && (a1 === b1 || a1 === b2)) shared = a1;
            else if (a2 >= 0 && (a2 === b1 || a2 === b2)) shared = a2;
            if (shared >= 0) {
              const cx = exemption.contacts[shared * 2];
              const cy = exemption.contacts[shared * 2 + 1];
              const di = Math.hypot(
                positions[i * 2] - cx,
                positions[i * 2 + 1] - cy
              );
              const dj = Math.hypot(
                positions[j * 2] - cx,
                positions[j * 2 + 1] - cy
              );
              // Near a crossing the allowed separation ramps smoothly from
              // zero at the contact bubble's edge up to the full repulsion
              // distance - a hard cliff here torques twist loops until
              // they buckle and the crossing inverts, while too shallow a
              // ramp lets taut twists hug (slope 1.6 reaches full within
              // the eye of a taut twist without reintroducing the cliff).
              pairMinDist = Math.min(
                minDist,
                Math.max(0, (Math.max(di, dj) - exemption.radius) * EXEMPTION_TAPER_SLOPE)
              );
              if (pairMinDist < 1e-3) continue;
            }
          }

          const dx = positions[j * 2] - positions[i * 2];
          const dy = positions[j * 2 + 1] - positions[i * 2 + 1];
          const distSq = dx * dx + dy * dy;
          if (distSq >= pairMinDist * pairMinDist || distSq < EPSILON) {
            continue;
          }

          const dist = Math.sqrt(distSq);
          const push = ((pairMinDist - dist) / dist) * stiffness * 0.5;
          positions[i * 2] -= dx * push;
          positions[i * 2 + 1] -= dy * push;
          positions[j * 2] += dx * push;
          positions[j * 2 + 1] += dy * push;
        }
      }
    }
  }
}
