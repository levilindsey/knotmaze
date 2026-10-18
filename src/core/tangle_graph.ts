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
// JUNCTIONS (maze merges/splices) interrupt the weave: alternation is checked
// within the runs between junctions, never across one - a 4-way merge removes
// a crossing from the sequence, and the two flanking passes legitimately
// repeat parity.
export function checkAlternation(graph: TangleGraph): boolean {
  const seenCrossings = new Set<string>();
  for (const strand of graph.strands) {
    // Tokens along the strand: a boolean per crossing pass (goes over?),
    // "J" per junction interruption.
    const tokens: Array<boolean | "J"> = [];
    // Closed strands repeat the start node at the end; skip the duplicate.
    const count = strand.isClosed
      ? strand.nodes.length - 1
      : strand.nodes.length;

    for (let i = 0; i < count; i++) {
      const node = graph.nodes.get(strand.nodes[i])!;
      if (node.type === NODE_TYPE.JUNCTION) {
        tokens.push("J");
        continue;
      }
      if (node.type !== NODE_TYPE.CROSSING) continue;
      if (i + 1 >= strand.nodes.length) continue; // open strand ends here

      // Direction of this pass: the first segment of its own edge toward
      // the next node (for two-point edges, exactly the next node - turn
      // nodes are offset by half a step, which shrinks one component but
      // never flips its sign, so the diagonal class is preserved). The
      // segment, not the next node, because an escaped maze tail's END
      // sits far down a bent path; physics reads the same first segment
      // (assignCrossings' next particle).
      let vx: number;
      let vy: number;
      const edge = graph.edges.get(strand.edgeIds[i]);
      if (edge && edge.latticePoints.length >= 2) {
        const lp = edge.latticePoints;
        const fwd = edge.nodeA === strand.nodes[i];
        const a = fwd ? lp[0] : lp[lp.length - 1];
        const b = fwd ? lp[1] : lp[lp.length - 2];
        vx = b[0] - a[0];
        vy = b[1] - a[1];
      } else {
        const next = graph.nodes.get(strand.nodes[i + 1])!;
        vx = next.latticePos[0] - node.latticePos[0];
        vy = next.latticePos[1] - node.latticePos[1];
      }
      const isSlash = vx * vy > 0;
      if (node.overFirst !== undefined) {
        const isFirst = !seenCrossings.has(node.id);
        seenCrossings.add(node.id);
        tokens.push(isFirst ? node.overFirst : !node.overFirst);
      } else {
        tokens.push(isSlash ? node.isOver === true : node.isOver !== true);
      }
    }

    const firstJ = tokens.indexOf("J");
    if (strand.isClosed && firstJ < 0) {
      // Closed, uninterrupted: the original cyclic check.
      const passes = tokens as boolean[];
      if (passes.length < 2) continue;
      for (let i = 0; i < passes.length; i++) {
        if (passes[i] === passes[(i + 1) % passes.length]) return false;
      }
    } else {
      // Open strand, or closed with junction interruptions: scan linearly
      // (rotated to start just after a junction so the wrap pair is checked
      // exactly when no junction separates it), resetting at each "J".
      const n = tokens.length;
      let prev: boolean | null = null;
      for (let k = 0; k < n; k++) {
        const t = strand.isClosed ? tokens[(firstJ + 1 + k) % n] : tokens[k];
        if (t === "J") {
          prev = null;
          continue;
        }
        if (prev !== null && prev === t) return false;
        prev = t;
      }
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
