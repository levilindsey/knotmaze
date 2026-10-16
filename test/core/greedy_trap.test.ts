import { describe, it, expect } from "vitest";
import {
  acceptsTrap,
  bandStats,
  farEndScore,
  finalPathOf,
  greedyWalk,
  K46_BANDS,
  passesBand,
  searchGreedyTraps,
  trapCandidates,
  DEFAULT_TRAP_SEARCH,
} from "../../src/core/greedy_trap";
import type {
  TrapEdgeLike,
  TrapEval,
  TrapGraphLike,
  TrapSearchOps,
} from "../../src/core/greedy_trap";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import type { MazeParams } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph } from "../../src/core/walk_graph";
import { PARAM_DEFAULTS } from "../../src/ui/url_state";

// Synthetic graph: S - A - B - X(exit), with a dead-end D off A that sits
// nearer the exit than B does, so the far-end walker tries it first.
function toy(): {
  graph: TrapGraphLike;
  pos: Map<string, [number, number]>;
} {
  const edges: TrapEdgeLike[] = [
    { va: "S", vb: "A", length: 1 },
    { va: "A", vb: "D", length: 1 },
    { va: "A", vb: "B", length: 2 },
    { va: "B", vb: "X", length: 2 },
  ];
  const vertices = new Map([
    ["S", { edges: [0] }],
    ["A", { edges: [0, 1, 2] }],
    ["D", { edges: [1] }],
    ["B", { edges: [2, 3] }],
    ["X", { edges: [3] }],
  ]);
  const pos = new Map<string, [number, number]>([
    ["S", [0, 10]],
    ["A", [0, 5]],
    ["D", [0, 1]],
    ["B", [10, 10]],
    ["X", [0, 0]],
  ]);
  return { graph: { vertices, edges }, pos };
}

describe("greedyWalk (far-end)", () => {
  it("tries the nearer dead end, backtracks, then reaches the exit", () => {
    const { graph, pos } = toy();
    const w = greedyWalk(graph, "S", "X", farEndScore(graph, pos, pos.get("X")!));
    expect(w.finalPath).toEqual(["S", "A", "B", "X"]);
    expect(w.walked).toBe(7); // 1 + 1 + 1 (back) + 2 + 2
    expect(w.final).toBe(5);
    expect(w.backtracks).toBe(1);
    expect(w.advances).toBe(4);
  });

  it("breaks a score tie by the lowest edge id", () => {
    // D and E end equally far from X (dist2 25 each, vs B's 200); the
    // lower edge id must be tried first.
    const { pos } = toy();
    const tied = new Map(pos);
    const edges: TrapEdgeLike[] = [
      { va: "S", vb: "A", length: 1 },
      { va: "A", vb: "D", length: 1 },
      { va: "A", vb: "E", length: 1 },
      { va: "A", vb: "B", length: 2 },
      { va: "B", vb: "X", length: 2 },
    ];
    const vertices = new Map([
      ["S", { edges: [0] }],
      ["A", { edges: [0, 1, 2, 3] }],
      ["D", { edges: [1] }],
      ["E", { edges: [2] }],
      ["B", { edges: [3, 4] }],
      ["X", { edges: [4] }],
    ]);
    tied.set("D", [3, 4]);
    tied.set("E", [-3, 4]);
    const w = greedyWalk(
      { vertices, edges },
      "S",
      "X",
      farEndScore({ vertices, edges }, tied, [0, 0])
    );
    expect(w.taken[1]).toBe(1); // D's run, the lower id, first.
    expect(w.walked).toBe(9); // both dead ends visited and backed out of.
  });

  it("finalPathOf replays a backtracking advance log", () => {
    const { graph } = toy();
    // Advances: S->A (0), A->D (1), then (after popping D) A->B (2 from A).
    expect(finalPathOf(graph, "S", [0, 1, 2], ["S", "A", "A"])).toEqual([
      "S",
      "A",
      "B",
    ]);
  });
});

describe("trapCandidates", () => {
  it("keeps junctions within the radius, nearest first, once each", () => {
    const pos = new Map<string, [number, number]>([
      ["S", [0, 30]],
      ["near", [3, 4]], // dist2 25
      ["mid", [0, 10]], // dist2 100
      ["far", [0, 25]], // outside radius 20
      ["end", [0, 1]], // near but not a junction
    ]);
    const cands = trapCandidates(
      [
        ["S", "mid", "near"],
        ["S", "far", "near", "end"],
      ],
      pos,
      [0, 0],
      20,
      (id) => id !== "end" && id !== "S"
    );
    expect(cands.map((c) => c.id)).toEqual(["near", "mid"]);
    expect(cands[0].dist2).toBe(25);
  });
});

describe("acceptsTrap", () => {
  const cur: TrapEval = { optimal: 100, gF: 2, gH: 3 };
  it("accepts an improving trial within grow and caps", () => {
    expect(
      acceptsTrap({ optimal: 110, gF: 2.6, gH: 3.2 }, cur, 100, DEFAULT_TRAP_SEARCH)
    ).toBe(true);
  });
  it("refuses no objective gain, route growth, a cap breach and null", () => {
    const o = DEFAULT_TRAP_SEARCH;
    // Heading improves but far-end falls: min() objective drops.
    expect(acceptsTrap({ optimal: 100, gF: 1.9, gH: 4 }, cur, 100, o)).toBe(false);
    expect(acceptsTrap({ optimal: 116, gF: 3, gH: 4 }, cur, 100, o)).toBe(false);
    expect(acceptsTrap({ optimal: 100, gF: 6.5, gH: 4 }, cur, 100, o)).toBe(false);
    expect(acceptsTrap({ optimal: 100, gF: 3, gH: 8.5 }, cur, 100, o)).toBe(false);
    expect(acceptsTrap(null, cur, 100, o)).toBe(false);
  });
});

describe("searchGreedyTraps", () => {
  // State = the set of removed ids, joined. The table is the whole world:
  // removing "near" helps, "junk" never does, "far" finishes the job, and
  // "span" (a spanning site) is never offered.
  function fakeOps(): TrapSearchOps<string> & { removedCalls: string[] } {
    const table = new Map<string, TrapEval>([
      ["", { optimal: 100, gF: 1.2, gH: 2 }],
      ["near", { optimal: 105, gF: 2, gH: 3 }],
      ["near,far", { optimal: 108, gF: 2.6, gH: 3.6 }],
      ["junk", { optimal: 100, gF: 1.2, gH: 2.1 }],
    ]);
    const removedCalls: string[] = [];
    return {
      removedCalls,
      evaluate: (s) => table.get(s) ?? { optimal: 100, gF: 1.3, gH: 2.1 },
      candidates: (s) =>
        s === "" ? ["near", "junk"] : s === "near" ? ["far"] : [],
      remove: (s, id) => {
        removedCalls.push(id);
        return s === "" ? id : `${s},${id}`;
      },
    };
  }

  it("deletes offered junctions until both targets are met", () => {
    const ops = fakeOps();
    const r = searchGreedyTraps("", ops);
    expect(r.stop).toBe("targets");
    expect(r.removed).toEqual(["near", "far"]);
    expect(r.last).toEqual({ optimal: 108, gF: 2.6, gH: 3.6 });
    expect(ops.removedCalls).not.toContain("span");
  });

  it("stops with no-improvement when no trial passes acceptance", () => {
    const ops = fakeOps();
    ops.candidates = () => ["junk"];
    const r = searchGreedyTraps("", ops);
    expect(r.stop).toBe("no-improvement");
    expect(r.removed).toEqual([]);
  });

  it("spends at most `iters` deletions and reports an invalid start", () => {
    const ops = fakeOps();
    const r = searchGreedyTraps("", ops, { ...DEFAULT_TRAP_SEARCH, iters: 1 });
    expect(r.stop).toBe("iters");
    expect(r.removed).toEqual(["near"]);
    const bad = searchGreedyTraps("nope", {
      evaluate: () => null,
      candidates: () => [],
      remove: (s: string) => s,
    });
    expect(bad.stop).toBe("invalid");
  });
});

describe("K46 bands", () => {
  it("passesBand and bandStats price a reroll in candidates per day", () => {
    const evals: TrapEval[] = [
      { optimal: 90, gF: 1.2, gH: 2.2 }, // draft only
      { optimal: 90, gF: 1.6, gH: 2.2 }, // proposed
      { optimal: 90, gF: 2, gH: 3 }, // strong
      { optimal: 90, gF: 3, gH: 4 }, // search targets
    ];
    expect(passesBand(evals[0], K46_BANDS[1])).toBe(false);
    expect(passesBand(evals[3], K46_BANDS[3])).toBe(true);
    const stats = bandStats(evals);
    expect(stats.map((s) => s.pass)).toEqual([4, 3, 2, 1]);
    expect(stats[1].share).toBeCloseTo(0.75);
    expect(stats[1].candidatesPerDay).toBeCloseTo(4 / 3);
    expect(stats[3].candidatesPerDay).toBe(4);
  });
});

describe("on a real maze (today's defaults)", () => {
  function build(seed: number) {
    const mk = () =>
      generateLatticeKnotwork({
        gridSize: 18,
        weaveDensity: 0.35,
        turnBias: 0.7,
        randSeed: seed,
        shape: "rect",
      });
    const params: MazeParams = {
      ...DEFAULT_MAZE_PARAMS,
      branchDensity: PARAM_DEFAULTS.branchDensity,
      deadEndDensity: 0.5,
    };
    const g = mk();
    const plan = buildMazePlan(mk(), params);
    applyMazeCuts(g, plan, applyMazePlan(g, plan));
    return { g, wg: buildWalkGraph(g)! };
  }

  it("the far-end walker reaches the exit and yields in-radius candidates", () => {
    for (const seed of [101, 202]) {
      const { g, wg } = build(seed);
      const pos = new Map<string, [number, number]>();
      for (const id of wg.vertices.keys()) {
        const p = g.nodes.get(id)!.latticePos;
        pos.set(id, [p[0], p[1]]);
      }
      const exitPos = pos.get(wg.exit)!;
      const w = greedyWalk(wg, wg.start, wg.exit, farEndScore(wg, pos, exitPos));
      expect(w.finalPath[0]).toBe(wg.start);
      expect(w.finalPath[w.finalPath.length - 1]).toBe(wg.exit);
      expect(w.walked).toBeGreaterThanOrEqual(wg.optimalLength);
      expect(w.final).toBeGreaterThanOrEqual(wg.optimalLength - 1e-9);
      const cands = trapCandidates(
        [w.finalPath],
        pos,
        exitPos,
        20,
        (id) => !wg.vertices.get(id)!.isEnd && id !== wg.start && id !== wg.exit
      );
      for (const c of cands) expect(c.dist2).toBeLessThanOrEqual(400);
    }
  });
});
