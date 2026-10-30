import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEAD_END_DENSITY_ON, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph, walkDistances } from "../../src/core/walk_graph";
import type { WalkGraph, WalkVertex, WalkEdge } from "../../src/core/walk_graph";
import { DEFAULT_CHASE_PARAMS, MinotaurChase, replayChase } from "../../src/game/minotaur";
import type { ChaseEvent, ChaseModel, ChaseParams } from "../../src/game/minotaur";
import { DEFAULT_TURN_MINO, turnConfig, TurnGraph, TurnMinotaur, turnSeed } from "../../src/game/minotaur_turns";
import type { TurnMinoParams } from "../../src/game/minotaur_turns";
import {
  newSword,
  optimalRouteVertices,
  runHops,
  swordSpend,
  swordSpot,
  swordTake,
  swordTouch,
  tailJunction,
  SWORD_RING_MAX,
  SWORD_RING_MIN,
} from "../../src/game/sword";

// K137 stage 3b (design 4.7; brief docs/design/K137_s3b.md, "Design"): the
// sword on both clocks.

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

const MAZES = new Map<number, WalkGraph>();
function realMaze(seed: number): WalkGraph {
  const hit = MAZES.get(seed);
  if (hit) return hit;
  const g = generateLatticeKnotwork({ gridSize: 10, weaveDensity: 0.3, turnBias: 0.6, randSeed: seed });
  const plan = buildMazePlan(g, { ...DEFAULT_MAZE_PARAMS, deadEndDensity: DEAD_END_DENSITY_ON });
  const hueGroup = applyMazePlan(g, plan);
  applyMazeCuts(g, plan, hueGroup);
  const w = buildWalkGraph(g)!;
  MAZES.set(seed, w);
  return w;
}

const MODELS = ["hunter", "guard", "stalker"] as const;
const SEEDS = Array.from({ length: 16 }, (_, i) => i + 1);

describe("K137 s3b: the sword's state", () => {
  it("is taken on its spot only, flees `moves` and is spent; a touch banishes or slays", () => {
    const s = newSword(7, "timed", 4);
    expect(swordTake(s, 6, 1)).toBe(false);
    expect(swordTake(s, 7, 2)).toBe(true);
    expect(s).toMatchObject({ phase: "fleeing", left: 4, takenAt: 2 });
    expect(swordTake(s, 7, 3)).toBe(false);
    swordSpend(s);
    swordSpend(s);
    swordSpend(s);
    expect(s).toMatchObject({ phase: "fleeing", left: 1 });
    swordSpend(s);
    expect(s).toMatchObject({ phase: "used", left: 0 });
    const t = newSword(7, "timed", 8);
    swordTake(t, 7, 1);
    expect(swordTouch(t, 4)).toBe("banish");
    expect(t).toMatchObject({ phase: "used", banished: 1, slainAt: -1 });
    const o = newSword(7, "oneuse", 8);
    swordTake(o, 7, 1);
    expect(swordTouch(o, 5)).toBe("slay");
    expect(o).toMatchObject({ phase: "slain", slainAt: 5, left: 0 });
    expect(newSword(1, "timed", 99).moves).toBe(20);
    expect(newSword(1, "timed", 1).moves).toBe(4);
  });
});

describe("K137 s3b: where the sword lies", () => {
  it("lies 4-8 runs off the optimal route, never on a tail's end or junction, tips first", () => {
    let found = 0;
    for (const seed of SEEDS) {
      const g = new TurnGraph(realMaze(seed)).chase;
      const spot = swordSpot(g, seed);
      expect(swordSpot(g, seed)).toBe(spot);
      if (spot < 0) continue;
      found++;
      const hop = runHops(g, optimalRouteVertices(g));
      expect(hop[spot]).toBeGreaterThanOrEqual(SWORD_RING_MIN);
      expect(hop[spot]).toBeLessThanOrEqual(SWORD_RING_MAX);
      const banned = [g.start, g.exit, tailJunction(g, g.start), tailJunction(g, g.exit)];
      expect(banned).not.toContain(spot);
      let tip = false;
      for (let v = 0; v < g.ids.length; v++) {
        if (g.isEnd[v] && !banned.includes(v) && hop[v] >= SWORD_RING_MIN && hop[v] <= SWORD_RING_MAX) tip = true;
      }
      if (tip) expect(g.isEnd[spot]).toBe(true);
    }
    expect(found).toBeGreaterThanOrEqual(12);
  });

  it("keeps clear of the lair by run hops or thread distance", () => {
    for (const seed of SEEDS) {
      const g = new TurnGraph(realMaze(seed)).chase;
      const exitJ = tailJunction(g, g.exit);
      const byHops = swordSpot(g, seed, { hops: 3 });
      if (byHops >= 0) expect(runHops(g, [exitJ])[byHops]).toBeGreaterThan(3);
      const byDist = swordSpot(g, seed, { dist: 30 });
      if (byDist >= 0) expect(g.from(exitJ, false)[byDist]).toBeGreaterThan(30);
    }
  });

  it("is none when nothing lies in the ring", () => {
    const w = graph(
      [
        ["S", "a", 2],
        ["a", "b", 3],
        ["b", "X", 2],
        ["a", "c", 2],
        ["c", "b", 2],
        ["c", "D", 1],
      ],
      "S",
      "X"
    );
    expect(swordSpot(new TurnGraph(w).chase, 1)).toBe(-1);
  });
});

// A turn game with the sword on the start tail's junction: the player waits
// `waits` turns on the start (it hides them) while the minotaur roams out,
// takes the sword with the first run and then chases it (each move to the
// run whose far end is fewest hops from it; never the exit tail).
function turnChase(
  walk: WalkGraph,
  model: (typeof MODELS)[number],
  byLength: boolean,
  seed: number,
  mode: "timed" | "oneuse",
  moves: number,
  waits: number,
  turns = 60
): { t: TurnMinotaur; fleeCatches: number; closer: number; touches: string[] } {
  const p: TurnMinoParams = { ...DEFAULT_TURN_MINO, model, byLength };
  const t = new TurnMinotaur(walk, turnConfig(p), turnSeed(seed));
  const g = t.g;
  const spot = tailJunction(g, g.start);
  t.setSword(newSword(spot, mode, moves));
  let fleeCatches = 0;
  let closer = 0;
  const touches: string[] = [];
  for (let i = 0; i < turns && !t.finished; i++) {
    let edge = -1;
    if (i >= waits) {
      let best = Infinity;
      for (const e of g.adj[t.player]) {
        const far = g.ea[e] === t.player ? g.eb[e] : g.ea[e];
        if (far === g.exit || g.blocked[e]) continue;
        const h = t.tg.hopd(far, t.state.v);
        if (h < best) {
          best = h;
          edge = e;
        }
      }
    }
    const fleeing = t.fleeing;
    const before = t.catches;
    const vBefore = t.state.v;
    t.turn(edge);
    t.setProgress(1);
    if (t.lastTouch) touches.push(t.lastTouch.kind);
    if (fleeing || t.fleeing) {
      if (t.catches > before) fleeCatches++;
      // Runs, speed one: its own step never closes in on where you moved.
      if (!byLength && t.fleeing && !t.lastTouch && t.tg.hopd(t.state.v, t.player) < t.tg.hopd(vBefore, t.player)) {
        closer++;
      }
    }
  }
  return { t, fleeCatches, closer, touches };
}

describe("K137 s3b: the sword on the turn clock", () => {
  for (const byLength of [false, true]) {
    const label = byLength ? "by length" : "by runs";
    it(`${label}: a flee never catches, steps away, and is spent after its moves`, () => {
      for (const model of MODELS) {
        for (const seed of SEEDS.slice(0, 8)) {
          const r = turnChase(realMaze(seed), model, byLength, seed, "timed", 6, 0, 8);
          expect(r.fleeCatches).toBe(0);
          expect(r.closer).toBe(0);
          const s = r.t.sword!;
          expect(s.takenAt).toBe(1);
          if (r.touches.length === 0) {
            expect(s.phase).toBe("used");
            expect(s.left).toBe(0);
          }
        }
      }
    });

    it(`${label}: a timed touch banishes it to its lair, a one-use touch slays it`, () => {
      let banished = 0;
      let slain = 0;
      for (const model of MODELS) {
        for (const seed of SEEDS) {
          const walk = realMaze(seed);
          const rb = turnChase(walk, model, byLength, seed, "timed", 20, 8);
          expect(rb.fleeCatches).toBe(0);
          if (rb.touches.includes("banish")) {
            banished++;
            expect(rb.t.sword!.phase).toBe("used");
            expect(rb.t.sword!.banished).toBe(1);
          }
          const ro = turnChase(walk, model, byLength, seed, "oneuse", 20, 8);
          expect(ro.fleeCatches).toBe(0);
          if (ro.touches.includes("slay")) {
            slain++;
            const t = ro.t;
            expect(t.slain).toBe(true);
            // Slain: no more catches, and it moves no more.
            const v = t.state.v;
            const c = t.catches;
            for (let i = 0; i < 6 && !t.finished; i++) {
              t.turn(-1);
              t.setProgress(1);
            }
            expect(t.state.v).toBe(v);
            expect(t.catches).toBe(c);
            expect(t.hunting).toBe(false);
          }
        }
      }
      expect(banished).toBeGreaterThan(0);
      expect(slain).toBeGreaterThan(0);
    });
  }

  it("a banish puts it in its lair with its life counted afresh", () => {
    let checked = 0;
    for (const model of MODELS) {
      for (const seed of SEEDS) {
        const walk = realMaze(seed);
        const p: TurnMinoParams = { ...DEFAULT_TURN_MINO, model };
        const t = new TurnMinotaur(walk, turnConfig(p), turnSeed(seed));
        const g = t.g;
        t.setSword(newSword(tailJunction(g, g.start), "timed", 20));
        for (let i = 0; i < 60 && !t.finished; i++) {
          let edge = -1;
          if (i >= 8) {
            let best = Infinity;
            for (const e of g.adj[t.player]) {
              const far = g.ea[e] === t.player ? g.eb[e] : g.ea[e];
              if (far === g.exit) continue;
              const h = t.tg.hopd(far, t.state.v);
              if (h < best) {
                best = h;
                edge = e;
              }
            }
          }
          t.turn(edge);
          if (t.lastTouch?.kind === "banish") {
            expect(t.state.v).toBe(g.exit);
            expect(t.lifeTurn).toBe(0);
            checked++;
            break;
          }
          t.setProgress(1);
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("an untaken sword changes nothing", () => {
    for (const byLength of [false, true]) {
      for (const model of MODELS) {
        const seed = 5;
        const walk = realMaze(seed);
        const p: TurnMinoParams = { ...DEFAULT_TURN_MINO, model, byLength };
        const a = new TurnMinotaur(walk, turnConfig(p), turnSeed(seed));
        const b = new TurnMinotaur(walk, turnConfig(p), turnSeed(seed));
        b.setSword(newSword(-1, "oneuse", 8));
        const g = a.g;
        for (let i = 0; i < 40 && !a.finished; i++) {
          const runs = g.adj[a.player].filter((e) => {
            const far = g.ea[e] === a.player ? g.eb[e] : g.ea[e];
            return far !== g.exit;
          });
          const edge = i % 5 === 4 || runs.length === 0 ? -1 : runs[i % runs.length];
          expect(b.turn(edge)).toBe(a.turn(edge));
          a.setProgress(1);
          b.setProgress(1);
          expect(b.state).toEqual(a.state);
          expect(b.catches).toBe(a.catches);
          expect(b.telegraph()).toEqual(a.telegraph());
        }
      }
    }
  });
});

// A real-time chase with the sword on the start tail's junction: the player
// stands on the start for `waitTicks`, then taps toward the minotaur at each
// vertex (never the exit tail).
function rtChase(
  walk: WalkGraph,
  model: ChaseModel,
  seed: number,
  mode: "timed" | "oneuse",
  moves: number,
  waitTicks: number,
  ticks: number
): { sim: MinotaurChase; events: ChaseEvent[]; fleeCatches: number } {
  const params: ChaseParams = { ...DEFAULT_CHASE_PARAMS, model, wake: 1 };
  const sim = new MinotaurChase(walk, params, seed);
  const g = sim.g;
  sim.setSword(newSword(tailJunction(g, g.start), mode, moves));
  const events: ChaseEvent[] = [];
  let fleeCatches = 0;
  for (let i = 0; i < ticks && !sim.finished; i++) {
    if (i >= waitTicks && !sim.playerMoving) {
      const v = g.index.get(sim.decisionVertex)!;
      let best = Infinity;
      let edge = -1;
      for (const e of g.adj[v]) {
        const far = g.ea[e] === v ? g.eb[e] : g.ea[e];
        if (far === g.exit) continue;
        const d = g.spotToVertex(sim.mino, far, false);
        if (d < best) {
          best = d;
          edge = e;
        }
      }
      if (edge >= 0) sim.tap(edge);
    }
    const fleeing = sim.fleeing;
    const out = sim.step([]);
    for (const e of out) {
      events.push(e);
      if (fleeing && e.kind === "caught") fleeCatches++;
    }
  }
  return { sim, events, fleeCatches };
}

describe("K137 s3b: the sword in real time", () => {
  it("taking it turns the minotaur away; a touch banishes (timed) or slays (one-use), never catches", () => {
    let banished = 0;
    let slain = 0;
    for (const model of MODELS) {
      for (const seed of SEEDS.slice(0, 10)) {
        const walk = realMaze(seed);
        const rb = rtChase(walk, model, seed, "timed", 20, 1800, 120 * 90);
        expect(rb.fleeCatches).toBe(0);
        const kinds = rb.events.filter((e) => e.kind === "sword").map((e) => (e as { what: string }).what);
        if (kinds.includes("taken")) expect(kinds[0]).toBe("taken");
        if (kinds.includes("banish")) {
          banished++;
          expect(rb.sim.sword!.phase).toBe("used");
          expect(rb.sim.lastTouch?.kind).toBe("banish");
        }
        const ro = rtChase(walk, model, seed, "oneuse", 20, 1800, 120 * 90);
        expect(ro.fleeCatches).toBe(0);
        if (ro.sim.slain) {
          slain++;
          const sim = ro.sim;
          const m = { ...sim.mino };
          const c = sim.catches;
          for (let i = 0; i < 600; i++) sim.step();
          expect(sim.mino).toEqual(m);
          expect(sim.catches).toBe(c);
          expect(sim.plan(8).steps.length).toBe(0);
        }
      }
    }
    expect(banished).toBeGreaterThan(0);
    expect(slain).toBeGreaterThan(0);
  });

  it("the flee spends one per run walked, and its plan leads away", () => {
    for (const model of MODELS) {
      const seed = 3;
      const walk = realMaze(seed);
      const params: ChaseParams = { ...DEFAULT_CHASE_PARAMS, model, wake: 1 };
      const sim = new MinotaurChase(walk, params, seed);
      const g = sim.g;
      sim.setSword(newSword(tailJunction(g, g.start), "timed", 5));
      const pick = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      let arrivals = 0;
      let takenAt = -1;
      for (let i = 0; i < 120 * 60 && !sim.finished; i++) {
        if (i >= 1200 && !sim.playerMoving) {
          const v = g.index.get(sim.decisionVertex)!;
          const runs = g.adj[v].filter((e) => (g.ea[e] === v ? g.eb[e] : g.ea[e]) !== g.exit);
          if (runs.length > 0) sim.tap(runs[pick[arrivals % pick.length] % runs.length]);
        }
        for (const e of sim.step([])) {
          if (e.kind === "arrive") arrivals++;
          if (e.kind === "sword" && e.what === "taken") takenAt = arrivals;
          if (e.kind === "sword" && e.what === "spent") {
            expect(arrivals - takenAt).toBe(5);
          }
        }
        if (sim.fleeing && i % 7 === 0) {
          const plan = sim.plan(4);
          for (const [eid] of plan.steps) {
            expect(g.barred[eid]).toBe(0);
          }
        }
      }
      expect(takenAt).toBeGreaterThan(0);
    }
  });

  it("replays bit for bit with the sword, and an untaken one changes nothing", () => {
    for (const model of MODELS) {
      const seed = 4;
      const walk = realMaze(seed);
      const params: ChaseParams = { ...DEFAULT_CHASE_PARAMS, model, wake: 1 };
      const r = rtChase(walk, model, seed, "oneuse", 12, 900, 120 * 60);
      const g = r.sim.g;
      const replay = replayChase(walk, params, seed, r.sim.inputs, r.sim.tick, null, {
        spot: tailJunction(g, g.start),
        mode: "oneuse",
        moves: 12,
      });
      expect(replay.mino).toEqual(r.sim.mino);
      expect(replay.player).toEqual(r.sim.player);
      expect(replay.catches).toBe(r.sim.catches);
      expect(replay.sword).toEqual(r.sim.sword);
      // An untaken sword: the same taps with no sword, tick for tick.
      const a = new MinotaurChase(walk, params, seed);
      const b = new MinotaurChase(walk, params, seed);
      b.setSword(newSword(-1, "timed", 8));
      let k = 0;
      const inputs = r.sim.inputs;
      for (let i = 0; i < 120 * 40; i++) {
        while (k < inputs.length && inputs[k].tick === a.tick) {
          a.tap(inputs[k].edge);
          b.tap(inputs[k].edge);
          k++;
        }
        a.step();
        b.step();
      }
      expect(b.mino).toEqual(a.mino);
      expect(b.mode).toBe(a.mode);
      expect(b.catches).toBe(a.catches);
    }
  });
});

describe("K747: the sword's move numbers under a sprint", () => {
  it("takenAt and slainAt count player moves, not minotaur turns", () => {
    let slain = 0;
    for (const model of MODELS) {
      for (const seed of SEEDS) {
        const walk = realMaze(seed);
        const p: TurnMinoParams = { ...DEFAULT_TURN_MINO, model };
        const t = new TurnMinotaur(walk, turnConfig(p), turnSeed(seed));
        const g = t.g;
        const spot = tailJunction(g, g.start);
        t.setSword(newSword(spot, "oneuse", 20));
        // Eight waits let it roam out (turnChase's setup), then a sprint
        // pair walks onto the sword's spot: the skipped move first.
        for (let i = 0; i < 8; i++) t.turn(-1);
        const toward = (from: number, goal: number): number => {
          let edge = -1;
          let best = Infinity;
          for (const e of g.adj[from]) {
            const far = g.ea[e] === from ? g.eb[e] : g.ea[e];
            if (g.blocked[e]) continue;
            const h = t.tg.hopd(far, goal);
            if (h < best) {
              best = h;
              edge = e;
            }
          }
          return edge;
        };
        let tookOnSkip = false;
        for (let s = 0; s < 2 && t.sword!.phase === "ready"; s++) {
          const e = toward(t.player, spot);
          if (e < 0) break;
          const far = g.ea[e] === t.player ? g.eb[e] : g.ea[e];
          t.turn(e, s === 0 ? { sprint: "skip" } : undefined);
          t.setProgress(1);
          if (far === spot && s === 0) tookOnSkip = true;
        }
        if (t.sword!.phase !== "fleeing") continue;
        expect(tookOnSkip).toBe(true);
        expect(t.sword!.takenAt).toBe(t.inputs.length);
        expect(t.sword!.takenAt).toBe(t.turns + 1);
        // Chase it (turnChase's policy); a touch slays it.
        for (let i = 0; i < 60 && !t.finished && t.sword!.phase === "fleeing"; i++) {
          t.turn(toward(t.player, t.state.v));
          t.setProgress(1);
          if (t.lastTouch?.kind === "slay") {
            expect(t.sword!.slainAt).toBe(t.inputs.length);
            expect(t.sword!.slainAt).toBe(t.turns + 1);
            slain++;
          }
        }
      }
    }
    expect(slain).toBeGreaterThan(0);
  });
});
