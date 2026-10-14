import { describe, expect, it } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph } from "../../src/core/walk_graph";
import type { WalkGraph } from "../../src/core/walk_graph";
import { FabricMazeController } from "../../src/game/fabric_controller";
import {
  attemptRecord,
  exploredRuns,
  resetPathAction,
  restoreAttempt,
  walkFingerprint,
} from "../../src/game/daily_attempt";
import { DailyStore, validAttempt } from "../../src/game/daily_store";
import type { StorageLike } from "../../src/game/daily_store";

// K47: a daily attempt saved mid-solve comes back exactly.

function walkFor(seed: number, gridSize = 8): WalkGraph {
  const g = generateLatticeKnotwork({
    gridSize,
    weaveDensity: 0.3,
    turnBias: 0.6,
    randSeed: seed,
  });
  const plan = buildMazePlan(g, { ...DEFAULT_MAZE_PARAMS });
  const hueGroup = applyMazePlan(g, plan);
  applyMazeCuts(g, plan, hueGroup);
  return buildWalkGraph(g)!;
}

// The cheapest next run (shortest route to the exit).
function best(c: FabricMazeController): number {
  let pick = -1;
  let bestCost = Infinity;
  for (const eid of c.choices()) {
    const e = c.walk.edges[eid];
    const far = e.va === c.head ? e.vb : e.va;
    const cost = e.length + (c.walk.distToExit.get(far) ?? Infinity);
    if (cost < bestCost) {
      bestCost = cost;
      pick = eid;
    }
  }
  return pick;
}

class MemStorage implements StorageLike {
  map = new Map<string, string>();
  getItem(k: string): string | null {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.map.set(k, v);
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
}

const info = (walk: WalkGraph) => ({
  startedAt: 1_790_000_000_000,
  day: 3,
  elapsedMs: 12_345.6,
  maze: walkFingerprint(walk),
  def: 1,
  savedAt: 1_790_000_012_346,
});

describe("walk fingerprints", () => {
  it("are stable for a maze and differ between mazes", () => {
    const a = walkFor(42);
    expect(walkFingerprint(walkFor(42))).toBe(walkFingerprint(a));
    expect(walkFingerprint(a)).toMatch(/^w1\.\d+\.\d+\.[0-9a-f]{8}$/);
    const seen = new Set<string>();
    for (const s of [1, 2, 3, 5, 42, 99, 1234]) seen.add(walkFingerprint(walkFor(s)));
    expect(seen.size).toBe(7);
    // Same size, one run a hair longer: still another maze.
    const b = walkFor(42);
    b.edges[3] = { ...b.edges[3], length: b.edges[3].length + 1e-3 };
    expect(walkFingerprint(b)).not.toBe(walkFingerprint(a));
  });
});

describe("saving and restoring an attempt", () => {
  it("has no record before the first move", () => {
    const walk = walkFor(5);
    expect(attemptRecord(new FabricMazeController(walk), info(walk))).toBeNull();
  });

  it("round-trips through the store to the same solve state", () => {
    const walk = walkFor(1234);
    const c = new FabricMazeController(walk);
    c.tapEdge(best(c));
    c.tapEdge(best(c));
    // A detour backed out of, then on.
    const last = c.pathEdges[c.pathEdges.length - 1];
    const alt = c.choices().find((e) => e !== last && e !== best(c));
    if (alt !== undefined) {
      c.tapEdge(alt);
      c.tapEdge(alt);
    }
    c.tapEdge(best(c));
    const rec = attemptRecord(c, info(walk))!;
    expect(rec.elapsedMs).toBe(12_346);
    expect(rec.taps).toEqual(c.taps);
    expect(rec.path).toEqual(c.pathEdges);
    expect(rec.moves).toBe(c.moveLog.join(""));
    // Through storage and back (a reload).
    const s = new MemStorage();
    new DailyStore(s).saveAttempt(3, rec);
    const back = new DailyStore(s).attempt(3)!;
    expect(validAttempt(back)).toEqual(rec);
    const d = new FabricMazeController(walkFor(1234));
    expect(restoreAttempt(d, back, walkFingerprint(d.walk))).toBe("ok");
    expect([d.head, d.pathEdges, d.backtrackDist, d.moveLog.join(""), d.taps]).toEqual([
      c.head,
      c.pathEdges,
      c.backtrackDist,
      rec.moves,
      c.taps,
    ]);
  });

  it("refuses another maze, illegal taps and a path it does not reach", () => {
    const walk = walkFor(42);
    const c = new FabricMazeController(walk);
    for (let i = 0; i < 4; i++) c.tapEdge(best(c));
    const rec = attemptRecord(c, info(walk))!;
    const fresh = (): FabricMazeController => new FabricMazeController(walkFor(42));
    // The generation code moved: another walk graph.
    const d1 = fresh();
    expect(restoreAttempt(d1, rec, "w1.1.1.00000000")).toBe("maze");
    expect(d1.taps).toEqual([]);
    const d2 = fresh();
    expect(restoreAttempt(d2, { ...rec, taps: [...rec.taps, 99999] }, rec.maze)).toBe("taps");
    expect(d2.head).toBe(d2.walk.start);
    const d3 = fresh();
    expect(restoreAttempt(d3, { ...rec, path: rec.path.slice(0, -1) }, rec.maze)).toBe("path");
    expect(d3.taps).toEqual([]);
  });

  it("restores a finished walk as solved (the arrival is then recorded)", () => {
    const walk = walkFor(99);
    const c = new FabricMazeController(walk);
    while (!c.solved) c.tapEdge(best(c));
    const d = new FabricMazeController(walkFor(99));
    expect(restoreAttempt(d, attemptRecord(c, info(walk))!, walkFingerprint(walk))).toBe("ok");
    expect(d.solved).toBe(true);
  });
});

describe("the Reset path rule (K47)", () => {
  const rule = (dailyAttempt: boolean, official: boolean, solved: boolean, trailMode: boolean) =>
    resetPathAction({ dailyAttempt, official, solved, trailMode });

  it("backtracks inside a daily's official-to-be attempt, never restarts it", () => {
    expect(rule(true, false, false, false)).toBe("backtrack");
    // Memory-trail mode has no way back: nothing happens.
    expect(rule(true, false, false, true)).toBe("refuse");
  });

  it("restarts anywhere else, as it always has", () => {
    expect(rule(false, false, false, false)).toBe("restart"); // ordinary design
    expect(rule(true, true, false, false)).toBe("restart"); // a replay
    expect(rule(true, true, false, true)).toBe("restart");
    expect(rule(true, false, true, false)).toBe("restart"); // solved
    expect(rule(false, false, false, true)).toBe("restart");
    // K146: a practice run (a past daily begun after its day) is not the
    // official-to-be attempt either.
    const practice = { dailyAttempt: true, official: false, solved: false, practice: true };
    expect(resetPathAction({ ...practice, trailMode: false })).toBe("restart");
    expect(resetPathAction({ ...practice, trailMode: true })).toBe("restart");
  });

  it("as backtracking it keeps the attempt: a replay of its taps agrees", () => {
    const walk = walkFor(5);
    const c = new FabricMazeController(walk);
    for (let i = 0; i < 3; i++) c.tapEdge(best(c));
    const before = c.taps.length;
    expect(c.retreatToStart().length).toBe(3);
    const rec = attemptRecord(c, info(walk))!;
    expect(rec.taps.length).toBe(before + 3);
    expect(rec.moves.endsWith("bbb")).toBe(true);
    const d = new FabricMazeController(walkFor(5));
    expect(restoreAttempt(d, rec, rec.maze)).toBe("ok");
    expect(d.head).toBe(walk.start);
    expect(d.backtrackDist).toBeCloseTo(c.backtrackDist, 12);
  });
});

describe("explored runs (the fog of war over a restore, K100)", () => {
  // Up to n runs out along the best route, short of the exit.
  const walkOut = (c: FabricMazeController, n: number): number[] => {
    const runs: number[] = [];
    for (let i = 0; i < n; i++) {
      const eid = best(c);
      const e = c.walk.edges[eid];
      if ((e.va === c.head ? e.vb : e.va) === c.walk.exit) break;
      c.tapEdge(eid);
      runs.push(eid);
    }
    return runs;
  };

  it("are every run crossed since the solve restarted, repeats kept", () => {
    const c = new FabricMazeController(walkFor(1234));
    expect(exploredRuns(c)).toEqual([]);
    const [a, b] = walkOut(c, 2);
    expect(exploredRuns(c)).toEqual([a, b]);
    // Walked back to the entrance by hand: the fog keeps what it saw, and
    // the way back is a second pass over each run.
    c.tapEdge(b);
    c.tapEdge(a);
    expect([c.head, c.pathEdges]).toEqual([c.walk.start, []]);
    expect(exploredRuns(c)).toEqual([a, b, b, a]);
    // A daily's Reset path (retreatToStart) keeps it too.
    c.tapEdge(a);
    expect(c.retreatToStart()).toEqual([a]);
    expect(exploredRuns(c)).toEqual([a, b, b, a, a, a]);
    // Only a restart starts it over.
    c.reset();
    expect(exploredRuns(c)).toEqual([]);
    c.tapEdge(a);
    expect(exploredRuns(c)).toEqual([a]);
  });

  it("come back with a saved attempt as live play left them", () => {
    const walk = walkFor(5);
    const c = new FabricMazeController(walk);
    const out = walkOut(c, 4);
    expect(out.length).toBeGreaterThan(2);
    // A daily's Reset path, then the page reloads at the entrance.
    c.retreatToStart();
    const back = [...out].reverse();
    expect(exploredRuns(c)).toEqual([...out, ...back]);
    const s = new MemStorage();
    const restored = (): FabricMazeController => {
      new DailyStore(s).saveAttempt(3, attemptRecord(c, info(walk))!);
      const d = new FabricMazeController(walkFor(5));
      const saved = new DailyStore(s).attempt(3)!;
      expect(restoreAttempt(d, saved, walkFingerprint(d.walk))).toBe("ok");
      return d;
    };
    const d1 = restored();
    expect([d1.head, d1.pathEdges]).toEqual([walk.start, []]);
    expect(exploredRuns(d1)).toEqual(exploredRuns(c));
    // Out again, and another reload.
    walkOut(c, 1);
    const d2 = restored();
    expect(exploredRuns(d2)).toEqual([...out, ...back, out[0]]);
    expect(exploredRuns(d2)).toEqual(exploredRuns(c));
  });

  it("in trail mode are every tap, as before (it has no way back)", () => {
    const t = new FabricMazeController(walkFor(1234), true);
    const a = t.choices()[0];
    t.tapEdge(a);
    t.tapEdge(a);
    expect(exploredRuns(t)).toEqual([a, a]);
    expect(t.retreatToStart()).toEqual([]);
    expect(exploredRuns(t)).toEqual([a, a]);
  });

  it("survive a K80 catch, which is not a restart", () => {
    const c = new FabricMazeController(walkFor(1234));
    const out = walkOut(c, 3);
    c.respawn();
    expect(c.head).toBe(c.walk.start);
    expect(exploredRuns(c)).toEqual(out);
  });
});
