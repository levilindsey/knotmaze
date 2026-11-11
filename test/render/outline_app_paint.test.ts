// K1291 s1: the app palette's pure parts - where a scene chain's s sits on
// the renderer's arc (chainArcMap) and the packed run map the outline's
// app fill reads (appRunMap).
import { describe, expect, it } from "vitest";
import { RUN_MAP_W, RV_W, appRunMap, chainArcMap, revealMaskAt, revealMaskTex } from "../../src/render/outline/paint";

// A straight open polyline of length 10 along x, and a unit square ring.
const LINE = [0, 0, 2.5, 0, 5, 0, 7.5, 0, 10, 0];
const SQUARE = [0, 0, 1, 0, 1, 1, 0, 1];

describe("chainArcMap", () => {
  it("maps an untucked open chain 0..total onto its polyline", () => {
    const m = chainArcMap({ closed: false, totalLength: 20, tucked: [false, false] }, LINE, 0.5);
    expect(m.arcLo).toBe(0);
    expect(m.scale).toBeCloseTo(2, 12);
  });

  it("starts a tucked start at the trim, min(0.75 h, total / 4)", () => {
    const m = chainArcMap({ closed: false, totalLength: 12, tucked: [true, false] }, LINE, 2);
    expect(m.arcLo).toBeCloseTo(1.5, 12);
    expect(m.scale).toBeCloseTo((12 - 1.5) / 10, 12);
    // A short chain: the trim caps at a quarter of the total.
    const s = chainArcMap({ closed: false, totalLength: 4, tucked: [true, true] }, LINE, 2);
    expect(s.arcLo).toBeCloseTo(1, 12);
    expect(s.scale).toBeCloseTo((4 - 1 - 1) / 10, 12);
  });

  it("ends a tucked end at total - trim", () => {
    const m = chainArcMap({ closed: false, totalLength: 10, tucked: [false, true] }, LINE, 1);
    expect(m.arcLo).toBe(0);
    expect(m.scale).toBeCloseTo((10 - 0.75) / 10, 12);
    // s = L lands on total - trim.
    expect(m.arcLo + 10 * m.scale).toBeCloseTo(9.25, 12);
  });

  it("runs a ring 0..total over its closed polyline, tucks ignored", () => {
    const m = chainArcMap({ closed: true, totalLength: 8, tucked: [true, true] }, SQUARE, 1);
    expect(m.arcLo).toBe(0);
    expect(m.scale).toBeCloseTo(2, 12);
  });

  it("gives scale 0 on a degenerate polyline", () => {
    const m = chainArcMap({ closed: false, totalLength: 5, tucked: [false, false] }, [1, 1, 1, 1], 1);
    expect(m.scale).toBe(0);
  });
});

describe("appRunMap", () => {
  it("packs each run's app chain and arc map, -1 where the chain has none", () => {
    const maps = [
      { chain: 7, arcLo: 0.5, scale: 1.25 },
      undefined,
      { chain: 3, arcLo: 0, scale: 2 },
    ];
    const r = appRunMap(Int32Array.from([2, 0, 1, 2]), maps);
    expect(r.w).toBe(RUN_MAP_W);
    expect(r.h).toBe(1);
    expect(r.tex.length).toBe(4 * RUN_MAP_W);
    expect(Array.from(r.tex.subarray(0, 16))).toEqual([3, 0, 2, 2, 7, 0.5, 1.25, 0, -1, 0, 0, 0, 3, 0, 2, 2]);
  });

  it("wraps past RUN_MAP_W runs onto further rows", () => {
    const n = RUN_MAP_W + 5;
    const runChain = new Int32Array(n);
    runChain[n - 1] = 1;
    const r = appRunMap(runChain, [{ chain: 0, arcLo: 0, scale: 1 }, { chain: 9, arcLo: 2, scale: 3 }]);
    expect(r.h).toBe(2);
    const at = 4 * (n - 1);
    expect(Array.from(r.tex.subarray(at, at + 4))).toEqual([9, 2, 3, 1]);
  });

  it("returns one row for no runs", () => {
    const r = appRunMap([], []);
    expect(r.h).toBe(1);
    expect(r.tex.length).toBe(4 * RUN_MAP_W);
  });
});

// K1291 s2: the reveal masks the outline's shaders read (rvMask is this
// function line for line): today's ribbon width multiplier per renderer
// sample, at kSampleArc's arcs, linear between, a ring wrapping.
describe("revealMaskTex / revealMaskAt", () => {
  const ring = { mask: Float32Array.from([0, 0.5, 1, 1]), count: 4, total: 8, closed: true };
  const open = { mask: Float32Array.from([1, 1, 0.25, 0]), count: 4, total: 6, closed: false };
  it("packs headers then samples; a fully revealed chain stores none", () => {
    const t = revealMaskTex([ring, null, open]);
    expect(t.on).toBe(true);
    expect(t.w).toBe(RV_W);
    expect(t.h).toBe(1);
    expect(Array.from(t.tex.subarray(0, 12))).toEqual([12, 4, 8, 1, 0, 0, 0, -1, 16, 4, 6, 0]);
    expect(Array.from(t.tex.subarray(12, 20))).toEqual([0, 0.5, 1, 1, 1, 1, 0.25, 0]);
  });
  it("is off with no mask, and every chain reads 1", () => {
    const t = revealMaskTex([null, { mask: null, count: 9, total: 3, closed: false }]);
    expect(t.on).toBe(false);
    expect(revealMaskAt(t, 0, 1)).toBe(1);
    expect(revealMaskAt(t, 1, 1)).toBe(1);
  });
  it("reads each sample at its arc, k / count * T on a ring, k / (count - 1) * T open", () => {
    const t = revealMaskTex([ring, open]);
    for (let k = 0; k < 4; k++) {
      expect(revealMaskAt(t, 0, (k / 4) * 8)).toBeCloseTo(ring.mask[k], 6);
      expect(revealMaskAt(t, 1, (k / 3) * 6)).toBeCloseTo(open.mask[k], 6);
    }
  });
  it("is linear between samples; a ring wraps past its last sample, an open chain clamps", () => {
    const t = revealMaskTex([ring, open]);
    expect(revealMaskAt(t, 0, 1)).toBeCloseTo(0.25, 6);
    expect(revealMaskAt(t, 0, 7)).toBeCloseTo(0.5, 6);
    expect(revealMaskAt(t, 0, -1)).toBeCloseTo(0.5, 6);
    expect(revealMaskAt(t, 0, 9)).toBeCloseTo(0.25, 6);
    expect(revealMaskAt(t, 1, 5)).toBeCloseTo(0.125, 6);
    expect(revealMaskAt(t, 1, -3)).toBe(1);
    expect(revealMaskAt(t, 1, 99)).toBe(0);
  });
  it("wraps rows past RV_W texels", () => {
    const big = { mask: new Float32Array(RV_W + 10).fill(0.5), count: RV_W + 10, total: 1, closed: false };
    const t = revealMaskTex([big]);
    expect(t.h).toBe(2);
    expect(t.tex.length).toBe(2 * RV_W);
    expect(revealMaskAt(t, 0, 0.5)).toBeCloseTo(0.5, 6);
  });
});

// The per-scene-chain map (appRunMap over 0..n-1) the band's chain reads.
describe("appRunMap as the per-scene-chain map", () => {
  it("gives scene chain i its own app chain and arc map, .w = i", () => {
    const maps = [{ chain: 4, arcLo: 0.25, scale: 2 }, undefined];
    const r = appRunMap([0, 1], maps);
    expect(Array.from(r.tex.subarray(0, 8))).toEqual([4, 0.25, 2, 0, -1, 0, 0, 0]);
  });
});