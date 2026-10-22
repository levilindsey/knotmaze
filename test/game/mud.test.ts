// K137 s5: muddy runs (game/mud.ts) - placement on the fewest-moves
// route, the two-move cost in par and strokes, off = the old numbers.
import { describe, expect, it } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph } from "../../src/core/walk_graph";
import type { WalkGraph } from "../../src/core/walk_graph";
import { FabricMazeController } from "../../src/game/fabric_controller";
import { fewestRoute, mudOf, placeMud } from "../../src/game/mud";
import { runsToExit } from "../../src/core/walk_graph";
import { mudCost } from "../../src/game/mud";

function walkFor(seed: number): WalkGraph {
  const g = generateLatticeKnotwork({
    gridSize: 8,
    weaveDensity: 0.3,
    turnBias: 0.6,
    randSeed: seed,
  });
  const plan = buildMazePlan(g, { ...DEFAULT_MAZE_PARAMS });
  const hueGroup = applyMazePlan(g, plan);
  applyMazeCuts(g, plan, hueGroup);
  return buildWalkGraph(g)!;
}

describe("K137 s5 muddy runs", () => {
  it("mudOf clamps to 0..6", () => {
    expect(mudOf(3)).toBe(3);
    expect(mudOf(9)).toBe(6);
    expect(mudOf(-1)).toBe(0);
    expect(mudOf(NaN)).toBe(0);
  });

  it("placement: on the route, never a tail, up to the count, seeded", () => {
    const w = walkFor(7);
    const route = fewestRoute(w);
    expect(route.length).toBeGreaterThan(2);
    const mud = placeMud(w, 6, 7);
    expect(mud.length).toBeGreaterThan(0);
    expect(mud.length).toBeLessThanOrEqual(6);
    for (const eid of mud) {
      expect(route).toContain(eid);
      const e = w.edges[eid];
      expect(e.va).not.toBe(w.start);
      expect(e.vb).not.toBe(w.start);
      expect(e.va).not.toBe(w.exit);
      expect(e.vb).not.toBe(w.exit);
    }
    expect(placeMud(w, 6, 7)).toEqual(mud);
    expect(placeMud(w, 0, 7)).toEqual([]);
  });

  it("par's F counts a muddy crossing twice; off is the old F", () => {
    const w = walkFor(7);
    const mud = new Set(placeMud(w, 3, 7));
    expect(mud.size).toBeGreaterThan(0);
    const plain = runsToExit(w).get(w.start)!;
    const weighted = runsToExit(w, undefined, mudCost(mud)).get(w.start)!;
    // Every route run is muddy-checked: the weighted fewest is the plain
    // fewest plus one per muddy run on the best moves route (>= plain).
    expect(weighted).toBeGreaterThanOrEqual(plain);
    const cOff = new FabricMazeController(w, false, null, { mud: 0 }, { seed: 7, cont: () => new Int32Array(10000) });
    expect(cOff.mudRuns.size).toBe(0);
    expect(cOff.fewestRuns).toBe(plain);
    const cOn = new FabricMazeController(w, false, null, { mud: 3 }, { seed: 7, cont: () => new Int32Array(10000) });
    expect(cOn.mudRuns.size).toBe(mud.size);
    expect(cOn.fewestRuns).toBe(weighted);
  });

  it("a muddy crossing counts two strokes; other taps count one", () => {
    const w = walkFor(7);
    const c = new FabricMazeController(w, false, null, { mud: 6 }, { seed: 7, cont: () => new Int32Array(10000) });
    expect(c.mudRuns.size).toBeGreaterThan(0);
    // Walk the route; strokes = taps + one extra per muddy tap.
    let guard = 0;
    while (!c.solved && guard++ < 200) {
      const route = fewestRoute(w);
      // Tap the next route run at the head (advance or backtrack).
      const head = c.head;
      const next = c
        .choices()
        .find((eid) => route.includes(eid));
      if (next === undefined) break;
      void head;
      const before = c.strokes;
      const muddy = c.mudRuns.has(next);
      expect(c.tapEdge(next)).not.toBe("reject");
      expect(c.strokes).toBe(before + (muddy ? 2 : 1));
    }
    expect(c.taps.length).toBeGreaterThan(0);
  });

  it("a K138 rule turns mud off (par stays tap-rated)", () => {
    const w = walkFor(7);
    const c = new FabricMazeController(w, false, null, { mud: 4, ice: 0.25 }, { seed: 7, cont: () => new Int32Array(10000) });
    expect(c.mudCount).toBe(0);
    expect(c.mudRuns.size).toBe(0);
  });
});
