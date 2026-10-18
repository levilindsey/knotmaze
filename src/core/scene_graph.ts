import { generateLatticeKnotwork } from "./lattice_grower";
import { buildTextGraph, attachTitle } from "./text_graph";
import { buildWalkGraph } from "./walk_graph";
import type { WalkGraph } from "./walk_graph";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "./maze_plan";
import { planAnchors } from "./shapes";
import type { AnchorId, ShapeId } from "./shapes";
import { applyMazePlan, applyMazeCuts } from "./maze_apply";
import { searchGreedyTrapPlan, trapOptionsOf } from "./greedy_search";
import { checkStructure, checkAlternation } from "./tangle_graph";
import type { GenerationParams, TangleGraph } from "./types";

// K7 stage 1: the pure part of a scene build, moved verbatim from main.ts's
// rebuild(). It reads only `params` (no DOM, no live state), so main and,
// from K7 stage 2, the physics worker build the same graph from the same
// params. Keep it so.

// The params a scene graph is built from: a structural subset of the
// link's params (ui/url_state.ts UrlParams), so core imports nothing from ui.
export interface SceneParams {
  text: string;
  // K115 stage 3a: the maze's title thread ("" = none; dailies derive it).
  title: string;
  gridSize: number;
  weaveDensity: number;
  turnBias: number;
  seed: number;
  shape: ShapeId;
  mazeFabric: boolean;
  branchDensity: number;
  fourWayFraction: number;
  deadEndDensity: number;
  deadEndLength: number;
  hCutShare: number;
  exitCorridor: number;
  exitFlank: "stub" | "away" | "near";
  exitTaperRadius: number;
  exitTaperStrength: number;
  greedyTrap: "off" | "on";
  trapTargetF: number;
  trapTargetH: number;
  trapMaxF: number;
  trapMaxH: number;
  trapMaxGrow: number;
  trapRadius: number;
  trapIters: number;
  trapTries: number;
  trapSurplus: number;
  entranceClearance: number;
  exitClearance: number;
  junctionSpacing: number;
  startAnchor: AnchorId;
  exitAnchor: AnchorId;
}

export interface SceneGraph {
  graph: TangleGraph;
  // K115 stage 3a: the forced walk of a titled maze (undefined when the
  // scene is untitled: the caller builds the walk as before).
  walk?: WalkGraph | null;
  // The build's strand hue groups (maze plan; undefined in knot mode).
  hueGroup: number[] | undefined;
}

export function buildSceneGraph(params: SceneParams): SceneGraph {
  if (params.text !== "") {
    const graph = buildTextGraph(params.text);
    if (!checkStructure(graph) || !checkAlternation(graph)) {
      console.warn("Knot invariants violated; generation bug.");
    }
    return { graph, hueGroup: undefined };
  }
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
  let walk: WalkGraph | null | undefined;
  if (params.mazeFabric) {
    const mazeParams = {
      ...DEFAULT_MAZE_PARAMS,
      branchDensity: params.branchDensity,
      fourWayFraction: params.fourWayFraction,
      deadEndDensity: params.deadEndDensity,
      deadEndLength: params.deadEndLength,
      hCutShare: params.hCutShare,
      exitCorridor: params.exitCorridor,
      exitFlank: params.exitFlank,
      exitTaperRadius: params.exitTaperRadius,
      exitTaperStrength: params.exitTaperStrength,
      greedyTrap: params.greedyTrap,
      trapTargetF: params.trapTargetF,
      trapTargetH: params.trapTargetH,
      trapMaxF: params.trapMaxF,
      trapMaxH: params.trapMaxH,
      trapMaxGrow: params.trapMaxGrow,
      trapRadius: params.trapRadius,
      trapIters: params.trapIters,
      trapTries: params.trapTries,
      trapSurplus: params.trapSurplus,
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
    };
    const builtPlan = buildMazePlan(graph, mazeParams);
    // K74 stage 4: the greedy-trap search runs in generation, over the
    // finished plan (every trial applies H1 too - H1-in-loop). Off: the
    // plan ships exactly as built, byte for byte.
    const plan =
      params.greedyTrap === "on"
        ? searchGreedyTrapPlan(genParams, builtPlan, trapOptionsOf(mazeParams))
        : builtPlan;
    hueGroup = applyMazePlan(graph, plan);
    applyMazeCuts(graph, plan, hueGroup);
    // K115 stage 3a: hang the title on the entrance tail AFTER the
    // start/exit selection (walk0), so the title's arc can never pick a
    // different start. Title "" runs none of this: byte-identical.
    if (params.title) {
      const walk0 = buildWalkGraph(graph);
      if (walk0) {
        const strandsBefore = graph.strands.length;
        const seam = attachTitle(graph, params.title);
        if (seam !== null) {
          if (hueGroup) {
            for (let i = strandsBefore; i < graph.strands.length; i++) {
              hueGroup.push(strandsBefore);
            }
          }
          walk = buildWalkGraph(graph, {
            start: "mentr_a",
            exit: walk0.exit,
            mazeStart: seam,
          });
        }
      }
    }
  }

  if (!checkStructure(graph) || !checkAlternation(graph)) {
    console.warn("Knot invariants violated; generation bug.");
  }
  return { graph, hueGroup, walk };
}
