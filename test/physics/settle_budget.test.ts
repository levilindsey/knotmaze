import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import {
  ParticleSystem,
  SUBSTEP,
  MAX_FRAME_DT,
  MAX_SUBSTEPS_PER_FRAME,
} from "../../src/physics/particle_system";
import {
  budgetedStep,
  newSettleBudget,
  recordStepCost,
  substepsFor,
  COST_EMA,
} from "../../src/physics/settle_budget";

const LIM = {
  substep: SUBSTEP,
  maxFrameDt: MAX_FRAME_DT,
  maxSubsteps: MAX_SUBSTEPS_PER_FRAME,
};

function build(): ParticleSystem {
  const graph = generateLatticeKnotwork({
    gridSize: 6,
    weaveDensity: 0.3,
    turnBias: 0.6,
    randSeed: 7,
  });
  return new ParticleSystem(graph);
}

// Substeps a step(dt) ran, read off the sim clock.
function stepN(ps: ParticleSystem, dt: number): number {
  const t0 = ps.simTime;
  ps.step(dt);
  return Math.round((ps.simTime - t0) / SUBSTEP);
}

describe("K147 settle budget", () => {
  it("substepsFor is step()'s own arithmetic", () => {
    const ps = build();
    for (const dt of [0.1, 0.016, 0.0331, 0.004, 0.3, 0.1, 0.05]) {
      const want = substepsFor(ps.pendingTime, dt, LIM);
      expect(stepN(ps, dt)).toBe(want);
    }
  });

  it("feeds an affordable request through unchanged", () => {
    // 12 substeps at 1.5 ms fit a 20 ms budget.
    const b = newSettleBudget(20);
    b.costMs = 1.5;
    const s = budgetedStep(b, 0.1, 0.004, LIM);
    expect(s.dt).toBe(0.1);
    expect(s.n).toBe(s.want);
    expect(b.lagS).toBe(0);
  });

  it("runs exactly the substeps it plans, with no backlog", () => {
    const ps = build();
    const b = newSettleBudget(12);
    let lag = 0;
    for (let f = 0; f < 40; f++) {
      const before = b.lagS;
      const s = budgetedStep(b, 0.1, ps.pendingTime, LIM);
      const ran = s.dt > 0 ? stepN(ps, s.dt) : 0;
      expect(ran).toBe(s.n);
      // Every frame asks for 12 substeps; a pretend 9.5 ms each affords 1-2.
      recordStepCost(b, ran * 9.5, ran);
      lag += (s.want - s.n) * SUBSTEP;
      expect(b.lagS - before).toBeCloseTo((s.want - s.n) * SUBSTEP, 12);
      // Nothing owed: the accumulator never builds up.
      expect(ps.pendingTime).toBeLessThan(SUBSTEP);
    }
    expect(b.lagS).toBeCloseTo(lag, 9);
    expect(b.lagS).toBeGreaterThan(2);
  });

  it("runs the same count every frame when a substep fits the budget", () => {
    // floor(12 / 5) = 2 a frame; the 2 ms left over is not carried, so no
    // frame runs 3 (alternating counts alternate frame times: judder).
    const b = newSettleBudget(12);
    b.costMs = 5;
    for (let f = 0; f < 50; f++) expect(budgetedStep(b, 0.1, 0, LIM).n).toBe(2);
    const c = newSettleBudget(12);
    c.costMs = 8;
    for (let f = 0; f < 50; f++) expect(budgetedStep(c, 0.1, 0, LIM).n).toBe(1);
  });

  it("minOne keeps one substep a frame when one costs over budget", () => {
    const b = newSettleBudget(12, true);
    b.costMs = 30;
    for (let f = 0; f < 10; f++) expect(budgetedStep(b, 0.1, 0, LIM).n).toBe(1);
    expect(b.creditMs).toBe(0);
  });

  it("without minOne, steps once every ceil(cost / budget) frames", () => {
    const b = newSettleBudget(12, false);
    b.costMs = 30;
    const ns: number[] = [];
    for (let f = 0; f < 10; f++) ns.push(budgetedStep(b, 0.1, 0, LIM).n);
    expect(ns).toEqual([0, 0, 1, 0, 0, 1, 0, 0, 1, 0]);
    // A skipped frame feeds no dt at all.
    const b2 = newSettleBudget(1, false);
    b2.costMs = 30;
    expect(budgetedStep(b2, 0.1, 0.003, LIM).dt).toBe(0);
  });

  it("probes one substep before it has a cost estimate", () => {
    const b = newSettleBudget(12);
    expect(budgetedStep(b, 0.1, 0, LIM).n).toBe(1);
    // A tiny request that runs nothing asks for nothing.
    expect(budgetedStep(newSettleBudget(12), 0.001, 0, LIM).n).toBe(0);
  });

  it("follows the measured cost with an EMA", () => {
    const b = newSettleBudget(12);
    recordStepCost(b, 30, 3);
    expect(b.costMs).toBe(10);
    recordStepCost(b, 20, 1);
    expect(b.costMs).toBeCloseTo(10 + COST_EMA * 10, 12);
    recordStepCost(b, 50, 0);
    expect(b.costMs).toBeCloseTo(10 + COST_EMA * 10, 12);
  });
});
