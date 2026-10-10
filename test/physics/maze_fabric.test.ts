import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import type { MazeParams, MazePlan } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { ParticleSystem } from "../../src/physics/particle_system";
import type { TangleGraph } from "../../src/core/types";

// P4 Stage 6a: the physics builds the branching maze fabric natively from the
// applied graph - open strands, fused junctions, anchored corner ends, free
// stub tips. Knot mode records none of these (byte_identity.test.ts guards
// that path byte-for-byte).

const SEEDS = [5, 42, 1234];

function buildFabric(
  seed: number,
  params: MazeParams = DEFAULT_MAZE_PARAMS
): { graph: TangleGraph; plan: MazePlan; ps: ParticleSystem } {
  const graph = generateLatticeKnotwork({
    gridSize: 8,
    weaveDensity: 0.3,
    turnBias: 0.6,
    randSeed: seed,
  });
  const plan = buildMazePlan(graph, params);
  applyMazePlan(graph, plan);
  applyMazeCuts(graph, plan);
  const ps = new ParticleSystem(graph);
  return { graph, plan, ps };
}

function settle(ps: ParticleSystem, frames = 900): void {
  for (let i = 0; i < frames; i++) ps.step(1 / 60);
}

describe("maze fabric physics (P4 Stage 6a)", () => {
  it("builds natively-open chains for carved and bridge strands", () => {
    for (const seed of SEEDS) {
      const { graph, plan, ps } = buildFabric(seed);
      expect(ps.hasCarve).toBe(true);
      const nTrims =
        (plan.entrance.trim ? 1 : 0) + (plan.exit.trim ? 1 : 0);
      // Every dead-end cut fuses exactly one trim-merge junction too.
      expect(ps.fusedJunctions.length).toBe(
        2 * (plan.spanningSplices.length + plan.choiceSplices.length) +
          plan.spanningMerges.length +
          plan.fourWayMerges.length +
          nTrims +
          plan.deadEndCuts.length
      );
      graph.strands.forEach((s, i) => {
        expect(ps.chainClosed[i]).toBe(s.isClosed);
        expect(ps.chainBreakAfter[i]).toBe(
          s.isClosed ? -1 : ps.chains[i].length - 1
        );
      });
      // Each corner cut pins one loose end per untrimmed flank (one tail
      // when the decoy trim succeeded, two otherwise); stub tips stay free.
      expect(ps.ends.length).toBe(4 - nTrims);
    }
  });

  it(
    "settles finite, bounded, and quiescent",
    () => {
      for (const seed of SEEDS) {
        const { ps } = buildFabric(seed);
        settle(ps);
        for (let i = 0; i < ps.particleCount; i++) {
          expect(Number.isFinite(ps.positions[i * 2])).toBe(true);
          expect(Number.isFinite(ps.positions[i * 2 + 1])).toBe(true);
          expect(Math.abs(ps.positions[i * 2])).toBeLessThan(1000);
          expect(Math.abs(ps.positions[i * 2 + 1])).toBeLessThan(1000);
        }
        expect(ps.maxMove).toBeLessThan(0.05);
      }
    },
    60000
  );

  it(
    "holds every junction coincident at rest",
    () => {
      for (const seed of SEEDS) {
        const { ps } = buildFabric(
          seed,
          // Spicier than default so merges + stubs are exercised too.
          {
            ...DEFAULT_MAZE_PARAMS,
            branchDensity: 0.5,
            deadEndDensity: 0.4,
            fourWayFraction: 0.2,
          }
        );
        settle(ps);
        // The substep-end fusion projection guarantees closed merges.
        for (const group of ps.fusedJunctions) {
          for (let i = 1; i < group.length; i++) {
            const d = Math.hypot(
              ps.positions[group[i] * 2] - ps.positions[group[0] * 2],
              ps.positions[group[i] * 2 + 1] - ps.positions[group[0] * 2 + 1]
            );
            expect(d).toBeLessThan(0.05);
          }
        }
      }
    },
    60000
  );

  it(
    "pins the corner ends exactly at their anchors",
    () => {
      for (const seed of SEEDS) {
        const { ps } = buildFabric(seed);
        settle(ps, 300);
        for (const end of ps.ends) {
          expect(ps.isAnchored(end.particle)).toBe(true);
          // Positions are Float32; compare at float precision.
          expect(ps.positions[end.particle * 2]).toBeCloseTo(end.anchor[0], 4);
          expect(ps.positions[end.particle * 2 + 1]).toBeCloseTo(
            end.anchor[1],
            4
          );
        }
      }
    },
    60000
  );
});
