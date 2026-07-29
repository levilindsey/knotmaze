import { describe, it, expect } from "vitest";
import {
  sampleClosedSpline,
  sampleOpenSpline,
} from "../../src/geometry/spline_generator";

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

describe("sampleOpenSpline", () => {
  // A hexagon; remove the seam after slot 2, so the strand runs slots
  // 3 -> 4 -> 5 -> 0 -> 1 -> 2 with loose ends at slots 3 (arc 0) and 2.
  const hex = [10, 0, 5, 8, -5, 8, -10, 0, -5, -8, 5, -8];
  const brk = 2;

  it("terminates AT the loose-end controls (no wrap across the seam)", () => {
    const s = sampleOpenSpline(hex, 96, brk);
    // First sample sits at the start loose end (slot brk+1 = 3).
    expect(s.positions[0]).toBeCloseTo(hex[3 * 2], 1);
    expect(s.positions[1]).toBeCloseTo(hex[3 * 2 + 1], 1);
    // Last sample sits at the far loose end (slot brk = 2).
    const l = (s.count - 1) * 2;
    expect(s.positions[l]).toBeCloseTo(hex[2 * 2], 1);
    expect(s.positions[l + 1]).toBeCloseTo(hex[2 * 2 + 1], 1);
  });

  it("indexes control arc lengths by slot, monotone along the strand", () => {
    const s = sampleOpenSpline(hex, 96, brk);
    expect(s.controlArcLengths.length).toBe(6);
    // Start loose end at arc 0, far loose end at the full length.
    expect(s.controlArcLengths[3]).toBeCloseTo(0, 5);
    expect(s.controlArcLengths[2]).toBeCloseTo(s.totalLength, 5);
    // Strictly increasing in traversal order 3,4,5,0,1,2.
    const order = [3, 4, 5, 0, 1, 2];
    for (let i = 1; i < order.length; i++) {
      expect(s.controlArcLengths[order[i]]).toBeGreaterThan(
        s.controlArcLengths[order[i - 1]]
      );
    }
  });

  it("is shorter than the closed loop by the removed seam", () => {
    const open = sampleOpenSpline(hex, 96, brk);
    const closed = sampleClosedSpline(hex, 96);
    expect(open.totalLength).toBeLessThan(closed.totalLength);
    // The removed seam (slot 2 -> 3) is one of six roughly-equal sides.
    expect(open.totalLength).toBeGreaterThan(closed.totalLength * 0.6);
  });

  it("produces unit tangents", () => {
    const s = sampleOpenSpline(hex, 48, brk);
    for (let i = 0; i < 48; i++) {
      const len = Math.hypot(s.tangents[i * 2], s.tangents[i * 2 + 1]);
      expect(len).toBeCloseTo(1, 5);
    }
  });

  it("rejects fewer than 3 controls", () => {
    expect(() => sampleOpenSpline([0, 0, 1, 1], 16, 0)).toThrow();
  });
});
