import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph, walkDistances } from "../../src/core/walk_graph";
import type { WalkGraph, WalkVertex, WalkEdge } from "../../src/core/walk_graph";
import { FabricMazeController } from "../../src/game/fabric_controller";
import {
  armSafe,
  buildFire,
  fireTime,
  fireTrapped,
  runBurnAt,
  safeArms,
} from "../../src/game/fire";

// K114 burn race, stage 1: the fire model (game/fire.ts) and the
// controller's refusal, loss, closest call and replay.

// A hand-built walk graph: runs [va, vb, length]; ends are degree-1.
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
  return {
    vertices,
    edges,
    start,
    exit,
    optimalLength: distToExit.get(start)!,
    distToExit,
  };
}

// S-A 2, A-B 1 twice (b1, b2), B-C 4 (a dead end), A-X 4 (the exit).
// At r 0.5, h 0: d = S 0, A 2, B 3, C 7, X 6; T = 2d.
const RUNS: Array<[string, string, number]> = [
  ["S", "A", 2], // 0
  ["A", "B", 1], // 1 (b1)
  ["A", "B", 1], // 2 (b2)
  ["B", "C", 4], // 3
  ["A", "X", 4], // 4
];

function walkFor(seed: number, deadEndDensity: number): WalkGraph {
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

// The next run on a shortest route to the exit from the head.
function bestChoice(c: FabricMazeController): number {
  let best = -1;
  let bestCost = Infinity;
  for (const eid of c.walk.vertices.get(c.head)!.edges) {
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

describe("the fire model (K114)", () => {
  it("times the fire from the walk start: T(v) = h + d(v)/r", () => {
    const w = graph(RUNS, "S", "X");
    const f = buildFire(w, 0.5, 0);
    expect(["S", "A", "B", "C", "X"].map((v) => fireTime(f, v))).toEqual([0, 4, 6, 14, 12]);
    const g = buildFire(w, 0.5, 3);
    expect(fireTime(g, "A")).toBe(7);
    expect(fireTime(g, "nowhere")).toBe(Infinity);
  });

  it("smolders an arm on a tie, L + len = T(w) (strict)", () => {
    const w = graph(RUNS, "S", "X");
    const f = buildFire(w, 0.5, 0);
    // At B with L = 3: back to A arrives at 4 = T(A).
    expect(armSafe(w, f, 3, "B", 2)).toBe(false);
    expect(armSafe(w, f, 2.999, "B", 2)).toBe(true);
    expect(safeArms(w, f, 3, "B")).toEqual([3]);
  });

  it("burns a run from both ends", () => {
    // Triangle: S-A 2, S-B 3, A-B 4; r 0.5. The run A-B starts burning at
    // T(A) = 4, from B at T(B) = 6, and is burnt at (2 + 3 + 4) / 1 = 9.
    const w = graph(
      [
        ["S", "A", 2],
        ["S", "B", 3],
        ["A", "B", 4],
        ["B", "X", 1],
        ["A", "E", 1],
      ],
      "E",
      "X"
    );
    // Start the fire at S instead: a graph whose walk start is S.
    const ws = { ...w, start: "S" };
    const f = buildFire(ws, 0.5, 0);
    expect(runBurnAt(ws, f, 2, 3.9)).toEqual({ state: "unburnt" });
    expect(runBurnAt(ws, f, 2, 5)).toEqual({ state: "burning", burnt: [[0, 0.5]], front: [0.5] });
    expect(runBurnAt(ws, f, 2, 8)).toEqual({
      state: "burning",
      burnt: [
        [0, 2],
        [3, 4],
      ],
      front: [2, 3],
    });
    expect(runBurnAt(ws, f, 2, 9)).toEqual({ state: "burnt" });
  });

  it("lights the fuse under the player at h = 0, and only far ends count", () => {
    const w = graph(RUNS, "S", "X");
    const f = buildFire(w, 0.5, 0);
    // The run from the start is burning at its start end from L = 0.
    expect(runBurnAt(w, f, 0, 0)).toEqual({ state: "burning", burnt: [[0, 0]], front: [0] });
    const c = new FabricMazeController(w, false, f);
    expect(c.fireLeadHere).toBe(0);
    expect(c.choices()).toEqual([0]);
    expect(c.tapEdge(0)).toBe("advance");
    // Back to the start: it burns at 0, so the arm smolders.
    expect(c.smoldering(0)).toBe(true);
    expect(c.tapEdge(0)).toBe("smolder");
    expect(c.taps).toEqual([0]);
    expect(c.walkedDist).toBe(2);
  });

  it("lets a backtrack feed the fire", () => {
    const w = graph(RUNS, "S", "X");
    // h 5: back to the start at L 4 arrives before T(S) = 5.
    const c = new FabricMazeController(w, false, buildFire(w, 0.5, 5));
    expect(c.tapEdge(0)).toBe("advance");
    expect(c.fireClosest).toBe(9 - 2);
    expect(c.tapEdge(0)).toBe("backtrack");
    expect(c.walkedDist).toBe(4);
    expect(c.fireClosest).toBe(1);
    // Out again at L 4 + 2 = 6 < T(A) = 9; then back at 8 >= T(S) = 5.
    expect(c.tapEdge(0)).toBe("advance");
    expect(c.smoldering(0)).toBe(true);
  });

  it("refuses, loses, and keeps the closest call", () => {
    const w = graph(RUNS, "S", "X");
    const c = new FabricMazeController(w, false, buildFire(w, 0.5, 0));
    expect(c.tapEdge(0)).toBe("advance"); // A at L 2, lead 2
    expect(c.tapEdge(1)).toBe("advance"); // B at L 3, lead 3
    expect(c.fireClosest).toBe(2);
    // b2 back to A ties (refused: not logged, not a turn); b1 too.
    const before = [c.taps.length, c.moveLog.length, c.walkedDist];
    expect(c.tapEdge(2)).toBe("smolder");
    expect(c.tapEdge(1)).toBe("smolder");
    expect([c.taps.length, c.moveLog.length, c.walkedDist]).toEqual(before);
    expect(c.fireLost).toBe(false);
    // Into the dead end: arriving at C (L 7) leaves no safe arm.
    expect(c.tapEdge(3)).toBe("advance");
    expect(c.fireLost).toBe(true);
    expect(fireTrapped(w, c.fire!, c.walkedDist, "C")).toBe(true);
    expect(c.choices()).toEqual([]);
    expect(c.tapEdge(3)).toBe("noop");
    expect(c.fireClosest).toBe(2);
    // A restart relights the fuse.
    const restarts = c.restarts;
    c.reset();
    expect([c.fireLost, c.fireClosest, c.restarts]).toEqual([false, Infinity, restarts + 1]);
  });

  it("closes on the exit's margin when that is the closest", () => {
    const w = graph(RUNS, "S", "X");
    // r 0.95: A at L 2 (T 2.105...), X at L 6 (T 6.315...).
    const f = buildFire(w, 0.95, 0);
    const c = new FabricMazeController(w, false, f);
    expect(c.tapEdge(0)).toBe("advance");
    expect(c.tapEdge(4)).toBe("win");
    expect(c.fireClosest).toBe(fireTime(f, "A") - 2);
    expect(c.fireClosest).toBeLessThan(fireTime(f, "X") - 6);
    // A detour: A -> B (L 3 < T(B) 3.157...) is safe, back to A by b2 is
    // not (L 4 >= T(A)), and B -> C still is (7 < 7.368...).
    const d = new FabricMazeController(w, false, f);
    d.tapEdge(0);
    expect(d.tapEdge(1)).toBe("advance");
    expect(d.tapEdge(2)).toBe("smolder");
    expect(d.fireLost).toBe(false);
    expect(safeArms(w, f, d.walkedDist, "B")).toEqual([3]);
  });

  it("replays the same fire, closest call and loss from the taps", () => {
    const w = graph(RUNS, "S", "X");
    const f = buildFire(w, 0.5, 0);
    const a = new FabricMazeController(w, false, f);
    a.tapEdge(0);
    a.tapEdge(1);
    a.tapEdge(3);
    const b = new FabricMazeController(w, false, f);
    expect(b.replay(a.taps)).toBe(true);
    expect([b.fireLost, b.fireClosest, b.walkedDist]).toEqual([true, 2, 7]);
    // A refused tap in the list fails the replay (and leaves a reset).
    expect(b.replay([0, 1, 2])).toBe(false);
    expect([b.taps.length, b.fireLost]).toEqual([0, false]);
    // A tap past a loss too.
    expect(b.replay([0, 1, 3, 3])).toBe(false);
  });

  it("never touches a solve without a fire", () => {
    const w = graph(RUNS, "S", "X");
    const c = new FabricMazeController(w);
    expect(c.fireLeadHere).toBeNull();
    c.tapEdge(0);
    c.tapEdge(1);
    expect(c.tapEdge(2)).toBe("advance");
    expect(c.fireClosest).toBe(Infinity);
    expect(c.smoldering(0)).toBe(false);
  });

  it("the optimal route always escapes (seeds x r x h)", () => {
    let checked = 0;
    for (const seed of [3, 11, 42, 77, 123, 2026]) {
      for (const dead of [0, 0.6]) {
        const w = walkFor(seed, dead);
        for (const r of [0.3, 0.75, 0.9, 0.95]) {
          for (const h of [0, 12.5]) {
            const c = new FabricMazeController(w, false, buildFire(w, r, h));
            for (let i = 0; i < 400 && !c.solved; i++) {
              const res = c.tapEdge(bestChoice(c));
              expect(res === "advance" || res === "win").toBe(true);
              expect(c.fireLost).toBe(false);
            }
            expect(c.solved).toBe(true);
            expect(c.fireClosest).toBeGreaterThan(0);
            // The margin on the route is at least d(v) (1/r - 1) + h.
            expect(c.walkedDist).toBeCloseTo(w.optimalLength, 9);
            checked++;
          }
        }
      }
    }
    expect(checked).toBe(96);
  });
});
