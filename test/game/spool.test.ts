import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph } from "../../src/core/walk_graph";
import type { WalkGraph } from "../../src/core/walk_graph";
import { FabricMazeController } from "../../src/game/fabric_controller";
import { parFor } from "../../src/game/par";
import {
  SPOOL_SLACK_DEFAULT,
  spoolCapacity,
  spoolRefuses,
  spoolShareUsed,
  spoolSlackOf,
  spoolTag,
} from "../../src/game/spool";

// K137 stage 2: Ariadne's spool. The yarn is the classic path stack: a
// retrace of the last run reels it in, any other move pays a run out
// (loops included), Undo reels in, and a move past the spool is refused.

const SEEDS = [5, 42, 1234, 77, 9];

function walkFor(seed: number): WalkGraph {
  const g = generateLatticeKnotwork({
    gridSize: 8,
    weaveDensity: 0.3,
    turnBias: 0.6,
    randSeed: seed,
  });
  const plan = buildMazePlan(g, { ...DEFAULT_MAZE_PARAMS, deadEndDensity: 0 });
  const hueGroup = applyMazePlan(g, plan);
  applyMazeCuts(g, plan, hueGroup);
  return buildWalkGraph(g)!;
}

function spooled(w: WalkGraph, slack: number | null = SPOOL_SLACK_DEFAULT): FabricMazeController {
  const c = new FabricMazeController(w);
  c.setRules({ spool: slack });
  c.reset();
  return c;
}

const farOf = (w: WalkGraph, eid: number, v: string): string => {
  const e = w.edges[eid];
  return e.va === v ? e.vb : e.va;
};

// A BFS tree from the start that never enters the exit; returns each
// vertex's route from the start (walk-edge ids).
function treeRoutes(w: WalkGraph): Map<string, number[]> {
  const routes = new Map<string, number[]>([[w.start, []]]);
  const queue = [w.start];
  while (queue.length > 0) {
    const v = queue.shift()!;
    for (const eid of w.vertices.get(v)!.edges) {
      const u = farOf(w, eid, v);
      if (routes.has(u) || u === w.exit) continue;
      routes.set(u, [...routes.get(v)!, eid]);
      queue.push(u);
    }
  }
  return routes;
}

// The route from the start to a simple cycle off the exit, and the cycle
// (walk-edge ids from the cycle's first vertex back to it), or null.
function loopFor(w: WalkGraph): { route: number[]; cycle: number[] } | null {
  const routes = treeRoutes(w);
  const tree = new Set<number>();
  for (const r of routes.values()) for (const eid of r) tree.add(eid);
  let best: { route: number[]; cycle: number[] } | null = null;
  for (const e of w.edges) {
    if (tree.has(e.id) || e.va === e.vb) continue;
    const ru = routes.get(e.va);
    const rv = routes.get(e.vb);
    if (!ru || !rv) continue;
    let k = 0;
    while (k < ru.length && k < rv.length && ru[k] === rv[k]) k++;
    // From va: across e to vb, up vb's branch to the fork, down va's.
    const cycle = [e.id, ...rv.slice(k).reverse(), ...ru.slice(k)];
    if (!best || ru.length + cycle.length < best.route.length + best.cycle.length) {
      best = { route: ru, cycle };
    }
  }
  return best;
}

describe("spool rules (K137 stage 2, pure)", () => {
  it("holds the slack to [0.1, 1]; garbage reads the default", () => {
    expect(spoolSlackOf(0)).toBe(0.1);
    expect(spoolSlackOf(5)).toBe(1);
    expect(spoolSlackOf(0.5)).toBe(0.5);
    expect(spoolSlackOf(NaN)).toBe(SPOOL_SLACK_DEFAULT);
    expect(SPOOL_SLACK_DEFAULT).toBe(0.3);
  });

  it("measures the capacity as par does", () => {
    expect(spoolCapacity(10, 0.3)).toBe(parFor(10, 0.3));
    expect(spoolCapacity(10, 0.3)).toBe(13);
    expect(spoolCapacity(7, 1)).toBe(14);
    expect(spoolCapacity(Infinity, 0.3)).toBe(Infinity);
  });

  it("shares, refusals and the share tag", () => {
    expect(spoolShareUsed(5, 10)).toBe(0.5);
    expect(spoolShareUsed(20, 10)).toBe(1);
    expect(spoolShareUsed(5, Infinity)).toBe(0);
    expect(spoolRefuses(12, 13)).toBe(false);
    expect(spoolRefuses(13, 13)).toBe(true);
    expect(spoolRefuses(1e6, Infinity)).toBe(false);
    expect(spoolTag(82, 100)).toBe("🧶 82% of the spool");
    expect(spoolTag(13, 13)).toBe("🧶 100% of the spool");
    expect(spoolTag(3, Infinity)).toBeNull();
  });
});

describe("the spool in the controller (K137 stage 2)", () => {
  it("is off by default and with a null slack", () => {
    for (const c of [new FabricMazeController(walkFor(5)), spooled(walkFor(5), null)]) {
      expect(c.spoolOn).toBe(false);
      expect(c.spoolCap).toBe(Infinity);
      expect(c.spoolShare).toBe(0);
    }
  });

  it("holds par's measure of the optimal route times 1 + slack", () => {
    for (const seed of SEEDS) {
      const w = walkFor(seed);
      const c = spooled(w);
      expect(c.spoolOn).toBe(true);
      expect(Number.isFinite(c.fewestRuns)).toBe(true);
      expect(c.spoolCap).toBe(parFor(c.fewestRuns, 0.3));
      expect(spooled(w, 1).spoolCap).toBe(2 * c.fewestRuns);
    }
  });

  it("pays out a run a move and reels it in on a retrace", () => {
    const w = walkFor(42);
    const c = spooled(w, 1);
    const route = loopFor(w)!.route.concat(loopFor(w)!.cycle).slice(0, 3);
    expect(route.length).toBe(3);
    route.forEach((eid, i) => {
      expect(c.tapEdge(eid)).toBe("advance");
      expect(c.spoolUsed).toBe(i + 1);
    });
    const head = c.pathVertices[c.pathVertices.length - 2];
    expect(c.tapEdge(route[2])).toBe("backtrack");
    expect(c.spoolUsed).toBe(2);
    expect(c.head).toBe(head);
    expect(c.spoolShare).toBeCloseTo(2 / c.spoolCap, 12);
  });

  it("pays out a loop: coming back round to a junction on the yarn", () => {
    let looped = 0;
    for (const seed of SEEDS) {
      const w = walkFor(seed);
      const loop = loopFor(w);
      if (!loop) continue;
      const c = spooled(w, 1);
      const taps = [...loop.route, ...loop.cycle];
      if (taps.length > c.spoolCap) continue;
      for (const eid of taps) expect(c.tapEdge(eid)).toBe("advance");
      expect(c.spoolUsed).toBe(taps.length);
      expect(c.pathEdges).toEqual(taps);
      // Back where the cycle started, with the whole loop paid out.
      expect(c.head).toBe(c.pathVertices[loop.route.length]);
      looped++;
    }
    expect(looped).toBeGreaterThan(0);
  });

  it("refuses a move past the spool, changing nothing; a retrace still reels in", () => {
    let tested = 0;
    for (const seed of SEEDS) {
      const w = walkFor(seed);
      const loop = loopFor(w);
      if (!loop) continue;
      const c = spooled(w);
      const cap = c.spoolCap;
      // The route, then round the cycle until the spool runs out.
      const taps = [...loop.route];
      while (taps.length <= cap) taps.push(...loop.cycle);
      for (let i = 0; i < cap; i++) expect(c.tapEdge(taps[i])).toBe("advance");
      expect(c.spoolUsed).toBe(cap);
      expect(c.spoolShare).toBe(1);
      const before = {
        head: c.head,
        taps: [...c.taps],
        path: [...c.pathEdges],
        walked: c.walkedDist,
        moves: c.moveCount,
      };
      expect(c.tapEdge(taps[cap])).toBe("spool");
      expect({
        head: c.head,
        taps: [...c.taps],
        path: [...c.pathEdges],
        walked: c.walkedDist,
        moves: c.moveCount,
      }).toEqual(before);
      // Reeling in always works at the limit, and then a run pays out again.
      expect(c.tapEdge(c.pathEdges.at(-1)!)).toBe("backtrack");
      expect(c.spoolUsed).toBe(cap - 1);
      expect(c.tapEdge(taps[cap - 1])).toBe("advance");
      expect(c.spoolUsed).toBe(cap);
      // A record that pays out past the spool does not replay.
      const d = spooled(w);
      expect(d.replay(taps.slice(0, cap + 1))).toBe(false);
      expect(d.replay(taps.slice(0, cap))).toBe(true);
      tested++;
    }
    expect(tested).toBeGreaterThan(0);
  });

  it("Undo reels in (one tap fewer replayed)", () => {
    const w = walkFor(1234);
    const c = spooled(w, 1);
    const loop = loopFor(w)!;
    const taps = [...loop.route, ...loop.cycle].slice(0, 4);
    for (const eid of taps) c.tapEdge(eid);
    expect(c.spoolUsed).toBe(4);
    expect(c.replay(c.taps.slice(0, -1))).toBe(true);
    expect(c.spoolUsed).toBe(3);
    expect(c.spoolCap).toBe(parFor(c.fewestRuns, 1));
    // Undoing a reel-in pays the run back out.
    c.tapEdge(c.pathEdges.at(-1)!);
    expect(c.spoolUsed).toBe(2);
    expect(c.replay(c.taps.slice(0, -1))).toBe(true);
    expect(c.spoolUsed).toBe(3);
  });

  it("the fewest-runs route to the exit fits and wins", () => {
    for (const seed of SEEDS) {
      const w = walkFor(seed);
      const c = spooled(w, 0.1);
      // Greedy on runs to the exit: each step to a neighbor one run nearer.
      let guard = 0;
      let result = "";
      while (!c.solved && guard++ < 500) {
        const runs = (v: string): number => {
          // BFS runs from v to the exit.
          const seen = new Map<string, number>([[v, 0]]);
          const q = [v];
          while (q.length) {
            const x = q.shift()!;
            if (x === w.exit) return seen.get(x)!;
            for (const eid of w.vertices.get(x)!.edges) {
              const y = farOf(w, eid, x);
              if (!seen.has(y)) {
                seen.set(y, seen.get(x)! + 1);
                q.push(y);
              }
            }
          }
          return Infinity;
        };
        const here = runs(c.head);
        const next = c.choices().find((eid) => runs(farOf(w, eid, c.head)) === here - 1)!;
        result = c.tapEdge(next);
      }
      expect(result).toBe("win");
      expect(c.spoolUsed).toBe(c.fewestRuns);
      expect(c.spoolUsed).toBeLessThanOrEqual(c.spoolCap);
    }
  });

  it("a restart refills the spool", () => {
    const w = walkFor(77);
    const c = spooled(w);
    const loop = loopFor(w)!;
    for (const eid of [...loop.route, ...loop.cycle].slice(0, 3)) c.tapEdge(eid);
    expect(c.spoolUsed).toBe(3);
    const cap = c.spoolCap;
    c.reset();
    expect(c.spoolUsed).toBe(0);
    expect(c.spoolShare).toBe(0);
    expect(c.spoolCap).toBe(cap);
    // Turning the spool off takes effect at the next restart.
    c.setRules({ spool: null });
    c.reset();
    expect(c.spoolOn).toBe(false);
  });

  it("keeps the cut off (the yarn is the path stack)", () => {
    const c = new FabricMazeController(walkFor(5));
    c.setRules({ cut: "on", spool: 0.3 });
    c.reset();
    expect(c.cutOn).toBe(false);
  });
});
