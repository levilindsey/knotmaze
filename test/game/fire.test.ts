import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph, walkDistances } from "../../src/core/walk_graph";
import type { WalkGraph, WalkVertex, WalkEdge } from "../../src/core/walk_graph";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { FabricMazeController } from "../../src/game/fabric_controller";
import {
  armSafe,
  buildFire,
  firePassed,
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

  it("K408: passes the start once L > delay, on either clock", () => {
    const w = graph(RUNS, "S", "X");
    // h 0: the lit fuse at L 0 (T(S) = 0) has not passed the start; any L
    // past it has, and the start's run then holds a burnt stretch.
    const f0 = buildFire(w, 0.5, 0);
    expect(firePassed(f0, "S", 0)).toBe(false);
    expect(firePassed(f0, "S", 1e-9)).toBe(true);
    const b = runBurnAt(w, f0, 0, 0.5);
    expect(b.state === "burning" && b.burnt[0][0] === 0 && b.burnt[0][1] > 0).toBe(true);
    // h 5: shown through the delay. Any vertex: T(A) = 9.
    const f5 = buildFire(w, 0.5, 5);
    expect(firePassed(f5, "S", 5)).toBe(false);
    expect(firePassed(f5, "S", 5.25)).toBe(true);
    expect(firePassed(f5, "A", 9)).toBe(false);
    expect(firePassed(f5, "A", 9.1)).toBe(true);
    expect(firePassed(f5, "nowhere", 1e9)).toBe(false);
    // Turn clock (L = walkedDist): the first move passes the start at h 0.
    const c = new FabricMazeController(w, false, f0);
    expect(firePassed(f0, w.start, c.walkedDist)).toBe(false);
    expect(c.tapEdge(0)).toBe("advance");
    expect(firePassed(f0, w.start, c.walkedDist)).toBe(true);
    // Real-time clock (L = fireNow, which the page feeds every frame).
    const fr = buildFire(w, 0.5, 5, "realtime");
    const r = new FabricMazeController(w, false, fr);
    expect(r.tapEdge(0)).toBe("advance");
    expect(r.setFireNow(5)).toBe(false);
    expect(firePassed(fr, w.start, r.fireNow)).toBe(false);
    expect(r.setFireNow(5.1)).toBe(false);
    expect(firePassed(fr, w.start, r.fireNow)).toBe(true);
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

  it("K711 (c): a broken arm is never fire-safe", () => {
    const w = graph(RUNS, "S", "X");
    const f = buildFire(w, 0.5, 0);
    // Broken set: run 3 (B-C, the only fire-safe arm at B at clock 3) is gone.
    const broken3 = (eid: number) => eid === 3;
    expect(safeArms(w, f, 3, "B", broken3)).toEqual([]);
    expect(fireTrapped(w, f, 3, "B", broken3)).toBe(true);
    // No predicate: today's answers stand (the broken arm still counts safe).
    expect(safeArms(w, f, 3, "B")).toEqual([3]);
    expect(fireTrapped(w, f, 3, "B")).toBe(false);
  });

  it("K711 (c): at 2.999 the B-A runs keep a player untrapped with 3 broken", () => {
    const w = graph(RUNS, "S", "X");
    const f = buildFire(w, 0.5, 0);
    const broken3 = (eid: number) => eid === 3;
    expect(safeArms(w, f, 2.999, "B", broken3)).toEqual([1, 2]);
    expect(fireTrapped(w, f, 2.999, "B", broken3)).toBe(false);
    // And without the predicate the same clock reads all three arms safe.
    expect(safeArms(w, f, 2.999, "B")).toEqual([1, 2, 3]);
  });

  it("K711 (c): a blocked arm that was never fire-safe changes nothing", () => {
    const w = graph(RUNS, "S", "X");
    const f = buildFire(w, 0.5, 0);
    // Run 1 (A-B) ties the fire at clock 3 (L + len = T(A)), so it is not
    // fire-safe there; blocking it leaves the safe list as it was.
    const broken1 = (eid: number) => eid === 1;
    expect(safeArms(w, f, 3, "B", broken1)).toEqual([3]);
    expect(fireTrapped(w, f, 3, "B", broken1)).toBe(false);
    // A predicate that names nothing reads exactly the unpredicated answer.
    expect(safeArms(w, f, 3, "B", () => false)).toEqual(safeArms(w, f, 3, "B"));
    expect(fireTrapped(w, f, 3, "B", () => false)).toBe(fireTrapped(w, f, 3, "B"));
  });

  it("K711 (b): a mid-graph run's burning and burnt clocks, no predicate", () => {
    const w = graph(RUNS, "S", "X");
    const f = buildFire(w, 0.5, 0);
    // Run 1 (A-B, len 1; not the S-A run): d(A) 2, d(B) 3, r 0.5, h 0.
    // It starts burning at 4, reads burning at 5 and burnt at 6.
    expect(runBurnAt(w, f, 1, 5)).toEqual({
      state: "burning",
      burnt: [[0, 0.5]],
      front: [0.5],
    });
    expect(runBurnAt(w, f, 1, 6)).toEqual({ state: "burnt" });
  });

  it("K711 (b): a broken run reads unburnt at every clock", () => {
    const w = graph(RUNS, "S", "X");
    const f = buildFire(w, 0.5, 0);
    const broken1 = (eid: number) => eid === 1;
    // The clocks where the run above reads burning (5) and burnt (6),
    // and every other clock, read unburnt once the run is named broken.
    expect(runBurnAt(w, f, 1, 5, broken1)).toEqual({ state: "unburnt" });
    expect(runBurnAt(w, f, 1, 6, broken1)).toEqual({ state: "unburnt" });
    expect(runBurnAt(w, f, 1, 0, broken1)).toEqual({ state: "unburnt" });
    expect(runBurnAt(w, f, 1, 100, broken1)).toEqual({ state: "unburnt" });
    // A predicate that names nothing, or names another run, keeps
    // today's answers for run 1; run 2 (the second A-B) is unaffected
    // by run 1's predicate.
    expect(runBurnAt(w, f, 1, 5, () => false)).toEqual({
      state: "burning",
      burnt: [[0, 0.5]],
      front: [0.5],
    });
    expect(runBurnAt(w, f, 1, 6, () => false)).toEqual({ state: "burnt" });
    expect(runBurnAt(w, f, 2, 5, broken1)).toEqual({
      state: "burning",
      burnt: [[0, 0.5]],
      front: [0.5],
    });
    expect(runBurnAt(w, f, 2, 6, broken1)).toEqual({ state: "burnt" });
  });

  it("K711 (b): drawFire's burnt-spans loop passes the controller's broken predicate to non-anim runs", () => {
    // A source scan, in the panel_rect.test.ts manner: drawFire's
    // burnt-spans loop is the one runBurnAt call that must skip gone
    // runs (the smolder loop below it reads choices(), which already
    // drops them), so slice that loop out and assert the call there.
    const src = readFileSync(
      fileURLToPath(new URL("../../src/render/fabric_maze_renderer.ts", import.meta.url)),
      "utf8"
    );
    const start = src.indexOf("const lit = L <= fire.delay;");
    const end = src.indexOf("// A smoldering arm", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    expect(src.slice(start, end)).toContain(
      "runBurnAt(this.walk, fire, eid, L, (r) => controller.broken(r))"
    );
  });

  it("K1187: drawFire's burnt-spans loop cuts a broken anim run's spans by the swept interval", () => {
    // A source scan in the same manner: only a BROKEN anim run (syncBroken
    // hides its swept stretch) reads its burn with no broken predicate,
    // each pushed span is cut by the swept interval (cutBurntSpan), and no
    // front stands at the dot (a.cur). An unbroken anim run's swept stretch
    // is drawn, so it reads as every other run: the burn behind the dot
    // shows during the move (the default game, fragile runs off).
    const src = readFileSync(
      fileURLToPath(new URL("../../src/render/fabric_maze_renderer.ts", import.meta.url)),
      "utf8"
    );
    const start = src.indexOf("const lit = L <= fire.delay;");
    const end = src.indexOf("// A smoldering arm", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const slice = src.slice(start, end);
    expect(slice).toContain("const animEdge = a && controller.broken(a.e.id) ? a.e.id : -1;");
    expect(slice).toContain("a && animEdge >= 0");
    expect(slice).toContain("runBurnAt(this.walk, fire, eid, L)");
    expect(slice).toContain("cutBurntSpan(span, swept)");
    expect(slice).toContain("fc === a.cur");
  });

  it("K711 (c): the controller passes its broken runs to the trap test", () => {
    // A source scan, in the panel_rect.test.ts manner: the controller's own
    // fire-and-fragile walk in k137b_block.test.ts does not reach a stated
    // trap, so this pin, not a driven arrival, is the wiring gate.
    const src = readFileSync(
      fileURLToPath(new URL("../../src/game/fabric_controller.ts", import.meta.url)),
      "utf8"
    );
    expect(src).toContain("fireTrapped(this.walk, fire, L, at, (eid) => this.broken(eid))");
  });
});
