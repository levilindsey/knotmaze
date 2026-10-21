import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEAD_END_DENSITY_ON, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph, walkDistances } from "../../src/core/walk_graph";
import type { WalkGraph, WalkVertex, WalkEdge } from "../../src/core/walk_graph";
import { CHASE_HZ, DEFAULT_CHASE_PARAMS, MinotaurChase, replayChase } from "../../src/game/minotaur";
import type { ChaseParams } from "../../src/game/minotaur";
import {
  BY_LENGTH_TRAVEL_SCALE,
  DEFAULT_TURN_MINO,
  replayTurnMinotaur,
  turnConfig,
  TurnMinotaur,
  turnSeed,
} from "../../src/game/minotaur_turns";
import type { TurnMinoParams } from "../../src/game/minotaur_turns";
import { sprintAfterMove, sprintKeyOf, sprintToggle, sprintValue } from "../../src/game/sprint";
import type { SprintState } from "../../src/game/sprint";

// K137 stage 3c (design 4.29; brief docs/design/K137_s3c.md): sprint on both
// clocks, and the button's state machine main.ts runs.

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
const SEEDS = Array.from({ length: 12 }, (_, i) => i + 1);

describe("K137 s3c: sprint's state machine and key", () => {
  it("arms, disarms on the turn clock only, and is spent by its second move", () => {
    expect(sprintToggle("ready", false)).toBe("armed");
    expect(sprintToggle("armed", false)).toBe("ready");
    expect(sprintToggle("armed", true)).toBe("armed");
    expect(sprintToggle("first", false)).toBe("first");
    expect(sprintToggle("used", false)).toBe("used");
    expect(sprintToggle("used", true)).toBe("used");
    // Armed, a run is the skipped move; a wait keeps it armed.
    const a = sprintAfterMove("armed", true);
    expect(a.skip).toBe(true);
    expect(a.next("moved")).toBe("first");
    expect(a.next("caught")).toBe("used");
    expect(a.next("win")).toBe("used");
    const w = sprintAfterMove("armed", false);
    expect(w.skip).toBe(false);
    expect(w.next("moved")).toBe("armed");
    expect(w.next("caught")).toBe("used"); // a catch spends an armed sprint
    // The second move, run or wait, spends it whatever the answer.
    for (const run of [true, false]) {
      const f = sprintAfterMove("first", run);
      expect(f.skip).toBe(false);
      expect(f.next("moved")).toBe("used");
      expect(f.next("caught")).toBe("used");
    }
    for (const s of ["ready", "used"] as SprintState[]) {
      const r = sprintAfterMove(s, true);
      expect(r.skip).toBe(false);
      expect(r.next("moved")).toBe(s);
    }
    expect(sprintValue("ready")).toBe("ready");
    expect(sprintValue("first")).toBe("1 more move");
    expect(sprintValue("first", true)).toBe("running");
    expect(sprintValue("used", true)).toBe("used");
    expect(sprintKeyOf({ key: "f" })).toBe(true);
    expect(sprintKeyOf({ key: "F" })).toBe(true);
    expect(sprintKeyOf({ key: "q" })).toBe(false);
  });
});

// A turn game: a counter-picked walk (never a wait, the k-th move takes
// the run `k mod degree`), sprinting at moves `at` (the skip, then one more
// move as the sprint's second).
function turnGame(
  walk: WalkGraph,
  p: TurnMinoParams,
  seed: number,
  at: number[],
  moves = 40
): { t: TurnMinotaur; pairs: { before: number; after: number; still: boolean; travel: number; half: number }[] } {
  const t = new TurnMinotaur(walk, turnConfig(p), turnSeed(seed));
  const g = t.g;
  const pairs: { before: number; after: number; still: boolean; travel: number; half: number }[] = [];
  let k = 0;
  const pick = (): number => {
    const runs = g.adj[t.player];
    return runs[(k * 7 + 3) % runs.length];
  };
  for (let i = 0; i < moves && !t.finished; i++, k++) {
    if (at.includes(i)) {
      const before = t.turns;
      const v0 = t.state.v;
      const spot = JSON.stringify(t.state.spot);
      const e1 = pick();
      const l1 = g.len[e1];
      const r1 = t.turn(e1, { sprint: "skip" });
      t.setProgress(1);
      expect(r1).not.toBe("reject");
      if (r1 !== "moved") continue;
      // The skipped move: no turn, no draw, it stood.
      expect(t.turns).toBe(before);
      expect(t.sprintPending).toBe(true);
      const still = t.state.v === v0 && JSON.stringify(t.state.spot) === spot;
      k++;
      const e2 = pick();
      const l2 = g.len[e2];
      t.turn(e2);
      t.setProgress(1);
      expect(t.sprintPending).toBe(false);
      pairs.push({ before, after: t.turns, still, travel: t.lastTravel, half: ((l1 + l2) / 2) * BY_LENGTH_TRAVEL_SCALE });
      continue;
    }
    t.turn(pick());
    t.setProgress(1);
  }
  return { t, pairs };
}

describe("K137 s3c: sprint on the turn clock", () => {
  for (const byLength of [false, true]) {
    const label = byLength ? "by length" : "by runs";
    it(`${label}: two moves make one minotaur turn, and it stands through the first`, () => {
      let pairs = 0;
      let halves = 0;
      for (const model of MODELS) {
        for (const seed of SEEDS) {
          const p: TurnMinoParams = { ...DEFAULT_TURN_MINO, model, byLength };
          const r = turnGame(realMaze(seed), p, seed, [3, 11, 20]);
          for (const q of r.pairs) {
            pairs++;
            expect(q.after).toBe(q.before + 1);
            expect(q.still).toBe(true);
            if (byLength) {
              // Speed one: the pair's turn travels half the summed length
              // (less only where a hunting route stops at you).
              expect(q.travel).toBeLessThanOrEqual(q.half + 1e-9);
              if (Math.abs(q.travel - q.half) < 1e-9) halves++;
            }
          }
        }
      }
      expect(pairs).toBeGreaterThan(40);
      if (byLength) expect(halves).toBeGreaterThan(pairs / 2);
    });

    it(`${label}: a skipped move walks into it only where it stands`, () => {
      let standCatches = 0;
      for (const model of MODELS) {
        for (const seed of SEEDS) {
          const p: TurnMinoParams = { ...DEFAULT_TURN_MINO, model, byLength };
          const t = new TurnMinotaur(realMaze(seed), turnConfig(p), turnSeed(seed));
          const g = t.g;
          // Walk toward it, skipping every other move: some skips arrive
          // where it stands.
          for (let i = 0; i < 80 && !t.finished; i++) {
            let edge = g.adj[t.player][0];
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
            const far = g.ea[edge] === t.player ? g.eb[edge] : g.ea[edge];
            const skip = !t.sprintPending && t.state.spot.edge < 0;
            const m = t.state.v;
            const before = t.catches;
            const r = t.turn(edge, skip ? { sprint: "skip" } : undefined);
            t.setProgress(1);
            if (!skip) continue;
            if (!byLength && far !== g.start && far === m) {
              expect(r).toBe("caught");
            }
            if (r === "caught") {
              expect(t.catches).toBe(before + 1);
              if (!byLength) expect(far).toBe(m);
              standCatches++;
            }
          }
        }
      }
      expect(standCatches).toBeGreaterThan(0);
    });

    it(`${label}: replays from its inputs and skips, and a skip is refused mid-sprint`, () => {
      for (const model of MODELS) {
        for (const seed of SEEDS.slice(0, 6)) {
          const walk = realMaze(seed);
          const p: TurnMinoParams = { ...DEFAULT_TURN_MINO, model, byLength };
          const r = turnGame(walk, p, seed, [2, 9, 17, 30]);
          const t = r.t;
          expect(t.skips.length).toBeGreaterThan(0);
          const back = replayTurnMinotaur(walk, turnConfig(p), turnSeed(seed), t.inputs, t.skips);
          expect(back.state).toEqual(t.state);
          expect(back.player).toBe(t.player);
          expect(back.turns).toBe(t.turns);
          expect(back.catches).toBe(t.catches);
          expect(back.closeCalls).toBe(t.closeCalls);
          expect(back.skips).toEqual(t.skips);
        }
      }
      // A second skip while one is pending is refused, and so is a waiting one.
      const walk = realMaze(1);
      const t = new TurnMinotaur(walk, turnConfig({ ...DEFAULT_TURN_MINO, byLength }), turnSeed(1));
      expect(t.turn(-1, { sprint: "skip" })).toBe("reject");
      const e = t.g.adj[t.player][0];
      expect(t.turn(e, { sprint: "skip" })).toBe("moved");
      t.setProgress(1);
      expect(t.turn(t.g.adj[t.player][0], { sprint: "skip" })).toBe("reject");
    });
  }
});

// A chain far from the lair: S -0(4)- A -1(12)- B -2(12)- C -3(12)- D
// -4(30)- E -5(4)- X; the minotaur sleeps in its lair (wake 1000 s).
const CHAIN = graph(
  [
    ["S", "A", 4],
    ["A", "B", 12],
    ["B", "C", 12],
    ["C", "D", 12],
    ["D", "E", 30],
    ["E", "X", 4],
  ],
  "S",
  "X"
);

describe("K137 s3c: sprint in real time", () => {
  it("runs the next two departures at twice the pace, then the pace again", () => {
    const params: ChaseParams = { ...DEFAULT_CHASE_PARAMS, wake: 1000 };
    const sim = new MinotaurChase(CHAIN, params, 5);
    const ticksFor = (edge: number): number => {
      expect(sim.tap(edge)).toBe("queued");
      let n = 0;
      for (;;) {
        n++;
        const out = sim.step([]);
        if (out.some((e) => e.kind === "arrive")) return n;
        if (n > 10 * CHASE_HZ) throw new Error("never arrived");
      }
    };
    ticksFor(0);
    const plain = ticksFor(1); // 12 u at playerPace
    expect(sim.sprint()).toBe("armed");
    expect(sim.sprintActive).toBe(true);
    expect(sim.sprint()).toBe("reject");
    const s1 = ticksFor(2);
    expect(sim.playerSpeed).toBe(params.playerPace);
    const s2 = ticksFor(3);
    expect(sim.sprintActive).toBe(false);
    expect(Math.abs(s1 - plain / 2)).toBeLessThanOrEqual(1);
    expect(Math.abs(s2 - plain / 2)).toBeLessThanOrEqual(1);
    // Back at the pace: run 3 again, from D to C.
    const after = ticksFor(3);
    expect(Math.abs(after - plain)).toBeLessThanOrEqual(1);
    expect(sim.sprints).toEqual([sim.sprints[0]]);
  });

  it("a catch ends a sprint; replays bit for bit with its sprints", () => {
    let caughtSprinting = 0;
    for (const model of MODELS) {
      for (const seed of SEEDS.slice(0, 8)) {
        const walk = realMaze(seed);
        const params: ChaseParams = { ...DEFAULT_CHASE_PARAMS, model, wake: 1 };
        const sim = new MinotaurChase(walk, params, seed);
        const g = sim.g;
        let armed = false;
        for (let i = 0; i < 120 * 60 && !sim.finished; i++) {
          if (i >= 240 && !sim.playerMoving) {
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
          // Sprint whenever the minotaur is within 30 u and none runs.
          if (i >= 240 && !sim.sprintActive && sim.contactDistance() < 30) {
            if (sim.sprint() === "armed") armed = true;
          }
          const active = sim.sprintActive;
          const out = sim.step([]);
          if (out.some((e) => e.kind === "caught")) {
            expect(sim.sprintActive).toBe(false);
            if (active) caughtSprinting++;
          }
        }
        expect(armed).toBe(true);
        const back = replayChase(walk, params, seed, sim.inputs, sim.tick, null, null, sim.sprints);
        expect(back.mino).toEqual(sim.mino);
        expect(back.player).toEqual(sim.player);
        expect(back.catches).toBe(sim.catches);
        expect(back.sprints).toEqual(sim.sprints);
        expect(back.sprintActive).toBe(sim.sprintActive);
      }
    }
    expect(caughtSprinting).toBeGreaterThan(0);
  });

  it("no sprint changes nothing: the same taps, tick for tick", () => {
    const walk = realMaze(4);
    const params: ChaseParams = { ...DEFAULT_CHASE_PARAMS, wake: 1 };
    const a = new MinotaurChase(walk, params, 4);
    const b = replayChase(walk, params, 4, [], 0, null, null, []);
    for (let i = 0; i < 120 * 20; i++) {
      a.step();
      b.step();
    }
    expect(b.mino).toEqual(a.mino);
    expect(b.mode).toBe(a.mode);
  });
});
