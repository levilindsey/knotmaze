import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import type { GenerationParams } from "../../src/core/types";

function gen(seed: number, overrides: Partial<GenerationParams> = {}) {
  return generateLatticeKnotwork({
    gridSize: 8,
    weaveDensity: 0.3,
    turnBias: 0.6,
    randSeed: seed,
    ...overrides,
  });
}

describe("maze thread", () => {
  it("selects a valid maze strand with a start/exit along it", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const g = gen(seed);
      const m = g.maze;
      expect(m).toBeDefined();
      if (!m) continue;

      expect(m.strand).toBeGreaterThanOrEqual(0);
      expect(m.strand).toBeLessThan(g.strands.length);

      const nodeCount = g.strands[m.strand].nodes.length - 1;
      expect(m.chainLen).toBe(nodeCount * 2);

      // ctrlStart is an even node control within the chain.
      expect(m.ctrlStart % 2).toBe(0);
      expect(m.ctrlStart).toBeGreaterThanOrEqual(0);
      expect(m.ctrlStart).toBeLessThan(m.chainLen);

      // A non-empty trace, no longer than the loop.
      expect(m.steps).toBeGreaterThan(0);
      expect(m.steps).toBeLessThanOrEqual(nodeCount);
    }
  });

  it("picks the longest strand as the maze thread", () => {
    const g = gen(7);
    const longest = g.strands.reduce(
      (bi, s, i, arr) => (s.nodes.length > arr[bi].nodes.length ? i : bi),
      0
    );
    expect(g.maze!.strand).toBe(longest);
  });

  it("traces the whole strand except the one hidden cut edge", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const m = gen(seed).maze!;
      const nodeCount = m.chainLen / 2;
      expect(m.steps).toBe(nodeCount - 1);
    }
  });

  it("is deterministic per seed", () => {
    expect(gen(42).maze).toEqual(gen(42).maze);
  });
});
