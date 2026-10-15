import { DEFAULT_TUNING } from "./particle_system";
import type { ParticleSystem, PhysicsTuning } from "./particle_system";
import { InThreadHost } from "./physics_host";
import type {
  FreezeInfo,
  HostInfo,
  HostStats,
  LoadStatus,
  PhysicsHost,
  PresettleProgress,
  SettleInfo,
} from "./physics_host";
import type { PhysicsDump } from "./probe_dump";
import { MirrorSystem } from "./mirror_system";
import { fingerprintOf, readSnapshot, snapshotBytes } from "./snapshot";
import type { Fingerprint, SnapshotView } from "./snapshot";
import type { MainToWorker, WorkerToMain } from "./physics_worker_core";
import { VisibleClock } from "./settle_budget";
import type { TangleGraph } from "../core/types";
import type { SceneParams } from "../core/scene_graph";

// THE WORKER HOST (K7 stage 3, docs/design/K7_worker.md, designs 1, 4, 5
// and 6): the physics runs in a module worker (physics_worker.ts, the stage
// 2 core) and main reads a MIRROR (mirror_system.ts) built from its own
// graph, which this host fills from the worker's snapshots. Behind `phw`
// (default off); main.ts picks the host once, at page start.
//
// - INPUT is marshaled: grab/dragTo/release also record the grab on the
//   mirror, so main reads grabbedParticle right after its own call; tug
//   answers 0 (the worker wakes itself and says so with `tugged`).
// - THE CLOCK: each frame posts frame{dt}; the worker steps one substep per
//   task and posts a snapshot after each while a pooled buffer is free.
//   Main keeps the two newest and gives the rest back at once.
// - INTERPOLATION (design 4): a frame renders at now - D (D the median
//   snapshot interval, clamped to 8-50 ms), positions and pass positions
//   lerped between the two newest snapshots by their wall times; discrete
//   state from the newer. Switchable for the A/B: `__knotHostOpts =
//   { interpolate: false }` on the page (a probe hook, read every frame).
// - THE GATE: asleep once the newest snapshot says the worker slept AND it
//   was written after every input main posted (a snapshot written before a
//   wake can still say asleep).
// - THE SETTLE: K147's budget is replaced by the worker's clock (backlog
//   past LAG_MAX_S is dropped); the hidden pre-settle and the physics-off
//   load are one `settle` message each and resolve on `settled` and the
//   snapshot after it.
// - FALLBACK to the in-thread host on a worker error, a message error, no
//   `ready` within READY_TIMEOUT_MS, a fingerprint or size mismatch, or no
//   module Worker. A fallback after a scene was built calls onFallback
//   (main rebuilds the design in-thread, a fresh settle; a K47 attempt
//   lives in localStorage and survives). stats().host says which and why.

export const READY_TIMEOUT_MS = 3000;
// The ready timeout counts main-thread chances to hear the worker, not wall
// time: ticks of READY_TICK_MS, each worth its nominal time however late it
// fires, so a main-thread stall costs one tick. The first frame of an
// `am=instant` design compiles every shader at once (5.3 s on a cold GPU
// cache in stage 3's probe) and a wall-time timer then failed a working
// worker.
export const READY_TICK_MS = 250;
// Interpolation delay bounds (design 4) and the default before any
// interval is measured.
export const INTERP_MIN_MS = 8;
export const INTERP_MAX_MS = 50;
const INTERVALS_KEPT = 16;

// What the host needs of a Worker (tests pass a fake).
export interface WorkerPort {
  postMessage(msg: MainToWorker, transfer: Transferable[]): void;
  terminate(): void;
  onmessage: ((e: MessageEvent<WorkerToMain>) => void) | null;
  onerror: ((e: ErrorEvent) => void) | null;
  onmessageerror: ((e: MessageEvent) => void) | null;
}

export interface WorkerHostOptions {
  // Starts the worker; the default is the module worker. Throwing (or no
  // Worker) falls back at once.
  spawn?: () => WorkerPort;
  readyTimeoutMs?: number;
  // Interpolation when no probe override is set.
  interpolate?: boolean;
  // Pause the worker while the page is hidden (default: when there is a
  // document).
  watchVisibility?: boolean;
}

// The probe hook's shape (window.__knotHostOpts).
interface ProbeOpts {
  interpolate?: boolean;
}

function spawnModuleWorker(): WorkerPort {
  if (typeof Worker === "undefined") throw new Error("no-worker");
  return new Worker(new URL("./physics_worker.ts", import.meta.url), {
    type: "module",
  }) as unknown as WorkerPort;
}

// The structured-cloneable SceneParams the worker regenerates the graph
// from (main's params object carries much more).
export function sceneParamsOf(p: SceneParams): SceneParams {
  return {
    gridSize: p.gridSize,
    weaveDensity: p.weaveDensity,
    turnBias: p.turnBias,
    seed: p.seed,
    shape: p.shape,
    mazeFabric: p.mazeFabric,
    branchDensity: p.branchDensity,
    fourWayFraction: p.fourWayFraction,
    deadEnds: p.deadEnds,
    deadEndDensity: p.deadEndDensity,
    deadEndLength: p.deadEndLength,
    hCutShare: p.hCutShare,
    entranceClearance: p.entranceClearance,
    exitClearance: p.exitClearance,
    junctionSpacing: p.junctionSpacing,
    startAnchor: p.startAnchor,
    exitAnchor: p.exitAnchor,
  };
}

function sameFingerprint(a: Fingerprint, b: Fingerprint): boolean {
  return a.n === b.n && a.c === b.c && a.chains === b.chains && a.hash === b.hash;
}

// A pass position between two snapshots: the newer one when either is
// undefined (NaN) or the pair wraps a closed chain's seam.
function lerpCtrl(a: number, b: number, t: number, closed: boolean, len: number): number {
  if (Number.isNaN(a) || Number.isNaN(b)) return b;
  if (closed && Math.abs(b - a) > len / 2) return b;
  return a + (b - a) * t;
}

// Overwrites the mirror's positions and pass positions (already holding
// snapshot b) with the state t of the way from a to b (design 4).
export function lerpInto(m: ParticleSystem, a: SnapshotView, b: SnapshotView, t: number): void {
  const pa = a.positions;
  const pb = b.positions;
  const pos = m.positions;
  const n2 = pb.length;
  for (let i = 0; i < n2; i++) pos[i] = pa[i] + (pb[i] - pa[i]) * t;
  const qa = a.passes;
  const qb = b.passes;
  for (let k = 0; k < m.crossings.length; k++) {
    const x = m.crossings[k];
    const oc = x.over.chain;
    const uc = x.under.chain;
    const oClosed = m.chainClosed[oc];
    const uClosed = m.chainClosed[uc];
    const oLen = m.chains[oc].length;
    const uLen = m.chains[uc].length;
    const o = k * 4;
    x.over.ctrl = lerpCtrl(qa[o], qb[o], t, oClosed, oLen);
    if (x.over.displayF !== undefined) {
      x.over.displayF = lerpCtrl(qa[o + 1], qb[o + 1], t, oClosed, oLen);
    }
    x.under.ctrl = lerpCtrl(qa[o + 2], qb[o + 2], t, uClosed, uLen);
    if (x.under.displayF !== undefined) {
      x.under.displayF = lerpCtrl(qa[o + 3], qb[o + 3], t, uClosed, uLen);
    }
  }
}

// The render delay: the median of the recent snapshot intervals, clamped.
export function interpDelay(intervals: readonly number[]): number {
  if (intervals.length === 0) return 16;
  const s = [...intervals].sort((x, y) => x - y);
  const med = s[s.length >> 1];
  return Math.min(INTERP_MAX_MS, Math.max(INTERP_MIN_MS, med));
}

interface Held {
  view: SnapshotView;
  buf: ArrayBuffer;
}

// A probe call waiting for the first snapshot written after `inputs`
// inputs (exact: the mirror then shows that snapshot, not an interpolation).
interface Fence {
  inputs: number;
  exact: boolean;
  resolve: (simTime: number) => void;
  reject: (e: Error) => void;
}

interface PendingDump {
  resolve: (d: PhysicsDump) => void;
  reject: (e: Error) => void;
}

type Settled = Extract<WorkerToMain, { type: "settled" }>;

function wallNow(): number {
  return performance.timeOrigin + performance.now();
}

export class WorkerHost implements PhysicsHost {
  private worker: WorkerPort | null = null;
  private inThread: InThreadHost | null = null;
  private reasonText = "";
  // The gen offset the in-thread host's gens are counted from after a
  // fallback, so a deferred write never matches a new scene by accident.
  private genBase = 0;
  private readonly onFallback: () => void;
  private readonly readyTimeoutMs: number;
  private readonly interpolateDefault: boolean;

  private mirror: MirrorSystem | null = null;
  private genN = 0;
  private asleepFlag = false;
  private expect: { fp: Fingerprint; bytes: number } | null = null;
  private ready = false;
  private readyTimer: ReturnType<typeof setTimeout> | null = null;
  private buildWall0 = 0;
  private readyInfo = { ms: 0, genMs: 0, ctorMs: 0 };
  // Inputs posted for this gen (every gen message but frame), against the
  // snapshot's count of inputs the worker had handled.
  private inputsPosted = 0;
  // A reset makes older snapshots stale: they are dropped on arrival.
  private minInputs = 0;
  private held: Held[] = [];
  private lastWallAt = 0;
  private readonly intervals: number[] = [];
  private appliedSeq = -1;
  private appliedExact = false;
  private lastLag = 0;
  private lastTuning: PhysicsTuning = { ...DEFAULT_TUNING };
  private tuningPosted = false;
  private nextTugId = 1;
  // Settles (pre-settle and physics-off load).
  private settleKind: "" | "presettle" | "load" = "";
  private settlePosted = false;
  private settleInputs = 0;
  private settled: Settled | null = null;
  private settledFinal = false;
  private settleSim0 = NaN;
  private settleWall0 = 0;
  private readonly settleClock = new VisibleClock();
  private presettleFlag = false;
  private loadInfo = { ms: 0, wall0: 0 };
  // First sleep after the scene goes live (the budget's record in-thread).
  private liveWall0 = -1;
  private readonly settleInfo: SettleInfo = {
    presettle: { ms: 0, workMs: 0, sim: 0, loader: false, endedBy: "" },
    budget: { ms: 0, sim: 0, lagS: 0, costMs: 0, endedBy: "" },
  };
  // Diagnostics.
  private snapsIn = 0;
  private snapsGiven = 0;
  private framesPosted = 0;
  private lastDelay = 0;
  private lastT = 1;
  private visHandler: (() => void) | null = null;
  // The probe bridge (K7 stage 4): freeze, fences, dumps, and the newest
  // snapshot's live-stepping counters (stats().physMs, liveSubsteps).
  private frozenFlag = false;
  private fences: Fence[] = [];
  private readonly dumps = new Map<number, PendingDump>();
  private nextDumpId = 1;
  private snapStepMs = 0;
  private snapSubsteps = 0;

  constructor(onFallback: () => void, opts: WorkerHostOptions = {}) {
    this.onFallback = onFallback;
    this.readyTimeoutMs = opts.readyTimeoutMs ?? READY_TIMEOUT_MS;
    this.interpolateDefault = opts.interpolate ?? true;
    let w: WorkerPort;
    try {
      w = (opts.spawn ?? spawnModuleWorker)();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.fallBack(msg === "no-worker" ? "no-worker" : `construct: ${msg}`);
      return;
    }
    this.worker = w;
    w.onmessage = (e) => this.onMessage(e.data);
    w.onerror = (e) => {
      e.preventDefault?.();
      this.fallBack(`onerror: ${e.message || "worker failed to load"}`);
    };
    w.onmessageerror = () => this.fallBack("messageerror");
    const watch = opts.watchVisibility ?? typeof document !== "undefined";
    if (watch && typeof document !== "undefined") {
      this.visHandler = () => {
        this.postRaw({ type: document.hidden ? "pause" : "resume" });
      };
      document.addEventListener("visibilitychange", this.visHandler);
    }
  }

  get kind(): "in-thread" | "worker" {
    return this.inThread ? "in-thread" : "worker";
  }
  // Why the host runs in-thread ("" while the worker runs).
  get reason(): string {
    return this.reasonText;
  }
  get gen(): number {
    return this.inThread ? this.genBase + this.inThread.gen : this.genN;
  }
  get view(): ParticleSystem | null {
    return this.inThread ? this.inThread.view : this.mirror;
  }
  get asleep(): boolean {
    return this.inThread ? this.inThread.asleep : this.asleepFlag;
  }
  get presettling(): boolean {
    return this.inThread ? this.inThread.presettling : this.presettleFlag;
  }
  get settleLagS(): number {
    return this.inThread ? this.inThread.settleLagS : this.lastLag;
  }

  build(graph: TangleGraph, params: SceneParams): ParticleSystem {
    if (this.inThread) return this.inThread.build(graph, params);
    this.giveAll();
    this.rejectFences("the scene was rebuilt");
    this.frozenFlag = false;
    this.snapStepMs = 0;
    this.snapSubsteps = 0;
    const mirror = new MirrorSystem(graph);
    this.mirror = mirror;
    this.genN++;
    // As in-thread, the asleep flag carries over: main's settle or a wake
    // follows every build.
    this.expect = {
      fp: fingerprintOf(mirror),
      bytes: snapshotBytes(mirror.particleCount, mirror.crossings.length),
    };
    this.ready = false;
    this.inputsPosted = 0;
    this.minInputs = 0;
    this.lastWallAt = 0;
    this.intervals.length = 0;
    this.appliedSeq = -1;
    this.appliedExact = false;
    this.lastLag = 0;
    this.settleKind = "";
    this.settled = null;
    this.presettleFlag = false;
    this.liveWall0 = -1;
    this.buildWall0 = performance.now();
    this.armReadyTimer();
    this.postRaw({
      type: "init",
      gen: this.genN,
      params: sceneParamsOf(params),
      tuning: { ...this.lastTuning },
    });
    this.tuningPosted = true;
    return mirror;
  }

  dispose(): void {
    if (this.inThread) {
      this.inThread.dispose();
      return;
    }
    this.giveAll();
    this.rejectFences("the scene was disposed");
    this.mirror = null;
    this.genN++;
    this.clearReadyTimer();
  }

  grab(particle: number, x: number, y: number): number {
    if (this.inThread) return this.inThread.grab(particle, x, y);
    const m = this.mirror;
    if (!m) return -1;
    const r = m.grabAt(particle, x, y);
    this.postInput({ type: "grab", gen: this.genN, particle, x, y });
    return r;
  }
  dragTo(x: number, y: number): void {
    if (this.inThread) {
      this.inThread.dragTo(x, y);
      return;
    }
    if (!this.mirror) return;
    this.mirror.dragTo(x, y);
    this.postInput({ type: "drag", gen: this.genN, x, y });
  }
  release(): void {
    if (this.inThread) {
      this.inThread.release();
      return;
    }
    if (!this.mirror) return;
    this.mirror.release();
    this.postInput({ type: "release", gen: this.genN });
  }
  // The worker tugs and wakes itself; `tugged` clears main's asleep flag.
  // Answers 0, so main's own wake() is not needed.
  tug(chain: number, c0: number, c1: number, tap: number, side: number, amp: number): number {
    if (this.inThread) return this.inThread.tug(chain, c0, c1, tap, side, amp);
    if (!this.mirror) return 0;
    this.postInput({
      type: "tug",
      gen: this.genN,
      id: this.nextTugId++,
      chain,
      c0,
      c1,
      tap,
      side,
      amp,
    });
    return 0;
  }
  reset(): void {
    if (this.inThread) {
      this.inThread.reset();
      return;
    }
    const m = this.mirror;
    if (!m) return;
    this.postInput({ type: "reset", gen: this.genN });
    // The worker's reset drops its grab; snapshots do not carry a grab.
    m.release();
    // Snapshots written before the reset are stale.
    this.minInputs = this.inputsPosted;
    this.giveAll();
  }

  wake(): void {
    if (this.inThread) {
      this.inThread.wake();
      return;
    }
    this.asleepFlag = false;
    if (this.mirror) this.postInput({ type: "wake", gen: this.genN });
  }
  sleep(): void {
    if (this.inThread) {
      this.inThread.sleep();
      return;
    }
    this.asleepFlag = true;
    if (this.mirror) this.postInput({ type: "sleep", gen: this.genN });
  }

  frame(dt: number, tuning: PhysicsTuning, now: number, live: boolean, budgetMs: number): boolean {
    if (this.inThread) return this.inThread.frame(dt, tuning, now, live, budgetMs);
    const m = this.mirror;
    if (!m) return true;
    this.postTuning(tuning);
    this.postRaw({ type: "frame", gen: this.genN, dt, ignoreTemp: !live });
    this.framesPosted++;
    if (!live && this.liveWall0 >= 0) this.recordFirstSleep("mode");
    this.applyHeld(performance.timeOrigin + now, this.interpolating());
    return Number.isFinite(m.maxMove);
  }

  // The worker's gate already ran at its batch's end: trust its asleep flag
  // once the snapshot saw every input main posted.
  gateFrame(ignoreTemp: boolean): boolean {
    if (this.inThread) return this.inThread.gateFrame(ignoreTemp);
    const m = this.mirror;
    if (!m || this.asleepFlag) return false;
    if (m.snapshotSeq < 0 || !m.workerAsleep || m.snapshotInputs < this.inputsPosted) {
      return false;
    }
    // Asleep: show the final state exactly (an interpolated frame trails).
    this.applyHeld(Infinity, false);
    this.asleepFlag = true;
    if (this.liveWall0 >= 0) this.recordFirstSleep("sleep");
    return true;
  }

  // K147's budget is the worker's clock in this host: arming records when
  // the scene went live, for the first sleep's record.
  armBudget(budgetMs: number): void {
    if (this.inThread) {
      this.inThread.armBudget(budgetMs);
      return;
    }
    this.liveWall0 = performance.now();
  }
  endBudget(by: string): void {
    if (this.inThread) {
      this.inThread.endBudget(by);
      return;
    }
    if (this.liveWall0 >= 0) this.recordFirstSleep(by);
  }
  disarm(): void {
    if (this.inThread) {
      this.inThread.disarm();
      return;
    }
    this.presettleFlag = false;
    this.liveWall0 = -1;
    this.settleInfo.budget = { ms: 0, sim: 0, lagS: 0, costMs: 0, endedBy: "" };
  }

  beginLoad(): void {
    if (this.inThread) {
      this.inThread.beginLoad();
      return;
    }
    this.disarm();
    this.beginSettleJob("load");
    this.loadInfo.wall0 = performance.now();
  }
  loadFrame(tuning: PhysicsTuning): LoadStatus {
    if (this.inThread) return this.inThread.loadFrame(tuning);
    if (!this.mirror) return "running";
    // As in-thread: physics off never agitates.
    tuning.temperature = 0;
    if (!this.settlePosted) this.postSettle(tuning, { type: "settle", gen: this.genN, kind: "load" });
    this.applyHeld(Infinity, false);
    if (!this.settled || !this.settledFinal) return "running";
    return this.settled.endedBy === "halted" ? "halted" : "done";
  }
  endLoad(): void {
    if (this.inThread) {
      this.inThread.endLoad();
      return;
    }
    this.loadInfo.ms = performance.now() - this.loadInfo.wall0;
    this.settleKind = "";
  }

  beginPresettle(): void {
    if (this.inThread) {
      this.inThread.beginPresettle();
      return;
    }
    if (!this.mirror) return;
    this.beginSettleJob("presettle");
    this.presettleFlag = true;
  }
  // The worker runs the pre-settle flat out to its end condition (sleep,
  // sim or work cap); main polls each frame. Progress for main's loader
  // comes from the snapshots: simDone from their sim time, workMs the wall
  // time since the worker's first progress snapshot (it steps flat out).
  // Until that snapshot no prediction exists, and simDone/workMs report
  // one that is spent, so the loader shows only past LOADER_DELAY_MS.
  presettleFrame(
    tuning: PhysicsTuning,
    settleFirst: boolean,
    simCap: number,
    workCap: number,
    mayFinish: () => boolean
  ): PresettleProgress {
    if (this.inThread) {
      return this.inThread.presettleFrame(tuning, settleFirst, simCap, workCap, mayFinish);
    }
    const m = this.mirror;
    const elapsed = this.settleClock.tick(performance.now());
    if (!m) return { halted: false, end: "", simDone: 0, workMs: 0, elapsed };
    if (!this.settlePosted) {
      this.postSettle(tuning, {
        type: "settle",
        gen: this.genN,
        kind: "presettle",
        settleFirst,
        simCap,
        workCap,
      });
    }
    this.applyHeld(Infinity, false);
    const s = this.settled;
    if (s && this.settledFinal) {
      return {
        halted: s.endedBy === "halted",
        end: s.endedBy === "halted" ? "" : s.endedBy,
        simDone: Number.isNaN(this.settleSim0) ? s.sim : s.sim - this.settleSim0,
        workMs: s.workMs,
        elapsed,
      };
    }
    if (Number.isNaN(this.settleSim0) || m.simTime <= this.settleSim0) {
      return { halted: false, end: "", simDone: simCap, workMs: 0, elapsed };
    }
    return {
      halted: false,
      end: "",
      simDone: m.simTime - this.settleSim0,
      workMs: performance.now() - this.settleWall0,
      elapsed,
    };
  }
  finishPresettle(loaderShown: boolean): void {
    if (this.inThread) {
      this.inThread.finishPresettle(loaderShown);
      return;
    }
    const s = this.settled;
    this.presettleFlag = false;
    this.settleKind = "";
    this.settleInfo.presettle = {
      ms: this.settleClock.tick(performance.now()),
      workMs: s ? s.workMs : 0,
      sim: s ? s.sim : 0,
      loader: loaderShown,
      endedBy: s ? s.endedBy : "",
    };
  }
  // Live after the pre-settle: asleep if the worker's gate tripped there
  // (the worker set its own flag the same way), else awake with no budget.
  goLive(budgetMs: number): void {
    if (this.inThread) {
      this.inThread.goLive(budgetMs);
      return;
    }
    if (this.settled && this.settled.endedBy === "sleep") {
      this.asleepFlag = true;
    } else {
      this.asleepFlag = false;
      this.liveWall0 = performance.now();
    }
  }

  stats(): HostStats {
    if (this.inThread) {
      const st = this.inThread.stats();
      return { ...st, host: { ...st.host, kind: "in-thread", reason: this.reasonText } };
    }
    const m = this.mirror;
    const newest = this.held.length ? this.held[this.held.length - 1].view : null;
    const host: HostInfo = {
      kind: "worker",
      reason: "",
      interpolate: this.interpolating(),
      delayMs: this.lastDelay,
      lastT: this.lastT,
      snapshots: this.snapsIn,
      given: this.snapsGiven,
      frames: this.framesPosted,
      inputs: this.inputsPosted,
      ready: this.ready,
      readyMs: this.readyInfo.ms,
      genMs: this.readyInfo.genMs,
      ctorMs: this.readyInfo.ctorMs,
      snapAgeMs: newest ? wallNow() - newest.wallAt : -1,
      // The newest snapshot's sim time (the mirror shows it on a frame).
      snapSim: newest ? newest.simTime : 0,
      substeps: newest ? newest.substeps : 0,
      workerFrames: newest ? newest.frames : 0,
      lagS: this.lastLag,
      sim: m ? m.simTime : 0,
    };
    return {
      steps: newest ? newest.substeps : 0,
      loadMs: this.loadInfo.ms,
      loadStepMs: 0,
      loadSteps: 0,
      loadFrames: 0,
      presettle: this.presettleFlag,
      budget: null,
      settleInfo: {
        presettle: { ...this.settleInfo.presettle },
        budget: { ...this.settleInfo.budget },
      },
      physMs: this.snapStepMs,
      liveSubsteps: this.snapSubsteps,
      frozen: this.frozenFlag,
      host,
    };
  }

  // --- the probe bridge (K7 stage 4, design 8) ---

  // The worker stops its live clock; resolves once a snapshot written after
  // the freeze arrived, which the mirror then shows exactly.
  freeze(on: boolean): Promise<FreezeInfo> {
    if (this.inThread) return this.inThread.freeze(on);
    if (!this.mirror) return Promise.reject(new Error("no scene"));
    this.postInput({ type: "freeze", gen: this.genN, on });
    this.frozenFlag = on;
    return this.fence(true).then((simTime) => ({ frozen: on, simTime }));
  }
  stepUntil(simTime: number, tuning: PhysicsTuning): Promise<number> {
    if (this.inThread) return this.inThread.stepUntil(simTime, tuning);
    if (!this.mirror) return Promise.reject(new Error("no scene"));
    this.postTuning(tuning);
    this.postInput({ type: "stepUntil", gen: this.genN, simTime });
    return this.fence(true);
  }
  // The worker answers in order, so a dump after stepUntil holds its state.
  dump(): Promise<PhysicsDump> {
    if (this.inThread) return this.inThread.dump();
    if (!this.mirror) return Promise.reject(new Error("no scene"));
    const id = this.nextDumpId++;
    return new Promise<PhysicsDump>((resolve, reject) => {
      this.dumps.set(id, { resolve, reject });
      this.postRaw({ type: "dump", id });
    });
  }
  sync(): Promise<void> {
    if (this.inThread) return this.inThread.sync();
    if (!this.mirror) return Promise.resolve();
    return this.fence(false).then(() => undefined);
  }

  // --- internals ---

  private interpolating(): boolean {
    const o = (globalThis as { __knotHostOpts?: ProbeOpts }).__knotHostOpts;
    if (o && typeof o.interpolate === "boolean") return o.interpolate;
    return this.interpolateDefault;
  }

  private postRaw(msg: MainToWorker, transfer: Transferable[] = []): void {
    if (!this.worker) return;
    try {
      this.worker.postMessage(msg, transfer);
    } catch (e) {
      this.fallBack(`postMessage: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  // A gen message the worker counts as an input.
  private postInput(msg: MainToWorker): void {
    this.inputsPosted++;
    this.postRaw(msg);
  }
  private postTuning(t: PhysicsTuning): void {
    const last = this.lastTuning as unknown as Record<string, number>;
    const next = t as unknown as Record<string, number>;
    let changed = !this.tuningPosted;
    for (const k in next) {
      if (last[k] !== next[k]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    this.lastTuning = { ...t };
    this.tuningPosted = true;
    if (this.mirror) this.postInput({ type: "tuning", gen: this.genN, t: { ...t } });
  }

  private beginSettleJob(kind: "presettle" | "load"): void {
    this.settleKind = kind;
    this.settlePosted = false;
    this.settled = null;
    this.settledFinal = false;
    this.settleSim0 = NaN;
    this.settleClock.start(performance.now());
  }
  private postSettle(tuning: PhysicsTuning, msg: MainToWorker): void {
    this.postTuning(tuning);
    this.postInput(msg);
    this.settleInputs = this.inputsPosted;
    this.settlePosted = true;
  }

  private onMessage(msg: WorkerToMain): void {
    if (this.inThread) {
      if (msg.type === "snap") this.snapsGiven++;
      return;
    }
    switch (msg.type) {
      case "ready": {
        if (msg.gen !== this.genN || !this.expect) return;
        this.clearReadyTimer();
        if (msg.bytes !== this.expect.bytes) {
          this.fallBack(`snapshot size ${msg.bytes} B, mirror wants ${this.expect.bytes}`);
          return;
        }
        if (!sameFingerprint(msg.fingerprint, this.expect.fp)) {
          const a = msg.fingerprint;
          const b = this.expect.fp;
          this.fallBack(
            `fingerprint ${a.n}/${a.c}/${a.chains}/${a.hash} vs mirror ${b.n}/${b.c}/${b.chains}/${b.hash}`
          );
          return;
        }
        this.ready = true;
        this.readyInfo = {
          ms: performance.now() - this.buildWall0,
          genMs: msg.genMs,
          ctorMs: msg.ctorMs,
        };
        return;
      }
      case "snap":
        this.receive(msg.gen, msg.buf);
        return;
      case "settled":
        if (msg.gen !== this.genN || this.settleKind === "") return;
        this.settled = msg;
        this.settledFinal = false;
        return;
      case "tugged":
        if (msg.gen === this.genN && msg.count > 0) this.asleepFlag = false;
        return;
      case "error":
        this.fallBack(`worker error: ${msg.message}`);
        return;
      case "dumped": {
        const p = this.dumps.get(msg.id);
        if (!p) return;
        this.dumps.delete(msg.id);
        p.resolve({
          gen: msg.gen,
          simTime: msg.simTime,
          positions: msg.positions,
          prev: msg.prev,
          zPos: msg.zPos,
          passes: msg.passes,
        });
        return;
      }
    }
  }

  // The first snapshot written after every input posted so far (at once if
  // the newest held one is). exact: older held snapshots go back and the
  // mirror shows it, so a frozen scene renders that state, not a lerp.
  private fence(exact: boolean): Promise<number> {
    const inputs = this.inputsPosted;
    const newest = this.held.length ? this.held[this.held.length - 1].view : null;
    if (newest && newest.inputs >= inputs) {
      if (exact) this.showNewest();
      return Promise.resolve(newest.simTime);
    }
    return new Promise<number>((resolve, reject) => {
      this.fences.push({ inputs, exact, resolve, reject });
    });
  }
  private passFences(view: SnapshotView): void {
    const done = this.fences.filter((f) => view.inputs >= f.inputs);
    if (done.length === 0) return;
    this.fences = this.fences.filter((f) => view.inputs < f.inputs);
    if (done.some((f) => f.exact)) this.showNewest();
    for (const f of done) f.resolve(view.simTime);
  }
  private rejectFences(why: string): void {
    const fences = this.fences;
    this.fences = [];
    for (const f of fences) f.reject(new Error(why));
  }
  private showNewest(): void {
    while (this.held.length > 1) this.give(this.held.shift()!.buf);
    this.applyHeld(Infinity, false);
  }

  private receive(gen: number, buf: ArrayBuffer): void {
    if (gen !== this.genN || !this.mirror) {
      this.give(buf);
      return;
    }
    let view: SnapshotView;
    try {
      view = readSnapshot(buf);
    } catch (e) {
      this.fallBack(`snapshot: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }
    if (view.gen !== this.genN || view.inputs < this.minInputs) {
      this.give(buf);
      return;
    }
    this.snapsIn++;
    // The snapshot after `settled` holds the settle's final state.
    if (this.settled) this.settledFinal = true;
    // Progress: the first snapshot written after the worker took the
    // settle message is the settle's start.
    if (
      this.settleKind !== "" &&
      this.settlePosted &&
      Number.isNaN(this.settleSim0) &&
      view.inputs >= this.settleInputs
    ) {
      this.settleSim0 = view.simTime;
      this.settleWall0 = performance.now();
    }
    if (this.lastWallAt > 0) {
      this.intervals.push(view.wallAt - this.lastWallAt);
      if (this.intervals.length > INTERVALS_KEPT) this.intervals.shift();
    }
    this.lastWallAt = view.wallAt;
    this.snapStepMs = view.stepMs;
    this.snapSubsteps = view.substeps;
    this.held.push({ view, buf });
    while (this.held.length > 2) this.give(this.held.shift()!.buf);
    if (this.fences.length) this.passFences(view);
  }

  // Shows the newest snapshot, or (interpolating) the state at renderAt =
  // now - D between the two newest.
  private applyHeld(nowWall: number, interpolate: boolean): void {
    const m = this.mirror;
    const n = this.held.length;
    if (!m || n === 0) return;
    const b = this.held[n - 1].view;
    this.lastLag = b.lag;
    let t = 1;
    if (interpolate && n === 2) {
      const a = this.held[0].view;
      const d = interpDelay(this.intervals);
      this.lastDelay = d;
      const span = b.wallAt - a.wallAt;
      if (span > 0) t = Math.min(1, Math.max(0, (nowWall - d - a.wallAt) / span));
    }
    this.lastT = t;
    if (t >= 1 && this.appliedExact && this.appliedSeq === b.seq) return;
    m.applySnapshot(b);
    this.appliedSeq = b.seq;
    if (t < 1) {
      lerpInto(m, this.held[0].view, b, t);
      this.appliedExact = false;
    } else {
      this.appliedExact = true;
    }
  }

  private give(buf: ArrayBuffer): void {
    this.snapsGiven++;
    if (!this.worker) return;
    try {
      this.worker.postMessage({ type: "give", buf }, [buf]);
    } catch {
      // A detached buffer or a closed worker: nothing to give back.
    }
  }
  private giveAll(): void {
    for (const h of this.held) this.give(h.buf);
    this.held = [];
    this.appliedSeq = -1;
    this.appliedExact = false;
  }

  private recordFirstSleep(by: string): void {
    const m = this.mirror;
    this.settleInfo.budget = {
      ms: performance.now() - this.liveWall0,
      sim: m ? m.simTime : 0,
      lagS: this.lastLag,
      costMs: 0,
      endedBy: by,
    };
    this.liveWall0 = -1;
  }

  // Counts READY_TICK_MS ticks, not wall time (see READY_TICK_MS).
  private armReadyTimer(): void {
    this.clearReadyTimer();
    let left = Math.max(1, Math.ceil(this.readyTimeoutMs / READY_TICK_MS));
    const tick = (): void => {
      this.readyTimer = null;
      if (this.ready || this.inThread) return;
      if (--left <= 0) {
        this.fallBack(`no ready within ${this.readyTimeoutMs} ms`);
        return;
      }
      this.readyTimer = setTimeout(tick, READY_TICK_MS);
    };
    this.readyTimer = setTimeout(tick, READY_TICK_MS);
  }

  private clearReadyTimer(): void {
    if (this.readyTimer !== null) {
      clearTimeout(this.readyTimer);
      this.readyTimer = null;
    }
  }

  private fallBack(reason: string): void {
    if (this.inThread) return;
    this.reasonText = reason;
    this.clearReadyTimer();
    this.rejectFences(`the worker fell back (${reason})`);
    for (const d of this.dumps.values()) d.reject(new Error(`the worker fell back (${reason})`));
    this.dumps.clear();
    const hadScene = this.mirror !== null;
    this.held = [];
    this.mirror = null;
    if (this.worker) {
      this.worker.onmessage = null;
      this.worker.onerror = null;
      this.worker.onmessageerror = null;
      try {
        this.worker.terminate();
      } catch {
        // Already gone.
      }
      this.worker = null;
    }
    if (this.visHandler && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.visHandler);
    }
    this.visHandler = null;
    this.genBase = this.genN + 1;
    this.inThread = new InThreadHost();
    console.warn(`KnotMaze: physics worker off (${reason}); physics runs in-thread.`);
    // Never inside a host call: main rebuilds the design on its own stack.
    if (hadScene) setTimeout(() => this.onFallback(), 0);
  }
}
