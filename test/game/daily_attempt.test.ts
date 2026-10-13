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

describe("explored runs (the fog of war over a restore)", () => {
  it("are the runs crossed since the path last emptied", () => {
    const walk = walkFor(1234);
    const c = new FabricMazeController(walk);
    expect(exploredRuns(c)).toEqual([]);
    const a = best(c);
    c.tapEdge(a);
    const b = best(c);
    c.tapEdge(b);
    expect(exploredRuns(c)).toEqual([a, b]);
    // Back to the entrance: the fog's memory starts over, as in play.
    c.retreatToStart();
    expect(exploredRuns(c)).toEqual([]);
    c.tapEdge(a);
    expect(exploredRuns(c)).toEqual([a]);
    // Trail mode never empties its path.
    const t = new FabricMazeController(walk, true);
    t.tapEdge(a);
    t.tapEdge(a);
    expect(exploredRuns(t)).toEqual([a, a]);
  });
});
