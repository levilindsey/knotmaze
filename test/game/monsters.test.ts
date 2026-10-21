import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEAD_END_DENSITY_ON, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph, walkDistances } from "../../src/core/walk_graph";
import type { WalkGraph, WalkVertex, WalkEdge } from "../../src/core/walk_graph";
import {
  DEFAULT_TURN_MINO,
  replayTurnMinotaur,
  turnConfig,
  turnMinoDefaults,
  TurnMinotaur,
  turnSeed,
} from "../../src/game/minotaur_turns";
import type { TurnMinoParams, TurnResult } from "../../src/game/minotaur_turns";
import {
  FOLLOW_DELAY_MAX,
  FOLLOW_DELAY_MIN,
  followDelay,
  monsterKinds,
  monsterSpecs,
  SLEEPER_RING_MAX,
  SLEEPER_RING_MIN,
  sleeperSpots,
  sleepersOf,
} from "../../src/game/monsters";
import type { MonsterSpec } from "../../src/game/monsters";
import { optimalRouteVertices, runHops, tailJunction } from "../../src/game/sword";

// K137 stage 3d (design 4.9 and Levi's follower; brief docs/design/K137_s3d.md):
// more than one monster on the turn clock, sleepers and the follower.

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

const SEEDS = Array.from({ length: 12 }, (_, i) => i + 1);
const MODELS = ["hunter", "guard", "stalker"] as const;

// A minotaur that never leaves its lair, a best step every time, no pause:
// the extras play alone and decide deterministically.
const QUIET: TurnMinoParams = { ...DEFAULT_TURN_MINO, model: "hunter", accuracy: 1, pause: 0, sleep: 100000 };

// S - A - B - C - D - X (the exit), every run length 2.
function line(): WalkGraph {
  return graph(
    [
      ["S", "A", 2],
      ["A", "B", 2],
      ["B", "C", 2],
      ["C", "D", 2],
      ["D", "X", 2],
    ],
    "S",
    "X"
  );
}

function seedWithDelay(d: number): number {
  for (let s = 1; s < 500; s++) if (followDelay(s, 0) === d) return s;
  throw new Error("no seed");
}

// Walk the named vertices in order (a repeated name is a wait).
function walkTo(t: TurnMinotaur, names: string[]): TurnResult[] {
  const g = t.g;
  const out: TurnResult[] = [];
  for (const n of names) {
    const v = g.index.get(n)!;
    if (v === t.player) {
      out.push(t.turn(-1));
      continue;
    }
    const e = g.adj[t.player].find((x) => g.ea[x] === v || g.eb[x] === v);
    if (e === undefined) throw new Error(`no run to ${n}`);
    out.push(t.turn(e));
  }
  return out;
}

describe("K137 s3d: where the monsters sleep", () => {
  it("lays distinct junctions 1-3 runs off the route, clear of the start, the exit, the tails and the lair", () => {
    let total = 0;
    for (const s of SEEDS) {
      const w = realMaze(s);
      const t = new TurnMinotaur(w, turnConfig(turnMinoDefaults("hunter")), turnSeed(s));
      const g = t.g;
      const route = optimalRouteVertices(g);
      const hop = runHops(g, route);
      const startJ = tailJunction(g, g.start);
      const exitJ = tailJunction(g, g.exit);
      const nearStart = runHops(g, [startJ]);
      const nearExit = runHops(g, [exitJ]);
      const spots = sleeperSpots(g, s, 3, { hops: 1 });
      expect(spots.length).toBeLessThanOrEqual(3);
      expect(new Set(spots).size).toBe(spots.length);
      for (const v of spots) {
        expect(g.isEnd[v]).toBe(false);
        expect([g.start, g.exit, startJ, exitJ]).not.toContain(v);
        expect(hop[v]).toBeGreaterThanOrEqual(SLEEPER_RING_MIN);
        expect(hop[v]).toBeLessThanOrEqual(SLEEPER_RING_MAX);
        expect(nearStart[v]).toBeGreaterThan(1);
        expect(nearExit[v]).toBeGreaterThan(1);
      }
      // Deterministic, and one sleeper is the first of three.
      expect(sleeperSpots(g, s, 3, { hops: 1 })).toEqual(spots);
      expect(sleeperSpots(g, s, 1, { hops: 1 })).toEqual(spots.slice(0, 1));
      // A distance avoid (real time's guard) keeps clear by thread.
      const dEx = g.from(exitJ, false);
      for (const v of sleeperSpots(g, s, 3, { dist: 30 })) expect(dEx[v]).toBeGreaterThan(30);
      total += spots.length;
    }
    expect(total).toBe(SEEDS.length * 3); // Real mazes have room for three.
  });

  it("clamps the count and draws none at 0", () => {
    expect(sleepersOf(-2)).toBe(0);
    expect(sleepersOf(2.4)).toBe(2);
    expect(sleepersOf(9)).toBe(3);
    expect(sleepersOf(NaN)).toBe(0);
    const t = new TurnMinotaur(realMaze(1), turnConfig(turnMinoDefaults("hunter")), turnSeed(1));
    expect(sleeperSpots(t.g, 1, 0)).toEqual([]);
    expect(monsterSpecs(t.g, 1, 0, "both")).toEqual([]);
  });

  it("gives every kind, alternating under both, and a follower delay of 1 or 2", () => {
    expect(monsterKinds(5, 3, "wake")).toEqual(["sleeper", "sleeper", "sleeper"]);
    expect(monsterKinds(5, 2, "follow")).toEqual(["follower", "follower"]);
    const firsts = new Set<string>();
    for (const s of SEEDS) {
      const k = monsterKinds(s, 3, "both");
      expect(k[1]).not.toBe(k[0]);
      expect(k[2]).toBe(k[0]);
      firsts.add(k[0]);
    }
    expect(firsts.size).toBe(2);
    const delays = new Set<number>();
    for (let s = 1; s <= 40; s++) {
      const d = followDelay(s, 0);
      expect(d).toBeGreaterThanOrEqual(FOLLOW_DELAY_MIN);
      expect(d).toBeLessThanOrEqual(FOLLOW_DELAY_MAX);
      delays.add(d);
    }
    expect(delays.size).toBe(2);
  });
});

describe("K137 s3d: sleepers on the turn clock", () => {
  const B = (t: TurnMinotaur): MonsterSpec[] => [{ kind: "sleeper", home: t.g.index.get("B")! }];

  it("wakes when you step onto its junction, without a catch on that move", () => {
    const t = new TurnMinotaur(line(), turnConfig(QUIET), turnSeed(3));
    t.setMonsters(B(t), 3);
    expect(walkTo(t, ["A"])).toEqual(["moved"]);
    expect(t.extras[0].phase).toBe("asleep");
    expect(t.woken).toBe(0);
    expect(walkTo(t, ["B"])).toEqual(["moved"]);
    expect(t.extras[0].phase).toBe("awake");
    expect(t.woken).toBe(1);
  });

  it("catches a wait on its junction, and a catch resets every monster", () => {
    const t = new TurnMinotaur(line(), turnConfig(QUIET), turnSeed(3));
    t.setMonsters(B(t), 3);
    expect(walkTo(t, ["A", "B", "B"])).toEqual(["moved", "moved", "caught"]);
    expect(t.catches).toBe(1);
    expect(t.lastCatcher).toBe(0);
    expect(t.player).toBe(t.g.start);
    expect(t.lastContact).not.toBeNull();
    expect(t.extras[0].phase).toBe("asleep");
    expect(t.extras[0].state.v).toBe(t.g.index.get("B"));
    expect(t.state.left).toBe(false); // The minotaur is back in its lair.
    expect(t.woken).toBe(1); // A catch keeps the tally.
  });

  it("hunts you once awake: one run behind, it catches a backtrack", () => {
    const t = new TurnMinotaur(line(), turnConfig(QUIET), turnSeed(3));
    t.setMonsters(B(t), 3);
    // It holds on its own junction (a best step toward you is none), then
    // follows one run behind.
    expect(walkTo(t, ["A", "B", "C", "D"])).toEqual(["moved", "moved", "moved", "moved"]);
    expect(t.extras[0].state.v).toBe(t.g.index.get("C"));
    expect(walkTo(t, ["C"])).toEqual(["caught"]);
  });

  it("stands on a sprint's skipped move", () => {
    const t = new TurnMinotaur(line(), turnConfig(QUIET), turnSeed(3));
    t.setMonsters(B(t), 3);
    walkTo(t, ["A", "B", "C"]);
    const at = t.extras[0].state.v;
    const g = t.g;
    const e = g.adj[t.player].find((x) => g.ea[x] === g.index.get("D") || g.eb[x] === g.index.get("D"))!;
    expect(t.turn(e, { sprint: "skip" })).toBe("moved");
    expect(t.extras[0].state.v).toBe(at);
    expect(t.extras[0].lastPath).toEqual([]);
  });

  it("animates along its step, and stands at its vertex once the move ends", () => {
    const t = new TurnMinotaur(line(), turnConfig(QUIET), turnSeed(3));
    t.setMonsters(B(t), 3);
    walkTo(t, ["A", "B", "C", "D"]);
    const x = t.extras[0];
    expect(x.lastPath.length).toBe(1);
    t.setProgress(0.5);
    const mid = t.extraSpot(0);
    expect(mid.edge).toBe(x.lastPath[0][0]);
    expect(mid.pos).toBeCloseTo(1, 9);
    t.setProgress(1);
    expect(t.extraSpot(0)).toMatchObject({ edge: -1, vertex: x.state.v });
  });
});

describe("K137 s3d: the follower on the turn clock", () => {
  const A = (t: TurnMinotaur): MonsterSpec[] => [{ kind: "follower", home: t.g.index.get("A")! }];

  it("sets off when you leave its junction, appears a move later and catches a backtrack (delay 1)", () => {
    const seed = seedWithDelay(1);
    const t = new TurnMinotaur(line(), turnConfig(QUIET), turnSeed(seed));
    t.setMonsters(A(t), seed);
    expect(walkTo(t, ["A"])).toEqual(["moved"]);
    expect(t.extras[0].phase).toBe("asleep"); // Passing does not wake it.
    walkTo(t, ["B"]);
    expect(t.extras[0].phase).toBe("waiting");
    walkTo(t, ["C"]);
    expect(t.extras[0].phase).toBe("awake");
    expect(t.extras[0].state.v).toBe(t.g.index.get("B"));
    expect(walkTo(t, ["B"])).toEqual(["caught"]); // Head-on on B-C.
    expect(t.extras[0].phase).toBe("asleep");
    expect(t.extras[0].state.v).toBe(t.g.index.get("A"));
  });

  it("waits two moves at delay 2 and walks your trail two behind", () => {
    const seed = seedWithDelay(2);
    const t = new TurnMinotaur(line(), turnConfig(QUIET), turnSeed(seed));
    t.setMonsters(A(t), seed);
    walkTo(t, ["A", "B", "C"]);
    expect(t.extras[0].phase).toBe("waiting");
    walkTo(t, ["D"]);
    expect(t.extras[0].phase).toBe("awake");
    expect(t.extras[0].state.v).toBe(t.g.index.get("B"));
    expect(walkTo(t, ["C"])).toEqual(["caught"]); // You end where it ends.
  });

  it("loses you at the entrance, walks home and sleeps again", () => {
    const seed = seedWithDelay(1);
    const t = new TurnMinotaur(line(), turnConfig(QUIET), turnSeed(seed));
    t.setMonsters([{ kind: "follower", home: t.g.index.get("B")! }], seed);
    expect(walkTo(t, ["A", "B", "A", "S"])).toEqual(["moved", "moved", "moved", "moved"]);
    expect(t.extras[0].phase).toBe("awake");
    expect(t.extras[0].state.v).toBe(t.g.index.get("A"));
    walkTo(t, ["S", "S"]);
    expect(t.extras[0].phase).toBe("asleep");
    expect(t.extras[0].state.v).toBe(t.g.index.get("B"));
    expect(t.catches).toBe(0);
  });
});

// A scripted walk: the k-th move takes run (k*7+3) mod degree, every 9th a
// wait.
function play(
  walk: WalkGraph,
  p: TurnMinoParams,
  seed: number,
  specs: (t: TurnMinotaur) => MonsterSpec[],
  moves = 160
): { t: TurnMinotaur; results: TurnResult[]; trace: string[] } {
  const t = new TurnMinotaur(walk, turnConfig(p), turnSeed(seed));
  t.setMonsters(specs(t), seed);
  const g = t.g;
  const results: TurnResult[] = [];
  const trace: string[] = [];
  for (let k = 0; k < moves && !t.finished; k++) {
    const runs = g.adj[t.player];
    const r = t.turn(k % 9 === 8 ? -1 : runs[(k * 7 + 3) % runs.length]);
    results.push(r);
    trace.push(
      `${r}|${t.lastFrom}|${t.lastPath.map((s) => s.join(">")).join(",")}|${t.state.v}|${t.player}|${t.catches}|${t.lastCatcher}`
    );
  }
  return { t, results, trace };
}

describe("K137 s3d: the monster list keeps the minotaur's game", () => {
  it("an empty list plays every model exactly as before", () => {
    for (const s of SEEDS.slice(0, 6)) {
      for (const model of MODELS) {
        const p = turnMinoDefaults(model);
        const a = play(realMaze(s), p, s, () => []);
        const t = new TurnMinotaur(realMaze(s), turnConfig(p), turnSeed(s));
        const g = t.g;
        const trace: string[] = [];
        for (let k = 0; k < 160 && !t.finished; k++) {
          const runs = g.adj[t.player];
          const r = t.turn(k % 9 === 8 ? -1 : runs[(k * 7 + 3) % runs.length]);
          trace.push(
            `${r}|${t.lastFrom}|${t.lastPath.map((x) => x.join(">")).join(",")}|${t.state.v}|${t.player}|${t.catches}|${t.lastCatcher}`
          );
        }
        expect(a.trace).toEqual(trace);
      }
    }
  });

  it("the minotaur's own turns are unchanged by extras until an extra catches", () => {
    let wakes = 0;
    let extraCatches = 0;
    for (const s of SEEDS) {
      for (const model of MODELS) {
        const p = turnMinoDefaults(model);
        const base = play(realMaze(s), p, s, () => []);
        const withX = play(realMaze(s), p, s, (t) => monsterSpecs(t.g, s, 3, "both", { hops: 1 }));
        let n = 0;
        for (; n < withX.trace.length; n++) {
          if (withX.results[n] === "caught" && withX.t.lastCatcher >= 0 && withX.trace[n].endsWith(`|${withX.t.lastCatcher}`)) break;
          if (withX.trace[n].split("|")[6] !== "-1") break;
          expect(withX.trace[n]).toBe(base.trace[n]);
        }
        wakes += withX.t.woken;
        if (withX.t.lastCatcher >= 0) extraCatches++;
      }
    }
    expect(wakes).toBeGreaterThan(0);
    expect(extraCatches).toBeGreaterThan(0);
  });

  it("extras never stand on the start or the exit, sleep at home, and replay from the taps", () => {
    for (const s of SEEDS) {
      for (const byLength of [false, true]) {
        const p = { ...turnMinoDefaults("hunter"), byLength };
        const specs = (t: TurnMinotaur): MonsterSpec[] => monsterSpecs(t.g, s, 3, "both", { hops: 1 });
        const t = new TurnMinotaur(realMaze(s), turnConfig(p), turnSeed(s));
        t.setMonsters(specs(t), s);
        const g = t.g;
        for (let k = 0; k < 200 && !t.finished; k++) {
          const runs = g.adj[t.player];
          const r = t.turn(k % 9 === 8 ? -1 : runs[(k * 5 + 1) % runs.length], k % 23 === 4 ? { sprint: "skip" } : undefined);
          for (const x of t.extras) {
            expect(x.state.v).not.toBe(g.start);
            expect(x.state.v).not.toBe(g.exit);
            if (x.phase === "asleep") expect(x.state.v).toBe(x.home);
          }
          if (r === "caught" && t.lastCatcher >= 0) expect(t.lastContact).not.toBeNull();
        }
        const re = replayTurnMinotaur(realMaze(s), turnConfig(p), turnSeed(s), t.inputs, t.skips, {
          specs: specs(t),
          seed: s,
        });
        expect(re.catches).toBe(t.catches);
        expect(re.woken).toBe(t.woken);
        expect(re.player).toBe(t.player);
        expect(re.state.v).toBe(t.state.v);
        expect(re.extras.map((x) => [x.phase, x.state.v])).toEqual(t.extras.map((x) => [x.phase, x.state.v]));
      }
    }
  });
});
