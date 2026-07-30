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

// Tunable maze-generation knobs (serialized into the URL in a later stage).
export interface MazeParams {
  // Fraction of eligible crossings turned into CHOICE junctions (branch
  // points). A ParamField later lets this vary by region; a scalar for now.
  branchDensity: number;
  // Lattice-distance around the exit / entrance corners kept branch-free, so
  // the ends of the solve aren't cluttered with choices (challenge shaping).
  exitClearance: number;
  entranceClearance: number;
  // Minimum lattice-distance between chosen junctions (spatial spread).
  junctionSpacing: number;
  // Fraction of CHOICE junctions realized as 3-way spurs (each spawns one
  // dead-end) vs. 4-way braided merges (no dead-end). 0 = fully braided.
  // Reachability connections are always 4-way, so this only touches extras.
  deadEndDensity: number;
}

export const DEFAULT_MAZE_PARAMS: MazeParams = {
  branchDensity: 0.4,
  exitClearance: 5,
  entranceClearance: 2.5,
  junctionSpacing: 2,
  deadEndDensity: 0.3,
};

// A junction site with its realized degree. "four" = braided merge (no dead-
// end); "three" = a 3-way that spawns one dead-end spur.
export interface RealizedJunction {
  crossing: string;
  type: "three" | "four";
}

export interface MazePlan {
  entrance: MazeCut; // top-left corner.
  exit: MazeCut; // bottom-right corner.
  mazeStrands: number[]; // strands that form the reachable maze.
  culledStrands: number[]; // isolated loops excluded from the maze.
  // Crossing node ids that must be realized (merge/smooth/junction) to make
  // every maze strand reachable - the spanning backbone.
  connections: string[];
  // Crossing node ids selected as CHOICE junctions (branch points), spread
  // across the maze and clear of the entrance/exit corridors.
  junctions: string[];
  // Every junction that gets realized, with its degree: the reachability
  // connections (always 4-way) plus the choice junctions (split into 3-way
  // spurs vs 4-way merges by deadEndDensity). This is what Stage 6 consumes.
  realized: RealizedJunction[];
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

// Choose CHOICE-junction crossings: eligible = crossings among maze strands,
// clear of the entrance/exit corners; then farthest-first up to the
// branchDensity target while honoring the minimum spacing (deterministic - no
// RNG, ties broken by node id). All crossings on this lattice are near-
// orthogonal (a "/" meets a "\"), so no symmetry filter is needed.
function selectJunctions(
  graph: TangleGraph,
  crossings: Map<string, number[]>,
  mazeStrands: number[],
  bound: number,
  params: MazeParams
): string[] {
  const mazeSet = new Set(mazeStrands);
  const eligible: Array<{ id: string; x: number; y: number }> = [];
  for (const [cid, strands] of crossings) {
    if (!strands.every((s) => mazeSet.has(s))) continue;
    const [x, y] = graph.nodes.get(cid)!.latticePos;
    if (Math.hypot(x, y) < params.entranceClearance) continue;
    if (Math.hypot(x - bound, y - bound) < params.exitClearance) continue;
    eligible.push({ id: cid, x, y });
  }
  eligible.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const target = Math.round(params.branchDensity * eligible.length);
  if (target <= 0 || eligible.length === 0) return [];

  // Seed farthest-first at the crossing nearest the eligible centroid.
  let cx = 0;
  let cy = 0;
  for (const e of eligible) {
    cx += e.x;
    cy += e.y;
  }
  cx /= eligible.length;
  cy /= eligible.length;
  let first = 0;
  let firstD = Infinity;
  eligible.forEach((e, i) => {
    const d = (e.x - cx) ** 2 + (e.y - cy) ** 2;
    if (d < firstD) {
      firstD = d;
      first = i;
    }
  });

  const chosen = [eligible[first]];
  const used = new Set([first]);
  while (chosen.length < target) {
    let bestI = -1;
    let bestMin = -1;
    for (let i = 0; i < eligible.length; i++) {
      if (used.has(i)) continue;
      let mn = Infinity;
      for (const c of chosen) {
        const d = Math.hypot(eligible[i].x - c.x, eligible[i].y - c.y);
        if (d < mn) mn = d;
      }
      if (mn < params.junctionSpacing) continue; // too close to a chosen one.
      if (mn > bestMin) {
        bestMin = mn;
        bestI = i;
      }
    }
    if (bestI < 0) break; // nothing left satisfies the spacing floor.
    chosen.push(eligible[bestI]);
    used.add(bestI);
  }
  return chosen.map((c) => c.id);
}

export function buildMazePlan(
  graph: TangleGraph,
  params: MazeParams = DEFAULT_MAZE_PARAMS
): MazePlan {
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
  const junctions = selectJunctions(
    graph,
    crossings,
    mazeStrands,
    bound,
    params
  );

  const realized = realizeJunctions(connections, junctions, params);

  return {
    entrance,
    exit,
    mazeStrands,
    culledStrands,
    connections,
    junctions,
    realized,
  };
}

// Assign a degree to every junction that will be built: reachability
// connections stay 4-way (they must connect both strands cleanly), and the
// pure-choice junctions are split into 3-way spurs vs 4-way merges by
// deadEndDensity. Deterministic (id-sorted, no RNG).
function realizeJunctions(
  connections: string[],
  junctions: string[],
  params: MazeParams
): RealizedJunction[] {
  const connSet = new Set(connections);
  const out: RealizedJunction[] = [];
  for (const c of connSet) out.push({ crossing: c, type: "four" });

  const choices = junctions.filter((c) => !connSet.has(c)).sort();
  const nThree = Math.round(params.deadEndDensity * choices.length);
  choices.forEach((c, i) => {
    out.push({ crossing: c, type: i < nThree ? "three" : "four" });
  });
  return out;
}
