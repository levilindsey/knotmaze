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
import { hypot2 } from "../util/det_math";

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

// TAIL ESCAPE (shaped lattices, plan.escapeTails): planAnchors nudges a
// shaped anchor's target into THICK material (thin silhouette slivers
// hold kink eyes torn open) and maze_plan cuts the nearest OUTER-FACE
// edge, but a fixed CUT_REACH tail still parked the start/exit dots
// among neighboring threads - settled clearance 0.4-1.3 on every non-rect
// shape vs 2.3-2.5 at rect corners. The tail instead follows the shortest
// path (biased toward the anchor's compass direction) through a clearance
// field - never closer than TAIL_PASS to other material once past its
// own flank, so it can bend out of notches between bulging loops - until
// it clears everything by TAIL_CLEAR. The margin is generous because a
// shape's material can drift TOWARD a pin while settling (rect corners
// gain clearance as the knot contracts; shapes need not). The tail edge
// gets the path as real lattice points (no stretched springs). No path
// within TAIL_MAX_PATH: the historic fixed tail.
const TAIL_CLEAR = 3.0;
const TAIL_PASS = 0.45;
const TAIL_START = 0.9; // The first stretch may graze the tail's own flank.
const TAIL_MAX_PATH = 12;
const ESC_RES = 4; // Raster px per lattice unit.
// Graceful degradation: [pass, clear] tiers tried in order before the
// historic fixed tail (a notch narrower than 2 x TAIL_PASS blocks the
// first tier; the settle battery found ~1 in 8 shape/seed/anchor cases
// needing a later tier - collision separates the brief squeeze).
const ESCAPE_TIERS: Array<[number, number]> = [
  [TAIL_PASS, TAIL_CLEAR],
  [TAIL_PASS, 2.2],
  [0.3, TAIL_CLEAR],
  [0.3, 2.2],
];

// The escaped tail's lattice points after the cut midpoint (outward,
// ending at the pinned END), or null when the fixed tail must stand.
export function escapePath(
  graph: TangleGraph,
  mid: [number, number],
  dir: [number, number],
  pass = TAIL_PASS,
  clear = TAIL_CLEAR
): Array<[number, number]> | null {
  let minX = mid[0];
  let minY = mid[1];
  let maxX = mid[0];
  let maxY = mid[1];
  for (const e of graph.edges.values()) {
    for (const [x, y] of e.latticePoints) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  const PAD = clear + 2;
  const W = Math.ceil((maxX - minX + 2 * PAD) * ESC_RES) + 1;
  const H = Math.ceil((maxY - minY + 2 * PAD) * ESC_RES) + 1;
  const toPx = (x: number, y: number): number => {
    const ix = Math.round((x - minX + PAD) * ESC_RES);
    const iy = Math.round((y - minY + PAD) * ESC_RES);
    return iy * W + ix;
  };
  // Chamfer distance transform (3-4) from every material pixel.
  const BIG = 1e9;
  const dist = new Float64Array(W * H).fill(BIG);
  for (const e of graph.edges.values()) {
    const lp = e.latticePoints;
    for (let i = 0; i + 1 < lp.length; i++) {
      const [ax, ay] = lp[i];
      const [bx, by] = lp[i + 1];
      const n = Math.max(1, Math.ceil(hypot2(bx - ax, by - ay) * ESC_RES * 2));
      for (let k = 0; k <= n; k++) {
        dist[toPx(ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n)] = 0;
      }
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      let d = dist[i];
      if (x > 0) d = Math.min(d, dist[i - 1] + 3);
      if (y > 0) {
        d = Math.min(d, dist[i - W] + 3);
        if (x > 0) d = Math.min(d, dist[i - W - 1] + 4);
        if (x < W - 1) d = Math.min(d, dist[i - W + 1] + 4);
      }
      dist[i] = d;
    }
  }
  for (let y = H - 1; y >= 0; y--) {
    for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x;
      let d = dist[i];
      if (x < W - 1) d = Math.min(d, dist[i + 1] + 3);
      if (y < H - 1) {
        d = Math.min(d, dist[i + W] + 3);
        if (x < W - 1) d = Math.min(d, dist[i + W + 1] + 4);
        if (x > 0) d = Math.min(d, dist[i + W - 1] + 4);
      }
      dist[i] = d;
    }
  }
  const clr = (i: number): number => dist[i] / (3 * ESC_RES);

  // Dijkstra from the cut midpoint; a step's cost is its length plus a
  // small penalty for heading away from the compass direction.
  const start = toPx(mid[0], mid[1]);
  const sx = start % W;
  const sy = (start - sx) / W;
  const cost = new Float64Array(W * H).fill(Infinity);
  const prev = new Int32Array(W * H).fill(-1);
  const heap: number[] = [];
  const push = (i: number): void => {
    heap.push(i);
    let k = heap.length - 1;
    while (k > 0) {
      const pk = (k - 1) >> 1;
      if (cost[heap[pk]] <= cost[heap[k]]) break;
      [heap[pk], heap[k]] = [heap[k], heap[pk]];
      k = pk;
    }
  };
  const pop = (): number => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1;
        const r = l + 1;
        let m = k;
        if (l < heap.length && cost[heap[l]] < cost[heap[m]]) m = l;
        if (r < heap.length && cost[heap[r]] < cost[heap[m]]) m = r;
        if (m === k) break;
        [heap[m], heap[k]] = [heap[k], heap[m]];
        k = m;
      }
    }
    return top;
  };
  cost[start] = 0;
  push(start);
  const maxCost = TAIL_MAX_PATH * ESC_RES * 1.3;
  let goal = -1;
  while (heap.length > 0) {
    const i = pop();
    const x = i % W;
    const y = (i - x) / W;
    const fromStart = hypot2(x - sx, y - sy) / ESC_RES;
    if (fromStart >= CUT_REACH && clr(i) >= clear) {
      goal = i;
      break;
    }
    if (cost[i] > maxCost) break;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (ox === 0 && oy === 0) continue;
        const nx = x + ox;
        const ny = y + oy;
        if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
        const j = ny * W + nx;
        const near = hypot2(nx - sx, ny - sy) / ESC_RES <= TAIL_START;
        if (!near && clr(j) < pass) continue;
        const len = ox !== 0 && oy !== 0 ? Math.SQRT2 : 1;
        const along = (ox * dir[0] + oy * dir[1]) / len;
        const c = cost[i] + len * (1 + 0.35 * (1 - along));
        if (c < cost[j]) {
          cost[j] = c;
          prev[j] = i;
          push(j);
        }
      }
    }
  }
  if (goal < 0) return null;

  // Pixel path -> lattice points, resampled about every lattice unit.
  const px: Array<[number, number]> = [];
  for (let i = goal; i >= 0 && i !== start; i = prev[i]) {
    const x = i % W;
    const y = (i - x) / W;
    px.push([x / ESC_RES + minX - PAD, y / ESC_RES + minY - PAD]);
  }
  px.reverse();
  const out: Array<[number, number]> = [];
  let last = mid;
  for (let k = 0; k < px.length; k++) {
    const q = px[k];
    const isEnd = k === px.length - 1;
    if (isEnd || hypot2(q[0] - last[0], q[1] - last[1]) >= 1) {
      out.push(q);
      last = q;
    }
  }
  return out.length > 0 ? out : null;
}

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
  const escape = plan.escapeTails === true;
  cutStrandOpen(
    graph,
    plan.entrance,
    plan.entranceDir ?? [-s, -s],
    "mentr",
    hueGroup,
    escape
  );
  cutStrandOpen(
    graph,
    plan.exit,
    plan.exitDir ?? [s, s],
    "mexit",
    hueGroup,
    escape
  );
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
  hueGroup?: number[],
  escape = false
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
  // An escaped single tail (TAIL ESCAPE) follows `escaped` out from the
  // cut midpoint; the END node sits at its last point.
  let escaped: Array<[number, number]> | null = null;
  const mkEnd = (suffix: string, sign: number): string => {
    const id = `${idBase}_${suffix}`;
    escaped = null;
    if (dir && escape && sign === 0) {
      for (const [pass, clear] of ESCAPE_TIERS) {
        escaped = escapePath(graph, mid, dir, pass, clear);
        if (escaped) break;
      }
    }
    const tip = escaped ? escaped[escaped.length - 1] : null;
    graph.nodes.set(id, {
      id,
      type: NODE_TYPE.END,
      latticePos: tip ?? mid,
      anchor: tip
        ? tip
        : dir
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
    const pts: Array<[number, number]> = escaped
      ? [p0, mid, ...escaped]
      : [p0, mid];
    return { end: ea, half: addE(`${idBase}_h1`, edge.nodeA, ea, pts) };
  };
  const tailB = (sign: number): { end: string; half: string } => {
    const eb = mkEnd("b", sign);
    const pts: Array<[number, number]> = escaped
      ? [...[...escaped].reverse(), mid, p1]
      : [mid, p1];
    return { end: eb, half: addE(`${idBase}_h2`, eb, edge.nodeB, pts) };
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
