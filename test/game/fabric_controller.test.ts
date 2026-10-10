import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph } from "../../src/core/walk_graph";
import type { WalkGraph } from "../../src/core/walk_graph";
import { FabricMazeController } from "../../src/game/fabric_controller";

// P4 Stage 8a: branch-point-only solve state over the walk graph.

function walkFor(seed: number): WalkGraph {
  const g = generateLatticeKnotwork({
    gridSize: 8,
    weaveDensity: 0.3,
    turnBias: 0.6,
    randSeed: seed,
  });
  const plan = buildMazePlan(g, DEFAULT_MAZE_PARAMS);
  const hueGroup = applyMazePlan(g, plan);
  applyMazeCuts(g, plan, hueGroup);
  return buildWalkGraph(g)!;
}

// The next run on a shortest path: the choice minimizing run length plus
// the Dijkstra distance of its far vertex.
function bestChoice(c: FabricMazeController): number {
  let best = -1;
  let bestCost = Infinity;
  for (const eid of c.choices()) {
    const e = c.walk.edges[eid];
    const far = e.va === c.head ? e.vb : e.va;
    const cost = e.length + (c.walk.distToExit.get(far) ?? Infinity);
    if (cost < bestCost) {
      bestCost = cost;
      best = eid;
    }
  }
  return best;
}

describe("fabric maze controller (P4 Stage 8a)", () => {
  it("starts at the entrance tail with exactly one way in", () => {
    for (const seed of [5, 42, 99]) {
      const c = new FabricMazeController(walkFor(seed));
      expect(c.head).toBe(c.walk.start);
      expect(c.choices().length).toBe(1);
      expect(c.pathLength).toBe(0);
      expect(c.backtrackDist).toBe(0);
      expect(c.solved).toBe(false);
    }
  });

  it("rejects runs not incident to the current branch point", () => {
    const c = new FabricMazeController(walkFor(5));
    const far = c.walk.edges.find(
      (e) => e.va !== c.head && e.vb !== c.head
    )!;
    expect(c.tapEdge(far.id)).toBe("reject");
    expect(c.pathLength).toBe(0);
    expect(c.head).toBe(c.walk.start);
  });

  it("backtracks one run at a time, accumulating the price paid", () => {
    const c = new FabricMazeController(walkFor(5));
    const first = c.choices()[0];
    const len = c.walk.edges[first].length;
    expect(c.tapEdge(first)).toBe("advance");
    expect(c.pathLength).toBeCloseTo(len, 9);
    expect(c.backtrackDist).toBe(0);

    expect(c.tapEdge(first)).toBe("backtrack");
    expect(c.head).toBe(c.walk.start);
    expect(c.pathLength).toBe(0);
    expect(c.backtrackDist).toBeCloseTo(len, 9);

    // Re-advancing keeps the backtrack meter (it never decreases).
    expect(c.tapEdge(first)).toBe("advance");
    expect(c.backtrackDist).toBeCloseTo(len, 9);
    expect(c.pathLength).toBeCloseTo(len, 9);
  });

  it("solves exactly the optimal when following the Dijkstra field", () => {
    for (const seed of [5, 42, 1234, 99]) {
      const c = new FabricMazeController(walkFor(seed));
      let result = "";
      for (let step = 0; step < c.walk.edges.length + 5; step++) {
        const eid = bestChoice(c);
        expect(eid).toBeGreaterThanOrEqual(0);
        result = c.tapEdge(eid);
        if (result === "win") break;
        expect(result).toBe("advance");
      }
      expect(result).toBe("win");
      expect(c.solved).toBe(true);
      expect(c.head).toBe(c.walk.exit);
      expect(c.pathLength).toBeCloseTo(c.walk.optimalLength, 6);
      expect(c.backtrackDist).toBe(0);
      // After solving: no choices, taps are inert.
      expect(c.choices()).toEqual([]);
      expect(c.tapEdge(0)).toBe("noop");
    }
  });

  it("reset returns to the start and clears both meters", () => {
    const c = new FabricMazeController(walkFor(42));
    const first = c.choices()[0];
    c.tapEdge(first);
    c.tapEdge(first);
    c.tapEdge(first);
    expect(c.pathLength).toBeGreaterThan(0);
    expect(c.backtrackDist).toBeGreaterThan(0);
    c.reset();
    expect(c.head).toBe(c.walk.start);
    expect(c.pathLength).toBe(0);
    expect(c.backtrackDist).toBe(0);
    expect(c.solved).toBe(false);
    expect(c.pathVertices).toEqual([c.walk.start]);
    expect(c.pathEdges).toEqual([]);
  });
});
