import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph } from "../../src/core/walk_graph";
import type { WalkGraph } from "../../src/core/walk_graph";
import { FabricMazeController } from "../../src/game/fabric_controller";

// P4 Stage 8a: branch-point-only solve state over the walk graph.

function walkFor(seed: number, deadEndDensity = 0): WalkGraph {
  const g = generateLatticeKnotwork({
    gridSize: 8,
    weaveDensity: 0.3,
    turnBias: 0.6,
    randSeed: seed,
  });
  const plan = buildMazePlan(g, { ...DEFAULT_MAZE_PARAMS, deadEndDensity });
  const hueGroup = applyMazePlan(g, plan);
  applyMazeCuts(g, plan, hueGroup);
  return buildWalkGraph(g)!;
}

// Walk-edge ids of a fewest-runs route from `from` to `to` (BFS).
function routeTo(w: WalkGraph, from: string, to: string): number[] {
  const prev = new Map<string, [string, number]>();
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length > 0) {
    const v = queue.shift()!;
    if (v === to) break;
    for (const eid of w.vertices.get(v)!.edges) {
      const e = w.edges[eid];
      const u = e.va === v ? e.vb : e.va;
      if (seen.has(u)) continue;
      seen.add(u);
      prev.set(u, [v, eid]);
      queue.push(u);
    }
  }
  const out: number[] = [];
  for (let v = to; v !== from; ) {
    const [p, eid] = prev.get(v)!;
    out.unshift(eid);
    v = p;
  }
  return out;
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
    expect(c.visitedJunctions.size).toBe(0);
    expect(c.deadEndTips.size).toBe(0);
    expect(c.moveLog).toEqual([]);
  });
});

describe("fabric maze stats (K19)", () => {
  it("logs an optimal solve as all-green and counts its junctions once", () => {
    for (const seed of [5, 42, 1234]) {
      const c = new FabricMazeController(walkFor(seed));
      while (!c.solved) c.tapEdge(bestChoice(c));
      expect(c.moveLog.every((m) => m === "g")).toBe(true);
      expect(c.moveCount).toBe(c.pathEdges.length);
      // The junctions are exactly the non-END vertices on the route.
      const onRoute = new Set(
        c.pathVertices.filter((v) => !c.walk.vertices.get(v)!.isEnd)
      );
      expect([...c.visitedJunctions].sort()).toEqual([...onRoute].sort());
      expect(c.deadEndTips.size).toBe(0);
    }
  });

  it("marks detours yellow and backtracks red; revisits never recount", () => {
    const c = new FabricMazeController(walkFor(42));
    const cost = (eid: number): number => {
      const e = c.walk.edges[eid];
      const far = e.va === c.head ? e.vb : e.va;
      return e.length + (c.walk.distToExit.get(far) ?? Infinity);
    };
    c.tapEdge(bestChoice(c)); // the entrance run: always on route
    // Walk the shortest route to a junction with a choice OFF every
    // shortest route (strictly longer than the best).
    let detour = -1;
    for (let guard = 0; guard < 200 && !c.solved; guard++) {
      const best = bestChoice(c);
      const last = c.pathEdges[c.pathEdges.length - 1];
      detour =
        c.choices().find((e) => e !== last && cost(e) > cost(best) + 1e-6) ?? -1;
      if (detour >= 0) break;
      c.tapEdge(best);
    }
    expect(detour).toBeGreaterThanOrEqual(0);
    const before = c.visitedJunctions.size;
    const log = c.moveLog.length;
    expect(c.tapEdge(detour)).toBe("advance");
    expect(c.moveLog[log]).toBe("d");
    expect(c.tapEdge(detour)).toBe("backtrack");
    expect(c.moveLog[log + 1]).toBe("b");
    const afterDetour = c.visitedJunctions.size;
    expect(afterDetour).toBeGreaterThanOrEqual(before);
    // Going there again adds a move, but no junction.
    c.tapEdge(detour);
    expect(c.visitedJunctions.size).toBe(afterDetour);
    expect(c.moveLog.slice(-3)).toEqual(["d", "b", "d"]);
  });

  it("counts each dead-end tip reached, once", () => {
    let checked = 0;
    for (const seed of [5, 42, 99, 1234, 7, 8]) {
      const w = walkFor(seed, 1);
      const tips = [...w.vertices.values()].filter(
        (v) => v.isEnd && v.id !== w.start && v.id !== w.exit
      );
      const reachable = tips.find((t) => w.distToExit.has(t.id) && Number.isFinite(w.distToExit.get(t.id)!));
      if (!reachable) continue;
      checked++;
      const c = new FabricMazeController(w);
      for (const eid of routeTo(w, w.start, reachable.id)) {
        expect(c.tapEdge(eid)).toBe("advance");
      }
      expect(c.head).toBe(reachable.id);
      expect([...c.deadEndTips]).toEqual([reachable.id]);
      // Into a dead end and back out: the tip counts once.
      const back = c.pathEdges[c.pathEdges.length - 1];
      expect(c.tapEdge(back)).toBe("backtrack");
      expect(c.tapEdge(back)).toBe("advance");
      expect(c.deadEndTips.size).toBe(1);
      expect(c.visitedJunctions.has(reachable.id)).toBe(false);
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("logs no backtracks in trail mode (going back is an advance)", () => {
    const c = new FabricMazeController(walkFor(5), true);
    const first = c.choices()[0];
    c.tapEdge(first);
    const second = c.choices().find((e) => e !== first)!;
    c.tapEdge(second);
    expect(c.tapEdge(second)).toBe("advance"); // back over it
    expect(c.tapEdge(second)).toBe("advance"); // and out again
    expect(c.moveLog.length).toBe(4);
    expect(c.moveLog).not.toContain("b");
    // There and back again: one of the two crossings is off-route.
    expect(c.moveLog.slice(1, 3)).toContain("d");
  });
});
