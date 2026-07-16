import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import {
  checkStructure,
  checkAlternation,
  checkStrandPartition,
} from "../../src/core/tangle_graph";
import { NODE_TYPE } from "../../src/core/types";
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

describe("lattice grower", () => {
  it("produces structurally valid alternating knots across many seeds", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const graph = gen(seed);

      expect(graph.nodes.size).toBeGreaterThan(0);
      expect(checkStructure(graph)).toBe(true);
      expect(checkAlternation(graph)).toBe(true);
      expect(checkStrandPartition(graph)).toBe(true);

      expect(graph.strands.length).toBeGreaterThan(0);
      for (const strand of graph.strands) {
        expect(strand.isClosed).toBe(true);
        expect(strand.nodes[0]).toBe(strand.nodes[strand.nodes.length - 1]);
        expect(strand.edgeIds.length).toBe(strand.nodes.length - 1);
      }

      // The spanning tree alone guarantees gridSize^2 - 1 open passages.
      const crossings = [...graph.nodes.values()].filter(
        (n) => n.type === NODE_TYPE.CROSSING
      );
      expect(crossings.length).toBeGreaterThanOrEqual(8 * 8 - 1);
    }
  });

  it("holds invariants at param extremes", () => {
    for (const weaveDensity of [0, 1]) {
      for (const turnBias of [0, 1]) {
        for (const gridSize of [2, 5, 16]) {
          const graph = gen(123, { weaveDensity, turnBias, gridSize });
          expect(checkStructure(graph)).toBe(true);
          expect(checkAlternation(graph)).toBe(true);
          expect(checkStrandPartition(graph)).toBe(true);
        }
      }
    }
  });

  it("is deterministic for a given seed", () => {
    const a = gen(777);
    const b = gen(777);
    expect(b.nodes.size).toBe(a.nodes.size);
    expect(b.edges.size).toBe(a.edges.size);
    expect(b.strands.map((s) => s.edgeIds.join(","))).toEqual(
      a.strands.map((s) => s.edgeIds.join(","))
    );
    expect([...b.nodes.values()]).toEqual([...a.nodes.values()]);
  });

  it("produces distinct knots for distinct seeds", () => {
    const a = gen(1);
    const b = gen(2);
    const serialize = (g: typeof a) =>
      [...g.nodes.values()].map((n) => `${n.type}:${n.latticePos}`).join(";");
    expect(serialize(a)).not.toBe(serialize(b));
  });

  it("weave density 1 opens every interior wall (full plait)", () => {
    const size = 6;
    const graph = gen(9, { gridSize: size, weaveDensity: 1 });
    const crossings = [...graph.nodes.values()].filter(
      (n) => n.type === NODE_TYPE.CROSSING
    );
    expect(crossings.length).toBe(2 * size * (size - 1));
  });
});
