import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import type { MazeParams, MazePlan } from "../../src/core/maze_plan";
import { applyMazePlan } from "../../src/core/maze_apply";
import {
  checkStructure,
  checkAlternation,
  checkStrandPartition,
} from "../../src/core/tangle_graph";
import { NODE_TYPE } from "../../src/core/types";
import type { TangleGraph } from "../../src/core/types";

// P4 Stage 5d: applying the maze plan to the tangle graph.

const SEEDS = [5, 42, 1234, 2773729296, 99];

const P = (over: Partial<MazeParams>): MazeParams => ({
  ...DEFAULT_MAZE_PARAMS,
  ...over,
});

function applied(
  seed: number,
  params: MazeParams = DEFAULT_MAZE_PARAMS
): { g: TangleGraph; plan: MazePlan } {
  const g = generateLatticeKnotwork({
    gridSize: 8,
    weaveDensity: 0.3,
    turnBias: 0.6,
    randSeed: seed,
  });
  const plan = buildMazePlan(g, params);
  applyMazePlan(g, plan);
  return { g, plan };
}

describe("maze apply: graph surgery", () => {
  it("preserves all structural invariants", () => {
    for (const seed of SEEDS) {
      for (const params of [
        DEFAULT_MAZE_PARAMS,
        P({ branchDensity: 0.8, deadEndDensity: 0.5, fourWayFraction: 0.3 }),
      ]) {
        const { g } = applied(seed, params);
        expect(checkStructure(g)).toBe(true);
        expect(checkStrandPartition(g)).toBe(true);
        expect(checkAlternation(g)).toBe(true);
      }
    }
  });

  it("creates the exact planned junction/end population", () => {
    for (const seed of SEEDS) {
      const { g, plan } = applied(seed, P({ deadEndDensity: 0.5 }));
      const junctions: string[] = [];
      const ends: string[] = [];
      for (const [id, node] of g.nodes) {
        if (node.type === NODE_TYPE.JUNCTION) junctions.push(id);
        if (node.type === NODE_TYPE.END) ends.push(id);
      }
      const nSplices =
        plan.spanningSplices.length + plan.choiceSplices.length;
      const nMerges = plan.spanningMerges.length + plan.fourWayMerges.length;
      expect(junctions.length).toBe(
        2 * nSplices + plan.deadEndStubs.length + nMerges
      );
      expect(ends.length).toBe(plan.deadEndStubs.length);

      // Split junctions are degree 3; merges keep their crossing degree 4.
      const mergeSet = new Set([
        ...plan.spanningMerges,
        ...plan.fourWayMerges,
      ]);
      for (const id of junctions) {
        const deg = g.adjacency.get(id)!.length;
        expect(deg).toBe(mergeSet.has(id) ? 4 : 3);
      }
      for (const id of ends) {
        expect(g.adjacency.get(id)!.length).toBe(1);
      }
    }
  });

  it("keeps every strand's traversal order consistent", () => {
    for (const seed of SEEDS) {
      const { g } = applied(seed, P({ branchDensity: 0.8, deadEndDensity: 0.5 }));
      g.strands.forEach((strand) => {
        expect(strand.edgeIds.length).toBe(strand.nodes.length - 1);
        strand.edgeIds.forEach((eid, i) => {
          const e = g.edges.get(eid)!;
          expect(e.nodeA).toBe(strand.nodes[i]);
          expect(e.nodeB).toBe(strand.nodes[i + 1]);
        });
        if (strand.isClosed) {
          expect(strand.nodes[0]).toBe(strand.nodes[strand.nodes.length - 1]);
        }
      });
    }
  });

  it("adds bridges and stubs as open single-edge strands", () => {
    for (const seed of SEEDS) {
      const { g, plan } = applied(seed, P({ deadEndDensity: 0.5 }));
      const nNew =
        plan.spanningSplices.length +
        plan.choiceSplices.length +
        plan.deadEndStubs.length;
      const newStrands = g.strands.slice(g.strands.length - nNew);
      for (const s of newStrands) {
        expect(s.isClosed).toBe(false);
        expect(s.edgeIds.length).toBe(1);
        expect(s.nodes.length).toBe(2);
      }
    }
  });

  it("is deterministic (same seed -> identical applied graph)", () => {
    const a = applied(4242);
    const b = applied(4242);
    expect(a.g.nodes).toEqual(b.g.nodes);
    expect(a.g.edges).toEqual(b.g.edges);
    expect(a.g.strands).toEqual(b.g.strands);
  });
});
