// Layer 1: Combinatorial graph types.

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
  latticePos: [number, number];  // Grid position.
  isOver?: boolean;              // For crossings: true if this is the over strand.
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

// Main combinatorial graph.
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
  gridSize: number;              // Number of lattice cells per dimension.
  threadCount: number;           // Target number of initial threads.
  branchRate: number;            // P(end branches) per step.
  mergeRate: number;             // P(end merges with nearby thread).
  terminateRate: number;         // P(end terminates).
  weaveDensity: number;          // P(crossing allowed).
  turnBias: number;              // [0, 1] bias toward windy paths.
  loopClosurePreference: number; // [0, 1] bias toward closing loops.
  overlapPenalty: number;        // Pairwise-crossing enforcement weight.
  randSeed: number;              // RNG seed.
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
