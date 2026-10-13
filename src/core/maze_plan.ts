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
//  - LONG DEAD-END THREAD (independent knob): a closed maze strand cut
//    open at one edge, one flank fused into its first crossing (the decoy-
//    trim machinery), the other flank's tip left FREE mid-fabric. The
//    whole former loop becomes a long woven thread ending in a distant
//    dead end. deadEndDensity 0 = no dead ends anywhere (pure braided).
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
import { hypot2 } from "../util/det_math";

// A place where a strand is carved open (a loose end runs off-screen here).
export interface MazeCut {
  strand: number;
  edgeId: string;
  // DECOY TRIM: a cut produces two flanks, but only ONE keeps an anchored
  // off-screen tail. The other flank is walked back to its first
  // INTER-STRAND crossing, which is fused into a 3-way merge (the thread
  // ends by merging into the thread it last crossed), and the stub between
  // the cut and that crossing is deleted. Absent when neither flank has an
  // eligible crossing (self-crossings pinch when fused; walking through the
  // other cut's edge is forbidden) - then both flanks keep decoy tails,
  // the pre-rework behavior.
  trim?: MazeCutTrim;
}

export interface MazeCutTrim {
  // Which flank is trimmed: "a" = pre-cut (the flank ending at the cut
  // edge's nodeA), "b" = post-cut. The OTHER flank keeps the tail.
  side: "a" | "b";
  mergeCrossing: string; // Crossing node fused into a 3-way junction.
  stubEdges: string[]; // Edges deleted, from the merge toward the cut.
  stubNodes: string[]; // Interior TURN nodes deleted (never the merge).
}

// Tunable maze-generation knobs (serialized into the URL in a later stage).
export interface MazeParams {
  // Fraction of eligible splice candidates realized as extra CHOICE junctions
  // beyond the reachability backbone. The spacing floor caps the high end.
  branchDensity: number;
  // Fraction of those choice junctions realized as 4-way crossing merges
  // instead of 3-way splices ("occasional 4-way intersections").
  fourWayFraction: number;
  // Fraction of eligible closed maze strands cut into LONG dead-end
  // threads (cut one edge, fuse one flank into its first crossing, leave
  // the other flank's tip free mid-fabric - the whole former loop becomes
  // a long woven thread ending in a distant dead end). 0 = no dead ends
  // (pure braided); 1 = maximally tree-like.
  deadEndDensity: number;
  // Lattice radii around the exit / entrance corners kept junction-free, so
  // the endgame isn't cluttered with choices (challenge shaping).
  exitClearance: number;
  entranceClearance: number;
  // Minimum lattice distance between junction SITES. A splice's own two ends
  // are one site and exempt from each other.
  junctionSpacing: number;
  // SHAPED LATTICES (core/shapes.ts): entrance/exit anchor targets in
  // doubled-lattice coordinates (the mask's extreme points toward the
  // chosen compass anchors) + the outward tail directions. Absent =
  // the historic rect corners: top-left entrance, bottom-right exit.
  entrancePoint?: [number, number];
  exitPoint?: [number, number];
  entranceDir?: [number, number];
  exitDir?: [number, number];
  // Shaped lattices: route the entrance/exit tails out to open space
  // (see maze_apply's TAIL ESCAPE). Absent/false = the historic fixed
  // CUT_REACH tails.
  escapeTails?: boolean;
}

export const DEFAULT_MAZE_PARAMS: MazeParams = {
  branchDensity: 0.35,
  fourWayFraction: 0.12,
  // Dead-end stubs are OFF by default (pure braided maze: every wrong turn
  // loops back). The UI toggle swaps in DEAD_END_DENSITY_ON.
  deadEndDensity: 0,
  exitClearance: 5,
  entranceClearance: 2.5,
  junctionSpacing: 2,
};

// The stub density the "dead ends" toggle enables (the old default).
export const DEAD_END_DENSITY_ON = 0.25;

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

export interface MazePlan {
  entrance: MazeCut; // at the entrance anchor (default top-left corner).
  exit: MazeCut; // at the exit anchor (default bottom-right corner).
  // Outward tail directions for the two cuts (anchor directions). Absent
  // on legacy plans: maze_apply falls back to the historic corner dirs.
  entranceDir?: [number, number];
  exitDir?: [number, number];
  escapeTails?: boolean;
  mazeStrands: number[]; // strands that form the reachable maze.
  culledStrands: number[]; // isolated loops excluded from the maze.
  // Reachability backbone: splices (preferred) and 4-way crossing merges
  // (fallback) that make every maze strand reachable.
  spanningSplices: SpliceSite[];
  spanningMerges: string[]; // crossing node ids.
  // Extra branch points (the challenge).
  choiceSplices: SpliceSite[];
  fourWayMerges: string[]; // crossing node ids.
  // Long dead-end threads: closed maze strands cut open with a trimmed
  // flank (always present) and a FREE tip - see deadEndDensity.
  deadEndCuts: MazeCut[];
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
      const len = hypot2(dx, dy) || 1;
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
          const glen = hypot2(gx, gy);
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

// Nearest maze-strand edge to an anchor point (historically a lattice
// corner), by the closest lattice point on the edge. Ties break on edge id
// for determinism. `exclude` keeps the exit cut off the entrance's edge
// when both anchors target the same region of the silhouette.
// OUTER-FACE edges: drawn edges with open space on one side. A cut on
// an INTERIOR edge cannot hand its tail to open space without crossing
// threads (planarity), so shaped-lattice entrances/exits (whose anchor
// targets are nudged into thick material) restrict their cut search to
// these. Found by rasterizing every edge as a wall and flood-filling the
// raster from its border; an edge is outer when a probe point beside its
// middle segment, on either side, lands in the flooded exterior.
export function outerFaceEdges(graph: TangleGraph): Set<string> {
  const RES = 4; // Raster px per lattice unit.
  const PAD = 3;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const e of graph.edges.values()) {
    for (const [x, y] of e.latticePoints) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  const out = new Set<string>();
  if (!Number.isFinite(minX)) return out;
  const W = Math.ceil((maxX - minX + 2 * PAD) * RES) + 1;
  const H = Math.ceil((maxY - minY + 2 * PAD) * RES) + 1;
  const px = (x: number): number => Math.round((x - minX + PAD) * RES);
  const py = (y: number): number => Math.round((y - minY + PAD) * RES);
  const wall = new Uint8Array(W * H);
  const stamp = (cx: number, cy: number): void => {
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const x = cx + ox;
        const y = cy + oy;
        if (x >= 0 && x < W && y >= 0 && y < H) wall[y * W + x] = 1;
      }
    }
  };
  for (const e of graph.edges.values()) {
    const lp = e.latticePoints;
    for (let i = 0; i + 1 < lp.length; i++) {
      const [ax, ay] = lp[i];
      const [bx, by] = lp[i + 1];
      const n = Math.max(1, Math.ceil(hypot2(bx - ax, by - ay) * RES * 2));
      for (let k = 0; k <= n; k++) {
        stamp(px(ax + ((bx - ax) * k) / n), py(ay + ((by - ay) * k) / n));
      }
    }
  }
  // Flood the exterior from the raster border.
  const ext = new Uint8Array(W * H);
  const queue: number[] = [];
  const seed = (i: number): void => {
    if (!wall[i] && !ext[i]) {
      ext[i] = 1;
      queue.push(i);
    }
  };
  for (let x = 0; x < W; x++) {
    seed(x);
    seed((H - 1) * W + x);
  }
  for (let y = 0; y < H; y++) {
    seed(y * W);
    seed(y * W + W - 1);
  }
  while (queue.length > 0) {
    const i = queue.pop()!;
    const x = i % W;
    const y = (i - x) / W;
    if (x > 0) seed(i - 1);
    if (x < W - 1) seed(i + 1);
    if (y > 0) seed(i - W);
    if (y < H - 1) seed(i + W);
  }
  const isExt = (x: number, y: number): boolean => {
    const ix = px(x);
    const iy = py(y);
    return ix >= 0 && ix < W && iy >= 0 && iy < H && ext[iy * W + ix] === 1;
  };
  for (const e of graph.edges.values()) {
    const lp = e.latticePoints;
    if (lp.length < 2) continue;
    const m = Math.floor((lp.length - 1) / 2);
    const [ax, ay] = lp[m];
    const [bx, by] = lp[m + 1];
    const len = hypot2(bx - ax, by - ay) || 1;
    const nx = -(by - ay) / len;
    const ny = (bx - ax) / len;
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    for (const off of [0.45, 0.65, 0.85]) {
      if (
        isExt(mx + nx * off, my + ny * off) ||
        isExt(mx - nx * off, my - ny * off)
      ) {
        out.add(e.id);
        break;
      }
    }
  }
  return out;
}

function nearestEdgeToCorner(
  graph: TangleGraph,
  mazeStrands: number[],
  corner: [number, number],
  exclude?: string,
  // Restrict candidates to these edges (outer-face cuts); falls back to
  // every maze edge when none qualifies.
  only?: Set<string>
): MazeCut {
  if (only) {
    const hit = nearestEdgeToCornerIn(graph, mazeStrands, corner, exclude, only);
    if (hit) return hit;
  }
  return nearestEdgeToCornerIn(graph, mazeStrands, corner, exclude)!;
}

function nearestEdgeToCornerIn(
  graph: TangleGraph,
  mazeStrands: number[],
  corner: [number, number],
  exclude?: string,
  only?: Set<string>
): MazeCut | null {
  let best: MazeCut | null = null;
  let bestD = Infinity;
  for (const strand of mazeStrands) {
    for (const edgeId of graph.strands[strand].edgeIds) {
      if (edgeId === exclude) continue;
      if (only && !only.has(edgeId)) continue;
      const edge = graph.edges.get(edgeId)!;
      let d = Infinity;
      for (const [x, y] of edge.latticePoints) {
        const ex = x - corner[0];
        const ey = y - corner[1];
        const dd = ex * ex + ey * ey;
        if (dd < d) d = dd;
      }
      if (d < bestD || (d === bestD && best !== null && edgeId < best.edgeId)) {
        bestD = d;
        best = { strand, edgeId };
      }
    }
  }
  return best;
}

// Farthest-first selection under a spacing floor. `placed` is the flat list
// of already-occupied junction points; each pick appends its own points (and
// onPick may append more) so later phases space against everything before
// them. When nothing is placed yet, the first available pool entry
// (canonical order) seeds the process.
//
// K87: INCREMENTAL, and pick-for-pick identical to the full rescan it
// replaced (frozen in test/core/fixtures/maze_plan_v1.ts; the identity test
// compares whole plans). Each candidate keeps its minimum distance to the
// placed points (`near`), folding in only the points appended since the last
// pass (`seen`): `placed` only grows, so a minimum only falls and a
// candidate under the floor is dropped for good. The best scan asks
// `available` only of a candidate that would beat the running best, which
// still finds the FIRST available argmax in pool order, because every
// `available` here is pure - the dead-end one also stores its trim on the
// candidate it is asked about, and onPick reads that trim only for the
// candidate that just passed. Distances are V8's Math.hypot bits (hypot2,
// K108): the same distances give the same minimum, so ties break as before -
// some ties are between different (dx, dy) pairs at one true distance, where
// the last bit decides. The rescan was ~88% of the plan,
// paid on every rebuild and daily load: default knobs at gs 24 took 174 ms
// (median; 1.4 s worst) and dense maps up to 15 s, now 7 ms, 30 ms, 104 ms.
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
  if (count <= 0) return out;
  const pts = pool.map(ptsOf);
  const near = new Float64Array(pool.length).fill(Infinity);
  const live = pool.map((_, i) => i);
  let seen = 0;
  const commit = (i: number): void => {
    const p = pts[i];
    for (let k = 0; k < p.length; k++) placed.push(p[k]);
    onPick(pool[i]);
    out.push(pool[i]);
  };
  while (out.length < count) {
    if (placed.length === 0) {
      const first = pool.findIndex(available);
      if (first < 0) break;
      commit(first);
      continue;
    }
    let w = 0;
    for (let j = 0; j < live.length; j++) {
      const i = live[j];
      const p = pts[i];
      let d = near[i];
      for (let k = 0; k < p.length; k += 2) {
        for (let m = seen; m < placed.length; m += 2) {
          const dd = hypot2(p[k] - placed[m], p[k + 1] - placed[m + 1]);
          if (dd < d) d = dd;
        }
      }
      near[i] = d;
      if (d < spacing) continue;
      live[w++] = i;
    }
    live.length = w;
    seen = placed.length;
    let bestI = -1;
    let bestD = -Infinity;
    for (let j = 0; j < live.length; j++) {
      const i = live[j];
      if (near[i] > bestD && available(pool[i])) {
        bestD = near[i];
        bestI = i;
      }
    }
    if (bestI < 0) break; // nothing satisfies the spacing floor.
    commit(bestI);
  }
  return out;
}

// A SELF-crossing merge leaves the cut strand fused to itself - fine when
// the surviving loop through the fusion is long (the corner-lobe case: the
// cut severs a small peripheral lobe closed by one self-crossing, which is
// the TYPICAL corner geometry), but a pinch hazard when it is kink-scale
// (the Stage 5 lesson: a tiny eyelet collapses once its crossing clamps
// vanish). The kept loop must span at least this many strand edges.
const SELF_MERGE_MIN_LOOP = 8;

// Walk one flank of a cut to its first crossing. Eligible when that crossing
// is inter-strand, or a self-crossing whose KEPT loop clears the floor above;
// the crossing must be unclaimed and the walk must not traverse another
// cut's edge. Everything passed on the way is a TURN (the graph is
// pre-surgery: no junctions or ends exist yet).
function planTrim(
  graph: TangleGraph,
  cut: MazeCut,
  crossMap: Map<string, number[]>,
  usedCrossings: Set<string>,
  usedEdges: Set<string>,
  wallEdges: Set<string>
): MazeCutTrim | undefined {
  const strand = graph.strands[cut.strand];
  const m = strand.edgeIds.length;
  const c = strand.edgeIds.indexOf(cut.edgeId);

  // Occurrence slots per node on this strand (self-crossings appear twice).
  const slotsOf = new Map<string, number[]>();
  const nodeCount = strand.isClosed
    ? strand.nodes.length - 1
    : strand.nodes.length;
  for (let i = 0; i < nodeCount; i++) {
    const list = slotsOf.get(strand.nodes[i]);
    if (list) list.push(i);
    else slotsOf.set(strand.nodes[i], [i]);
  }

  const walk = (dir: 1 | -1): MazeCutTrim | null => {
    const stubEdges: string[] = [];
    const stubNodes: string[] = [];
    for (let k = 0; k < m; k++) {
      const ni = (((dir < 0 ? c - k : c + 1 + k) % m) + m) % m;
      const node = graph.nodes.get(strand.nodes[ni])!;
      if (node.type === NODE_TYPE.CROSSING) {
        const ss = crossMap.get(node.id);
        if (!ss || ss.length !== 2) return null;
        if (usedCrossings.has(node.id)) return null;
        if (ss[0] === ss[1]) {
          const occ = slotsOf.get(node.id);
          if (!occ || occ.length !== 2) return null;
          const [i1, i2] = occ;
          const arcForward = i2 - i1; // edges i1..i2-1
          const cutInForward = c >= i1 && c < i2;
          const kept = cutInForward ? m - arcForward : arcForward;
          if (kept < SELF_MERGE_MIN_LOOP) return null;
        }
        return {
          side: dir < 0 ? "a" : "b",
          mergeCrossing: node.id,
          stubEdges,
          stubNodes,
        };
      }
      stubNodes.push(node.id);
      const ei = (((dir < 0 ? c - 1 - k : c + 1 + k) % m) + m) % m;
      const eid = strand.edgeIds[ei];
      // The stub may not traverse any cut edge (its own included: the
      // all-the-way-around guard) nor any edge claimed by other surgery -
      // a splice landing mid-stub would be deleted out from under it.
      if (eid === cut.edgeId || wallEdges.has(eid) || usedEdges.has(eid)) {
        return null;
      }
      stubEdges.push(eid);
    }
    return null;
  };

  // Trim the flank with the shorter stub (less material deleted); ties go
  // to side "a" for determinism.
  const a = walk(-1);
  const b = walk(1);
  if (a && b) return a.stubEdges.length <= b.stubEdges.length ? a : b;
  return a ?? b ?? undefined;
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
  // Anchor targets: the shape mask's extreme points toward the chosen
  // compass anchors (core/shapes.ts), defaulting to the historic corners.
  const entrancePoint = params.entrancePoint ?? [0, 0];
  const exitPoint = params.exitPoint ?? [bound, bound];
  // Shaped lattices cut on the OUTER FACE so their tails can escape to
  // open space (maze_apply TAIL ESCAPE); rect keeps the historic search.
  const outer = params.escapeTails ? outerFaceEdges(graph) : undefined;
  const entrance = nearestEdgeToCorner(
    graph,
    mazeStrands,
    entrancePoint,
    undefined,
    outer
  );
  const exit = nearestEdgeToCorner(
    graph,
    mazeStrands,
    exitPoint,
    entrance.edgeId,
    outer
  );

  const clearOf = (p: [number, number]): boolean =>
    hypot2(p[0] - entrancePoint[0], p[1] - entrancePoint[1]) >=
      params.entranceClearance &&
    hypot2(p[0] - exitPoint[0], p[1] - exitPoint[1]) >=
      params.exitClearance;

  const usedEdges = new Set<string>([entrance.edgeId, exit.edgeId]);
  const usedCrossings = new Set<string>();
  const placed: number[] = [];

  // ---- Decoy trims: one tail per corner; the other flank merges into its
  // first inter-strand crossing. Claimed BEFORE spanning/choice placement so
  // nothing else lands on the doomed stub edges or the merge crossing. Each
  // trim is also a REAL strand connection (the cut strand fuses with the
  // merge partner), fed to the reachability sweep below.
  const crossMap = new Map<string, number[]>();
  for (const x of crossings) crossMap.set(x.id, x.strands);
  const wallEdges = new Set([entrance.edgeId, exit.edgeId]);
  const trimLinks: Array<[number, number]> = [];
  for (const cut of [entrance, exit]) {
    cut.trim = planTrim(
      graph,
      cut,
      crossMap,
      usedCrossings,
      usedEdges,
      wallEdges
    );
    if (!cut.trim) continue;
    usedCrossings.add(cut.trim.mergeCrossing);
    for (const eid of cut.trim.stubEdges) usedEdges.add(eid);
    const pos = graph.nodes.get(cut.trim.mergeCrossing)!.latticePos;
    placed.push(pos[0], pos[1]);
    const ss = crossMap.get(cut.trim.mergeCrossing)!;
    trimLinks.push([ss[0], ss[1]]);
  }

  // ---- Reachability spanning: splices preferred, merges as fallback. ----
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

  // Trim merges connect their two strands for free; absorb across them
  // whenever the frontier moves.
  const absorbTrims = (): boolean => {
    let any = false;
    for (const [p, q] of trimLinks) {
      const pIn = reached.has(p);
      const qIn = reached.has(q);
      if (pIn !== qIn) {
        reached.add(pIn ? q : p);
        any = true;
      }
    }
    return any;
  };
  while (absorbTrims()) {
    // Transitive closure across trim links before spanning starts.
  }

  let guard = 0;
  while (reached.size < mazeStrands.length && guard++ < 100000) {
    let advanced = false;
    if (absorbTrims()) advanced = true;
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

  // Inter-strand crossings only: merging a SELF-crossing fuses a thread to
  // itself at a kink, and once the crossing machinery is gone the kink's
  // eyelet clamps vanish with it - a pinch, not an intersection.
  const fourPool = crossings.filter(
    (x) =>
      x.strands.length === 2 &&
      x.strands[0] !== x.strands[1] &&
      x.strands.every((s) => mazeSet.has(s)) &&
      clearOf(x.pos)
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

  // ---- Long dead-end threads. Cut one plain edge of a closed maze strand
  // (never the entrance/exit hosts, at most one cut per strand), fuse the
  // shorter flank into its first crossing via the decoy-trim machinery, and
  // leave the other flank's tip FREE mid-fabric: the whole former loop
  // becomes one long woven thread ending in a distant dead end - discovered
  // by walking it, not by seeing a stub. Cut sites are placed farthest-
  // first under the same spacing floor as the choice junctions.
  interface DeadCandidate {
    strand: number;
    edgeId: string;
    mid: [number, number];
    trim?: MazeCutTrim;
  }
  const cutStrands = new Set<number>([entrance.strand, exit.strand]);
  const deadPool: DeadCandidate[] = [];
  for (const s of mazeStrands) {
    if (cutStrands.has(s)) continue;
    const strand = graph.strands[s];
    if (!strand.isClosed) continue;
    for (const eid of strand.edgeIds) {
      if (usedEdges.has(eid)) continue;
      const e = graph.edges.get(eid)!;
      const p0 = e.latticePoints[0];
      const p1 = e.latticePoints[e.latticePoints.length - 1];
      const mid: [number, number] = [
        (p0[0] + p1[0]) / 2,
        (p0[1] + p1[1]) / 2,
      ];
      if (!clearOf(mid)) continue;
      deadPool.push({ strand: s, edgeId: eid, mid });
    }
  }
  const eligibleStrands = new Set(deadPool.map((c) => c.strand)).size;
  const nDead = Math.round(params.deadEndDensity * eligibleStrands);
  const deadEndCuts: MazeCut[] = [];
  pickFarthest(
    deadPool,
    (c) => [c.mid[0], c.mid[1]],
    (c) => {
      if (cutStrands.has(c.strand) || usedEdges.has(c.edgeId)) return false;
      c.trim = planTrim(
        graph,
        { strand: c.strand, edgeId: c.edgeId },
        crossMap,
        usedCrossings,
        usedEdges,
        wallEdges
      );
      return c.trim !== undefined;
    },
    (c) => {
      const trim = c.trim!;
      cutStrands.add(c.strand);
      usedEdges.add(c.edgeId);
      wallEdges.add(c.edgeId);
      usedCrossings.add(trim.mergeCrossing);
      for (const se of trim.stubEdges) usedEdges.add(se);
      const mp = graph.nodes.get(trim.mergeCrossing)!.latticePos;
      placed.push(mp[0], mp[1]);
      deadEndCuts.push({ strand: c.strand, edgeId: c.edgeId, trim });
    },
    nDead,
    // The cut site is a thread TIP, not a choice point (the choice lives at
    // its trim merge), so it needs less breathing room than junctions - and
    // the full floor saturates small dense maps to zero cuts.
    Math.max(1, params.junctionSpacing * 0.5),
    placed
  );

  const SQ = Math.SQRT1_2;
  return {
    entrance,
    exit,
    entranceDir: params.entranceDir ?? [-SQ, -SQ],
    exitDir: params.exitDir ?? [SQ, SQ],
    escapeTails: params.escapeTails ?? false,
    mazeStrands,
    culledStrands: culledStrands.sort((a, b) => a - b),
    spanningSplices,
    spanningMerges,
    choiceSplices,
    fourWayMerges,
    deadEndCuts,
  };
}
