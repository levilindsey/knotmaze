import { describe, it, expect } from "vitest";
import {
  acceptsTrap,
  bandStats,
  compareHeadingValues,
  farEndScore,
  finalPathOf,
  greedyWalk,
  greedyWalkRanked,
  headingComparator,
  K46_BANDS,
  passesBand,
  searchGreedyTraps,
  trapCandidates,
  DEFAULT_TRAP_SEARCH,
} from "../../src/core/greedy_trap";
import { headingVectors } from "../../src/core/greedy_search";
import type { TangleGraph } from "../../src/core/types";
import type { WalkGraph } from "../../src/core/walk_graph";
import { buildSceneGraph } from "../../src/core/scene_graph";
import { dailyParams } from "../../src/ui/daily_link";
import { walkFingerprint } from "../../src/game/daily_attempt";
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

describe("acceptsTrap floor (call 3)", () => {
  it("refuses to spend a walker below its target or its surplus cap", () => {
    const o = DEFAULT_TRAP_SEARCH;
    // Far-end banked at 3 (over its 2.5 target): dropping it to 2.4 to
    // lift heading raises min() but spends banked difficulty.
    const banked: TrapEval = { optimal: 100, gF: 3, gH: 2 };
    expect(acceptsTrap({ optimal: 100, gF: 2.4, gH: 3.6 }, banked, 100, o)).toBe(false);
    expect(acceptsTrap({ optimal: 100, gF: 2.6, gH: 3.6 }, banked, 100, o)).toBe(true);
    // Far-end at 4 (past the 1.25x cap of 3.125): surplus may be spent
    // down to the cap, never past it.
    const rich: TrapEval = { optimal: 100, gF: 4, gH: 2 };
    expect(acceptsTrap({ optimal: 100, gF: 3.2, gH: 3.6 }, rich, 100, o)).toBe(true);
    expect(acceptsTrap({ optimal: 100, gF: 3, gH: 3.6 }, rich, 100, o)).toBe(false);
  });
});

describe("exact heading ranking (call 4)", () => {
  it("compareHeadingValues ranks by dot over length, ties by edge id", () => {
    // 3/5 = 0.6 (id 0) loses to 2/2 = 1 (id 1) despite the larger dot.
    expect(compareHeadingValues(3, 25, 0, 2, 4, 1)).toBeGreaterThan(0);
    // A positive dot beats zero beats a negative one.
    expect(compareHeadingValues(1, 4, 5, 0, 4, 0)).toBeLessThan(0);
    expect(compareHeadingValues(0, 4, 5, -1, 4, 0)).toBeLessThan(0);
    // Two negatives: -3/5 beats -1/1 (the smaller magnitude wins).
    expect(compareHeadingValues(-3, 25, 0, -1, 1, 1)).toBeLessThan(0);
    // An exact tie goes to the lower edge id.
    expect(compareHeadingValues(2, 4, 3, 2, 4, 1)).toBeGreaterThan(0);
    expect(compareHeadingValues(2, 4, 1, 2, 4, 3)).toBeLessThan(0);
  });

  it("greedyWalkRanked with far-end heading vectors walks the toy maze", () => {
    const { graph, pos } = toy();
    const w = greedyWalkRanked(
      graph,
      "S",
      "X",
      headingComparator(pos, pos.get("X")!, (v, eid) => {
        const o = graph.edges[eid].va === v ? graph.edges[eid].vb : graph.edges[eid].va;
        const q = pos.get(o)!;
        const p = pos.get(v)!;
        return [q[0] - p[0], q[1] - p[1]];
      })
    );
    expect(w.finalPath).toEqual(["S", "A", "B", "X"]);
    expect(w.walked).toBe(7);
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

// The float prototype's heading score (probe lib scoreHeading, look 3):
// the normalized direction to the point 3 u along a run, dotted with the
// normalized goal direction. The exact ranker must walk the same maze
// the same way except on the pinned near-tie days below (the full 1-240
// list is measured in .claude/probes/K74/stage4/build_measure.ts and
// named in generation-plan.md).
function floatHeadingWalk(g: TangleGraph, wg: WalkGraph) {
  const pos = new Map<string, [number, number]>();
  for (const id of wg.vertices.keys()) pos.set(id, g.nodes.get(id)!.latticePos as [number, number]);
  const goal = pos.get(wg.exit)!;
  const poly = (e: (typeof wg.edges)[number]): Array<[number, number]> => {
    const strand = g.strands[e.chain];
    const nc = strand.isClosed ? strand.nodes.length - 1 : strand.nodes.length;
    const ne = strand.edgeIds.length;
    const pts: Array<[number, number]> = [];
    for (let k = e.ctrlA / 2; k < e.ctrlB / 2; k++) {
      const n0 = strand.nodes[k % nc];
      let lp = g.edges.get(strand.edgeIds[k % ne])!.latticePoints;
      const p0 = g.nodes.get(n0)!.latticePos;
      if (Math.hypot(lp[0][0] - p0[0], lp[0][1] - p0[1]) > 1e-6) lp = [...lp].reverse();
      for (let i = pts.length ? 1 : 0; i < lp.length; i++) pts.push([lp[i][0], lp[i][1]]);
    }
    return pts;
  };
  const score = (v: string, eid: number): number => {
    const e = wg.edges[eid];
    const ab = poly(e);
    const pts = v === e.va ? ab : [...ab].reverse();
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    let acc = 0;
    let q = pts[pts.length - 1];
    const look = Math.min(3, len * 0.999);
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (acc + l >= look && l > 0) {
        const t = (look - acc) / l;
        q = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
        break;
      }
      acc += l;
    }
    const p = pts[0];
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const hl = Math.sqrt(dx * dx + dy * dy) || 1;
    const gx = goal[0] - p[0];
    const gy = goal[1] - p[1];
    const gl = Math.sqrt(gx * gx + gy * gy) || 1;
    return -((dx / hl) * gx + (dy / hl) * gy) / gl;
  };
  return greedyWalk(wg, wg.start, wg.exit, score);
}

describe("exact heading vs the float prototype (parity, dailies 1-8)", () => {
  it("walks differ only on the pinned near-tie days", () => {
    const differ: number[] = [];
    for (let day = 1; day <= 8; day++) {
      const p = dailyParams(day);
      const { graph } = buildSceneGraph({ ...p, greedyTrap: "off", title: "", glyphs2: "" });
      const wg = buildWalkGraph(graph)!;
      const pos = new Map<string, [number, number]>();
      for (const id of wg.vertices.keys()) pos.set(id, graph.nodes.get(id)!.latticePos as [number, number]);
      const headings = headingVectors(graph, wg);
      const exact = greedyWalkRanked(wg, wg.start, wg.exit, headingComparator(pos, pos.get(wg.exit)!, (v, eid) => headings.get(`${v}|${eid}`) ?? [0, 0]));
      const floated = floatHeadingWalk(graph, wg);
      if (exact.walked !== floated.walked || exact.finalPath.join() !== floated.finalPath.join()) differ.push(day);
    }
    expect(differ).toEqual([1, 4]);
  });
});

describe("the search seam in generation (scene_graph, H1-in-loop)", () => {
  it("with greedyTrap off the scene walk is the pinned shipped maze", () => {
    const p = dailyParams(1);
    const { graph } = buildSceneGraph({ ...p, greedyTrap: "off", title: "", glyphs2: "" });
    expect(walkFingerprint(buildWalkGraph(graph)!)).toBe("w1.189.283.ba405cd2");
  });

  it("with greedyTrap on, daily 3 is cut, solvable and within the growth cap", () => {
    const p = dailyParams(3);
    const off = buildWalkGraph(buildSceneGraph({ ...p, greedyTrap: "off", title: "", glyphs2: "" }).graph)!;
    const on = buildWalkGraph(buildSceneGraph({ ...p, greedyTrap: "on", title: "", glyphs2: "" }).graph)!;
    const junctions = (wg: typeof off) => [...wg.vertices.values()].filter((v) => !v.isEnd).length;
    expect(Number.isFinite(on.optimalLength)).toBe(true);
    expect(junctions(on)).toBeLessThan(junctions(off));
    expect(on.optimalLength).toBeLessThanOrEqual(1.15 * off.optimalLength + 1e-9);
  });
});
