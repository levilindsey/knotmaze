import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  WorkerHost,
  interpDelay,
  READY_TIMEOUT_MS,
  READY_TICK_MS,
  INTERP_MIN_MS,
  INTERP_MAX_MS,
} from "../../src/physics/worker_host";
import type { WorkerPort, WorkerHostOptions } from "../../src/physics/worker_host";
import { PhysicsWorkerCore, SyncScheduler } from "../../src/physics/physics_worker_core";
import type { MainToWorker, WorkerToMain } from "../../src/physics/physics_worker_core";
import { MirrorSystem } from "../../src/physics/mirror_system";
import { InThreadHost } from "../../src/physics/physics_host";
import type { FreezeInfo } from "../../src/physics/physics_host";
import { hashDump } from "../../src/physics/probe_dump";
import { fabricScene, fabricGraph } from "./fabric_scene";

// K7 stage 3 (docs/design/K7_worker.md): the WorkerHost against a fake
// Worker in Node. The fake runs the stage 2 worker core synchronously, and
// its messages to main wait for deliver(), as a real worker's wait for
// main's event loop. On a fabric design (knot mode is going, K326).

const SCENE = "?7&gs=8";

class FakePort implements WorkerPort {
  onmessage: ((e: MessageEvent<WorkerToMain>) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  onmessageerror: ((e: MessageEvent) => void) | null = null;
  terminated = false;
  readonly core = new PhysicsWorkerCore(new SyncScheduler(), (m) => {
    this.outbox.push(m);
  });
  private readonly outbox: WorkerToMain[] = [];
  private readonly opts: { silent?: boolean; edit?: (m: WorkerToMain) => WorkerToMain };

  // silent: a worker that never answers. edit: rewrites a message to main.
  constructor(opts: { silent?: boolean; edit?: (m: WorkerToMain) => WorkerToMain } = {}) {
    this.opts = opts;
  }

  postMessage(msg: MainToWorker): void {
    if (this.terminated || this.opts.silent) return;
    this.core.onMessage(msg);
  }
  terminate(): void {
    this.terminated = true;
  }
  deliver(): void {
    for (let m = this.outbox.shift(); m; m = this.outbox.shift()) {
      if (this.terminated) continue;
      const data = this.opts.edit ? this.opts.edit(m) : m;
      this.onmessage?.({ data } as MessageEvent<WorkerToMain>);
    }
  }
}

function makeHost(spawn: () => WorkerPort, opts: WorkerHostOptions = {}) {
  const onFallback = vi.fn();
  const host = new WorkerHost(onFallback, { spawn, watchVisibility: false, ...opts });
  return { host, onFallback };
}

const scene = fabricScene(SCENE);
const build = (host: WorkerHost) => host.build(fabricGraph(scene.params), scene.params);
const frame = (host: WorkerHost) => host.frame(1 / 60, scene.tuning, performance.now(), true, 0);
const later = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("interpDelay", () => {
  it("is the median snapshot interval, clamped", () => {
    expect(interpDelay([])).toBe(16);
    expect(interpDelay([30, 10, 20])).toBe(20);
    expect(interpDelay([1, 2, 3])).toBe(INTERP_MIN_MS);
    expect(interpDelay([90, 70, 80])).toBe(INTERP_MAX_MS);
  });
});

describe("WorkerHost on a fake worker", () => {
  it("builds a mirror, goes ready on a matching fingerprint and shows the worker's state", () => {
    const port = new FakePort();
    const { host, onFallback } = makeHost(() => port);
    expect(build(host)).toBeInstanceOf(MirrorSystem);
    expect(host.stats().host?.ready).toBe(false);
    port.deliver();
    expect(host.kind).toBe("worker");
    expect(host.stats().host?.ready).toBe(true);
    for (let k = 0; k < 3; k++) {
      frame(host);
      port.deliver();
    }
    // A frame shows the newest snapshot delivered (its own frame's batch is
    // still in flight).
    const sim = port.core.ps!.simTime;
    expect(sim).toBeGreaterThan(0);
    frame(host);
    expect(host.view!.simTime).toBe(sim);
    expect(onFallback).not.toHaveBeenCalled();
  });

  it("clears main's grab on a reset and on a rebuild", () => {
    const port = new FakePort();
    const { host } = makeHost(() => port);
    const m = build(host);
    port.deliver();
    host.grab(5, m.positions[10], m.positions[11]);
    expect(m.grabbedParticle).toBe(5);
    host.reset();
    expect(m.grabbedParticle).toBe(-1);
    host.grab(5, m.positions[10], m.positions[11]);
    const m2 = build(host);
    expect(m2).not.toBe(m);
    expect(m2.grabbedParticle).toBe(-1);
  });

  it("trusts the worker's asleep flag only from a snapshot that saw every input", () => {
    const port = new FakePort();
    const { host } = makeHost(() => port);
    build(host);
    port.deliver();
    frame(host);
    port.deliver();
    host.sleep();
    port.deliver();
    expect(host.asleep).toBe(true);
    // A wake whose answer is still in flight: the newest snapshot says
    // asleep but was written before the wake.
    host.wake();
    frame(host);
    expect((host.view as MirrorSystem).workerAsleep).toBe(true);
    expect(host.gateFrame(false)).toBe(false);
    expect(host.asleep).toBe(false);
    port.deliver();
    frame(host);
    expect(host.gateFrame(false)).toBe(false);
    // The worker's own gate trips (a sleep main did not post): trusted.
    port.core.onMessage({ type: "sleep", gen: host.gen });
    port.deliver();
    frame(host);
    expect(host.gateFrame(false)).toBe(true);
    expect(host.asleep).toBe(true);
  });

  it("runs in-thread when the worker cannot start, with no rebuild", () => {
    const blocked = makeHost(() => {
      throw new Error("blocked");
    });
    expect(blocked.host.kind).toBe("in-thread");
    expect(blocked.host.reason).toBe("construct: blocked");
    expect(build(blocked.host)).not.toBeInstanceOf(MirrorSystem);
    expect(blocked.onFallback).not.toHaveBeenCalled();
    const none = makeHost(() => {
      throw new Error("no-worker");
    });
    expect(none.host.reason).toBe("no-worker");
    // The default spawn where there is no Worker at all (Node has none):
    // main.ts constructs a WorkerHost for phw=1 whatever the browser.
    expect(typeof Worker).toBe("undefined");
    const bare = new WorkerHost(vi.fn(), { watchVisibility: false });
    expect(bare.kind).toBe("in-thread");
    expect(bare.reason).toBe("no-worker");
  });

  it("falls back on a fingerprint mismatch and asks main to rebuild, after the call", async () => {
    const port = new FakePort({
      edit: (m) =>
        m.type === "ready" ? { ...m, fingerprint: { ...m.fingerprint, hash: m.fingerprint.hash + 1 } } : m,
    });
    const { host, onFallback } = makeHost(() => port);
    build(host);
    const gen = host.gen;
    port.deliver();
    expect(host.kind).toBe("in-thread");
    expect(host.reason).toMatch(/^fingerprint \d+\/\d+\/\d+\/\d+ vs mirror /);
    expect(host.stats().host?.kind).toBe("in-thread");
    expect(port.terminated).toBe(true);
    expect(onFallback).not.toHaveBeenCalled();
    await later(0);
    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(build(host)).not.toBeInstanceOf(MirrorSystem);
    expect(host.gen).toBeGreaterThan(gen);
  });

  it("falls back on a worker error", () => {
    const port = new FakePort();
    const { host } = makeHost(() => port);
    build(host);
    port.onerror!({ message: "boom", preventDefault() {} } as unknown as ErrorEvent);
    expect(host.kind).toBe("in-thread");
    expect(host.reason).toBe("onerror: boom");
  });
});

describe("WorkerHost's ready timeout", () => {
  it("falls back after READY_TIMEOUT_MS of ticks with no ready", () => {
    vi.useFakeTimers();
    const port = new FakePort({ silent: true });
    const { host, onFallback } = makeHost(() => port);
    build(host);
    const ticks = Math.ceil(READY_TIMEOUT_MS / READY_TICK_MS);
    for (let k = 1; k < ticks; k++) vi.advanceTimersByTime(READY_TICK_MS);
    expect(host.kind).toBe("worker");
    vi.advanceTimersByTime(READY_TICK_MS);
    expect(host.kind).toBe("in-thread");
    expect(host.reason).toBe(`no ready within ${READY_TIMEOUT_MS} ms`);
    expect(port.terminated).toBe(true);
    vi.advanceTimersByTime(1);
    expect(onFallback).toHaveBeenCalledTimes(1);
  });

  // The cold-profile `am=instant` case: main stalls past the whole timeout
  // while the worker's ready waits in its queue. A late tick counts once.
  it("does not fail a working worker over a main-thread stall", async () => {
    const port = new FakePort();
    const { host } = makeHost(() => port, { readyTimeoutMs: 2 * READY_TICK_MS });
    build(host);
    const end = performance.now() + 3 * READY_TICK_MS;
    while (performance.now() < end) {
      // The stall.
    }
    await later(0);
    expect(host.kind).toBe("worker");
    port.deliver();
    expect(host.stats().host?.ready).toBe(true);
    await later(3 * READY_TICK_MS);
    expect(host.kind).toBe("worker");
  });
});

// K7 stage 4 (design 8): the probes' bridge. Promises that settle once a
// snapshot covering the call arrives, and the same calls in-thread.
describe("the probe bridge", () => {
  function live() {
    const port = new FakePort();
    const { host } = makeHost(() => port);
    build(host);
    port.deliver();
    for (let k = 0; k < 3; k++) {
      frame(host);
      port.deliver();
    }
    return { port, host };
  }
  const settled = async () => {
    await later(0);
  };

  it("freezes the worker, shows the frozen state exactly and steps nothing until unfrozen", async () => {
    const { port, host } = live();
    let info: FreezeInfo | null = null;
    void host.freeze(true).then((r) => (info = r));
    await settled();
    expect(info).toBeNull();
    port.deliver();
    await settled();
    const ps = port.core.ps!;
    expect(info).toEqual({ frozen: true, simTime: ps.simTime });
    expect(host.view!.simTime).toBe(ps.simTime);
    expect(Array.from(host.view!.positions)).toEqual(Array.from(ps.positions));
    expect(host.stats().frozen).toBe(true);
    expect(port.core.stats.frozen).toBe(true);
    const sim = ps.simTime;
    const physMs = host.stats().physMs;
    for (let k = 0; k < 3; k++) {
      frame(host);
      port.deliver();
    }
    expect(port.core.ps!.simTime).toBe(sim);
    expect(host.view!.simTime).toBe(sim);
    expect(host.stats().physMs).toBe(physMs);
    void host.freeze(false);
    port.deliver();
    await settled();
    expect(host.stats().frozen).toBe(false);
    frame(host);
    port.deliver();
    expect(port.core.ps!.simTime).toBeGreaterThan(sim);
  });

  it("steps until a sim time, frozen or not, and shows that state", async () => {
    const { port, host } = live();
    void host.freeze(true);
    port.deliver();
    await settled();
    const target = port.core.ps!.simTime + 0.25;
    const live0 = port.core.stats.substeps;
    let reached = NaN;
    void host.stepUntil(target, scene.tuning).then((s) => (reached = s));
    port.deliver();
    await settled();
    expect(reached).toBeGreaterThanOrEqual(target);
    expect(reached).toBe(port.core.ps!.simTime);
    expect(host.view!.simTime).toBe(reached);
    expect(Array.from(host.view!.positions)).toEqual(Array.from(port.core.ps!.positions));
    // Not live stepping: the worker's substep count is unchanged.
    expect(port.core.stats.substeps).toBe(live0);
  });

  it("dumps prev, zPos and the passes by id", async () => {
    const { port, host } = live();
    const a = host.dump();
    const b = host.dump();
    port.deliver();
    const [da, db] = await Promise.all([a, b]);
    const ps = port.core.ps!;
    const raw = ps as unknown as { prev: Float32Array; zPos: Float32Array };
    expect(da.gen).toBe(host.gen);
    expect(da.simTime).toBe(ps.simTime);
    expect(Array.from(da.prev)).toEqual(Array.from(raw.prev.subarray(0, 2 * ps.particleCount)));
    expect(Array.from(da.zPos)).toEqual(Array.from(raw.zPos.subarray(0, ps.particleCount)));
    expect(da.passes.length).toBe(4 * ps.crossings.length);
    expect(hashDump(db)).toEqual(hashDump(da));
  });

  it("syncs: resolves once a snapshot saw every input, and shows it", async () => {
    const { port, host } = live();
    const m = host.view!;
    host.grab(5, m.positions[10], m.positions[11]);
    let done = false;
    void host.sync().then(() => (done = true));
    await settled();
    expect(done).toBe(false);
    port.deliver();
    await settled();
    expect(done).toBe(true);
    // Shown exactly, not held for a later frame's interpolation: a read
    // right after the await sees the worker's state (the helper's live
    // probe read the pre-tug positions with a held fence).
    const ps = port.core.ps!;
    expect(host.view!.simTime).toBe(ps.simTime);
    expect(Array.from(host.view!.positions)).toEqual(Array.from(ps.positions));
    // Nothing outstanding: at once.
    await expect(host.sync()).resolves.toBeUndefined();
  });

  it("rejects what is in flight on a rebuild", async () => {
    const { host } = live();
    const f = host.freeze(true);
    const s = host.stepUntil(host.view!.simTime + 0.05, scene.tuning);
    build(host);
    await expect(f).rejects.toThrow("the scene was rebuilt");
    await expect(s).rejects.toThrow("the scene was rebuilt");
    expect(host.stats().frozen).toBe(false);
  });

  it("refuses the in-thread freeze patch on the mirror, naming what to use", () => {
    const { host } = live();
    const ps = host.view!;
    expect(() => {
      ps.step = function () {};
    }).toThrow(/__knotPhysFreeze\(true\).*&phw=0/);
    expect(() => ps.step(1 / 60)).toThrow("MirrorSystem.step");
  });

  it("matches the in-thread host: the freeze patch, stepUntil and the dump", async () => {
    const t = new InThreadHost();
    const ps = t.build(fabricGraph(scene.params), scene.params);
    for (let k = 0; k < 3; k++) t.frame(1 / 60, scene.tuning, performance.now(), false, 0);
    expect(t.stats().liveSubsteps).toBeGreaterThan(0);
    const info = await t.freeze(true);
    expect(info).toEqual({ frozen: true, simTime: ps.simTime });
    // Exactly the probes' patch: an own `step` that does nothing.
    expect(Object.prototype.hasOwnProperty.call(ps, "step")).toBe(true);
    const sim = ps.simTime;
    const live0 = t.stats().liveSubsteps;
    t.frame(1 / 60, scene.tuning, performance.now(), false, 0);
    expect(ps.simTime).toBe(sim);
    const reached = await t.stepUntil(sim + 0.25, scene.tuning);
    expect(reached).toBe(ps.simTime);
    expect(reached).toBeGreaterThanOrEqual(sim + 0.25);
    expect(t.stats().liveSubsteps).toBe(live0);
    await t.freeze(false);
    expect(Object.prototype.hasOwnProperty.call(ps, "step")).toBe(false);
    // A probe's own patch still works in-thread, and freeze(false) lifts it.
    ps.step = function () {};
    t.frame(1 / 60, scene.tuning, performance.now(), false, 0);
    expect(ps.simTime).toBe(reached);
    await t.freeze(false);
    t.frame(1 / 60, scene.tuning, performance.now(), false, 0);
    expect(ps.simTime).toBeGreaterThan(reached);

    // The same build stepped the same way hashes the same on both hosts.
    const u = new InThreadHost();
    u.build(fabricGraph(scene.params), scene.params);
    const port = new FakePort();
    const { host } = makeHost(() => port);
    build(host);
    port.deliver();
    const r1 = await u.stepUntil(0.5, scene.tuning);
    void host.stepUntil(0.5, scene.tuning);
    port.deliver();
    await settled();
    const dw = host.dump();
    port.deliver();
    const w = await dw;
    const d = await u.dump();
    expect(w.simTime).toBe(r1);
    expect(hashDump(w)).toEqual(hashDump(d));
  });
});
