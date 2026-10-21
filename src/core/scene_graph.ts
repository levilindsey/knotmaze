import { generateLatticeKnotwork } from "./lattice_grower";
import { buildTextGraph, attachTitle, attachCartouche, planCartoucheHole } from "./text_graph";
import { attachEmblem, buildEmblemGraph, isEmblemId, planEmblemHole } from "./emblem_graph";
import type { EmblemId } from "./emblem_graph";
import { buildWalkGraph } from "./walk_graph";
import type { WalkGraph } from "./walk_graph";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "./maze_plan";
import { planAnchors } from "./shapes";
import type { AnchorId, ShapeId } from "./shapes";
import { applyMazePlan, applyMazeCuts } from "./maze_apply";
import { searchGreedyTrapPlan, trapOptionsOf } from "./greedy_search";
import { checkStructure, checkAlternation, checkStrandPartition } from "./tangle_graph";
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
  // K115 stage 4a: the in-maze cartouche word ("" = none).
  cartouche: string;
  // K115 stage 5a: standalone emblem scene ("" = none; an EmblemId).
  emblem: string;
  // K115 stage 5b: the cartouche hole's emblem tenant ("" = none; an
  // EmblemId). Wins the hole over `cartouche` when both are named.
  cartoucheShape: string;
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
  // K558: text crossings put the EARLIER stroke over (pen order reversed).
  penReverse: boolean;
  // K115 stage 9: the #glyphs2 probe switch ("" off; "1" on; "forks",
  // "f<angle>", "aland" and "xh2" are probe options). Read from the hash, never from a link; every
  // scene build passes it (main.ts's prebuild too: the worker name needs it).
  glyphs2: string;
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
    const graph = buildTextGraph(params.text, { penReverse: params.penReverse, glyphs2: params.glyphs2 });
    if (!checkStructure(graph) || !checkAlternation(graph)) {
      console.warn("Knot invariants violated; generation bug.");
    }
    return { graph, hueGroup: undefined };
  }
  // K115 stage 5a: standalone emblem (text wins; then emblem; then maze).
  if (params.emblem !== "") {
    if (!isEmblemId(params.emblem)) {
      throw new Error(`unknown emblem: ${params.emblem}`);
    }
    const graph = buildEmblemGraph(params.emblem as EmblemId);
    if (
      !checkStructure(graph) ||
      !checkAlternation(graph) ||
      !checkStrandPartition(graph)
    ) {
      console.warn("Knot invariants violated; generation bug.");
    }
    return { graph, hueGroup: undefined };
  }
  // K115 stages 4a/5b: plan the cartouche hole before generation (maze
  // fabric only; both tenants empty and knot mode generate exactly
  // today's maze). One hole, one tenant: a named cartoucheShape takes
  // the hole over a named cartouche word, and the word is not built.
  let cartouchePlan: ReturnType<typeof planCartoucheHole> = null;
  let emblemPlan: ReturnType<typeof planEmblemHole> = null;
  if (params.mazeFabric && params.cartoucheShape !== "") {
    if (!isEmblemId(params.cartoucheShape)) {
      throw new Error(`unknown emblem: ${params.cartoucheShape}`);
    }
    emblemPlan = planEmblemHole(
      params.cartoucheShape as EmblemId,
      params.gridSize,
      params.shape
    );
  } else if (params.mazeFabric && params.cartouche) {
    cartouchePlan = planCartoucheHole(params.cartouche, params.gridSize, params.shape);
  }
  const hole = emblemPlan?.hole ?? cartouchePlan?.hole;
  const genParams: GenerationParams = {
    gridSize: params.gridSize,
    weaveDensity: params.weaveDensity,
    turnBias: params.turnBias,
    randSeed: params.seed,
    shape: params.shape,
    ...(hole ? { hole } : {}),
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
        const seam = attachTitle(graph, params.title, params.penReverse, params.glyphs2 ?? "");
        if (seam !== null) {
          if (hueGroup) {
            for (let i = strandsBefore; i < graph.strands.length; i++) {
              hueGroup.push(strandsBefore);
            }
          }
          // K552: the ids attachTitle renamed, so a titled walk can name
          // its maze portion as the untitled walk does (the maze form).
          const mazeNames = new Map<string, string>([[seam, walk0.start]]);
          if (graph.nodes.has("mentr_decoy")) {
            mazeNames.set("mentr_decoy", "mentr_a");
          }
          walk = buildWalkGraph(graph, {
            start: "mentr_a",
            exit: walk0.exit,
            mazeStart: seam,
            mazeNames,
            titleChains: [strandsBefore, graph.strands.length],
          });
        }
      }
    }
  }

  if (!checkStructure(graph) || !checkAlternation(graph)) {
    console.warn("Knot invariants violated; generation bug.");
  }
  // K115 stage 4a: hang the cartouche word across its hole AFTER the
  // title block (the title's walk0 selection never sees the word, so a
  // cartouche cannot move a daily's start or exit). The word only adds
  // a route between two frame vertices; the frame alone was planned
  // solvable, so start/exit and solvability are untouched.
  if (cartouchePlan) {
    const strandsBefore = graph.strands.length;
    const junctions = attachCartouche(
      graph,
      params.cartouche,
      cartouchePlan.hole,
      cartouchePlan.xHeight,
      params.junctionSpacing,
      params.penReverse
    );
    if (junctions !== null) {
      if (hueGroup) {
        for (let i = strandsBefore; i < graph.strands.length; i++) {
          hueGroup.push(strandsBefore);
        }
      }
      walk = walk?.mazeStart
        ? buildWalkGraph(graph, {
            start: walk.start,
            exit: walk.exit,
            mazeStart: walk.mazeStart,
            mazeNames: walk.mazeNames,
            titleChains: walk.titleChains,
          })
        : buildWalkGraph(graph);
    }
  }
  // K115 stage 5b: float the emblem island in its hole AFTER the title
  // block, in the cartouche's place. The island's strands carry no
  // JUNCTION, END or waypoint nodes, so the walk graph skips each one
  // whole: the returned walk is the holed frame's walk exactly, and no
  // walk rebuild is needed (a title walk, when present, stands).
  if (emblemPlan) {
    const strandsBefore = graph.strands.length;
    const attached = attachEmblem(
      graph,
      params.cartoucheShape as EmblemId,
      emblemPlan.hole,
      emblemPlan.diameter
    );
    if (attached && hueGroup) {
      for (let i = strandsBefore; i < graph.strands.length; i++) {
        hueGroup.push(strandsBefore);
      }
    }
  }

  return { graph, hueGroup, walk };
}
