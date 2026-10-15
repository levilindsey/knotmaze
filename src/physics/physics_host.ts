import {
  ParticleSystem,
  SUBSTEP,
  MAX_FRAME_DT,
  MAX_SUBSTEPS_PER_FRAME,
} from "./particle_system";
import type { PhysicsTuning } from "./particle_system";
import { SleepGate, physicsQuiet } from "./sleep_gate";
import {
  budgetedStep,
  newSettleBudget,
  recordStepCost,
  VisibleClock,
} from "./settle_budget";
import type { SettleBudget, StepLimits } from "./settle_budget";
import type { TangleGraph } from "../core/types";
import type { SceneParams } from "../core/scene_graph";

// THE PHYSICS HOST (K7 stage 1, docs/design/K7_worker.md). Every main-thread
// WRITE to the physics goes through a PhysicsHost: the build, input (grab,
// dragTo, release, tug, reset), the frame's step with K147's budget, the
// sleep gate, and the hidden loads' slices. Readers (renderers, picks, the
// probe hooks) read `view`, the host's ParticleSystem, read-only by
// contract; test/physics/host_seam.test.ts guards main.ts. InThreadHost runs
// today's code on the main thread, number for number; a worker host (stage
// 3) implements the same interface over messages.
//
// The code in PhysicsCore is moved verbatim from main.ts (stage 1 changes
// no number): the step path with the budget, the gate's frame call, the
// physics-off load and the pre-settle loops, the tug's wake. Main keeps
// what is UI: physState, the loader, the reveal, the scene's visibility.

// THE LOAD SETTLE (K147, docs/design/K147.md). With physics on, a new or
// replayed knot settles in two phases, both through the normal step():
// (1) THE PRE-SETTLE: with any non-instant appear mode the knot first
// settles HIDDEN, in the physics-off loader's SETTLE_CHUNK_MS slices, so the
// reveal plays over a calmer fabric than the initial snap. It ends after
// PRESETTLE_SIM simulated seconds or `loadSettle` seconds of STEPPING WORK
// (the time inside step(), so a device's speed, not the frame overhead
// between chunks, sets it), whichever first (until K147 a blocking loop
// with these two caps froze the page for them); at loadSettle's max it
// lasts until the first sleep (LOAD_SIM_CAP /
// LOAD_WALL_CAP_MS as for the physics-off load): settle first, then the
// intro. The trefoil shows only for a settle predicted past
// LOADER_DELAY_MS, and then for at least LOADER_MIN_MS (no flash).
// (2) THE BUDGETED SETTLE: from the first visible frame until the first
// sleep, the physics gets at most `settleBudget` ms a frame
// (physics/settle_budget.ts) and the rest of a frame's request is DROPPED,
// so the settle plays in slow motion at the render's frame rate instead of
// the catch-up spiral (a gs 18 settle ran ~12 ms a substep, 5 fps for the
// whole intro). It stands aside while a thread is grabbed, and ends at the
// first sleep or at LOAD_SIM_CAP simulated seconds - a SIMULATED cap like
// the loader's: a wall cap would hand a slow device back to the spiral
// mid-settle - or, last resort, BUDGET_WALL_CAP_MS. Both phases' wall caps
// count VISIBLE time (VisibleClock): a hidden tab's gap does not count.
// PRESETTLE_SIM, LOADER_DELAY_MS, LOADER_MIN_MS and NOMINAL_SLEEP_SIM stay
// in main.ts with the loader they time.

// Last resort only. Under 4x CPU throttle a gs 18 settle's budget ran 96-
// 106 s to its first sleep (.claude/probes/K147/results.md), and with one
// substep a frame LOAD_SIM_CAP ends even a never-sleeper's budget within
// 1200 frames, before this on any device rendering under 250 ms a frame.
const BUDGET_WALL_CAP_MS = 300000;
// At least one substep every frame, even when one costs more than the
// budget (measured against one every k frames: .claude/probes/K147).
const SETTLE_MIN_ONE = true;
const STEP_LIMITS: StepLimits = {
  substep: SUBSTEP,
  maxFrameDt: MAX_FRAME_DT,
  maxSubsteps: MAX_SUBSTEPS_PER_FRAME,
};

// PHYSICS OFF (the `physics` param unchecked): every build settles HIDDEN
// behind the loading indicator - normal step() calls at a virtual 60 fps,
// in SETTLE_CHUNK_MS slices per animation frame so the page stays live -
// until the regular sleep gate trips, then the simulation stops for good
// and the appearance animation plays over the frozen layout. A knot that
// never trips the gate (the rare loud attractor) freezes anyway after
// LOAD_SIM_CAP simulated seconds - a SIMULATED cap, so a slow phone still
// gets a settled layout (a 9 s wall cap froze one at 1.1 sim-s under 4x
// CPU throttle, mid-relaxation) - and LOAD_WALL_CAP_MS is only the last
// resort. (A later visible re-settle gives up after main.ts's
// SETTLE_WALL_CAP_MS.)
export const SETTLE_CHUNK_MS = 22;
export const LOAD_SIM_CAP = 10;
export const LOAD_WALL_CAP_MS = 45000;

// One slice of the physics-off load: still running, the layout final
// (asleep or capped), or the state went non-finite.
export type LoadStatus = "running" | "done" | "halted";

// One slice of the pre-settle, for main's loader and finish calls.
export interface PresettleProgress {
  // The state went non-finite (the pre-settle is over).
  halted: boolean;
  // Why it may end: "" (still settling), "sleep", "sim", "wall", "work".
  end: string;
  // Simulated seconds and step() wall ms since it began.
  simDone: number;
  workMs: number;
  // Visible wall ms since it began (VisibleClock).
  elapsed: number;
}

// The last pre-settle and budgeted settle (probes: __knotSettle).
export interface SettleInfo {
  presettle: { ms: number; workMs: number; sim: number; loader: boolean; endedBy: string };
  budget: { ms: number; sim: number; lagS: number; costMs: number; endedBy: string };
}

// Counters and settle state for the probe hooks (__knotPerf, __knotSettle).
export interface HostStats {
  // step() calls ever made (probes: physics off must add none).
  steps: number;
  // Last hidden load's wall time, of which inside step(), over this many
  // virtual frames, across this many real frames.
  loadMs: number;
  loadStepMs: number;
  loadSteps: number;
  loadFrames: number;
  // The pre-settle is running.
  presettle: boolean;
  // The armed settle budget (null: not armed).
  budget: { budgetMs: number; costMs: number; lagS: number } | null;
  settleInfo: SettleInfo;
}

export interface PhysicsHost {
  readonly kind: "in-thread" | "worker";
  // Bumps on every build: a deferred write checks it still targets the
  // scene it was made for.
  readonly gen: number;
  // The system readers use: read-only by contract (no step, grab, dragTo,
  // release, tug or reset through it). null before the first build.
  readonly view: ParticleSystem | null;
  // The sleep gate tripped (or the scene is frozen): no step until wake().
  readonly asleep: boolean;
  // The pre-settle is running.
  readonly presettling: boolean;
  // Simulated seconds the settle budget dropped, while armed or after.
  readonly settleLagS: number;

  build(graph: TangleGraph, params: SceneParams): ParticleSystem;
  dispose(): void;

  // Input. grab takes the particle main picked on `view` (-1: none).
  grab(particle: number, x: number, y: number): number;
  dragTo(x: number, y: number): void;
  release(): void;
  tug(chain: number, c0: number, c1: number, tap: number, side: number, amp: number): number;
  reset(): void;

  wake(): void;
  sleep(): void;

  // A live frame: steps `dt` of simulated time under K147's budget (while
  // armed and `live`, at `budgetMs` a frame). `now` is the frame's start
  // (the budget's cost includes the budget's own bookkeeping, as before).
  // False: the state went non-finite.
  frame(dt: number, tuning: PhysicsTuning, now: number, live: boolean, budgetMs: number): boolean;
  // The sleep gate on the last frame(), after the render (fabricTick may
  // wake the knot in between). True: it tripped (asleep; budget ended).
  gateFrame(ignoreTemp: boolean): boolean;

  // K147's budgeted settle.
  armBudget(budgetMs: number): void;
  endBudget(by: string): void;
  // Ends the pre-settle and disarms the budget, forgetting the last one.
  disarm(): void;

  // The physics-off load: beginLoad, a loadFrame per animation frame,
  // endLoad when it is done.
  beginLoad(): void;
  loadFrame(tuning: PhysicsTuning): LoadStatus;
  endLoad(): void;

  // The pre-settle: beginPresettle, a presettleFrame per animation frame,
  // then finishPresettle (before main's UI) and goLive (after it).
  // mayFinish: main's loader has shown long enough (or never showed).
  beginPresettle(): void;
  presettleFrame(
    tuning: PhysicsTuning,
    settleFirst: boolean,
    simCap: number,
    workCap: number,
    mayFinish: () => boolean
  ): PresettleProgress;
  finishPresettle(loaderShown: boolean): void;
  goLive(budgetMs: number): void;

  stats(): HostStats;
}

function emptyBudgetInfo(): SettleInfo["budget"] {
  return { ms: 0, sim: 0, lagS: 0, costMs: 0, endedBy: "" };
}

// What every host shares: the sleep gate, the step paths, K147's budget and
// the loads' loops, on one ParticleSystem. A worker host runs one in the
// worker.
export class PhysicsCore {
  ps: ParticleSystem | null = null;
  gen = 0;
  // Quiescence: a motionless deterministic knot stays motionless without
  // external input, so once the sleep gate trips (its quiet run spans
  // QUIET_WINDOW simulated seconds), the frame skips both physics and
  // rendering entirely until something wakes it.
  asleep = false;
  // The sleep gate (physics/sleep_gate.ts, a SIM-TIME window since K63):
  // shared by the live ticker, the visible settle and the hidden loads.
  private readonly gate = new SleepGate();
  private stepCount = 0;
  private loadWall0 = 0;
  private loadMs = 0;
  private loadStepMs = 0;
  private loadSteps = 0;
  private loadFrames = 0;
  // K147 LOAD SETTLE (see the note at the top). The hidden pre-settle runs
  // while `presettle` is set (main's physState "loading");
  // presettleEnd says why it may end ("" = still settling).
  private presettle = false;
  private presettleWall0 = 0;
  private readonly presettleClock = new VisibleClock();
  private presettleSim0 = 0;
  private presettleWorkMs = 0; // Wall ms inside its step() slices.
  private presettleEnd = "";
  // The budgeted settle, armed from the first visible frame until the first
  // sleep (null = not armed).
  private armedBudget: SettleBudget | null = null;
  private budgetWall0 = 0;
  private readonly budgetClock = new VisibleClock();
  private readonly settleInfo: SettleInfo = {
    presettle: { ms: 0, workMs: 0, sim: 0, loader: false, endedBy: "" },
    budget: emptyBudgetInfo(),
  };
  // The last frame()'s start sim time and tuning, for gateFrame().
  private frameSim0 = 0;
  private frameTuning: PhysicsTuning | null = null;

  // gen: the generation to take (the worker takes main's); default the next.
  // The asleep flag and the gate carry over, as they always have: main
  // wakes the knot when the load ends.
  build(graph: TangleGraph, gen?: number): ParticleSystem {
    this.ps = new ParticleSystem(graph);
    this.gen = gen ?? this.gen + 1;
    return this.ps;
  }

  dispose(): void {
    this.ps = null;
    this.gen++;
  }

  grab(particle: number, x: number, y: number): number {
    return this.ps ? this.ps.grabAt(particle, x, y) : -1;
  }
  dragTo(x: number, y: number): void {
    this.ps?.dragTo(x, y);
  }
  release(): void {
    this.ps?.release();
  }
  // A tap's tug wakes the knot when it moved anything.
  tug(chain: number, c0: number, c1: number, tap: number, side: number, amp: number): number {
    if (!this.ps) return 0;
    const n = this.ps.tug(chain, c0, c1, tap, side, amp);
    if (n > 0) this.wake();
    return n;
  }
  reset(): void {
    this.ps?.reset();
  }

  wake(): void {
    this.gate.reset();
    this.asleep = false;
  }
  sleep(): void {
    this.asleep = true;
  }

  // One live frame's step (see PhysicsHost.frame).
  frame(
    requestDt: number,
    tuning: PhysicsTuning,
    now: number,
    live: boolean,
    budgetMs: number
  ): boolean {
    const ps = this.ps;
    if (!ps) return true;
    this.frameSim0 = ps.simTime;
    this.frameTuning = tuning;
    // K147: while the load settle's budget is armed, this frame steps only
    // the substeps the budget affords (none: no step() call at all).
    const budget = this.activeBudget(live, budgetMs);
    if (budget) {
      const s = budgetedStep(budget, requestDt, ps.pendingTime, STEP_LIMITS);
      if (s.dt > 0) {
        ps.step(s.dt, tuning);
        this.stepCount++;
        recordStepCost(budget, performance.now() - now, s.n);
      }
    } else {
      ps.step(requestDt, tuning);
      this.stepCount++;
    }
    return Number.isFinite(ps.maxMove);
  }

  // K7 stage 2: frame()'s unbudgeted step, split for the worker, which runs
  // one substep per task (ps.runSubstep(tuning)) so that input and
  // snapshots interleave with them. Records what gateFrame() reads and
  // returns the substep count, as ps.beginFrame does; with no budget armed
  // (the worker arms none in stage 2) beginBatch + n runSubstep calls is
  // exactly frame(dt, tuning, ...) with live false.
  beginBatch(dt: number, tuning: PhysicsTuning): number {
    const ps = this.ps;
    if (!ps) return 0;
    this.frameSim0 = ps.simTime;
    this.frameTuning = tuning;
    this.stepCount++;
    return ps.beginFrame(dt);
  }

  // The sleep gate, fed the last frame's SIMULATED time (frame-rate
  // independent). Temperature (agitation) holds the knot awake unless
  // ignoreTemp (physics-off settles never agitate).
  gateFrame(ignoreTemp: boolean): boolean {
    const ps = this.ps;
    if (!ps || !this.frameTuning) return false;
    const quiet =
      physicsQuiet(ps) && (ignoreTemp || this.frameTuning.temperature === 0);
    if (this.gate.frame(quiet, ps.simTime - this.frameSim0)) {
      this.asleep = true;
      this.endBudget("sleep");
      return true;
    }
    return false;
  }

  armBudget(budgetMs: number): void {
    this.armedBudget = newSettleBudget(budgetMs, SETTLE_MIN_ONE);
    this.budgetWall0 = performance.now();
    this.budgetClock.start(this.budgetWall0);
  }
  endBudget(by: string): void {
    if (!this.armedBudget || !this.ps) return;
    this.settleInfo.budget = {
      ms: performance.now() - this.budgetWall0,
      sim: this.ps.simTime,
      lagS: this.armedBudget.lagS,
      costMs: this.armedBudget.costMs,
      endedBy: by,
    };
    this.armedBudget = null;
  }
  // This live frame's settle budget, or null. Ends it once the physics is
  // not live, after LOAD_SIM_CAP simulated seconds or BUDGET_WALL_CAP_MS of
  // visible time (the first sleep ends it in gateFrame); stands aside,
  // still armed, while a thread is grabbed or the slider is at 0.
  private activeBudget(live: boolean, budgetMs: number): SettleBudget | null {
    const b = this.armedBudget;
    const ps = this.ps;
    if (!b || !ps) return null;
    const visibleMs = this.budgetClock.tick(performance.now());
    if (!live) this.endBudget("mode");
    else if (ps.simTime > LOAD_SIM_CAP) this.endBudget("sim");
    else if (visibleMs > BUDGET_WALL_CAP_MS) this.endBudget("wall");
    if (!this.armedBudget || ps.grabbedParticle >= 0 || budgetMs <= 0) {
      return null;
    }
    b.budgetMs = budgetMs;
    return b;
  }
  disarm(): void {
    this.presettle = false;
    this.armedBudget = null;
    this.settleInfo.budget = emptyBudgetInfo();
  }

  beginLoad(): void {
    this.disarm();
    this.loadWall0 = performance.now();
    this.gate.reset();
    this.loadStepMs = 0;
    this.loadSteps = 0;
    this.loadFrames = 0;
  }
  // One slice of the hidden settle: virtual 60 fps frames through the
  // normal step() and the normal sleep gate, for SETTLE_CHUNK_MS. Physics
  // off never agitates (temperature would keep it from settling).
  loadFrame(tuning: PhysicsTuning): LoadStatus {
    const ps = this.ps;
    if (!ps) return "running";
    const t0 = performance.now();
    tuning.temperature = 0;
    this.loadFrames++;
    do {
      const s0 = performance.now();
      const sim0 = ps.simTime;
      ps.step(1 / 60, tuning);
      this.loadStepMs += performance.now() - s0;
      this.loadSteps++;
      this.stepCount++;
      if (!Number.isFinite(ps.maxMove)) return "halted";
      if (this.gate.frame(physicsQuiet(ps), ps.simTime - sim0)) return "done";
      if (
        ps.simTime > LOAD_SIM_CAP ||
        performance.now() - this.loadWall0 > LOAD_WALL_CAP_MS
      ) {
        return "done";
      }
    } while (performance.now() - t0 < SETTLE_CHUNK_MS);
    return "running";
  }
  endLoad(): void {
    this.loadMs = performance.now() - this.loadWall0;
  }

  beginPresettle(): void {
    if (!this.ps) return;
    this.presettle = true;
    this.presettleWall0 = performance.now();
    this.presettleClock.start(this.presettleWall0);
    this.presettleSim0 = this.ps.simTime;
    this.presettleWorkMs = 0;
    this.presettleEnd = "";
    this.gate.reset();
  }
  // One slice of the hidden pre-settle: virtual 60 fps frames through the
  // normal step() and the normal sleep gate, for SETTLE_CHUNK_MS. It may
  // end at the first sleep, after simCap simulated seconds or workCap ms of
  // stepping (settleFirst: LOAD_SIM_CAP or LOAD_WALL_CAP_MS); it does end
  // once main's loader, if it showed, has shown long enough (mayFinish),
  // and steps on meanwhile unless asleep.
  presettleFrame(
    tuning: PhysicsTuning,
    settleFirst: boolean,
    simCap: number,
    workCap: number,
    mayFinish: () => boolean
  ): PresettleProgress {
    const ps = this.ps;
    if (!ps) return { halted: false, end: "", simDone: 0, workMs: 0, elapsed: 0 };
    const canFinish = (): boolean => this.presettleEnd !== "" && mayFinish();
    const t0 = performance.now();
    while (this.presettleEnd !== "sleep" && !canFinish()) {
      const s0 = performance.now();
      const sim0 = ps.simTime;
      ps.step(1 / 60, tuning);
      this.stepCount++;
      this.presettleWorkMs += performance.now() - s0;
      if (!Number.isFinite(ps.maxMove)) {
        this.presettle = false;
        return {
          halted: true,
          end: this.presettleEnd,
          simDone: ps.simTime - this.presettleSim0,
          workMs: this.presettleWorkMs,
          elapsed: 0,
        };
      }
      const quiet = physicsQuiet(ps) && tuning.temperature === 0;
      if (this.gate.frame(quiet, ps.simTime - sim0)) {
        this.presettleEnd = "sleep";
      } else if (this.presettleEnd === "") {
        if (ps.simTime - this.presettleSim0 >= simCap) this.presettleEnd = "sim";
        else if (settleFirst) {
          if (this.presettleClock.tick(performance.now()) > LOAD_WALL_CAP_MS) {
            this.presettleEnd = "wall";
          }
        } else if (this.presettleWorkMs >= workCap) this.presettleEnd = "work";
      }
      if (performance.now() - t0 >= SETTLE_CHUNK_MS) break;
    }
    const elapsed = this.presettleClock.tick(performance.now());
    return {
      halted: false,
      end: this.presettleEnd,
      simDone: ps.simTime - this.presettleSim0,
      workMs: this.presettleWorkMs,
      elapsed,
    };
  }
  // The pre-settle is over (main then shows the scene).
  finishPresettle(loaderShown: boolean): void {
    if (!this.ps) return;
    this.presettle = false;
    this.settleInfo.presettle = {
      ms: performance.now() - this.presettleWall0,
      workMs: this.presettleWorkMs,
      sim: this.ps.simTime,
      loader: loaderShown,
      endedBy: this.presettleEnd,
    };
  }
  // Live after the pre-settle: asleep if the sleep gate already tripped,
  // else under the settle budget. The gate's quiet run carries over.
  goLive(budgetMs: number): void {
    if (this.presettleEnd === "sleep") {
      this.asleep = true;
    } else {
      this.asleep = false;
      this.armBudget(budgetMs);
    }
  }

  get presettling(): boolean {
    return this.presettle;
  }
  get settleLagS(): number {
    return this.armedBudget ? this.armedBudget.lagS : this.settleInfo.budget.lagS;
  }

  stats(): HostStats {
    const b = this.armedBudget;
    return {
      steps: this.stepCount,
      loadMs: this.loadMs,
      loadStepMs: this.loadStepMs,
      loadSteps: this.loadSteps,
      loadFrames: this.loadFrames,
      presettle: this.presettle,
      budget: b ? { budgetMs: b.budgetMs, costMs: b.costMs, lagS: b.lagS } : null,
      settleInfo: {
        presettle: { ...this.settleInfo.presettle },
        budget: { ...this.settleInfo.budget },
      },
    };
  }
}

// Today's code on the main thread. Every frame calls `this.ps.step(...)`
// through the instance (in PhysicsCore), so a probe's freeze patch
// (`__knotPS().step = function(){}`) and timing wrappers keep working.
export class InThreadHost implements PhysicsHost {
  readonly kind = "in-thread" as const;
  private readonly core = new PhysicsCore();

  get gen(): number {
    return this.core.gen;
  }
  get view(): ParticleSystem | null {
    return this.core.ps;
  }
  get asleep(): boolean {
    return this.core.asleep;
  }
  get presettling(): boolean {
    return this.core.presettling;
  }
  get settleLagS(): number {
    return this.core.settleLagS;
  }

  // In-thread the params are unused (main built the graph from them); a
  // worker host sends them so the worker builds the same graph.
  build(graph: TangleGraph, _params: SceneParams): ParticleSystem {
    return this.core.build(graph);
  }
  dispose(): void {
    this.core.dispose();
  }

  grab(particle: number, x: number, y: number): number {
    return this.core.grab(particle, x, y);
  }
  dragTo(x: number, y: number): void {
    this.core.dragTo(x, y);
  }
  release(): void {
    this.core.release();
  }
  tug(chain: number, c0: number, c1: number, tap: number, side: number, amp: number): number {
    return this.core.tug(chain, c0, c1, tap, side, amp);
  }
  reset(): void {
    this.core.reset();
  }

  wake(): void {
    this.core.wake();
  }
  sleep(): void {
    this.core.sleep();
  }

  frame(dt: number, tuning: PhysicsTuning, now: number, live: boolean, budgetMs: number): boolean {
    return this.core.frame(dt, tuning, now, live, budgetMs);
  }
  gateFrame(ignoreTemp: boolean): boolean {
    return this.core.gateFrame(ignoreTemp);
  }

  armBudget(budgetMs: number): void {
    this.core.armBudget(budgetMs);
  }
  endBudget(by: string): void {
    this.core.endBudget(by);
  }
  disarm(): void {
    this.core.disarm();
  }

  beginLoad(): void {
    this.core.beginLoad();
  }
  loadFrame(tuning: PhysicsTuning): LoadStatus {
    return this.core.loadFrame(tuning);
  }
  endLoad(): void {
    this.core.endLoad();
  }

  beginPresettle(): void {
    this.core.beginPresettle();
  }
  presettleFrame(
    tuning: PhysicsTuning,
    settleFirst: boolean,
    simCap: number,
    workCap: number,
    mayFinish: () => boolean
  ): PresettleProgress {
    return this.core.presettleFrame(tuning, settleFirst, simCap, workCap, mayFinish);
  }
  finishPresettle(loaderShown: boolean): void {
    this.core.finishPresettle(loaderShown);
  }
  goLive(budgetMs: number): void {
    this.core.goLive(budgetMs);
  }

  stats(): HostStats {
    return this.core.stats();
  }
}
