import { describe, it, expect } from "vitest";
import type { WalkEdge, WalkGraph, WalkVertex } from "../../src/core/walk_graph";
import { tunnelPairs, withTunnels } from "../../src/game/tunnels";

// K137 tunnels (4.13): the pair pick and the augmented walk.
function graph(runs: [string, string, number][], start: string, exit: string): WalkGraph {
  const vertices = new Map<string, WalkVertex>();
  const edges: WalkEdge[] = [];
  runs.forEach(([va, vb, length], id) => {
    edges.push({ id, va, vb, chain: id, ctrlA: 0, ctrlB: length, length });
    for (const v of va === vb ? [va] : [va, vb]) {
      if (!vertices.has(v)) vertices.set(v, { id: v, isEnd: false, chain: id, ctrl: 0, edges: [] });
      vertices.get(v)!.edges.push(id);
    }
  });
  for (const v of vertices.values()) {
    const e = edges[v.edges[0]];
    v.isEnd = v.edges.length === 1 && e.va !== e.vb;
  }
  return { vertices, edges, start, exit, optimalLength: 30, distToExit: new Map() };
}

// S -0- A -1- B -2- C -3- X, dead end B -4- D, long loop A -5- C.
const G1 = graph(
  [
    ["S", "A", 5],
    ["A", "B", 10],
    ["B", "C", 10],
    ["C", "X", 5],
    ["B", "D", 8],
    ["A", "C", 30],
  ],
  "S",
  "X"
);

// An 11-run chain with chords at both ends: junctions a, c, h, j.
const G2 = graph(
  [
    ["S", "a", 4],
    ["a", "b", 4],
    ["b", "c", 4],
    ["c", "d", 4],
    ["d", "e", 4],
    ["e", "f", 4],
    ["f", "g", 4],
    ["g", "h", 4],
    ["h", "i", 4],
    ["i", "j", 4],
    ["j", "X", 4],
    ["a", "c", 7],
    ["h", "j", 7],
  ],
  "S",
  "X"
);

describe("tunnelPairs", () => {
  it("finds nothing in a small graph (mouths too near)", () => {
    expect(tunnelPairs(G1, 1)).toEqual([]);
  });
  it("links the farthest junctions", () => {
    // a to j is 8 runs by the chain (a-b-c-d-e-f-g-h-j and shorter
    // chord variants still leave them the farthest pair).
    expect(tunnelPairs(G2, 1)).toEqual([["a", "j"]]);
  });
  it("a second pair reuses no mouth", () => {
    const pairs = tunnelPairs(G2, 2);
    expect(pairs.length).toBe(2);
    const mouths = pairs.flat();
    expect(new Set(mouths).size).toBe(mouths.length);
  });
  it("is empty with no count", () => {
    expect(tunnelPairs(G2, 0)).toEqual([]);
  });
});

describe("withTunnels", () => {
  it("returns the walk untouched when nothing qualifies", () => {
    expect(withTunnels(G1, 1)).toBe(G1);
  });
  it("appends a chain -1 run and recomputes par", () => {
    const w = withTunnels(G2, 1);
    expect(w).not.toBe(G2);
    expect(w.edges.length).toBe(G2.edges.length + 1);
    const t = w.edges[w.edges.length - 1];
    expect(t.chain).toBe(-1);
    expect(t.length).toBe(1);
    expect(t.va).toBe("a");
    expect(t.vb).toBe("j");
    expect(w.vertices.get("a")!.edges).toContain(t.id);
    expect(w.vertices.get("j")!.edges).toContain(t.id);
    // Par: S-a (4) + tunnel (1) + j-X (4) = 9, against 44 by thread.
    expect(w.optimalLength).toBe(9);
    expect(w.distToExit.get("a")).toBe(5);
    // The input graph is untouched.
    expect(G2.edges.length).toBe(13);
    expect(G2.vertices.get("a")!.edges).not.toContain(t.id);
  });
});
