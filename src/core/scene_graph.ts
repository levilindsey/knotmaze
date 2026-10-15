import { generateLatticeKnotwork } from "./lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "./maze_plan";
import { planAnchors } from "./shapes";
import type { AnchorId, ShapeId } from "./shapes";
import { applyMazePlan, applyMazeCuts } from "./maze_apply";
import { checkStructure, checkAlternation } from "./tangle_graph";
import type { GenerationParams, TangleGraph } from "./types";

// K7 stage 1: the pure part of a scene build, moved verbatim from main.ts's
// rebuild(). It reads only `params` (no DOM, no live state), so main and,
// from K7 stage 2, the physics worker build the same graph from the same
// params. Keep it so.

// The params a scene graph is built from: a structural subset of the
// link's params (ui/url_state.ts UrlParams), so core imports nothing from ui.
export interface SceneParams {
  gridSize: number;
  weaveDensity: number;
  turnBias: number;
  seed: number;
  shape: ShapeId;
  mazeFabric: boolean;
  branchDensity: number;
  fourWayFraction: number;
  deadEnds: boolean;
  deadEndDensity: number;
  deadEndLength: number;
  hCutShare: number;
  entranceClearance: number;
  exitClearance: number;
  junctionSpacing: number;
  startAnchor: AnchorId;
  exitAnchor: AnchorId;
}

export interface SceneGraph {
  graph: TangleGraph;
  // The build's strand hue groups (maze plan; undefined in knot mode).
  hueGroup: number[] | undefined;
}

export function buildSceneGraph(params: SceneParams): SceneGraph {
  const genParams: GenerationParams = {
    gridSize: params.gridSize,
    weaveDensity: params.weaveDensity,
    turnBias: params.turnBias,
    randSeed: params.seed,
    shape: params.shape,
  };
  const graph = generateLatticeKnotwork(genParams);

  // Branching maze fabric (mazeFabric): plan + apply the splice/merge/stub
  // surgery and carve the corner entrance/exit at GRAPH level, so the
  // particle system builds the fabric natively (open chains, fused
  // junctions, anchored ends).
  let hueGroup: number[] | undefined;
  if (params.mazeFabric) {
    const plan = buildMazePlan(graph, {
      ...DEFAULT_MAZE_PARAMS,
      branchDensity: params.branchDensity,
      fourWayFraction: params.fourWayFraction,
      deadEndDensity: params.deadEnds ? params.deadEndDensity : 0,
      deadEndLength: params.deadEndLength,
      hCutShare: params.hCutShare,
      entranceClearance: params.entranceClearance,
      exitClearance: params.exitClearance,
      junctionSpacing: params.junctionSpacing,
      // Entrance/exit anchored to the shape's boundary (shp/sa/xa).
      ...planAnchors(
        params.shape,
        params.gridSize,
        params.startAnchor,
        params.exitAnchor
      ),
    });
    hueGroup = applyMazePlan(graph, plan);
    applyMazeCuts(graph, plan, hueGroup);
  }

  if (!checkStructure(graph) || !checkAlternation(graph)) {
    console.warn("Knot invariants violated; generation bug.");
  }
  return { graph, hueGroup };
}
