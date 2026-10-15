import type { ParticleSystem } from "./particle_system";

// K7 stage 4 (docs/design/K7_worker.md, design 8): a probe's copy of the
// stepping state, the parts the render never reads (prev, zPos) next to
// positions and the pass ctrls, and a hash of it. Both hosts build it with
// dumpOf (the worker posts it), so hashes compare across hosts and runs.
export interface PhysicsDump {
  gen: number;
  simTime: number;
  // 2 per particle.
  positions: Float32Array;
  prev: Float32Array;
  // 1 per particle.
  zPos: Float32Array;
  // 4 per crossing: over ctrl, over displayF, under ctrl, under displayF
  // (NaN: undefined), as in the snapshot.
  passes: Float64Array;
}

// The fields a dump reads that the class keeps private.
interface Internals {
  prev: Float32Array;
  zPos: Float32Array;
}

export function dumpOf(ps: ParticleSystem, gen: number): PhysicsDump {
  const raw = ps as unknown as Internals;
  const n = ps.particleCount;
  const c = ps.crossings.length;
  const passes = new Float64Array(4 * c);
  for (let k = 0; k < c; k++) {
    const x = ps.crossings[k];
    passes[k * 4] = x.over.ctrl;
    passes[k * 4 + 1] = x.over.displayF ?? NaN;
    passes[k * 4 + 2] = x.under.ctrl;
    passes[k * 4 + 3] = x.under.displayF ?? NaN;
  }
  return {
    gen,
    simTime: ps.simTime,
    positions: ps.positions.slice(0, 2 * n),
    prev: raw.prev.slice(0, 2 * n),
    zPos: raw.zPos.slice(0, n),
    passes,
  };
}

// FNV-1a (32-bit) over the bytes of each array, as 8 hex digits; `all`
// runs over positions, prev, zPos and passes in that order.
export interface DumpHashes {
  all: string;
  positions: string;
  prev: string;
  zPos: string;
  passes: string;
}

const FNV_SEED = 0x811c9dc5;

function fnv(seed: number, a: Float32Array | Float64Array): number {
  const b = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
  let h = seed;
  for (let i = 0; i < b.length; i++) h = Math.imul(h ^ b[i], 0x01000193);
  return h;
}

function hex(h: number): string {
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function hashDump(d: PhysicsDump): DumpHashes {
  let all = FNV_SEED;
  for (const a of [d.positions, d.prev, d.zPos, d.passes]) all = fnv(all, a);
  return {
    all: hex(all),
    positions: hex(fnv(FNV_SEED, d.positions)),
    prev: hex(fnv(FNV_SEED, d.prev)),
    zPos: hex(fnv(FNV_SEED, d.zPos)),
    passes: hex(fnv(FNV_SEED, d.passes)),
  };
}
