import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import {
  buildMazePlan,
  DEFAULT_MAZE_PARAMS,
  planTailsJoined,
} from "../../src/core/maze_plan";
import type { MazeParams, MazePlan } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { SHAPES, planAnchors } from "../../src/core/shapes";
import type { ShapeName } from "../../src/core/shapes";
import { buildWalkGraph } from "../../src/core/walk_graph";
import type { TangleGraph } from "../../src/core/types";
import { PARAM_DEFAULTS } from "../../src/ui/url_state";
import type { UrlParams } from "../../src/ui/url_state";
import { buildMazePlan as buildMazePlanV1 } from "./fixtures/maze_plan_v1";

// K109: every maze has a route from the start to the exit. Small shaped
// designs used to cut the entrance and exit on ONE loop and trim both cuts
// on the same side, leaving the start's arc and the exit's arc joined to
// nothing that joins them (strand-level spanning saw one strand). The
// piece model (planTailsJoined) catches that before surgery, and
// buildMazePlan repairs those plans. .claude/probes/K109/verify.ts runs the
// same checks over 1110 designs, against the frozen pre-K109 module too.

function design(shape: ShapeName, gridSize: number, seed: number, deadEnds: boolean): UrlParams {
  return { ...PARAM_DEFAULTS, shape, gridSize, seed, deadEnds };
}

function graphOf(p: UrlParams): TangleGraph {
  return generateLatticeKnotwork({
    gridSize: p.gridSize,
    weaveDensity: p.weaveDensity,
    turnBias: p.turnBias,
    randSeed: p.seed,
    shape: p.shape,
  });
}

function mazeParamsOf(p: UrlParams): MazeParams {
  return {
    ...DEFAULT_MAZE_PARAMS,
    branchDensity: p.branchDensity,
    fourWayFraction: p.fourWayFraction,
    deadEndDensity: p.deadEnds ? p.deadEndDensity : 0,
    deadEndLength: p.deadEndLength,
    entranceClearance: p.entranceClearance,
    exitClearance: p.exitClearance,
    junctionSpacing: p.junctionSpacing,
    ...planAnchors(p.shape, p.gridSize, p.startAnchor, p.exitAnchor),
  };
}

function optimalOf(p: UrlParams, plan: MazePlan): number {
  const graph = graphOf(p);
  const hueGroup = applyMazePlan(graph, plan);
  applyMazeCuts(graph, plan, hueGroup);
  const walk = buildWalkGraph(graph);
  expect(walk, `${p.shape} gs${p.gridSize} seed ${p.seed}: walk graph`).not.toBeNull();
  return walk!.optimalLength;
}

// Designs the pre-K109 module built without a route (K108's snapshot).
const FORMERLY_UNSOLVABLE: UrlParams[] = [
  design("heart", 4, 5127, false),
  design("heart", 5, 5132, false),
  design("star", 5, 5260, false),
  design("star", 10, 5289, false),
  design("fish", 9, 5412, true),
  design("tree", 7, 5523, false),
  design("tree", 8, 5531, true),
  design("circle", 4, 5760, true),
];

describe("maze plan: a route from start to exit (K109)", () => {
  it("repairs the designs the old module left without a route", () => {
    for (const p of FORMERLY_UNSOLVABLE) {
      const label = `${p.shape} gs${p.gridSize} seed ${p.seed}`;
      const params = mazeParamsOf(p);
      // The frozen module's plan: the model must call it unsolvable, as the
      // walk graph does.
      const old = buildMazePlanV1(graphOf(p), params) as MazePlan;
      expect(planTailsJoined(graphOf(p), old), `${label}: old model`).toBe(false);
      expect(optimalOf(p, old), `${label}: old walk`).toBe(Infinity);

      const plan = buildMazePlan(graphOf(p), params);
      expect(planTailsJoined(graphOf(p), plan), `${label}: model`).toBe(true);
      expect(Number.isFinite(optimalOf(p, plan)), `${label}: walk`).toBe(true);
    }
  });

  it("leaves no small shaped design without a route", () => {
    let seed = 109000;
    for (const shape of SHAPES) {
      for (let gridSize = 3; gridSize <= 10; gridSize++) {
        for (let k = 0; k < 4; k++) {
          const p = design(shape, gridSize, seed++, k % 2 === 1);
          const plan = buildMazePlan(graphOf(p), mazeParamsOf(p));
          const label = `${shape} gs${gridSize} seed ${p.seed}`;
          expect(planTailsJoined(graphOf(p), plan), label).toBe(true);
          expect(Number.isFinite(optimalOf(p, plan)), label).toBe(true);
        }
      }
    }
  });
});
