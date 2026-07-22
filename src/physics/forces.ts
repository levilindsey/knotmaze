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


// Hard capsule collision between thread segments in TRUE 3D: z is a
// real simulated per-particle coordinate (see ParticleSystem.zPos - the
// crossing diagram supplies soft z TARGETS, over passes up / under
// passes down). Collision is UNCONDITIONAL: no zones, no exemptions, no
// falloff shapes - two capsules may never come within minDist in 3D, at
// any thread width. Where the 2D layout squeezes two threads together
// they resolve by separating in z (one goes over), which is renderable
// by definition: that is just a crossing. Every "exemption" mechanism
// this replaced (circular lens, derived depth field with quartic
// falloff, zone gating) eventually leaked - an exempt region is a hole,
// and holes admit bugs. The xy components of a correction go to the xy
// state, the z component to zPos.
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
  zPos: Float32Array,
  particleCount: number,
  topology: SegmentTopology,
  minDist: number,
  stiffness: number,
  // Registered crossing contact points [x, y] - collector dedup only.
  contacts: Float32Array,
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
          // keeps kink loops and hairpin tips from collapsing flat.
          if (chainOf[i] === chainOf[j]) {
            const len = chainLen[i];
            const d = Math.abs(ctrlOf[i] - ctrlOf[j]);
            if (Math.min(d, len - d) <= 2) continue;
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

          // Proper intersection: a real visual crossing. Register it as
          // emergent unless it belongs to a registered crossing (within
          // 0.8 of any registered contact - those already render).
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
              let nearRegistered = false;
              for (let cc = 0; cc * 2 < contacts.length; cc++) {
                if (
                  Math.hypot(ix - contacts[cc * 2], iy - contacts[cc * 2 + 1]) <
                  0.8
                ) {
                  nearRegistered = true;
                  break;
                }
              }
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

          // TRANSVERSALITY-GATED 2D floor: threads may overlap in the
          // plane only where they CROSS, never where they RUN TOGETHER.
          // A 2D-rendered knot has no vocabulary for tangential overlap
          // (an over/under crossing gets an erase gap; parallel riding
          // just paints one ribbon onto the other), so the required 2D
          // separation scales with parallelism: full floor when the
          // local tangents are parallel - regardless of z - fading to
          // zero by |sin| = 0.5 (~30 deg), where the pair is a genuine
          // crossing and the 3D test below governs. Stateless local
          // geometry: nothing to mis-tag, nothing to lag.
          const q1x = p1x + d1x * s;
          const q1y = p1y + d1y * s;
          const q2x = p2x + d2x * t;
          const q2y = p2y + d2y * t;
          {
            const lenProd2 = Math.sqrt(a * e);
            const sinAngle =
              lenProd2 > 1e-12 ? Math.abs(denom2) / lenProd2 : 1;
            const par = Math.max(0, Math.min(1, (0.55 - sinAngle) / 0.25));
            const req2 = minDist * par;
            let px = q1x - q2x;
            let py = q1y - q2y;
            const d2d = Math.hypot(px, py);
            if (req2 > 1e-6 && d2d < req2 && d2d > 1e-9) {
              px /= d2d;
              py /= d2d;
              const push2 = (req2 - d2d) * stiffness * 0.5;
              positions[i * 2] += px * push2 * (1 - s);
              positions[i * 2 + 1] += py * push2 * (1 - s);
              positions[i2 * 2] += px * push2 * s;
              positions[i2 * 2 + 1] += py * push2 * s;
              positions[j * 2] -= px * push2 * (1 - t);
              positions[j * 2 + 1] -= py * push2 * (1 - t);
              positions[j2 * 2] -= px * push2 * t;
              positions[j2 * 2 + 1] -= py * push2 * t;
            }
          }

          // TRUE-3D capsule contact at the closest points: z lerped from
          // the simulated per-particle z. Unconditional - no exemptions.
          const zi = zPos[i] + (zPos[i2] - zPos[i]) * s;
          const zj = zPos[j] + (zPos[j2] - zPos[j]) * t;
          let nx = q1x - q2x;
          let ny = q1y - q2y;
          let nz = zi - zj;
          const dist = Math.hypot(nx, ny, nz);
          if (dist >= minDist) continue;
          if (dist < 1e-9) {
            // Fully coincident: resolve straight up/down, deterministic.
            nx = 0;
            ny = 0;
            nz = chainOf[i] <= chainOf[j] ? 1 : -1;
          } else {
            nx /= dist;
            ny /= dist;
            nz /= dist;
          }

          const push = (minDist - dist) * stiffness * 0.5;
          // Distribute to endpoints by closest-point weights; xy goes to
          // the plane state, z to the depth state.
          positions[i * 2] += nx * push * (1 - s);
          positions[i * 2 + 1] += ny * push * (1 - s);
          positions[i2 * 2] += nx * push * s;
          positions[i2 * 2 + 1] += ny * push * s;
          positions[j * 2] -= nx * push * (1 - t);
          positions[j * 2 + 1] -= ny * push * (1 - t);
          positions[j2 * 2] -= nx * push * t;
          positions[j2 * 2 + 1] -= ny * push * t;
          zPos[i] += nz * push * (1 - s);
          zPos[i2] += nz * push * s;
          zPos[j] -= nz * push * (1 - t);
          zPos[j2] -= nz * push * t;
        }
      }
    }
  }
}

// Soft minimum-distance repulsion between non-neighboring particles, using a
// uniform spatial hash. Keeps parallel threads from visually overlapping.
// TRUE 3D like collision: distance and push direction include z, so a
// genuine over/under pair (large dz) is already spaced and gets little or
// no planar push.
export function applyRepulsion(
  positions: Float32Array,
  zPos: Float32Array,
  particleCount: number,
  minDist: number,
  stiffness: number,
  excludedPairs: Set<number>
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

          const dx = positions[j * 2] - positions[i * 2];
          const dy = positions[j * 2 + 1] - positions[i * 2 + 1];
          const dz = zPos[j] - zPos[i];
          const distSq = dx * dx + dy * dy + dz * dz;
          if (distSq >= minDist * minDist || distSq < EPSILON) {
            continue;
          }

          const dist = Math.sqrt(distSq);
          const push = ((minDist - dist) / dist) * stiffness * 0.5;
          positions[i * 2] -= dx * push;
          positions[i * 2 + 1] -= dy * push;
          positions[j * 2] += dx * push;
          positions[j * 2 + 1] += dy * push;
          zPos[i] -= dz * push;
          zPos[j] += dz * push;
        }
      }
    }
  }
}
