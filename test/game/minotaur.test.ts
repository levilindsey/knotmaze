import { describe, it, expect } from "vitest";
import type { WalkEdge, WalkGraph, WalkVertex } from "../../src/core/walk_graph";
import {
  CHASE_HZ,
  ChaseGraph,
  DEFAULT_CHASE_PARAMS,
  MinotaurChase,
  replayChase,
  undoAllowed,
} from "../../src/game/minotaur";
import type { ChaseEvent, ChaseParams } from "../../src/game/minotaur";
import { resetPathAction } from "../../src/game/daily_attempt";
import { SeededRNG } from "../../src/util/random";

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
