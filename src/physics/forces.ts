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

// Per-particle registered-crossing membership, for the 2D anti-riding
// floor: 4 slots per particle, each `crossing * 2 + side` (-1 empty) with
// a coverage weight in `cov` (1 at the pass, fading with ctrl distance).
// A segment PAIR is "covered" when one endpoint sits on a crossing's over
// pass and the other on the SAME crossing's under pass - the pair is then
// inside that crossing's rendered neighborhood (the erase gap), where 2D
// closeness at any angle has a rendering. Pair-aware by construction: a
// third thread near the crossing shares no membership and gets no relief
// (the P3.24 sink lesson).
export interface PassCover {
  slot: Int32Array;
  cov: Float32Array;
}

// The anti-riding floor above the ribbon-width line is COSMETIC margin
// (COLLISION_MARGIN headroom, not renderability). Correct it gently:
// a full-stiffness fight over margin against a packed weave that has no
// room to give was a measured limit-cycle pump (standing 3e-2 pushes at
// pairs pinned at 90% of the floor - the knot could never sleep).
const RIDE_SOFT_STIFFNESS = 0.15;
// TWO-TIER hard zone: full authority for the first HARD_SNAP of
// deficit, gentle (RIDE_SOFT_STIFFNESS) beyond. Both single-tier laws
// failed measurably: a flat cap (1.2e-2) lost the tug-of-war against
// bd 1.75 bending at hairpin tips - the equilibrium parked 10-15%
// below width and rendered as a lengthwise merge seam (user repro) -
// while unbounded authority rang for 90+ sim-s on violent wounds
// whose overlap the slack-0 geometry cannot undo quickly. HARD_SNAP
// must exceed the largest per-substep deficit an opposing constraint
// can re-create (bending at bd 1.75 re-pulls ~2.4e-2/substep) so
// standing tug-of-wars are WON and held at width; deep merges beyond
// it grind at the bounded rate that measurably converges (~sim+49 on
// the harshest headless wound). A violation-driven local weld release
// was also tried and REJECTED: it fed the loud attractor (5 min of
// mv 1e-1 - 3e-1, pending violations never draining).
const HARD_SNAP = 0.04;

// Standing hard-zone violations of the anti-riding floor, reported to
// the caller: [x, y, depth] rows, filled during the pass that the
// caller designates (the last final-authority sweep - substep-end
// truth). Deeper than a Gauss-Seidel crumb only.
export interface ViolationList {
  data: Float32Array;
  n: number;
}
const VIOLATION_MIN_DEPTH = 0.03;

export function applySegmentCollision(
  positions: Float32Array,
  zPos: Float32Array,
  particleCount: number,
  topology: SegmentTopology,
  minDist: number,
  // Ribbon width: the true 2D renderability line for the riding floor.
  renderWidth: number,
  stiffness: number,
  // Registered crossing contact points [x, y] - collector dedup only.
  contacts: Float32Array,
  passCover: PassCover | undefined,
  collector?: EmergentCollector,
  violations?: ViolationList
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
          // just paints one ribbon onto the other). Overlap is legal
          // ONLY where a rendered crossing covers it:
          // - a pair that PROPERLY INTERSECTS at a collectible angle
          //   (the emergent cutoff) IS a rendered crossing - exempt;
          // - a pair inside the coverage of a registered or emergent
          //   crossing (see PassCover) is inside that crossing's erase
          //   neighborhood - exempt, fading with distance;
          // - everything else gets the full width floor, with only a
          //   narrow angle ramp at the steep end (zero above sin 0.8)
          //   so threads can still pass transversally across each other
          //   to FORM crossings (they ride over in z, then settle into
          //   an emergent crossing). The P3.30 ramp (zero by 0.55) left
          //   a lenient band at sin 0.35-0.55 where tunneled tangles
          //   from violent play welded at a fraction of the width with
          //   no rendered gap - the measured post-play rider class.
          //
          // Two further refinements, from a measured fresh-settle limit
          // cycle (3 of 8 fat-width seeds could never sleep):
          // 1. CROSSING COVERAGE (above): the floor may never demand
          //    what a crossing's own geometry forbids - arm segments
          //    converge at the crossing point, so the neighborhood the
          //    erase gap renders is exempt. Pair-scoped: one endpoint
          //    near one pass, the other near the SAME crossing's other
          //    pass. The unconditional 3D test still governs - a
          //    covered pair can never interpenetrate, only render close.
          // 2. TWO-ZONE STIFFNESS: below the ribbon width the floor is
          //    a renderability line and corrects at full authority;
          //    between width and the margin target it is cosmetic and
          //    corrects at RIDE_SOFT_STIFFNESS, so a packed weave that
          //    cannot yield the full margin holds a sub-stick-threshold
          //    standoff instead of ringing forever.
          const q1x = p1x + d1x * s;
          const q1y = p1y + d1y * s;
          const q2x = p2x + d2x * t;
          const q2y = p2y + d2y * t;
          const lenProd2 = Math.sqrt(a * e);
          const sinAngle =
            lenProd2 > 1e-12 ? Math.abs(denom2) / lenProd2 : 1;
          const rendersAsCrossing = properU >= 0 && sinAngle > 0.25;
          if (!rendersAsCrossing) {
            const par = Math.max(0, Math.min(1, (0.8 - sinAngle) / 0.25));
            let px = q1x - q2x;
            let py = q1y - q2y;
            const d2d = Math.hypot(px, py);
            if (par > 0 && d2d < minDist * par && d2d > 1e-9) {
              let cover = 0;
              if (passCover) {
                const { slot, cov } = passCover;
                const ends = [i, i2, j, j2];
                for (let ea = 0; ea < 2 && cover < 1; ea++) {
                  const sa = ends[ea] * 4;
                  for (let eb = 2; eb < 4 && cover < 1; eb++) {
                    const sb = ends[eb] * 4;
                    for (let u = 0; u < 4; u++) {
                      const va = slot[sa + u];
                      if (va < 0) break;
                      for (let v = 0; v < 4; v++) {
                        const vb = slot[sb + v];
                        if (vb < 0) break;
                        if ((va >> 1) === (vb >> 1) && (va & 1) !== (vb & 1)) {
                          const cc = Math.min(cov[sa + u], cov[sb + v]);
                          if (cc > cover) cover = cc;
                        }
                      }
                    }
                  }
                }
              }
              const scale = par * (1 - cover);
              const target = minDist * scale;
              if (d2d < target) {
                const hardDef = Math.max(0, renderWidth * scale - d2d);
                if (
                  violations &&
                  hardDef > VIOLATION_MIN_DEPTH &&
                  violations.n * 3 < violations.data.length
                ) {
                  const o = violations.n++ * 3;
                  violations.data[o] = (q1x + q2x) / 2;
                  violations.data[o + 1] = (q1y + q2y) / 2;
                  violations.data[o + 2] = hardDef;
                }
                const push2 =
                  (Math.min(hardDef, HARD_SNAP) * stiffness +
                    Math.max(0, hardDef - HARD_SNAP) * RIDE_SOFT_STIFFNESS +
                    (target - d2d - hardDef) * RIDE_SOFT_STIFFNESS) *
                  0.5;
                px /= d2d;
                py /= d2d;
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
