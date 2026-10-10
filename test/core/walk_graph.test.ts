import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import type { MazeParams } from "../../src/core/maze_plan";
import {
  applyMazePlan,
  applyMazeCuts,
  ENTRANCE_END_IDS,
  EXIT_END_IDS,
} from "../../src/core/maze_apply";
import { buildWalkGraph } from "../../src/core/walk_graph";
import type { WalkGraph } from "../../src/core/walk_graph";
import { NODE_TYPE } from "../../src/core/types";
import type { TangleGraph } from "../../src/core/types";

// P4 Stage 8a: the walk graph - the player-facing structure of the fabric.

const SEEDS = [5, 42, 1234, 2773729296, 99];

const P = (over: Partial<MazeParams>): MazeParams => ({
  ...DEFAULT_MAZE_PARAMS,
  ...over,
});

function fabric(
  seed: number,
  params: MazeParams = DEFAULT_MAZE_PARAMS
): { g: TangleGraph; walk: WalkGraph } {
  const g = generateLatticeKnotwork({
    gridSize: 8,
    weaveDensity: 0.3,
    turnBias: 0.6,
    randSeed: seed,
  });
  const plan = buildMazePlan(g, params);
  const hueGroup = applyMazePlan(g, plan);
  applyMazeCuts(g, plan, hueGroup);
  const walk = buildWalkGraph(g);
  expect(walk).not.toBeNull();
  return { g, walk: walk! };
}

describe("walk graph (P4 Stage 8a)", () => {
  it("covers every junction/end node as a vertex, with matching degree", () => {
    for (const seed of SEEDS) {
      const { g, walk } = fabric(seed, P({ deadEndDensity: 0.5 }));
      for (const [id, node] of g.nodes) {
        if (
          node.type !== NODE_TYPE.JUNCTION &&
          node.type !== NODE_TYPE.END
        ) {
          continue;
        }
        const v = walk.vertices.get(id);
        expect(v, `vertex ${id}`).toBeDefined();
        // A self-loop run occupies two graph arms but is listed once, so
        // walk degree counts it twice.
        let deg = 0;
        for (const eid of v!.edges) {
          const e = walk.edges[eid];
          deg += e.va === e.vb ? 2 : 1;
        }
        expect(deg, `degree of ${id}`).toBe(g.adjacency.get(id)!.length);
      }
    }
  });

  it("maps every run's ctrl span onto its strand's node occurrences", () => {
    for (const seed of SEEDS) {
      const { g, walk } = fabric(seed);
      for (const e of walk.edges) {
        const strand = g.strands[e.chain];
        const nodeCount = strand.isClosed
          ? strand.nodes.length - 1
          : strand.nodes.length;
        expect(e.ctrlB).toBeGreaterThan(e.ctrlA);
        expect(e.ctrlA % 2).toBe(0);
        expect(e.ctrlB % 2).toBe(0);
        expect(e.length).toBeGreaterThan(0);
        expect(strand.nodes[e.ctrlA / 2]).toBe(e.va);
        expect(strand.nodes[(e.ctrlB / 2) % nodeCount]).toBe(e.vb);
      }
    }
  });

  it("tiles every walkable strand completely with runs", () => {
    for (const seed of SEEDS) {
      const { g, walk } = fabric(seed, P({ deadEndDensity: 0.5 }));
      const runLength = new Map<number, number>();
      for (const e of walk.edges) {
        runLength.set(e.chain, (runLength.get(e.chain) ?? 0) + e.length);
      }
      g.strands.forEach((strand, si) => {
        let total = 0;
        for (const eid of strand.edgeIds) {
          const pts = g.edges.get(eid)!.latticePoints;
          for (let m = 1; m < pts.length; m++) {
            total += Math.hypot(
              pts[m][0] - pts[m - 1][0],
              pts[m][1] - pts[m - 1][1]
            );
          }
        }
        const covered = runLength.get(si);
        const hasVertex = strand.nodes.some((id) => {
          const t = g.nodes.get(id)!.type;
          return t === NODE_TYPE.JUNCTION || t === NODE_TYPE.END;
        });
        if (!hasVertex) {
          // Decorative loop: no walkable structure at all.
          expect(covered).toBeUndefined();
        } else {
          expect(covered, `strand ${si}`).toBeCloseTo(total, 6);
        }
      });
    }
  });

  it("picks start/exit among the cut tails with a finite optimal solve", () => {
    for (const seed of SEEDS) {
      const { walk } = fabric(seed);
      expect([...ENTRANCE_END_IDS]).toContain(walk.start);
      expect([...EXIT_END_IDS]).toContain(walk.exit);
      expect(Number.isFinite(walk.optimalLength)).toBe(true);
      expect(walk.optimalLength).toBeGreaterThan(0);
      // Each corner has at least one tail (exactly one when its decoy trim
      // succeeded); every existing tail is a degree-1 vertex that can reach
      // the exit.
      const entrances = ENTRANCE_END_IDS.filter((id) => walk.vertices.has(id));
      const exits = EXIT_END_IDS.filter((id) => walk.vertices.has(id));
      expect(entrances.length).toBeGreaterThanOrEqual(1);
      expect(exits.length).toBeGreaterThanOrEqual(1);
      for (const id of [...entrances, ...exits]) {
        const v = walk.vertices.get(id)!;
        expect(v.edges.length).toBe(1);
        expect(Number.isFinite(walk.distToExit.get(id)!)).toBe(true);
      }
      expect(walk.distToExit.get(walk.start)!).toBeCloseTo(
        walk.optimalLength,
        6
      );
      expect(walk.distToExit.get(walk.exit)).toBe(0);
    }
  });

  it("is deterministic", () => {
    const a = fabric(4242, P({ deadEndDensity: 0.4 }));
    const b = fabric(4242, P({ deadEndDensity: 0.4 }));
    expect(a.walk.start).toBe(b.walk.start);
    expect(a.walk.exit).toBe(b.walk.exit);
    expect(a.walk.optimalLength).toBe(b.walk.optimalLength);
    expect(a.walk.edges).toEqual(b.walk.edges);
    expect([...a.walk.vertices.keys()]).toEqual([...b.walk.vertices.keys()]);
  });
});
