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
//  5. long-tail dead ends (deadEndDensity cuts, deadEndLength > 0: each at
//     the site with the longest junction-free tail, the tail reserved),
//     then choice junctions - splices plus fourWayFraction crossing merges -
//     placed farthest-first under a spacing floor and kept clear of both
//     corner corridors (deadEndLength 0: the dead-end stubs come after the
//     choices, spread farthest-first),
//  6. only when the finished plan needs them: a repaired route from the
//     start to the exit (K109) and one junction per piece the start cannot
//     reach (K110) - see buildMazePlan.

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
  // K74 LONG-TAIL dead ends: the junction-free length (doubled lattice
  // units, along the thread) each dead end's free tail is guaranteed, as
  // far as the fabric allows. > 0: dead ends are placed BEFORE the choice
  // junctions, each at the (cut, trimmed flank) whose free flank runs
  // longest to its first junction (capped at this length; ties spread
  // apart), and that much of the tail is reserved so no choice junction,
  // 4-way or later trim lands on it. 0: the older placement (after the
  // choice junctions, cut sites spread farthest-first, the shorter stub
  // trimmed), whose tails are often a few units long.
  deadEndLength: number;
  // H1, THE FUSED ARM CUT (K74 stage 2; maze_apply fuseHCuts): the share
  // (0..1) of splice bridges whose H is cut after the cuts - one of a
  // junction's host arms trimmed back to its first crossing, which becomes
  // the junction. 0 = off: the plan carries no hCutShare and the maze is
  // the older one, byte for byte.
  hCutShare: number;
  // K74 stage 3, THE TRAP-ZONE FINISH (decision 2 (c)): the exit corridor,
  // its flank rule and the exit taper. exitCorridor is arc length (doubled
  // lattice units) along the exit's kept flank (both flanks when untrimmed)
  // that carries no choice splice, 4-way or dead-end merge; the spanning
  // backbone, K109's repair and K110's joins rank corridor sites last
  // instead of skipping them. 0 = off. exitFlank picks which flank keeps
  // the exit tail when a trim exists: "stub" (today's shorter-stub rule),
  // "away" (the flank whose nodes within the corridor - or 24 u without
  // one - reach farthest from the exit point) or "near" (the other).
  // exitTaperRadius / exitTaperStrength grade the choice and 4-way
  // spacing floor toward the exit (see planMaze); either at 0 = off.
  // Sources (K284): the corridor follows Pullen's "near misses at the
  // goal" (Think Labyrinth) - junctions near the exit stay, but none of
  // them lead in.
  exitCorridor: number;
  exitFlank: "stub" | "away" | "near";
  exitTaperRadius: number;
  exitTaperStrength: number;
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
  // loops back). The UI's dead-ends toggle (on by default since K74) swaps
  // in its density, DEAD_END_DENSITY_ON by default.
  deadEndDensity: 0,
  deadEndLength: 20,
  // Every H since K74 stage 2: share 1 keeps decision 1's greedy bar on
  // dailies 1-80 (generation-plan.md, H1).
  hCutShare: 1,
  exitCorridor: 24,
  exitFlank: "away",
  exitTaperRadius: 0,
  exitTaperStrength: 0,
  exitClearance: 12,
  entranceClearance: 2.5,
  junctionSpacing: 2,
};

// The dead-end density the UI's defaults use (PARAM_DEFAULTS.deadEndDensity).
export const DEAD_END_DENSITY_ON = 0.5;

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
  // H1's share (MazeParams.hCutShare), read by applyMazeCuts. Present only
  // when > 0, so a plan without it is the older plan, JSON and all.
  hCutShare?: number;
  // H1's exit guard (K74 stage 3, K278 (a)): present only when H1 runs and each part is non-zero; fuseHCuts refuses crossings inside the clearance or on the corridor. No param of its own.
  exitGuardPoint?: [number, number];
  exitGuardClearance?: number;
  exitGuardCrossings?: string[];
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

// K110: the rank-th edge in nearestEdgeToCorner's order (nearest first, ties
// to the smaller edge id, outer-face edges only when any qualifies), so rank
// 0 is its pick; null past the last edge.
function rankedEdgeToCorner(
  graph: TangleGraph,
  mazeStrands: number[],
  corner: [number, number],
  exclude: string,
  only: Set<string> | undefined,
  rank: number
): MazeCut | null {
  const list: Array<{ d: number; strand: number; edgeId: string }> = [];
  const collect = (restrict?: Set<string>): void => {
    for (const strand of mazeStrands) {
      for (const edgeId of graph.strands[strand].edgeIds) {
        if (edgeId === exclude) continue;
        if (restrict && !restrict.has(edgeId)) continue;
        let d = Infinity;
        for (const [x, y] of graph.edges.get(edgeId)!.latticePoints) {
          const ex = x - corner[0];
          const ey = y - corner[1];
          const dd = ex * ex + ey * ey;
          if (dd < d) d = dd;
        }
        list.push({ d, strand, edgeId });
      }
    }
  };
  if (only) collect(only);
  if (list.length === 0) collect();
  list.sort(
    (p, q) => p.d - q.d || (p.edgeId < q.edgeId ? -1 : p.edgeId > q.edgeId ? 1 : 0)
  );
  if (rank >= list.length) return null;
  return { strand: list[rank].strand, edgeId: list[rank].edgeId };
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
  // K74 stage 3 taper: a per-candidate floor (fixed per candidate; a candidate's nearest placed distance only falls, so the incremental drop stays exact). Absent = the constant floor.
  // (the floor override itself is the last parameter, after placed.)
  placed: number[],
  spacingOf?: (pts: number[]) => number
): T[] {
  const out: T[] = [];
  if (count <= 0) return out;
  const pts = pool.map(ptsOf);
  const floors = spacingOf ? pts.map((p) => spacingOf(p)) : null;
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
      if (d < (floors ? floors[i] : spacing)) continue;
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
  const { a, b } = planTrimBoth(
    graph,
    cut,
    crossMap,
    usedCrossings,
    usedEdges,
    wallEdges
  );
  // Trim the flank with the shorter stub (less material deleted); ties go
  // to side "a" for determinism.
  if (a && b) return a.stubEdges.length <= b.stubEdges.length ? a : b;
  return a ?? b ?? undefined;
}

// Both flanks' trims (null where a flank has no eligible crossing).
function planTrimBoth(
  graph: TangleGraph,
  cut: MazeCut,
  crossMap: Map<string, number[]>,
  usedCrossings: Set<string>,
  usedEdges: Set<string>,
  wallEdges: Set<string>
): { a: MazeCutTrim | null; b: MazeCutTrim | null } {
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

  return { a: walk(-1), b: walk(1) };
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

// ---------------------------------------------------------------------------
// K109, the TAIL ROUTE. Spanning works on whole strands and assumes a cut
// leaves its strand in one piece. But the exit's nearest-edge search may cut
// the entrance's strand too, and a loop cut twice falls into two arcs. When
// both cuts are trimmed, each arc keeps one tail and fuses its far end into
// whatever it crosses there: itself (a lasso), or a strand that nothing else
// reaches. Spanning counted every strand reached through those trims, so
// nothing joined the two arcs, and the walk graph had no route from the start
// to the exit (small shaped designs: heart and circle at gs 4; star, fish and
// tree at gs 6-10; never a rect design or a daily).
//
// PIECES are what the walk graph will see after maze_apply's surgery: a
// union-find over node OCCURRENCES (strand, index; a self-crossing occurs
// twice), joined along every surviving edge (cut edges and trim stubs are
// deleted), across each junction node's occurrences (merges and trim merges)
// and across splice bridges. A tail hangs at its cut edge's end on its own
// flank: "a" at nodeA (pre-cut), "b" at nodeB.
interface Pieces {
  find(o: number): number;
  union(a: number, b: number): void;
  occ(strand: number, index: number): number;
  occsOf: Map<string, number[]>; // node id -> its occurrences.
  edgeOcc: Map<string, number>; // edge id -> its nodeA's occurrence.
}

function buildPieces(
  graph: TangleGraph,
  cuts: MazeCut[],
  merges: string[],
  splices: SpliceSite[]
): Pieces {
  const counts = graph.strands.map((st) =>
    st.isClosed ? st.nodes.length - 1 : st.nodes.length
  );
  const base: number[] = [];
  let total = 0;
  for (const n of counts) {
    base.push(total);
    total += n;
  }
  const parent = new Int32Array(total);
  for (let i = 0; i < total; i++) parent[i] = i;
  const find = (o: number): number => {
    while (parent[o] !== o) {
      parent[o] = parent[parent[o]];
      o = parent[o];
    }
    return o;
  };
  const union = (a: number, b: number): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  const occ = (s: number, i: number): number => base[s] + (i % counts[s]);

  const removed = removedEdges(cuts);
  const occsOf = new Map<string, number[]>();
  const edgeOcc = new Map<string, number>();
  graph.strands.forEach((st, s) => {
    for (let i = 0; i < counts[s]; i++) {
      const list = occsOf.get(st.nodes[i]);
      if (list) list.push(base[s] + i);
      else occsOf.set(st.nodes[i], [base[s] + i]);
    }
    st.edgeIds.forEach((eid, i) => {
      edgeOcc.set(eid, base[s] + i);
      if (!removed.has(eid)) union(occ(s, i), occ(s, i + 1));
    });
  });
  const pieces = { find, union, occ, occsOf, edgeOcc };
  for (const cut of cuts) {
    if (cut.trim) joinNode(pieces, cut.trim.mergeCrossing);
  }
  for (const id of merges) joinNode(pieces, id);
  for (const sp of splices) {
    union(edgeOcc.get(sp.edgeA)!, edgeOcc.get(sp.edgeB)!);
  }
  return pieces;
}

// The edges maze_apply deletes: every cut edge and every trim stub.
function removedEdges(cuts: MazeCut[]): Set<string> {
  const removed = new Set<string>();
  for (const cut of cuts) {
    removed.add(cut.edgeId);
    if (cut.trim) for (const eid of cut.trim.stubEdges) removed.add(eid);
  }
  return removed;
}

function joinNode(p: Pieces, nodeId: string): void {
  const os = p.occsOf.get(nodeId)!;
  for (let k = 1; k < os.length; k++) p.union(os[0], os[k]);
}

// The occurrences a cut's surviving tails hang from (one when trimmed).
function tailAnchors(p: Pieces, graph: TangleGraph, cut: MazeCut): number[] {
  const c = graph.strands[cut.strand].edgeIds.indexOf(cut.edgeId);
  const a = p.occ(cut.strand, c);
  const b = p.occ(cut.strand, c + 1);
  if (!cut.trim) return [a, b];
  return [cut.trim.side === "a" ? b : a];
}

// The pieces a cut's surviving tails hang from (one when trimmed).
function tailRoots(p: Pieces, graph: TangleGraph, cut: MazeCut): number[] {
  return tailAnchors(p, graph, cut).map((o) => p.find(o));
}

// Maze-strand occurrences that keep at least one edge through the surgery.
function keptOccurrences(
  graph: TangleGraph,
  p: Pieces,
  removed: Set<string>,
  mazeStrands: number[]
): number[] {
  const out: number[] = [];
  for (const s of mazeStrands) {
    const st = graph.strands[s];
    const n = st.isClosed ? st.nodes.length - 1 : st.nodes.length;
    const m = st.edgeIds.length;
    for (let i = 0; i < n; i++) {
      const prev = i > 0 ? st.edgeIds[i - 1] : st.isClosed ? st.edgeIds[m - 1] : undefined;
      const next = i < m ? st.edgeIds[i] : undefined;
      if (
        (prev !== undefined && !removed.has(prev)) ||
        (next !== undefined && !removed.has(next))
      ) {
        out.push(p.occ(s, i));
      }
    }
  }
  return out;
}

// K110: whether every piece of a finished plan's fabric is one piece, the
// start's: then the walk graph reaches every vertex from the start (and the
// tails meet). The fabric is every occurrence that keeps an edge plus the
// tail anchors (two cuts on adjacent edges can leave a node holding nothing
// but the two tails). The K110 probe checks this agrees with the walk graph.
export function planReachesAll(graph: TangleGraph, plan: MazePlan): boolean {
  const cuts = [plan.entrance, plan.exit, ...plan.deadEndCuts];
  const p = buildPieces(
    graph,
    cuts,
    [...plan.spanningMerges, ...plan.fourWayMerges],
    [...plan.spanningSplices, ...plan.choiceSplices]
  );
  const live = keptOccurrences(graph, p, removedEdges(cuts), plan.mazeStrands);
  for (const cut of cuts) live.push(...tailAnchors(p, graph, cut));
  const root = p.find(live[0]);
  return live.every((o) => p.find(o) === root);
}

function tailsJoined(
  p: Pieces,
  graph: TangleGraph,
  entrance: MazeCut,
  exit: MazeCut
): boolean {
  const to = tailRoots(p, graph, exit);
  return tailRoots(p, graph, entrance).some((r) => to.includes(r));
}

// Whether a finished plan leaves a route from an entrance tail to an exit
// tail: exactly the walk graph's verdict (finite optimal length), without
// building the graph. The K109 probe checks the two agree.
export function planTailsJoined(graph: TangleGraph, plan: MazePlan): boolean {
  const p = buildPieces(
    graph,
    [plan.entrance, plan.exit, ...plan.deadEndCuts],
    [...plan.spanningMerges, ...plan.fourWayMerges],
    [...plan.spanningSplices, ...plan.choiceSplices]
  );
  return tailsJoined(p, graph, plan.entrance, plan.exit);
}

// Joins the start's pieces to the exit's with the fewest new junctions. Each
// step takes a junction one hop closer (hops counted over the available
// junctions from the exit's pieces) and prefers, as spanning does, splices
// to merges and corner-clear sites, then the most room from everything
// placed; ties go to pool order. Same-strand splices and self-crossings
// qualify: their two sides lie on different pieces, so neither is a hairpin
// shortcut nor a kink eyelet. Returns with the plan unchanged when no route
// exists at all.
function repairTailRoute(
  graph: TangleGraph,
  entrance: MazeCut,
  exit: MazeCut,
  candidates: Candidate[],
  crossings: CrossingSite[],
  inMaze: Set<number>,
  usedEdges: Set<string>,
  usedCrossings: Set<string>,
  placed: number[],
  clearOf: (p: [number, number]) => boolean,
  spanningSplices: SpliceSite[],
  spanningMerges: string[],
  corridorEdges?: Set<string>,
  corridorNodes?: Set<string>
): void {
  const cuts = [entrance, exit];
  const p = buildPieces(graph, cuts, spanningMerges, spanningSplices);
  interface Link {
    splice?: Candidate;
    merge?: CrossingSite;
    u: number;
    v: number;
    pts: number[];
    clear: boolean;
    corr: boolean;
  }
  while (!tailsJoined(p, graph, entrance, exit)) {
    const links: Link[] = [];
    for (const c of candidates) {
      if (usedEdges.has(c.edgeA) || usedEdges.has(c.edgeB)) continue;
      if (!inMaze.has(c.strandA) || !inMaze.has(c.strandB)) continue;
      const u = p.find(p.edgeOcc.get(c.edgeA)!);
      const v = p.find(p.edgeOcc.get(c.edgeB)!);
      if (u === v) continue;
      const pts = [c.a[0], c.a[1], c.b[0], c.b[1]];
      links.push({ splice: c, u, v, pts, clear: clearOf(c.a) && clearOf(c.b), corr: !!(corridorEdges && (corridorEdges.has(c.edgeA) || corridorEdges.has(c.edgeB))) });
    }
    for (const x of crossings) {
      if (usedCrossings.has(x.id) || x.strands.length !== 2) continue;
      if (!inMaze.has(x.strands[0]) || !inMaze.has(x.strands[1])) continue;
      const os = p.occsOf.get(x.id)!;
      const u = p.find(os[0]);
      const v = p.find(os[1]);
      if (u === v) continue;
      links.push({ merge: x, u, v, pts: [...x.pos], clear: clearOf(x.pos), corr: !!(corridorNodes && corridorNodes.has(x.id)) });
    }

    // Hops from the exit's pieces, breadth first.
    const adj = new Map<number, number[]>();
    for (const l of links) {
      for (const [r, q] of [
        [l.u, l.v],
        [l.v, l.u],
      ]) {
        const list = adj.get(r);
        if (list) list.push(q);
        else adj.set(r, [q]);
      }
    }
    const hopsTo = new Map<number, number>();
    const queue = tailRoots(p, graph, exit);
    for (const r of queue) hopsTo.set(r, 0);
    for (let h = 0; h < queue.length; h++) {
      const d = hopsTo.get(queue[h])!;
      for (const q of adj.get(queue[h]) ?? []) {
        if (!hopsTo.has(q)) {
          hopsTo.set(q, d + 1);
          queue.push(q);
        }
      }
    }
    const from = tailRoots(p, graph, entrance);
    let hops = Infinity;
    for (const r of from) hops = Math.min(hops, hopsTo.get(r) ?? Infinity);
    if (hops === Infinity) return;

    let best: Link | null = null;
    let bestNear = -1;
    for (const l of links) {
      const step =
        (from.includes(l.u) && hopsTo.get(l.v) === hops - 1) ||
        (from.includes(l.v) && hopsTo.get(l.u) === hops - 1);
      if (!step) continue;
      let near = Infinity;
      for (let k = 0; k < l.pts.length; k += 2) {
        for (let m = 0; m < placed.length; m += 2) {
          const d = hypot2(l.pts[k] - placed[m], l.pts[k + 1] - placed[m + 1]);
          if (d < near) near = d;
        }
      }
      if (best) {
        const kind = (best.merge ? 1 : 0) - (l.merge ? 1 : 0);
        const clear = (l.clear ? 1 : 0) - (best.clear ? 1 : 0);
        // K74 stage 3: corridor sites rank last (after clear), never skipped.
        const corr = (best.corr ? 1 : 0) - (l.corr ? 1 : 0);
        if (kind < 0 || (kind === 0 && (clear < 0 || (clear === 0 && (corr < 0 || (corr === 0 && near <= bestNear)))))) {
          continue;
        }
      }
      best = l;
      bestNear = near;
    }
    const pick = best!;
    if (pick.splice) {
      const c = pick.splice;
      usedEdges.add(c.edgeA);
      usedEdges.add(c.edgeB);
      spanningSplices.push(stripKey(c));
      p.union(p.edgeOcc.get(c.edgeA)!, p.edgeOcc.get(c.edgeB)!);
    } else {
      const x = pick.merge!;
      usedCrossings.add(x.id);
      spanningMerges.push(x.id);
      joinNode(p, x.id);
    }
    for (const v of pick.pts) placed.push(v);
  }
}

// K110, ORPHAN JOINS. A plan whose tails meet can still leave pieces the
// start never reaches: when the entrance and exit cut one loop, the arc
// between them can fuse into itself or into strands that nothing else joins,
// and the player sees thread they can never walk on (small shaped designs,
// never a rect design or a daily). The finished plan hangs each such piece
// off the start's region by ONE new junction, growing the region outward
// from the start's piece: a route that enters a piece must leave by the
// junction it came in through, so no route between two places the start
// already reached gets shorter. Each step takes a link between the region
// and a piece outside it, preferring, as spanning does, splices to merges
// and corner-clear sites, then the most room from everything placed; ties
// go to pool order. A link is an unused splice candidate or an unused
// crossing whose two passes both keep an edge. Same-strand splices and
// self-crossings qualify: their two sides lie on different pieces, so on
// different chains after surgery (neither a hairpin nor a kink eyelet); a
// splice whose bridge would cross another bridge does not. The joins are
// appended to the spanning lists, after everything else is placed. Returns
// whether one piece is left.
function joinOrphanPieces(
  graph: TangleGraph,
  cuts: MazeCut[], // Entrance, exit, then the dead-end cuts.
  candidates: Candidate[],
  crossings: CrossingSite[],
  mazeStrands: number[],
  usedEdges: Set<string>,
  usedCrossings: Set<string>,
  placed: number[],
  clearOf: (p: [number, number]) => boolean,
  spanningSplices: SpliceSite[],
  spanningMerges: string[],
  choiceSplices: SpliceSite[],
  fourWayMerges: string[],
  corridorEdges?: Set<string>,
  corridorNodes?: Set<string>
): boolean {
  const p = buildPieces(
    graph,
    cuts,
    [...spanningMerges, ...fourWayMerges],
    [...spanningSplices, ...choiceSplices]
  );
  const kept = keptOccurrences(graph, p, removedEdges(cuts), mazeStrands);
  const keeps = new Set(kept);
  const live = [...kept];
  for (const cut of cuts) live.push(...tailAnchors(p, graph, cut));
  const exitRoots = tailRoots(p, graph, cuts[1]);
  const start = tailAnchors(p, graph, cuts[0]).find((o) =>
    exitRoots.includes(p.find(o))
  );
  if (start === undefined) return false;
  const inMaze = new Set(mazeStrands);
  interface Link {
    splice?: Candidate;
    merge?: CrossingSite;
    pts: number[];
    clear: boolean;
    corr: boolean;
  }
  for (;;) {
    const region = p.find(start);
    if (live.every((o) => p.find(o) === region)) return true;
    // Bridges already placed. A splice candidate's bridge crosses no edge,
    // but two bridges can cross each other: choice placement keeps them
    // apart by its spacing floor, which joins do not use, so a join skips
    // any candidate whose bridge would cross one.
    const bridges = [...spanningSplices, ...choiceSplices];
    const links: Link[] = [];
    for (const c of candidates) {
      // K74 stage 3: a claimed corridor edge may still join (ranked last).
      if ((usedEdges.has(c.edgeA) && !(corridorEdges && corridorEdges.has(c.edgeA))) || (usedEdges.has(c.edgeB) && !(corridorEdges && corridorEdges.has(c.edgeB)))) continue;
      if (!inMaze.has(c.strandA) || !inMaze.has(c.strandB)) continue;
      const u = p.find(p.edgeOcc.get(c.edgeA)!) === region;
      const v = p.find(p.edgeOcc.get(c.edgeB)!) === region;
      if (u === v) continue;
      if (
        bridges.some((s) =>
          properIntersect(c.a[0], c.a[1], c.b[0], c.b[1], s.a[0], s.a[1], s.b[0], s.b[1])
        )
      ) {
        continue;
      }
      const pts = [c.a[0], c.a[1], c.b[0], c.b[1]];
      links.push({ splice: c, pts, clear: clearOf(c.a) && clearOf(c.b), corr: !!(corridorEdges && (corridorEdges.has(c.edgeA) || corridorEdges.has(c.edgeB))) });
    }
    for (const x of crossings) {
      if ((usedCrossings.has(x.id) && !(corridorNodes && corridorNodes.has(x.id))) || x.strands.length !== 2) continue;
      if (!inMaze.has(x.strands[0]) || !inMaze.has(x.strands[1])) continue;
      const os = p.occsOf.get(x.id)!;
      if (!keeps.has(os[0]) || !keeps.has(os[1])) continue;
      const u = p.find(os[0]) === region;
      const v = p.find(os[1]) === region;
      if (u === v) continue;
      links.push({ merge: x, pts: [...x.pos], clear: clearOf(x.pos), corr: !!(corridorNodes && corridorNodes.has(x.id)) });
    }
    let best: Link | null = null;
    let bestNear = -1;
    for (const l of links) {
      let near = Infinity;
      for (let k = 0; k < l.pts.length; k += 2) {
        for (let m = 0; m < placed.length; m += 2) {
          const d = hypot2(l.pts[k] - placed[m], l.pts[k + 1] - placed[m + 1]);
          if (d < near) near = d;
        }
      }
      if (best) {
        const kind = (best.merge ? 1 : 0) - (l.merge ? 1 : 0);
        const clear = (l.clear ? 1 : 0) - (best.clear ? 1 : 0);
        const corr = (best.corr ? 1 : 0) - (l.corr ? 1 : 0);
        if (kind < 0 || (kind === 0 && (clear < 0 || (clear === 0 && (corr < 0 || (corr === 0 && near <= bestNear)))))) {
          continue;
        }
      }
      best = l;
      bestNear = near;
    }
    if (!best) return false;
    if (best.splice) {
      const c = best.splice;
      usedEdges.add(c.edgeA);
      usedEdges.add(c.edgeB);
      spanningSplices.push(stripKey(c));
      p.union(p.edgeOcc.get(c.edgeA)!, p.edgeOcc.get(c.edgeB)!);
    } else {
      const x = best.merge!;
      usedCrossings.add(x.id);
      spanningMerges.push(x.id);
      joinNode(p, x.id);
    }
    for (const v of best.pts) placed.push(v);
  }
}

// K110: how many exit edges, nearest the exit anchor first, a maze tries
// before it settles for its first plan with a piece it cannot join.
const EXIT_TRIES = 16;

export function buildMazePlan(
  graph: TangleGraph,
  params: MazeParams = DEFAULT_MAZE_PARAMS
): MazePlan {
  // A plan that reaches everything is kept exactly as built (every link and
  // daily). Otherwise, K109: one whose tails cannot meet is rebuilt with the
  // tail route repaired right after spanning, so its choice junctions and
  // dead ends space around the repair. K110: then each piece the start
  // still cannot reach is joined at the end of the plan, so nothing else
  // moves. A piece with no link to the rest (the exit's cut left it nothing
  // to join through) moves the exit to the next-nearest edge instead.
  let first: MazePlan | null = null;
  for (let rank = 0; rank < EXIT_TRIES; rank++) {
    const tried = planWithExit(graph, params, rank);
    if (!tried) break;
    if (tried.whole) return tried.plan;
    if (!first) first = tried.plan;
  }
  return first!;
}

// The plan with the rank-th nearest exit edge (null past the last edge), and
// whether it reaches everything.
function planWithExit(
  graph: TangleGraph,
  params: MazeParams,
  rank: number
): { plan: MazePlan; whole: boolean } | null {
  const plan = planMaze(graph, params, false, false, rank);
  if (!plan) return null;
  if (planReachesAll(graph, plan)) return { plan, whole: true };
  let repair = false;
  if (!planTailsJoined(graph, plan)) {
    const repaired = planMaze(graph, params, true, false, rank)!;
    if (planReachesAll(graph, repaired)) return { plan: repaired, whole: true };
    if (!planTailsJoined(graph, repaired)) return { plan: repaired, whole: false };
    repair = true;
  }
  const joined = planMaze(graph, params, repair, true, rank)!;
  return { plan: joined, whole: planReachesAll(graph, joined) };
}

// A dead end's candidate cut site (planMaze's long dead-end threads).
interface DeadCandidate {
  strand: number;
  edgeId: string;
  mid: [number, number];
  trim?: MazeCutTrim;
}

// K74 LONG-TAIL DEAD ENDS (MazeParams.deadEndLength > 0). Sources (K284):
// long blind alleys follow Pullen (Think Labyrinth) and Zhao and Marquez
// 2013 (arXiv:1307.5713). A player finds a
// dead end by walking its free flank from the junction where it leaves the
// maze to the tip at the cut, so its length is that flank's junction-free
// arc - the older spread placement left most of them a few units long. Each
// pick takes, over every open (cut edge, trimmed flank) pair, the one whose
// free flank runs farthest before its first junction (a splice host edge or
// a merged crossing, its own trim merge included), counted up to tailLen;
// ties go to the cut site farthest from the placed junctions and earlier
// tips, then the shorter stub, then the edge id. The tail's first tailLen
// is then RESERVED (edges and crossings claimed), so the choice junctions,
// 4-ways, later trims and K110 joins all stay off it. Arcs are lattice
// polyline lengths through hypot2 (K108: engine-exact).
// K74 stage 3 (item 1): the lattice arc of an edge and the flank walker,
// lifted out of placeLongTails so the exit corridor and flank score share
// them byte for byte. Arcs are polyline lengths through hypot2 (K108).
function makeEdgeLen(graph: TangleGraph): (eid: string) => number {
  const cache = new Map<string, number>();
  return (eid: string): number => {
    let l = cache.get(eid);
    if (l === undefined) {
      const pts = graph.edges.get(eid)!.latticePoints;
      l = 0;
      for (let i = 1; i < pts.length; i++) {
        l += hypot2(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      }
      cache.set(eid, l);
    }
    return l;
  };
}

// Walk closed strand s's flank from the middle of its edge c: dir +1 runs
// along edge order (the flank a side-"a" trim leaves free), -1 against
// it. visit gets each node, then each edge at its middle, with the arc
// from the cut, and returns true to stop; so does passing maxArc or
// coming all the way around.
function walkFlankImpl(
  graph: TangleGraph,
  edgeLen: (eid: string) => number,
  s: number,
  c: number,
  dir: 1 | -1,
  visit: (isNode: boolean, id: string, arc: number) => boolean,
  maxArc: number
): void {
  const strand = graph.strands[s];
  const m = strand.edgeIds.length;
  let arc = edgeLen(strand.edgeIds[c]) / 2;
  for (let k = 0; k < m; k++) {
    const ni = (((dir > 0 ? c + 1 + k : c - k) % m) + m) % m;
    if (visit(true, strand.nodes[ni], arc)) return;
    const ei = (((dir > 0 ? c + 1 + k : c - 1 - k) % m) + m) % m;
    const eid = strand.edgeIds[ei];
    if (eid === strand.edgeIds[c]) return;
    const l = edgeLen(eid);
    if (visit(false, eid, arc + l / 2)) return;
    arc += l;
    if (arc > maxArc) return;
  }
}

function placeLongTails(
  graph: TangleGraph,
  pool: DeadCandidate[],
  nDead: number,
  tailLen: number,
  junctionEdges: Set<string>,
  junctionNodes: Set<string>,
  crossMap: Map<string, number[]>,
  usedCrossings: Set<string>,
  usedEdges: Set<string>,
  wallEdges: Set<string>,
  placed: number[],
  cutStrands: Set<number>,
  commit: (c: DeadCandidate, trim: MazeCutTrim) => void
): void {
  if (nDead <= 0) return;
  const edgeLen = makeEdgeLen(graph);
  const walkFlank = (
    s: number,
    c: number,
    dir: 1 | -1,
    visit: (isNode: boolean, id: string, arc: number) => boolean,
    maxArc: number
  ): void => walkFlankImpl(graph, edgeLen, s, c, dir, visit, maxArc);
  const isJunction = (isNode: boolean, id: string, ownMerge?: string): boolean =>
    isNode
      ? junctionNodes.has(id) || id === ownMerge
      : junctionEdges.has(id);
  const freeTail = (s: number, c: number, dir: 1 | -1, ownMerge: string): number => {
    let t = tailLen;
    walkFlank(
      s,
      c,
      dir,
      (isNode, id, arc) => {
        if (!isJunction(isNode, id, ownMerge)) return false;
        t = arc;
        return true;
      },
      tailLen
    );
    return Math.min(t, tailLen);
  };

  // Each site's squared distance to the nearest placed junction or tip
  // (quarter-unit coordinates: exact), folded in as points arrive.
  const room = new Float64Array(pool.length).fill(Infinity);
  const fold = (px: number, py: number): void => {
    for (let i = 0; i < pool.length; i++) {
      const dx = pool[i].mid[0] - px;
      const dy = pool[i].mid[1] - py;
      const d = dx * dx + dy * dy;
      if (d < room[i]) room[i] = d;
    }
  };
  let seen = 0;
  for (let k = 0; k < nDead; k++) {
    for (; seen < placed.length; seen += 2) fold(placed[seen], placed[seen + 1]);
    let best = -1;
    let bestTrim: MazeCutTrim | null = null;
    let bestT = 0;
    let bestStub = 0;
    let bestCi = 0;
    for (let i = 0; i < pool.length; i++) {
      const c = pool[i];
      if (cutStrands.has(c.strand) || usedEdges.has(c.edgeId)) continue;
      const both = planTrimBoth(graph, c, crossMap, usedCrossings, usedEdges, wallEdges);
      if (!both.a && !both.b) continue;
      const ci = graph.strands[c.strand].edgeIds.indexOf(c.edgeId);
      for (const trim of [both.a, both.b]) {
        if (!trim) continue;
        const t = freeTail(c.strand, ci, trim.side === "a" ? 1 : -1, trim.mergeCrossing);
        const stub = trim.stubEdges.length;
        let better = best < 0 || t > bestT + 1e-9;
        if (!better && Math.abs(t - bestT) <= 1e-9) {
          better =
            room[i] > room[best] ||
            (room[i] === room[best] &&
              (stub < bestStub ||
                (stub === bestStub && c.edgeId < pool[best].edgeId)));
        }
        if (better) {
          best = i;
          bestTrim = trim;
          bestT = t;
          bestStub = stub;
          bestCi = ci;
        }
      }
    }
    if (best < 0 || !bestTrim) break;
    const site = pool[best];
    commit(site, bestTrim);
    junctionNodes.add(bestTrim.mergeCrossing);
    fold(site.mid[0], site.mid[1]);
    // Reserve the free flank up to tailLen (or its first junction).
    walkFlank(
      site.strand,
      bestCi,
      bestTrim.side === "a" ? 1 : -1,
      (isNode, id, arc) => {
        if (isJunction(isNode, id) || arc > tailLen) return true;
        if (!isNode) usedEdges.add(id);
        else if (graph.nodes.get(id)!.type === NODE_TYPE.CROSSING) {
          usedCrossings.add(id);
        }
        return false;
      },
      Infinity
    );
  }
}

function planMaze(
  graph: TangleGraph,
  params: MazeParams,
  repairTails: boolean,
  joinPieces: boolean,
  exitRank: number
): MazePlan | null {
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
  const exit =
    exitRank === 0
      ? nearestEdgeToCorner(graph, mazeStrands, exitPoint, entrance.edgeId, outer)
      : rankedEdgeToCorner(graph, mazeStrands, exitPoint, entrance.edgeId, outer, exitRank);
  if (!exit) return null;

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
  // K74 stage 3: shared edge arcs for the flank score and the corridor.
  const edgeLenAll = makeEdgeLen(graph);
  const flankL = params.exitCorridor > 0 ? params.exitCorridor : 24;
  const corridorEdges = new Set<string>();
  const corridorNodes = new Set<string>();
  const collectCorridor = (): void => {
    if (!(params.exitCorridor > 0)) return;
    const s = exit.strand;
    const strand = graph.strands[s];
    if (!strand.isClosed) return;
    const c = strand.edgeIds.indexOf(exit.edgeId);
    if (c < 0) return;
    const dirs: Array<1 | -1> = exit.trim ? [exit.trim.side === "a" ? 1 : -1] : [1, -1];
    for (const dir of dirs) {
      walkFlankImpl(graph, edgeLenAll, s, c, dir, (isNode, id, arc) => {
        if (arc > params.exitCorridor) return true;
        if (!isNode) corridorEdges.add(id);
        else if (graph.nodes.get(id)!.type === NODE_TYPE.CROSSING) corridorNodes.add(id);
        return false;
      }, params.exitCorridor);
    }
  };
  for (const cut of [entrance, exit]) {
    if (cut === exit && params.exitFlank !== "stub") {
      // The exit trim waits for the flank rule: score each flank by the
      // farthest squared distance its nodes reach from the exit point
      // within flankL (squared distances, as in placeLongTails' room).
      const both = planTrimBoth(graph, cut, crossMap, usedCrossings, usedEdges, wallEdges);
      const s = cut.strand;
      const ci = graph.strands[s].edgeIds.indexOf(cut.edgeId);
      const score = (trim: MazeCutTrim): number => {
        let mx = 0;
        walkFlankImpl(graph, edgeLenAll, s, ci, trim.side === "a" ? 1 : -1, (isNode, id, arc) => {
          if (arc > flankL) return true;
          if (isNode) {
            const p = graph.nodes.get(id)!.latticePos;
            const dx = p[0] - exitPoint[0];
            const dy = p[1] - exitPoint[1];
            const d2 = dx * dx + dy * dy;
            if (d2 > mx) mx = d2;
          }
          return false;
        }, flankL);
        return mx;
      };
      let pick: MazeCutTrim | undefined;
      if (both.a && both.b) {
        pick = params.exitFlank === "near" ? (score(both.a) < score(both.b) ? both.a : both.b) : (score(both.a) >= score(both.b) ? both.a : both.b);
      } else pick = both.a ?? both.b ?? undefined;
      cut.trim = pick;
    } else {
      cut.trim = planTrim(
        graph,
        cut,
        crossMap,
        usedCrossings,
        usedEdges,
        wallEdges
      );
    }
    if (cut === exit) collectCorridor();
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
  const corrClear = (c: Candidate): boolean => !corridorEdges.has(c.edgeA) && !corridorEdges.has(c.edgeB);
  const spanOrder = [...interCands].sort((p, q) => {
    const pc = clearOf(p.a) && clearOf(p.b) && corrClear(p) ? 0 : 1;
    const qc = clearOf(q.a) && clearOf(q.b) && corrClear(q) ? 0 : 1;
    return pc - qc || (p.key < q.key ? -1 : 1);
  });
  const interCross = crossings.filter(
    (x) => x.strands.length === 2 && x.strands[0] !== x.strands[1]
  );
  const crossOrder = [...interCross].sort((p, q) => {
    const pc = clearOf(p.pos) && !corridorNodes.has(p.id) ? 0 : 1;
    const qc = clearOf(q.pos) && !corridorNodes.has(q.id) ? 0 : 1;
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

  if (repairTails) {
    repairTailRoute(
      graph,
      entrance,
      exit,
      candidates,
      crossings,
      new Set(mazeStrands),
      usedEdges,
      usedCrossings,
      placed,
      clearOf,
      spanningSplices,
      spanningMerges,
      corridorEdges,
      corridorNodes
    );
  }

  // K74 stage 3: claim the corridor only now (after spanning and K109's
  // repair), so the backbone could use it when nothing else connects;
  // choices, 4-ways and dead ends below keep off it. K110's joins (later)
  // may still use it, ranked last.
  for (const eid of corridorEdges) usedEdges.add(eid);
  for (const nid of corridorNodes) usedCrossings.add(nid);

  // ---- Long dead-end threads. Cut one plain edge of a closed maze strand
  // (never the entrance/exit hosts, at most one cut per strand), fuse one
  // flank into its first crossing via the decoy-trim machinery, and leave
  // the other flank's tip FREE mid-fabric: the whole former loop becomes
  // one long woven thread ending in a distant dead end - discovered by
  // walking it, not by seeing a stub. deadEndLength picks the placement:
  // > 0, long tails (placeLongTails), placed HERE, before the choice
  // junctions, so their reserved tails stay junction-free; 0, the older
  // spread placement after the choice junctions (below).
  const mazeSet = new Set(mazeStrands);
  const cutStrands = new Set<number>([entrance.strand, exit.strand]);
  const deadEndCuts: MazeCut[] = [];
  // Cut sites: unclaimed, corner-clear edges of closed maze strands.
  const deadPoolNow = (): DeadCandidate[] => {
    const pool: DeadCandidate[] = [];
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
        pool.push({ strand: s, edgeId: eid, mid });
      }
    }
    return pool;
  };
  const deadCountOf = (pool: DeadCandidate[]): number =>
    Math.round(
      params.deadEndDensity * new Set(pool.map((c) => c.strand)).size
    );
  const commitDead = (c: DeadCandidate, trim: MazeCutTrim): void => {
    cutStrands.add(c.strand);
    usedEdges.add(c.edgeId);
    wallEdges.add(c.edgeId);
    usedCrossings.add(trim.mergeCrossing);
    for (const se of trim.stubEdges) usedEdges.add(se);
    const mp = graph.nodes.get(trim.mergeCrossing)!.latticePos;
    placed.push(mp[0], mp[1]);
    deadEndCuts.push({ strand: c.strand, edgeId: c.edgeId, trim });
  };

  if (params.deadEndLength > 0) {
    const pool = deadPoolNow();
    // The junctions placed so far: splice host edges and merged crossings
    // (spanning and K109's repair, the corner trims' merges).
    const junctionEdges = new Set<string>();
    for (const s of spanningSplices) {
      junctionEdges.add(s.edgeA);
      junctionEdges.add(s.edgeB);
    }
    const junctionNodes = new Set<string>(spanningMerges);
    for (const cut of [entrance, exit]) {
      if (cut.trim) junctionNodes.add(cut.trim.mergeCrossing);
    }
    placeLongTails(
      graph,
      pool,
      deadCountOf(pool),
      params.deadEndLength,
      junctionEdges,
      junctionNodes,
      crossMap,
      usedCrossings,
      usedEdges,
      wallEdges,
      placed,
      cutStrands,
      commitDead
    );
  }

  // ---- Choice junctions. ----
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

  // K74 stage 3 taper: floor = spacing x (1 + K x max(0, 1 - d/R)), d the
  // candidate's least hypot2 distance to the exit point.
  const taperOf = params.exitTaperRadius > 0 && params.exitTaperStrength > 0
    ? (pts: number[]): number => {
        let d = Infinity;
        for (let k = 0; k < pts.length; k += 2) {
          const dd = hypot2(pts[k] - exitPoint[0], pts[k + 1] - exitPoint[1]);
          if (dd < d) d = dd;
        }
        return params.junctionSpacing * (1 + params.exitTaperStrength * Math.max(0, 1 - d / params.exitTaperRadius));
      }
    : undefined;
  const choiceSplices = pickFarthest(
    eligible,
    (c) => [c.a[0], c.a[1], c.b[0], c.b[1]],
    spliceAvail,
    spliceTake,
    nSplice,
    params.junctionSpacing,
    placed,
    taperOf
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
    placed,
    taperOf
  ).map((x) => x.id);

  if (!(params.deadEndLength > 0)) {
    // The spread placement: cut sites farthest-first under a spacing floor,
    // each trimming its shorter stub.
    const deadPool = deadPoolNow();
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
      (c) => commitDead(c, c.trim!),
      deadCountOf(deadPool),
      // The cut site is a thread TIP, not a choice point (the choice lives
      // at its trim merge), so it needs less breathing room than junctions
      // - and the full floor saturates small dense maps to zero cuts.
      Math.max(1, params.junctionSpacing * 0.5),
      placed
    );
  }

  if (joinPieces) {
    joinOrphanPieces(
      graph,
      [entrance, exit, ...deadEndCuts],
      candidates,
      crossings,
      mazeStrands,
      usedEdges,
      usedCrossings,
      placed,
      clearOf,
      spanningSplices,
      spanningMerges,
      choiceSplices,
      fourWayMerges,
      corridorEdges,
      corridorNodes
    );
  }

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
    ...(params.hCutShare > 0 ? { hCutShare: params.hCutShare } : {}),
    ...(params.hCutShare > 0 && params.exitClearance > 0
      ? { exitGuardPoint: exitPoint, exitGuardClearance: params.exitClearance }
      : {}),
    ...(params.hCutShare > 0 && params.exitCorridor > 0 && corridorNodes.size > 0
      ? { exitGuardCrossings: [...corridorNodes] }
      : {}),
  };
}
