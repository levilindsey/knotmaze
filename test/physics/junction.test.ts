import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { ParticleSystem } from "../../src/physics/particle_system";

// P4 maze mode, migration Stage 4: degree-3 junction (merge) physics.
//
// Several open-chain ARM terminals are fused into a merge: rest-0 springs pull
// them to coincidence, a stem pair is bent straight through, and the arms are
// exempted from colliding with each other at the merge (junctionOf). Knot mode
// registers no junctions, so this is inert there (byte_identity.test.ts guards
// it); here we build a synthetic Y and check it holds.

function build(seed: number): ParticleSystem {
  const graph = generateLatticeKnotwork({
    gridSize: 6,
    weaveDensity: 0.3,
    turnBias: 0.6,
    randSeed: seed,
  });
  return new ParticleSystem(graph);
}

function longestChain(ps: ParticleSystem): number {
  let best = 0;
  let bestLen = -1;
  ps.chains.forEach((c, i) => {
    if (c.length > bestLen) {
      bestLen = c.length;
      best = i;
    }
  });
  return best;
}

function pos(ps: ParticleSystem, p: number): [number, number] {
  return [ps.positions[p * 2], ps.positions[p * 2 + 1]];
}

function dist(ps: ParticleSystem, a: number, b: number): number {
  return Math.hypot(
    ps.positions[a * 2] - ps.positions[b * 2],
    ps.positions[a * 2 + 1] - ps.positions[b * 2 + 1]
  );
}

describe("degree-3 junction (P4 maze physics)", () => {
  it("fuses three arms into a stable merge with a straight-through stem", () => {
    const ps = build(5);
    const a = longestChain(ps);
    const chainA = ps.chains[a];

    // Two arms from chain A's seam (adjacent, low-stretch loose ends).
    let brkA = chainA.length >> 1;
    if (brkA % 2 === 0) brkA += 1;
    const t0 = chainA[brkA];
    const in0 = chainA[(brkA - 1 + chainA.length) % chainA.length];
    const t1 = chainA[(brkA + 1) % chainA.length];
    const in1 = chainA[(brkA + 2) % chainA.length];

    // Third arm: the nearest particle on another chain to the seam midpoint.
    const mx = (ps.positions[t0 * 2] + ps.positions[t1 * 2]) / 2;
    const my = (ps.positions[t0 * 2 + 1] + ps.positions[t1 * 2 + 1]) / 2;
    let bChain = -1;
    let bSlot = -1;
    let bestD = Infinity;
    ps.chains.forEach((chain, ci) => {
      if (ci === a) return;
      for (let s = 1; s < chain.length - 1; s++) {
        const p = chain[s];
        const d = (ps.positions[p * 2] - mx) ** 2 + (ps.positions[p * 2 + 1] - my) ** 2;
        if (d < bestD) {
          bestD = d;
          bChain = ci;
          bSlot = s;
        }
      }
    });
    expect(bChain).toBeGreaterThanOrEqual(0);
    const chainB = ps.chains[bChain];
    const t2 = chainB[bSlot];
    const in2 = chainB[bSlot - 1];

    // Carve both strands open (free terminals), then fuse the three.
    ps.openChain(a, brkA, null, null);
    ps.openChain(bChain, bSlot, null, null);

    // Pre-place the three terminals at their centroid so the coincidence
    // springs start satisfied (no violent snap of chain B across the knot).
    const cx = (ps.positions[t0 * 2] + ps.positions[t1 * 2] + ps.positions[t2 * 2]) / 3;
    const cy = (ps.positions[t0 * 2 + 1] + ps.positions[t1 * 2 + 1] + ps.positions[t2 * 2 + 1]) / 3;
    for (const t of [t0, t1, t2]) {
      ps.positions[t * 2] = cx;
      ps.positions[t * 2 + 1] = cy;
    }

    ps.addJunction(
      [
        { terminal: t0, inward: in0 },
        { terminal: t1, inward: in1 },
        { terminal: t2, inward: in2 },
      ],
      [0, 1] // stem = chain A's two arms, straight through; chain B branches.
    );
    expect(ps.junctions.length).toBe(1);
    expect(ps.hasCarve).toBe(true);

    for (let i = 0; i < 900; i++) ps.step(1 / 60);

    // Everything finite and bounded.
    for (let i = 0; i < ps.particleCount; i++) {
      expect(Number.isFinite(ps.positions[i * 2])).toBe(true);
      expect(Math.abs(ps.positions[i * 2])).toBeLessThan(1000);
      expect(Math.abs(ps.positions[i * 2 + 1])).toBeLessThan(1000);
    }

    // The three terminals stayed coincident (rigid merge).
    expect(dist(ps, t0, t1)).toBeLessThan(0.25);
    expect(dist(ps, t0, t2)).toBeLessThan(0.25);

    // The stem runs roughly straight THROUGH the merge: the two stem inward
    // particles sit on opposite sides (their bearings from the merge point
    // roughly oppose), while the branch arm points elsewhere.
    const m: [number, number] = pos(ps, t0);
    const bearing = (p: number): [number, number] => {
      const dx = ps.positions[p * 2] - m[0];
      const dy = ps.positions[p * 2 + 1] - m[1];
      const l = Math.hypot(dx, dy) || 1;
      return [dx / l, dy / l];
    };
    const [ax, ay] = bearing(in0);
    const [bx, by] = bearing(in1);
    const stemDot = ax * bx + ay * by;
    expect(stemDot).toBeLessThan(0); // straighter than a right angle.

    // Settled (no runaway energy from the merge).
    expect(ps.maxMove).toBeLessThan(0.05);
  });

  it("registers no junctions in knot mode", () => {
    const ps = build(5);
    expect(ps.junctions.length).toBe(0);
    expect(ps.hasCarve).toBe(false);
  });
});
