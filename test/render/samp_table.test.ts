// K8 G3-0: the SDF ribbons' data plane (src/render/samp_table.ts). Packing,
// neighbours, RANGES against the renderer's own per-sample slot ids on real
// scenes (fixtures dumped from fa7f9dc by .claude/probes/K8/stage2/
// dump_fixtures.mjs: per chain the frame's slot windows and the
// renderer's idScratch), and SAMP against the real spline samplers.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CAP_FLAT,
  CAP_NONE,
  CAP_ROUND,
  CHAIN_FLOATS,
  RANGE_FLOATS,
  RANGE_LANE_MASK,
  RANGE_SPLIT,
  assignWindowLanes,
  b64ToF32,
  b64ToF64,
  chainCaps,
  decodeRanges,
  g3Layout,
  maxRangeEntries,
  packRadii,
  packRanges,
  packSamp,
  radTexelSpan,
  readSamp,
  rowSpan,
  sampTexelSpan,
  segmentCount,
  segmentSamples,
  typedToB64,
  writeChainTexels,
} from "../../src/render/samp_table";
import { sampleClosedSpline, sampleOpenSpline } from "../../src/geometry/spline_generator";

// GAP_SLOTS (gap_mask.ts): the aMaskId lanes.
const LANES = 4;
const ROW_W = 1024;

const bits = (a: Float32Array): Uint32Array =>
  new Uint32Array(a.buffer, a.byteOffset, a.length);

function ring(n: number, r: number, cx = 3, cy = -2): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    out.push(cx + r * Math.cos(t) + 0.1 * Math.sin(3 * t), cy + r * Math.sin(t));
  }
  return out;
}

describe("layout and packing", () => {
  it("bases: SAMP even, RADII a multiple of 4, no overlap, totals in texels", () => {
    const counts = [7, 8, 1, 2049, 3, 64];
    const L = g3Layout(counts, [true, false, false, true, false, true]);
    let s = 0;
    let r = 0;
    for (let c = 0; c < counts.length; c++) {
      expect(L.sampBase[c] % 2).toBe(0);
      expect(L.radBase[c] % 4).toBe(0);
      expect(L.sampBase[c]).toBe(s);
      expect(L.radBase[c]).toBe(r);
      s += counts[c] + (counts[c] & 1);
      r += Math.ceil(counts[c] / 4) * 4;
    }
    expect(L.sampTexels).toBe(s / 2);
    expect(L.radTexels).toBe(r / 4);
    expect(Array.from(L.closed)).toEqual([1, 0, 0, 1, 0, 1]);
  });

  it("SAMP: two samples per texel, odd chains padded, decodes bit for bit", () => {
    const a = sampleClosedSpline(ring(23, 4.3), 301);
    const b = sampleOpenSpline(ring(17, 2.1, -5, 7), 128, 5);
    const c = sampleClosedSpline(ring(9, 0.7, 1, 1), 2047);
    const chains = [a, b, c];
    const L = g3Layout(
      chains.map((s) => s.count),
      chains.map((s) => s.closed)
    );
    const data = new Float32Array(L.sampTexels * 4).fill(NaN);
    for (let i = 0; i < chains.length; i++) {
      packSamp(data, L.sampBase[i], chains[i].positions, chains[i].count);
    }
    const p = new Float32Array(2);
    for (let i = 0; i < chains.length; i++) {
      const s = chains[i];
      for (let k = 0; k < s.count; k++) {
        readSamp(data, L.sampBase[i], k, p);
        expect(bits(p)[0]).toBe(bits(s.positions)[2 * k]);
        expect(bits(p)[1]).toBe(bits(s.positions)[2 * k + 1]);
        // Texel (base + k) >> 1, pair (base + k) & 1.
        const g = L.sampBase[i] + k;
        expect(data[(g >> 1) * 4 + (g & 1) * 2]).toBe(s.positions[2 * k]);
      }
      const [t0, t1] = sampTexelSpan(L.sampBase[i], s.count);
      expect(t1 - t0).toBe(Math.ceil(s.count / 2));
      if (s.count & 1) {
        // The odd chain's last texel carries (0, 0) in .zw.
        expect(data[(t1 - 1) * 4 + 2]).toBe(0);
        expect(data[(t1 - 1) * 4 + 3]).toBe(0);
      }
    }
    // Every texel written exactly (no NaN left between chains).
    expect(data.every((v) => !Number.isNaN(v))).toBe(true);
  });

  it("RADII: four per texel, fround(h * mul), the region's tail zero", () => {
    const counts = [6, 9];
    const L = g3Layout(counts, [false, false]);
    const data = new Float32Array(L.radTexels * 4).fill(NaN);
    const h = 0.26;
    const mul0 = Array.from({ length: 6 }, (_, k) => 0.1 + k * 0.17);
    const mul1 = Array.from({ length: 9 }, (_, k) => 1 - k * 0.05);
    packRadii(data, L.radBase[0], h, mul0, 6);
    packRadii(data, L.radBase[1], h, mul1, 9);
    for (let k = 0; k < 6; k++) expect(data[L.radBase[0] + k]).toBe(Math.fround(h * mul0[k]));
    for (let k = 0; k < 9; k++) expect(data[L.radBase[1] + k]).toBe(Math.fround(h * mul1[k]));
    // Texel (radBase + k) >> 2, component (radBase + k) & 3.
    expect(data[((L.radBase[1] + 5) >> 2) * 4 + ((L.radBase[1] + 5) & 3)]).toBe(Math.fround(h * mul1[5]));
    expect(data[L.radBase[0] + 6]).toBe(0);
    expect(data[L.radBase[0] + 7]).toBe(0);
    for (let k = 9; k < 12; k++) expect(data[L.radBase[1] + k]).toBe(0);
    expect(radTexelSpan(L.radBase[1], 9)).toEqual([2, 5]);
  });

  it("G3 CHAIN: the unit flag (radBase -1), caps, change detection", () => {
    const data = new Float32Array(4 * CHAIN_FLOATS);
    expect(writeChainTexels(data, 2, 40, -1, CAP_ROUND, CAP_FLAT, 7, 3, 10, 0)).toBe(true);
    expect(Array.from(data.subarray(2 * CHAIN_FLOATS, 3 * CHAIN_FLOATS))).toEqual([40, -1, 1, 2, 7, 3, 10, 0]);
    expect(writeChainTexels(data, 2, 40, -1, CAP_ROUND, CAP_FLAT, 7, 3, 10, 0)).toBe(false);
    // A pluck collapse switches the chain to its RADII region.
    expect(writeChainTexels(data, 2, 40, 16, CAP_ROUND, CAP_FLAT, 7, 3, 10, 0)).toBe(true);
    expect(data[2 * CHAIN_FLOATS + 1]).toBe(16);
    expect(chainCaps(true, false, true, false, true)).toEqual([CAP_NONE, CAP_NONE]);
    // Fused -> round, anchored -> flat, free -> round.
    expect(chainCaps(false, true, true, false, true)).toEqual([CAP_ROUND, CAP_FLAT]);
    expect(chainCaps(false, false, false, false, true)).toEqual([CAP_ROUND, CAP_FLAT]);
  });

  it("row partials: a chain across a row boundary decodes, its span covers both rows", () => {
    // Chain 0 fills texels [0, 1023) (2045 samples + pad = 1023 texels);
    // chain 1 starts in row 0's last texel and runs into row 1.
    const counts = [2045, 7];
    const L = g3Layout(counts, [true, false]);
    expect(L.sampBase[1]).toBe(2046);
    const pos1 = new Float32Array(14).map((_, i) => i * 1.25 - 3);
    const data = new Float32Array(2 * ROW_W * 4);
    packSamp(data, L.sampBase[1], pos1, 7);
    const [t0, t1] = sampTexelSpan(L.sampBase[1], 7);
    expect([t0, t1]).toEqual([1023, 1027]);
    expect(rowSpan(t0, t1, ROW_W)).toEqual([0, 2]);
    expect(rowSpan(0, 1023, ROW_W)).toEqual([0, 1]);
    expect(rowSpan(1024, 1027, ROW_W)).toEqual([1, 2]);
    const p = new Float32Array(2);
    for (let k = 0; k < 7; k++) {
      readSamp(data, L.sampBase[1], k, p);
      expect([p[0], p[1]]).toEqual([pos1[2 * k], pos1[2 * k + 1]]);
    }
    // Sample 2 sits at texel 1024 = (0, 1).
    expect(data[1024 * 4]).toBe(pos1[4]);
  });
});

describe("neighbours", () => {
  it("closed chains wrap, open chains clamp, never a last-to-first chord", () => {
    const out = [0, 0, 0, 0];
    const n = 9;
    expect(segmentCount(n, true)).toBe(9);
    expect(segmentCount(n, false)).toBe(8);
    segmentSamples(0, n, true, out);
    expect(out).toEqual([8, 0, 1, 2]);
    segmentSamples(8, n, true, out);
    expect(out).toEqual([7, 8, 0, 1]);
    segmentSamples(7, n, true, out);
    expect(out).toEqual([6, 7, 8, 0]);
    segmentSamples(0, n, false, out);
    expect(out).toEqual([-1, 0, 1, 2]);
    segmentSamples(7, n, false, out);
    expect(out).toEqual([6, 7, 8, -1]);
    for (let k = 0; k < segmentCount(n, false); k++) {
      segmentSamples(k, n, false, out);
      expect(out[2]).toBe(out[1] + 1);
      for (const s of out) expect(s).toBeLessThan(n);
      // No index wraps: every neighbour is -1 or within one of k.
      for (const s of out) if (s >= 0) expect(Math.abs(s - k)).toBeLessThanOrEqual(2);
    }
    for (let k = 0; k < n; k++) {
      segmentSamples(k, n, true, out);
      expect(out[2]).toBe((k + 1) % n);
      for (const s of out) expect(s).toBeGreaterThanOrEqual(0);
    }
  });
});

// Rebuild the per-sample ids a fixture recorded (runs: lane, slot, k0, k1).
function idsFromRuns(runs: number[], count: number): Float32Array {
  const ids = new Float32Array(count * LANES).fill(-1);
  for (let r = 0; r < runs.length; r += 4) {
    for (let k = runs[r + 2]; k <= runs[r + 3]; k++) ids[k * LANES + runs[r]] = runs[r + 1];
  }
  return ids;
}

interface FixtureChain {
  count: number;
  closed: boolean | null;
  total: number;
  wins: number[];
  runs: number[];
}

describe("slot windows and RANGES", () => {
  it("synthetic: lanes, the overflow drop, a split at the seam", () => {
    const count = 20;
    const total = 10; // per = 2 samples per arc unit (closed)
    // Window A centered at arc 0.2 (samples -1..2 padded -> wraps).
    // Window B overlapping A's range -> lane 1. Five more on top -> drops.
    const wins = [
      7, 0.2, 0.5, 0.5,
      8, 0.5, 0.2, 0.2,
      9, 0.5, 0.1, 0.1,
      10, 0.5, 0.1, 0.1,
      11, 0.5, 0.1, 0.1,
      12, 5, 0.3, 0.3,
    ];
    const ids = new Float32Array(count * LANES);
    const acc: number[] = [];
    const dropped = assignWindowLanes(wins, count, true, total, LANES, ids, acc);
    expect(dropped).toBe(1);
    // A: k0 = floor(-0.3 * 2) - 1 = -2, k1 = ceil(0.7 * 2) + 1 = 3.
    expect(acc.slice(0, 4)).toEqual([7, -2, 3, 0]);
    expect(acc.length / 4).toBe(5);
    const out = new Float32Array(maxRangeEntries(5) * RANGE_FLOATS);
    const n = packRanges(acc, count, true, out, 0);
    // A..D start before sample 0 and split at the seam; F does not.
    expect(n).toBe(9);
    const e = (i: number): number[] => Array.from(out.subarray(i * 4, i * 4 + 4));
    // Sorted by kLo (ties in window order); A split into [0, 3] and
    // [18, 19], both flagged.
    expect(e(0)).toEqual([7, 0, 3, RANGE_SPLIT | 0]);
    expect(e(3)).toEqual([10, 0, 3, RANGE_SPLIT | 3]);
    expect(e(4)).toEqual([12, 8, 12, 0]);
    expect(e(5)).toEqual([7, 18, 19, RANGE_SPLIT | 0]);
    expect(e(8)).toEqual([10, 19, 19, RANGE_SPLIT | 3]);
    for (let i = 1; i < n; i++) expect(out[i * 4 + 1]).toBeGreaterThanOrEqual(out[(i - 1) * 4 + 1]);
    const dec = new Float32Array(count * LANES);
    decodeRanges(out, 0, n, count, LANES, dec);
    expect(dec).toEqual(ids);
  });

  it("open chains clamp; a full-lap window covers the ring once", () => {
    const ids = new Float32Array(10 * LANES);
    const acc: number[] = [];
    assignWindowLanes([3, 0.05, 1, 1, 4, 9.9, 1, 1], 10, false, 9, LANES, ids, acc);
    // per = 9 / 9: [floor(-0.95) - 1, ceil(1.05) + 1] -> [0, 3];
    // [floor(8.9) - 1, ceil(10.9) + 1] -> [7, 9].
    expect(acc).toEqual([3, 0, 3, 0, 4, 7, 9, 0]);
    const ids2 = new Float32Array(10 * LANES);
    const acc2: number[] = [];
    assignWindowLanes([5, 3, 6, 6], 10, true, 10, LANES, ids2, acc2);
    expect(acc2).toEqual([5, 0, 9, 0]);
    const out = new Float32Array(8);
    expect(packRanges(acc2, 10, true, out, 0)).toBe(1);
    expect(Array.from(out.subarray(0, 4))).toEqual([5, 0, 9, 0]);
  });

  for (const name of ["daily4", "dense", "fat", "ring", "knot"]) {
    it(`${name}: lanes and RANGES reproduce the renderer's idScratch exactly`, () => {
      const f = JSON.parse(
        readFileSync(new URL(`./fixtures/g3_windows_${name}.json`, import.meta.url), "utf8")
      ) as { dropped: number; chains: FixtureChain[] };
      let dropped = 0;
      let windows = 0;
      let splits = 0;
      let base = 3; // Entries start mid-table, as in the renderer.
      const table = new Float32Array(
        (base + f.chains.reduce((s, c) => s + maxRangeEntries(c.wins.length / 4), 0)) * RANGE_FLOATS
      );
      for (const c of f.chains) {
        const closed = !!c.closed;
        const want = idsFromRuns(c.runs, c.count);
        const ids = new Float32Array(c.count * LANES);
        const acc: number[] = [];
        dropped += assignWindowLanes(c.wins, c.count, closed, c.total, LANES, ids, acc);
        windows += acc.length / 4;
        expect(ids).toEqual(want);
        const n = packRanges(acc, c.count, closed, table, base);
        for (let i = 0; i < n; i++) {
          const o = (base + i) * RANGE_FLOATS;
          expect(table[o + 1]).toBeGreaterThanOrEqual(0);
          expect(table[o + 2]).toBeLessThanOrEqual(c.count - 1);
          expect(table[o + 1]).toBeLessThanOrEqual(table[o + 2]);
          expect(table[o + 3] & RANGE_LANE_MASK).toBeLessThan(LANES);
          if (i > 0) expect(table[o + 1]).toBeGreaterThanOrEqual(table[o - RANGE_FLOATS + 1]);
          if (table[o + 3] & RANGE_SPLIT) splits++;
        }
        const dec = new Float32Array(c.count * LANES);
        decodeRanges(table, base, n, c.count, LANES, dec);
        expect(dec).toEqual(want);
        base += n;
      }
      expect(dropped).toBe(f.dropped);
      expect(windows).toBeGreaterThan(80);
      // Knot mode's rings carry windows across the seam (split halves).
      if (name === "knot") expect(splits).toBeGreaterThan(0);
    });
  }
});

describe("base64 payloads", () => {
  it("round-trips float32 and float64 arrays bit for bit", () => {
    const a = new Float32Array([0, -0, 1.5, NaN, Infinity, 3.4e38, 1e-45]);
    const b = new Float64Array([Math.PI, -1e300, 5e-324, 0.1]);
    expect(bits(b64ToF32(typedToB64(a)))).toEqual(bits(a));
    expect(Array.from(b64ToF64(typedToB64(b)))).toEqual(Array.from(b));
    const big = new Float32Array(70000).map((_, i) => Math.sin(i));
    expect(b64ToF32(typedToB64(big))).toEqual(big);
  });
});
