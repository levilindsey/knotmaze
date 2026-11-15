// K1369 s4: the physics worker's gf port (rp=gf's snapshot channel). The
// worker hands snapshots straight to the gf worker over a MessageChannel, from
// a pool of its own (GF_POOL), so main never relays them. These pin what the
// gf worker relies on: the current state at once on connect, the newest state
// after each give, a dry pool that waits instead of allocating, a fresh pool
// for a new port, a close, and stepping that does not change with a port.
import { describe, it, expect } from "vitest";
import { PhysicsWorkerCore, SyncScheduler, GF_POOL } from "../../src/physics/physics_worker_core";
import type { GfPortLike } from "../../src/physics/physics_worker_core";
import { readSnapshot } from "../../src/physics/snapshot";
import { ParticleSystem } from "../../src/physics/particle_system";
import { fabricScene, fabricGraph, bits } from "./fabric_scene";

interface Sent { type: string; gen: number; buf: ArrayBuffer }
function fakePort(): GfPortLike & { sent: Sent[]; closed: boolean; give(buf: ArrayBuffer): void } {
  const p = {
    sent: [] as Sent[],
    closed: false,
    onmessage: null as ((e: { data: unknown }) => void) | null,
    postMessage(m: unknown): void { p.sent.push(m as Sent); },
    close(): void { p.closed = true; },
    give(buf: ArrayBuffer): void { p.onmessage?.({ data: { type: "give", buf } }); },
  };
  return p;
}

function worker(): { w: PhysicsWorkerCore; mainSnaps: () => number } {
  let n = 0;
  const w: PhysicsWorkerCore = new PhysicsWorkerCore(new SyncScheduler(), (m) => {
    if (m.type === "snap") {
      n++;
      w.onMessage({ type: "give", buf: m.buf });
    }
  });
  return { w, mainSnaps: () => n };
}

describe("the physics worker's gf port (K1369 s4)", () => {
  it("sends the current state on connect and the newest after each give", () => {
    const q = fabricScene("?7&gs=6");
    const { w } = worker();
    w.onMessage({ type: "init", gen: 1, params: q.params, tuning: q.tuning });
    const port = fakePort();
    w.onMessage({ type: "gfPort", port });
    expect(port.sent.length).toBe(1);
    const v0 = readSnapshot(port.sent[0].buf);
    expect(port.sent[0].type).toBe("snap");
    expect(port.sent[0].gen).toBe(1);
    expect(v0.seq).toBe(0);
    const ps = w.ps as ParticleSystem;
    expect(bits(v0.positions)).toEqual(bits(ps.positions.subarray(0, 2 * ps.particleCount)));
    // Without gives the pool runs dry at GF_POOL and the state waits.
    for (let f = 0; f < 4; f++) w.onMessage({ type: "frame", gen: 1, dt: 1 / 60 });
    expect(port.sent.length).toBe(GF_POOL);
    // A give sends the newest state at once.
    port.give(port.sent[0].buf);
    expect(port.sent.length).toBe(GF_POOL + 1);
    const v = readSnapshot(port.sent[GF_POOL].buf);
    expect(v.seq).toBe(GF_POOL);
    expect(bits(v.positions)).toEqual(bits(ps.positions.subarray(0, 2 * ps.particleCount)));
    // Nothing changed since: a second give is kept, not sent.
    port.give(port.sent[1].buf);
    expect(port.sent.length).toBe(GF_POOL + 1);
    // A buffer of the wrong size is let go.
    port.give(new ArrayBuffer(8));
    expect(port.sent.length).toBe(GF_POOL + 1);
  });

  it("gives a new port a full pool and closes the old one", () => {
    const q = fabricScene("?7&gs=6");
    const { w } = worker();
    w.onMessage({ type: "init", gen: 1, params: q.params, tuning: q.tuning });
    const a = fakePort();
    w.onMessage({ type: "gfPort", port: a });
    for (let f = 0; f < 3; f++) w.onMessage({ type: "frame", gen: 1, dt: 1 / 60 });
    expect(a.sent.length).toBe(GF_POOL);
    // The buffers lent over a are gone with it: b starts full.
    const b = fakePort();
    w.onMessage({ type: "gfPort", port: b });
    expect(a.closed).toBe(true);
    expect(a.onmessage).toBe(null);
    expect(b.sent.length).toBe(1);
    w.onMessage({ type: "frame", gen: 1, dt: 1 / 60 });
    expect(b.sent.length).toBe(GF_POOL);
    w.onMessage({ type: "gfPort", port: null });
    expect(b.closed).toBe(true);
    w.onMessage({ type: "frame", gen: 1, dt: 1 / 60 });
    expect(b.sent.length).toBe(GF_POOL);
  });

  it("steps the same, and posts main the same, with a port", () => {
    const q = fabricScene("?7&gs=6");
    const plain = worker();
    const ported = worker();
    plain.w.onMessage({ type: "init", gen: 1, params: q.params, tuning: q.tuning });
    ported.w.onMessage({ type: "init", gen: 1, params: q.params, tuning: q.tuning });
    const port = fakePort();
    ported.w.onMessage({ type: "gfPort", port });
    for (let f = 0; f < 6; f++) {
      plain.w.onMessage({ type: "frame", gen: 1, dt: 1 / 60 });
      ported.w.onMessage({ type: "frame", gen: 1, dt: 1 / 60 });
      port.give(port.sent[port.sent.length - 1].buf);
    }
    const a = plain.w.ps as ParticleSystem;
    const b = ported.w.ps as ParticleSystem;
    expect(bits(b.positions)).toEqual(bits(a.positions));
    expect(ported.mainSnaps()).toBe(plain.mainSnaps());
    const ref = new ParticleSystem(fabricGraph(q.params));
    for (let f = 0; f < 6; f++) ref.step(1 / 60, q.tuning);
    expect(bits(b.positions)).toEqual(bits(ref.positions));
  });
});
