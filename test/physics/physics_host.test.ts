import { describe, it, expect } from "vitest";
import { InThreadHost, PhysicsCore, LOAD_SIM_CAP } from "../../src/physics/physics_host";
import {
  PhysicsWorkerCore,
  SyncScheduler,
  ManualScheduler,
  ChannelScheduler,
  LAG_MAX_S,
  SNAPSHOT_POOL,
} from "../../src/physics/physics_worker_core";
import type { MainToWorker, WorkerToMain, Scheduler } from "../../src/physics/physics_worker_core";
import { MirrorSystem } from "../../src/physics/mirror_system";
import { readSnapshot, snapshotBytes, fingerprintOf } from "../../src/physics/snapshot";
import { ParticleSystem, SUBSTEP } from "../../src/physics/particle_system";
import type { PhysicsTuning } from "../../src/physics/particle_system";
import { fabricScene, fabricGraph, bits } from "./fabric_scene";

// K7 stage 2 (docs/design/K7_worker.md, stage 2's tests): the worker core
// and main's mirror against the in-thread host, bit for bit, in Node. On
// fabric designs (knot mode is going, K326).
//
// LOCKSTEP: with a synchronous scheduler every message's work completes
// inside onMessage, so a frame's batch ends before the next frame arrives;
// beginBatch + its substeps + gateFrame is then the in-thread host's
// frame() + gateFrame() with no budget armed. Frame dts stay under
// LAG_MAX_S, so neither side drops time.

// The fields the two systems step on that the class keeps private.
interface Internals {
  prev: Float32Array;
  zPos: Float32Array;
}

// The first differing element of two float arrays' bits ("" = the same).
function diff(name: string, a: Float32Array, b: Float32Array): string {
  if (a.length !== b.length) return `${name}: length ${a.length} vs ${b.length}`;
  const x = bits(a);
  const y = bits(b);
  for (let i = 0; i < x.length; i++) {
    if (x[i] !== y[i]) return `${name}[${i}]: ${a[i]} vs ${b[i]}`;
  }
  return "";
}

function passDiff(a: ParticleSystem, b: ParticleSystem): string {
  if (a.crossings.length !== b.crossings.length) return "crossing count";
  for (let k = 0; k < a.crossings.length; k++) {
    const x = a.crossings[k];
    const y = b.crossings[k];
    if (
      !Object.is(x.over.ctrl, y.over.ctrl) ||
      !Object.is(x.under.ctrl, y.under.ctrl) ||
      !Object.is(x.over.displayF, y.over.displayF) ||
      !Object.is(x.under.displayF, y.under.displayF)
    ) {
      return `crossing ${k}: ${x.over.ctrl}/${x.over.displayF} ${x.under.ctrl}/${x.under.displayF} vs ${y.over.ctrl}/${y.over.displayF} ${y.under.ctrl}/${y.under.displayF}`;
    }
  }
  return "";
}

// Everything two stepping systems carry, bit for bit ("" = the same).
function stateDiff(a: ParticleSystem, b: ParticleSystem): string {
  const ia = a as unknown as Internals;
  const ib = b as unknown as Internals;
  return (
    diff("positions", a.positions, b.positions) ||
    diff("prev", ia.prev, ib.prev) ||
    diff("zPos", ia.zPos, ib.zPos) ||
    passDiff(a, b) ||
    (Object.is(a.simTime, b.simTime) ? "" : `simTime ${a.simTime} vs ${b.simTime}`) ||
    (Object.is(a.pendingTime, b.pendingTime) ? "" : `pending ${a.pendingTime} vs ${b.pendingTime}`)
  );
}

const FLAGS = [
  "simTime",
  "pendingTime",
  "maxMove",
  "settleComplete",
  "contactsStatic",
  "ridersPending",
  "grabbedParticle",
] as const;

// What main's readers read on the mirror, against the live system.
function mirrorDiff(m: MirrorSystem, ps: ParticleSystem): string {
  const d = diff("mirror positions", m.positions, ps.positions) || passDiff(m, ps);
  if (d) return d;
  for (const f of FLAGS) {
    if (!Object.is(m[f], ps[f])) return `${f}: ${m[f]} vs ${ps[f]}`;
  }
  return "";
}

const centroid = (ps: ParticleSystem): [number, number] => {
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ps.particleCount; i++) {
    cx += ps.positions[i * 2];
    cy += ps.positions[i * 2 + 1];
  }
  return [cx / ps.particleCount, cy / ps.particleCount];
};

// Main's side of the pair: the in-thread host (the reference) and, fed the
// same calls as messages, the worker core plus a mirror fed its snapshots.
class Lockstep {
  readonly host = new InThreadHost();
  readonly worker: PhysicsWorkerCore;
  readonly events: WorkerToMain[] = [];
  private readonly out: WorkerToMain[] = [];
  mirror: MirrorSystem | null = null;
  tuning: PhysicsTuning | null = null;
  snaps = 0;
  checks = 0;
  maxEmergent = 0;

  constructor(scheduler: Scheduler = new SyncScheduler()) {
    this.worker = new PhysicsWorkerCore(scheduler, (m) => {
      this.out.push(m);
    });
  }

  get gen(): number {
    return this.host.gen;
  }
  get live(): ParticleSystem {
    const v = this.host.view;
    if (!v) throw new Error("no live system");
    return v;
  }
  get m(): MirrorSystem {
    if (!this.mirror) throw new Error("no mirror");
    return this.mirror;
  }
  get t(): PhysicsTuning {
    if (!this.tuning) throw new Error("no tuning");
    return this.tuning;
  }

  init(query: string): void {
    const { params, tuning } = fabricScene(query);
    this.tuning = tuning;
    this.host.build(fabricGraph(params), params);
    this.mirror = new MirrorSystem(fabricGraph(params));
    this.send({ type: "init", gen: this.host.gen, params, tuning });
  }

  send(msg: MainToWorker): void {
    this.worker.onMessage(msg);
    this.drain();
  }

  // Applies each snapshot in order and gives its buffer back (a give posts
  // the latest state if the pool had run dry).
  drain(): void {
    for (let msg = this.out.shift(); msg; msg = this.out.shift()) {
      if (msg.type === "snap") {
        if (msg.gen === this.gen) {
          this.m.applySnapshot(readSnapshot(msg.buf));
          this.snaps++;
        }
        this.worker.onMessage({ type: "give", buf: msg.buf });
      } else {
        this.events.push(msg);
      }
    }
  }

  last(type: WorkerToMain["type"]): WorkerToMain | undefined {
    for (let k = this.events.length - 1; k >= 0; k--) {
      if (this.events[k].type === type) return this.events[k];
    }
    return undefined;
  }

  // One rAF frame: main steps in-thread (skipped while asleep, as main.ts
  // does) and posts the frame's dt to the worker.
  frame(dt: number): void {
    if (!this.host.asleep) {
      expect(this.host.frame(dt, this.t, performance.now(), true, 0)).toBe(true);
      this.host.gateFrame(false);
    }
    this.send({ type: "frame", gen: this.gen, dt });
    this.check();
  }

  check(): void {
    const w = this.worker.ps;
    if (!w) throw new Error("worker has no system");
    expect(stateDiff(this.live, w)).toBe("");
    expect(this.worker.core.asleep).toBe(this.host.asleep);
    expect(mirrorDiff(this.m, this.live)).toBe("");
    expect(this.m.workerAsleep).toBe(this.host.asleep);
    const em = this.live.emergentCrossings;
    if (em.length > 0) expect(this.m.emergentCrossings).toEqual(em);
    else expect(this.m.emergentCrossings.length).toBe(0);
    this.maxEmergent = Math.max(this.maxEmergent, em.length);
    this.checks++;
  }

  // Main picks on its mirror (the live system's positions), then grabs.
  grabCentroid(): [number, number] {
    const [cx, cy] = centroid(this.live);
    const p = this.live.nearest(cx, cy, 5);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(this.m.nearest(cx, cy, 5)).toBe(p);
    const x = this.live.positions[p * 2];
    const y = this.live.positions[p * 2 + 1];
    expect(this.host.grab(p, x, y)).toBe(p);
    this.m.grabAt(p, x, y);
    this.send({ type: "grab", gen: this.gen, particle: p, x, y });
    return [x, y];
  }
  drag(x: number, y: number): void {
    this.host.dragTo(x, y);
    this.m.dragTo(x, y);
    this.send({ type: "drag", gen: this.gen, x, y });
  }
  release(): void {
    this.host.release();
    this.m.release();
    this.send({ type: "release", gen: this.gen });
  }
  tug(id: number, chain: number, c0: number, c1: number, tap: number, side: number, amp: number): number {
    const n = this.host.tug(chain, c0, c1, tap, side, amp);
    this.send({ type: "tug", gen: this.gen, id, chain, c0, c1, tap, side, amp });
    expect(this.last("tugged")).toEqual({ type: "tugged", gen: this.gen, id, count: n });
    return n;
  }
  setTuning(t: PhysicsTuning): void {
    this.tuning = t;
    this.send({ type: "tuning", gen: this.gen, t });
  }
  sleep(): void {
    this.host.sleep();
    this.send({ type: "sleep", gen: this.gen });
  }
  wake(): void {
    this.host.wake();
    this.send({ type: "wake", gen: this.gen });
  }
  reset(): void {
    this.host.reset();
    this.send({ type: "reset", gen: this.gen });
  }

  // Frames until both sides sleep (they must trip on the same frame).
  untilAsleep(dt: number, maxFrames: number): number {
    for (let f = 0; f < maxFrames; f++) {
      if (this.host.asleep) return f;
      this.frame(dt);
    }
    return -1;
  }
}

// A violent circle around the grab point: radius ramping to 3 world, two
// turns over `frames` frames (it tunnels threads: emergent crossings).
function circle(ls: Lockstep, dt: number, frames: number): void {
  const [gx, gy] = ls.grabCentroid();
  ls.frame(dt);
  for (let f = 0; f < frames; f++) {
    const a = (f / frames) * Math.PI * 4;
    const r = 3 * Math.min(1, f / (frames / 4));
    ls.drag(gx + r * Math.cos(a), gy + r * Math.sin(a));
    ls.frame(dt);
  }
  ls.release();
}

describe("the worker core in lockstep with the in-thread host (K7)", () => {
  it("matches bit for bit at 60 fps through every input", () => {
    const ls = new Lockstep();
    ls.init("?7&gs=8");
    const ready = ls.last("ready");
    expect(ready?.type).toBe("ready");
    if (ready?.type === "ready") {
      expect(ready.gen).toBe(1);
      expect(ready.fingerprint).toEqual(fingerprintOf(ls.live));
      expect(ready.fingerprint).toEqual(fingerprintOf(ls.m));
      expect(ready.bytes).toBe(snapshotBytes(ls.live.particleCount, ls.live.crossings.length));
    }
    ls.check();
    const dt = 1 / 60;
    for (let f = 0; f < 30; f++) ls.frame(dt);
    circle(ls, dt, 120);
    expect(ls.maxEmergent).toBeGreaterThan(0);
    for (let f = 0; f < 20; f++) ls.frame(dt);
    expect(ls.tug(7, 0, 2, 10, 6, 1, 0.3)).toBeGreaterThan(0);
    for (let f = 0; f < 20; f++) ls.frame(dt);
    ls.setTuning({ ...ls.t, bend: ls.t.bend * 1.5, drag: ls.t.drag * 0.8 });
    for (let f = 0; f < 10; f++) ls.frame(dt);
    // Asleep, frames are skipped in-thread and discarded by the worker.
    ls.sleep();
    const sim = ls.live.simTime;
    const substeps = ls.worker.stats.substeps;
    for (let f = 0; f < 10; f++) ls.frame(dt);
    expect(ls.live.simTime).toBe(sim);
    expect(ls.worker.stats.substeps).toBe(substeps);
    ls.wake();
    for (let f = 0; f < 10; f++) ls.frame(dt);
    ls.reset();
    ls.check();
    // Both gates trip on the same frame (check() runs after each).
    expect(ls.untilAsleep(dt, 900)).toBeGreaterThan(0);
    expect(ls.m.workerAsleep).toBe(true);
    // A tug that moves something wakes both.
    expect(ls.tug(8, 1, 3, 9, 5, -1, 0.2)).toBeGreaterThan(0);
    expect(ls.host.asleep).toBe(false);
    expect(ls.worker.core.asleep).toBe(false);
    for (let f = 0; f < 5; f++) ls.frame(dt);
    const st = ls.worker.stats;
    expect(st.lag).toBe(0);
    expect(st.inputs).toBeGreaterThan(120);
    expect(ls.snaps).toBeGreaterThan(st.substeps);
  });

  it("matches bit for bit at 25 fps, the remainder carried between frames", () => {
    const ls = new Lockstep();
    ls.init("?7&gs=6");
    const dt = 0.04;
    for (let f = 0; f < 10; f++) ls.frame(dt);
    circle(ls, dt, 40);
    expect(ls.untilAsleep(dt, 400)).toBeGreaterThan(0);
    // 0.04 s is 4.8 substeps: the pending remainder is part of the state.
    expect(ls.worker.stats.lag).toBe(0);
    // The comparison has teeth: a tuning only the worker gets shows at once.
    ls.wake();
    ls.worker.onMessage({ type: "tuning", gen: ls.gen, t: { ...ls.t, bend: ls.t.bend * 1.01 } });
    ls.host.frame(dt, ls.t, performance.now(), true, 0);
    ls.send({ type: "frame", gen: ls.gen, dt });
    expect(stateDiff(ls.live, ls.worker.ps as ParticleSystem)).not.toBe("");
  });

  it("pre-settles as the in-thread loop does, to its sim cap, then goes live", () => {
    const ls = new Lockstep();
    ls.init("?7&gs=6");
    const host = ls.host;
    host.beginPresettle();
    let end = "";
    for (let k = 0; k < 1000 && end === ""; k++) {
      const p = host.presettleFrame(ls.t, false, 1.2, 1e9, () => true);
      expect(p.halted).toBe(false);
      end = p.end;
    }
    host.finishPresettle(false);
    host.goLive(0);
    expect(end).toBe("sim");
    ls.send({ type: "settle", gen: ls.gen, kind: "presettle", settleFirst: false, simCap: 1.2, workCap: 1e9 });
    const s = ls.last("settled");
    expect(s).toMatchObject({ type: "settled", gen: 1, endedBy: "sim", sim: ls.live.simTime });
    ls.check();
    expect(ls.untilAsleep(1 / 60, 900)).toBeGreaterThan(0);
  });

  it("settles first (until the first sleep) and asleep after it", () => {
    const ls = new Lockstep();
    ls.init("?7&gs=6");
    const host = ls.host;
    host.beginPresettle();
    let end = "";
    for (let k = 0; k < 1000 && end === ""; k++) {
      end = host.presettleFrame(ls.t, true, LOAD_SIM_CAP, 0, () => true).end;
    }
    host.finishPresettle(false);
    host.goLive(0);
    expect(end).toBe("sleep");
    expect(host.asleep).toBe(true);
    ls.send({ type: "settle", gen: ls.gen, kind: "presettle", settleFirst: true, simCap: LOAD_SIM_CAP, workCap: 0 });
    expect(ls.last("settled")).toMatchObject({ endedBy: "sleep", sim: ls.live.simTime });
    ls.check();
    // Asleep: the next frames are no-ops on both sides.
    for (let f = 0; f < 3; f++) ls.frame(1 / 60);
    expect(ls.m.workerAsleep).toBe(true);
  });

  it("runs the physics-off load as the in-thread loop does", () => {
    const ls = new Lockstep();
    ls.init("?7&gs=6");
    const host = ls.host;
    host.beginLoad();
    let st = "running";
    for (let k = 0; k < 1000 && st === "running"; k++) st = host.loadFrame({ ...ls.t });
    host.endLoad();
    expect(st).toBe("done");
    ls.send({ type: "settle", gen: ls.gen, kind: "load" });
    expect(ls.last("settled")).toMatchObject({ endedBy: "done", sim: ls.live.simTime });
    ls.check();
    // The load leaves the flag alone (main wakes the knot after it).
    expect(ls.worker.core.asleep).toBe(false);
  });

  it("drops messages of another gen and rebuilds on a newer init", () => {
    const ls = new Lockstep();
    ls.init("?7&gs=6");
    for (let f = 0; f < 10; f++) ls.frame(1 / 60);
    const inputs = ls.worker.stats.inputs;
    const readies = ls.events.filter((e) => e.type === "ready").length;
    // An older or equal init, and inputs of another gen, are dropped.
    const p1 = fabricScene("?7&gs=6");
    ls.send({ type: "init", gen: 1, params: p1.params, tuning: p1.tuning });
    ls.send({ type: "drag", gen: 0, x: 1, y: 1 });
    ls.send({ type: "reset", gen: 2 });
    expect(ls.events.filter((e) => e.type === "ready").length).toBe(readies);
    expect(ls.worker.stats.inputs).toBe(inputs);
    ls.check();
    // Gen 2: main builds the next design and posts init; frames of gen 1
    // still in flight are dropped.
    ls.init("?9&gs=8");
    expect(ls.gen).toBe(2);
    expect(ls.worker.gen).toBe(2);
    const ready = ls.last("ready");
    expect(ready).toMatchObject({ type: "ready", gen: 2, fingerprint: fingerprintOf(ls.live) });
    expect(ls.worker.stats.inputs).toBe(0);
    ls.send({ type: "frame", gen: 1, dt: 1 / 60 });
    expect(ls.worker.ps?.simTime).toBe(0);
    expect(ls.worker.stats.frames).toBe(0);
    ls.check();
    for (let f = 0; f < 20; f++) ls.frame(1 / 60);
    expect(ls.live.simTime).toBeGreaterThan(0.3);
  });
});

describe("the worker core between substeps (K7)", () => {
  it("applies a drag that arrives between a frame's substeps to the next substep", () => {
    const q = fabricScene("?7&gs=6");
    const sched = new ManualScheduler();
    const out: WorkerToMain[] = [];
    const w = new PhysicsWorkerCore(sched, (m) => {
      out.push(m);
    });
    w.onMessage({ type: "init", gen: 1, params: q.params, tuning: q.tuning });
    // The reference: stage 1's core, stepped substep by substep.
    const ref = new PhysicsCore();
    ref.build(fabricGraph(q.params));
    const dt = 1 / 60;
    let total = 0;
    const refFrame = (mid?: () => void): number => {
      const n = ref.beginBatch(dt, q.tuning);
      for (let s = 0; s < n; s++) {
        if (s === 1 && mid) mid();
        ref.ps?.runSubstep(q.tuning);
      }
      ref.gateFrame(false);
      total += n;
      return n;
    };
    for (let f = 0; f < 10; f++) {
      refFrame();
      w.onMessage({ type: "frame", gen: 1, dt });
      sched.runAll();
    }
    const ps = ref.ps as ParticleSystem;
    const [cx, cy] = centroid(ps);
    const p = ps.nearest(cx, cy, 5);
    const x = ps.positions[p * 2];
    const y = ps.positions[p * 2 + 1];
    ref.grab(p, x, y);
    w.onMessage({ type: "grab", gen: 1, particle: p, x, y });
    expect(refFrame(() => ref.dragTo(x + 1, y + 0.5))).toBeGreaterThanOrEqual(2);
    w.onMessage({ type: "frame", gen: 1, dt });
    expect(sched.runOne()).toBe(true); // substep 1
    w.onMessage({ type: "drag", gen: 1, x: x + 1, y: y + 0.5 });
    sched.runAll(); // the rest and the gate
    expect(w.stats.substeps).toBe(total);
    expect(stateDiff(ps, w.ps as ParticleSystem)).toBe("");
    expect(w.core.asleep).toBe(ref.asleep);
    // The drag landed mid-frame: a whole-frame drag gives other bits.
    const late = new PhysicsCore();
    late.build(fabricGraph(q.params));
    for (let f = 0; f < 10; f++) {
      late.frame(dt, q.tuning, 0, true, 0);
      late.gateFrame(false);
    }
    late.grab(p, x, y);
    late.dragTo(x + 1, y + 0.5);
    late.frame(dt, q.tuning, 0, true, 0);
    expect(stateDiff(late.ps as ParticleSystem, w.ps as ParticleSystem)).not.toBe("");
  });

  it("holds the latest state while no buffer is free and posts it on give", () => {
    const q = fabricScene("?7&gs=6");
    const sched = new ManualScheduler();
    const snaps: ArrayBuffer[] = [];
    const w = new PhysicsWorkerCore(sched, (m) => {
      if (m.type === "snap") snaps.push(m.buf);
    });
    w.onMessage({ type: "init", gen: 1, params: q.params, tuning: q.tuning });
    expect(snaps.length).toBe(1);
    expect(w.stats.pool).toBe(SNAPSHOT_POOL - 1);
    // One 0.25 s frame: a batch of 30 substeps, the first three posted.
    w.onMessage({ type: "frame", gen: 1, dt: 0.25 });
    sched.runAll();
    expect(w.stats.substeps).toBe(30);
    expect(snaps.length).toBe(SNAPSHOT_POOL);
    expect(w.stats.pool).toBe(0);
    expect(readSnapshot(snaps[3]).substeps).toBe(3);
    // A buffer back: the latest state goes out in it at once.
    const n = w.ps?.particleCount ?? 0;
    const c = w.ps?.crossings.length ?? 0;
    w.onMessage({ type: "give", buf: snaps[0] });
    expect(snaps.length).toBe(SNAPSHOT_POOL + 1);
    const s = readSnapshot(snaps[SNAPSHOT_POOL]);
    expect(s.seq).toBe(SNAPSHOT_POOL);
    expect(s.substeps).toBe(30);
    expect(bits(s.positions)).toEqual(bits((w.ps as ParticleSystem).positions));
    // Nothing changed since: buffers back just refill the pool.
    for (const b of snaps.slice(1, SNAPSHOT_POOL + 1)) w.onMessage({ type: "give", buf: b });
    expect(snaps.length).toBe(SNAPSHOT_POOL + 1);
    expect(w.stats.pool).toBe(SNAPSHOT_POOL);
    // A wrong-size buffer, or one past the pool, is let go.
    w.onMessage({ type: "give", buf: new ArrayBuffer(8) });
    w.onMessage({ type: "give", buf: new ArrayBuffer(snapshotBytes(n, c)) });
    expect(w.stats.pool).toBe(SNAPSHOT_POOL);
  });

  it("drops backlog past LAG_MAX_S as lag while a batch is in flight", () => {
    const q = fabricScene("?7&gs=6");
    const sched = new ManualScheduler();
    const w = new PhysicsWorkerCore(sched, () => {});
    w.onMessage({ type: "init", gen: 1, params: q.params, tuning: q.tuning });
    w.onMessage({ type: "frame", gen: 1, dt: 0.25 });
    expect(w.stats.remaining).toBe(30);
    // The batch in flight is 0.25 s of backlog: of five more frames, only
    // the newest waits; the four before it are dropped.
    for (let f = 0; f < 5; f++) w.onMessage({ type: "frame", gen: 1, dt: 1 / 60 });
    expect(w.stats.queued).toBe(1 / 60);
    expect(w.stats.lag).toBeCloseTo(4 / 60, 12);
    expect(LAG_MAX_S).toBeLessThan(0.25);
    sched.runAll();
    // The kept 1/60 s ran as the next batch, through the same accumulator.
    const acc = new ParticleSystem(fabricGraph(q.params));
    expect(w.stats.substeps).toBe(acc.beginFrame(0.25) + acc.beginFrame(1 / 60));
    expect(w.stats.queued).toBe(0);
    expect(w.ps?.pendingTime).toBe(acc.pendingTime);
  });

  it("runs on a MessageChannel, frames that arrive mid-batch joined into one", async () => {
    const q = fabricScene("?7&gs=6");
    const sched = new ChannelScheduler();
    let snaps = 0;
    const w = new PhysicsWorkerCore(sched, (m) => {
      if (m.type === "snap") {
        snaps++;
        w.onMessage({ type: "give", buf: m.buf });
      }
    });
    try {
      w.onMessage({ type: "init", gen: 1, params: q.params, tuning: q.tuning });
      for (let f = 0; f < 3; f++) w.onMessage({ type: "frame", gen: 1, dt: 1 / 60 });
      // Nothing ran yet: the work is queued as macrotasks.
      expect(w.stats.substeps).toBe(0);
      for (let k = 0; k < 200 && w.stats.substeps < 6; k++) {
        await new Promise((r) => setTimeout(r, 5));
      }
      expect(w.stats.substeps).toBe(6);
      expect(snaps).toBeGreaterThan(1);
      // The first batch took one frame; the next took the two that queued
      // behind it: step(1/60) then step(2/60).
      const ref = new ParticleSystem(fabricGraph(q.params));
      ref.step(1 / 60, q.tuning);
      ref.step(1 / 60 + 1 / 60, q.tuning);
      expect(stateDiff(ref, w.ps as ParticleSystem)).toBe("");
      expect(SUBSTEP * 6).toBeCloseTo(3 / 60, 12);
    } finally {
      sched.close();
    }
  });
});
