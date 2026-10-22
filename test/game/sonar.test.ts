import { describe, it, expect } from "vitest";
import type { WalkEdge, WalkGraph, WalkVertex } from "../../src/core/walk_graph";
import { pingsLeft, sonarRuns } from "../../src/game/sonar";

// K137 sonar (4.26): which runs ring, and the ping budget.
// Same hand-built graph as test/game/minotaur.test.ts.
// S -0- A -1- B -2- C -3- X, dead end B -4- D, long loop A -5- C.
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
  return { vertices, edges, start, exit, optimalLength: 0, distToExit: new Map() };
}

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

// Notes by run id: runs 1 and 2 share a note; 5 is far from 2.
const NOTES: Record<number, number> = { 0: 110, 1: 220, 2: 220, 3: 330, 4: 220, 5: 440 };
const noteOf = (run: number): number | null => NOTES[run] ?? null;

describe("sonarRuns", () => {
  it("rings same-note runs within range, nearest first, not itself", () => {
    // From run 1 (note 220): run 2 is 1 away, run 4 is 2 away (via B).
    expect(sonarRuns(G1, 1, noteOf)).toEqual([2, 4]);
  });
  it("respects the range", () => {
    // From run 2, runs 1 and 4 both ring at 1 run (they share B with
    // it); a range of 0 rings nothing.
    expect(sonarRuns(G1, 2, noteOf, 1)).toEqual([1, 4]);
    expect(sonarRuns(G1, 1, noteOf, 0)).toEqual([]);
  });
  it("rings nothing without a note or a run", () => {
    expect(sonarRuns(G1, 5, noteOf)).toEqual([]);
    expect(sonarRuns(G1, 1, () => null)).toEqual([]);
    expect(sonarRuns(G1, -1, noteOf)).toEqual([]);
    expect(sonarRuns(G1, 99, noteOf)).toEqual([]);
  });
});

describe("pingsLeft", () => {
  it("is unlimited at 0 and counts down a limit", () => {
    expect(pingsLeft(0, 99)).toBe(Infinity);
    expect(pingsLeft(3, 1)).toBe(2);
    expect(pingsLeft(3, 5)).toBe(0);
  });
});
