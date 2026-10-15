import { EMERGENT_MAX, EMERGENT_ROW } from "./particle_system";
import type { ParticleSystem } from "./particle_system";

// THE SNAPSHOT (K7 stage 2, docs/design/K7_worker.md, design 1 and 2): what
// the physics worker sends main after each substep, in one ArrayBuffer that
// is transferred, never shared. Main's mirror (mirror_system.ts) copies it
// into the same objects the renderers read. Layout, in this order:
// - a header of SNAP_HEADER f64s (the H slots below);
// - positions, f32, 2 per particle (8N bytes);
// - each crossing's two passes, f64: over ctrl, over displayF, under ctrl,
//   under displayF, NaN meaning displayF is undefined (32 bytes a crossing);
// - the emergent crossings, f32, EMERGENT_ROW per row for EMERGENT_MAX rows
//   (i, u, j, v, aOver; ParticleSystem.writeEmergentRows), of which the
//   header's emergent slot counts the live ones.
// Every section starts on its own element size (the header is 144 bytes,
// positions 8N), so the typed-array views need no copy.

export const SNAP_HEADER = 18;

// Header slots. Flags are 1 or 0.
export const H = {
  gen: 0,
  // Snapshots posted since init (the worker's count, for ordering).
  seq: 1,
  simTime: 2,
  // Substeps the worker ran since init.
  substeps: 3,
  // Simulated seconds dropped as backlog since init.
  lag: 4,
  // When it was written: performance.timeOrigin + performance.now() ms,
  // comparable across threads.
  wallAt: 5,
  maxMove: 6,
  asleep: 7,
  settleComplete: 8,
  contactsStatic: 9,
  ridersPending: 10,
  // The worker's grabbed particle (diagnostic; main keeps its own).
  grabbed: 11,
  n: 12,
  c: 13,
  emergent: 14,
  // The step accumulator (pendingTime).
  pending: 15,
  // Input messages (everything but frame, give and the probes) the worker
  // had handled for this gen: main counts the ones it posted, so it can
  // tell a snapshot written before its latest input (a wake, a reset) from
  // one written after it.
  inputs: 16,
  // frame messages the worker had received for this gen, run or discarded.
  frames: 17,
} as const;

const EMERGENT_FLOATS = EMERGENT_MAX * EMERGENT_ROW;

// Bytes of one snapshot for n particles and c crossings.
export function snapshotBytes(n: number, c: number): number {
  return SNAP_HEADER * 8 + 8 * n + 32 * c + 4 * EMERGENT_FLOATS;
}

// What the writer adds to what the system knows.
export interface SnapshotMeta {
  gen: number;
  seq: number;
  substeps: number;
  lag: number;
  wallAt: number;
  asleep: boolean;
  inputs: number;
  frames: number;
}

// A snapshot read back: header values plus views into the buffer (valid
// until the buffer is given back to the worker).
export interface SnapshotView {
  gen: number;
  seq: number;
  simTime: number;
  substeps: number;
  lag: number;
  wallAt: number;
  maxMove: number;
  asleep: boolean;
  settleComplete: boolean;
  contactsStatic: boolean;
  ridersPending: number;
  grabbed: number;
  n: number;
  c: number;
  emergentCount: number;
  pending: number;
  inputs: number;
  frames: number;
  positions: Float32Array;
  passes: Float64Array;
  emergent: Float32Array;
}

function views(
  buf: ArrayBuffer,
  n: number,
  c: number
): { header: Float64Array; positions: Float32Array; passes: Float64Array; emergent: Float32Array } {
  const header = new Float64Array(buf, 0, SNAP_HEADER);
  let at = SNAP_HEADER * 8;
  const positions = new Float32Array(buf, at, 2 * n);
  at += 8 * n;
  const passes = new Float64Array(buf, at, 4 * c);
  at += 32 * c;
  const emergent = new Float32Array(buf, at, EMERGENT_FLOATS);
  return { header, positions, passes, emergent };
}

// Writes ps's render state into buf (snapshotBytes long for ps).
export function writeSnapshot(ps: ParticleSystem, buf: ArrayBuffer, meta: SnapshotMeta): void {
  const n = ps.particleCount;
  const c = ps.crossings.length;
  if (buf.byteLength !== snapshotBytes(n, c)) {
    throw new Error(`snapshot buffer ${buf.byteLength} B, want ${snapshotBytes(n, c)}`);
  }
  const v = views(buf, n, c);
  v.positions.set(ps.positions.subarray(0, 2 * n));
  const passes = v.passes;
  for (let k = 0; k < c; k++) {
    const x = ps.crossings[k];
    passes[k * 4] = x.over.ctrl;
    passes[k * 4 + 1] = x.over.displayF ?? NaN;
    passes[k * 4 + 2] = x.under.ctrl;
    passes[k * 4 + 3] = x.under.displayF ?? NaN;
  }
  const emergentCount = ps.writeEmergentRows(v.emergent, 0);
  const h = v.header;
  h[H.gen] = meta.gen;
  h[H.seq] = meta.seq;
  h[H.simTime] = ps.simTime;
  h[H.substeps] = meta.substeps;
  h[H.lag] = meta.lag;
  h[H.wallAt] = meta.wallAt;
  h[H.maxMove] = ps.maxMove;
  h[H.asleep] = meta.asleep ? 1 : 0;
  h[H.settleComplete] = ps.settleComplete ? 1 : 0;
  h[H.contactsStatic] = ps.contactsStatic ? 1 : 0;
  h[H.ridersPending] = ps.ridersPending;
  h[H.grabbed] = ps.grabbedParticle;
  h[H.n] = n;
  h[H.c] = c;
  h[H.emergent] = emergentCount;
  h[H.pending] = ps.pendingTime;
  h[H.inputs] = meta.inputs;
  h[H.frames] = meta.frames;
}

export function readSnapshot(buf: ArrayBuffer): SnapshotView {
  const h = new Float64Array(buf, 0, SNAP_HEADER);
  const n = h[H.n];
  const c = h[H.c];
  if (buf.byteLength !== snapshotBytes(n, c)) {
    throw new Error(`snapshot ${buf.byteLength} B does not hold ${n} particles, ${c} crossings`);
  }
  const v = views(buf, n, c);
  return {
    gen: h[H.gen],
    seq: h[H.seq],
    simTime: h[H.simTime],
    substeps: h[H.substeps],
    lag: h[H.lag],
    wallAt: h[H.wallAt],
    maxMove: h[H.maxMove],
    asleep: h[H.asleep] !== 0,
    settleComplete: h[H.settleComplete] !== 0,
    contactsStatic: h[H.contactsStatic] !== 0,
    ridersPending: h[H.ridersPending],
    grabbed: h[H.grabbed],
    n,
    c,
    emergentCount: h[H.emergent],
    pending: h[H.pending],
    inputs: h[H.inputs],
    frames: h[H.frames],
    positions: v.positions,
    passes: v.passes,
    emergent: v.emergent,
  };
}

// A build's identity, for `ready`: main compares the worker's with its own
// mirror's and falls back to in-thread on a mismatch (design 6). Taken
// right after construction (positions are then the initial ones).
export interface Fingerprint {
  n: number;
  c: number;
  chains: number;
  // FNV-1a over the initial positions' bytes.
  hash: number;
}

export function fingerprintOf(ps: ParticleSystem): Fingerprint {
  const bytes = new Uint8Array(
    ps.positions.buffer,
    ps.positions.byteOffset,
    ps.particleCount * 8
  );
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    hash = Math.imul(hash ^ bytes[i], 0x01000193);
  }
  return {
    n: ps.particleCount,
    c: ps.crossings.length,
    chains: ps.chains.length,
    hash: hash >>> 0,
  };
}
