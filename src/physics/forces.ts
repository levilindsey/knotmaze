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
                Math.max(0, (Math.max(di, dj) - exemption.radius) * 1.6)
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
