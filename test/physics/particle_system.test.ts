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
  it("builds chains covering every strand with paired crossing bindings", () => {
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

  it("keeps crossings coupled while bindings slide", () => {
    const { ps } = build(5);
    for (let i = 0; i < 600; i++) ps.step(1 / 60, 0);
    for (const c of ps.crossings) {
      expect(ps.crossingSeparation(c)).toBeLessThan(0.08);
    }
    // Ordering along each thread is preserved (no crossing swapped past
    // a neighbor): separations stay positive after long settling.
    for (const c of ps.crossings) {
      const { prev, next } = ps.passNeighbors(c.over);
      if (prev !== c.over && next !== c.over) {
        const len = ps.chains[c.over.chain].length;
        const fwd = (((c.over.ctrl - prev.ctrl) % len) + len) % len;
        expect(fwd).toBeGreaterThan(0.5);
      }
    }
  });

  it("relaxes without NaN", () => {
    const { ps } = build(5);
    for (let i = 0; i < 300; i++) {
      ps.step(1 / 60, 0);
    }
    for (let i = 0; i < ps.particleCount * 2; i++) {
      expect(Number.isFinite(ps.positions[i])).toBe(true);
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

  it("grab drags a particle toward the target; release reports a pluck", () => {
    const { ps } = build(5);
    for (let i = 0; i < 240; i++) ps.step(1 / 60, 0);

    const px = ps.positions[0];
    const py = ps.positions[1];
    const grabbed = ps.grab(px, py, 0.7);
    expect(grabbed).toBeGreaterThanOrEqual(0);
    expect(ps.grabbedParticle).toBe(grabbed);

    ps.dragTo(px + 1.5, py + 1.5);
    for (let i = 0; i < 30; i++) ps.step(1 / 60, 0);
    const dx = ps.positions[grabbed * 2] - px;
    const dy = ps.positions[grabbed * 2 + 1] - py;
    expect(Math.hypot(dx, dy)).toBeGreaterThan(0.8);

    const pluck = ps.release();
    expect(pluck).not.toBeNull();
    expect(pluck!.particle).toBe(grabbed);
    expect(pluck!.chain).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(pluck!.speed)).toBe(true);
    expect(ps.grabbedParticle).toBe(-1);
    expect(ps.chainArcLength(pluck!.chain)).toBeGreaterThan(0);
  });

  it("goes quiescent at rest and reports settle completion", () => {
    const { ps } = build(5);
    expect(ps.settleComplete).toBe(false);
    for (let i = 0; i < 900; i++) ps.step(1 / 60, 0);
    expect(ps.settleComplete).toBe(true);
    expect(ps.maxMove).toBeLessThan(5e-3);
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
