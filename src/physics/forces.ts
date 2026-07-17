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

// Soft minimum-distance repulsion between non-neighboring particles, using a
// uniform spatial hash. Keeps parallel threads from visually overlapping.
// `zones` marks particles inside a crossing's binding windows: two particles
// in the SAME zone are the two threads meeting at that crossing, which are
// supposed to touch, so they skip repulsion.
export function applyRepulsion(
  positions: Float32Array,
  particleCount: number,
  minDist: number,
  stiffness: number,
  excludedPairs: Set<number>,
  zones?: Int32Array
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

  const minDistSq = minDist * minDist;

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
          if (zones && zones[i] >= 0 && zones[i] === zones[j]) continue;

          const dx = positions[j * 2] - positions[i * 2];
          const dy = positions[j * 2 + 1] - positions[i * 2 + 1];
          const distSq = dx * dx + dy * dy;
          if (distSq >= minDistSq || distSq < EPSILON) continue;

          const dist = Math.sqrt(distSq);
          const push = ((minDist - dist) / dist) * stiffness * 0.5;
          positions[i * 2] -= dx * push;
          positions[i * 2 + 1] -= dy * push;
          positions[j * 2] += dx * push;
          positions[j * 2 + 1] += dy * push;
        }
      }
    }
  }
}
