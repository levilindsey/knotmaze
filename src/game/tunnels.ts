// K137 tunnels (4.13, docs/design/K80_gameplay_additions.md): a pair
// of junctions far apart in moves, linked as one move - a thread that
// sinks into the backdrop and re-emerges (the renderer draws it). The
// walk graph gains a run: chain -1 marks it everywhere (no thread of
// its own), length 1 (one move, a shortcut's meter cost). Par and
// every search over the walk see the link; the minotaur is barred
// from it (ChaseGraph), fragile runs never break it (fragile's
// exemptRun), and placements that need a thread skip it.

import type { WalkEdge, WalkGraph, WalkVertex } from "../core/walk_graph";
import { walkDistances } from "../core/walk_graph";

export const TUNNELS_MAX = 2;
// The mouths must be at least this many runs apart (fewest moves), so
// the link is a discovery, not a detour around one junction.
export const TUNNEL_MIN_SPAN = 4;

// The vertex pairs a tunnel count links, far apart first. Junctions
// only (degree 3+), never the start or exit (tails are ends, never
// junctions, so they drop out on degree alone).
export function tunnelPairs(walk: WalkGraph, count: number): [string, string][] {
  if (!(count > 0)) return [];
  const junctions = [...walk.vertices.values()]
    .filter((v) => !v.isEnd && v.edges.length >= 3 && v.id !== walk.start && v.id !== walk.exit)
    .map((v) => v.id)
    .sort();
  if (junctions.length < 2) return [];
  // Fewest-runs distances between junctions (BFS over runs).
  const dist = new Map<string, Map<string, number>>();
  for (const j of junctions) dist.set(j, runDistances(walk, j));
  const pairs: { a: string; b: string; d: number }[] = [];
  for (let i = 0; i < junctions.length; i++) {
    for (let k = i + 1; k < junctions.length; k++) {
      const d = dist.get(junctions[i])!.get(junctions[k]) ?? Infinity;
      if (d >= TUNNEL_MIN_SPAN) pairs.push({ a: junctions[i], b: junctions[k], d });
    }
  }
  // Farthest first; ties by vertex id, so the pick is the seed's alone.
  pairs.sort((x, y) => y.d - x.d || (x.a < y.a ? -1 : x.a > y.a ? 1 : x.b < y.b ? -1 : 1));
  const used = new Set<string>();
  const out: [string, string][] = [];
  for (const p of pairs) {
    if (out.length >= count) break;
    if (used.has(p.a) || used.has(p.b)) continue;
    used.add(p.a);
    used.add(p.b);
    out.push([p.a, p.b]);
  }
  return out;
}

// Fewest runs from `from` to every vertex (BFS; runs are unweighted).
function runDistances(walk: WalkGraph, from: string): Map<string, number> {
  const dist = new Map<string, number>([[from, 0]]);
  let frontier = [from];
  for (let d = 1; frontier.length > 0; d++) {
    const next: string[] = [];
    for (const v of frontier) {
      for (const eid of walk.vertices.get(v)!.edges) {
        const e = walk.edges[eid];
        const other = e.va === v ? e.vb : e.va;
        if (dist.has(other)) continue;
        dist.set(other, d);
        next.push(other);
      }
    }
    frontier = next;
  }
  return dist;
}

// The walk with the tunnel runs appended: new edge ids after the
// last, both mouths' edge lists extended, distances recomputed (par
// with the tunnel). The input graph is left untouched.
export function withTunnels(walk: WalkGraph, count: number): WalkGraph {
  const pairs = tunnelPairs(walk, count);
  if (pairs.length === 0) return walk;
  const vertices = new Map<string, WalkVertex>();
  for (const [id, v] of walk.vertices) vertices.set(id, { ...v, edges: [...v.edges] });
  const edges: WalkEdge[] = [...walk.edges];
  for (const [a, b] of pairs) {
    const id = edges.length;
    edges.push({ id, va: a, vb: b, chain: -1, ctrlA: 0, ctrlB: 0, length: 1 });
    vertices.get(a)!.edges.push(id);
    vertices.get(b)!.edges.push(id);
  }
  const distToExit = walkDistances(vertices, edges, walk.exit);
  return {
    ...walk,
    vertices,
    edges,
    distToExit,
    optimalLength: distToExit.get(walk.start) ?? Infinity,
  };
}
