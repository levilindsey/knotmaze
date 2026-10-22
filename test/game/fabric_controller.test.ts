import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph } from "../../src/core/walk_graph";
import type { WalkGraph } from "../../src/core/walk_graph";
import { FabricMazeController } from "../../src/game/fabric_controller";
import { buildSceneGraph } from "../../src/core/scene_graph";
import { tunnelPairs, withTunnels } from "../../src/game/tunnels";
import { dailyParams, dailyTitle } from "../../src/ui/daily_link";

// P4 Stage 8a: branch-point-only solve state over the walk graph.

function walkFor(seed: number, deadEndDensity = 0): WalkGraph {
  const g = generateLatticeKnotwork({
    gridSize: 8,
    weaveDensity: 0.3,
    turnBias: 0.6,
    randSeed: seed,
  });
  const plan = buildMazePlan(g, { ...DEFAULT_MAZE_PARAMS, deadEndDensity });
  const hueGroup = applyMazePlan(g, plan);
  applyMazeCuts(g, plan, hueGroup);
  return buildWalkGraph(g)!;
}

// Walk-edge ids of a fewest-runs route from `from` to `to` (BFS).
function routeTo(w: WalkGraph, from: string, to: string): number[] {
  const prev = new Map<string, [string, number]>();
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length > 0) {
    const v = queue.shift()!;
    if (v === to) break;
    for (const eid of w.vertices.get(v)!.edges) {
      const e = w.edges[eid];
      const u = e.va === v ? e.vb : e.va;
      if (seen.has(u)) continue;
      seen.add(u);
      prev.set(u, [v, eid]);
      queue.push(u);
    }
  }
  const out: number[] = [];
  for (let v = to; v !== from; ) {
    const [p, eid] = prev.get(v)!;
    out.unshift(eid);
    v = p;
  }
  return out;
}

// The next run on a shortest path: the choice minimizing run length plus
// the Dijkstra distance of its far vertex.
function bestChoice(c: FabricMazeController): number {
  let best = -1;
  let bestCost = Infinity;
  for (const eid of c.choices()) {
    const e = c.walk.edges[eid];
    const far = e.va === c.head ? e.vb : e.va;
    const cost = e.length + (c.walk.distToExit.get(far) ?? Infinity);
    if (cost < bestCost) {
      bestCost = cost;
      best = eid;
    }
  }
  return best;
}

describe("fabric maze controller (P4 Stage 8a)", () => {
  it("starts at the entrance tail with exactly one way in", () => {
    for (const seed of [5, 42, 99]) {
      const c = new FabricMazeController(walkFor(seed));
      expect(c.head).toBe(c.walk.start);
      expect(c.choices().length).toBe(1);
      expect(c.pathLength).toBe(0);
      expect(c.backtrackDist).toBe(0);
      expect(c.solved).toBe(false);
    }
  });

  it("rejects runs not incident to the current branch point", () => {
    const c = new FabricMazeController(walkFor(5));
    const far = c.walk.edges.find(
      (e) => e.va !== c.head && e.vb !== c.head
    )!;
    expect(c.tapEdge(far.id)).toBe("reject");
    expect(c.pathLength).toBe(0);
    expect(c.head).toBe(c.walk.start);
  });

  it("backtracks one run at a time, accumulating the price paid", () => {
    const c = new FabricMazeController(walkFor(5));
    const first = c.choices()[0];
    const len = c.walk.edges[first].length;
    expect(c.tapEdge(first)).toBe("advance");
    expect(c.pathLength).toBeCloseTo(len, 9);
    expect(c.backtrackDist).toBe(0);

    expect(c.tapEdge(first)).toBe("backtrack");
    expect(c.head).toBe(c.walk.start);
    expect(c.pathLength).toBe(0);
    expect(c.backtrackDist).toBeCloseTo(len, 9);

    // Re-advancing keeps the backtrack meter (it never decreases).
    expect(c.tapEdge(first)).toBe("advance");
    expect(c.backtrackDist).toBeCloseTo(len, 9);
    expect(c.pathLength).toBeCloseTo(len, 9);
  });

  it("names the run it arrived on (K479): none at the start, the path's last after", () => {
    const c = new FabricMazeController(walkFor(42));
    expect(c.arrivalEdge).toBe(-1);
    const taken: number[] = [];
    for (let step = 0; step < 4; step++) {
      const eid = bestChoice(c);
      expect(c.tapEdge(eid)).toMatch(/advance|win/);
      taken.push(eid);
      expect(c.arrivalEdge).toBe(eid);
      expect(c.arrivalEdge).toBe(c.pathEdges[c.pathEdges.length - 1]);
      if (c.solved) break;
    }
    // A backtrack hands the title to the run before, and back at the start
    // there is none.
    while (taken.length > 0 && !c.solved) {
      const last = taken.pop()!;
      expect(c.arrivalEdge).toBe(last);
      expect(c.tapEdge(last)).toBe("backtrack");
      expect(c.arrivalEdge).toBe(taken.length > 0 ? taken[taken.length - 1] : -1);
    }
    if (!c.solved) expect(c.arrivalEdge).toBe(-1);
  });

  it("names the last run walked in trail mode, where going back is an advance (K479)", () => {
    const c = new FabricMazeController(walkFor(5), true);
    const first = c.choices()[0];
    expect(c.tapEdge(first)).toBe("advance");
    expect(c.arrivalEdge).toBe(first);
    // The same run again walks it back; it is still the last run walked.
    expect(c.tapEdge(first)).toBe("advance");
    expect(c.arrivalEdge).toBe(first);
    expect(c.pathEdges).toEqual([first, first]);
  });

  it("solves exactly the optimal when following the Dijkstra field", () => {
    for (const seed of [5, 42, 1234, 99]) {
      const c = new FabricMazeController(walkFor(seed));
      let result = "";
      for (let step = 0; step < c.walk.edges.length + 5; step++) {
        const eid = bestChoice(c);
        expect(eid).toBeGreaterThanOrEqual(0);
        result = c.tapEdge(eid);
        if (result === "win") break;
        expect(result).toBe("advance");
      }
      expect(result).toBe("win");
      expect(c.solved).toBe(true);
      expect(c.head).toBe(c.walk.exit);
      expect(c.pathLength).toBeCloseTo(c.walk.optimalLength, 6);
      expect(c.backtrackDist).toBe(0);
      // After solving: no choices, taps are inert.
      expect(c.choices()).toEqual([]);
      expect(c.tapEdge(0)).toBe("noop");
    }
  });

  it("reset returns to the start and clears both meters", () => {
    const c = new FabricMazeController(walkFor(42));
    const first = c.choices()[0];
    c.tapEdge(first);
    c.tapEdge(first);
    c.tapEdge(first);
    expect(c.pathLength).toBeGreaterThan(0);
    expect(c.backtrackDist).toBeGreaterThan(0);
    c.reset();
    expect(c.head).toBe(c.walk.start);
    expect(c.pathLength).toBe(0);
    expect(c.backtrackDist).toBe(0);
    expect(c.solved).toBe(false);
    expect(c.pathVertices).toEqual([c.walk.start]);
    expect(c.pathEdges).toEqual([]);
    expect(c.visitedJunctions.size).toBe(0);
    expect(c.deadEndTips.size).toBe(0);
    expect(c.moveLog).toEqual([]);
  });
});

describe("fabric maze stats (K19)", () => {
  it("logs an optimal solve as all-green and counts its junctions once", () => {
    for (const seed of [5, 42, 1234]) {
      const c = new FabricMazeController(walkFor(seed));
      while (!c.solved) c.tapEdge(bestChoice(c));
      expect(c.moveLog.every((m) => m === "g")).toBe(true);
      expect(c.moveCount).toBe(c.pathEdges.length);
      // The junctions are exactly the non-END vertices on the route.
      const onRoute = new Set(
        c.pathVertices.filter((v) => !c.walk.vertices.get(v)!.isEnd)
      );
      expect([...c.visitedJunctions].sort()).toEqual([...onRoute].sort());
      expect(c.deadEndTips.size).toBe(0);
    }
  });

  it("marks detours yellow and backtracks red; revisits never recount", () => {
    const c = new FabricMazeController(walkFor(42));
    const cost = (eid: number): number => {
      const e = c.walk.edges[eid];
      const far = e.va === c.head ? e.vb : e.va;
      return e.length + (c.walk.distToExit.get(far) ?? Infinity);
    };
    c.tapEdge(bestChoice(c)); // the entrance run: always on route
    // Walk the shortest route to a junction with a choice OFF every
    // shortest route (strictly longer than the best).
    let detour = -1;
    for (let guard = 0; guard < 200 && !c.solved; guard++) {
      const best = bestChoice(c);
      const last = c.pathEdges[c.pathEdges.length - 1];
      detour =
        c.choices().find((e) => e !== last && cost(e) > cost(best) + 1e-6) ?? -1;
      if (detour >= 0) break;
      c.tapEdge(best);
    }
    expect(detour).toBeGreaterThanOrEqual(0);
    const before = c.visitedJunctions.size;
    const log = c.moveLog.length;
    expect(c.tapEdge(detour)).toBe("advance");
    expect(c.moveLog[log]).toBe("d");
    expect(c.tapEdge(detour)).toBe("backtrack");
    expect(c.moveLog[log + 1]).toBe("b");
    const afterDetour = c.visitedJunctions.size;
    expect(afterDetour).toBeGreaterThanOrEqual(before);
    // Going there again adds a move, but no junction.
    c.tapEdge(detour);
    expect(c.visitedJunctions.size).toBe(afterDetour);
    expect(c.moveLog.slice(-3)).toEqual(["d", "b", "d"]);
  });

  it("counts each dead-end tip reached, once", () => {
    let checked = 0;
    for (const seed of [5, 42, 99, 1234, 7, 8]) {
      const w = walkFor(seed, 1);
      const tips = [...w.vertices.values()].filter(
        (v) => v.isEnd && v.id !== w.start && v.id !== w.exit
      );
      const reachable = tips.find((t) => w.distToExit.has(t.id) && Number.isFinite(w.distToExit.get(t.id)!));
      if (!reachable) continue;
      checked++;
      const c = new FabricMazeController(w);
      for (const eid of routeTo(w, w.start, reachable.id)) {
        expect(c.tapEdge(eid)).toBe("advance");
      }
      expect(c.head).toBe(reachable.id);
      expect([...c.deadEndTips]).toEqual([reachable.id]);
      // Into a dead end and back out: the tip counts once.
      const back = c.pathEdges[c.pathEdges.length - 1];
      expect(c.tapEdge(back)).toBe("backtrack");
      expect(c.tapEdge(back)).toBe("advance");
      expect(c.deadEndTips.size).toBe(1);
      expect(c.visitedJunctions.has(reachable.id)).toBe(false);
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("logs no backtracks in trail mode (going back is an advance)", () => {
    const c = new FabricMazeController(walkFor(5), true);
    const first = c.choices()[0];
    c.tapEdge(first);
    const second = c.choices().find((e) => e !== first)!;
    c.tapEdge(second);
    expect(c.tapEdge(second)).toBe("advance"); // back over it
    expect(c.tapEdge(second)).toBe("advance"); // and out again
    expect(c.moveLog.length).toBe(4);
    expect(c.moveLog).not.toContain("b");
    // There and back again: one of the two crossings is off-route.
    expect(c.moveLog.slice(1, 3)).toContain("d");
  });
});

describe("saved attempts (K47): taps, replay, retreat", () => {
  // A walk with a detour backed out of and a detour kept, then the rest of
  // a shortest route: every kind of move.
  const play = (seed: number): FabricMazeController => {
    const c = new FabricMazeController(walkFor(seed));
    const cost = (eid: number): number => {
      const e = c.walk.edges[eid];
      const far = e.va === c.head ? e.vb : e.va;
      return e.length + (c.walk.distToExit.get(far) ?? Infinity);
    };
    let detours = 0;
    for (let guard = 0; guard < 300 && !c.solved; guard++) {
      const best = bestChoice(c);
      const last = c.pathEdges[c.pathEdges.length - 1];
      const alt = c.choices().find((e) => e !== last && cost(e) > cost(best) + 1e-6);
      if (alt !== undefined && detours < 2 && c.pathEdges.length > 1) {
        detours++;
        c.tapEdge(alt);
        if (detours === 1) c.tapEdge(alt); // back out of the first
        continue;
      }
      c.tapEdge(best);
    }
    return c;
  };

  it("records every accepted tap and nothing else", () => {
    const c = new FabricMazeController(walkFor(42));
    const far = c.walk.edges.find((e) => e.va !== c.head && e.vb !== c.head)!;
    c.tapEdge(far.id); // rejected
    const first = c.choices()[0];
    c.tapEdge(first);
    c.tapEdge(first);
    expect(c.taps).toEqual([first, first]);
    expect(c.taps.length).toBe(c.moveLog.length);
    c.reset();
    expect(c.taps).toEqual([]);
  });

  it("replays a tap list to exactly the same state", () => {
    for (const seed of [5, 42, 1234]) {
      const a = play(seed);
      expect(a.solved).toBe(true);
      expect(a.moveLog).toContain("b");
      const b = new FabricMazeController(a.walk);
      expect(b.replay(a.taps)).toBe(true);
      expect({
        path: b.pathEdges,
        verts: b.pathVertices,
        back: b.backtrackDist,
        log: b.moveLog,
        junctions: [...b.visitedJunctions].sort(),
        solved: b.solved,
        taps: b.taps,
      }).toEqual({
        path: a.pathEdges,
        verts: a.pathVertices,
        back: a.backtrackDist,
        log: a.moveLog,
        junctions: [...a.visitedJunctions].sort(),
        solved: a.solved,
        taps: a.taps,
      });
      // Part of the way is a valid attempt too.
      const half = a.taps.slice(0, Math.floor(a.taps.length / 2));
      expect(b.replay(half)).toBe(true);
      expect(b.taps).toEqual(half);
      expect(b.solved).toBe(false);
    }
  });

  it("refuses a tap list that is not a legal walk (left at the entrance)", () => {
    const a = play(42);
    const b = new FabricMazeController(a.walk);
    const far = a.walk.edges.find((e) => e.va !== a.walk.start && e.vb !== a.walk.start)!;
    for (const bad of [[far.id], [...a.taps, a.taps[0]], [a.taps[0], 99999], [a.taps[0], 1.5], [-1]]) {
      expect(b.replay(bad)).toBe(false);
      expect([b.head, b.taps, b.pathEdges]).toEqual([a.walk.start, [], []]);
    }
    // Another maze's taps.
    const other = play(5);
    expect(new FabricMazeController(walkFor(42)).replay(other.taps)).toBe(false);
  });

  it("retreats to the entrance as backtracks, logged and priced", () => {
    const c = new FabricMazeController(walkFor(1234));
    // Up to six runs along the best route, stopping short of the exit (a
    // solved maze does not retreat).
    for (let i = 0; i < 6; i++) {
      const eid = bestChoice(c);
      const e = c.walk.edges[eid];
      if ((e.va === c.head ? e.vb : e.va) === c.walk.exit) break;
      c.tapEdge(eid);
    }
    expect(c.pathEdges.length).toBeGreaterThan(1);
    const path = [...c.pathEdges];
    const length = c.pathLength;
    const back0 = c.backtrackDist;
    const log0 = c.moveLog.length;
    const runs = c.retreatToStart();
    expect(runs).toEqual([...path].reverse());
    expect(c.head).toBe(c.walk.start);
    expect(c.pathEdges).toEqual([]);
    expect(c.backtrackDist).toBeCloseTo(back0 + length, 9);
    expect(c.moveLog.slice(log0)).toEqual(path.map(() => "b"));
    // Exactly what tapping back would have been: a replay agrees.
    const d = new FabricMazeController(c.walk);
    expect(d.replay(c.taps)).toBe(true);
    expect(d.backtrackDist).toBeCloseTo(c.backtrackDist, 9);
    // At the entrance already: nothing to do.
    expect(c.retreatToStart()).toEqual([]);
  });

  it("meters every run walked (K155): path + 2 x backtrack, rebuilt by replay", () => {
    for (const seed of [5, 42, 1234]) {
      const a = play(seed);
      expect(a.backtrackDist).toBeGreaterThan(0);
      expect(a.walkedDist).toBeCloseTo(a.pathLength + 2 * a.backtrackDist, 9);
      const b = new FabricMazeController(a.walk);
      expect(b.replay(a.taps)).toBe(true);
      expect(b.walkedDist).toBe(a.walkedDist);
      b.reset();
      expect(b.walkedDist).toBe(0);
    }
    // Trail mode: every tap is an advance, so walked is the path.
    const t = new FabricMazeController(walkFor(5), true);
    const first = t.choices()[0];
    t.tapEdge(first);
    t.tapEdge(first);
    expect(t.walkedDist).toBeCloseTo(t.pathLength, 9);
    expect(t.walkedDist).toBeCloseTo(2 * t.walk.edges[first].length, 9);
  });

  it("does not retreat in trail mode or once solved", () => {
    const t = new FabricMazeController(walkFor(5), true);
    t.tapEdge(t.choices()[0]);
    expect(t.retreatToStart()).toEqual([]);
    expect(t.pathEdges.length).toBe(1);
    const s = play(5);
    expect(s.retreatToStart()).toEqual([]);
    expect(s.solved).toBe(true);
  });
});

describe("real-time respawn (K80)", () => {
  it("jumps back to the entrance, keeping the stats and the meters", () => {
    const c = new FabricMazeController(walkFor(1234));
    for (let i = 0; i < 4; i++) {
      const eid = bestChoice(c);
      const e = c.walk.edges[eid];
      if ((e.va === c.head ? e.vb : e.va) === c.walk.exit) break;
      c.tapEdge(eid);
    }
    expect(c.pathEdges.length).toBeGreaterThan(0);
    const taps = [...c.taps];
    const log = [...c.moveLog];
    const junctions = c.visitedJunctions.size;
    const back = c.backtrackDist;
    const walked = c.walkedDist;
    expect(walked).toBeGreaterThan(0);
    c.respawn();
    expect(c.head).toBe(c.walk.start);
    expect(c.pathEdges).toEqual([]);
    expect(c.pathLength).toBe(0);
    expect(c.taps).toEqual(taps);
    expect(c.moveLog).toEqual(log);
    expect(c.visitedJunctions.size).toBe(junctions);
    expect(c.backtrackDist).toBe(back);
    expect(c.walkedDist).toBe(walked);
    // The solve goes on from the entrance, and the re-walk adds on (K155).
    expect(c.choices()).toEqual(c.walk.vertices.get(c.walk.start)!.edges);
    const eid = bestChoice(c);
    expect(c.tapEdge(eid)).not.toBe("reject");
    expect(c.walkedDist).toBeCloseTo(walked + c.walk.edges[eid].length, 9);
  });

  // K80 turns stage 2: the move log's "x" (the share grid's ox).
  it("marks the move a minotaur caught you on", () => {
    const c = new FabricMazeController(walkFor(1234));
    c.markCaught(); // caught before any move: one "x"
    expect(c.moveLog).toEqual(["x"]);
    // K293 (c): an "x" is not a move (moveCount reads the taps).
    expect(c.moveCount).toBe(0);
    c.tapEdge(bestChoice(c));
    c.tapEdge(bestChoice(c));
    expect(c.moveLog).toEqual(["x", "g", "g"]);
    expect(c.moveCount).toBe(2);
    const taps = [...c.taps];
    c.markCaught(); // the run you were on becomes the catch
    expect(c.moveLog).toEqual(["x", "g", "x"]);
    c.markCaught(true); // a wait adds one
    expect(c.moveLog).toEqual(["x", "g", "x", "x"]);
    expect(c.taps).toEqual(taps);
    expect(c.moveCount).toBe(2);
  });
});

describe("the cartouche walk (K115 stage 4a)", () => {
  it("walks the word as counted maze ground", () => {
    const built = buildSceneGraph({
      ...dailyParams(1),
      title: "",
      cartouche: "knot",
      seed: 11,
      gridSize: 18,
      shape: "rect",
    } as never);
    const w = (built.walk ?? buildWalkGraph(built.graph))!;
    expect(w.titleEdges).toBeUndefined();
    expect(w.vertices.has("cj_a")).toBe(true);
    expect(w.vertices.has("cj_b")).toBe(true);
    const pinnedChain = (eid: number): boolean =>
      built.graph.strands[w.edges[eid].chain].pinned === true;
    // The main word strand's walk runs, in strand (writing) order.
    const mainRoute = (): number[] => {
      const main = built.graph.strands.find(
        (s) => s.nodes.includes("cstart") && s.nodes.includes("cj_a")
      )!;
      const chain = built.graph.strands.indexOf(main);
      return w.edges
        .map((e, i) => i)
        .filter((i) => w.edges[i].chain === chain);
    };
    const c = new FabricMazeController(w);
    for (const eid of routeTo(w, w.start, "cj_a")) {
      expect(c.tapEdge(eid)).toBe("advance");
    }
    expect(c.head).toBe("cj_a");
    expect(c.visitedJunctions.has("cj_a")).toBe(true);
    // Two frame runs and the word at the entry junction.
    const atEntry = c.choices();
    expect(atEntry).toHaveLength(3);
    expect(atEntry.filter((e) => pinnedChain(e))).toHaveLength(1);
    // One tap per run across the word, in writing order, end to end.
    const route = mainRoute();
    const distBefore = c.walkedDist;
    const heads: string[] = [];
    let at = "cj_a";
    for (const eid of route) {
      expect(c.tapEdge(eid)).toBe("advance");
      heads.push(c.head);
      const e = w.edges[eid];
      at = e.va === at ? e.vb : e.va;
      expect(c.head).toBe(at);
    }
    expect(heads[heads.length - 1]).toBe("cj_b");
    expect(heads).toContain("cend");
    expect(c.head).toBe("cj_b");
    expect(c.walkedDist).toBeGreaterThan(distBefore);
    // The word's arc is counted in the route home, like any maze run.
    let counted = 0;
    for (const eid of c.pathEdges) counted += w.edges[eid].length;
    expect(c.pathLength).toBeCloseTo(counted, 9);
    expect(c.visitedJunctions.has("cj_a")).toBe(true);
    expect(c.visitedJunctions.has("cj_b")).toBe(true);
    // Backtrack over the seam junction and re-advance.
    const last = c.taps[c.taps.length - 1];
    expect(c.tapEdge(last)).toBe("backtrack");
    expect(c.head).not.toBe("cj_b");
    expect(c.tapEdge(last)).toBe("advance");
    expect(c.head).toBe("cj_b");
    // A word spur tip is a dead end like any other.
    const tip = [...w.vertices.values()].find(
      (v) =>
        v.isEnd &&
        built.graph.strands[v.chain].pinned === true &&
        v.id !== w.start &&
        v.id !== w.exit
    );
    expect(tip).toBeDefined();
    const c2 = new FabricMazeController(w);
    for (const eid of routeTo(w, w.start, tip!.id)) {
      expect(c2.tapEdge(eid)).toBe("advance");
    }
    expect(c2.head).toBe(tip!.id);
    expect(c2.deadEndTips.has(tip!.id)).toBe(true);
    expect(c2.choices()).toHaveLength(1);
    // A replay arrives the same and replays the word walk.
    const c3 = new FabricMazeController(w);
    expect(c3.replay(c.taps)).toBe(true);
    expect(c3.head).toBe(c.head);
    expect(c3.taps).toEqual(c.taps);
    expect(c3.pathLength).toBeCloseTo(c.pathLength, 9);
  });
});

describe("the daily title walk (K115 stage 3a)", () => {
  const titledWalk = (): WalkGraph => {
    const built = buildSceneGraph({
      ...dailyParams(12),
      gridSize: 8,
      title: dailyTitle(12),
    });
    expect(built.walk).toBeDefined();
    return built.walk!;
  };

  it("writes the title tap by tap, outside every maze meter", () => {
    const w = titledWalk();
    const seam = w.mazeStart!;
    const c = new FabricMazeController(w);
    expect(c.head).toBe(w.start);
    // Through the title on the shortest route: every stop is a title
    // vertex, and nothing counts yet.
    const titleHeads: string[] = [];
    for (let guard = 0; guard < 200 && c.head !== seam; guard++) {
      expect(c.tapEdge(bestChoice(c))).toBe("advance");
      titleHeads.push(c.head);
      expect(w.titleVertices!.has(c.head)).toBe(true);
      expect(c.walkedDist).toBe(0);
      expect(c.pathLength).toBe(0);
    }
    expect(c.head).toBe(seam);
    expect(titleHeads.length).toBeGreaterThan(4); // letters + connector
    expect(titleHeads).toContain("texit");
    expect(c.visitedJunctions.size).toBe(0);
    expect(c.deadEndTips.size).toBe(0);
    const titleTaps = c.taps.length;
    expect(titleTaps).toBe(c.pathEdges.length);

    // Into the maze: meters now count maze arc only.
    expect(c.tapEdge(bestChoice(c))).toBe("advance");
    expect(c.head).not.toBe(seam);
    expect(w.titleVertices!.has(c.head)).toBe(false);
    const mazeRun = c.pathEdges[c.pathEdges.length - 1];
    expect(c.pathLength).toBeCloseTo(w.edges[mazeRun].length, 9);
    expect(c.walkedDist).toBeCloseTo(w.edges[mazeRun].length, 9);
    for (let i = 0; i < 3 && !c.solved; i++) c.tapEdge(bestChoice(c));
    const walkedInMaze = c.walkedDist;
    expect(walkedInMaze).toBeGreaterThan(0);
    expect(c.pathLength).toBeCloseTo(walkedInMaze, 9);
    for (const id of c.visitedJunctions) {
      expect(w.titleVertices!.has(id)).toBe(false);
    }
    for (const id of c.deadEndTips) {
      expect(w.titleVertices!.has(id)).toBe(false);
    }

    // Backtrack the whole way home, across the seam into the word.
    while (c.pathEdges.length > 0) {
      const last = c.pathEdges[c.pathEdges.length - 1];
      expect(c.tapEdge(last)).toBe("backtrack");
    }
    expect(c.head).toBe(w.start);
    expect(c.pathLength).toBe(0);
    // Only the maze backtracks were priced (and walked both ways).
    expect(c.backtrackDist).toBeCloseTo(walkedInMaze, 9);
    expect(c.walkedDist).toBeCloseTo(2 * walkedInMaze, 9);
    for (const id of c.visitedJunctions) {
      expect(w.titleVertices!.has(id)).toBe(false);
    }

    // A replay reproduces the whole solve, title included.
    const d = new FabricMazeController(w);
    expect(d.replay(c.taps)).toBe(true);
    expect(d.head).toBe(c.head);
    expect(d.pathEdges).toEqual(c.pathEdges);
    expect(d.walkedDist).toBe(c.walkedDist);
    expect(d.backtrackDist).toBe(c.backtrackDist);
  });
});

describe("restarts (K100): what the fog of war starts over on", () => {
  it("count reset() calls, the constructor's and replay()'s included", () => {
    for (const trail of [false, true]) {
      const c = new FabricMazeController(walkFor(1234), trail);
      expect(c.restarts).toBe(1);
      // Moves, a backtrack (a plain advance in trail mode), a walk back to
      // the entrance and a catch are not restarts.
      const a = bestChoice(c);
      c.tapEdge(a);
      c.tapEdge(bestChoice(c));
      c.tapEdge(c.pathEdges[c.pathEdges.length - 1]);
      c.retreatToStart();
      c.tapEdge(bestChoice(c));
      c.respawn();
      // Trail mode's retreat is a no-op.
      expect(c.taps.length).toBe(trail ? 4 : 5);
      expect(c.restarts).toBe(1);
      c.reset();
      expect(c.restarts).toBe(2);
      // A replay (a restore) restarts, then plays the taps back.
      expect(c.replay([a])).toBe(true);
      expect([c.restarts, c.taps]).toEqual([3, [a]]);
      // A refused one leaves a fresh solve: the count moves too.
      expect(c.replay([a, 99999])).toBe(false);
      expect(c.restarts).toBeGreaterThan(3);
    }
  });

  // K174: a catch under minoRefog returns the fog to the solve's start (a
  // `refogs` move); without it the explored fog stays. Neither restarts.
  it("count re-fogging catches apart from restarts (K174)", () => {
    const c = new FabricMazeController(walkFor(1234), false);
    c.tapEdge(bestChoice(c));
    c.respawn();
    expect([c.restarts, c.refogs]).toEqual([1, 0]);
    c.tapEdge(bestChoice(c));
    c.respawn(true);
    expect([c.restarts, c.refogs]).toEqual([1, 1]);
    expect(c.taps.length).toBe(2);
    expect(c.pathEdges).toEqual([]);
    c.reset();
    expect([c.restarts, c.refogs]).toEqual([2, 1]);
  });

  // K293 (a), K80 turns stage 3a: `respawns` counts the catches since the
  // last reset(), the ones whose walk walkedDist still holds.
  it("count the catches since the last restart (respawns)", () => {
    const c = new FabricMazeController(walkFor(1234), false);
    expect(c.respawns).toBe(0);
    c.tapEdge(bestChoice(c));
    c.respawn();
    c.tapEdge(bestChoice(c));
    c.respawn(true);
    expect(c.respawns).toBe(2);
    expect(c.walkedDist).toBeGreaterThan(0);
    c.reset(); // a level restart: the walk and the count start over
    expect([c.respawns, c.walkedDist]).toEqual([0, 0]);
    c.tapEdge(bestChoice(c));
    c.respawn();
    expect(c.respawns).toBe(1);
    expect(c.replay([...c.taps])).toBe(true); // a replay restarts too
    expect(c.respawns).toBe(0);
  });
});

describe("K137 tunnels (4.13): the linked junctions", () => {
  it("one tap crosses the link, and the way back is the same tap", () => {
    let walk: WalkGraph | null = null;
    let pair: [string, string] | null = null;
    for (let seed = 1; seed <= 60 && !pair; seed++) {
      const w = walkFor(seed);
      const pairs = tunnelPairs(w, 1);
      if (pairs.length > 0) {
        walk = withTunnels(w, 1);
        pair = pairs[0];
      }
    }
    if (!walk || !pair) throw new Error("no seed grew a tunnel");
    const [mouthA, mouthB] = pair;
    const tunnelId = walk.edges.length - 1;
    expect(walk.edges[tunnelId].chain).toBe(-1);
    const c = new FabricMazeController(walk);
    // Walk by thread to mouth A; the link is a choice only there.
    expect(c.choices()).not.toContain(tunnelId);
    for (const eid of routeTo(walk, walk.start, mouthA)) {
      expect(c.tapEdge(eid)).toMatch(/advance|win/);
    }
    expect(c.head).toBe(mouthA);
    expect(c.choices()).toContain(tunnelId);
    const strokesBefore = c.strokes;
    expect(c.tapEdge(tunnelId)).toMatch(/advance|win/);
    expect(c.head).toBe(mouthB);
    expect(c.strokes).toBe(strokesBefore + 1); // One move, as drawn.
    expect(c.pathEdges[c.pathEdges.length - 1]).toBe(tunnelId);
    // And straight back.
    expect(c.tapEdge(tunnelId)).toBe("backtrack");
    expect(c.head).toBe(mouthA);
    // A replay over the same taps (the save/restore path) agrees.
    const c2 = new FabricMazeController(walk);
    expect(c2.replay([...c.taps])).toBe(true);
    expect(c2.head).toBe(c.head);
  });
});
