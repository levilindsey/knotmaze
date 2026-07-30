// P4 maze mode generation, Stage 5: the combinatorial maze PLAN.
//
// The knot's medial substrate is 4-regular, so junction parity is managed by
// construction, using three vocabulary pieces:
//
//  - SPLICE (3-way, the workhorse): a short new BRIDGE thread between two
//    nearby, near-parallel edges. One splice creates TWO degree-3 junctions
//    (one on each host thread) - parity pairs off and NO dead-end is created.
//    Splices also do the connectivity work: they can reach strands that never
//    cross anything.
//  - 4-WAY MERGE (occasional): an existing crossing fused into a true 4-way
//    intersection. Parity-free, no new material.
//  - DEAD-END STUB (independent knob): a half-splice - a bridge that leaves
//    its host thread toward a neighboring thread but stops short, tip
//    dangling. One 3-way junction + one free tip: the classic maze wrong
//    turn. deadEndDensity 0 = no dead ends anywhere (pure braided maze).
//
// buildMazePlan() is pure combinatorics - no physics, no render, no RNG (the
// plan is fully determined by the graph, preserving URL-as-complete-state):
//  1. find geometrically valid splice candidates (spatial hash; length,
//     parallelism, and perpendicularity windows; the bridge segment must not
//     cross any existing thread),
//  2. strand adjacency = splice candidates + inter-strand crossings; the
//     largest component is the maze, everything else is culled (no isolated
//     loops),
//  3. entrance (top-left) / exit (bottom-right) edge cuts,
//  4. reachability spanning, preferring splices and falling back to 4-way
//     merges only where no splice reaches a strand,
//  5. choice junctions - splices plus fourWayFraction crossing merges - and
//     deadEndDensity stubs, placed farthest-first under a spacing floor and
//     kept clear of both corner corridors.

import type { TangleGraph } from "./types";
import { NODE_TYPE } from "./types";

// A place where a strand is carved open (a loose end runs off-screen here).
export interface MazeCut {
  strand: number;
  edgeId: string;
}

// Tunable maze-generation knobs (serialized into the URL in a later stage).
export interface MazeParams {
  // Fraction of eligible splice candidates realized as extra CHOICE junctions
  // beyond the reachability backbone. The spacing floor caps the high end.
  branchDensity: number;
  // Fraction of those choice junctions realized as 4-way crossing merges
  // instead of 3-way splices ("occasional 4-way intersections").
  fourWayFraction: number;
  // Dead-end stubs as a fraction of the choice-junction count. INDEPENDENT
  // of the 3-way/4-way mix: a stub is a half-splice, so 0 = no dead ends.
  deadEndDensity: number;
  // Lattice radii around the exit / entrance corners kept junction-free, so
  // the endgame isn't cluttered with choices (challenge shaping).
  exitClearance: number;
  entranceClearance: number;
  // Minimum lattice distance between junction SITES. A splice's own two ends
  // are one site and exempt from each other.
  junctionSpacing: number;
}

export const DEFAULT_MAZE_PARAMS: MazeParams = {
  branchDensity: 0.35,
  fourWayFraction: 0.12,
  deadEndDensity: 0.25,
  exitClearance: 5,
  entranceClearance: 2.5,
  junctionSpacing: 2,
};

// A planned splice: a bridge from the midpoint of edgeA to the midpoint of
// edgeB, creating a 3-way junction on each host strand.
export interface SpliceSite {
  edgeA: string;
  strandA: number;
  a: [number, number];
  edgeB: string;
  strandB: number;
  b: [number, number];
}

// A planned dead-end stub: a 3-way junction on the host edge with a short
// bridge dangling toward `toward` (a neighboring thread) but stopping short.
export interface StubSite {
  edge: string;
  strand: number;
  at: [number, number];
  toward: [number, number];
}

export interface MazePlan {
  entrance: MazeCut; // top-left corner.
  exit: MazeCut; // bottom-right corner.
  mazeStrands: number[]; // strands that form the reachable maze.
  culledStrands: number[]; // isolated loops excluded from the maze.
  // Reachability backbone: splices (preferred) and 4-way crossing merges
  // (fallback) that make every maze strand reachable.
  spanningSplices: SpliceSite[];
  spanningMerges: string[]; // crossing node ids.
  // Extra branch points (the challenge).
  choiceSplices: SpliceSite[];
  fourWayMerges: string[]; // crossing node ids.
  deadEndStubs: StubSite[];
}

// ---------------------------------------------------------------------------
// Splice-candidate geometry. Corridor pitch is 2.0 lattice units; adjacent
// parallel threads sit ~1.4 apart perpendicular. The window accepts direct
// neighbors and slightly staggered pairs; the glance bound keeps bridges
// near-perpendicular to both hosts so splices read as clean T junctions.
// (Lattice note: "/" segments live on even diagonals and "\" segments on odd
// anti-diagonals, so the corridor between adjacent parallel threads is
// structurally empty - the intersection test guards the staggered and
// turn-adjacent cases.)
const SPLICE_MIN_LEN = 1.2;
const SPLICE_MAX_LEN = 2.2;
const SPLICE_PARALLEL_MIN = 0.7; // |dirA . dirB|
const SPLICE_GLANCE_MAX = 0.5; // |bridgeDir . dirHost|
// A same-strand splice closer than this many edges along the strand is a
// degenerate hairpin shortcut, not a maze loop.
const SAME_STRAND_MIN_EDGE_SEP = 5;
const CELL = 2.5; // spatial-hash cell (>= SPLICE_MAX_LEN so 3x3 scans cover).

interface EdgeInfo {
  id: string;
  strand: number;
  index: number; // index within the strand's edge list.
  ax: number;
  ay: number;
  bx: number;
  by: number;
  mx: number;
  my: number;
  dx: number; // unit direction.
  dy: number;
}

interface Candidate extends SpliceSite {
  key: string;
}

interface CrossingSite {
  id: string;
  strands: number[]; // the two passes' strands (equal for a self-crossing).
  pos: [number, number];
}

function buildEdgeInfos(graph: TangleGraph): EdgeInfo[] {
  const infos: EdgeInfo[] = [];
  graph.strands.forEach((strand, si) => {
    strand.edgeIds.forEach((eid, idx) => {
      const e = graph.edges.get(eid)!;
      const p0 = e.latticePoints[0];
      const p1 = e.latticePoints[e.latticePoints.length - 1];
      const dx = p1[0] - p0[0];
      const dy = p1[1] - p0[1];
      const len = Math.hypot(dx, dy) || 1;
      infos.push({
        id: eid,
        strand: si,
        index: idx,
        ax: p0[0],
        ay: p0[1],
        bx: p1[0],
        by: p1[1],
        mx: (p0[0] + p1[0]) / 2,
        my: (p0[1] + p1[1]) / 2,
        dx: dx / len,
        dy: dy / len,
      });
    });
  });
  return infos;
}

type Hash = Map<string, EdgeInfo[]>;

function buildHash(infos: EdgeInfo[]): Hash {
  const h: Hash = new Map();
  for (const e of infos) {
    const k = `${Math.floor(e.mx / CELL)},${Math.floor(e.my / CELL)}`;
    const list = h.get(k);
    if (list) list.push(e);
    else h.set(k, [e]);
  }
  return h;
}

// Strict-interior segment intersection (segments crossing at an endpoint of
// either do not count).
function properIntersect(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number
): boolean {
  const r1x = bx - ax;
  const r1y = by - ay;
  const r2x = dx - cx;
  const r2y = dy - cy;
  const denom = r1x * r2y - r1y * r2x;
  if (Math.abs(denom) < 1e-12) return false;
  const qx = cx - ax;
  const qy = cy - ay;
  const u = (qx * r2y - qy * r2x) / denom;
  const v = (qx * r1y - qy * r1x) / denom;
  const eps = 1e-6;
  return u > eps && u < 1 - eps && v > eps && v < 1 - eps;
}

// The bridge segment must not cross ANY existing thread (a bridge through
// another thread would fabricate an unplanned crossing).
function bridgeClear(a: EdgeInfo, b: EdgeInfo, hash: Hash): boolean {
  const minX = Math.min(a.mx, b.mx) - 1;
  const maxX = Math.max(a.mx, b.mx) + 1;
  const minY = Math.min(a.my, b.my) - 1;
  const maxY = Math.max(a.my, b.my) + 1;
  const cx0 = Math.floor(minX / CELL);
  const cx1 = Math.floor(maxX / CELL);
  const cy0 = Math.floor(minY / CELL);
  const cy1 = Math.floor(maxY / CELL);
  for (let cx = cx0; cx <= cx1; cx++) {
    for (let cy = cy0; cy <= cy1; cy++) {
      const bucket = hash.get(`${cx},${cy}`);
      if (!bucket) continue;
      for (const e of bucket) {
        if (e.id === a.id || e.id === b.id) continue;
        if (
          properIntersect(
            a.mx,
            a.my,
            b.mx,
            b.my,
            e.ax,
            e.ay,
            e.bx,
            e.by
          )
        ) {
          return false;
        }
      }
    }
  }
  return true;
}

function findSpliceCandidates(
  graph: TangleGraph,
  infos: EdgeInfo[],
  hash: Hash
): Candidate[] {
  const counts = graph.strands.map((s) => s.edgeIds.length);
  const out: Candidate[] = [];
  for (const a of infos) {
    const cx = Math.floor(a.mx / CELL);
    const cy = Math.floor(a.my / CELL);
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const bucket = hash.get(`${cx + ox},${cy + oy}`);
        if (!bucket) continue;
        for (const b of bucket) {
          if (!(a.id < b.id)) continue; // canonical order + dedupe.
          // Near-parallel hosts.
          if (
            Math.abs(a.dx * b.dx + a.dy * b.dy) < SPLICE_PARALLEL_MIN
          ) {
            continue;
          }
          const gx = b.mx - a.mx;
          const gy = b.my - a.my;
          const glen = Math.hypot(gx, gy);
          if (glen < SPLICE_MIN_LEN || glen > SPLICE_MAX_LEN) continue;
          const ux = gx / glen;
          const uy = gy / glen;
          // Bridge near-perpendicular to both hosts (clean T junctions).
          if (Math.abs(ux * a.dx + uy * a.dy) > SPLICE_GLANCE_MAX) continue;
          if (Math.abs(ux * b.dx + uy * b.dy) > SPLICE_GLANCE_MAX) continue;
          if (a.strand === b.strand) {
            const n = counts[a.strand];
            const d = Math.abs(a.index - b.index);
            if (Math.min(d, n - d) < SAME_STRAND_MIN_EDGE_SEP) continue;
          }
          if (!bridgeClear(a, b, hash)) continue;
          out.push({
            key: `${a.id}|${b.id}`,
            edgeA: a.id,
            strandA: a.strand,
            a: [a.mx, a.my],
            edgeB: b.id,
            strandB: b.strand,
            b: [b.mx, b.my],
          });
        }
      }
    }
  }
  out.sort((p, q) => (p.key < q.key ? -1 : p.key > q.key ? 1 : 0));
  return out;
}

// Which strands pass through each crossing (2 entries; equal for a
// self-crossing). Strands partition the passes, so this is exact.
function findCrossings(graph: TangleGraph): CrossingSite[] {
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
  const out: CrossingSite[] = [];
  for (const [id, strands] of map) {
    const pos = graph.nodes.get(id)!.latticePos;
    out.push({ id, strands, pos: [pos[0], pos[1]] });
  }
  out.sort((p, q) => (p.id < q.id ? -1 : p.id > q.id ? 1 : 0));
  return out;
}

// Connected-component label per strand over the combined adjacency
// (inter-strand splice candidates + inter-strand crossings).
function components(
  nStrands: number,
  cands: Candidate[],
  crossings: CrossingSite[]
): number[] {
  const adj: number[][] = Array.from({ length: nStrands }, () => []);
  for (const c of cands) {
    if (c.strandA !== c.strandB) {
      adj[c.strandA].push(c.strandB);
      adj[c.strandB].push(c.strandA);
    }
  }
  for (const x of crossings) {
    if (x.strands.length === 2 && x.strands[0] !== x.strands[1]) {
      adj[x.strands[0]].push(x.strands[1]);
      adj[x.strands[1]].push(x.strands[0]);
    }
  }
  const comp = new Array(nStrands).fill(-1);
  let label = 0;
  for (let s = 0; s < nStrands; s++) {
    if (comp[s] >= 0) continue;
    comp[s] = label;
    const queue = [s];
    for (let h = 0; h < queue.length; h++) {
      for (const nb of adj[queue[h]]) {
        if (comp[nb] < 0) {
          comp[nb] = label;
          queue.push(nb);
        }
      }
    }
    label++;
  }
  return comp;
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

// Farthest-first selection under a spacing floor. `placed` is the flat list
// of already-occupied junction points; each pick appends its own points so
// later phases space against everything before them. When nothing is placed
// yet, the first available pool entry (canonical order) seeds the process.
function pickFarthest<T>(
  pool: T[],
  ptsOf: (t: T) => number[],
  available: (t: T) => boolean,
  onPick: (t: T) => void,
  count: number,
  spacing: number,
  placed: number[]
): T[] {
  const out: T[] = [];
  const commit = (t: T): void => {
    const pts = ptsOf(t);
    for (let k = 0; k < pts.length; k++) placed.push(pts[k]);
    onPick(t);
    out.push(t);
  };
  while (out.length < count) {
    if (placed.length === 0) {
      const first = pool.find(available);
      if (!first) break;
      commit(first);
      continue;
    }
    let bestI = -1;
    let bestD = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const t = pool[i];
      if (!available(t)) continue;
      const pts = ptsOf(t);
      let d = Infinity;
      for (let k = 0; k < pts.length; k += 2) {
        for (let m = 0; m < placed.length; m += 2) {
          const dd = Math.hypot(pts[k] - placed[m], pts[k + 1] - placed[m + 1]);
          if (dd < d) d = dd;
        }
      }
      if (d < spacing) continue;
      if (d > bestD) {
        bestD = d;
        bestI = i;
      }
    }
    if (bestI < 0) break; // nothing satisfies the spacing floor.
    commit(pool[bestI]);
  }
  return out;
}

function stripKey(c: Candidate): SpliceSite {
  return {
    edgeA: c.edgeA,
    strandA: c.strandA,
    a: c.a,
    edgeB: c.edgeB,
    strandB: c.strandB,
    b: c.b,
  };
}

export function buildMazePlan(
  graph: TangleGraph,
  params: MazeParams = DEFAULT_MAZE_PARAMS
): MazePlan {
  const infos = buildEdgeInfos(graph);
  const hash = buildHash(infos);
  const candidates = findSpliceCandidates(graph, infos, hash);
  const crossings = findCrossings(graph);

  // The maze is the LARGEST connected component of the combined adjacency;
  // smaller components are isolated loops, culled so nothing unreachable
  // remains.
  const comp = components(graph.strands.length, candidates, crossings);
  const compCount = comp.reduce((mx, c) => Math.max(mx, c), -1) + 1;
  const sizes = new Array(compCount).fill(0);
  comp.forEach((c) => sizes[c]++);
  let main = 0;
  for (let c = 1; c < compCount; c++) if (sizes[c] > sizes[main]) main = c;

  let mazeStrands: number[] = [];
  const culledStrands: number[] = [];
  comp.forEach((c, s) => (c === main ? mazeStrands : culledStrands).push(s));

  const size = Math.max(2, Math.round(graph.params.gridSize));
  const bound = size * 2;
  const entrance = nearestEdgeToCorner(graph, mazeStrands, [0, 0]);
  const exit = nearestEdgeToCorner(graph, mazeStrands, [bound, bound]);

  const clearOf = (p: [number, number]): boolean =>
    Math.hypot(p[0], p[1]) >= params.entranceClearance &&
    Math.hypot(p[0] - bound, p[1] - bound) >= params.exitClearance;

  // ---- Reachability spanning: splices preferred, merges as fallback. ----
  const usedEdges = new Set<string>([entrance.edgeId, exit.edgeId]);
  const usedCrossings = new Set<string>();
  const placed: number[] = [];
  const reached = new Set<number>([entrance.strand]);
  const spanningSplices: SpliceSite[] = [];
  const spanningMerges: string[] = [];
  const inMaze = new Set(mazeStrands);

  // Corner-clear candidates first, then the rest (reachability may use an
  // in-clearance site only when nothing else can reach a strand).
  const interCands = candidates.filter((c) => c.strandA !== c.strandB);
  const spanOrder = [...interCands].sort((p, q) => {
    const pc = clearOf(p.a) && clearOf(p.b) ? 0 : 1;
    const qc = clearOf(q.a) && clearOf(q.b) ? 0 : 1;
    return pc - qc || (p.key < q.key ? -1 : 1);
  });
  const interCross = crossings.filter(
    (x) => x.strands.length === 2 && x.strands[0] !== x.strands[1]
  );
  const crossOrder = [...interCross].sort((p, q) => {
    const pc = clearOf(p.pos) ? 0 : 1;
    const qc = clearOf(q.pos) ? 0 : 1;
    return pc - qc || (p.id < q.id ? -1 : 1);
  });

  let guard = 0;
  while (reached.size < mazeStrands.length && guard++ < 100000) {
    let advanced = false;
    // Splice sweep: absorb everything splice-reachable.
    let sweep = true;
    while (sweep) {
      sweep = false;
      for (const c of spanOrder) {
        if (usedEdges.has(c.edgeA) || usedEdges.has(c.edgeB)) continue;
        if (!inMaze.has(c.strandA) || !inMaze.has(c.strandB)) continue;
        const aIn = reached.has(c.strandA);
        const bIn = reached.has(c.strandB);
        if (aIn === bIn) continue;
        reached.add(aIn ? c.strandB : c.strandA);
        usedEdges.add(c.edgeA);
        usedEdges.add(c.edgeB);
        placed.push(c.a[0], c.a[1], c.b[0], c.b[1]);
        spanningSplices.push(stripKey(c));
        sweep = true;
        advanced = true;
      }
    }
    if (reached.size >= mazeStrands.length) break;
    // One crossing merge across the frontier, then try splices again.
    for (const x of crossOrder) {
      if (usedCrossings.has(x.id)) continue;
      if (!inMaze.has(x.strands[0]) || !inMaze.has(x.strands[1])) continue;
      const aIn = reached.has(x.strands[0]);
      const bIn = reached.has(x.strands[1]);
      if (aIn === bIn) continue;
      reached.add(aIn ? x.strands[1] : x.strands[0]);
      usedCrossings.add(x.id);
      placed.push(x.pos[0], x.pos[1]);
      spanningMerges.push(x.id);
      advanced = true;
      break;
    }
    if (!advanced) {
      // A strand connected ONLY through an already-consumed edge (e.g. its
      // sole candidate rides the entrance/exit edge). Vanishingly rare:
      // demote to culled so the reachability invariant stays true.
      for (const s of mazeStrands) {
        if (!reached.has(s)) culledStrands.push(s);
      }
      mazeStrands = mazeStrands.filter((s) => reached.has(s));
      break;
    }
  }

  // ---- Choice junctions + dead-end stubs. ----
  const mazeSet = new Set(mazeStrands);
  const eligible = candidates.filter(
    (c) =>
      mazeSet.has(c.strandA) &&
      mazeSet.has(c.strandB) &&
      clearOf(c.a) &&
      clearOf(c.b)
  );
  const target = Math.round(params.branchDensity * eligible.length);
  const nFour = Math.min(Math.round(params.fourWayFraction * target), target);
  const nSplice = target - nFour;
  const nStubs = Math.round(params.deadEndDensity * target);

  const spliceAvail = (c: Candidate): boolean =>
    !usedEdges.has(c.edgeA) && !usedEdges.has(c.edgeB);
  const spliceTake = (c: Candidate): void => {
    usedEdges.add(c.edgeA);
    usedEdges.add(c.edgeB);
  };

  const choiceSplices = pickFarthest(
    eligible,
    (c) => [c.a[0], c.a[1], c.b[0], c.b[1]],
    spliceAvail,
    spliceTake,
    nSplice,
    params.junctionSpacing,
    placed
  ).map(stripKey);

  const fourPool = crossings.filter(
    (x) => x.strands.every((s) => mazeSet.has(s)) && clearOf(x.pos)
  );
  const fourWayMerges = pickFarthest(
    fourPool,
    (x) => [x.pos[0], x.pos[1]],
    (x) => !usedCrossings.has(x.id),
    (x) => usedCrossings.add(x.id),
    nFour,
    params.junctionSpacing,
    placed
  ).map((x) => x.id);

  const deadEndStubs = pickFarthest(
    eligible,
    (c) => [c.a[0], c.a[1]],
    spliceAvail,
    spliceTake,
    nStubs,
    params.junctionSpacing,
    placed
  ).map((c) => ({
    edge: c.edgeA,
    strand: c.strandA,
    at: c.a,
    toward: c.b,
  }));

  return {
    entrance,
    exit,
    mazeStrands,
    culledStrands: culledStrands.sort((a, b) => a - b),
    spanningSplices,
    spanningMerges,
    choiceSplices,
    fourWayMerges,
    deadEndStubs,
  };
}
