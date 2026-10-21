import { describe, it, expect } from "vitest";
import { runsToExit, walkDistances } from "../../src/core/walk_graph";
import type { WalkGraph, WalkVertex, WalkEdge } from "../../src/core/walk_graph";
import { FabricMazeController } from "../../src/game/fabric_controller";
import { parFor, parScore, strictLost, strokesLeft } from "../../src/game/par";
import { SeededRNG } from "../../src/util/random";

// K137 stage 1: par (game/par.ts), runsToExit (core/walk_graph.ts) and the
// controller's strict loss.

function graph(runs: Array<[string, string, number]>, start: string, exit: string): WalkGraph {
  const vertices = new Map<string, WalkVertex>();
  const edges: WalkEdge[] = [];
  const at = (id: string): WalkVertex => {
    let v = vertices.get(id);
    if (!v) {
      v = { id, isEnd: false, chain: 0, ctrl: 0, edges: [] };
      vertices.set(id, v);
    }
    return v;
  };
  runs.forEach(([va, vb, length], id) => {
    edges.push({ id, va, vb, chain: id, ctrlA: 0, ctrlB: 2, length });
    at(va).edges.push(id);
    if (vb !== va) at(vb).edges.push(id);
  });
  for (const v of vertices.values()) v.isEnd = v.edges.length === 1;
  const distToExit = walkDistances(vertices, edges, exit);
  return {
    vertices,
    edges,
    start,
    exit,
    optimalLength: distToExit.get(start) ?? Infinity,
    distToExit,
  };
}

// Fewest runs by brute force: relax every edge until nothing changes.
function bruteRuns(w: WalkGraph, blocked: Set<number>): Map<string, number> {
  const d = new Map<string, number>();
  for (const id of w.vertices.keys()) d.set(id, id === w.exit ? 0 : Infinity);
  for (let changed = true; changed; ) {
    changed = false;
    for (const e of w.edges) {
      if (blocked.has(e.id)) continue;
      const a = d.get(e.va)!;
      const b = d.get(e.vb)!;
      if (a + 1 < b) { d.set(e.vb, a + 1); changed = true; }
      if (b + 1 < a) { d.set(e.va, b + 1); changed = true; }
    }
  }
  return d;
}

// S-a (tail), a-b, b-X (tail), a-c, c-b, c-D (a dead-end stub). F = 3.
const RUNS: Array<[string, string, number]> = [
  ["S", "a", 2], // 0
  ["a", "b", 3], // 1
  ["b", "X", 2], // 2
  ["a", "c", 2], // 3
  ["c", "b", 2], // 4
  ["c", "D", 1], // 5
];

describe("runsToExit (K137)", () => {
  it("matches a brute force on random small graphs, with and without blocked runs", () => {
    const rng = new SeededRNG(137);
    for (let t = 0; t < 300; t++) {
      const n = 3 + rng.nextInt(8);
      const ids = Array.from({ length: n }, (_, i) => `v${i}`);
      const runs: Array<[string, string, number]> = [];
      const m = n - 1 + rng.nextInt(2 * n);
      for (let i = 0; i < m; i++) {
        // Multi-runs and self-loops included.
        runs.push([ids[rng.nextInt(n)], ids[rng.nextInt(n)], 1 + rng.nextInt(5)]);
      }
      const used = new Set(runs.flatMap(([a, b]) => [a, b]));
      if (used.size < 2) continue;
      const [start, exit] = [...used];
      const w = graph(runs, start, exit);
      const blocked = new Set<number>();
      for (let i = 0; i < runs.length; i++) if (rng.next() < 0.25) blocked.add(i);
      expect(runsToExit(w)).toEqual(bruteRuns(w, new Set()));
      expect(runsToExit(w, (e) => blocked.has(e))).toEqual(bruteRuns(w, blocked));
    }
  });

  it("counts runs, not length", () => {
    const w = graph(RUNS, "S", "X");
    const r = runsToExit(w);
    expect(r.get("S")).toBe(3);
    expect(r.get("D")).toBe(3);
    expect(r.get("X")).toBe(0);
    // Blocking a-b sends a round by c.
    expect(runsToExit(w, (e) => e === 1).get("S")).toBe(4);
  });
});

describe("par (K137)", () => {
  it("P = F + round(slack x F), a half rounding up", () => {
    expect(parFor(3, 0)).toBe(3);
    expect(parFor(3, 0.25)).toBe(4); // 0.75 -> 1
    expect(parFor(10, 0.25)).toBe(13); // 2.5 -> 3
    expect(parFor(10, 0.15)).toBe(12); // 1.5 -> 2 (no float noise)
    expect(parFor(7, 0.1)).toBe(8); // 0.7 -> 1
    expect(parFor(5, 1)).toBe(10);
    expect(parFor(Infinity, 0.5)).toBe(Infinity);
    expect(strokesLeft(5, 7)).toBe(-2);
  });

  it("scores the finish golf style", () => {
    expect(parScore(6, 4)).toBe("+2");
    expect(parScore(4, 4)).toBe("E");
    expect(parScore(3, 4)).toBe("−1");
  });

  it("strict: lost exactly when no finish fits", () => {
    expect(strictLost(2, 4, 2)).toBe(false); // 2 left, 2 to go
    expect(strictLost(3, 4, 2)).toBe(true);
    expect(strictLost(0, 4, 9)).toBe(false); // at the exit
    expect(strictLost(Infinity, 99, 0)).toBe(true);
  });

  it("the controller fixes P at the start, from F and the slack", () => {
    const w = graph(RUNS, "S", "X");
    const c0 = new FabricMazeController(w, false, null, { parMode: "strict", parSlack: 0 });
    expect(c0.fewestRuns).toBe(3);
    expect(c0.par).toBe(3);
    const c25 = new FabricMazeController(w, false, null, { parMode: "strict", parSlack: 0.25 });
    expect(c25.par).toBe(4);
    expect(c25.strokesLeft).toBe(4);
    // A slack change takes at the next reset.
    c25.parSlack = 1;
    expect(c25.par).toBe(4);
    c25.reset();
    expect(c25.par).toBe(6);
  });

  it("strict: a finish at exactly P wins", () => {
    const w = graph(RUNS, "S", "X");
    const c = new FabricMazeController(w, false, null, { parMode: "strict", parSlack: 0.25 });
    // S -> a -> c -> b -> X: 4 strokes against P = 4.
    for (const eid of [0, 3, 4]) {
      expect(c.tapEdge(eid)).toBe("advance");
      expect(c.parLost).toBe(false);
    }
    expect(c.tapEdge(2)).toBe("win");
    expect(c.parLost).toBe(false);
    expect(parScore(c.strokes, c.par)).toBe("E");
  });

  it("strict: lost a stroke early, the moment the finish stops fitting", () => {
    const w = graph(RUNS, "S", "X");
    const c = new FabricMazeController(w, false, null, { parMode: "strict", parSlack: 0.25 });
    c.tapEdge(0); // a: 2 to go, 3 left
    c.tapEdge(3); // c: 2 to go, 2 left
    expect(c.parLost).toBe(false);
    expect(c.tapEdge(5)).toBe("advance"); // D: 3 to go, 1 left
    expect(c.parLost).toBe(true);
    expect(c.strokes).toBe(3); // short of P = 4
    expect(c.choices()).toEqual([]);
    expect(c.tapEdge(5)).toBe("noop");
    c.reset();
    expect(c.parLost).toBe(false);
    expect(c.choices()).toEqual([0]);
  });

  it("strict: reaching P short of the exit loses", () => {
    const w = graph(RUNS, "S", "X");
    const c = new FabricMazeController(w, false, null, { parMode: "strict", parSlack: 1 });
    expect(c.par).toBe(6);
    // S a c b (3), back to c (4): 2 to go, 2 left; back to a (5): 2 to go,
    // 1 left -> lost at 5. Instead: c -> b (5): 1 to go, 1 left; b -> c (6).
    for (const eid of [0, 3, 4, 4, 4]) c.tapEdge(eid);
    expect(c.strokes).toBe(5);
    expect(c.head).toBe("b");
    expect(c.parLost).toBe(false);
    c.tapEdge(4); // b -> c at stroke 6 = P, 2 runs from the exit
    expect(c.strokes).toBe(6);
    expect(c.parLost).toBe(true);
  });

  it("strict with fragile runs: a break in the way loses", () => {
    const w = graph(RUNS, "S", "X");
    const rules = { parMode: "strict" as const, parSlack: 0.75 }; // P = 5
    const plain = new FabricMazeController(w, false, null, rules);
    const crack = new FabricMazeController(w, false, null, { ...rules, fragile: "crack" });
    for (const c of [plain, crack]) {
      expect(c.par).toBe(5);
      c.tapEdge(0); // a
      c.tapEdge(1); // b
      c.tapEdge(1); // back to a: the crack breaks run 1
    }
    // Unbroken, a -> b -> X fits in 2; broken, a -> c -> b -> X needs 3.
    expect(plain.runsLeft).toBe(2);
    expect(plain.parLost).toBe(false);
    expect(crack.runsLeft).toBe(3);
    expect(crack.parLost).toBe(true);
  });

  it("strokes: never lost, the finish reads against par", () => {
    const w = graph(RUNS, "S", "X");
    const c = new FabricMazeController(w, false, null, { parMode: "strokes", parSlack: 0 });
    for (let i = 0; i < 10; i++) c.tapEdge(0);
    expect(c.parLost).toBe(false);
    expect(c.strokesLeft).toBe(-7);
    c.tapEdge(0);
    c.tapEdge(1);
    expect(c.tapEdge(2)).toBe("win");
    expect(c.parLost).toBe(false);
    expect(parScore(c.strokes, c.par)).toBe("+10");
  });

  it("off: never lost", () => {
    const w = graph(RUNS, "S", "X");
    const c = new FabricMazeController(w, false, null);
    for (let i = 0; i < 10; i++) c.tapEdge(0);
    expect(c.parLost).toBe(false);
  });
});
