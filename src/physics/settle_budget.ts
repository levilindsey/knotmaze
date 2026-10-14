// K147: the load settle's per-frame physics budget (docs/design/K147.md).
//
// ParticleSystem.step(dt) keeps the physics on real time: it runs
// floor(acc / SUBSTEP) substeps for the wall time the frame asks for. When
// one substep costs about as much wall time as it simulates (a settling
// gs 18 knot: ~12 ms per 8.3 ms substep on the desktop), every frame asks
// for more substeps than the last and the intro played at ~5 fps until the
// sleep gate stopped the stepping. The budget breaks that loop while the
// load settle lasts: at most `budgetMs` of physics a frame, from a running
// estimate of the cost per substep, and NO BACKLOG - the part of a request
// the budget cannot afford is dropped, not owed, so the settle plays in
// slow motion while the render keeps its own rate.
//
// Pure arithmetic: main.ts feeds the dt this returns to the unchanged
// step(), then reports the wall time the step took.

// The stepper's limits (ParticleSystem's SUBSTEP, MAX_FRAME_DT and
// MAX_SUBSTEPS_PER_FRAME), passed in so this module stays pure.
export interface StepLimits {
  substep: number;
  maxFrameDt: number;
  maxSubsteps: number;
}

export interface SettleBudget {
  // Wall ms of physics a frame may spend (main.ts re-reads the slider).
  budgetMs: number;
  // At least one substep every frame (true), or let frames go without one
  // while a single substep costs more than the budget (false: one substep
  // every ~cost/budget frames).
  minOne: boolean;
  // Running estimate of the wall ms one substep costs; NaN until measured.
  costMs: number;
  // Budget carried between frames, at most max(budget, one substep): a
  // substep dearer than the budget saves up for itself over k frames,
  // while a cheaper one runs floor(budget / cost) every frame. The
  // remainder is NOT carried past that, so the count stays the same frame
  // to frame (1, 2, 1, 2... alternates frame times: judder).
  creditMs: number;
  // Simulated seconds the budget withheld so far (the slow motion's lag
  // behind real time).
  lagS: number;
}

// Weight of the newest per-substep cost sample: the cost moves as the
// contacts go static and the knot calms, so the estimate follows quickly.
export const COST_EMA = 0.4;

export function newSettleBudget(budgetMs: number, minOne = true): SettleBudget {
  return { budgetMs, minOne, costMs: NaN, creditMs: 0, lagS: 0 };
}

// The substeps today's stepping would run: step()'s own arithmetic.
export function substepsFor(acc: number, dt: number, lim: StepLimits): number {
  const n = Math.floor((acc + Math.min(dt, lim.maxFrameDt)) / lim.substep);
  return Math.max(0, Math.min(n, lim.maxSubsteps));
}

export interface BudgetedStep {
  // The dt to feed step(); 0 = skip the step this frame.
  dt: number;
  // Substeps that dt runs, and those today's stepping would have run.
  n: number;
  want: number;
}

// This frame's step. `requestDt` is what today's stepping feeds step()
// (frame time x speedMult), `acc` the stepper's accumulator. When the
// budget affords every substep the request would run, the request goes
// through unchanged. Otherwise the dt runs exactly the n substeps the
// budget affords and leaves the accumulator half a substep full: float
// rounding cannot turn n into n - 1 or n + 1, and nothing is owed.
export function budgetedStep(
  b: SettleBudget,
  requestDt: number,
  acc: number,
  lim: StepLimits
): BudgetedStep {
  const want = substepsFor(acc, requestDt, lim);
  let n: number;
  if (!Number.isFinite(b.costMs) || b.costMs <= 0) {
    // No estimate yet: one substep, then measure.
    n = Math.min(want, 1);
  } else {
    const cost = b.costMs;
    b.creditMs = Math.min(b.creditMs + b.budgetMs, Math.max(b.budgetMs, cost));
    n = Math.min(want, Math.floor(b.creditMs / cost));
    if (b.minOne && want > 0) n = Math.max(n, 1);
    b.creditMs = Math.max(0, b.creditMs - n * cost);
  }
  if (n >= want) return { dt: requestDt, n: want, want };
  b.lagS += (want - n) * lim.substep;
  if (n === 0) return { dt: 0, n: 0, want };
  return { dt: (n + 0.5) * lim.substep - acc, n, want };
}

// After the step: fold its measured wall time into the cost estimate.
export function recordStepCost(b: SettleBudget, ms: number, substeps: number): void {
  if (substeps <= 0 || !(ms >= 0)) return;
  const x = ms / substeps;
  b.costMs = Number.isFinite(b.costMs) ? b.costMs + COST_EMA * (x - b.costMs) : x;
}

// A gap between frames longer than this is a hidden tab (no frames run
// there), not settling time.
export const FRAME_GAP_MS = 1000;

// The wall time the settle's caps count: what passed between frames, less
// any gap over FRAME_GAP_MS. A load opened in a background tab must not
// reach its caps (the settle-first wall cap, the budget's last-resort cap,
// the loader's show delay) before anyone has seen it. A long task (a
// shader compile) over the threshold is skipped too, harmlessly: these
// are last-resort caps.
export class VisibleClock {
  private last = 0;
  private ms = 0;
  start(now: number): void {
    this.last = now;
    this.ms = 0;
  }
  // Call at least once a frame; returns the visible ms since start().
  tick(now: number): number {
    const d = now - this.last;
    this.last = now;
    if (d > 0 && d <= FRAME_GAP_MS) this.ms += d;
    return this.ms;
  }
}
