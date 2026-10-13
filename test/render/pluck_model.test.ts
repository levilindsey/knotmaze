import { describe, expect, it } from "vitest";
import {
  a1,
  band,
  coverage,
  envelope,
  ghostShape,
  nodeCap,
  peakShape,
  roundTau,
  segmentLobes,
  softMin,
  stringT60,
  sympatheticAmplitude,
  tapAmplitude,
  tri,
  visualTau,
  yInst,
} from "../../src/render/pluck_model";

// The ideal plucked string as a modal sum (Russell): unit height at beta,
// released from rest; phase phi in radians of the fundamental.
const MODES = 200;
const modal = (beta: number, x: number, phi: number): number => {
  let y = 0;
  for (let n = 1; n <= MODES; n++) {
    const An =
      (2 * Math.sin(n * Math.PI * beta)) /
      (n * n * Math.PI * Math.PI * beta * (1 - beta));
    y += An * Math.sin(n * Math.PI * x) * Math.cos(n * phi);
  }
  return y;
};

describe("ideal plucked string", () => {
  it("sweeps the parallelogram: tri_beta above, -tri_(1-beta) below", () => {
    for (const beta of [0.5, 0.3, 0.15]) {
      for (let i = 1; i < 20; i++) {
        const x = i / 20;
        let hi = -Infinity;
        let lo = Infinity;
        for (let s = 0; s < 400; s++) {
          const y = modal(beta, x, (s / 400) * 2 * Math.PI);
          if (y > hi) hi = y;
          if (y < lo) lo = y;
        }
        const env = [0, 0];
        envelope(beta, x, 1, env);
        expect(Math.abs(hi - env[1])).toBeLessThan(0.02);
        expect(Math.abs(lo - env[0])).toBeLessThan(0.02);
        expect(env[1]).toBeCloseTo(tri(beta, x), 12);
        expect(env[0]).toBeCloseTo(-tri(1 - beta, x), 12);
      }
    }
  });

  it("d'Alembert's shape matches the modal sum at every phase", () => {
    for (const beta of [0.5, 0.35]) {
      for (const phi of [0, 0.7, 1.9, Math.PI, 4.1]) {
        for (let i = 1; i < 10; i++) {
          const x = i / 10;
          expect(Math.abs(yInst(beta, x, phi) - modal(beta, x, phi))).toBeLessThan(
            0.02
          );
        }
      }
    }
    // Phase 0 is the plucked triangle; half a period, its inverted mirror.
    expect(yInst(0.3, 0.3, 0)).toBeCloseTo(1, 9);
    expect(yInst(0.3, 0.7, Math.PI)).toBeCloseTo(-1, 9);
  });

  it("the fundamental's amplitude is a1(beta), and the lens is its sine", () => {
    for (const beta of [0.5, 0.3, 0.15]) {
      const A1 = (2 * Math.sin(Math.PI * beta)) / (Math.PI ** 2 * beta * (1 - beta));
      expect(a1(beta)).toBeCloseTo(A1, 12);
      const env = [0, 0];
      envelope(beta, 0.5, 0, env);
      expect(env[1]).toBeCloseTo(A1, 12);
      expect(env[0]).toBeCloseTo(-A1, 12);
      expect(ghostShape(beta, 0.5, 0, 0)).toBeCloseTo(A1, 12);
    }
    expect(a1(0.5)).toBeCloseTo(0.8106, 4);
  });

  it("peak extent bounds every q and the ghost", () => {
    for (const beta of [0.5, 0.3, 0.2]) {
      for (let i = 0; i <= 20; i++) {
        const x = i / 20;
        const pk = peakShape(beta, x, true);
        for (const q of [0, 0.3, 0.7, 1]) {
          const env = [0, 0];
          envelope(beta, x, q, env);
          expect(env[1]).toBeLessThanOrEqual(pk + 1e-12);
          expect(-env[0]).toBeLessThanOrEqual(pk + 1e-12);
          for (const phi of [0, 1, 2, 3, 4, 5]) {
            expect(Math.abs(ghostShape(beta, x, q, phi))).toBeLessThanOrEqual(
              pk + 1e-9
            );
          }
        }
      }
    }
  });
});

describe("time-exposure coverage", () => {
  const integrate = (h: number, lo: number, hi: number, p: number): number => {
    let s = 0;
    const du = 0.0005;
    for (let u = lo - h - 1; u <= hi + h + 1; u += du) {
      s += coverage(u, h, lo, hi, p) * du;
    }
    return s;
  };

  it("conserves ink: the integral across the strip is 2h", () => {
    const h = 0.21;
    for (const [lo, hi] of [
      [0, 0],
      [-0.1, 0.1],
      [-0.42, 0.42],
      [-0.6, 0.3],
      [-0.05, 1.05],
    ]) {
      expect(integrate(h, lo, hi, 0.01)).toBeCloseTo(2 * h, 3);
    }
  });

  it("at zero amplitude it is exactly the anti-aliased thread", () => {
    const h = 0.26;
    for (let u = -0.4; u <= 0.4; u += 0.003) {
      expect(coverage(u, h, 0, 0, 0.02)).toBeCloseTo(band(u, h, 0.02), 9);
    }
  });

  it("matches the arcsine table: A = 2h -> center 1/3, rim 1/2", () => {
    const h = 0.2;
    const A = 2 * h;
    expect(coverage(0, h, -A, A, 1e-4)).toBeCloseTo(1 / 3, 3);
    // The rim sits on the dwell density's sqrt singularity: box-filtered
    // over a 1e-4 pixel it reads ~0.0017 under the point value.
    expect(coverage(h, h, -A, A, 1e-4)).toBeCloseTo(0.5, 2);
    // Under one half-width of swing the core stays opaque.
    expect(coverage(0, h, -0.9 * h, 0.9 * h, 1e-4)).toBeCloseTo(1, 6);
  });
});

describe("decay and amplitude", () => {
  it("decays on the voice's T60 (knot_synth.ts)", () => {
    expect(stringT60(220, 0.5)).toBeCloseTo(4.2, 9);
    expect(stringT60(110, 0.5)).toBeCloseTo(4.2 * Math.SQRT2, 9);
    expect(stringT60(30, 1)).toBe(9); // Clamped like the worklet.
    expect(stringT60(1800, 0)).toBeCloseTo(
      Math.max(0.5, 4.2 * Math.sqrt(220 / 1800) * 0.35),
      9
    );
    expect(visualTau(220, 0.5)).toBeCloseTo((0.8 * 4.2) / 6.91, 9);
    expect(roundTau(0.1)).toBe(0.04);
    expect(roundTau(10)).toBe(0.1);
  });

  it("scales the plucked lobe with its length, clamped to the thread", () => {
    const h = 0.21;
    expect(tapAmplitude(1.3, h, 1, 1)).toBeCloseTo(0.156, 9);
    expect(tapAmplitude(0.2, h, 1, 1)).toBeCloseTo(0.65 * h, 9);
    expect(tapAmplitude(50, h, 1, 1)).toBeCloseTo(2.2 * h, 9);
    expect(tapAmplitude(1.3, h, 2, 0.5)).toBeCloseTo(0.156, 9);
    expect(sympatheticAmplitude(1, 0, 1, 1)).toBe(1);
    expect(sympatheticAmplitude(1, 1, 1, 1)).toBeCloseTo(0.55, 9);
    expect(sympatheticAmplitude(1, -2, 1, 1)).toBeCloseTo(0.44, 9);
    expect(sympatheticAmplitude(1, 1, 0.25, 1)).toBeCloseTo(0.275, 9);
  });

  it("soft nodes: opaque core inside the footprint, opening beyond", () => {
    const h = 0.2;
    expect(nodeCap(h, 0.1, 0.5)).toBeCloseTo(0.18, 9);
    expect(nodeCap(h, 0.7, 0.5)).toBeCloseTo(0.18 + 0.3, 9);
    for (const [a, b] of [
      [0.1, 0.5],
      [0.5, 0.1],
      [0.3, 0.31],
    ]) {
      expect(softMin(a, b, 0.05)).toBeLessThanOrEqual(Math.min(a, b));
    }
    expect(softMin(0.1, 0.5, 0.05)).toBe(0.1);
  });
});

describe("lobe segmentation", () => {
  const spans = (l: ReturnType<typeof segmentLobes>): number[][] =>
    l.map((s) => [+s.s0.toFixed(6), +s.s1.toFixed(6), s.k]);

  it("closed chain: the tapped lobe +- reach, never more than the loop", () => {
    const nodes = [1, 3, 6, 8];
    expect(spans(segmentLobes(nodes, 10, true, 4, 0))).toEqual([[3, 6, 0]]);
    expect(spans(segmentLobes(nodes, 10, true, 4, 2))).toEqual([
      [1, 3, -1],
      [3, 6, 0],
      [6, 8, 1],
      [8, 11, 2],
    ]);
  });

  it("closed chain: lobes across the seam stay in the tap's frame", () => {
    const nodes = [1, 3, 6, 8];
    expect(spans(segmentLobes(nodes, 10, true, 9, 0))).toEqual([[8, 11, 0]]);
    expect(spans(segmentLobes(nodes, 10, true, 0.5, 1))).toEqual([
      [-4, -2, -1],
      [-2, 1, 0],
      [1, 3, 1],
    ]);
  });

  it("open chain: ends are nodes, no wrap", () => {
    const nodes = [0, 2, 5, 9];
    expect(spans(segmentLobes(nodes, 9, false, 6, 1))).toEqual([
      [2, 5, -1],
      [5, 9, 0],
    ]);
    expect(spans(segmentLobes(nodes, 9, false, 0.5, 5))).toEqual([
      [0, 2, 0],
      [2, 5, 1],
      [5, 9, 2],
    ]);
  });

  it("a span (the walk run) bounds the unit, across the seam too", () => {
    const nodes = [1, 3, 6, 8];
    expect(spans(segmentLobes(nodes, 10, true, 4, 6, [3, 8]))).toEqual([
      [3, 6, 0],
      [6, 8, 1],
    ]);
    expect(spans(segmentLobes(nodes, 10, true, 9.5, 6, [8, 13]))).toEqual([
      [8, 11, 0],
      [11, 13, 1],
    ]);
    // The same run handed over in the other frame.
    expect(spans(segmentLobes(nodes, 10, true, 0.5, 6, [8, 13]))).toEqual([
      [-2, 1, 0],
      [1, 3, 1],
    ]);
    // A tap outside the span ignores it.
    expect(spans(segmentLobes(nodes, 10, true, 7, 1, [1, 3]))).toEqual([
      [3, 6, -1],
      [6, 8, 0],
      [8, 11, 1],
    ]);
  });

  it("degenerate loops: one node is one whole-loop lobe, none is a pseudo lobe", () => {
    expect(spans(segmentLobes([4], 10, true, 7, 3))).toEqual([[4, 14, 0]]);
    const pseudo = segmentLobes([], 10, true, 7, 3);
    expect(pseudo).toHaveLength(1);
    expect(pseudo[0].a).toBe(-1);
    expect(pseudo[0].s0).toBeCloseTo(5.5, 9);
    expect(pseudo[0].s1).toBeCloseTo(8.5, 9);
  });
});
