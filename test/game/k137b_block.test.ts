import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEAD_END_DENSITY_ON, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph, walkDistances } from "../../src/core/walk_graph";
import type { WalkGraph, WalkVertex, WalkEdge } from "../../src/core/walk_graph";
import { FabricMazeController } from "../../src/game/fabric_controller";
import { buildFire, fireTime, refire } from "../../src/game/fire";
import { fragileLimits } from "../../src/game/fragile";
import { collapseLimits } from "../../src/game/collapse";
import { DEFAULT_CHASE_PARAMS, MinotaurChase, replayChase } from "../../src/game/minotaur";
import type { ChaseModel, ChaseParams } from "../../src/game/minotaur";
import {
  DEFAULT_TURN_MINO,
  turnConfig,
  TurnGraph,
  TurnMinotaur,
  turnSeed,
  UNREACH,
} from "../../src/game/minotaur_turns";
import type { TurnMinoParams } from "../../src/game/minotaur_turns";
import { SeededRNG } from "../../src/util/random";

// K137 stage 3a, K137-b (brief docs/design/K137_s3a.md): a run that broke
// behind the player (fragile, collapse) is gone for the minotaur on both
// clocks and for the fire.

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

// S-a (tail), a-b, b-X (tail), a-c, c-b, c-D (a dead-end stub).
const RUNS: Array<[string, string, number]> = [
  ["S", "a", 2], // 0
  ["a", "b", 3], // 1
  ["b", "X", 2], // 2
  ["a", "c", 2], // 3
  ["c", "b", 2], // 4
  ["c", "D", 1], // 5
];

function realMaze(seed: number): WalkGraph {
  const g = generateLatticeKnotwork({ gridSize: 10, weaveDensity: 0.3, turnBias: 0.6, randSeed: seed });
  const plan = buildMazePlan(g, { ...DEFAULT_MAZE_PARAMS, deadEndDensity: DEAD_END_DENSITY_ON });
  const hueGroup = applyMazePlan(g, plan);
  applyMazeCuts(g, plan, hueGroup);
  return buildWalkGraph(g)!;
}

const turnParams = (over: Partial<TurnMinoParams> = {}): TurnMinoParams => ({
  ...DEFAULT_TURN_MINO,
  model: "hunter",
  ...over,
});

const MODELS = ["hunter", "guard", "stalker"] as const;

describe("K137-b: the turn graph without broken runs", () => {
  it("routes hops around a blocked run, UNREACH across a cut", () => {
    const w = graph(RUNS, "S", "X");
    const g = new TurnGraph(w);
    const ix = (id: string): number => g.chase.index.get(id)!;
    expect(g.hopd(ix("a"), ix("b"))).toBe(1);
    const b1 = new Uint8Array(RUNS.length);
    b1[1] = 1;
    const g1 = g.withBlocked(b1);
    expect(g1.chase).toBe(g.chase);
    expect(g1.hopd(ix("a"), ix("b"))).toBe(2); // a-c-b
    expect(g1.isBlocked(1)).toBe(true);
    expect(g.isBlocked(1)).toBe(false);
    const b2 = new Uint8Array(RUNS.length);
    b2[3] = 1;
    b2[4] = 1;
    const g2 = g.withBlocked(b2);
    expect(g2.hopd(ix("a"), ix("c"))).toBe(UNREACH);
    expect(g2.hopd(ix("D"), ix("X"))).toBe(UNREACH);
    expect(g2.hopd(ix("S"), ix("X"))).toBe(3);
    // Nothing blocked keeps the old matrix (-1 never occurs in a connected
    // walk graph, and none is rewritten).
    expect(Array.from(new TurnGraph(w, null).hop)).toEqual(Array.from(g.hop));
  });
});

// A scripted player on the turn clock: a random unbroken run at its vertex
// (the page refuses a broken one), or a wait; -1 when none is left.
function turnPlay(
  walk: WalkGraph,
  p: TurnMinoParams,
  limits: ArrayLike<number> | null,
  seed: number,
  moves: number,
  check?: (t: TurnMinotaur, before: Set<number>, from: { edge: number }) => void
): TurnMinotaur {
  const t = new TurnMinotaur(walk, turnConfig(p), turnSeed(seed));
  t.setBreakLimits(limits);
  const rng = new SeededRNG(seed * 31 + 7);
  for (let i = 0; i < moves && !t.finished; i++) {
    const before = new Set(t.blockedRuns);
    const from = { edge: t.state.spot.edge };
    const runs = t.g.adj[t.player].filter((e) => !before.has(e));
    const e = runs.length === 0 || rng.next() < 0.1 ? -1 : runs[rng.nextInt(runs.length)];
    t.turn(e);
    t.setProgress(1);
    check?.(t, before, from);
  }
  return t;
}

describe("K137-b: the turn minotaur routes around broken runs", () => {
  for (const model of MODELS) {
    for (const byLength of [false, true]) {
      it(`${model}${byLength ? " by length" : ""}: no turn walks a run broken before it`, () => {
        let blockedSeen = 0;
        let caught = 0;
        for (const seed of [3, 11, 42]) {
          const walk = realMaze(seed);
          const p = turnParams({ model, byLength });
          const t = turnPlay(walk, p, fragileLimits(walk, "snap"), seed, 200, (tm, before, from) => {
            for (let s = 0; s < tm.lastPath.length; s++) {
              const e = tm.lastPath[s][0];
              // A turn that starts mid-run on a run that broke finishes it.
              if (s === 0 && e === from.edge) continue;
              expect(before.has(e)).toBe(false);
            }
          });
          blockedSeen += t.blockedRuns.length;
          caught += t.catches;
        }
        expect(blockedSeen).toBeGreaterThan(0);
        expect(caught).toBeGreaterThanOrEqual(0);
      });
    }
  }

  it("blocks a run on the crossing that reaches its limit, and a restart's limits start whole", () => {
    const walk = realMaze(5);
    const lim = fragileLimits(walk, "crack");
    const t = new TurnMinotaur(walk, turnConfig(turnParams()), turnSeed(5));
    t.setBreakLimits(lim);
    const e = t.g.adj[t.player].find((r) => Number.isFinite(lim[r]));
    if (e === undefined) {
      // The start's runs are tails (exempt): walk one first.
      const tail = t.g.adj[t.player][0];
      t.turn(tail);
      t.setProgress(1);
    }
    const run = t.g.adj[t.player].find((r) => Number.isFinite(lim[r]))!;
    expect(run).toBeDefined();
    t.turn(run);
    t.setProgress(1);
    expect(t.blockedRuns).not.toContain(run); // crack: cracked after one
    t.turn(run); // back over it
    t.setProgress(1);
    expect(t.blockedRuns).toContain(run);
    t.setBreakLimits(lim);
    expect(t.blockedRuns).toEqual([]);
  });

  it("with nothing breakable plays the same game as without limits (off is bit-identical)", () => {
    const walk = realMaze(9);
    const never = new Float64Array(walk.edges.length).fill(Infinity);
    for (const model of MODELS) {
      const a = turnPlay(walk, turnParams({ model }), null, 9, 150);
      const b = turnPlay(walk, turnParams({ model }), never, 9, 150);
      expect(b.inputs).toEqual(a.inputs);
      expect([b.catches, b.closeCalls, b.seen, b.player, b.state.v]).toEqual([
        a.catches,
        a.closeCalls,
        a.seen,
        a.player,
        a.state.v,
      ]);
    }
  });

  it("collapse: every maze run walked is gone for it", () => {
    const walk = realMaze(17);
    const lim = collapseLimits(walk);
    const t = turnPlay(walk, turnParams({ model: "stalker" }), lim, 17, 60, (tm, before, from) => {
      for (let s = 0; s < tm.lastPath.length; s++) {
        const e = tm.lastPath[s][0];
        if (s === 0 && e === from.edge) continue;
        expect(before.has(e)).toBe(false);
      }
    });
    expect(t.blockedRuns.length).toBeGreaterThan(0);
  });
});

// A real-time chase under limits, with a scripted player who taps a random
// unbroken run at its decision vertex every `every` ticks (main.ts refuses
// broken ones); checks each tick that the minotaur never enters a run that
// was broken before the tick, and its plan never routes through one.
function chasePlay(
  walk: WalkGraph,
  params: ChaseParams,
  seed: number,
  limits: ArrayLike<number> | null,
  ticks: number,
  every = 40
): { sim: MinotaurChase; entered: number } {
  const sim = new MinotaurChase(walk, params, seed);
  sim.setBreakLimits(limits);
  const pick = new SeededRNG(seed + 1);
  const g = sim.g;
  let entered = 0;
  for (let i = 0; i < ticks && !sim.finished; i++) {
    if (i % every === 0) {
      const runs = g.adj[g.index.get(sim.decisionVertex)!].filter((e) => !g.blocked[e]);
      if (runs.length > 0) sim.tap(runs[Math.floor(pick.next() * runs.length)]);
    }
    const before = g.blocked.slice();
    const prev = sim.mino.edge;
    sim.step();
    const m = sim.mino;
    if (m.edge >= 0 && m.edge !== prev) {
      expect(before[m.edge]).toBe(0);
      entered++;
    }
    if (i % 10 === 0 && g.blockedCount > 0) {
      for (const [e] of sim.plan(8).steps) expect(g.blocked[e]).toBe(0);
    }
  }
  return { sim, entered };
}

describe("K137-b: the real-time chase routes around broken runs", () => {
  for (const model of ["hunter", "guard", "stalker"] as ChaseModel[]) {
    it(`${model}: never enters a broken run, plans around them, replays`, () => {
      let blocked = 0;
      for (const seed of [4, 21]) {
        const walk = realMaze(seed);
        const params: ChaseParams = { ...DEFAULT_CHASE_PARAMS, model, wake: 1 };
        const lim = fragileLimits(walk, "snap");
        const { sim, entered } = chasePlay(walk, params, seed, lim, 120 * 90);
        expect(entered).toBeGreaterThan(0);
        blocked += sim.blockedRuns.length;
        const r = replayChase(walk, params, seed, sim.inputs, sim.tick, lim);
        expect(r.blockedRuns).toEqual(sim.blockedRuns);
        expect([r.mino, r.player, r.catches, r.mode]).toEqual([sim.mino, sim.player, sim.catches, sim.mode]);
      }
      expect(blocked).toBeGreaterThan(0);
    });
  }

  it("with nothing breakable runs tick for tick as without limits", () => {
    const walk = realMaze(8);
    const params: ChaseParams = { ...DEFAULT_CHASE_PARAMS, wake: 1 };
    const never = new Float64Array(walk.edges.length).fill(Infinity);
    const a = chasePlay(walk, params, 8, null, 120 * 40).sim;
    const b = chasePlay(walk, params, 8, never, 120 * 40).sim;
    expect([b.tick, b.mino, b.player, b.catches]).toEqual([a.tick, a.mino, a.player, a.catches]);
  });
});

describe("K137-b: refire", () => {
  // r 0.5, h 0: d = S 0, a 2, c 4, b 5, D 5, X 7; T = 2d.
  const w = graph(RUNS, "S", "X");
  const fire = buildFire(w, 0.5, 0);

  it("keeps the times the fire reached and burns on around the break", () => {
    const f = refire(w, fire, 5, (e) => e === 1);
    expect(Object.fromEntries(f.dist)).toEqual({ S: 0, a: 2, b: 6, X: 8, c: 4, D: 5 });
    expect([f.speed, f.delay, f.clock]).toEqual([fire.speed, fire.delay, fire.clock]);
  });

  it("never reaches a vertex cut off by broken runs", () => {
    const f = refire(w, fire, 4, (e) => e === 3 || e === 4);
    expect(f.dist.get("c")).toBe(Infinity);
    expect(f.dist.get("D")).toBe(Infinity);
    expect(fireTime(f, "D")).toBe(Infinity);
    expect(f.dist.get("X")).toBe(7);
  });

  it("is the identity with nothing broken, and only grows (real mazes)", () => {
    for (const seed of [2, 13, 29]) {
      const walk = realMaze(seed);
      const f0 = buildFire(walk, 0.6, 5);
      const rng = new SeededRNG(seed);
      for (let k = 0; k < 6; k++) {
        const L = rng.next() * 120;
        const same = refire(walk, f0, L, () => false);
        expect([...same.dist]).toEqual([...f0.dist]);
        const broken = new Set<number>();
        for (const e of walk.edges) if (rng.next() < 0.15) broken.add(e.id);
        const f = refire(walk, f0, L, (e) => broken.has(e));
        for (const [v, d0] of f0.dist) {
          const d = f.dist.get(v)!;
          expect(d).toBeGreaterThanOrEqual(d0);
          if (fireTime(f0, v) <= L) expect(d).toBe(d0);
        }
      }
    }
  });
});

describe("K137-b: the controller's fire after a break", () => {
  it("refires on each break, reset() restores the built fire, replay(taps) rebuilds it", () => {
    const walk = realMaze(6);
    const built = buildFire(walk, 0.3, 30);
    const c = new FabricMazeController(walk, false, built, { fragile: "snap" });
    const rng = new SeededRNG(66);
    let refired = 0;
    for (let i = 0; i < 40; i++) {
      const ch = c.choices();
      if (ch.length === 0) break;
      const before = c.fire;
      const r = c.tapEdge(ch[rng.nextInt(ch.length)]);
      if (r === "win") break;
      if (c.justBroke >= 0) {
        refired++;
        expect(c.fire).not.toBe(before);
        for (const [v, d0] of built.dist) expect(c.fire!.dist.get(v)!).toBeGreaterThanOrEqual(d0);
      }
    }
    expect(refired).toBeGreaterThan(0);
    const live = [...c.fire!.dist];
    const taps = [...c.taps];
    const r = new FabricMazeController(walk, false, built, { fragile: "snap" });
    expect(r.replay(taps)).toBe(true);
    expect([...r.fire!.dist]).toEqual(live);
    c.reset();
    expect(c.fire).toBe(built);
  });

  it("with fragile off the fire is the built one after any walk", () => {
    const walk = realMaze(6);
    const built = buildFire(walk, 0.3, 30);
    const c = new FabricMazeController(walk, false, built);
    const rng = new SeededRNG(67);
    for (let i = 0; i < 30; i++) {
      const ch = c.choices();
      if (ch.length === 0 || c.tapEdge(ch[rng.nextInt(ch.length)]) === "win") break;
    }
    expect(c.fire).toBe(built);
  });
});
