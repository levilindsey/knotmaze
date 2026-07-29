import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { ParticleSystem } from "../../src/physics/particle_system";

// P4 maze mode, migration Stage 1: open-chain + anchored-end physics.
//
// A closed strand can be carved OPEN (its cyclic seam removed) with the two
// flanking particles pinned to fixed off-screen anchors - the physical
// foundation for the maze thread's real loose ends. Knot mode never carves,
// so this capability is inert there (guarded byte-for-byte by
// byte_identity.test.ts); here we exercise it directly.

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

function allFinite(pos: Float32Array): boolean {
  for (let i = 0; i < pos.length; i++) {
    if (!Number.isFinite(pos[i])) return false;
  }
  return true;
}

describe("open-chain + anchored ends (P4 maze physics)", () => {
  it("knot mode is uncarved (hasCarve false, nothing anchored)", () => {
    const ps = build(5);
    expect(ps.hasCarve).toBe(false);
    for (let i = 0; i < ps.particleCount; i++) {
      expect(ps.isAnchored(i)).toBe(false);
    }
  });

  it("settles with the seam removed and the loose ends pinned", () => {
    const ps = build(5);
    const c = longestChain(ps);
    const chain = ps.chains[c];
    // Break at an interior edge midpoint (odd slot); its two flanking
    // particles become the loose ends.
    let brk = chain.length >> 1;
    if (brk % 2 === 0) brk += 1;
    const pa = chain[brk];
    const pb = chain[(brk + 1) % chain.length];

    // Anchor each loose end a gentle 2 units OUTWARD from the knot centroid,
    // so the springs start near rest (no violent yank) yet the ends sit at
    // off-lattice points the closed loop never held.
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < ps.particleCount; i++) {
      cx += ps.positions[i * 2];
      cy += ps.positions[i * 2 + 1];
    }
    cx /= ps.particleCount;
    cy /= ps.particleCount;
    const outward = (p: number): [number, number] => {
      const dx = ps.positions[p * 2] - cx;
      const dy = ps.positions[p * 2 + 1] - cy;
      const d = Math.hypot(dx, dy) || 1;
      return [ps.positions[p * 2] + (dx / d) * 2, ps.positions[p * 2 + 1] + (dy / d) * 2];
    };
    const anchorA = outward(pa);
    const anchorB = outward(pb);

    ps.openChain(c, brk, anchorA, anchorB);
    expect(ps.hasCarve).toBe(true);
    expect(ps.isAnchored(pa)).toBe(true);
    expect(ps.isAnchored(pb)).toBe(true);

    for (let i = 0; i < 900; i++) ps.step(1 / 60);

    // No NaN/Inf anywhere.
    expect(allFinite(ps.positions)).toBe(true);

    // The loose ends stay pinned exactly at their anchors.
    expect(ps.positions[pa * 2]).toBeCloseTo(anchorA[0], 6);
    expect(ps.positions[pa * 2 + 1]).toBeCloseTo(anchorA[1], 6);
    expect(ps.positions[pb * 2]).toBeCloseTo(anchorB[0], 6);
    expect(ps.positions[pb * 2 + 1]).toBeCloseTo(anchorB[1], 6);

    // It reaches a quiescent rest (no runaway energy from the open seam).
    expect(ps.maxMove).toBeLessThan(0.05);

    // Nothing explodes.
    for (let i = 0; i < ps.particleCount; i++) {
      expect(Math.abs(ps.positions[i * 2])).toBeLessThan(1000);
      expect(Math.abs(ps.positions[i * 2 + 1])).toBeLessThan(1000);
    }
  });
});
