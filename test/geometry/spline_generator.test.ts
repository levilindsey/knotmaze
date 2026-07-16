import { describe, it, expect } from "vitest";
import { sampleClosedSpline } from "../../src/geometry/spline_generator";

describe("sampleClosedSpline", () => {
  const square = [0, 0, 10, 0, 10, 10, 0, 10];

  it("samples uniformly by arc length", () => {
    const samples = sampleClosedSpline(square, 64);
    expect(samples.count).toBe(64);

    const gaps: number[] = [];
    for (let i = 0; i < 64; i++) {
      const j = (i + 1) % 64;
      gaps.push(
        Math.hypot(
          samples.positions[j * 2] - samples.positions[i * 2],
          samples.positions[j * 2 + 1] - samples.positions[i * 2 + 1]
        )
      );
    }
    const mean = gaps.reduce((a, b) => a + b) / gaps.length;
    for (const gap of gaps) {
      expect(Math.abs(gap - mean) / mean).toBeLessThan(0.2);
    }
  });

  it("passes near control points and reports their arc positions", () => {
    const samples = sampleClosedSpline(square, 128);
    expect(samples.controlArcLengths.length).toBe(4);

    for (let c = 0; c < 4; c++) {
      expect(samples.controlArcLengths[c]).toBeLessThan(samples.totalLength);
      if (c > 0) {
        expect(samples.controlArcLengths[c]).toBeGreaterThan(
          samples.controlArcLengths[c - 1]
        );
      }

      // The sample nearest the control's arc position sits close to it.
      const idx =
        Math.round(
          (samples.controlArcLengths[c] / samples.totalLength) * samples.count
        ) % samples.count;
      const dx = samples.positions[idx * 2] - square[c * 2];
      const dy = samples.positions[idx * 2 + 1] - square[c * 2 + 1];
      expect(Math.hypot(dx, dy)).toBeLessThan(0.5);
    }
  });

  it("produces unit tangents", () => {
    const samples = sampleClosedSpline(square, 32);
    for (let i = 0; i < 32; i++) {
      const len = Math.hypot(samples.tangents[i * 2], samples.tangents[i * 2 + 1]);
      expect(len).toBeCloseTo(1, 5);
    }
  });

  it("rejects fewer than 3 controls", () => {
    expect(() => sampleClosedSpline([0, 0, 1, 1], 16)).toThrow();
  });
});
