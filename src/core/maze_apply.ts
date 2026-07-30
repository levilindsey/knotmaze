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

export function applyMazePlan(graph: TangleGraph, plan: MazePlan): void {
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
  }

  // 4-way merges: the crossing becomes a true intersection.
  for (const cid of [...plan.spanningMerges, ...plan.fourWayMerges]) {
    graph.nodes.get(cid)!.type = NODE_TYPE.JUNCTION;
  }
}
