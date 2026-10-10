import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph } from "../../src/core/walk_graph";
import type { WalkGraph } from "../../src/core/walk_graph";
import { FabricMazeController } from "../../src/game/fabric_controller";

// P4 Stage 23: memory-trail mode - advance-only semantics. Backtracking
// does not exist: re-tapping the arrival run is just another advance that
// happens to revisit the previous vertex. Win condition unchanged.

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

describe("fabric maze controller - memory-trail mode (P4 Stage 23)", () => {
  it("re-tapping the arrival run advances (revisit), never pops", () => {
    const c = new FabricMazeController(walkFor(5), true);
    const first = c.choices()[0];
    const len = c.walk.edges[first].length;
    expect(c.tapEdge(first)).toBe("advance");
    const mid = c.head;
    expect(c.pathLength).toBeCloseTo(len, 9);

    // The same run again: an advance that lands back at the start.
    expect(c.tapEdge(first)).toBe("advance");
    expect(c.head).toBe(c.walk.start);
    expect(c.pathEdges).toEqual([first, first]);
    expect(c.pathVertices).toEqual([c.walk.start, mid, c.walk.start]);
    expect(c.pathLength).toBeCloseTo(2 * len, 9);
    expect(c.backtrackDist).toBe(0);
  });

  it("pathLength only accumulates and backtrackDist stays 0", () => {
    for (const seed of [5, 42]) {
      const c = new FabricMazeController(walkFor(seed), true);
      let prev = 0;
      for (let step = 0; step < 24 && !c.solved; step++) {
        // Deterministic wandering: cycle through the available choices,
        // which includes re-tapping the arrival run.
        const choices = c.choices();
        const eid = choices[step % choices.length];
        const result = c.tapEdge(eid);
        expect(result === "advance" || result === "win").toBe(true);
        expect(c.pathLength).toBeGreaterThan(prev);
        prev = c.pathLength;
        expect(c.backtrackDist).toBe(0);
        expect(c.pathEdges.length).toBe(step + 1);
      }
    }
  });

  it("win still fires on reaching the exit", () => {
    for (const seed of [5, 42, 1234, 99]) {
      const c = new FabricMazeController(walkFor(seed), true);
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
      expect(c.choices()).toEqual([]);
      expect(c.tapEdge(0)).toBe("noop");
    }
  });

  it("toggling the flag off restores backtracking on the last run", () => {
    const c = new FabricMazeController(walkFor(5), true);
    const first = c.choices()[0];
    const len = c.walk.edges[first].length;
    c.tapEdge(first);
    c.tapEdge(first); // Advance back (trail semantics).
    expect(c.pathLength).toBeCloseTo(2 * len, 9);

    c.trailMode = false;
    // The arrival run is the last path edge, so re-taps now pop for real.
    expect(c.tapEdge(first)).toBe("backtrack");
    expect(c.tapEdge(first)).toBe("backtrack");
    expect(c.head).toBe(c.walk.start);
    expect(c.pathLength).toBe(0);
    expect(c.backtrackDist).toBeCloseTo(2 * len, 9);
  });
});
