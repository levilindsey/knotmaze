import { describe, it, expect } from "vitest";
import { walkDistances } from "../../src/core/walk_graph";
import type { WalkGraph, WalkVertex, WalkEdge } from "../../src/core/walk_graph";
import {
  collapseLimits,
  collapsePar,
  collapsedUnits,
  freeStranded,
  parText,
  sharePercent,
  totalUnits,
  UNITS_PER_LENGTH,
} from "../../src/game/collapse";
import { FabricMazeController } from "../../src/game/fabric_controller";
import { SeededRNG } from "../../src/util/random";

// K139: collapse mode (game/collapse.ts): limits, the free end, the score
// and the par search against a brute force.

// A hand-built walk graph: runs [va, vb, length]; ends are degree-1.
// `order` reorders the vertex map's insertion (the search must not care).
function graph(
  runs: Array<[string, string, number]>,
  start: string,
  exit: string,
  extra: Partial<WalkGraph> = {},
  order?: string[]
): WalkGraph {
  const vertices = new Map<string, WalkVertex>();
  const edges: WalkEdge[] = [];
  for (const id of order ?? []) vertices.set(id, { id, isEnd: false, chain: 0, ctrl: 0, edges: [] });
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
  return { vertices, edges, start, exit, optimalLength: distToExit.get(start)!, distToExit, ...extra };
}

// S-a (tail), a-b, b-X (tail), a-c, c-b, c-D (a dead-end stub).
const RUNS: Array<[string, string, number]> = [
  ["S", "a", 2], // 0
  ["a", "b", 3], // 1
  ["b", "X", 2], // 2
  ["a", "c", 2], // 3
  ["c", "b", 2], // 4
  ["c", "D", 1], // 5
];
const U = UNITS_PER_LENGTH;

// Every trail from the maze start by exhaustion: the longest to the exit
// (finish; arriving there ends it) and the longest anywhere (free).
function bruteForce(walk: WalkGraph): { finish: number; free: number } {
  const used = new Uint8Array(walk.edges.length);
  const units = (eid: number) => (walk.titleEdges?.has(eid) ? 0 : Math.round(walk.edges[eid].length * U));
  let finish = -1;
  let free = 0;
  const go = (v: string, cur: number) => {
    if (cur > free) free = cur;
    for (const eid of walk.vertices.get(v)!.edges) {
      if (used[eid] || walk.titleEdges?.has(eid)) continue;
      const e = walk.edges[eid];
      const o = e.va === v ? e.vb : e.va;
      used[eid] = 1;
      if (o === walk.exit) {
        finish = Math.max(finish, cur + units(eid));
        free = Math.max(free, cur + units(eid)); // the exit tail is a dead end
      } else go(o, cur + units(eid));
      used[eid] = 0;
    }
  };
  go(walk.mazeStart ?? walk.start, 0);
  return { finish, free };
}

// A random connected multigraph with a start tail, an exit tail, loops,
// parallel runs and stubs, lengths 1..9 in tenths.
function randomWalk(seed: number, n: number, extraRuns: number): WalkGraph {
  const rng = new SeededRNG(seed);
  const pick = (k: number) => Math.min(k - 1, Math.floor(rng.next() * k));
  const len = () => (1 + pick(90)) / 10;
  const runs: Array<[string, string, number]> = [["S", "j0", len()]];
  for (let i = 1; i < n; i++) runs.push([`j${pick(i)}`, `j${i}`, len()]);
  for (let i = 0; i < extraRuns; i++) runs.push([`j${pick(n)}`, `j${pick(n)}`, len()]);
  runs.push([`j${pick(n)}`, "X", len()]);
  if (rng.next() < 0.5) runs.push([`j${pick(n)}`, "D", len()]);
  return graph(runs, "S", "X");
}

describe("collapse limits and score", () => {
  it("every maze run collapses after one crossing, END runs too; title runs never", () => {
    const g = graph(RUNS, "S", "X");
    expect(Array.from(collapseLimits(g))).toEqual([1, 1, 1, 1, 1, 1]);
    const titled = graph([["S", "t", 1], ["t", "M", 1], ...RUNS.map(([a, b, l]) => [a === "S" ? "M" : a, b, l] as [string, string, number])], "S", "X", {
      mazeStart: "M",
      titleEdges: new Set([0, 1]),
      titleVertices: new Set(["S", "t"]),
    });
    expect(Array.from(collapseLimits(titled)).slice(0, 3)).toEqual([Infinity, Infinity, 1]);
    expect(totalUnits(titled)).toBe(totalUnits(g));
  });

  it("the score counts each crossed maze run once, in exact units", () => {
    const g = graph(RUNS, "S", "X");
    expect(totalUnits(g)).toBe(12 * U);
    expect(collapsedUnits(g, [1, 0, 0, 1, 1, 0])).toBe(6 * U);
    expect(collapsedUnits(g, [2, 0, 0, 1, 1, 0])).toBe(6 * U);
    expect(sharePercent(6 * U, 12 * U)).toBe(50);
    expect(sharePercent(8 * U, 12 * U)).toBe(66); // rounded down
    expect(sharePercent(0, 12 * U)).toBe(0);
    expect(sharePercent(-1, 12 * U)).toBe(0);
    expect(sharePercent(5, 0)).toBe(0);
  });

  it("free mode strands when no unbroken maze run is reachable", () => {
    const g = graph(RUNS, "S", "X");
    const brokenSet = (ids: number[]) => (eid: number) => ids.includes(eid);
    expect(freeStranded(g, "a", brokenSet([0]))).toBe(false);
    expect(freeStranded(g, "D", brokenSet([0, 3, 5]))).toBe(true);
    expect(freeStranded(g, "X", brokenSet([0, 1, 2]))).toBe(true); // the exit is a dead end
    expect(freeStranded(g, "a", brokenSet([0, 1, 3]))).toBe(true);
    // A title run is walked through: from the title, the maze beyond counts.
    const titled = graph([["S", "M", 1], ["M", "a", 2], ["a", "M", 2]], "S", "a", {
      mazeStart: "M",
      titleEdges: new Set([0]),
      titleVertices: new Set(["S"]),
    });
    expect(freeStranded(titled, "S", () => false)).toBe(false);
    expect(freeStranded(titled, "S", brokenSet([1, 2]))).toBe(true);
  });
});

describe("collapse par search", () => {
  it("finds the known longest trails of the hand-built maze", () => {
    const g = graph(RUNS, "S", "X");
    const fin = collapsePar(g, "finish");
    expect(fin.units).toBe(8 * U); // S-a-c-b-X
    expect(fin.trail).toEqual([0, 3, 4, 2]);
    expect(fin.tripped).toBe(false);
    const free = collapsePar(g, "free");
    expect(free.units).toBe(9 * U); // S-a-b-c-a or S-a-c-b-a
    expect(free.tripped).toBe(false);
    expect(parText(fin)).toBe("66%");
    expect(parText(free)).toBe("75%");
  });

  it("starts at the seam on a titled maze and scores no title run", () => {
    const runs: Array<[string, string, number]> = [
      ["S", "t", 5], // 0 title
      ["t", "M", 5], // 1 title
      ["M", "a", 2], // 2
      ["a", "b", 3], // 3
      ["b", "X", 2], // 4
      ["a", "c", 2], // 5
      ["c", "b", 2], // 6
    ];
    const g = graph(runs, "S", "X", { mazeStart: "M", titleEdges: new Set([0, 1]), titleVertices: new Set(["S", "t"]) });
    const fin = collapsePar(g, "finish");
    expect(fin.units).toBe(8 * U);
    expect(fin.trail).toEqual([2, 5, 6, 4]);
    expect(fin.total).toBe(11 * U);
  });

  it("agrees with a brute force on 120 random small mazes", () => {
    for (let seed = 1; seed <= 120; seed++) {
      const g = randomWalk(seed, 4 + (seed % 5), 3 + (seed % 6));
      const want = bruteForce(g);
      const fin = collapsePar(g, "finish", 1e9);
      const free = collapsePar(g, "free", 1e9);
      expect(fin.tripped).toBe(false);
      expect(free.tripped).toBe(false);
      expect(fin.units, `finish, seed ${seed}`).toBe(want.finish);
      expect(free.units, `free, seed ${seed}`).toBe(want.free);
      // The trail it reports is a real trail worth its units.
      for (const par of [fin, free]) {
        let v = g.mazeStart ?? g.start;
        let sum = 0;
        expect(new Set(par.trail).size).toBe(par.trail.length);
        for (const eid of par.trail) {
          const e = g.edges[eid];
          expect([e.va, e.vb]).toContain(v);
          v = e.va === v ? e.vb : e.va;
          sum += Math.round(e.length * U);
        }
        expect(sum).toBe(par.units);
      }
    }
  });

  it("stops at the step budget, keeps the best trail found and says so", () => {
    const g = randomWalk(7, 9, 9);
    const full = collapsePar(g, "free", 1e9);
    expect(full.steps).toBeGreaterThan(5);
    const capped = collapsePar(g, "free", 5);
    expect(capped.tripped).toBe(true);
    expect(capped.steps).toBe(5);
    expect(capped.units).toBeLessThanOrEqual(full.units);
    expect(capped.units).toBeGreaterThan(0);
    expect(parText(capped).startsWith("≥")).toBe(true);
    // A budget of exactly what the search needs does not trip.
    expect(collapsePar(g, "free", full.steps).tripped).toBe(false);
  });

  it("is deterministic: same result and steps, whatever the vertex order", () => {
    for (const seed of [3, 11, 29]) {
      const g = randomWalk(seed, 8, 8);
      const order = [...g.vertices.keys()].reverse();
      const runs = g.edges.map((e) => [e.va, e.vb, e.length] as [string, string, number]);
      const h = graph(runs, g.start, g.exit, {}, order);
      for (const mode of ["finish", "free"] as const) {
        for (const budget of [1e9, 40]) {
          const a = collapsePar(g, mode, budget);
          const b = collapsePar(h, mode, budget);
          expect(b).toEqual(a);
          expect(collapsePar(g, mode, budget)).toEqual(a);
        }
      }
    }
  });

  it("reads no trail to the exit as a dash", () => {
    const g = graph([["S", "a", 1], ["a", "D", 1], ["X", "b", 1], ["b", "X2", 1]], "S", "X");
    const fin = collapsePar(g, "finish");
    expect(fin.units).toBe(-1);
    expect(parText(fin)).toBe("—");
  });
});

describe("collapse in the controller", () => {
  const make = (collapse: "off" | "finish" | "free") =>
    new FabricMazeController(graph(RUNS, "S", "X"), false, null, { collapse });

  it("finish: every run collapses behind you, no backtrack, the exit wins", () => {
    const c = make("finish");
    expect(c.collapseOn).toBe(true);
    expect(c.tapEdge(0)).toBe("advance");
    expect(c.broken(0)).toBe(true);
    expect(c.justBroke).toBe(0);
    expect(c.collapsedUnits).toBe(2 * U);
    expect(c.tapEdge(0)).toBe("reject"); // the run behind you is gone
    expect(c.choices().sort()).toEqual([1, 3]);
    expect(c.tapEdge(3)).toBe("advance");
    expect(c.tapEdge(4)).toBe("advance");
    expect(c.tapEdge(2)).toBe("win");
    expect(c.solved).toBe(true);
    expect(c.collapsedUnits).toBe(8 * U);
    expect(c.collapseTotal).toBe(12 * U);
    expect(c.collapsePercent).toBe(66);
    expect(c.collapsePar!.units).toBe(8 * U);
  });

  it("finish: a stub strands you; Undo (a replay of the taps but the last) comes back", () => {
    const c = make("finish");
    for (const eid of [0, 3, 5]) c.tapEdge(eid);
    expect(c.head).toBe("D");
    expect(c.stranded).toBe(true);
    expect(c.tapEdge(4)).toBe("noop");
    expect(c.replay(c.taps.slice(0, -1))).toBe(true);
    expect(c.stranded).toBe(false);
    expect(c.head).toBe("c");
    expect(c.collapsedUnits).toBe(4 * U);
    // A catch's respawn at the start: its tail has collapsed.
    c.respawn();
    expect(c.stranded).toBe(true);
  });

  it("free: the exit is a dead end, not a win; the game ends stranded", () => {
    const c = make("free");
    expect(c.tapEdge(0)).toBe("advance");
    expect(c.tapEdge(1)).toBe("advance");
    expect(c.stranded).toBe(false);
    expect(c.tapEdge(2)).toBe("advance"); // onto the exit: no win
    expect(c.solved).toBe(false);
    expect(c.stranded).toBe(true);
    expect(c.collapsePercent).toBe(58); // 7 of 12
    const d = make("free");
    for (const eid of [0, 3, 4, 1]) expect(d.tapEdge(eid)).toBe("advance");
    expect(d.head).toBe("a");
    expect(d.stranded).toBe(true); // a's three runs are gone
    expect(d.collapsePercent).toBe(75); // par's 9 of 12
    expect(d.collapsePar!.units).toBe(9 * U);
  });

  it("collapse overrides fragile and par; off leaves the controller as it was", () => {
    const g = graph(RUNS, "S", "X");
    const c = new FabricMazeController(g, false, null, { collapse: "finish", fragile: "crack", parMode: "strict" });
    expect(c.fragile).toBe("off");
    expect(c.parMode).toBe("off");
    expect(Array.from(c.breakLimits)).toEqual(Array.from(collapseLimits(g)));
    const off = make("off");
    expect(off.collapseOn).toBe(false);
    expect(off.collapsePar).toBeNull();
    expect(off.fragileOn).toBe(false);
    expect(off.tapEdge(0)).toBe("advance");
    expect(off.tapEdge(0)).toBe("backtrack");
    expect(off.collapsedUnits).toBe(0);
  });
});
