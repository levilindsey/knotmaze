import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph } from "../../src/core/walk_graph";
import type { WalkGraph } from "../../src/core/walk_graph";
import { FabricMazeController } from "../../src/game/fabric_controller";
import { HINTS_MAX, hintsOf, hintsTag, liveDistances, nextGoodArm } from "../../src/game/hints";

// K137 stage 2: hints and the compass point along the next good arm, the
// first run of the shortest route from the head to the exit over the runs
// still there.

const SEEDS = [5, 42, 1234, 77, 9];

function walkFor(seed: number, deadEndDensity = 0.5): WalkGraph {
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

const farOf = (w: WalkGraph, eid: number, v: string): string => {
  const e = w.edges[eid];
  return e.va === v ? e.vb : e.va;
};

// The reference: the incident run minimizing its length plus its far end's
// distance to the exit (strictly less wins, so the lowest id on a tie when
// the edges are listed in id order).
function bestArm(w: WalkGraph, head: string, dist = w.distToExit): number {
  let best = -1;
  let bestCost = Infinity;
  for (const eid of [...w.vertices.get(head)!.edges].sort((a, b) => a - b)) {
    const far = farOf(w, eid, head);
    if (far === head) continue;
    const cost = w.edges[eid].length + (dist.get(far) ?? Infinity);
    if (cost < bestCost - 1e-9) {
      bestCost = cost;
      best = eid;
    }
  }
  return best;
}

describe("hints (K137 stage 2, pure)", () => {
  it("holds the count to whole numbers in [0, 5]", () => {
    expect(HINTS_MAX).toBe(5);
    expect(hintsOf(7)).toBe(5);
    expect(hintsOf(-1)).toBe(0);
    expect(hintsOf(NaN)).toBe(0);
    expect(hintsOf(2.6)).toBe(3);
    expect(hintsOf(3)).toBe(3);
  });

  it("tags the share text with the hints used", () => {
    expect(hintsTag(0)).toBeNull();
    expect(hintsTag(1)).toBe("💡1");
    expect(hintsTag(4)).toBe("💡4");
  });

  it("points at the shortest route's first run, at every junction of a few seeds", () => {
    for (const seed of SEEDS) {
      const w = walkFor(seed);
      let checked = 0;
      for (const v of w.vertices.keys()) {
        const arm = nextGoodArm(w, w.distToExit, v);
        if (v === w.exit) {
          expect(arm).toBe(-1);
          continue;
        }
        expect(arm).toBe(bestArm(w, v));
        // The arm closes the distance by exactly its length.
        const d = w.distToExit.get(v)!;
        expect(w.edges[arm].length + w.distToExit.get(farOf(w, arm, v))!).toBeCloseTo(d, 9);
        checked++;
      }
      expect(checked).toBeGreaterThan(10);
    }
  });

  it("following it walks the shortest route to the exit", () => {
    for (const seed of SEEDS) {
      const w = walkFor(seed);
      const c = new FabricMazeController(w);
      let guard = 0;
      while (!c.solved && guard++ < 500) {
        const arm = c.goodArm();
        expect(arm).toBeGreaterThanOrEqual(0);
        expect(c.choices()).toContain(arm);
        c.tapEdge(arm);
      }
      expect(c.solved).toBe(true);
      expect(c.pathLength).toBeCloseTo(w.optimalLength, 6);
      expect(c.goodArm()).toBe(-1);
    }
  });

  it("routes round a removed run", () => {
    let detoured = 0;
    for (const seed of SEEDS) {
      const w = walkFor(seed);
      const first = nextGoodArm(w, w.distToExit, w.start);
      // From the start's far end, take the good arm out of play.
      const v = farOf(w, first, w.start);
      const arm = nextGoodArm(w, w.distToExit, v);
      if (arm < 0) continue;
      const live = (eid: number): boolean => eid !== arm;
      const dist = liveDistances(w, live);
      const detour = nextGoodArm(w, dist, v, live);
      expect(detour).not.toBe(arm);
      if (detour < 0) continue; // the run was a bridge: no route left
      expect(w.edges[detour].length + dist.get(farOf(w, detour, v))!).toBeCloseTo(dist.get(v)!, 9);
      expect(dist.get(v)!).toBeGreaterThanOrEqual(w.distToExit.get(v)! - 1e-9);
      detoured++;
    }
    expect(detoured).toBeGreaterThan(0);
    // Nothing removed: the walk's own distances, unchanged.
    const w = walkFor(5);
    expect(liveDistances(w)).toBe(w.distToExit);
    expect(liveDistances(w, () => true)).toBe(w.distToExit);
  });
});

describe("hints in the controller (K137 stage 2)", () => {
  it("counts the hints a solve, and a restart keeps them until clearAids", () => {
    const c = new FabricMazeController(walkFor(42));
    expect(c.hintsLeft).toBe(0);
    expect(c.useHint()).toBe(false);
    c.setRules({ hints: 2 });
    c.reset();
    expect(c.hintsLeft).toBe(2);
    expect(c.useHint()).toBe(true);
    // K838: a second hint is refused - and not spent - until a move.
    expect(c.hintAwaitingMove).toBe(true);
    expect(c.useHint()).toBe(false);
    expect(c.hintsUsed).toBe(1);
    expect(c.tapEdge(c.goodArm())).not.toBe("reject");
    expect(c.hintAwaitingMove).toBe(false);
    expect(c.useHint()).toBe(true);
    expect(c.useHint()).toBe(false);
    expect(c.hintsUsed).toBe(2);
    expect(c.hintsLeft).toBe(0);
    // Undo's replay resets the walk, not the hints.
    c.reset();
    expect(c.hintsUsed).toBe(2);
    c.clearAids();
    expect(c.hintsUsed).toBe(0);
    expect(c.hintsLeft).toBe(2);
  });

  it("spends none once the solve is over", () => {
    const w = walkFor(77);
    const c = new FabricMazeController(w);
    c.setRules({ hints: 5 });
    c.reset();
    while (!c.solved) c.tapEdge(c.goodArm());
    expect(c.useHint()).toBe(false);
    expect(c.hintsUsed).toBe(0);
  });

  it("is off in the cut's walker modes", () => {
    for (const cut of ["lead", "delay"] as const) {
      const c = new FabricMazeController(walkFor(5));
      c.setRules({ hints: 3, cut });
      c.reset();
      expect(c.walkerMode).toBe(cut);
      expect(c.hintsLeft).toBe(0);
    }
  });

  it("chalk marks toggle per junction and clear with the aids", () => {
    const w = walkFor(9);
    const c = new FabricMazeController(w);
    expect(c.toggleChalk()).toBe(true);
    expect(c.chalk.has(c.head)).toBe(true);
    c.tapEdge(c.goodArm());
    expect(c.toggleChalk()).toBe(true);
    expect(c.chalk.size).toBe(2);
    expect(c.toggleChalk()).toBe(false);
    expect(c.chalk.size).toBe(1);
    c.reset();
    expect(c.chalk.size).toBe(1);
    c.clearAids();
    expect(c.chalk.size).toBe(0);
  });
});
