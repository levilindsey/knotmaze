import { describe, it, expect } from "vitest";
import { hypot2 } from "../../src/util/det_math";

// K108: hypot2 is V8's Math.hypot, bit for bit, built from exact operations
// so every engine returns the same bits. Every maze distance goes through
// it: changing a single result moves mazes (daily goldens, links, saved
// attempts). The frozen hashes below were computed with hypot2 AND checked
// equal to Node's Math.hypot (V8) when written (.claude/probes/K108/pin.ts).
// Note that V8's answer is not always the correctly rounded one: Firefox's
// (fdlibm) and Math.sqrt(x * x + y * y) agree with each other and differ
// from it by an ulp on 7074 of the 20301 quarter-grid pairs. That is
// deliberate - the shipped mazes were built with V8's.

const f64 = new Float64Array(1);
const u32 = new Uint32Array(f64.buffer);

// FNV-1a over the result bits.
function hashOf(inputs: [number, number][]): string {
  let h = 0x811c9dc5;
  for (const [x, y] of inputs) {
    f64[0] = hypot2(x, y);
    for (const w of [u32[0], u32[1]]) {
      for (let s = 0; s < 32; s += 8) {
        h ^= (w >>> s) & 0xff;
        h = Math.imul(h, 0x01000193);
      }
    }
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("hypot2 (K108)", () => {
  it("returns V8's bits where Firefox's Math.hypot differs", () => {
    expect(hypot2(0.75, 0.5)).toBe(0.9013878188659974); // Firefox: ...973
    expect(hypot2(0.75, 0.75)).toBe(1.0606601717798214); // Firefox: ...212
    expect(hypot2(1.25, 0.25)).toBe(1.2747548783981963); // Firefox: ...961
    expect(hypot2(3, 4)).toBe(5);
  });

  it("is symmetric and ignores signs", () => {
    for (const [x, y] of [
      [0.75, 0.5],
      [1e-300, 3e-310],
      [7.25, 2.5],
    ]) {
      const r = hypot2(x, y);
      expect(hypot2(y, x)).toBe(r);
      expect(hypot2(-x, y)).toBe(r);
      expect(hypot2(x, -y)).toBe(r);
    }
  });

  it("follows the spec's special cases", () => {
    expect(hypot2(Infinity, NaN)).toBe(Infinity);
    expect(hypot2(NaN, -Infinity)).toBe(Infinity);
    expect(hypot2(NaN, 1)).toBeNaN();
    expect(Object.is(hypot2(-0, -0), 0)).toBe(true);
    expect(hypot2(0, -2.5)).toBe(2.5);
    expect(hypot2(1e300, 1e300)).toBe(1.4142135623730952e300); // no overflow
  });

  it("is frozen on the quarter grid plan coordinates make", () => {
    const grid: [number, number][] = [];
    for (let i = 0; i <= 200; i++) {
      for (let j = 0; j <= i; j++) grid.push([i / 4, j / 4]);
    }
    expect(grid.length).toBe(20301);
    expect(hashOf(grid)).toBe("e173b607");
  });

  it("is frozen on random doubles of every magnitude", () => {
    const rng = mulberry32(108);
    const inputs: [number, number][] = [];
    for (let i = 0; i < 20000; i++) {
      const a = (rng() - 0.5) * 2 ** Math.floor(rng() * 61 - 30);
      const b = (rng() - 0.5) * 2 ** Math.floor(rng() * 61 - 30);
      inputs.push([a, b]);
    }
    expect(hashOf(inputs)).toBe("a4db7725");
  });
});
