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

// The maze IS a knot thread: the player traces ALONG one strand from a start
// end to an exit end, always continuing straight at crossings (following the
// strand = going straight, by construction of the trace). Positions are read
// live from the physics chain, so the maze thread is the same chain index as
// the strand (ParticleSystem.chains mirrors graph.strands). A strand node at
// index i sits at chain control `2*i` (chain = [node, edge-mid, node, ...]).
//
// The traced path runs from control `ctrlStart` forward `steps` nodes (each
// node = +2 control), so node k of the path is at control (ctrlStart + 2k),
// and the exit is node `steps`. Populated by `buildMazeGraph`.
//
// (Real off-screen loose ends and merging junctions - where the player would
// choose - are the next increment; today the traced strand is deterministic.)
export interface MazeGraph {
  strand: number;    // chain/strand index of the maze thread.
  chainLen: number;  // that chain's control count (2 * node count).
  ctrlStart: number; // control of the start end (even = a node).
  steps: number;     // node-steps from start to exit along the strand.
  // Chain slot AFTER which the loop is carved open (the hidden edge's
  // midpoint): ParticleSystem.openChain removes the seam there, making the
  // strand a genuine path with the two loose ends running off-screen.
  breakSlot: number;
}

// Main combinatorial graph.
export interface TangleGraph {
  nodes: Map<string, Node>;
  edges: Map<string, Edge>;
  adjacency: Map<string, string[]>;  // node ID -> list of edge IDs.
  strands: Strand[];
  seed: number;
  params: GenerationParams;
  maze?: MazeGraph;  // Set by generateLatticeKnotwork (P4 maze mode).
}

// Parameters for generation. Junction/end carving (entrances, exits, branch
// points for maze mode) arrives in P4 and will add its own params then.
export interface GenerationParams {
  gridSize: number;     // Number of lattice cells per dimension.
  weaveDensity: number; // [0, 1] P(non-tree wall opened): more = denser weave.
  turnBias: number;     // [0, 1] growing-tree newest-cell bias: more = windier corridors.
  randSeed: number;     // RNG seed.
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
