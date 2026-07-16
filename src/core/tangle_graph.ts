import type {
  Node,
  Edge,
  NodeType,
  TangleGraph,
  GenerationParams,
} from "./types";
import { NODE_TYPE } from "./types";

let nodeIdCounter = 0;
let edgeIdCounter = 0;

function nextNodeId(): string {
  return `node_${nodeIdCounter++}`;
}

function nextEdgeId(): string {
  return `edge_${edgeIdCounter++}`;
}

export function createTangleGraph(
  seed: number,
  params: GenerationParams
): TangleGraph {
  nodeIdCounter = 0;
  edgeIdCounter = 0;

  return {
    nodes: new Map(),
    edges: new Map(),
    adjacency: new Map(),
    strands: [],
    seed,
    params,
  };
}

export function addNode(
  graph: TangleGraph,
  type: NodeType,
  latticePos: [number, number],
  isOver?: boolean
): string {
  const id = nextNodeId();
  const node: Node = { id, type, latticePos, isOver };
  graph.nodes.set(id, node);
  if (!graph.adjacency.has(id)) {
    graph.adjacency.set(id, []);
  }
  return id;
}

export function addEdge(
  graph: TangleGraph,
  nodeAId: string,
  nodeBId: string,
  latticePoints: Array<[number, number]>
): string {
  const id = nextEdgeId();
  const edge: Edge = { id, nodeA: nodeAId, nodeB: nodeBId, latticePoints };
  graph.edges.set(id, edge);

  // Update adjacency.
  const adjA = graph.adjacency.get(nodeAId) || [];
  adjA.push(id);
  graph.adjacency.set(nodeAId, adjA);

  const adjB = graph.adjacency.get(nodeBId) || [];
  adjB.push(id);
  graph.adjacency.set(nodeBId, adjB);

  return id;
}

// Over/under via grid parity. Crossings sit at doubled-lattice points with
// odd coordinate sum; at (even, odd) points (vertical-wall midpoints) the
// "/" (NE-SW) pass goes over, at (odd, even) points the "\" pass goes over.
// Along any thread, consecutive crossings differ by an odd number of
// {diagonal steps + wall bounces}, and each step flips midpoint class while
// each bounce flips direction class - so this checkerboard provably
// alternates over/under along every strand, for any wall placement.
export function assignCheckerboardParity(graph: TangleGraph): void {
  for (const [_nodeId, node] of graph.nodes) {
    if (node.type === NODE_TYPE.CROSSING) {
      node.isOver = node.latticePos[0] % 2 === 0;
    }
  }
}

// Structural invariants: edges reference existing nodes, and node degrees
// match their types (crossing 4, turn 2, end 1, junction 3+). True planarity
// is guaranteed by construction (segments within a cell are either parallel
// diagonals or share a midpoint endpoint).
export function checkStructure(graph: TangleGraph): boolean {
  for (const [_edgeId, edge] of graph.edges) {
    if (!graph.nodes.has(edge.nodeA) || !graph.nodes.has(edge.nodeB)) {
      return false;
    }
  }

  for (const [nodeId, node] of graph.nodes) {
    const degree = graph.adjacency.get(nodeId)?.length ?? 0;
    if (node.type === NODE_TYPE.CROSSING && degree !== 4) return false;
    if (node.type === NODE_TYPE.TURN && degree !== 2) return false;
    if (node.type === NODE_TYPE.END && degree !== 1) return false;
    if (node.type === NODE_TYPE.JUNCTION && degree < 3) return false;
  }

  return true;
}

// Verify perfect alternation: walking each strand in order, crossing passes
// must go over, under, over, under, ... (wrapping around for closed strands).
export function checkAlternation(graph: TangleGraph): boolean {
  for (const strand of graph.strands) {
    const passes: boolean[] = [];
    // Closed strands repeat the start node at the end; skip the duplicate.
    const count = strand.isClosed
      ? strand.nodes.length - 1
      : strand.nodes.length;

    for (let i = 0; i < count; i++) {
      const node = graph.nodes.get(strand.nodes[i])!;
      if (node.type !== NODE_TYPE.CROSSING) continue;
      if (i + 1 >= strand.nodes.length) continue; // open strand ends here

      // Direction of this pass, from the next node along the strand. Turn
      // nodes are offset by half a step, which shrinks one component but
      // never flips its sign, so the diagonal class is preserved.
      const next = graph.nodes.get(strand.nodes[i + 1])!;
      const vx = next.latticePos[0] - node.latticePos[0];
      const vy = next.latticePos[1] - node.latticePos[1];
      const isSlash = vx * vy > 0;
      passes.push(isSlash ? node.isOver === true : node.isOver !== true);
    }

    if (passes.length < 2) continue;
    for (let i = 0; i < passes.length; i++) {
      const j = (i + 1) % passes.length;
      if (j === 0 && !strand.isClosed) continue;
      if (passes[i] === passes[j]) return false;
    }
  }
  return true;
}

// Verify that strands partition the edge set: every edge appears in exactly
// one strand.
export function checkStrandPartition(graph: TangleGraph): boolean {
  const seen = new Set<string>();
  for (const strand of graph.strands) {
    for (const edgeId of strand.edgeIds) {
      if (seen.has(edgeId) || !graph.edges.has(edgeId)) return false;
      seen.add(edgeId);
    }
  }
  return seen.size === graph.edges.size;
}
