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

// Crossing zone tags: which registered crossings each particle belongs
// to, up to ZONE_SLOTS per particle (-1 = empty, first slots fill
// first). Dense weaves put 3+ crossings within a zone window of one
// particle; the old two-slot/last-writer-evicts table dropped tags as
// bindings slid, which flickered the depth-exemption gate - pairs sank
// while covered, lost the tag, and froze as canceled standoffs ~0.2
// apart (threads visibly merged). The tags gate the depth exemption
// (collision + repulsion) and dedup the emergent collector.
export const ZONE_SLOTS = 4;
export interface CrossingZones {
  zones: Int32Array; // ZONE_SLOTS crossing ids per particle, -1 = empty.
  contacts: Float32Array; // Per-crossing contact point [x, y].
}

// Shared registered crossing of two particles, or -1.
function sharedZone(zones: Int32Array, i: number, j: number): number {
  for (let a = 0; a < ZONE_SLOTS; a++) {
    const za = zones[i * ZONE_SLOTS + a];
    if (za < 0) break;
    for (let b = 0; b < ZONE_SLOTS; b++) {
      const zb = zones[j * ZONE_SLOTS + b];
      if (zb < 0) break;
      if (za === zb) return za;
    }
  }
  return -1;
}

// Hard capsule collision between thread segments, DEPTH-AWARE: the knot
// is quasi-3D, with per-particle depth z assigned from the crossing
// diagram (over passes lift, under passes sink; see the depth field in
// ParticleSystem). Two segments are treated as 3D capsules: the required
// 2D separation is sqrt(minDist^2 - dz^2), so exactly where the diagram
// says the threads pass over/under each other the floor vanishes, and it
// recovers smoothly as material moves away from the crossing along
// either thread - at ANY crossing angle. This replaces the old circular
// contact-bubble exemption, whose fixed radius mismatched the true
// overlap region (margin/sin(angle) long) at oblique crossings: the
// mismatch both welded threads tangentially (full-vector corrections in
// the annulus) and fought the geometry in a standing conflict.
// This is what point repulsion cannot guarantee: points can spread
// while the segments between them still overlap.
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
  depths: Float32Array,
  zones: CrossingZones,
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

          // Skip immediate same-chain neighbors (they legitimately
          // connect and overlap at shared endpoints). Only 2: farther
          // same-chain pairs are policed like any other - this is what
          // keeps kink loops and hairpin tips from collapsing flat. Depth
          // exempts the pairs that genuinely cross.
          if (chainOf[i] === chainOf[j]) {
            const len = chainLen[i];
            const d = Math.abs(ctrlOf[i] - ctrlOf[j]);
            if (Math.min(d, len - d) <= 2) continue;
          }

          // Shared registered crossing: gates the depth exemption and
          // dedups the collector.
          let sharedKx = Number.NaN;
          let sharedKy = Number.NaN;
          const shared = sharedZone(zones.zones, i, j);
          if (shared >= 0) {
            sharedKx = zones.contacts[shared * 2];
            sharedKy = zones.contacts[shared * 2 + 1];
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

          // Proper segment-segment intersection test, shared by the
          // emergent collector and the registered-crossing exemption.
          const denom2 = d1x * d2y - d1y * d2x;
          let properU = -1;
          let properV = -1;
          if (Math.abs(denom2) > 1e-12) {
            const u = (-rx * d2y + ry * d2x) / denom2;
            const v = (-rx * d1y + ry * d1x) / denom2;
            if (u > 0 && u < 1 && v > 0 && v < 1) {
              properU = u;
              properV = v;
            }
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
            // Transversal crossings only: |sin| of the crossing angle
            // >= 0.25. Taut knots hold dozens of GRAZING micro-overlaps
            // (near-parallel threads pressed together by the collision
            // floor penetrate by solver tolerance) - those are not visual
            // crossings and gapping them would be wrong.
            const lenProd = Math.sqrt(a * e);
            if (properU >= 0 && Math.abs(denom2) > 0.25 * lenProd) {
              const ix = p1x + d1x * properU;
              const iy = p1y + d1y * properU;
              const nearRegistered =
                shared >= 0 &&
                Math.hypot(ix - sharedKx, iy - sharedKy) < 0.8;
              if (!nearRegistered) {
                const idx = collector.n * 4;
                collector.data[idx] = i;
                collector.data[idx + 1] = properU;
                collector.data[idx + 2] = j;
                collector.data[idx + 3] = properV;
                collector.n++;
              }
            }
          }

          // (Exempting properly-intersecting shared-crossing pairs from
          // the push was tried against the post-play jiggle and made it
          // WORSE: the intersect/separate boundary is binary, so collision
          // flickered on/off - a new discontinuity, mv spikes 3.5e-1.)

          // Depth-aware floor at the closest points: 3D capsule contact.
          // ONLY for pairs sharing a registered crossing's zone: the depth
          // field is per-particle and pair-blind, so without the gate any
          // THIRD thread near a crossing inherited a reduced floor and
          // could sink into the crossing pair with no gap rendered
          // (grazing overlaps are also below the emergent collector's
          // transversality cutoff). Non-shared pairs get the full width
          // floor, exactly like the pre-depth lens.
          let pairMinDistSq = minDist * minDist;
          if (shared >= 0) {
            const zi = depths[i] + (depths[i2] - depths[i]) * s;
            const zj = depths[j] + (depths[j2] - depths[j]) * t;
            const dz = zi - zj;
            pairMinDistSq -= dz * dz;
            if (pairMinDistSq <= 1e-9) continue;
          }

          const q1x = p1x + d1x * s;
          const q1y = p1y + d1y * s;
          const q2x = p2x + d2x * t;
          const q2y = p2y + d2y * t;
          let nx = q1x - q2x;
          let ny = q1y - q2y;
          const dist = Math.hypot(nx, ny);
          if (dist * dist >= pairMinDistSq || dist < 1e-9) continue;
          nx /= dist;
          ny /= dist;

          const pairMinDist = Math.sqrt(pairMinDistSq);
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
// Depth-aware like collision, and gated the same way: only a pair sharing
// a registered crossing's zone scales its range by
// sqrt(1 - (dz/depthRange)^2) (depthRange = the collision margin - a pair
// fully over/under each other needs no spacing at all); everyone else
// gets full spacing.
export function applyRepulsion(
  positions: Float32Array,
  particleCount: number,
  minDist: number,
  stiffness: number,
  excludedPairs: Set<number>,
  depths: Float32Array,
  depthRange: number,
  zones: CrossingZones
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

          let pairMinDistSq = minDist * minDist;
          if (sharedZone(zones.zones, i, j) >= 0) {
            const dz = depths[j] - depths[i];
            const scaleSq = 1 - (dz * dz) / (depthRange * depthRange);
            if (scaleSq <= 1e-6) continue;
            pairMinDistSq *= scaleSq;
          }

          const dx = positions[j * 2] - positions[i * 2];
          const dy = positions[j * 2 + 1] - positions[i * 2 + 1];
          const distSq = dx * dx + dy * dy;
          if (distSq >= pairMinDistSq || distSq < EPSILON) {
            continue;
          }

          const dist = Math.sqrt(distSq);
          const pairMinDist = Math.sqrt(pairMinDistSq);
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
