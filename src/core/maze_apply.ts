// P4 maze mode generation, Stage 5d: APPLY the maze plan to the tangle graph.
//
// The plan (maze_plan.ts) is pure site data; this module performs the graph
// surgery that makes it real, BEFORE the particle system is built - so the
// physics constructs junction/bridge particles natively instead of being
// operated on afterward:
//
//  - SPLICE: split each host edge at its midpoint into two half-edges around
//    a new degree-3 JUNCTION node, and connect the two junctions with a
//    BRIDGE edge (a new open, single-edge strand). The host strand's
//    traversal passes THROUGH its junction unchanged.
//  - DEAD-END STUB: one split junction on the host, plus a short edge to a
//    new degree-1 END node dangling toward the neighboring thread but
//    stopping short (STUB_REACH of the gap).
//  - 4-WAY MERGE: retype the crossing node CROSSING -> JUNCTION. The graph
//    keeps its degree-4 adjacency; downstream, the passes lose their crossing
//    machinery (no over/under) and the threads genuinely meet.
//
// Entrance/exit cuts are NOT applied here - they stay physics-side carves
// (ParticleSystem.openChain), the machinery Stages 1-3 built and verified.
//
// All new ids use a local mnode_/medge_ namespace with per-call counters, so
// the result is deterministic regardless of what else has touched the global
// id counters.

import type { TangleGraph } from "./types";
import { NODE_TYPE } from "./types";
import type { MazePlan } from "./maze_plan";

// A stub reaches this fraction of the way toward the neighboring thread: far
// enough to read as a real branch, short enough to stay visually (and
// physically) clear of the neighbor it points at.
const STUB_REACH = 0.6;

// Returns the render HUE GROUP per strand (index into the original strand
// list): bridges and stubs inherit their host strand's hue so a splice reads
// as thread material rather than a foreign patch, and applyMazeCuts extends
// the mapping when a cut splits a strand (both halves keep the loop's hue).
export function applyMazePlan(graph: TangleGraph, plan: MazePlan): number[] {
  const hueGroup = graph.strands.map((_, i) => i);
  let nodeCounter = 0;
  let edgeCounter = 0;

  const addNodeAt = (
    type: (typeof NODE_TYPE)[keyof typeof NODE_TYPE],
    pos: [number, number]
  ): string => {
    const id = `mnode_${nodeCounter++}`;
    graph.nodes.set(id, { id, type, latticePos: pos });
    graph.adjacency.set(id, []);
    return id;
  };

  const addEdgeBetween = (
    a: string,
    b: string,
    pts: Array<[number, number]>
  ): string => {
    const id = `medge_${edgeCounter++}`;
    graph.edges.set(id, { id, nodeA: a, nodeB: b, latticePoints: pts });
    graph.adjacency.get(a)!.push(id);
    graph.adjacency.get(b)!.push(id);
    return id;
  };

  const removeAdj = (nodeId: string, edgeId: string): void => {
    const list = graph.adjacency.get(nodeId)!;
    const i = list.indexOf(edgeId);
    if (i >= 0) list.splice(i, 1);
  };

  // Split a host edge at `pos`, inserting a JUNCTION node into the host
  // strand's traversal (edges are stored in traversal order, nodeA = from).
  const splitEdge = (
    strandIdx: number,
    edgeId: string,
    pos: [number, number]
  ): string => {
    const strand = graph.strands[strandIdx];
    const idx = strand.edgeIds.indexOf(edgeId);
    if (idx < 0) {
      throw new Error(`maze apply: edge ${edgeId} not on strand ${strandIdx}`);
    }
    const edge = graph.edges.get(edgeId)!;
    const j = addNodeAt(NODE_TYPE.JUNCTION, pos);
    const p0 = edge.latticePoints[0];
    const p1 = edge.latticePoints[edge.latticePoints.length - 1];
    const e1 = addEdgeBetween(edge.nodeA, j, [p0, pos]);
    const e2 = addEdgeBetween(j, edge.nodeB, [pos, p1]);
    graph.edges.delete(edgeId);
    removeAdj(edge.nodeA, edgeId);
    removeAdj(edge.nodeB, edgeId);
    strand.edgeIds.splice(idx, 1, e1, e2);
    strand.nodes.splice(idx + 1, 0, j);
    return j;
  };

  // Splices: two host junctions + a bridge (its own open strand).
  for (const sp of [...plan.spanningSplices, ...plan.choiceSplices]) {
    const ja = splitEdge(sp.strandA, sp.edgeA, sp.a);
    const jb = splitEdge(sp.strandB, sp.edgeB, sp.b);
    const bid = addEdgeBetween(ja, jb, [sp.a, sp.b]);
    graph.strands.push({ edgeIds: [bid], isClosed: false, nodes: [ja, jb] });
    hueGroup.push(sp.strandA);
  }

  // Dead-end stubs: one host junction + a dangling tip.
  for (const st of plan.deadEndStubs) {
    const j = splitEdge(st.strand, st.edge, st.at);
    const tip: [number, number] = [
      st.at[0] + (st.toward[0] - st.at[0]) * STUB_REACH,
      st.at[1] + (st.toward[1] - st.at[1]) * STUB_REACH,
    ];
    const s = addNodeAt(NODE_TYPE.END, tip);
    const eid = addEdgeBetween(j, s, [st.at, tip]);
    graph.strands.push({ edgeIds: [eid], isClosed: false, nodes: [j, s] });
    hueGroup.push(st.strand);
  }

  // 4-way merges: the crossing becomes a true intersection.
  for (const cid of [...plan.spanningMerges, ...plan.fourWayMerges]) {
    graph.nodes.get(cid)!.type = NODE_TYPE.JUNCTION;
  }

  return hueGroup;
}

// Entrance/exit carves, applied AFTER the junction surgery (they locate their
// edge by SEARCH, so earlier strand splits can't stale the reference). Each
// cut replaces its edge with two half-edges ending at two new anchored END
// nodes, and the host strand is rethreaded open - or split in two if a
// previous cut already opened it. Anchors sit past the cut toward the corner,
// spread slightly apart so the two loose ends stay visually distinct.
const CUT_REACH = 1.5;
const CUT_SPREAD = 0.4;

// The four anchored END node ids the cuts create, exported for the walk
// graph (gameplay) to locate the entrance/exit tails.
export const ENTRANCE_END_IDS = ["mentr_a", "mentr_b"] as const;
export const EXIT_END_IDS = ["mexit_a", "mexit_b"] as const;

export function applyMazeCuts(
  graph: TangleGraph,
  plan: MazePlan,
  hueGroup?: number[]
): void {
  const s = Math.SQRT1_2;
  cutStrandOpen(graph, plan.entrance.edgeId, [-s, -s], "mentr", hueGroup);
  cutStrandOpen(graph, plan.exit.edgeId, [s, s], "mexit", hueGroup);
}

function cutStrandOpen(
  graph: TangleGraph,
  edgeId: string,
  dir: [number, number],
  idBase: string,
  hueGroup?: number[]
): void {
  const si = graph.strands.findIndex((st) => st.edgeIds.includes(edgeId));
  if (si < 0) throw new Error(`maze cut: edge ${edgeId} not on any strand`);
  const strand = graph.strands[si];
  const c = strand.edgeIds.indexOf(edgeId);
  const edge = graph.edges.get(edgeId)!;
  const p0 = edge.latticePoints[0];
  const p1 = edge.latticePoints[edge.latticePoints.length - 1];
  const mid: [number, number] = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
  const perp: [number, number] = [-dir[1], dir[0]];

  const mkEnd = (suffix: string, sign: number): string => {
    const id = `${idBase}_${suffix}`;
    graph.nodes.set(id, {
      id,
      type: NODE_TYPE.END,
      latticePos: mid,
      anchor: [
        mid[0] + dir[0] * CUT_REACH + perp[0] * CUT_SPREAD * sign,
        mid[1] + dir[1] * CUT_REACH + perp[1] * CUT_SPREAD * sign,
      ],
    });
    graph.adjacency.set(id, []);
    return id;
  };
  const ea = mkEnd("a", 1); // terminates the pre-cut side (edge.nodeA side).
  const eb = mkEnd("b", -1); // starts the post-cut side (edge.nodeB side).

  const addE = (
    id: string,
    a: string,
    b: string,
    pts: Array<[number, number]>
  ): string => {
    graph.edges.set(id, { id, nodeA: a, nodeB: b, latticePoints: pts });
    graph.adjacency.get(a)!.push(id);
    graph.adjacency.get(b)!.push(id);
    return id;
  };
  const rmAdj = (n: string, e: string): void => {
    const list = graph.adjacency.get(n)!;
    const i = list.indexOf(e);
    if (i >= 0) list.splice(i, 1);
  };

  graph.edges.delete(edgeId);
  rmAdj(edge.nodeA, edgeId);
  rmAdj(edge.nodeB, edgeId);
  const h1 = addE(`${idBase}_h1`, edge.nodeA, ea, [p0, mid]);
  const h2 = addE(`${idBase}_h2`, eb, edge.nodeB, [mid, p1]);

  if (strand.isClosed) {
    // Rethread the loop as one open path: eb -> (post-cut nodes) -> wraps ->
    // (pre-cut nodes) -> ea.
    const nodes = strand.nodes.slice(0, -1); // drop the duplicate closer.
    const edges0 = strand.edgeIds;
    strand.nodes = [eb, ...nodes.slice(c + 1), ...nodes.slice(0, c + 1), ea];
    strand.edgeIds = [
      h2,
      ...edges0.slice(c + 1),
      ...edges0.slice(0, c),
      h1,
    ];
    strand.isClosed = false;
  } else {
    // A second cut on an already-open strand splits it in two.
    const nodes0 = strand.nodes;
    const edges0 = strand.edgeIds;
    graph.strands[si] = {
      edgeIds: [...edges0.slice(0, c), h1],
      isClosed: false,
      nodes: [...nodes0.slice(0, c + 1), ea],
    };
    graph.strands.push({
      edgeIds: [h2, ...edges0.slice(c + 1)],
      isClosed: false,
      nodes: [eb, ...nodes0.slice(c + 1)],
    });
    // Both halves keep the original loop's hue.
    hueGroup?.push(hueGroup[si]);
  }
}
