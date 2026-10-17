import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  WorkerHost,
  interpDelay,
  READY_TIMEOUT_MS,
  READY_TICK_MS,
  INTERP_MIN_MS,
  INTERP_MAX_MS,
  sceneParamsOf,
} from "../../src/physics/worker_host";
import type { WorkerPort, WorkerHostOptions } from "../../src/physics/worker_host";
import {
  PhysicsWorkerCore,
  SyncScheduler,
  readWorkerName,
  sameSceneParams,
  sameTuning,
  workerNameOf,
} from "../../src/physics/physics_worker_core";
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

function makeHost(spawn: (name: string) => WorkerPort, opts: WorkerHostOptions = {}) {
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
    expect(host.needsFrame()).toBe(true);
    host.sleep();
    port.deliver();
    expect(host.asleep).toBe(true);
    expect(host.needsFrame()).toBe(false);
    // A wake whose answer is still in flight: the newest snapshot says
    // asleep but was written before the wake.
    host.wake();
    expect(host.needsFrame()).toBe(true);
    frame(host);
    expect((host.view as MirrorSystem).workerAsleep).toBe(true);
    expect(host.gateFrame(false)).toBe(false);
    expect(host.asleep).toBe(false);
    expect(host.needsFrame()).toBe(true);
    port.deliver();
    frame(host);
    expect(host.gateFrame(false)).toBe(false);
    // The worker's own gate trips (a sleep main did not post): trusted.
    port.core.onMessage({ type: "sleep", gen: host.gen });
    port.deliver();
    frame(host);
    // K6-1: frames are still wanted until main applies the sleeping
    // snapshot (the gate's trip, after which the loop notes GEOM).
    expect(host.needsFrame()).toBe(true);
    expect(host.gateFrame(false)).toBe(true);
    expect(host.asleep).toBe(true);
    expect(host.needsFrame()).toBe(false);
  });

  it("runs in-thread when the worker cannot start, with no rebuild", () => {
    const blocked = makeHost(() => {
      throw new Error("blocked");
    });
    expect(blocked.host.kind).toBe("in-thread");
    expect(blocked.host.reason).toBe("construct: blocked");
    expect(build(blocked.host)).not.toBeInstanceOf(MirrorSystem);
    expect(blocked.onFallback).not.toHaveBeenCalled();
    // K6-1: in-thread, needsFrame follows the in-thread host.
    expect(blocked.host.needsFrame()).toBe(!blocked.host.asleep);
    blocked.host.sleep();
    expect(blocked.host.needsFrame()).toBe(false);
    blocked.host.wake();
    expect(blocked.host.needsFrame()).toBe(true);
    const none = makeHost(() => {
      throw new Error("no-worker");
    });
    expect(none.host.reason).toBe("no-worker");
    // The default spawn where there is no Worker at all (Node has none):
    // main.ts constructs a WorkerHost whenever phw is on (the default since
    // K7 stage 6), whatever the browser.
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

// K7 stage 7, THE LEVER: the Worker's name carries the first scene, and the
// worker builds it at start (physics_worker.ts calls core.start(self.name)).
describe("the name build (K7 stage 7)", () => {
  // A spawn that starts the fake as physics_worker.ts does; `read` is the
  // name the worker sees (a browser could lose or mangle it).
  function named(read: (name: string) => unknown = (n) => n) {
    const ports: FakePort[] = [];
    const spawn = (name: string): WorkerPort => {
      const port = new FakePort();
      port.core.start(read(name));
      ports.push(port);
      return port;
    };
    return { spawn, port: () => ports[0] };
  }

  it("round-trips a scene and its tuning through a name, and reads nothing else", () => {
    const name = workerNameOf(scene.params, scene.tuning);
    const nb = readWorkerName(name);
    expect(nb).not.toBeNull();
    expect(sameSceneParams(nb!.params, scene.params)).toBe(true);
    expect(sameTuning(nb!.tuning, scene.tuning)).toBe(true);
    // Only the scene's fields travel (main's params carry many more).
    expect(Object.keys(nb!.params).length).toBe(20);
    const json = JSON.parse(name.slice(name.indexOf(" ") + 1));
    const without = { ...json, params: { ...json.params } };
    delete without.params.seed;
    const tag = name.slice(0, name.indexOf(" ") + 1);
    for (const bad of [
      undefined,
      42,
      "",
      "knotmaze-physics",
      name.slice(0, -3),
      name.replace(/^knotmaze-physics /, "other "),
      tag + JSON.stringify({ ...json, v: 2 }),
      tag + JSON.stringify(without),
      tag + JSON.stringify({ ...json, params: { ...json.params, gridSize: "8" } }),
      tag + JSON.stringify({ ...json, params: { ...json.params, gridSize: null } }),
      tag + JSON.stringify({ ...json, tuning: { ...json.tuning, slack: "x" } }),
    ]) {
      expect(readWorkerName(bad)).toBeNull();
    }
    // -0 reads back as 0, so main compares against the read, never its own.
    const negZero = { ...scene.params, turnBias: -0 };
    const back = readWorkerName(workerNameOf(negZero, scene.tuning))!;
    expect(sameSceneParams(back.params, negZero)).toBe(false);
  });

  it("adopts the name build when the first build is its scene, its ready heard first", () => {
    const w = named();
    const { host, onFallback } = makeHost(w.spawn, { prebuild: scene.params });
    // The worker built at start, as gen 0, before any message from main.
    const built = w.port().core.ps;
    expect(built).not.toBeNull();
    expect(w.port().core.gen).toBe(0);
    w.port().deliver();
    expect(host.stats().host?.ready).toBe(false);
    build(host);
    const h = host.stats().host!;
    expect(h.prebuild).toBe("adopted");
    expect(h.ready).toBe(true);
    expect(h.readySrc).toBe("name");
    expect(h.readyMs).toBe(0);
    expect(host.gen).toBe(0);
    // Main's gen-0 init was dropped over the name build.
    expect(w.port().core.ps).toBe(built);
    for (let k = 0; k < 3; k++) {
      frame(host);
      w.port().deliver();
    }
    expect(w.port().core.ps!.simTime).toBeGreaterThan(0);
    expect(host.view!.simTime).toBeGreaterThan(0);
    // A later build is a new gen, from an init.
    build(host);
    expect(host.gen).toBe(1);
    w.port().deliver();
    expect(host.stats().host?.ready).toBe(true);
    expect(host.stats().host?.readySrc).toBe("init");
    expect(w.port().core.ps).not.toBe(built);
    expect(onFallback).not.toHaveBeenCalled();
    expect(host.kind).toBe("worker");
  });

  it("adopts the name build when its ready arrives after the first build", () => {
    const w = named();
    const { host, onFallback } = makeHost(w.spawn, { prebuild: scene.params });
    build(host);
    expect(host.stats().host?.ready).toBe(false);
    w.port().deliver();
    const h = host.stats().host!;
    expect(h.prebuild).toBe("adopted");
    expect(h.ready).toBe(true);
    expect(h.readySrc).toBe("name");
    expect(host.gen).toBe(0);
    frame(host);
    w.port().deliver();
    expect(onFallback).not.toHaveBeenCalled();
    expect(host.kind).toBe("worker");
  });

  it("steps the adopted build as an init-built one, bit for bit", () => {
    const w = named();
    const a = makeHost(w.spawn, { prebuild: scene.params }).host;
    const port = new FakePort();
    const b = makeHost(() => port).host;
    w.port().deliver();
    build(a);
    build(b);
    port.deliver();
    for (let k = 0; k < 20; k++) {
      frame(a);
      frame(b);
      w.port().deliver();
      port.deliver();
    }
    const pa = w.port().core.ps!;
    const pb = port.core.ps!;
    expect(pa.simTime).toBeGreaterThan(0);
    expect(pa.simTime).toBe(pb.simTime);
    expect(hashDump(w.port().core.core.dump()!)).toEqual(hashDump(port.core.core.dump()!));
  });

  it("posts init at gen 1 when the first build is another scene", () => {
    const other = fabricScene("?9&gs=8");
    const w = named();
    const { host, onFallback } = makeHost(w.spawn, { prebuild: other.params });
    w.port().deliver();
    build(host);
    expect(host.stats().host?.prebuild).toBe("differs");
    expect(host.gen).toBe(1);
    // The name build's ready (gen 0) is not this build's.
    expect(host.stats().host?.ready).toBe(false);
    expect(w.port().core.gen).toBe(1);
    w.port().deliver();
    expect(host.stats().host?.ready).toBe(true);
    expect(host.stats().host?.readySrc).toBe("init");
    frame(host);
    w.port().deliver();
    expect(onFallback).not.toHaveBeenCalled();
    expect(host.kind).toBe("worker");
  });

  it.each([
    ["lost", () => undefined],
    ["truncated", (n: string) => n.slice(0, -5)],
    ["of another version", (n: string) => n.replace('"v":1', '"v":9')],
  ])("builds from the gen-0 init when the worker's name is %s", (_what, read) => {
    const w = named(read);
    const { host, onFallback } = makeHost(w.spawn, { prebuild: scene.params });
    expect(w.port().core.ps).toBeNull();
    w.port().deliver();
    build(host);
    // Main read its own name, so it adopted; the worker built from the init.
    expect(host.stats().host?.prebuild).toBe("adopted");
    expect(w.port().core.gen).toBe(0);
    expect(w.port().core.ps).not.toBeNull();
    w.port().deliver();
    expect(host.stats().host?.ready).toBe(true);
    expect(host.stats().host?.readySrc).toBe("init");
    frame(host);
    w.port().deliver();
    expect(w.port().core.ps!.simTime).toBeGreaterThan(0);
    expect(onFallback).not.toHaveBeenCalled();
    expect(host.kind).toBe("worker");
  });

  it("names the worker plainly without a prebuild, and builds from init as before", () => {
    const names: string[] = [];
    const port = new FakePort();
    const { host } = makeHost((name) => {
      names.push(name);
      port.core.start(name);
      return port;
    });
    expect(readWorkerName(names[0])).toBeNull();
    expect(port.core.ps).toBeNull();
    build(host);
    expect(host.gen).toBe(1);
    port.deliver();
    expect(host.stats().host?.prebuild).toBe("");
    expect(host.stats().host?.readySrc).toBe("init");
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

describe("sceneParamsOf (K74 stage 3)", () => {
  it("copies every SceneParams key", () => {
    const { params } = fabricScene("?7&gs=8");
    const copy = sceneParamsOf(params);
    expect(Object.keys(copy).sort()).toEqual(Object.keys(params).filter((k) => k in copy).sort());
    // every key of the copy equals the source, and the copy has all 20
    expect(Object.keys(copy)).toHaveLength(20);
    for (const k of Object.keys(copy) as Array<keyof typeof copy>) {
      expect(copy[k]).toEqual(params[k]);
    }
    expect(copy.exitCorridor).toBe(24);
    expect(copy.exitFlank).toBe("away");
  });
});
