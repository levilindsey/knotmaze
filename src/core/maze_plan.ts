// P4 maze mode generation, Stage 5: the combinatorial maze PLAN.
//
// A knot is a set of closed strands joined at degree-4 crossings. To turn it
// into a branching maze we (later stages) cut some strands open and fuse
// threads at junctions; this module computes the PLAN for that - which strands
// form the maze, where the entrance/exit ends go, and which crossings connect
// everything - as pure combinatorial data, independent of physics and render.
//
// Increment 1 (this file) builds the CONNECTIVITY BACKBONE:
//   - the strand-adjacency graph (strands linked by the crossings between them),
//   - the largest connected component = the maze (isolated loops are culled, so
//     there are no unreachable closed loops),
//   - a spanning set of crossings guaranteeing every maze strand is reachable,
//   - entrance/exit cuts at the top-left / bottom-right corners.
// Choice junctions, 4-way merges, dead-end spurs, and clearance passes layer on
// in later increments.

import type { TangleGraph } from "./types";
import { NODE_TYPE } from "./types";

// A place where a strand is carved open (a loose end runs off-screen here).
export interface MazeCut {
  strand: number;
  edgeId: string;
}

export interface MazePlan {
  entrance: MazeCut; // top-left corner.
  exit: MazeCut; // bottom-right corner.
  mazeStrands: number[]; // strands that form the reachable maze.
  culledStrands: number[]; // isolated loops excluded from the maze.
  // Crossing node ids that must be realized (merge/smooth/junction) to make
  // every maze strand reachable - the spanning backbone.
  connections: string[];
}

// Inter-strand adjacency entry: a crossing linking this strand to `other`.
interface AdjEntry {
  other: number;
  crossing: string;
}

// Which strands pass through each crossing (2 entries; equal for a
// self-crossing). Strands partition the passes, so this is exact.
function crossingStrandMap(graph: TangleGraph): Map<string, number[]> {
  const map = new Map<string, number[]>();
  graph.strands.forEach((strand, si) => {
    const count = strand.isClosed
      ? strand.nodes.length - 1
      : strand.nodes.length;
    for (let i = 0; i < count; i++) {
      const node = graph.nodes.get(strand.nodes[i])!;
      if (node.type !== NODE_TYPE.CROSSING) continue;
      const list = map.get(node.id);
      if (list) list.push(si);
      else map.set(node.id, [si]);
    }
  });
  return map;
}

// Strand adjacency, inter-strand crossings only (self-crossings don't connect
// a strand to anything new).
function strandAdjacency(
  graph: TangleGraph,
  crossings: Map<string, number[]>
): AdjEntry[][] {
  const adj: AdjEntry[][] = graph.strands.map(() => []);
  for (const [cid, strands] of crossings) {
    if (strands.length === 2 && strands[0] !== strands[1]) {
      adj[strands[0]].push({ other: strands[1], crossing: cid });
      adj[strands[1]].push({ other: strands[0], crossing: cid });
    }
  }
  return adj;
}

// Connected-component label per strand (BFS over inter-strand adjacency).
function components(adj: AdjEntry[][]): { comp: number[]; count: number } {
  const comp = new Array(adj.length).fill(-1);
  let count = 0;
  for (let s = 0; s < adj.length; s++) {
    if (comp[s] >= 0) continue;
    comp[s] = count;
    const queue = [s];
    for (let h = 0; h < queue.length; h++) {
      for (const { other } of adj[queue[h]]) {
        if (comp[other] < 0) {
          comp[other] = count;
          queue.push(other);
        }
      }
    }
    count++;
  }
  return { comp, count };
}

// Nearest maze-strand edge to a corner, by the closest lattice point on the
// edge. Ties break on edge id for determinism.
function nearestEdgeToCorner(
  graph: TangleGraph,
  mazeStrands: number[],
  corner: [number, number]
): MazeCut {
  let best: MazeCut | null = null;
  let bestD = Infinity;
  for (const strand of mazeStrands) {
    for (const edgeId of graph.strands[strand].edgeIds) {
      const edge = graph.edges.get(edgeId)!;
      let d = Infinity;
      for (const [x, y] of edge.latticePoints) {
        const dd = (x - corner[0]) ** 2 + (y - corner[1]) ** 2;
        if (dd < d) d = dd;
      }
      if (d < bestD || (d === bestD && best !== null && edgeId < best.edgeId)) {
        bestD = d;
        best = { strand, edgeId };
      }
    }
  }
  return best!;
}

export function buildMazePlan(graph: TangleGraph): MazePlan {
  const crossings = crossingStrandMap(graph);
  const adj = strandAdjacency(graph, crossings);
  const { comp, count } = components(adj);

  // The maze is the LARGEST component; smaller components are isolated loops,
  // culled so nothing unreachable remains.
  const sizes = new Array(count).fill(0);
  comp.forEach((c) => sizes[c]++);
  let main = 0;
  for (let c = 1; c < count; c++) if (sizes[c] > sizes[main]) main = c;

  const mazeStrands: number[] = [];
  const culledStrands: number[] = [];
  comp.forEach((c, s) =>
    (c === main ? mazeStrands : culledStrands).push(s)
  );

  // Spanning tree over the main component: one crossing per newly-reached
  // strand, guaranteeing reachability from the root.
  const connections: string[] = [];
  const inTree = new Set<number>([mazeStrands[0]]);
  const queue = [mazeStrands[0]];
  for (let h = 0; h < queue.length; h++) {
    for (const { other, crossing } of adj[queue[h]]) {
      if (comp[other] === main && !inTree.has(other)) {
        inTree.add(other);
        connections.push(crossing);
        queue.push(other);
      }
    }
  }

  const size = Math.max(2, Math.round(graph.params.gridSize));
  const bound = size * 2;
  const entrance = nearestEdgeToCorner(graph, mazeStrands, [0, 0]);
  const exit = nearestEdgeToCorner(graph, mazeStrands, [bound, bound]);

  return { entrance, exit, mazeStrands, culledStrands, connections };
}
