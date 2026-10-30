// K807: the next constants that became params (docs/design/K795.md's
// audit, rows 5-8): the follower's delay bounds and shortcut chance, the
// sword's and sleepers' rings, turnstiles' NEAR_HOPS and one-way's
// ROUTE_WEIGHT. Each defaults to its constant, so no design moves.
import { describe, expect, it } from "vitest";
import { walkDistances } from "../../src/core/walk_graph";
import type { WalkEdge, WalkGraph, WalkVertex } from "../../src/core/walk_graph";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEAD_END_DENSITY_ON, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph } from "../../src/core/walk_graph";
import {
  FOLLOW_DELAY_MAX,
  FOLLOW_DELAY_MIN,
  FOLLOW_SHORTCUT,
  followDelay,
  followDelayOf,
  followShortcutOf,
  monsterRng,
  SLEEPER_RING_MAX,
  SLEEPER_RING_MIN,
  sleeperRingOf,
  sleeperSpots,
} from "../../src/game/monsters";
import { SWORD_RING_MAX, SWORD_RING_MIN, swordRingOf, swordSpot, runHops, optimalRouteVertices } from "../../src/game/sword";
import { NEAR_HOPS, nearHopsOf, placeTurnstiles, turnstileCandidates } from "../../src/game/turnstiles";
import { ROUTE_WEIGHT, routeWeightOf, placeOneWay, oneWayCore } from "../../src/game/one_way";
import { plainRule, ruleSearch } from "../../src/game/rule_search";
import { DEFAULT_TURN_MINO, followStep, newTurnExtra, turnConfig, TurnGraph } from "../../src/game/minotaur_turns";
import { FabricMazeController } from "../../src/game/fabric_controller";
import { PARAM_RANGES } from "../../src/ui/param_codec";
import { PARAM_DEFAULTS, parseParams } from "../../src/ui/url_state";
import { ruleMaze } from "./rule_fixtures";

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
  return { vertices, edges, start, exit, optimalLength: distToExit.get(start)!, distToExit };
}

function realMaze(seed: number): WalkGraph {
  const g = generateLatticeKnotwork({ gridSize: 10, weaveDensity: 0.3, turnBias: 0.6, randSeed: seed });
  const plan = buildMazePlan(g, { ...DEFAULT_MAZE_PARAMS, deadEndDensity: DEAD_END_DENSITY_ON });
  const hueGroup = applyMazePlan(g, plan);
  applyMazeCuts(g, plan, hueGroup);
  return buildWalkGraph(g)!;
}

describe("K807: the tunables' params", () => {
  it("default to their constants and read as the rows' ranges", () => {
    expect([PARAM_DEFAULTS.followDelayMin, PARAM_DEFAULTS.followDelayMax, PARAM_DEFAULTS.followShortcut]).toEqual([FOLLOW_DELAY_MIN, FOLLOW_DELAY_MAX, FOLLOW_SHORTCUT]);
    expect([PARAM_DEFAULTS.swordRingMin, PARAM_DEFAULTS.swordRingMax]).toEqual([SWORD_RING_MIN, SWORD_RING_MAX]);
    expect([PARAM_DEFAULTS.sleeperRingMin, PARAM_DEFAULTS.sleeperRingMax]).toEqual([SLEEPER_RING_MIN, SLEEPER_RING_MAX]);
    expect([PARAM_DEFAULTS.nearHops, PARAM_DEFAULTS.routeWeight]).toEqual([NEAR_HOPS, ROUTE_WEIGHT]);
    expect(PARAM_RANGES.followShortcut).toEqual([0, 1]);
    expect(PARAM_RANGES.nearHops).toEqual([0, 6]);
    expect(PARAM_RANGES.routeWeight).toEqual([1, 10]);
    expect([followDelayOf(3.6, 1), followDelayOf(-1, 1), followDelayOf(99, 2), followDelayOf("3", 1)]).toEqual([4, 0, 5, 1]);
    expect([followShortcutOf(0.5), followShortcutOf(2), followShortcutOf(-1), followShortcutOf(undefined)]).toEqual([0.5, 1, 0, FOLLOW_SHORTCUT]);
    expect([swordRingOf(2.4, 4), swordRingOf(99, 4), sleeperRingOf(0, 1), sleeperRingOf(99, 1), sleeperRingOf("x", 3)]).toEqual([2, 12, 0, 8, 3]);
    expect([nearHopsOf(0), nearHopsOf(3.5), nearHopsOf(99), nearHopsOf(null)]).toEqual([0, 4, 6, NEAR_HOPS]);
    expect([routeWeightOf(1), routeWeightOf(7.4), routeWeightOf(0), routeWeightOf(undefined)]).toEqual([1, 7, 1, ROUTE_WEIGHT]);
  });

  it("clamps a link's values to the rows' ranges", () => {
    const p = parseParams("?7&fdm=99&fdx=-1&fsc=2&srm=99&srx=-1&zrm=99&zrx=-1&nhp=99&rwt=0");
    expect([p.followDelayMin, p.followDelayMax, p.followShortcut]).toEqual([5, 0, 1]);
    expect([p.swordRingMin, p.swordRingMax, p.sleeperRingMin, p.sleeperRingMax]).toEqual([12, 0, 8, 0]);
    expect([p.nearHops, p.routeWeight]).toEqual([6, 1]);
    const d = parseParams("?7");
    expect([d.followDelayMin, d.nearHops, d.routeWeight]).toEqual([1, 2, 4]);
  });

  it("sets the follower's tunables in the turn config only off their defaults", () => {
    const base = turnConfig(DEFAULT_TURN_MINO);
    expect("followDelayMin" in base || "followDelayMax" in base || "followShortcut" in base).toBe(false);
    expect(turnConfig({ ...DEFAULT_TURN_MINO, followDelayMin: 1, followDelayMax: 2, followShortcut: 0.25 })).toEqual(base);
    const tuned = turnConfig({ ...DEFAULT_TURN_MINO, followDelayMin: 0, followDelayMax: 4, followShortcut: 0.6 });
    expect([tuned.followDelayMin, tuned.followDelayMax, tuned.followShortcut]).toEqual([0, 4, 0.6]);
  });

  it("draws the follower's delay from the panel's bounds", () => {
    for (let seed = 1; seed <= 8; seed++) {
      expect(followDelay(seed, 0, 3, 3)).toBe(3);
      expect(newTurnExtra({ kind: "follower", home: 0 }, seed, 0, 4, 4).delay).toBe(4);
      expect(newTurnExtra({ kind: "follower", home: 0 }, seed, 0).delay).toBe(followDelay(seed, 0));
    }
  });

  it("steps toward the player at shortcut chance 1 and along the trail at 0", () => {
    // S-A-B-C-D-X with the chord B-D: the follower at B trails to C, but
    // its shortcut steps straight to the player at D.
    const w = graph([["S", "A", 2], ["A", "B", 2], ["B", "C", 2], ["C", "D", 2], ["D", "X", 2], ["B", "D", 2]], "S", "X");
    const tg = new TurnGraph(w);
    const v = (n: string): number => tg.chase.index.get(n)!;
    const x = newTurnExtra({ kind: "follower", home: v("A") }, 3, 0);
    x.state.v = v("B");
    x.trail = [[1, v("B")], [2, v("C")]];
    x.at = 1;
    const along = followStep(tg, { ...x, state: { ...x.state }, trail: [...x.trail] }, v("D"), monsterRng(3, 0).at(0), 0);
    expect(along[0]?.[1]).toBe(v("C"));
    const y = newTurnExtra({ kind: "follower", home: v("A") }, 3, 0);
    y.state.v = v("B");
    y.trail = [[1, v("B")], [2, v("C")]];
    y.at = 1;
    const cut = followStep(tg, y, v("D"), monsterRng(3, 0).at(0), 1);
    expect(cut[0]?.[1]).toBe(v("D"));
  });

  it("lays the sword and the sleepers inside the panel's rings", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const g = new TurnGraph(realMaze(seed)).chase;
      const hop = runHops(g, optimalRouteVertices(g));
      const sword = swordSpot(g, seed, {}, { min: 0, max: 0 });
      if (sword >= 0) expect(hop[sword]).toBe(0);
      const wide = swordSpot(g, seed);
      if (wide >= 0) expect(hop[wide]).toBeGreaterThanOrEqual(SWORD_RING_MIN);
      for (const vtx of sleeperSpots(g, seed, 3, {}, [], { min: 2, max: 2 })) expect(hop[vtx]).toBe(2);
    }
  });

  it("keeps turnstiles within the panel's hops of the route", () => {
    const { walk } = ruleMaze(3);
    const onRoute = new Set<string>();
    let at = walk.start;
    onRoute.add(at);
    for (const r of ruleSearch(walk, plainRule(walk)).routeRuns) {
      const e = walk.edges[r];
      at = e.va === at ? e.vb : e.va;
      onRoute.add(at);
    }
    const near = turnstileCandidates(walk, null, 0);
    expect(near.length).toBeGreaterThan(0);
    for (const id of near) expect(onRoute.has(id)).toBe(true);
    expect(turnstileCandidates(walk, null, 2).length).toBeGreaterThanOrEqual(near.length);
    const placed = placeTurnstiles(walk, 3, 3, null, 0);
    for (const ts of placed.layout ?? []) expect(onRoute.has(ts.vertex)).toBe(true);
    // Through the controller, as the panel drives it.
    const { cont } = ruleMaze(3);
    const c = new FabricMazeController(walk, false, null, { turnstiles: 3, nearHops: 0 }, { seed: 3, cont: () => cont });
    for (const ts of c.ruleLook?.turnstiles ?? []) expect(onRoute.has(ts.vertex)).toBe(true);
  });

  it("weights the one-way draw by the panel's tickets", () => {
    const { walk } = ruleMaze(3);
    const core = oneWayCore(walk, ruleSearch(walk, plainRule(walk)).routeRuns);
    for (const wgt of [1, 4, 10]) {
      const a = placeOneWay(walk, 0.4, 3, null, wgt);
      expect(a.layout).not.toBeNull();
      expect(a.layout!.size).toBe(Math.round(0.4 * core.runs.length));
      expect(placeOneWay(walk, 0.4, 3, null, wgt)).toEqual(a);
    }
    // Through the controller, as the panel drives it.
    const { cont } = ruleMaze(3);
    const c = new FabricMazeController(walk, false, null, { oneWay: 0.4, routeWeight: 1 }, { seed: 3, cont: () => cont });
    expect(c.routeWeight).toBe(1);
    expect(c.ruleLook?.oneWay?.size).toBe(placeOneWay(walk, 0.4, 3, null, 1).layout!.size);
  });
});
