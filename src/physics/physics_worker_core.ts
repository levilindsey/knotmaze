import { DEFAULT_TUNING, SUBSTEP } from "./particle_system";
import type { ParticleSystem, PhysicsTuning } from "./particle_system";
import { PhysicsCore } from "./physics_host";
import { buildSceneGraph } from "../core/scene_graph";
import type { SceneParams } from "../core/scene_graph";
import { fingerprintOf, snapshotBytes, writeSnapshot } from "./snapshot";
import type { Fingerprint } from "./snapshot";

// THE PHYSICS WORKER'S CORE (K7 stage 2, docs/design/K7_worker.md, designs
// 1, 4, 5 and 6). Everything the physics worker runs, minus the Worker
// itself: stage 3's physics_worker.ts wires onMessage to the worker's
// onmessage, `post` to postMessage and the scheduler to a MessageChannel.
// Tests run it in Node with a synchronous or a hand-cranked scheduler.
//
// It owns a PhysicsCore (stage 1) and steps it ONE SUBSTEP PER TASK, so
// input messages land between substeps, and posts a snapshot after each
// substep while a pooled buffer is free.
//
// THE CLOCK (design 4): main posts frame{dt} with the dt ps.step gets
// in-thread. Allowances queue; a batch takes all of them through
// ps.beginFrame's accumulator math (so at most 0.25 s or 30 substeps) and
// runs the substeps; the sleep gate runs at each batch's end. While a batch
// is in flight, queued allowance past LAG_MAX_S of backlog is dropped and
// counted as lag. Asleep, frozen or settling, frames are discarded. In
// lockstep (each frame's batch done before the next frame arrives, as with
// SyncScheduler) beginBatch + its substeps + gateFrame is exactly
// InThreadHost's frame + gateFrame with no budget armed (K147's budget is
// replaced by this clock, design 5).
//
// GENERATIONS: init{gen} builds a new system from the params (the graph is
// regenerated here; generation is deterministic, K108) and takes main's
// gen. Every other gen-carrying message of another gen is dropped.
//
// Departures from the in-thread host, by design: a drag applies when it
// arrives (between substeps), the tuning too; the gate runs at batch ends,
// not after main's render; the pre-settle ends at its end condition
// (in-thread it steps on until main's loader may close).

// Backlog past this is dropped as lag instead of spiraling (design 4).
export const LAG_MAX_S = 0.05;
// Snapshot buffers in flight (the spike's pool).
export const SNAPSHOT_POOL = 4;

export interface Scheduler {
  schedule(task: () => void): void;
}

// Runs a task at once unless one is running, then drains the queue: every
// message's work completes inside onMessage (lockstep tests).
export class SyncScheduler implements Scheduler {
  private readonly queue: Array<() => void> = [];
  private running = false;
  schedule(task: () => void): void {
    this.queue.push(task);
    if (this.running) return;
    this.running = true;
    try {
      for (let t = this.queue.shift(); t; t = this.queue.shift()) t();
    } finally {
      this.running = false;
    }
  }
}

// Queues tasks for a test to run one at a time (messages in between).
export class ManualScheduler implements Scheduler {
  readonly queue: Array<() => void> = [];
  schedule(task: () => void): void {
    this.queue.push(task);
  }
  runOne(): boolean {
    const t = this.queue.shift();
    if (!t) return false;
    t();
    return true;
  }
  runAll(limit = 1e6): number {
    let n = 0;
    while (n < limit && this.runOne()) n++;
    return n;
  }
}

// One macrotask per task through a MessageChannel (the worker's yield;
// setTimeout clamps to 4 ms after nesting). close() releases the port.
export class ChannelScheduler implements Scheduler {
  private readonly queue: Array<() => void> = [];
  private readonly ch = new MessageChannel();
  constructor() {
    this.ch.port1.onmessage = (): void => {
      const t = this.queue.shift();
      if (t) t();
    };
  }
  schedule(task: () => void): void {
    this.queue.push(task);
    this.ch.port2.postMessage(0);
  }
  close(): void {
    this.ch.port1.close();
    this.ch.port2.close();
  }
}

// Main to worker. Inputs carry the gen they were meant for.
export type MainToWorker =
  | { type: "init"; gen: number; params: SceneParams; tuning: PhysicsTuning }
  | { type: "frame"; gen: number; dt: number; ignoreTemp?: boolean }
  | { type: "grab"; gen: number; particle: number; x: number; y: number }
  | { type: "drag"; gen: number; x: number; y: number }
  | { type: "release"; gen: number }
  | {
      type: "tug";
      gen: number;
      id: number;
      chain: number;
      c0: number;
      c1: number;
      tap: number;
      side: number;
      amp: number;
    }
  | { type: "tuning"; gen: number; t: PhysicsTuning }
  | { type: "reset"; gen: number }
  | { type: "wake"; gen: number }
  | { type: "sleep"; gen: number }
  // The hidden pre-settle (PhysicsCore.presettleFrame's arguments) or the
  // physics-off load (loadFrame), run flat out in SETTLE_CHUNK_MS slices.
  | {
      type: "settle";
      gen: number;
      kind: "presettle";
      settleFirst: boolean;
      simCap: number;
      workCap: number;
    }
  | { type: "settle"; gen: number; kind: "load" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "give"; buf: ArrayBuffer }
  // Probes (design 8).
  | { type: "freeze"; on: boolean }
  | { type: "stepUntil"; gen: number; simTime: number }
  | { type: "dump" };

// Worker to main.
export type WorkerToMain =
  | {
      type: "ready";
      gen: number;
      fingerprint: Fingerprint;
      genMs: number;
      ctorMs: number;
      bytes: number;
    }
  | { type: "snap"; gen: number; buf: ArrayBuffer }
  | {
      type: "settled";
      gen: number;
      // presettle: "sleep" | "sim" | "work" | "wall"; load: "done";
      // either: "halted" (non-finite).
      endedBy: string;
      sim: number;
      workMs: number;
      ms: number;
    }
  | { type: "tugged"; gen: number; id: number; count: number }
  | { type: "error"; message: string; stack?: string }
  | {
      type: "dumped";
      gen: number;
      simTime: number;
      positions: Float32Array;
      prev: Float32Array;
      zPos: Float32Array;
      passes: Float64Array;
    };

export type Post = (msg: WorkerToMain, transfer?: Transferable[]) => void;

interface SettleJob {
  kind: "presettle" | "load";
  settleFirst: boolean;
  simCap: number;
  workCap: number;
  t0: number;
}

// The fields a dump reads that the class keeps private.
interface Internals {
  prev: Float32Array;
  zPos: Float32Array;
}

export class PhysicsWorkerCore {
  readonly core = new PhysicsCore();
  private readonly scheduler: Scheduler;
  private readonly post: Post;
  private tuning: PhysicsTuning = { ...DEFAULT_TUNING };
  // Snapshot buffers back from main, all snapshotBytes(n, c) long.
  private pool: ArrayBuffer[] = [];
  private bytes = 0;
  // The system changed since the last snapshot posted.
  private dirty = false;
  // Counters since init (the snapshot header's).
  private seq = 0;
  private substeps = 0;
  private lag = 0;
  private inputs = 0;
  private frames = 0;
  // The clock: allowance not yet in a batch, and the batch in flight.
  private queued = 0;
  private inBatch = false;
  private remaining = 0;
  private batchIgnoreTemp = false;
  private nextIgnoreTemp = false;
  private settle: SettleJob | null = null;
  private paused = false;
  private frozen = false;
  // Non-finite state: stepping stops until the next init (main halts).
  private halted = false;
  // An error was posted: everything but init is dropped.
  private broken = false;
  private scheduled = false;

  constructor(scheduler: Scheduler, post: Post) {
    this.scheduler = scheduler;
    this.post = post;
  }

  get gen(): number {
    return this.core.gen;
  }
  get ps(): ParticleSystem | null {
    return this.core.ps;
  }
  // Diagnostics for tests and probes.
  get stats(): {
    seq: number;
    substeps: number;
    lag: number;
    queued: number;
    remaining: number;
    pool: number;
    inputs: number;
    frames: number;
    halted: boolean;
  } {
    return {
      seq: this.seq,
      substeps: this.substeps,
      lag: this.lag,
      queued: this.queued,
      remaining: this.remaining,
      pool: this.pool.length,
      inputs: this.inputs,
      frames: this.frames,
      halted: this.halted,
    };
  }

  onMessage(msg: MainToWorker): void {
    try {
      this.handle(msg);
    } catch (e) {
      this.fail(e);
    }
  }

  private handle(msg: MainToWorker): void {
    switch (msg.type) {
      case "give":
        this.give(msg.buf);
        return;
      case "pause":
        this.paused = true;
        return;
      case "resume":
        this.paused = false;
        this.kick();
        return;
      case "freeze":
        this.frozen = msg.on;
        if (msg.on) this.abortBatch();
        return;
      case "dump":
        this.dump();
        return;
      case "init":
        if (msg.gen > this.core.gen) this.init(msg.gen, msg.params, msg.tuning);
        return;
    }
    if (this.broken || !this.core.ps || msg.gen !== this.core.gen) return;
    if (msg.type === "frame") {
      this.frames++;
      this.frame(msg.dt, msg.ignoreTemp === true);
      return;
    }
    if (msg.type === "stepUntil") {
      this.stepUntil(msg.simTime);
      return;
    }
    this.inputs++;
    switch (msg.type) {
      case "grab":
        this.core.grab(msg.particle, msg.x, msg.y);
        break;
      case "drag":
        this.core.dragTo(msg.x, msg.y);
        break;
      case "release":
        this.core.release();
        break;
      case "tug": {
        const count = this.core.tug(msg.chain, msg.c0, msg.c1, msg.tap, msg.side, msg.amp);
        this.post({ type: "tugged", gen: this.core.gen, id: msg.id, count });
        break;
      }
      case "tuning":
        this.tuning = { ...msg.t };
        break;
      case "reset":
        this.abortBatch();
        this.core.reset();
        break;
      case "wake":
        this.core.wake();
        break;
      case "sleep":
        this.core.sleep();
        this.abortBatch();
        break;
      case "settle":
        this.startSettle(msg);
        break;
    }
    this.dirty = true;
    this.flush();
  }

  private init(gen: number, params: SceneParams, tuning: PhysicsTuning): void {
    const t0 = performance.now();
    const { graph } = buildSceneGraph(params);
    const t1 = performance.now();
    const ps = this.core.build(graph, gen);
    const t2 = performance.now();
    this.tuning = { ...tuning };
    this.abortBatch();
    this.settle = null;
    this.halted = false;
    this.broken = false;
    this.frozen = false;
    this.seq = 0;
    this.substeps = 0;
    this.lag = 0;
    this.inputs = 0;
    this.frames = 0;
    this.bytes = snapshotBytes(ps.particleCount, ps.crossings.length);
    this.pool = [];
    for (let k = 0; k < SNAPSHOT_POOL; k++) this.pool.push(new ArrayBuffer(this.bytes));
    this.post({
      type: "ready",
      gen,
      fingerprint: fingerprintOf(ps),
      genMs: t1 - t0,
      ctorMs: t2 - t1,
      bytes: this.bytes,
    });
    this.dirty = true;
    this.flush();
  }

  // A frame's allowance (see THE CLOCK above).
  private frame(dt: number, ignoreTemp: boolean): void {
    if (this.core.asleep || this.frozen || this.settle || this.halted) return;
    const backlog = this.queued + this.remaining * SUBSTEP;
    if (backlog > LAG_MAX_S) {
      const drop = Math.min(this.queued, backlog - LAG_MAX_S);
      this.queued -= drop;
      this.lag += drop;
    }
    this.queued += dt;
    this.nextIgnoreTemp = ignoreTemp;
    if (!this.inBatch) this.startBatch();
  }

  private startBatch(): void {
    this.remaining = this.core.beginBatch(this.queued, this.tuning);
    this.queued = 0;
    this.batchIgnoreTemp = this.nextIgnoreTemp;
    this.inBatch = true;
    this.kick();
  }

  // The batch's remaining substeps and queued allowance are dropped (a
  // reset, a sleep, a freeze); the gate does not run for it.
  private abortBatch(): void {
    this.inBatch = false;
    this.remaining = 0;
    this.queued = 0;
  }

  private kick(): void {
    if (this.scheduled || this.paused) return;
    if (!this.inBatch && !this.settle) return;
    this.scheduled = true;
    this.scheduler.schedule(this.task);
  }

  private readonly task = (): void => {
    this.scheduled = false;
    try {
      this.pump();
    } catch (e) {
      this.fail(e);
    }
  };

  // One unit of work: a substep, or a settle slice.
  private pump(): void {
    if (this.paused || this.broken) return;
    if (this.settle) {
      this.settleSlice(this.settle);
    } else if (this.inBatch) {
      const ps = this.core.ps;
      if (ps && this.remaining > 0) {
        ps.runSubstep(this.tuning);
        this.remaining--;
        this.substeps++;
        this.dirty = true;
        this.flush();
      }
      if (this.remaining === 0) this.endBatch();
    }
    this.kick();
  }

  private endBatch(): void {
    this.inBatch = false;
    const ps = this.core.ps;
    if (!ps) return;
    if (!Number.isFinite(ps.maxMove)) {
      // In-thread, frame() returns false and main halts before the gate.
      this.halted = true;
      this.queued = 0;
      return;
    }
    if (this.core.gateFrame(this.batchIgnoreTemp)) {
      this.queued = 0;
      this.dirty = true;
      this.flush();
      return;
    }
    if (this.queued > 0 && !this.frozen) this.startBatch();
  }

  private startSettle(
    msg: Extract<MainToWorker, { type: "settle" }>
  ): void {
    this.abortBatch();
    const job: SettleJob =
      msg.kind === "load"
        ? { kind: "load", settleFirst: false, simCap: 0, workCap: 0, t0: 0 }
        : {
            kind: "presettle",
            settleFirst: msg.settleFirst,
            simCap: msg.simCap,
            workCap: msg.workCap,
            t0: 0,
          };
    if (job.kind === "load") this.core.beginLoad();
    else this.core.beginPresettle();
    job.t0 = performance.now();
    this.settle = job;
    this.halted = false;
    this.kick();
  }

  // One SETTLE_CHUNK_MS slice of the in-thread loops, number for number.
  private settleSlice(job: SettleJob): void {
    const ps = this.core.ps;
    if (!ps) return;
    this.dirty = true;
    if (job.kind === "load") {
      // loadFrame zeroes the tuning's temperature: give it a copy.
      const st = this.core.loadFrame({ ...this.tuning });
      if (st === "running") {
        this.flush();
        return;
      }
      this.core.endLoad();
      this.endSettle(job, st === "halted" ? "halted" : "done", 0);
      return;
    }
    const p = this.core.presettleFrame(
      this.tuning,
      job.settleFirst,
      job.simCap,
      job.workCap,
      () => true
    );
    if (p.halted) {
      this.endSettle(job, "halted", p.workMs);
    } else if (p.end !== "") {
      this.core.finishPresettle(false);
      // goLive without K147's budget: asleep if the gate tripped, else
      // awake with the gate's quiet run carried over.
      this.core.asleep = p.end === "sleep";
      this.endSettle(job, p.end, p.workMs);
    } else {
      this.flush();
    }
  }

  private endSettle(job: SettleJob, endedBy: string, workMs: number): void {
    const ps = this.core.ps;
    this.settle = null;
    if (endedBy === "halted") this.halted = true;
    this.post({
      type: "settled",
      gen: this.core.gen,
      endedBy,
      sim: ps ? ps.simTime : 0,
      workMs,
      ms: performance.now() - job.t0,
    });
    this.flush();
  }

  // Probe: frames of 1/60 s until simTime is reached, no gate, then a
  // snapshot (design 8's stepUntil).
  private stepUntil(simTime: number): void {
    const ps = this.core.ps;
    if (!ps || this.halted) return;
    this.abortBatch();
    while (ps.simTime < simTime && Number.isFinite(ps.maxMove)) {
      ps.step(1 / 60, this.tuning);
    }
    this.dirty = true;
    this.flush();
  }

  private give(buf: ArrayBuffer): void {
    // A buffer of an older build's size is let go.
    if (buf.byteLength !== this.bytes || this.pool.length >= SNAPSHOT_POOL) return;
    this.pool.push(buf);
    this.flush();
  }

  // Posts the current state if it changed and a buffer is free; otherwise
  // it goes out when a buffer comes back (give), so the latest state, an
  // asleep flag included, always reaches main.
  private flush(): void {
    const ps = this.core.ps;
    if (!this.dirty || !ps) return;
    const buf = this.pool.pop();
    if (!buf) return;
    this.dirty = false;
    writeSnapshot(ps, buf, {
      gen: this.core.gen,
      seq: this.seq++,
      substeps: this.substeps,
      lag: this.lag,
      wallAt: performance.timeOrigin + performance.now(),
      asleep: this.core.asleep,
      inputs: this.inputs,
      frames: this.frames,
    });
    this.post({ type: "snap", gen: this.core.gen, buf }, [buf]);
  }

  private dump(): void {
    const ps = this.core.ps;
    if (!ps) return;
    const raw = ps as unknown as Internals;
    const c = ps.crossings.length;
    const passes = new Float64Array(4 * c);
    for (let k = 0; k < c; k++) {
      const x = ps.crossings[k];
      passes[k * 4] = x.over.ctrl;
      passes[k * 4 + 1] = x.over.displayF ?? NaN;
      passes[k * 4 + 2] = x.under.ctrl;
      passes[k * 4 + 3] = x.under.displayF ?? NaN;
    }
    this.post({
      type: "dumped",
      gen: this.core.gen,
      simTime: ps.simTime,
      positions: ps.positions.slice(0, 2 * ps.particleCount),
      prev: raw.prev.slice(),
      zPos: raw.zPos.slice(),
      passes,
    });
  }

  private fail(e: unknown): void {
    this.broken = true;
    this.abortBatch();
    this.settle = null;
    const err = e instanceof Error ? e : new Error(String(e));
    this.post({ type: "error", message: err.message, stack: err.stack });
  }
}
