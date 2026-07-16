import type {
  Node,
  Edge,
  NodeType,
  TangleGraph,
  GenerationParams,
  Strand,
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

// Trace strands by walking through the graph.
// A strand is a maximal path that goes straight through junctions (degree > 2),
// and terminates at ends or closes in a loop.
export function traceStrands(graph: TangleGraph): Strand[] {
  const visitedEdges = new Set<string>();
  const strands: Strand[] = [];

  for (const [edgeId, _edge] of graph.edges) {
    if (visitedEdges.has(edgeId)) continue;

    // Start a strand walk.
    const strand = traceStrand(graph, edgeId, visitedEdges);
    strands.push(strand);
  }

  graph.strands = strands;
  return strands;
}

function traceStrand(
  graph: TangleGraph,
  startEdgeId: string,
  visitedEdges: Set<string>
): Strand {
  const edgeIds: string[] = [startEdgeId];
  const nodes: string[] = [];

  let currentEdgeId = startEdgeId;
  const startEdge = graph.edges.get(startEdgeId)!;
  let currentNodeId = startEdge.nodeA;
  nodes.push(currentNodeId);

  visitedEdges.add(startEdgeId);

  // Walk forward until we hit a junction, end, or close a loop.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const currentNode = graph.nodes.get(currentNodeId)!;
    nodes.push(currentEdgeId === edgeIds[0] ? startEdge.nodeB : currentNodeId);

    // Determine next edge.
    const adj = graph.adjacency.get(currentNodeId) || [];
    const unvisitedEdges = adj.filter(
      (eId) => !visitedEdges.has(eId) || eId === startEdgeId
    );

    if (currentNode.type === NODE_TYPE.END) {
      // Strand terminates at an end.
      break;
    }

    if (currentNode.type === NODE_TYPE.CROSSING) {
      // At a crossing, always take the straight-through edge.
      const nextEdgeId = unvisitedEdges.find((eId) => eId !== currentEdgeId);
      if (!nextEdgeId) break;

      const nextEdge = graph.edges.get(nextEdgeId)!;
      const nextNodeId =
        nextEdge.nodeA === currentNodeId ? nextEdge.nodeB : nextEdge.nodeA;

      if (visitedEdges.has(nextEdgeId) && nextEdgeId !== startEdgeId) {
        // Loop closed.
        break;
      }

      visitedEdges.add(nextEdgeId);
      currentEdgeId = nextEdgeId;
      currentNodeId = nextNodeId;
      edgeIds.push(nextEdgeId);

      if (nextNodeId === nodes[0]) {
        // Closed loop.
        return { edgeIds, isClosed: true, nodes };
      }
    } else if (currentNode.type === NODE_TYPE.JUNCTION) {
      // At a junction, trace ends (other edge paths continue elsewhere).
      break;
    } else if (currentNode.type === NODE_TYPE.TURN) {
      // TURN nodes should not occur mid-strand (they're path control only).
      break;
    }
  }

  return {
    edgeIds,
    isClosed: nodes[nodes.length - 1] === nodes[0],
    nodes,
  };
}

// Compute checkerboard parity for alternating over/under assignment.
export function assignCheckerboardParity(graph: TangleGraph): void {
  for (const [_nodeId, node] of graph.nodes) {
    if (node.type === NODE_TYPE.CROSSING) {
      // Parity is determined by (x + y) % 2 of lattice position.
      const [x, y] = node.latticePos;
      node.isOver = (x + y) % 2 === 0;
    }
  }
}

// Compute planarity invariant: verify that all edges connect existing nodes.
export function checkPlanarity(graph: TangleGraph): boolean {
  for (const [_edgeId, edge] of graph.edges) {
    if (!graph.nodes.has(edge.nodeA) || !graph.nodes.has(edge.nodeB)) {
      return false;
    }
  }
  return true;
}

// Verify alternation parity along each strand.
export function checkAlternation(graph: TangleGraph): boolean {
  for (const strand of graph.strands) {
    for (const edgeId of strand.edgeIds) {
      const edge = graph.edges.get(edgeId)!;
      const nodeA = graph.nodes.get(edge.nodeA)!;
      const nodeB = graph.nodes.get(edge.nodeB)!;

      // Both endpoints of an edge between two crossings must have opposite parity.
      if (
        nodeA.type === NODE_TYPE.CROSSING &&
        nodeB.type === NODE_TYPE.CROSSING
      ) {
        if (nodeA.isOver === nodeB.isOver) {
          return false; // Alternation failed.
        }
      }
    }
  }
  return true;
}
