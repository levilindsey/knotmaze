// K1291 s1: the app palette's pure parts - where a scene chain's s sits on
// the renderer's arc (chainArcMap) and the packed run map the outline's
// app fill reads (appRunMap).
import { describe, expect, it } from "vitest";
import { RUN_MAP_W, RV_W, SWELL_STRIDE, appRunMap, chainArcMap, revealMaskAt, revealMaskTex, swellStrip } from "../../src/render/outline/paint";

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
describe("swellStrip", () => {
  // One open scene chain on app chain 0: five band samples along x (s = x),
  // z = 0.3; the width mask swells to 2 at x = 5 only.
  const XS = [0, 2.5, 5, 7.5, 10];
  const z = {
    chainTex: new Float32Array(XS.flatMap((x) => [x, 0, x, 0.3])),
    chainInfo: new Float32Array([0, 5, -1, 0]),
  };
  const maps = [{ chain: 0, arcLo: 0, scale: 1 }];
  const h = 1, W = 0.2, zt = 0.5;
  const at = (d: Float32Array, v: number, q: number): number => d[v * SWELL_STRIDE + q];

  it("covers each segment that swells past 1 at h w, its outer W inked until the swell clears h + W", () => {
    const sw = revealMaskTex([{ mask: [1, 1, 2, 1, 1], count: 5, total: 10, closed: false }]);
    const s = swellStrip(sw, z, maps, h, W, zt);
    expect(s.chains).toEqual([{ scene: 0, first: 0, count: 48 }]);
    expect(s.data.length).toBe(48 * SWELL_STRIDE);
    for (let v = 0; v < 48; v++) {
      const x = at(s.data, v, 0); const y = at(s.data, v, 1);
      const hw = h * revealMaskAt(sw, 0, x);
      expect(x).toBeGreaterThanOrEqual(2.5);
      expect(x).toBeLessThanOrEqual(7.5);
      expect(Math.abs(y)).toBeLessThanOrEqual(hw + 1e-6);
      expect(at(s.data, v, 2)).toBeCloseTo(0.3 - (Math.min(Math.abs(y), h) * zt) / h + zt / 50, 5);
      expect(at(s.data, v, 3)).toBe(1);
      expect(at(s.data, v, 5)).toBeCloseTo(0.5 + (0.5 * y) / hw, 5);
      expect(at(s.data, v, 7)).toBe(x);
      // The border fades out as the swell clears today's width-1 casing.
      const e = Math.min(1, Math.max(0, (h + W - hw) / W));
      const ink = at(s.data, v, 4);
      if (ink !== 0) {
        expect(ink).toBeCloseTo(e, 5);
        expect(Math.abs(y)).toBeGreaterThanOrEqual(hw - W - 1e-6);
      }
      if (Math.abs(Math.abs(y) - hw) < 1e-6) expect(ink).toBeCloseTo(e, 5);
    }
    const inks = Array.from({ length: 48 }, (_, v) => [Math.abs(at(s.data, v, 1)), at(s.data, v, 4)]);
    expect(inks.some(([y, k]) => Math.abs(y - 1) < 1e-6 && k === 1)).toBe(true);
    expect(inks.filter(([y]) => Math.abs(y - 2) < 1e-6).every(([, k]) => k === 0)).toBe(true);
    const ys = Array.from({ length: 48 }, (_, v) => at(s.data, v, 1));
    expect(Math.max(...ys)).toBeCloseTo(2, 5);
    expect(Math.min(...ys)).toBeCloseTo(-2, 5);
  });

  it("draws nothing where no sample swells or the chain is fully revealed", () => {
    expect(swellStrip(revealMaskTex([{ mask: [1, 1, 1, 0.5, 0], count: 5, total: 10, closed: false }]), z, maps, h, W, zt).chains).toEqual([]);
    expect(swellStrip(revealMaskTex([null]), z, maps, h, W, zt).data.length).toBe(0);
    expect(swellStrip(revealMaskTex([{ mask: [2, 2, 2, 2, 2], count: 5, total: 10, closed: false }]), z, [undefined], h, W, zt).chains).toEqual([]);
  });

  it("wraps a ring's last segment and maps s through the chain's arc map", () => {
    const ring = {
      chainTex: new Float32Array([0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 2, 0, 0, 1, 3, 0]),
      chainInfo: new Float32Array([0, 4, 4, 0]),
    };
    // App chain 1, its arc = 10 + 2 s (mod 16): s = 0..3 read mask samples
    // 5, 6, 7 and 0 (arc 2 k). Only sample 0 swells, so s = 3 does.
    const mask = Array.from({ length: 8 }, (_, k) => (k === 0 ? 1.5 : 1));
    const sw = revealMaskTex([null, { mask, count: 8, total: 16, closed: true }]);
    const s = swellStrip(sw, ring, [{ chain: 1, arcLo: 10, scale: 2 }], h, W, zt);
    // Segments 2-3 and the wrap 3-0, which alone reaches sample 0 (s = 0).
    expect(s.chains).toEqual([{ scene: 0, first: 0, count: 48 }]);
    expect(Array.from({ length: 48 }, (_, v) => at(s.data, v, 7)).filter((x) => x === 0).length).toBeGreaterThan(0);
  });
});
