import { describe, it, expect } from "vitest";
import type { WalkEdge, WalkGraph, WalkVertex } from "../../src/core/walk_graph";
import { walkDistances } from "../../src/core/walk_graph";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph } from "../../src/core/walk_graph";
import { FabricMazeController } from "../../src/game/fabric_controller";
import { buildFire } from "../../src/game/fire";
import { firstSmolderIndex, litArms, planRoute, planRouteRuled, routeWarning, telegraphTouchesRoute } from "../../src/game/route_plan";
import { oneWayRule } from "../../src/game/one_way";
import { ruleMaze } from "./rule_fixtures";
import { DEFAULT_TURN_MINO, turnConfig, TurnMinotaur } from "../../src/game/minotaur_turns";

// K480 (stage 1): multi-run taps - the pure route planner, the burn's
// projected stop, the telegraph/hunt warnings, and replay determinism
// (a multi-run tap is a list of ordinary taps, so the same tap list
// replays to the same game, minotaur included).

// A hand-built walk graph from runs [va, vb, length].
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
    edges.push({ id, va, vb, chain: id, ctrlA: 0, ctrlB: 2 * Math.max(1, length), length });
    at(va).edges.push(id);
    if (vb !== va) at(vb).edges.push(id);
  });
  for (const v of vertices.values()) v.isEnd = v.edges.length === 1;
  const distToExit = walkDistances(vertices, edges, exit);
  return { vertices, edges, start, exit, optimalLength: distToExit.get(start)!, distToExit };
}

// S -0/2- A -1/1- B -2/1- C -3/2- X, the long way A -4/5- C, a dead end
// B -5/1- D, and a disconnected pair Y -6/1- Z.
const G = graph(
  [
    ["S", "A", 2],
    ["A", "B", 1],
    ["B", "C", 1],
    ["C", "X", 2],
    ["A", "C", 5],
    ["B", "D", 1],
    ["Y", "Z", 1],
  ],
  "S",
  "X"
);

describe("planRoute (K480 decision 1-2)", () => {
  it("walks a chain of short runs as one route, the tapped run last", () => {
    expect(planRoute(G, "S", { edge: 2, at: 0.5 }, 3.5)).toEqual([0, 1, 2]);
    expect(planRoute(G, "S", { edge: 1, at: 0.5 }, 2.5)).toEqual([0, 1]);
    expect(planRoute(G, "S", { edge: 5, at: 1 }, 4)).toEqual([0, 1, 5]);
  });

  it("refuses a point past the reach, judged at the tapped point", () => {
    expect(planRoute(G, "S", { edge: 2, at: 0.5 }, 3)).toBeNull();
    expect(planRoute(G, "S", { edge: 2, at: 0.5 }, 3.49)).toBeNull();
    expect(planRoute(G, "S", { edge: 2, at: 0 }, 3)).toEqual([0, 1, 2]);
  });

  it("keeps a run leaving the head tappable along its whole length", () => {
    // The long A-C run is 5 long: tapped from A it is the whole route at
    // any reach (its far end is past the reach; the run itself is not).
    expect(planRoute(G, "A", { edge: 4, at: 4.9 }, 0.5)).toEqual([4]);
    expect(planRoute(G, "B", { edge: 1, at: 0.2 }, 0.5)).toEqual([1]);
  });

  it("enters the tapped run from the end that reaches its point sooner, without crossing it first", () => {
    // Near C on the long run: in through C (the chain), not through A
    // along the tapped run itself and back.
    expect(planRoute(G, "S", { edge: 4, at: 4.5 }, 4.5)).toEqual([0, 1, 2, 4]);
    expect(planRoute(G, "S", { edge: 4, at: 0.5 }, 2.5)).toEqual([0, 4]);
  });

  it("refuses an unreachable run and a run that does not exist", () => {
    expect(planRoute(G, "S", { edge: 6, at: 0.5 }, 100)).toBeNull();
    expect(planRoute(G, "S", { edge: 99, at: 0 }, 100)).toBeNull();
    expect(planRoute(G, "nowhere", { edge: 0, at: 0 }, 100)).toBeNull();
  });

  it("takes the exit tail's run as the end of the shortest route", () => {
    const route = planRoute(G, "S", { edge: 3, at: 1 }, 100)!;
    expect(route).toEqual([0, 1, 2, 3]);
  });

  it("K137: refuses a blocked (broken) run and routes around blocked runs", () => {
    const no1 = (eid: number): boolean => eid === 1;
    // The broken run itself, even leaving the head.
    expect(planRoute(G, "S", { edge: 1, at: 0.5 }, 100, no1)).toBeNull();
    expect(planRoute(G, "A", { edge: 1, at: 0.2 }, 100, no1)).toBeNull();
    // B-C near B: B is cut off (its runs are the broken one, the tapped
    // one and the dead end), so the route comes in through C the long way.
    expect(planRoute(G, "S", { edge: 2, at: 0.5 }, 100, no1)).toEqual([0, 4, 2]);
    expect(planRoute(G, "S", { edge: 2, at: 0.5 }, 7.49, no1)).toBeNull();
    expect(planRoute(G, "S", { edge: 2, at: 0.5 }, 7.5, no1)).toEqual([0, 4, 2]);
    // The dead end beyond B: B reached the long way, through C.
    expect(planRoute(G, "S", { edge: 5, at: 0.5 }, 100, no1)).toEqual([0, 4, 2, 5]);
    // Nothing blocked: the planner as before.
    expect(planRoute(G, "S", { edge: 2, at: 0.5 }, 100, () => false)).toEqual([0, 1, 2]);
  });
});

describe("litArms (K480 stage 2, decision 1: the branching light)", () => {
  it("lights the head's runs, then branches where a lit run ends inside the reach", () => {
    const arms = litArms(G, "S", 3);
    expect(arms.map((a) => a.edge)).toEqual([0, 1, 4]);
    expect(arms.map((a) => a.dist0)).toEqual([0, 2, 2]);
    // Only the first run ends inside the reach at a junction: it carries on.
    expect(arms.map((a) => a.cont)).toEqual([true, false, false]);
  });

  it("carries through each far junction until the reach runs out, each run once from its nearer end", () => {
    const arms = litArms(G, "S", 10);
    expect(arms.map((a) => a.edge)).toEqual([0, 1, 4, 2, 5, 3]);
    expect(arms.find((a) => a.edge === 2)).toEqual({ edge: 2, atA: true, dist0: 3, cont: true });
    expect(arms.find((a) => a.edge === 3)).toEqual({ edge: 3, atA: true, dist0: 4, cont: false });
    // The dead end's arm never carries on, and no run lights twice.
    expect(arms.find((a) => a.edge === 5)!.cont).toBe(false);
    expect(new Set(arms.map((a) => a.edge)).size).toBe(arms.length);
  });

  it("a gated beyond-head arm neither lights nor carries light through", () => {
    const arms = litArms(G, "S", 10, (eid) => eid !== 1);
    // B is still reached the long way (A-C-B), from C's end.
    expect(arms.map((a) => a.edge)).toEqual([0, 4, 2, 3, 5]);
    expect(arms.find((a) => a.edge === 2)).toEqual({ edge: 2, atA: false, dist0: 7, cont: true });
  });

  it("K137: a blocked (broken) run neither lights nor carries light, at the head too", () => {
    // The head's only run broken: nothing lights.
    expect(litArms(G, "S", 10, undefined, (eid) => eid === 0)).toEqual([]);
    // From A with A-B broken: B is lit the long way round, from C's end.
    const arms = litArms(G, "A", 10, undefined, (eid) => eid === 1);
    expect(arms.map((a) => a.edge).sort((x, y) => x - y)).toEqual([0, 2, 3, 4, 5]);
    expect(arms.find((a) => a.edge === 2)).toEqual({ edge: 2, atA: false, dist0: 5, cont: true });
    expect(arms.find((a) => a.edge === 5)).toEqual({ edge: 5, atA: true, dist0: 6, cont: false });
    // The gate (beyond-head arms) still applies beside it.
    const gated = litArms(G, "A", 10, (eid) => eid !== 2, (eid) => eid === 1);
    expect(gated.map((a) => a.edge).sort((x, y) => x - y)).toEqual([0, 3, 4]);
  });

  it("a self-loop at the head lights from both ends, as today's choices do", () => {
    const L = graph([["S", "S", 1], ["S", "A", 1]], "S", "A");
    const arms = litArms(L, "S", 5);
    expect(arms.filter((a) => a.edge === 0).map((a) => a.atA)).toEqual([true, false]);
    expect(arms.find((a) => a.edge === 1)!.cont).toBe(false);
  });

  it("lights nothing from a head that is not in the graph", () => {
    expect(litArms(G, "nowhere", 10)).toEqual([]);
  });
});

describe("the burn's stop (K480 decision 4)", () => {
  // S-A 2, A-B 1 twice, B-C 4, A-X 4; r 0.5, h 0: T = 2d (fire.test.ts).
  const W = graph(
    [
      ["S", "A", 2],
      ["A", "B", 1],
      ["A", "B", 1],
      ["B", "C", 4],
      ["A", "X", 4],
    ],
    "S",
    "X"
  );
  const fire = buildFire(W, 0.5, 0);

  it("projects L run by run: the run that would smolder stops the route", () => {
    // Out and back: at B (L 3) the run back to A ties the fire (L+1 = T(A)).
    expect(firstSmolderIndex(W, fire, 0, "S", [0, 1, 2])).toBe(2);
    // Into the dead end stays ahead of the fire the whole way.
    expect(firstSmolderIndex(W, fire, 0, "S", [0, 1, 3])).toBe(-1);
    expect(firstSmolderIndex(W, fire, 3, "B", [2])).toBe(0);
    expect(firstSmolderIndex(W, fire, 0, "S", [])).toBe(-1);
  });

  it("is the controller's own refusal, at the departure clock", () => {
    const c = new FabricMazeController(W, false, buildFire(W, 0.5, 0));
    expect(c.tapEdge(0)).toBe("advance");
    expect(c.tapEdge(1)).toBe("advance");
    expect(firstSmolderIndex(W, fire, c.walkedDist, c.head, [2])).toBe(0);
    expect(c.tapEdge(2)).toBe("smolder");
    expect(c.taps).toEqual([0, 1]);
  });
});

describe("the warning stops (K480 decisions 4-5)", () => {
  it("stops when the minotaur has just started hunting you", () => {
    const base = { walk: G, head: "S", remaining: [0, 1], teleEdges: [], teleVertices: [] };
    expect(routeWarning({ ...base, huntWas: false, huntIs: true })).toBe("hunt");
    expect(routeWarning({ ...base, huntWas: true, huntIs: true })).toBeNull();
    expect(routeWarning({ ...base, huntWas: false, huntIs: false })).toBeNull();
    expect(routeWarning({ ...base, huntWas: true, huntIs: false })).toBeNull();
  });

  it("stops when the new telegraph touches the rest of the route", () => {
    expect(telegraphTouchesRoute(G, "S", [0, 1, 2], [2], [])).toBe(true);
    expect(telegraphTouchesRoute(G, "S", [0, 1, 2], [], ["B"])).toBe(true);
    expect(telegraphTouchesRoute(G, "S", [0, 1, 2], [5], ["D"])).toBe(false);
    expect(telegraphTouchesRoute(G, "S", [], [0], ["A"])).toBe(false);
    expect(telegraphTouchesRoute(G, "S", [0], [], [])).toBe(false);
    const base = { walk: G, head: "S", remaining: [0, 1, 2], huntWas: false, huntIs: false };
    expect(routeWarning({ ...base, teleEdges: [5], teleVertices: ["C"] })).toBe("telegraph");
    expect(routeWarning({ ...base, teleEdges: [5], teleVertices: ["D"] })).toBeNull();
    // The hunt warning outranks the telegraph's.
    expect(
      routeWarning({ ...base, huntWas: false, huntIs: true, teleEdges: [2], teleVertices: [] })
    ).toBe("hunt");
  });

  it("stops only before a smoldering next run (smolderAt 0), and a hold's next run judges the same", () => {
    const base = {
      walk: G,
      head: "S",
      remaining: [0],
      huntWas: false,
      huntIs: false,
      teleEdges: [] as number[],
      teleVertices: [] as string[],
    };
    expect(routeWarning({ ...base, smolderAt: 0 })).toBe("smolder");
    expect(routeWarning({ ...base, smolderAt: 1 })).toBeNull();
    expect(routeWarning({ ...base, smolderAt: -1 })).toBeNull();
    expect(routeWarning({ ...base })).toBeNull();
    // A hold: its one next run as the remaining route.
    expect(
      routeWarning({ ...base, remaining: [1], teleEdges: [1], teleVertices: [] })
    ).toBe("telegraph");
  });

  it("catch, finish and loss are the caller's stops (they empty the route there)", () => {
    // No warning with nothing left: a route that walked into the finish
    // (or a catch, or a burn loss) has no next run to stop before.
    expect(
      routeWarning({
        walk: G,
        head: "X",
        remaining: [],
        huntWas: false,
        huntIs: true,
        teleEdges: [3],
        teleVertices: ["X"],
        smolderAt: 0,
      })
    ).toBeNull();
  });
});

describe("walking a route (the controller sees ordinary taps)", () => {
  function walkFor(seed: number): WalkGraph {
    const g = generateLatticeKnotwork({
      gridSize: 8,
      weaveDensity: 0.3,
      turnBias: 0.6,
      randSeed: seed,
    });
    const plan = buildMazePlan(g, { ...DEFAULT_MAZE_PARAMS });
    const hueGroup = applyMazePlan(g, plan);
    applyMazeCuts(g, plan, hueGroup);
    return buildWalkGraph(g)!;
  }

  it("solves by one multi-run tap and replays from its tap list exactly", () => {
    for (const seed of [5, 42, 1234]) {
      const walk = walkFor(seed);
      const exitRun = walk.edges.find((e) => e.va === walk.exit || e.vb === walk.exit)!;
      const at = exitRun.va === walk.exit ? 0 : exitRun.length;
      const route = planRoute(walk, walk.start, { edge: exitRun.id, at }, Infinity)!;
      expect(route.length).toBeGreaterThan(2);
      expect(route[route.length - 1]).toBe(exitRun.id);
      const c = new FabricMazeController(walk);
      let result = "";
      for (const eid of route) result = c.tapEdge(eid);
      expect(result).toBe("win");
      // Each run was a normal move: one tap and one log entry apiece.
      expect(c.taps).toEqual(route);
      expect(c.moveLog.length).toBe(route.length);
      expect(c.walkedDist).toBeCloseTo(walk.optimalLength, 9);
      const b = new FabricMazeController(walk);
      expect(b.replay(c.taps)).toBe(true);
      expect([b.head, b.solved, b.walkedDist, b.moveLog]).toEqual([
        c.head,
        c.solved,
        c.walkedDist,
        c.moveLog,
      ]);
    }
  });

  it("replays the same game under the turn minotaur (the same taps, the same minotaur)", () => {
    const play = (walk: WalkGraph, route: readonly number[]) => {
      const fc = new FabricMazeController(walk);
      const mino = new TurnMinotaur(
        walk,
        turnConfig({ ...DEFAULT_TURN_MINO, model: "hunter" }),
        1234
      );
      for (const eid of route) {
        const r = fc.tapEdge(eid);
        if (r !== "advance" && r !== "backtrack" && r !== "win") break;
        const t = mino.turn(eid);
        if (t === "caught") fc.respawn(false);
        if (t === "caught" || fc.solved) break;
      }
      return {
        head: fc.head,
        path: [...fc.pathEdges],
        taps: [...fc.taps],
        log: [...fc.moveLog],
        catches: mino.catches,
        player: mino.player,
        at: mino.state.v,
        turns: mino.turns,
      };
    };
    for (const seed of [5, 42]) {
      const walk = walkFor(seed);
      const exitRun = walk.edges.find((e) => e.va === walk.exit || e.vb === walk.exit)!;
      const route = planRoute(walk, walk.start, { edge: exitRun.id, at: 0 }, Infinity)!;
      const a = play(walk, route);
      // The whole game is its tap list: replaying only the accepted taps
      // (fc.taps) through a fresh pair lands in exactly the same place.
      const b = play(walk, a.taps);
      expect(b).toEqual(a);
    }
  });

  it("stops a route before the finish's own run only by walking it (the finish ends it)", () => {
    const walk = walkFor(42);
    const exitRun = walk.edges.find((e) => e.va === walk.exit || e.vb === walk.exit)!;
    const route = planRoute(walk, walk.start, { edge: exitRun.id, at: 0 }, Infinity)!;
    const c = new FabricMazeController(walk);
    for (const eid of route.slice(0, -1)) expect(c.tapEdge(eid)).toBe("advance");
    expect(c.solved).toBe(false);
    expect(c.tapEdge(route[route.length - 1])).toBe("win");
    expect(c.tapEdge(route[0])).toBe("noop");
  });
});

describe("planRouteRuled (K743)", () => {
  it("follows a legal route to the tapped point under one-way runs", () => {
    // Run 1 (A-B) is one-way in at B, so the plain route's A -> B is refused.
    const rule = oneWayRule(G, new Map([[1, "B"]]));
    expect(planRoute(G, "S", { edge: 2, at: 0.5 }, 100)).toEqual([0, 1, 2]);
    const ruled = planRouteRuled(G, rule, { vertex: "S", state: 0, last: -1, phase: 0 }, { edge: 2, at: 0.5 }, 100);
    expect(ruled).toEqual([0, 4, 2]);
    // Every move of the ruled route is legal, and it walks run 2.
    let at = "S";
    let state = 0;
    let came = -1;
    const walked: number[] = [];
    for (const run of ruled!) {
      if (walked.length > 0 && run === came) continue;
      const m = rule.step(at, run, state, came, 0);
      expect(m).not.toBeNull();
      walked.push(...m!.runs);
      at = m!.to;
      state = m!.state;
      came = m!.runs[m!.runs.length - 1];
      if (walked.includes(2)) break;
    }
    expect(walked).toEqual([0, 4, 2]);
  });

  it("keeps today's behavior when no legal route exists", () => {
    // Runs 1 and 4 both one-way in at their far ends: C is unreachable
    // legally from S, so the plain (part-refused) route answers.
    const rule = oneWayRule(G, new Map([[1, "B"], [4, "C"]]));
    const ruled = planRouteRuled(G, rule, { vertex: "S", state: 0, last: -1, phase: 0 }, { edge: 2, at: 0.5 }, 100);
    expect(ruled).toEqual(planRoute(G, "S", { edge: 2, at: 0.5 }, 100));
  });

  it("walks a ruled tap through the controller to the win", () => {
    const { walk, cont } = ruleMaze(3);
    const c = new FabricMazeController(walk, false, null, { oneWay: 0.4 }, { seed: 3, cont: () => cont });
    expect(c.rule).not.toBeNull();
    const exitRun = walk.edges.find((e) => e.va === walk.exit || e.vb === walk.exit)!;
    const at = exitRun.va === walk.exit ? 0 : exitRun.length;
    const route = planRouteRuled(walk, c.rule, { vertex: c.head, state: c.ruleState, last: c.arrivalEdge, phase: c.strokes }, { edge: exitRun.id, at }, Infinity)!;
    expect(route[route.length - 1]).toBe(exitRun.id);
    for (const eid of route) {
      const r = c.tapEdge(eid);
      if (r === "advance" || r === "backtrack") {
        while (c.carry.length > 0) c.tapEdge(c.carry[0]);
      } else {
        expect(r).toBe("win");
      }
      if (c.solved) break;
    }
    expect(c.solved).toBe(true);
  });
});
