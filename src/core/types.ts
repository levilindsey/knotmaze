// Layer 1: Combinatorial graph types.

import type { ShapeId } from "./shapes";

export const NODE_TYPE = {
  CROSSING: "crossing",   // degree 4, over/under bit
  JUNCTION: "junction",   // degree 3+, branch/merge
  END: "end",             // degree 1, running end
  TURN: "turn",           // degree 2, path control
} as const;

export type NodeType = (typeof NODE_TYPE)[keyof typeof NODE_TYPE];

export interface Node {
  id: string;
  type: NodeType;
  latticePos: [number, number];  // Doubled-lattice position (turns may be fractional).
  isOver?: boolean;              // For crossings: true if the "/" (NE-SW) pass goes over.
  // P4 maze: entrance/exit END nodes are pinned to this world position by the
  // physics; free END tips (dead-end stubs) carry no anchor.
  anchor?: [number, number];
}

export interface Edge {
  id: string;
  nodeA: string;  // Node ID.
  nodeB: string;  // Node ID.
  latticePoints: Array<[number, number]>;  // Path through lattice.
}

// A strand is a sequence of edges between junctions/ends.
export interface Strand {
  edgeIds: string[];
  isClosed: boolean;  // true if it forms a loop.
  nodes: string[];    // nodes traversed; first and last may be the same if closed.
}

// Main combinatorial graph. (The legacy single-strand MazeGraph - the old
// mazeMode / md=1 - was RETIRED 2026-10-10 once fabric gameplay strictly
// superseded it; the branching maze lives in core/maze_plan + walk_graph.)
export interface TangleGraph {
  nodes: Map<string, Node>;
  edges: Map<string, Edge>;
  adjacency: Map<string, string[]>;  // node ID -> list of edge IDs.
  strands: Strand[];
  seed: number;
  params: GenerationParams;
}

// Parameters for generation.
export interface GenerationParams {
  gridSize: number;     // Number of lattice cells per dimension.
  weaveDensity: number; // [0, 1] P(non-tree wall opened): more = denser weave.
  turnBias: number;     // [0, 1] growing-tree newest-cell bias: more = windier corridors.
  randSeed: number;     // RNG seed.
  // Silhouette mask id (core/shapes.ts). Absent or "rect" = the full
  // rectangular lattice, byte-identical to the pre-shape grower.
  shape?: ShapeId;
}

export interface ParamFieldConfig {
  type: "constant" | "simplex" | "painted";
  value?: number;                           // For constant.
  simplexScale?: number;                    // For simplex.
  simplexOctaves?: number;
}

export interface ParamField {
  config: ParamFieldConfig;
  evaluate(latticePos: [number, number]): number;
}
