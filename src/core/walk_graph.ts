// P4 maze gameplay, the WALK GRAPH: the player-facing structure of the
// branching maze fabric. Pure core/ - built from the APPLIED tangle graph
// (after applyMazePlan + applyMazeCuts), no physics, no render, no RNG.
//
// Vertices are the graph's JUNCTION and END nodes - the only places a walker
// has a decision (or a terminus) - plus K115 waypoint nodes (text letter
// boundaries: degree-2 stops where the walker pauses, never branches).
// Edges are maximal runs of thread between
// two consecutive vertices along a strand; CROSSING and TURN nodes are
// interior to runs (following a strand through a crossing is "going
// straight" by construction, so a crossing is never a decision point). The
// walk graph is a MULTIGRAPH: two vertices can be joined by several distinct
// runs (e.g. a closed strand with exactly two junctions has two arcs), and a
// closed strand with a single junction yields a self-loop run.
//
// Each walk edge records its chain ctrl span for the physics/render layers:
// strand node index i sits at chain control 2*i (chains mirror strands, one
// particle per node occurrence plus one per edge midpoint; open chains stop
// at the real end). A wrap run on a closed strand stores an UNWRAPPED ctrlB
// (beyond 2*nodeCount); consumers sample modulo the chain length.
//
// Lengths are LATTICE arc lengths (sum of the covered graph edges' polyline
// lengths): deterministic from (seed, params) per URL-as-complete-state, so
// the optimal-path metric never drifts as the live fabric relaxes - and the
// same in every browser (hypot2, K108).

import type { TangleGraph } from "./types";
import { NODE_TYPE } from "./types";
import { ENTRANCE_END_IDS, EXIT_END_IDS } from "./maze_apply";
import { hypot2 } from "../util/det_math";

export interface WalkEdge {
  id: number; // Index into WalkGraph.edges.
  va: string; // Vertex node id at the ctrlA end.
  vb: string; // Vertex node id at the ctrlB end.
  chain: number; // Strand/chain index the run lives on.
  ctrlA: number; // Chain control of va's occurrence (even).
  ctrlB: number; // Chain control of vb's occurrence; unwrapped (>= ctrlA).
  length: number; // Lattice arc length of the run.
}

export interface WalkVertex {
  id: string;
  isEnd: boolean; // Degree-1 END node (cut tail or dead-end stub tip).
  chain: number; // One live occurrence, for position sampling...
  ctrl: number; // ...at this chain control.
  edges: number[]; // Incident walk-edge ids (a self-loop appears once).
}

export interface WalkGraph {
  vertices: Map<string, WalkVertex>;
  edges: WalkEdge[];
  start: string; // Chosen entrance tail vertex id.
  exit: string; // Chosen exit tail vertex id.
  optimalLength: number; // Shortest start->exit walk distance.
  // Shortest distance from every reachable vertex to the exit (Dijkstra
  // field): powers solve hints and scripted verification.
  distToExit: Map<string, number>;
  // K115 stage 3a, titled graphs only: the seam vertex where the title
  // meets the maze tail, the title's lattice arc (start -> mazeStart),
  // and the title's walk membership (vertices incl. the seam, edges).
  mazeStart?: string;
  titleLength?: number;
  titleVertices?: Set<string>;
  titleEdges?: Set<number>;
  // K552: the maze's own vertex ids, titled id -> untitled id, for the
  // few vertices attachTitle renamed (the seam was the maze's start, and
  // a leftover mentr_a became mentr_decoy). A vertex not listed keeps its
  // id. The maze form (game/daily_attempt.ts) reads it.
  mazeNames?: ReadonlyMap<string, string>;
  // K552: the title's strands, [from, to) in graph.strands. Every run on
  // them is a title run, including one the start cannot reach (a letter's
  // detached stroke, which the seam-bounded search alone left as maze).
  titleChains?: readonly [number, number];
}

// Deterministic Dijkstra over the walk multigraph: the walk distance from
// `source` to every vertex (Infinity where unreachable). O(V^2) scan with
// id tie-breaking; the walk graph is small. buildWalkGraph's start/exit
// choice and distToExit use it, and so does the burn race's fire (K114,
// game/fire.ts: distances from WalkGraph.start).
export function walkDistances(
  vertices: ReadonlyMap<string, WalkVertex>,
  edges: readonly WalkEdge[],
  source: string
): Map<string, number> {
  const dist = new Map<string, number>();
  const done = new Set<string>();
  for (const id of vertices.keys()) dist.set(id, Infinity);
  dist.set(source, 0);
  for (;;) {
    let cur: string | null = null;
    let curD = Infinity;
    for (const [id, d] of dist) {
      if (done.has(id) || d === Infinity) continue;
      if (d < curD || (d === curD && cur !== null && id < cur)) {
        curD = d;
        cur = id;
      }
    }
    if (cur === null) break;
    done.add(cur);
    for (const eid of vertices.get(cur)!.edges) {
      const e = edges[eid];
      const other = e.va === cur ? e.vb : e.va;
      const nd = curD + e.length;
      if (nd < dist.get(other)!) dist.set(other, nd);
    }
  }
  return dist;
}

// Build the walk graph and pick the start/exit tails. Returns null when the
// graph carries no cut ends (not an applied maze fabric).
export interface WalkForce {
  start: string; // The walk's start (a title word's mentr_a).
  exit: string; // The exit chosen before the title was attached.
  mazeStart?: string; // The seam vertex (titled graphs).
  mazeNames?: ReadonlyMap<string, string>; // K552: see WalkGraph.
  titleChains?: readonly [number, number]; // K552: see WalkGraph.
}

export function buildWalkGraph(
  graph: TangleGraph,
  force?: WalkForce
): WalkGraph | null {
  const vertices = new Map<string, WalkVertex>();
  const edges: WalkEdge[] = [];

  const isVertex = (id: string): boolean => {
    const n = graph.nodes.get(id)!;
    // K115: a waypoint (a text letter boundary) stops a run even at
    // degree 2. It is never a branch: its walk degree stays 2 (its two
    // path neighbours), unless it coincides with a junction.
    return n.type === NODE_TYPE.JUNCTION || n.type === NODE_TYPE.END || n.waypoint === true;
  };

  const vertexAt = (id: string, chain: number, ctrl: number): WalkVertex => {
    let v = vertices.get(id);
    if (!v) {
      v = {
        id,
        isEnd: graph.nodes.get(id)!.type === NODE_TYPE.END,
        chain,
        ctrl,
        edges: [],
      };
      vertices.set(id, v);
    }
    return v;
  };

  const addEdge = (
    vaId: string,
    vbId: string,
    chain: number,
    ctrlA: number,
    ctrlB: number,
    length: number
  ): void => {
    const id = edges.length;
    edges.push({ id, va: vaId, vb: vbId, chain, ctrlA, ctrlB, length });
    const va = vertexAt(vaId, chain, ctrlA);
    va.edges.push(id);
    const vb = vertexAt(vbId, chain, ctrlB);
    // A self-loop run (closed strand with a single junction) lists the edge
    // once on its vertex.
    if (vb !== va) vb.edges.push(id);
  };

  graph.strands.forEach((strand, si) => {
    // K115 stage 6b: a decorative (accent-mark) strand is never walked:
    // its END tips are not vertices and it contributes no runs.
    if (strand.decorative) return;
    const nodeCount = strand.isClosed
      ? strand.nodes.length - 1
      : strand.nodes.length;

    // Cumulative lattice arc at each node index (cum[k] = arc from node 0
    // to node k along the strand's edges).
    const cum = new Float64Array(strand.edgeIds.length + 1);
    strand.edgeIds.forEach((eid, k) => {
      const pts = graph.edges.get(eid)!.latticePoints;
      let len = 0;
      for (let m = 1; m < pts.length; m++) {
        len += hypot2(pts[m][0] - pts[m - 1][0], pts[m][1] - pts[m - 1][1]);
      }
      cum[k + 1] = cum[k] + len;
    });
    const total = cum[strand.edgeIds.length];

    const stops: number[] = [];
    for (let i = 0; i < nodeCount; i++) {
      if (isVertex(strand.nodes[i])) stops.push(i);
    }
    if (stops.length === 0) return; // Decorative loop; no walkable structure.

    for (let t = 0; t + 1 < stops.length; t++) {
      const a = stops[t];
      const b = stops[t + 1];
      addEdge(
        strand.nodes[a],
        strand.nodes[b],
        si,
        2 * a,
        2 * b,
        cum[b] - cum[a]
      );
    }
    if (strand.isClosed) {
      // The wrap run: last stop around the seam to the first stop.
      const a = stops[stops.length - 1];
      const b = stops[0];
      addEdge(
        strand.nodes[a],
        strand.nodes[b],
        si,
        2 * a,
        2 * (b + nodeCount),
        total - cum[a] + cum[b]
      );
    }
  });

  const entrances = ENTRANCE_END_IDS.filter((id) => vertices.has(id));
  const exits = EXIT_END_IDS.filter((id) => vertices.has(id));
  if (force) {
    if (!vertices.has(force.start) || !vertices.has(force.exit)) return null;
    if (force.mazeStart !== undefined && !vertices.has(force.mazeStart)) {
      return null;
    }
  } else if (entrances.length === 0 || exits.length === 0) {
    return null;
  }

  const dijkstra = (source: string): Map<string, number> =>
    walkDistances(vertices, edges, source);

  // The real start/exit pair is the one with the LONGEST optimal solve
  // among the four tail combinations (deterministic difficulty maximizer);
  // the other two tails stay in the graph as unmarked decoys. Canonical
  // combo order breaks ties.
  let start: string = entrances[0];
  let exit: string = exits[0];
  let best = -Infinity;
  for (const s of entrances) {
    const dist = dijkstra(s);
    for (const e of exits) {
      const d = dist.get(e)!;
      if (Number.isFinite(d) && d > best) {
        best = d;
        start = s;
        exit = e;
      }
    }
  }
  if (force) {
    start = force.start;
    exit = force.exit;
  }
  const optimalLength = force?.mazeStart
    ? dijkstra(force.mazeStart).get(exit) ?? Infinity
    : Number.isFinite(best)
      ? best
      : Infinity;

  // K115 stage 3a: the title's arc and membership (titled graphs only).
  // The title side is what reaches the seam from the start without
  // passing it; the seam itself is a title vertex, its tail run is not.
  let titleLength: number | undefined;
  let titleVertices: Set<string> | undefined;
  let titleEdges: Set<number> | undefined;
  if (force?.mazeStart) {
    const seam = force.mazeStart;
    titleLength = dijkstra(start).get(seam) ?? Infinity;
    titleVertices = new Set<string>([start]);
    titleEdges = new Set<number>();
    const q2 = [start];
    titleVertices.add(start);
    while (q2.length > 0) {
      const v = q2.shift()!;
      if (v === seam) continue;
      for (const eid of vertices.get(v)!.edges) {
        const e = edges[eid];
        const other = e.va === v ? e.vb : e.va;
        titleEdges.add(eid);
        if (!titleVertices.has(other)) {
          titleVertices.add(other);
          q2.push(other);
        }
      }
    }
    // K552: a title strand the start cannot reach is title too, never
    // maze (its runs touch no maze vertex: the title meets the maze only
    // at the seam).
    if (force.titleChains) {
      const [from, to] = force.titleChains;
      for (const e of edges) {
        if (e.chain < from || e.chain >= to) continue;
        titleEdges.add(e.id);
        titleVertices.add(e.va);
        titleVertices.add(e.vb);
      }
    }
  }

  return {
    vertices,
    edges,
    start,
    exit,
    optimalLength,
    distToExit: dijkstra(exit),
    ...(force?.mazeStart
      ? {
          mazeStart: force.mazeStart,
          titleLength,
          titleVertices,
          titleEdges,
          ...(force.mazeNames ? { mazeNames: force.mazeNames } : {}),
          ...(force.titleChains ? { titleChains: force.titleChains } : {}),
        }
      : {}),
  };
}
