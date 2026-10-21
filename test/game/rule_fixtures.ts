// K138: test mazes for the rule kit, ice and the color rule (a built maze,
// its walk graph and the walker map's continuation table).
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph } from "../../src/core/walk_graph";
import type { WalkGraph } from "../../src/core/walk_graph";
import { walkerMapOf } from "../../src/game/walker";

export interface RuleMaze {
  graph: ReturnType<typeof generateLatticeKnotwork>;
  walk: WalkGraph;
  cont: Int32Array;
}

export function ruleMaze(seed: number, gridSize = 8, deadEndDensity = 0.3): RuleMaze {
  const graph = generateLatticeKnotwork({
    gridSize,
    weaveDensity: 0.3,
    turnBias: 0.6,
    randSeed: seed,
  });
  const plan = buildMazePlan(graph, { ...DEFAULT_MAZE_PARAMS, deadEndDensity });
  const hueGroup = applyMazePlan(graph, plan);
  applyMazeCuts(graph, plan, hueGroup);
  const walk = buildWalkGraph(graph)!;
  return { graph, walk, cont: walkerMapOf(graph, walk).cont };
}
