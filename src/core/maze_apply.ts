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
//  - LONG DEAD-END THREAD (applyMazeCuts): a closed maze strand cut open,
//    one flank fused into its first crossing, the other flank's tip left
//    FREE mid-fabric.
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
import type { MazePlan, MazeCut, MazeCutTrim } from "./maze_plan";

// Returns the render HUE GROUP per strand (index into the original strand
// list): bridges inherit their host strand's hue so a splice reads as
// thread material rather than a foreign patch, and applyMazeCuts extends
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

  // 4-way merges: the crossing becomes a true intersection.
  for (const cid of [...plan.spanningMerges, ...plan.fourWayMerges]) {
    graph.nodes.get(cid)!.type = NODE_TYPE.JUNCTION;
  }

  return hueGroup;
}

// Entrance/exit carves, applied AFTER the junction surgery (they locate their
// edge by SEARCH, so earlier strand splits can't stale the reference). Each
// cut removes its edge; the TAIL flank gets a half-edge to a new anchored END
// running toward the corner, and the other flank is TRIMMED per the plan:
// walked back to its first inter-strand crossing, which is fused into a
// 3-way JUNCTION, with the stub in between deleted - so each corner has
// exactly one off-screen tail and no dangling decoy. When the plan found no
// eligible trim (rare), both flanks keep anchored decoy tails as before,
// spread slightly apart so the two loose ends stay visually distinct.
const CUT_REACH = 1.5;
const CUT_SPREAD = 0.4;

// The anchored END node ids the cuts can create, exported for the walk
// graph (gameplay) to locate the entrance/exit tails. With a trim only one
// of each pair exists.
export const ENTRANCE_END_IDS = ["mentr_a", "mentr_b"] as const;
export const EXIT_END_IDS = ["mexit_a", "mexit_b"] as const;

export function applyMazeCuts(
  graph: TangleGraph,
  plan: MazePlan,
  hueGroup?: number[]
): void {
  // Tail directions follow the plan's anchors (SHAPED LATTICES); legacy
  // plans without dirs keep the historic corner diagonals.
  const s = Math.SQRT1_2;
  cutStrandOpen(
    graph,
    plan.entrance,
    plan.entranceDir ?? [-s, -s],
    "mentr",
    hueGroup
  );
  cutStrandOpen(graph, plan.exit, plan.exitDir ?? [s, s], "mexit", hueGroup);
  // Long dead-end threads: same cut+trim surgery, but the surviving tip is
  // FREE (null dir -> no anchor), hanging mid-fabric at the end of what is
  // now a long open thread.
  plan.deadEndCuts.forEach((cut, k) => {
    if (!cut.trim) {
      throw new Error("maze cut: dead-end cuts require a planned trim");
    }
    cutStrandOpen(graph, cut, null, `mdead${k}`, hueGroup);
  });
}

// Delete a trim's stub (edges + interior TURN nodes) from the graph and
// retype the merge crossing into a JUNCTION. `pathNodes`/`pathEdges` is the
// linearized kept-side path containing the stub at its start (fromStart) or
// end; returns the merge node's index in the path, against which the caller
// truncates.
function deleteStub(
  graph: TangleGraph,
  trim: MazeCutTrim,
  pathNodes: string[],
  fromStart: boolean
): number {
  const nStub = trim.stubNodes.length;
  const mergeIdx = fromStart ? nStub : pathNodes.length - 1 - nStub;
  if (pathNodes[mergeIdx] !== trim.mergeCrossing) {
    throw new Error("maze cut trim: plan/graph mismatch at the merge node");
  }
  const rmAdj = (n: string, e: string): void => {
    const list = graph.adjacency.get(n);
    if (!list) return;
    const i = list.indexOf(e);
    if (i >= 0) list.splice(i, 1);
  };
  for (const eid of trim.stubEdges) {
    const e = graph.edges.get(eid);
    if (!e) throw new Error(`maze cut trim: stub edge ${eid} missing`);
    graph.edges.delete(eid);
    rmAdj(e.nodeA, eid);
    rmAdj(e.nodeB, eid);
  }
  for (const nid of trim.stubNodes) {
    graph.nodes.delete(nid);
    graph.adjacency.delete(nid);
  }
  graph.nodes.get(trim.mergeCrossing)!.type = NODE_TYPE.JUNCTION;
  return mergeIdx;
}

function cutStrandOpen(
  graph: TangleGraph,
  cut: MazeCut,
  // Corner direction for the anchored off-screen tail, or null for a FREE
  // tip hanging mid-fabric (long dead-end threads).
  dir: [number, number] | null,
  idBase: string,
  hueGroup?: number[]
): void {
  const edgeId = cut.edgeId;
  const si = graph.strands.findIndex((st) => st.edgeIds.includes(edgeId));
  if (si < 0) throw new Error(`maze cut: edge ${edgeId} not on any strand`);
  const strand = graph.strands[si];
  const c = strand.edgeIds.indexOf(edgeId);
  const edge = graph.edges.get(edgeId)!;
  const p0 = edge.latticePoints[0];
  const p1 = edge.latticePoints[edge.latticePoints.length - 1];
  const mid: [number, number] = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
  const trim = cut.trim;

  // A single (trimmed) tail is centered on the corner direction (sign 0);
  // decoy pairs spread apart. Without a dir the END carries no anchor and
  // the tip hangs free.
  const mkEnd = (suffix: string, sign: number): string => {
    const id = `${idBase}_${suffix}`;
    graph.nodes.set(id, {
      id,
      type: NODE_TYPE.END,
      latticePos: mid,
      anchor: dir
        ? [
            mid[0] + dir[0] * CUT_REACH - dir[1] * CUT_SPREAD * sign,
            mid[1] + dir[1] * CUT_REACH + dir[0] * CUT_SPREAD * sign,
          ]
        : undefined,
    });
    graph.adjacency.set(id, []);
    return id;
  };

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
  // Tail terminators: "a" ends the pre-cut flank, "b" starts the post-cut
  // flank. Created lazily so a trimmed flank gets no END at all.
  const tailA = (sign: number): { end: string; half: string } => {
    const ea = mkEnd("a", sign);
    return { end: ea, half: addE(`${idBase}_h1`, edge.nodeA, ea, [p0, mid]) };
  };
  const tailB = (sign: number): { end: string; half: string } => {
    const eb = mkEnd("b", sign);
    return { end: eb, half: addE(`${idBase}_h2`, eb, edge.nodeB, [mid, p1]) };
  };

  graph.edges.delete(edgeId);
  rmAdj(edge.nodeA, edgeId);
  rmAdj(edge.nodeB, edgeId);

  if (strand.isClosed) {
    // Linearize: P runs n_{c+1} (post-cut flank "b") the long way around to
    // n_c (pre-cut flank "a"); E are its m-1 connecting edges.
    const nodes0 = strand.nodes.slice(0, -1); // drop the duplicate closer.
    const m = nodes0.length;
    const P: string[] = [];
    const E: string[] = [];
    for (let k = 0; k < m; k++) P.push(nodes0[(c + 1 + k) % m]);
    for (let k = 0; k < m - 1; k++) E.push(strand.edgeIds[(c + 1 + k) % m]);

    if (!trim) {
      const a = tailA(1);
      const b = tailB(-1);
      strand.nodes = [b.end, ...P, a.end];
      strand.edgeIds = [b.half, ...E, a.half];
    } else if (trim.side === "b") {
      // Post-cut flank trimmed to its merge; the tail hangs off flank "a".
      const j = deleteStub(graph, trim, P, true);
      const a = tailA(0);
      strand.nodes = [...P.slice(j), a.end];
      strand.edgeIds = [...E.slice(j), a.half];
    } else {
      // Pre-cut flank trimmed; the tail hangs off flank "b".
      const j = deleteStub(graph, trim, P, false);
      const b = tailB(0);
      strand.nodes = [b.end, ...P.slice(0, j + 1)];
      strand.edgeIds = [b.half, ...E.slice(0, j)];
    }
    strand.isClosed = false;
  } else {
    // A second cut on an already-open strand splits it in two.
    const nodes0 = strand.nodes;
    const edges0 = strand.edgeIds;
    let leftNodes = nodes0.slice(0, c + 1); // flank "a" at its end.
    let leftEdges = edges0.slice(0, c);
    let rightNodes = nodes0.slice(c + 1); // flank "b" at its start.
    let rightEdges = edges0.slice(c + 1);

    if (!trim) {
      const a = tailA(1);
      const b = tailB(-1);
      leftNodes = [...leftNodes, a.end];
      leftEdges = [...leftEdges, a.half];
      rightNodes = [b.end, ...rightNodes];
      rightEdges = [b.half, ...rightEdges];
    } else if (trim.side === "a") {
      const j = deleteStub(graph, trim, leftNodes, false);
      leftNodes = leftNodes.slice(0, j + 1);
      leftEdges = leftEdges.slice(0, j);
      const b = tailB(0);
      rightNodes = [b.end, ...rightNodes];
      rightEdges = [b.half, ...rightEdges];
    } else {
      const j = deleteStub(graph, trim, rightNodes, true);
      rightNodes = rightNodes.slice(j);
      rightEdges = rightEdges.slice(j);
      const a = tailA(0);
      leftNodes = [...leftNodes, a.end];
      leftEdges = [...leftEdges, a.half];
    }

    graph.strands[si] = {
      edgeIds: leftEdges,
      isClosed: false,
      nodes: leftNodes,
    };
    graph.strands.push({
      edgeIds: rightEdges,
      isClosed: false,
      nodes: rightNodes,
    });
    // Both halves keep the original loop's hue.
    hueGroup?.push(hueGroup[si]);
  }
}
