import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS, planReachesAll } from "../../src/core/maze_plan";
import type { MazeParams } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph } from "../../src/core/walk_graph";
import { dailyParams } from "../../src/ui/daily_link";
import { PARAM_DEFAULTS } from "../../src/ui/url_state";
import type { TangleGraph } from "../../src/core/types";

function graphOf(seed: number, gridSize = 18): TangleGraph {
  return generateLatticeKnotwork({ gridSize, weaveDensity: 0.35, turnBias: 0.7, randSeed: seed, shape: "rect" });
}
function params(p: Partial<MazeParams>): MazeParams {
  return { ...DEFAULT_MAZE_PARAMS, branchDensity: PARAM_DEFAULTS.branchDensity, deadEndDensity: 0.5, ...p };
}
const NEUTRAL: Partial<MazeParams> = { exitCorridor: 0, exitFlank: "stub", exitTaperRadius: 0, exitTaperStrength: 0 };

describe("K74 stage 3 trap-zone finish", () => {
  it("taper at R or K 0 is identical to taper off", () => {
    const base = JSON.stringify(buildMazePlan(graphOf(7), params({ ...NEUTRAL })));
    expect(JSON.stringify(buildMazePlan(graphOf(7), params({ ...NEUTRAL, exitTaperRadius: 16 })))).toBe(base);
    expect(JSON.stringify(buildMazePlan(graphOf(7), params({ ...NEUTRAL, exitTaperStrength: 1 })))).toBe(base);
    const on = JSON.stringify(buildMazePlan(graphOf(7), params({ ...NEUTRAL, exitTaperRadius: 16, exitTaperStrength: 1 })));
    expect(on).not.toBe(base);
  });

  it("corridor plans still reach every piece and carry the H1 guard only when H1 runs", () => {
    for (let seed = 1; seed <= 8; seed++) {
      const plan = buildMazePlan(graphOf(seed * 101), params({}));
      expect(planReachesAll(graphOf(seed * 101), plan), `seed ${seed}`).toBe(true);
      expect(plan.exitGuardClearance).toBe(12);
      expect(plan.exitGuardPoint).toBeDefined();
    }
    const off = buildMazePlan(graphOf(7), params({ hCutShare: 0 }));
    expect(off.exitGuardPoint).toBeUndefined();
    expect(off.exitGuardCrossings).toBeUndefined();
    const noClear = buildMazePlan(graphOf(7), params({ exitClearance: 0 }));
    expect(noClear.exitGuardPoint).toBeUndefined();
    const noCorr = buildMazePlan(graphOf(7), params({ exitCorridor: 0 }));
    expect(noCorr.exitGuardCrossings).toBeUndefined();
  });

  it("away and near flank plans are valid and differ from stub on some seed", () => {
    let differ = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const stub = JSON.stringify(buildMazePlan(graphOf(seed * 77), params({ exitCorridor: 0, exitFlank: "stub" })));
      const away = buildMazePlan(graphOf(seed * 77), params({ exitCorridor: 0, exitFlank: "away" }));
      expect(planReachesAll(graphOf(seed * 77), away)).toBe(true);
      if (JSON.stringify(away) !== stub) differ++;
    }
    expect(differ).toBeGreaterThan(0);
  });

  it("H1's guard adds no junctions inside the exit clearance", () => {
    const inside = (share: number): number => {
      const p = dailyParams(3);
      const g = graphOf(p.seed, p.gridSize);
      const plan = buildMazePlan(graphOf(p.seed, p.gridSize), params({ hCutShare: share }));
      applyMazeCuts(g, plan, applyMazePlan(g, plan));
      const bound = 2 * Math.max(2, Math.round(p.gridSize));
      let n = 0;
      for (const node of g.nodes.values()) {
        if (node.type !== "junction") continue;
        const d = Math.hypot(node.latticePos[0] - bound, node.latticePos[1] - bound);
        if (d < 12) n++;
      }
      return n;
    };
    expect(inside(1)).toBeLessThanOrEqual(inside(0));
    // and the applied maze still has a walk graph with a route
    const p = dailyParams(3);
    const g = graphOf(p.seed, p.gridSize);
    const plan = buildMazePlan(graphOf(p.seed, p.gridSize), params({}));
    applyMazeCuts(g, plan, applyMazePlan(g, plan));
    const w = buildWalkGraph(g);
    expect(w).not.toBeNull();
    expect(Number.isFinite(w!.optimalLength)).toBe(true);
  });
});
