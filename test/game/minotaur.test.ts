import { describe, it, expect } from "vitest";
import type { WalkEdge, WalkGraph, WalkVertex } from "../../src/core/walk_graph";
import {
  CHASE_HZ,
  ChaseGraph,
  DEFAULT_CHASE_PARAMS,
  HUNT_PACE_FRACTION,
  MinotaurChase,
  replayChase,
  undoAllowed,
  WANDER_PACE_FRACTION,
} from "../../src/game/minotaur";
import type { ChaseEvent, ChaseParams } from "../../src/game/minotaur";
import { resetPathAction } from "../../src/game/daily_attempt";
import { SeededRNG } from "../../src/util/random";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEAD_END_DENSITY_ON, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph } from "../../src/core/walk_graph";

// K80 stage 1: the real-time minotaur over small hand-built walk graphs.

// A walk graph from [va, vb, length] runs; a degree-1 vertex is an END.
function graph(runs: [string, string, number][], start: string, exit: string): WalkGraph {
  const vertices = new Map<string, WalkVertex>();
  const edges: WalkEdge[] = [];
  runs.forEach(([va, vb, length], id) => {
    edges.push({ id, va, vb, chain: id, ctrlA: 0, ctrlB: 2 * Math.max(1, Math.round(length)), length });
    for (const v of va === vb ? [va] : [va, vb]) {
      if (!vertices.has(v)) {
        vertices.set(v, { id: v, isEnd: false, chain: id, ctrl: 0, edges: [] });
      }
      vertices.get(v)!.edges.push(id);
    }
  });
  for (const v of vertices.values()) {
    const e = edges[v.edges[0]];
    v.isEnd = v.edges.length === 1 && e.va !== e.vb;
  }
  return { vertices, edges, start, exit, optimalLength: 0, distToExit: new Map() };
}

// S (entrance) -0- A -1- B -2- C -3- X (exit), a dead end B -4- D, and a
// long loop A -5- C.
const G1 = graph(
  [
    ["S", "A", 5],
    ["A", "B", 10],
    ["B", "C", 10],
    ["C", "X", 5],
    ["B", "D", 8],
    ["A", "C", 30],
  ],
  "S",
  "X"
);

const P = (over: Partial<ChaseParams> = {}): ChaseParams => ({
  ...DEFAULT_CHASE_PARAMS,
  ...over,
});

function run(sim: MinotaurChase, ticks: number, out: ChaseEvent[] = []): ChaseEvent[] {
  for (let i = 0; i < ticks; i++) sim.step(out);
  return out;
}

function runUntil(sim: MinotaurChase, kind: ChaseEvent["kind"], max: number): ChaseEvent[] {
  const out: ChaseEvent[] = [];
  for (let i = 0; i < max; i++) {
    sim.step(out);
    if (out.some((e) => e.kind === kind)) return out;
  }
  throw new Error(`no ${kind} in ${max} ticks`);
}

describe("ChaseGraph distances", () => {
  it("measures along the threads, with the tails barred to the minotaur", () => {
    const g = new ChaseGraph(G1);
    const A = g.index.get("A")!;
    const B = g.index.get("B")!;
    expect(g.from(A, false)[g.index.get("D")!]).toBe(18);
    expect(g.from(A, false)[g.start]).toBe(5);
    expect(g.from(A, true)[g.start]).toBe(Infinity);
    expect(g.from(B, true)[g.exit]).toBe(Infinity);
    expect(g.from(B, true)[g.index.get("C")!]).toBe(10);
    // The middle of the long loop is 25 from B either way round, though
    // the loop's ends are both one run from B.
    const mid = { edge: 5, pos: 15, dir: 1 as const, vertex: -1 };
    const atB = { edge: -1, pos: 0, dir: 1 as const, vertex: B };
    expect(g.spotToSpot(atB, mid, true)).toBe(25);
    // Two spots on one run: straight along it.
    const near = { edge: 5, pos: 12, dir: -1 as const, vertex: -1 };
    expect(g.spotToSpot(near, mid, true)).toBe(3);
  });
});

describe("MinotaurChase: the minotaur's movement", () => {
  it("waits in its lair for `wake`, then walks out along the exit tail", () => {
    const sim = new MinotaurChase(G1, P({ wake: 1, wanderPace: 6, paceJitter: 0, pauseChance: 0 }), 7);
    run(sim, CHASE_HZ);
    expect(sim.mode).toBe("lair");
    expect(sim.mino.edge).toBe(-1);
    expect(sim.g.ids[sim.mino.vertex]).toBe("X");
    run(sim, 1);
    expect(sim.mode).toBe("wander");
    expect(sim.mino.edge).toBe(3); // The exit tail, walked from X to C.
    expect(sim.mino.dir).toBe(-1);
    expect(sim.mino.pos).toBeCloseTo(5 - 6 / CHASE_HZ, 12);
  });

  it("never sets foot on a tail once out, and roams to the dead ends", () => {
    // The player stands at the entrance (invisible), so it only roams.
    const sim = new MinotaurChase(G1, P({ wake: 0, deadEndBias: 1, pauseMin: 0.2, pauseMax: 0.5 }), 11);
    let leftTail = false;
    let atTip = 0;
    for (let i = 0; i < 60 * CHASE_HZ; i++) {
      sim.step();
      const e = sim.mino.edge;
      if (e !== 3 && e >= 0) leftTail = true;
      expect(e).not.toBe(0);
      if (leftTail) expect(e).not.toBe(3);
      if (e < 0 && sim.g.ids[sim.mino.vertex] === "D") atTip++;
      expect(sim.mode).not.toBe("hunt");
    }
    expect(leftTail).toBe(true);
    expect(atTip).toBeGreaterThan(0);
  });

  it("is a function of the seed: the same seed, the same walk", () => {
    const params = P({ wake: 0, pauseChance: 0.5, paceJitter: 0.3 });
    const trace = (seed: number): string => {
      const sim = new MinotaurChase(G1, params, seed);
      const out: string[] = [];
      for (let i = 0; i < 30 * CHASE_HZ; i++) {
        sim.step();
        out.push(`${sim.mino.edge}:${sim.mino.pos}:${sim.mode}`);
      }
      return out.join(",");
    };
    expect(trace(5)).toBe(trace(5));
    expect(trace(5)).not.toBe(trace(6));
  });
});

describe("MinotaurChase: detection", () => {
  // Frozen entities: the player at pace 0, the minotaur pausing (or
  // hunting at pace 0).
  const still = P({ playerPace: 0, approachPace: 0, detectStart: 15, detectEnd: 20, catchDist: 0.5 });

  it("starts within detectStart along the threads, not by counting runs", () => {
    const sim = new MinotaurChase(G1, still, 1);
    sim.place("minotaur", "B", "pause", 100);
    sim.place("player", { edge: 5, pos: 15, dir: 1 }); // 25 away, one run off
    expect(run(sim, 1)).toEqual([]);
    expect(sim.mode).toBe("pause");
    sim.place("player", { edge: 5, pos: 5.5, dir: 1 }); // 15.5 away
    expect(run(sim, 1)).toEqual([]);
    sim.place("player", { edge: 5, pos: 4.5, dir: 1 }); // 14.5 away
    expect(run(sim, 1)).toEqual([{ kind: "spotted" }]);
    expect(sim.mode).toBe("hunt");
  });

  it("ends beyond detectEnd, not before", () => {
    const sim = new MinotaurChase(G1, still, 1);
    sim.place("minotaur", "B", "hunt");
    sim.place("player", { edge: 5, pos: 9, dir: 1 }); // 19 away
    expect(run(sim, 1)).toEqual([]);
    expect(sim.mode).toBe("hunt");
    sim.place("player", { edge: 5, pos: 11, dir: 1 }); // 21 away
    expect(run(sim, 1)).toEqual([{ kind: "lost" }]);
    expect(sim.mode).toBe("wander");
  });

  it("a player on a tail is safe: unseen and uncatchable (the sanctuary)", () => {
    const sim = new MinotaurChase(G1, still, 1);
    sim.place("minotaur", "A", "pause", 100);
    sim.place("player", { edge: 0, pos: 4.8, dir: 1 }); // 0.2 from A, on the entrance tail
    expect(sim.huntDistance()).toBe(Infinity);
    expect(sim.contactDistance()).toBeCloseTo(0.2, 12);
    expect(run(sim, 1)).toEqual([]);
    expect(sim.mode).toBe("pause");
    expect(sim.catches).toBe(0);
    sim.place("player", "A"); // Off the tail: caught.
    expect(run(sim, 1)).toEqual([{ kind: "caught" }]);
  });
});

describe("MinotaurChase: the approach and the catch", () => {
  const hunt = P({ playerPace: 0, approachPace: 10, detectStart: 100, detectEnd: 200, catchDist: 0.5 });

  it("approaches along the shortest path and catches", () => {
    const sim = new MinotaurChase(G1, hunt, 1);
    sim.place("minotaur", "A", "hunt");
    sim.place("player", "D");
    const runs: number[] = [];
    const out: ChaseEvent[] = [];
    let t = 0;
    while (!out.some((e) => e.kind === "caught") && t < 10 * CHASE_HZ) {
      sim.step(out);
      t++;
      const e = sim.mino.edge;
      if (e >= 0 && runs[runs.length - 1] !== e) runs.push(e);
    }
    // A -> B -> D (18), never the long way round (48).
    expect(runs).toEqual([1, 4]);
    // 17.5 u at 10 u/s.
    expect(t).toBeGreaterThanOrEqual(Math.floor(1.75 * CHASE_HZ));
    expect(t).toBeLessThanOrEqual(Math.ceil(1.75 * CHASE_HZ) + 1);
  });

  it("turns back mid-run when the way behind is clearly shorter", () => {
    const sim = new MinotaurChase(G1, hunt, 1);
    sim.place("minotaur", { edge: 2, pos: 2, dir: 1 }, "hunt"); // B -> C
    sim.place("player", "D"); // behind it: 10 back, 26 ahead
    run(sim, 1);
    expect(sim.mino.dir).toBe(-1);
    expect(sim.mino.pos).toBeLessThan(2);
  });

  it("a catch sends the player to the entrance and it to its lair; the solve goes on", () => {
    const sim = new MinotaurChase(G1, hunt, 1);
    sim.place("minotaur", "A", "hunt");
    sim.place("player", "D");
    runUntil(sim, "caught", 10 * CHASE_HZ);
    expect(sim.catches).toBe(1);
    expect(sim.player.edge).toBe(-1);
    expect(sim.g.ids[sim.player.vertex]).toBe("S");
    expect(sim.mino.edge).toBe(-1);
    expect(sim.g.ids[sim.mino.vertex]).toBe("X");
    expect(sim.mode).toBe("lair");
    expect(sim.tap(0)).toBe("queued");
    expect(run(sim, 1)).toEqual([{ kind: "depart", edge: 0 }]);
  });

  // K273 (K80 turns stage 2): the minotaur's catch toggle.
  it("goes back to its lair by default", () => {
    expect(DEFAULT_CHASE_PARAMS.lair).toBe(true);
  });

  it("with lair off it stays where it caught you, pausing wake s there", () => {
    const sim = new MinotaurChase(G1, P({ ...hunt, lair: false, wake: 2 }), 1);
    sim.place("minotaur", "A", "hunt");
    sim.place("player", "D");
    runUntil(sim, "caught", 10 * CHASE_HZ);
    expect(sim.catches).toBe(1);
    expect(sim.g.ids[sim.player.vertex]).toBe("S");
    // Caught 0.5 short of D on B -> D: it stays on that run.
    expect(sim.mino.edge).toBe(4);
    const at = { ...sim.mino };
    expect(sim.mode).toBe("pause");
    run(sim, 2 * CHASE_HZ - 2);
    expect(sim.mino).toEqual(at);
    expect(sim.mode).toBe("pause");
  });

  it("carries its tallies to a restart's new chase", () => {
    const sim = new MinotaurChase(G1, hunt, 1);
    sim.place("minotaur", "A", "hunt");
    sim.place("player", "D");
    runUntil(sim, "caught", 10 * CHASE_HZ);
    sim.restarts = 2;
    const next = new MinotaurChase(G1, hunt, 1);
    next.carry(sim);
    expect(next.catches).toBe(1);
    expect(next.restarts).toBe(2);
    expect(next.huntSeconds).toBe(sim.huntSeconds);
    expect(next.huntSeconds).toBeGreaterThan(0);
    // Everything else is a fresh chase.
    expect(next.tick).toBe(0);
    expect(next.mode).toBe("lair");
  });
});

describe("MinotaurChase: the player", () => {
  const quiet = P({ playerPace: 10, wake: 1000 }); // It never leaves its lair.

  it("runs one run per tap at playerPace; a tap while running queues, the latest wins", () => {
    const sim = new MinotaurChase(G1, quiet, 1);
    expect(sim.tap(1)).toBe("reject"); // Not from the entrance.
    expect(sim.tap(0)).toBe("queued");
    const out = run(sim, 10);
    expect(out).toEqual([{ kind: "depart", edge: 0 }]);
    expect(sim.decisionVertex).toBe("A");
    expect(sim.tap(2)).toBe("reject"); // B-C does not start at A.
    expect(sim.tap(1)).toBe("queued");
    expect(sim.tap(5)).toBe("queued");
    // 5 u at 10 u/s: half a second, then straight on along the loop.
    run(sim, CHASE_HZ / 2 - 10 + 1, out);
    expect(out).toEqual([
      { kind: "depart", edge: 0 },
      { kind: "arrive", vertex: "A" },
      { kind: "depart", edge: 5 },
    ]);
    expect(sim.player.edge).toBe(5);
  });

  it("has no undo: a backtrack is a run walked back in real time", () => {
    expect(undoAllowed("realtime")).toBe(false);
    expect(undoAllowed("turn")).toBe(true);
    // Reset path restarts the chase, even inside a daily's attempt.
    expect(
      resetPathAction({ dailyAttempt: true, official: false, solved: false, trailMode: false, realtime: true })
    ).toBe("restart");
    const sim = new MinotaurChase(G1, quiet, 1);
    sim.tap(0);
    runUntil(sim, "arrive", CHASE_HZ);
    const t0 = sim.tick;
    sim.tap(0); // Back the way it came.
    const out = runUntil(sim, "arrive", CHASE_HZ);
    expect(out[0]).toEqual({ kind: "depart", edge: 0 });
    expect(out[out.length - 1]).toEqual({ kind: "arrive", vertex: "S" });
    expect(sim.tick - t0).toBeGreaterThanOrEqual(CHASE_HZ / 2);
    expect(sim.inputs.map((i) => i.edge)).toEqual([0, 0]);
  });

  it("reaching the exit ends the chase", () => {
    const sim = new MinotaurChase(G1, P({ playerPace: 10, wake: 0 }), 1);
    sim.place("minotaur", "D", "pause", 100);
    sim.place("player", "C");
    sim.tap(3);
    runUntil(sim, "arrive", CHASE_HZ);
    expect(sim.finished).toBe(true);
    expect(sim.tap(3)).toBe("reject");
    expect(sim.catches).toBe(0);
  });
});

describe("MinotaurChase: the clock", () => {
  it("advance() runs whole fixed ticks and caps a stall", () => {
    const sim = new MinotaurChase(G1, P(), 1);
    sim.advance(0.5 / CHASE_HZ);
    expect(sim.tick).toBe(0);
    sim.advance(0.6 / CHASE_HZ);
    expect(sim.tick).toBe(1);
    sim.advance(10); // A 10 s stall runs a quarter second, then drops the rest.
    expect(sim.tick).toBe(31);
    sim.advance(NaN);
    sim.advance(-1);
    expect(sim.tick).toBe(31);
  });

  it("replaying the inputs reproduces the chase bit for bit", () => {
    const params = P({ wake: 0.5, pauseChance: 0.4, paceJitter: 0.3, detectStart: 12, detectEnd: 18 });
    const live = new MinotaurChase(G1, params, 99);
    const pick = new SeededRNG(1234);
    for (let i = 0; i < 40 * CHASE_HZ; i++) {
      // A player who taps a random run at their decision vertex now and
      // then, mid-run taps included.
      if (i % 37 === 0) {
        const v = live.g.index.get(live.decisionVertex)!;
        const runs = live.g.adj[v];
        live.tap(runs[Math.floor(pick.next() * runs.length)]);
      }
      live.step();
      if (live.finished) break;
    }
    expect(live.inputs.length).toBeGreaterThan(20);
    const again = replayChase(G1, params, 99, live.inputs, live.tick);
    expect(again.tick).toBe(live.tick);
    expect(again.player).toEqual(live.player);
    expect(again.mino).toEqual(live.mino);
    expect(again.mode).toBe(live.mode);
    expect(again.catches).toBe(live.catches);
    expect(again.huntTicks).toBe(live.huntTicks);
    expect(again.finished).toBe(live.finished);
  });
});

// K174: real mazes (the UI's dead-end density) and a chase's whole course
// as one FNV-1a digest: every tick's minotaur and player spots, mode and
// catches, under a scripted player who taps a random run at their decision
// vertex every 45 ticks. TODAY'S mazes: H1 (K74 stage 2, hCutShare 1) on,
// since K80 turns stage 2 lifted the hCutShare 0 pin (K278 (c)).
function mazeWalk(seed: number): WalkGraph {
  const g = generateLatticeKnotwork({ gridSize: 10, weaveDensity: 0.3, turnBias: 0.6, randSeed: seed });
  const plan = buildMazePlan(g, { ...DEFAULT_MAZE_PARAMS, deadEndDensity: DEAD_END_DENSITY_ON });
  const hueGroup = applyMazePlan(g, plan);
  applyMazeCuts(g, plan, hueGroup);
  return buildWalkGraph(g)!;
}

function chaseDigest(
  walk: WalkGraph,
  params: ChaseParams,
  seed: number,
  tapEvery = 45,
  ticks = 120 * CHASE_HZ
): string {
  const sim = new MinotaurChase(walk, params, seed);
  const pick = new SeededRNG(seed + 1);
  let h = 0x811c9dc5;
  const mix = (s: string): void => {
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
  };
  let hunts = 0;
  for (let i = 0; i < ticks && !sim.finished; i++) {
    if (tapEvery > 0 && i % tapEvery === 0) {
      const runs = sim.g.adj[sim.g.index.get(sim.decisionVertex)!];
      sim.tap(runs[Math.floor(pick.next() * runs.length)]);
    }
    const out = sim.step();
    hunts += out.filter((e) => e.kind === "spotted").length;
    const m = sim.mino;
    const p = sim.player;
    mix(`${m.edge}:${m.pos}:${m.vertex}:${sim.mode}:${p.edge}:${p.pos}:${sim.catches};`);
  }
  return `${sim.tick}/${hunts}/${sim.catches}/${h.toString(16)}`;
}

// Seconds until the minotaur first spots a player who stands still at the
// junction farthest from its lair (90 when it never does).
function secondsToFind(walk: WalkGraph, params: ChaseParams, seed: number): number {
  const sim = new MinotaurChase(walk, params, seed);
  const g = sim.g;
  const d = g.from(g.exit, false);
  let far = -1;
  for (let i = 0; i < g.ids.length; i++) {
    if (i === g.start || i === g.exit || g.isEnd[i] || !(d[i] < Infinity)) continue;
    if (far < 0 || d[i] > d[far]) far = i;
  }
  sim.place("player", g.ids[far]);
  for (let i = 0; i < 90 * CHASE_HZ; i++) {
    if (sim.step().some((e) => e.kind === "spotted")) return i / CHASE_HZ;
  }
  return 90;
}

describe("K174: the minotaur's controls", () => {
  const MAZES = [3, 17, 42];
  // The chase at roamPull 0 on mazes 3, 17 and 42 with seeds 1 and 2: ticks
  // / hunts / catches / digest of every tick. On hCutShare 0 mazes these
  // equalled master's chase before K174 (d644ec5); K80 turns stage 2
  // re-froze them on today's H1 mazes, the roamPull 0 path unchanged.
  const K80_DIGESTS = [
    "14400/3/3/f3428983",
    "14400/2/2/6dc590cc",
    "14400/5/5/55344e84",
    "14400/7/5/44122f41",
    "14400/4/4/557840f8",
    "6832/3/2/e9c9d2d6",
  ];

  it("roamPull 0 plays K80's chase tick for tick", () => {
    const rows: string[] = [];
    for (const maze of MAZES) {
      const walk = mazeWalk(maze);
      for (const seed of [1, 2]) rows.push(chaseDigest(walk, P({ roamPull: 0 }), seed));
    }
    expect(rows).toEqual(K80_DIGESTS);
  });

  it("a pull is deterministic and changes the chase", () => {
    const walk = mazeWalk(17);
    const a = chaseDigest(walk, P({ roamPull: 0.5 }), 1);
    expect(chaseDigest(walk, P({ roamPull: 0.5 }), 1)).toBe(a);
    expect(a).not.toBe(chaseDigest(walk, P({ roamPull: 0 }), 1));
  });

  it("a player it cannot see pulls nothing", () => {
    // Nobody taps: the player stands on the entrance for two minutes.
    const walk = mazeWalk(42);
    for (const seed of [1, 2]) {
      expect(chaseDigest(walk, P({ roamPull: 1 }), seed, 0)).toBe(chaseDigest(walk, P({ roamPull: 0 }), seed, 0));
    }
  });

  // Twenty mazes, not MAZES: one maze's pull-1 / pull-0 ratio ranges 0.40 to
  // 1.06, and MAZES' three read 0.81 on H1 mazes (0.72 without H1). Measured
  // on 40 mazes x 12 seeds (.claude/probes/K80/turns2/rt/still.md), the gain
  // is 0.69 with H1 on or off; windows of 20 mazes x 6 seeds read 0.60-0.74,
  // so 0.8 holds with margin (K80 turns stage 2).
  it("a pull finds a still player sooner", () => {
    const mean = (pull: number): number => {
      let sum = 0;
      let n = 0;
      for (let maze = 100; maze < 120; maze++) {
        const walk = mazeWalk(maze);
        for (let seed = 1; seed <= 6; seed++, n++) sum += secondsToFind(walk, P({ roamPull: pull }), seed);
      }
      return sum / n;
    };
    const off = mean(0);
    const on = mean(1);
    console.log(`K174 mean seconds to find a still player: pull 0 ${off.toFixed(1)}, pull 1 ${on.toFixed(1)}`);
    expect(on).toBeLessThan(0.8 * off);
  });

  it("the paces are fractions of the player's, exactly", () => {
    expect(WANDER_PACE_FRACTION * DEFAULT_CHASE_PARAMS.playerPace).toBe(5);
    expect(HUNT_PACE_FRACTION * DEFAULT_CHASE_PARAMS.playerPace).toBe(7);
    expect(DEFAULT_CHASE_PARAMS.wanderPace).toBe(5);
    expect(DEFAULT_CHASE_PARAMS.approachPace).toBe(7);
  });
});
