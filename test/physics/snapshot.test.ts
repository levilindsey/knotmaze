import { describe, it, expect } from "vitest";
import { ParticleSystem, EMERGENT_MAX, EMERGENT_ROW } from "../../src/physics/particle_system";
import type { PhysicsTuning } from "../../src/physics/particle_system";
import { MirrorSystem } from "../../src/physics/mirror_system";
import {
  SNAP_HEADER,
  H,
  snapshotBytes,
  writeSnapshot,
  readSnapshot,
  fingerprintOf,
} from "../../src/physics/snapshot";
import type { SnapshotMeta } from "../../src/physics/snapshot";
import { fabricScene, fabricGraph, bits } from "./fabric_scene";

// K7 stage 2 (docs/design/K7_worker.md, design 1): the snapshot the physics
// worker transfers to main after each substep, and main's mirror, which
// copies it into the objects the renderers read. On fabric designs.

const QUERY = "?7&gs=8";

const META: SnapshotMeta = {
  gen: 3,
  seq: 41,
  substeps: 1234,
  lag: 0.125,
  wallAt: 1.7e12 + 0.5,
  asleep: false,
  inputs: 17,
  frames: 99,
  stepMs: 321.5,
};

// A system mid-drag: a violent circle around the centroid tunnels threads
// through each other (emergent crossings) and leaves some passes in the
// fallback (displayF undefined). Returns the system still grabbed.
function midDrag(): { ps: ParticleSystem; tuning: PhysicsTuning } {
  const { params, tuning } = fabricScene(QUERY);
  const ps = new ParticleSystem(fabricGraph(params));
  for (let f = 0; f < 60; f++) ps.step(1 / 60, tuning);
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ps.particleCount; i++) {
    cx += ps.positions[i * 2];
    cy += ps.positions[i * 2 + 1];
  }
  const g = ps.nearest(cx / ps.particleCount, cy / ps.particleCount, 5);
  const gx = ps.positions[g * 2];
  const gy = ps.positions[g * 2 + 1];
  ps.grabAt(g, gx, gy);
  for (let f = 0; f < 120; f++) {
    const a = (f / 120) * Math.PI * 4;
    const r = 3 * Math.min(1, f / 30);
    ps.dragTo(gx + r * Math.cos(a), gy + r * Math.sin(a));
    ps.step(1 / 60, tuning);
    if (f > 40 && ps.emergentCrossings.length > 0) break;
  }
  return { ps, tuning };
}

function snap(ps: ParticleSystem, meta: SnapshotMeta = META): ArrayBuffer {
  const buf = new ArrayBuffer(snapshotBytes(ps.particleCount, ps.crossings.length));
  writeSnapshot(ps, buf, meta);
  return buf;
}

// The mirror's readers against the live system's.
function expectMirrors(m: MirrorSystem, ps: ParticleSystem): void {
  expect(bits(m.positions)).toEqual(bits(ps.positions));
  for (let k = 0; k < ps.crossings.length; k++) {
    const a = m.crossings[k];
    const b = ps.crossings[k];
    expect(a.over.ctrl).toBe(b.over.ctrl);
    expect(a.under.ctrl).toBe(b.under.ctrl);
    expect(a.over.displayF).toBe(b.over.displayF);
    expect(a.under.displayF).toBe(b.under.displayF);
  }
  expect(m.emergentCrossings).toEqual(ps.emergentCrossings);
  expect(m.simTime).toBe(ps.simTime);
  expect(m.pendingTime).toBe(ps.pendingTime);
  expect(m.maxMove).toBe(ps.maxMove);
  expect(m.settleComplete).toBe(ps.settleComplete);
  expect(m.contactsStatic).toBe(ps.contactsStatic);
  expect(m.ridersPending).toBe(ps.ridersPending);
}

describe("snapshot layout (K7)", () => {
  it("has a 152-byte header and 8N + 32C + the emergent table after it", () => {
    expect(SNAP_HEADER * 8).toBe(152);
    expect(Math.max(...Object.values(H))).toBe(SNAP_HEADER - 1);
    expect(new Set(Object.values(H)).size).toBe(SNAP_HEADER);
    const em = 4 * EMERGENT_MAX * EMERGENT_ROW;
    expect(snapshotBytes(0, 0)).toBe(152 + em);
    expect(snapshotBytes(563, 71)).toBe(152 + 8 * 563 + 32 * 71 + em);
    // Every section starts on its element size (no copies for the views).
    expect((152 + 8 * 563) % 8).toBe(0);
  });

  it("rejects a buffer of the wrong size", () => {
    const { params } = fabricScene(QUERY);
    const ps = new ParticleSystem(fabricGraph(params));
    const n = ps.particleCount;
    const c = ps.crossings.length;
    expect(() => writeSnapshot(ps, new ArrayBuffer(snapshotBytes(n, c) - 8), META)).toThrow();
    expect(() => writeSnapshot(ps, new ArrayBuffer(snapshotBytes(n, c) + 8), META)).toThrow();
    const buf = snap(ps);
    expect(() => readSnapshot(buf.slice(0, buf.byteLength - 8))).toThrow();
  });
});

describe("snapshot round trip (K7)", () => {
  it("carries positions, passes, emergent rows and the header exactly", () => {
    const { ps } = midDrag();
    const n = ps.particleCount;
    const c = ps.crossings.length;
    const live = ps.emergentCrossings;
    expect(live.length).toBeGreaterThan(0);
    const defined = ps.crossings.filter((x) => x.over.displayF !== undefined).length;
    expect(defined).toBeGreaterThan(0);

    const s = readSnapshot(snap(ps));
    expect(s.n).toBe(n);
    expect(s.c).toBe(c);
    expect(bits(s.positions)).toEqual(bits(ps.positions));
    for (let k = 0; k < c; k++) {
      const x = ps.crossings[k];
      expect(s.passes[k * 4]).toBe(x.over.ctrl);
      expect(s.passes[k * 4 + 2]).toBe(x.under.ctrl);
      const of = s.passes[k * 4 + 1];
      const uf = s.passes[k * 4 + 3];
      expect(Number.isNaN(of) ? undefined : of).toBe(x.over.displayF);
      expect(Number.isNaN(uf) ? undefined : uf).toBe(x.under.displayF);
    }
    expect(s.emergentCount).toBe(live.length);
    expect(s.gen).toBe(META.gen);
    expect(s.seq).toBe(META.seq);
    expect(s.substeps).toBe(META.substeps);
    expect(s.lag).toBe(META.lag);
    expect(s.wallAt).toBe(META.wallAt);
    expect(s.asleep).toBe(false);
    expect(s.inputs).toBe(META.inputs);
    expect(s.frames).toBe(META.frames);
    expect(s.simTime).toBe(ps.simTime);
    expect(s.pending).toBe(ps.pendingTime);
    expect(s.maxMove).toBe(ps.maxMove);
    expect(s.settleComplete).toBe(ps.settleComplete);
    expect(s.contactsStatic).toBe(ps.contactsStatic);
    expect(s.ridersPending).toBe(ps.ridersPending);
    expect(s.grabbed).toBe(ps.grabbedParticle);
    expect(s.grabbed).toBeGreaterThanOrEqual(0);
    expect(readSnapshot(snap(ps, { ...META, asleep: true })).asleep).toBe(true);
  });

  it("writes NaN for an undefined displayF and reads it back as undefined", () => {
    const { params } = fabricScene(QUERY);
    const ps = new ParticleSystem(fabricGraph(params));
    // A fresh build has no displayF yet.
    expect(ps.crossings.every((x) => x.over.displayF === undefined)).toBe(true);
    const s = readSnapshot(snap(ps));
    for (let k = 0; k < ps.crossings.length; k++) {
      expect(Number.isNaN(s.passes[k * 4 + 1])).toBe(true);
      expect(Number.isNaN(s.passes[k * 4 + 3])).toBe(true);
    }
    const m = new MirrorSystem(fabricGraph(params));
    for (const x of m.crossings) {
      x.over.displayF = 1;
      x.under.displayF = 2;
    }
    m.applySnapshot(s);
    expect(m.crossings.every((x) => x.over.displayF === undefined)).toBe(true);
    expect(m.crossings.every((x) => x.under.displayF === undefined)).toBe(true);
  });

  it("fingerprints a build: the same params match, another seed does not", () => {
    const a = fabricScene(QUERY).params;
    const b = fabricScene("?8&gs=8").params;
    const fa = fingerprintOf(new ParticleSystem(fabricGraph(a)));
    expect(fingerprintOf(new ParticleSystem(fabricGraph(a)))).toEqual(fa);
    expect(fingerprintOf(new ParticleSystem(fabricGraph(b))).hash).not.toBe(fa.hash);
    expect(fa.hash).toBeGreaterThanOrEqual(0);
  });
});

describe("MirrorSystem (K7)", () => {
  it("reads what the live system reads, in the same pass objects", () => {
    const { params } = fabricScene(QUERY);
    const { ps } = midDrag();
    const m = new MirrorSystem(fabricGraph(params));
    expect(m.particleCount).toBe(ps.particleCount);
    expect(m.snapshotSeq).toBe(-1);
    const passes = m.crossings.map((x) => [x.over, x.under]);
    m.applySnapshot(readSnapshot(snap(ps)));
    expectMirrors(m, ps);
    expect(m.crossings.map((x) => [x.over, x.under])).toEqual(passes);
    for (let k = 0; k < passes.length; k++) {
      expect(m.crossings[k].over).toBe(passes[k][0]);
      expect(m.crossings[k].under).toBe(passes[k][1]);
    }
    expect(m.snapshotSeq).toBe(META.seq);
    expect(m.snapshotWallAt).toBe(META.wallAt);
    expect(m.snapshotInputs).toBe(META.inputs);
    expect(m.workerAsleep).toBe(false);
    // The rows track the live system as it changes: release and settle on.
    ps.release();
    const { tuning } = fabricScene(QUERY);
    for (let f = 0; f < 30; f++) ps.step(1 / 60, tuning);
    m.applySnapshot(readSnapshot(snap(ps, { ...META, seq: 42, asleep: true })));
    expectMirrors(m, ps);
    expect(m.workerAsleep).toBe(true);
  });

  it("records the grab main makes, and refuses to step or write", () => {
    const { params } = fabricScene(QUERY);
    const m = new MirrorSystem(fabricGraph(params));
    expect(m.grabbedParticle).toBe(-1);
    expect(m.grabAt(5, 1, 2)).toBe(5);
    expect(m.grabbedParticle).toBe(5);
    m.dragTo(3, 4);
    expect(m.grabbedParticle).toBe(5);
    const r = m.release();
    expect(r).not.toBeNull();
    expect(r?.particle).toBe(5);
    expect(r?.speed).toBe(0);
    expect(m.grabbedParticle).toBe(-1);
    expect(m.grabAt(-1, 0, 0)).toBe(-1);
    expect(() => m.step(1 / 60)).toThrow();
    expect(() => m.beginFrame(1 / 60)).toThrow();
    expect(() => m.runSubstep()).toThrow();
    expect(() => m.tug(0, 1, 5, 3, 1, 0.1)).toThrow();
    expect(() => m.reset()).toThrow();
  });

  it("refuses a snapshot of another build", () => {
    const m = new MirrorSystem(fabricGraph(fabricScene(QUERY).params));
    const other = new ParticleSystem(fabricGraph(fabricScene("?7&gs=10").params));
    expect(() => m.applySnapshot(readSnapshot(snap(other)))).toThrow();
  });
});
