import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SNORE_GAIN,
  SnoreSfx,
  type SampleHost,
} from "../../src/audio/snore_sfx";

// K325: the snore as a sound - the lazy load, the decode once the autoplay
// gate is open, the level, the never-stacked rule and the clock behind the
// link's traversal delay. A fake host and a fake clock stand in for
// KnotSynth and performance.now.

const DURATION = 0.915;

interface FakeHost extends SampleHost {
  unlocked: boolean;
  decodeFails: boolean;
  playOk: boolean;
  latency: number;
  decodeCalls: number;
  received: ArrayBuffer[];
  plays: Array<{ gain: number }>;
  unlock(): void;
}

function makeHost(unlocked = true): FakeHost {
  let waiters: Array<() => void> = [];
  const h: FakeHost = {
    unlocked,
    decodeFails: false,
    playOk: true,
    latency: 0,
    decodeCalls: 0,
    received: [],
    plays: [],
    whenUnlocked(cb) {
      if (h.unlocked) cb();
      else waiters.push(cb);
    },
    decodeSample(bytes) {
      h.decodeCalls++;
      h.received.push(bytes);
      if (!h.unlocked) return Promise.resolve(null);
      if (h.decodeFails) return Promise.reject(new Error("bad bytes"));
      return Promise.resolve({ duration: DURATION } as AudioBuffer);
    },
    playSample(_buf, gain) {
      if (!h.playOk) return false;
      h.plays.push({ gain });
      return true;
    },
    outputLatency() {
      return h.latency;
    },
    unlock() {
      h.unlocked = true;
      const w = waiters;
      waiters = [];
      for (const cb of w) cb();
    },
  };
  return h;
}

// Lets the fetch and decode promise chains settle.
async function flush(): Promise<void> {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

interface Rig {
  sfx: SnoreSfx;
  host: FakeHost;
  loads: { n: number; original: ArrayBuffer };
  enabled: { on: boolean };
  clock: { t: number };
  failNextLoad: { on: boolean };
}

function rig(unlocked = true): Rig {
  const host = makeHost(unlocked);
  const enabled = { on: true };
  const clock = { t: 0 };
  const failNextLoad = { on: false };
  const loads = { n: 0, original: new ArrayBuffer(16) };
  const sfx = new SnoreSfx({
    host,
    enabled: () => enabled.on,
    load: () => {
      loads.n++;
      if (failNextLoad.on) {
        failNextLoad.on = false;
        return Promise.reject(new Error("offline"));
      }
      return Promise.resolve(loads.original);
    },
    now: () => clock.t,
  });
  return { sfx, host, loads, enabled, clock, failNextLoad };
}

async function ready(r: Rig): Promise<void> {
  r.sfx.preload();
  await flush();
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SnoreSfx loading", () => {
  it("fetches nothing until asked", async () => {
    const r = rig();
    await flush();
    expect(r.loads.n).toBe(0);
    expect(r.sfx.stats.fetches).toBe(0);
  });

  it("preload fetches once however often it is called", async () => {
    const r = rig();
    r.sfx.preload();
    r.sfx.preload();
    await flush();
    r.sfx.preload();
    await flush();
    expect(r.loads.n).toBe(1);
    expect(r.host.decodeCalls).toBe(1);
    expect(r.sfx.stats).toEqual({ fetches: 1, decodes: 1, plays: 0 });
  });

  it("decodes a copy, so the fetched bytes are never detached", async () => {
    const r = rig();
    await ready(r);
    expect(r.host.received[0]).not.toBe(r.loads.original);
    expect(r.host.received[0]!.byteLength).toBe(r.loads.original.byteLength);
  });

  it("waits for the audio gate before decoding", async () => {
    const r = rig(false);
    await ready(r);
    expect(r.loads.n).toBe(1);
    expect(r.sfx.play()).toBe("unavailable");
    expect(r.sfx.stats.decodes).toBe(0);
    r.host.unlock();
    await flush();
    expect(r.sfx.stats.decodes).toBe(1);
    // The bytes are fetched once, the gate is waited on once.
    expect(r.loads.n).toBe(1);
    expect(r.sfx.play()).toBe("started");
  });

  it("retries a failed fetch on the next preload", async () => {
    const r = rig();
    r.failNextLoad.on = true;
    await ready(r);
    expect(r.sfx.play()).toBe("unavailable"); // Not loaded: starts another try.
    await flush();
    expect(r.loads.n).toBe(2);
    expect(r.sfx.play()).toBe("started");
  });

  it("gives up quietly on bytes that will not decode", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = rig();
    r.host.decodeFails = true;
    await ready(r);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(r.sfx.play()).toBe("unavailable");
    r.sfx.preload();
    await flush();
    expect(r.loads.n).toBe(1);
    expect(r.host.decodeCalls).toBe(1);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe("SnoreSfx play", () => {
  it("is silent, and loads nothing, while the settings silence it", async () => {
    const r = rig();
    r.enabled.on = false;
    expect(r.sfx.play()).toBe("unavailable");
    await flush();
    expect(r.loads.n).toBe(0);
    await ready(r);
    expect(r.sfx.play()).toBe("unavailable");
    expect(r.host.plays).toHaveLength(0);
    r.enabled.on = true;
    expect(r.sfx.play()).toBe("started");
  });

  it("starts a load when called before the file is ready", async () => {
    const r = rig();
    expect(r.sfx.play()).toBe("unavailable");
    expect(r.loads.n).toBe(1);
    expect(r.sfx.play()).toBe("unavailable");
    expect(r.loads.n).toBe(1); // Already in flight.
    await flush();
    expect(r.sfx.play()).toBe("started");
  });

  it("plays at SNORE_GAIN", async () => {
    const r = rig();
    await ready(r);
    expect(r.sfx.play()).toBe("started");
    expect(r.host.plays).toEqual([{ gain: SNORE_GAIN }]);
    expect(r.sfx.stats.plays).toBe(1);
    expect(SNORE_GAIN).toBeGreaterThan(0);
    expect(SNORE_GAIN).toBeLessThanOrEqual(1);
  });

  it("never stacks: a call while it sounds adds nothing", async () => {
    const r = rig();
    await ready(r);
    expect(r.sfx.play()).toBe("started");
    r.clock.t = 300;
    expect(r.sfx.play()).toBe("sounding");
    r.clock.t = DURATION * 1000 - 1;
    expect(r.sfx.play()).toBe("sounding");
    expect(r.host.plays).toHaveLength(1);
    r.clock.t = DURATION * 1000;
    expect(r.sfx.play()).toBe("started");
    expect(r.host.plays).toHaveLength(2);
  });

  it("counts the output latency in how long it sounds", async () => {
    const r = rig();
    r.host.latency = 0.05;
    await ready(r);
    expect(r.sfx.play()).toBe("started");
    r.clock.t = DURATION * 1000 + 49;
    expect(r.sfx.play()).toBe("sounding");
    r.clock.t = DURATION * 1000 + 50;
    expect(r.sfx.play()).toBe("started");
  });

  it("is unavailable, and starts no clock, when the host cannot sound", async () => {
    const r = rig();
    await ready(r);
    r.host.playOk = false;
    expect(r.sfx.play()).toBe("unavailable");
    expect(r.sfx.sinceStartMs()).toBeNull();
    expect(r.sfx.stats.plays).toBe(0);
    r.host.playOk = true;
    expect(r.sfx.play()).toBe("started");
  });
});

describe("SnoreSfx clock", () => {
  it("is null before any play", async () => {
    const r = rig();
    await ready(r);
    expect(r.sfx.sinceStartMs()).toBeNull();
  });

  it("reports how long the snore has been heard, then goes null", async () => {
    const r = rig();
    await ready(r);
    r.clock.t = 1000;
    r.sfx.play();
    expect(r.sfx.sinceStartMs()).toBe(0);
    r.clock.t = 1200;
    expect(r.sfx.sinceStartMs()).toBe(200);
    r.clock.t = 1000 + DURATION * 1000 - 1;
    expect(r.sfx.sinceStartMs()).not.toBeNull();
    r.clock.t = 1000 + DURATION * 1000;
    expect(r.sfx.sinceStartMs()).toBeNull();
  });

  it("takes the output latency off: the snore is heard late", async () => {
    const r = rig();
    r.host.latency = 0.08;
    await ready(r);
    r.sfx.play();
    r.clock.t = 50;
    expect(r.sfx.sinceStartMs()).toBe(0); // Not heard yet.
    r.clock.t = 280;
    expect(r.sfx.sinceStartMs()).toBeCloseTo(200, 6);
  });
});

describe("the shipped asset", () => {
  const url = new URL("../../public/snoring-cat-snore.mp3", import.meta.url);

  it("is a small MP3 every browser decodes", () => {
    const bytes = readFileSync(url);
    expect(bytes.length).toBeGreaterThan(1000);
    expect(bytes.length).toBeLessThan(20 * 1024);
    // An ID3 tag, or an MPEG audio frame sync (11 set bits).
    const id3 = bytes.subarray(0, 3).toString("latin1") === "ID3";
    const sync = bytes[0] === 0xff && (bytes[1]! & 0xe0) === 0xe0;
    expect(id3 || sync).toBe(true);
  });
});
