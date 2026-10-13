// G2 shader paint: the CPU mirror (src/render/paint_math.ts) against the
// frozen pre-G2 pipeline (fixtures/pre_g2.ts). The mirror is the census
// reference for the GPU, so it must reproduce the old CPU math exactly (f64)
// wherever no deviation is documented in docs/design/G2_shader_paint.md.

import { describe, expect, it } from "vitest";
import {
  kArcOfCtrl,
  kArcU,
  kChain,
  kCtrlNear,
  kCtrlOfArc,
  writeChainHeader,
  writeGeomTable,
  type KData,
} from "../../src/render/paint_math";
import {
  arcAt,
  bakeSampleCtrls,
  paintArcAt,
  type FrozenSamples,
} from "./fixtures/pre_g2";
import { randomChain } from "./fixtures/chains";

// Deterministic LCG.
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296);
}

// Lay chains out exactly as PaintScene does (CHAINS at 0, KGEOM packed).
export function layout(chains: FrozenSamples[]): KData {
  const stat = new Float32Array(chains.length * 8 + 64);
  let g = 0;
  const bases: number[] = [];
  for (const c of chains) {
    bases.push(g);
    g += 1 + Math.ceil(c.controlArcLengths.length / 4);
  }
  const geom = new Float32Array(g * 4 + 16);
  chains.forEach((c, ch) => {
    writeChainHeader(stat, ch, {
      nCtrl: c.controlArcLengths.length,
      closed: c.closed,
      count: c.count,
      idxBase: 0,
      geomBase: bases[ch],
      srcFirst: 0,
      srcCount: 0,
      paintBase: 0,
    });
    writeGeomTable(
      geom,
      bases[ch],
      c.totalLength,
      c.count,
      c.closed,
      c.controlArcLengths
    );
  });
  return { stat, geom, paint: new Float32Array(16) };
}

describe("paint mirror geometry (G2.0)", () => {
  const r = rng(20261012);
  const chains: FrozenSamples[] = [];
  for (let i = 0; i < 24; i++) {
    chains.push(randomChain(r, 8 + Math.floor(r() * 500), i % 2 === 0));
  }
  const D = layout(chains);

  it("kArcOfCtrl == paintArcAt (closed: arcAt) on random tables", () => {
    chains.forEach((s, ch) => {
      const c = kChain(D, ch);
      const n = s.controlArcLengths.length;
      for (let k = 0; k < 400; k++) {
        // Closed: any unwrapped ctrl; open: [-0.5, n - 0.5] incl. the
        // negative-arc extrapolation below ctrl 0.
        const x = s.closed ? (r() * 3 - 1) * n : r() * n - 0.5;
        const want = paintArcAt(s, x, s.closed);
        expect(kArcOfCtrl(D, c, x)).toBeCloseTo(want, 9);
        if (s.closed) expect(arcAt(s, x)).toBeCloseTo(want, 12);
      }
    });
  });

  it("kArcU is monotone and wraps by one total per lap", () => {
    chains.forEach((s, ch) => {
      if (!s.closed) return;
      const c = kChain(D, ch);
      const n = s.controlArcLengths.length;
      let prev = -Infinity;
      for (let x = -n; x <= 2 * n; x += 0.37) {
        const a = kArcU(D, c, x);
        expect(a).toBeGreaterThanOrEqual(prev - 1e-9);
        prev = a;
        expect(kArcU(D, c, x + n)).toBeCloseTo(a + s.totalLength, 6);
      }
    });
  });

  it("kCtrlOfArc reproduces the bake's per-sample ctrl exactly", () => {
    chains.forEach((s, ch) => {
      const c = kChain(D, ch);
      const want = bakeSampleCtrls(s);
      for (let k = 0; k < s.count; k++) {
        const a = s.closed
          ? (k / s.count) * s.totalLength
          : (k / (s.count - 1)) * s.totalLength;
        expect(kCtrlOfArc(D, c, a)).toBeCloseTo(want[k], 9);
      }
    });
  });

  it("kCtrlNear converges to kCtrlOfArc from approximations within 2 slots", () => {
    chains.forEach((s, ch) => {
      const c = kChain(D, ch);
      const n = s.controlArcLengths.length;
      for (let k = 0; k < 300; k++) {
        const a = r() * s.totalLength * (s.closed ? 0.999999 : 1);
        const exact = kCtrlOfArc(D, c, a);
        let approx = exact + (r() * 4 - 2);
        if (!s.closed) approx = Math.max(0, Math.min(n - 1, approx));
        const got = kCtrlNear(D, c, a, approx);
        // Ring distance (closed) / plain (open).
        let d = Math.abs(got - exact);
        if (s.closed) d = Math.min(d, n - d);
        expect(d).toBeLessThan(1e-9);
      }
    });
  });

  it("arc -> ctrl -> arc round-trips", () => {
    chains.forEach((s, ch) => {
      const c = kChain(D, ch);
      for (let k = 0; k < 200; k++) {
        const a = r() * s.totalLength * (s.closed ? 0.999999 : 1);
        expect(kArcOfCtrl(D, c, kCtrlOfArc(D, c, a))).toBeCloseTo(a, 9);
      }
    });
  });
});
