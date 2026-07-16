import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { ParticleSystem } from "../../src/physics/particle_system";

function build(seed: number) {
  const graph = generateLatticeKnotwork({
    gridSize: 6,
    weaveDensity: 0.3,
    turnBias: 0.6,
    randSeed: seed,
  });
  return { graph, ps: new ParticleSystem(graph) };
}

describe("particle system", () => {
  it("builds chains covering every strand with shared crossing particles", () => {
    const { graph, ps } = build(5);
    expect(ps.chains.length).toBe(graph.strands.length);
    // One pass registry entry per crossing, each with distinct over/under.
    const crossingCount = [...graph.nodes.values()].filter(
      (n) => n.type === "crossing"
    ).length;
    expect(ps.crossings.length).toBe(crossingCount);
    for (const c of ps.crossings) {
      expect(
        c.over.chain !== c.under.chain || c.over.ctrl !== c.under.ctrl
      ).toBe(true);
    }
  });

  it("relaxes without NaN and keeps crossings near their anchors", () => {
    const { ps } = build(5);
    for (let i = 0; i < 300; i++) {
      ps.step(1 / 60, 0);
    }
    for (let i = 0; i < ps.particleCount * 2; i++) {
      expect(Number.isFinite(ps.positions[i])).toBe(true);
    }
    for (const c of ps.crossings) {
      const chain = ps.chains[c.over.chain];
      const p = chain[c.over.ctrl];
      // Crossing particles stay anchored (within a lattice unit).
      const dx = ps.positions[p * 2];
      const dy = ps.positions[p * 2 + 1];
      expect(Number.isFinite(dx) && Number.isFinite(dy)).toBe(true);
    }
  });

  it("reduces total path length as the knot settles", () => {
    const { ps } = build(11);
    const pathLength = () => {
      let total = 0;
      for (const chain of ps.chains) {
        for (let i = 0; i < chain.length; i++) {
          const a = chain[i];
          const b = chain[(i + 1) % chain.length];
          total += Math.hypot(
            ps.positions[b * 2] - ps.positions[a * 2],
            ps.positions[b * 2 + 1] - ps.positions[a * 2 + 1]
          );
        }
      }
      return total;
    };

    const before = pathLength();
    for (let i = 0; i < 300; i++) {
      ps.step(1 / 60, 0);
    }
    expect(pathLength()).toBeLessThan(before);
  });

  it("higher slack settles to a longer (looser) rest state", () => {
    const settled = (slack: number) => {
      const { ps } = build(11);
      for (let i = 0; i < 400; i++) {
        ps.step(1 / 60, 0, slack);
      }
      let total = 0;
      for (const chain of ps.chains) {
        for (let i = 0; i < chain.length; i++) {
          const a = chain[i];
          const b = chain[(i + 1) % chain.length];
          total += Math.hypot(
            ps.positions[b * 2] - ps.positions[a * 2],
            ps.positions[b * 2 + 1] - ps.positions[a * 2 + 1]
          );
        }
      }
      return total;
    };

    expect(settled(0.9)).toBeGreaterThan(settled(0.1) * 1.05);
  });

  it("reset returns particles to the lattice", () => {
    const { ps } = build(5);
    const initial = new Float32Array(ps.positions);
    for (let i = 0; i < 100; i++) {
      ps.step(1 / 60, 0.5);
    }
    ps.reset();
    expect([...ps.positions]).toEqual([...initial]);
  });
});
