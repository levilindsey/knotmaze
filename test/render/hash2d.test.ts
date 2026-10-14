import { describe, expect, it } from "vitest";
import { effectFragment } from "../../src/render/background_shaders";
import {
  HASH2D,
  HASH2D_GLSL,
  hash2d,
  hash2dGlsl,
} from "../../src/render/hash2d";
import type { Hash2dTable } from "../../src/render/hash2d";

// K154: the backgrounds' integer hash, our own. The mirror (Math.imul, >>>)
// is the shader's arithmetic exactly, so the statistics below are the
// shader's. Every threshold is a multiple of the sampling noise of its test
// (sigma), with a weakened hash as the negative control: a threshold that a
// broken hash also passes would be a rubber stamp.

// A fixed-seed generator for the random-input tests (mulberry32).
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Strict avalanche: flip each of the 64 input bits of n random inputs; the
// worst |P(output bit flips) - 1/2| over the 64 x 64 matrix. Sampling noise
// per cell: sigma = 0.5 / sqrt(n); the worst of 4096 cells of an ideal hash
// sits near 3.6 sigma.
function worstAvalanche(
  n: number,
  seed: number,
  table: Hash2dTable
): number {
  const rnd = rng(seed);
  const cnt = new Float64Array(64 * 64);
  for (let i = 0; i < n; i++) {
    const x = (rnd() * 4294967296) >>> 0;
    const y = (rnd() * 4294967296) >>> 0;
    const [ox, oy] = hash2d(x, y, table);
    for (let b = 0; b < 64; b++) {
      const [px, py] =
        b < 32
          ? hash2d((x ^ (1 << b)) >>> 0, y, table)
          : hash2d(x, (y ^ (1 << (b - 32))) >>> 0, table);
      const dx = (ox ^ px) >>> 0;
      const dy = (oy ^ py) >>> 0;
      for (let j = 0; j < 32; j++) {
        if ((dx >>> j) & 1) cnt[b * 64 + j]++;
        if ((dy >>> j) & 1) cnt[b * 64 + 32 + j]++;
      }
    }
  }
  let worst = 0;
  for (let i = 0; i < cnt.length; i++) {
    worst = Math.max(worst, Math.abs(cnt[i] / n - 0.5));
  }
  return worst;
}

// The cell grid the value noise reads and the pixel grid the dither reads:
// small signed integers.
const GRID = 512;
const LO = -GRID / 2;
const SIDE = GRID * GRID;
function gridHashes(table: Hash2dTable = HASH2D): {
  hx: Uint32Array;
  hy: Uint32Array;
} {
  const hx = new Uint32Array(SIDE);
  const hy = new Uint32Array(SIDE);
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      const [a, b] = hash2d(LO + i, LO + j, table);
      hx[j * GRID + i] = a;
      hy[j * GRID + i] = b;
    }
  }
  return { hx, hy };
}

// Chi-square of n values over `buckets` equal bins against uniform.
function chiSquare(counts: ArrayLike<number>, n: number): number {
  const e = n / counts.length;
  let s = 0;
  for (let i = 0; i < counts.length; i++) s += ((counts[i] - e) * (counts[i] - e)) / e;
  return s;
}

const WEAK: Hash2dTable = {
  ...HASH2D,
  rounds: HASH2D.rounds.slice(0, 1),
};

describe("hash2d (K154): avalanche", () => {
  it("flips every output bit about half the time for every input bit", () => {
    // n = 8000 inputs: sigma 0.0056 a cell; an ideal hash's worst of 4096
    // cells is ~0.020. Threshold 0.030 (5.4 sigma). The search that picked
    // the constants measured 0.0058 at n = 100000 (sigma 0.0016).
    const worst = worstAvalanche(8000, 0x4b4e, HASH2D);
    expect(worst).toBeLessThan(0.03);
  });

  it("is told apart from a one-round hash by that threshold", () => {
    // The negative control: the same code with two of three rounds dropped
    // misses the threshold by a wide margin.
    expect(worstAvalanche(2000, 0x4b4e, WEAK)).toBeGreaterThan(0.1);
  });

  it("changes every output bit half the time between neighbouring cells", () => {
    // (x, y) -> (x + 1, y) and (x, y + 1) over the 512 x 512 grid: the pairs
    // the noise's lattice actually compares. n = 262144 pairs a direction:
    // sigma 0.001; threshold 0.006 (6 sigma) over 128 cells.
    const { hx, hy } = gridHashes();
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
    ]) {
      const cnt = new Float64Array(64);
      let n = 0;
      for (let j = 0; j < GRID - dy; j++) {
        for (let i = 0; i < GRID - dx; i++) {
          const a = j * GRID + i;
          const b = (j + dy) * GRID + i + dx;
          const x = (hx[a] ^ hx[b]) >>> 0;
          const y = (hy[a] ^ hy[b]) >>> 0;
          for (let k = 0; k < 32; k++) {
            cnt[k] += (x >>> k) & 1;
            cnt[32 + k] += (y >>> k) & 1;
          }
          n++;
        }
      }
      for (let k = 0; k < 64; k++) {
        expect(Math.abs(cnt[k] / n - 0.5), `d(${dx},${dy}) bit ${k}`).toBeLessThan(0.006);
      }
    }
  });
});

describe("hash2d (K154): uniformity and independence", () => {
  const { hx, hy } = gridHashes();

  it("fills 256 buckets evenly in the top, middle and bottom byte of each lane", () => {
    // Expected 1024 a bucket; chi-square with 255 degrees of freedom has
    // mean 255 and sd 22.6. Threshold 370 (5.1 sd). The dither reads the top
    // 24 bits of both lanes and the lattice the whole word.
    for (const [name, lane] of [
      ["x", hx],
      ["y", hy],
    ] as const) {
      for (const shift of [24, 12, 0]) {
        const c = new Float64Array(256);
        for (let i = 0; i < SIDE; i++) c[(lane[i] >>> shift) & 255]++;
        expect(chiSquare(c, SIDE), `${name} byte >> ${shift}`).toBeLessThan(370);
      }
    }
  });

  it("fills the 16 x 16 joint buckets of the two lanes evenly", () => {
    const c = new Float64Array(256);
    for (let i = 0; i < SIDE; i++) c[(hx[i] >>> 28) * 16 + (hy[i] >>> 28)]++;
    expect(chiSquare(c, SIDE)).toBeLessThan(370);
  });

  it("has no correlation between a cell and its neighbours at small lags", () => {
    // Pearson r of the lane values as [0, 1) floats at lags of the lattice
    // (1, 2, 16 cells), the diagonals, and between the two lanes of one
    // cell. N = 262144: sigma 0.002; threshold 0.01 (5 sigma).
    const u = (v: number): number => v / 4294967296;
    const corr = (
      a: Uint32Array,
      b: Uint32Array,
      dx: number,
      dy: number
    ): number => {
      let sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0, n = 0;
      for (let j = Math.max(0, -dy); j < GRID - Math.max(0, dy); j++) {
        for (let i = Math.max(0, -dx); i < GRID - Math.max(0, dx); i++) {
          const p = u(a[j * GRID + i]);
          const q = u(b[(j + dy) * GRID + i + dx]);
          sa += p; sb += q; saa += p * p; sbb += q * q; sab += p * q; n++;
        }
      }
      const cov = sab / n - (sa / n) * (sb / n);
      return cov / Math.sqrt((saa / n - (sa / n) ** 2) * (sbb / n - (sb / n) ** 2));
    };
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1], [2, 0], [0, 2], [16, 0], [0, 16]]) {
      expect(Math.abs(corr(hx, hx, dx, dy)), `x lane (${dx},${dy})`).toBeLessThan(0.01);
      expect(Math.abs(corr(hy, hy, dx, dy)), `y lane (${dx},${dy})`).toBeLessThan(0.01);
    }
    expect(Math.abs(corr(hx, hy, 0, 0)), "x against y").toBeLessThan(0.01);
    expect(Math.abs(corr(hx, hy, 1, 0)), "x against the next y").toBeLessThan(0.01);
  });

  it("is a bijection: no two cells share both words", () => {
    const seen = new Set<string>();
    for (let i = 0; i < SIDE; i++) seen.add(hx[i] + ":" + hy[i]);
    expect(seen.size).toBe(SIDE);
  });

  it("makes the dither's triangular noise zero-mean with variance 1/6", () => {
    // tpdf: (h.x >> 8) + (h.y >> 8) as 24-bit fractions, minus 1. A
    // triangular PDF on (-1, 1) has mean 0 and variance 1/6. The sample mean
    // has sd sqrt(1/6 / N) = 0.0008 (threshold 0.004); the variance's sd is
    // about 0.0004 (threshold 0.002).
    let s = 0;
    let ss = 0;
    for (let i = 0; i < SIDE; i++) {
      const t = ((hx[i] >>> 8) + (hy[i] >>> 8)) / 16777216 - 1;
      s += t;
      ss += t * t;
    }
    expect(Math.abs(s / SIDE)).toBeLessThan(0.004);
    expect(Math.abs(ss / SIDE - 1 / 6)).toBeLessThan(0.002);
  });
});

describe("hash2d (K154): the shader text", () => {
  it("carries the table's constants and shifts, in the mirror's order", () => {
    const glsl = hash2dGlsl();
    expect(glsl).toBe(HASH2D_GLSL);
    expect(glsl.startsWith("uvec2 hash2d(uvec2 v) {\n")).toBe(true);
    const hex = (n: number): string =>
      "0x" + n.toString(16).toUpperCase().padStart(8, "0") + "u";
    let at = glsl.indexOf(hex(HASH2D.mul0[0]));
    expect(at, "mul0").toBeGreaterThan(0);
    for (const word of [HASH2D.mul0[1], HASH2D.add0[0], HASH2D.add0[1]]) {
      const next = glsl.indexOf(hex(word), at);
      expect(next, hex(word)).toBeGreaterThanOrEqual(at);
      at = next;
    }
    for (const r of HASH2D.rounds) {
      for (const word of [r.mul[0], r.mul[1]]) {
        const next = glsl.indexOf(hex(word), at);
        expect(next, hex(word)).toBeGreaterThan(at);
        at = next;
      }
      const cross = glsl.indexOf(`v ^= v.yx >> ${r.cross}u;`, at);
      expect(cross, `cross ${r.cross}`).toBeGreaterThan(at);
      const self = glsl.indexOf(`v ^= v >> ${r.self}u;`, cross);
      expect(self, `self ${r.self}`).toBeGreaterThan(cross);
      at = self;
    }
    expect(glsl.trimEnd().endsWith("return v;\n}")).toBe(true);
  });

  it("is the only hash the effect programs use, and PCG2D is gone", () => {
    for (const id of ["vellum", "mist", "wash", "silk", "aurora", "contours"]) {
      const src = effectFragment(id);
      expect(src, id).toContain(HASH2D_GLSL);
      expect(src, id).toContain("hash2d(uvec2(c))");
      expect(src.toLowerCase(), id).not.toContain("pcg");
      expect(src, id).not.toContain("1664525u");
    }
  });
});
