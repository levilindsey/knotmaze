import { describe, expect, it } from "vitest";
import {
  gridAlignSlider,
  gridAlignStrength,
} from "../../src/ui/grid_align_curve";

describe("gridAlign slider curve", () => {
  it("maps the endpoints exactly (0 = off, 1 = full strength)", () => {
    expect(gridAlignStrength(0)).toBe(0);
    expect(gridAlignStrength(1)).toBe(1);
    expect(gridAlignSlider(0)).toBe(0);
    expect(gridAlignSlider(1)).toBe(1);
  });

  it("clamps out-of-range and non-finite input", () => {
    expect(gridAlignStrength(-0.5)).toBe(0);
    expect(gridAlignStrength(1.5)).toBe(1);
    expect(gridAlignStrength(Number.NaN)).toBe(0);
    expect(gridAlignSlider(-0.5)).toBe(0);
    expect(gridAlignSlider(1.5)).toBe(1);
    expect(gridAlignSlider(Number.NaN)).toBe(0);
  });

  it("the two directions are inverses", () => {
    for (let i = 0; i <= 1000; i++) {
      const x = i / 1000;
      expect(Math.abs(gridAlignSlider(gridAlignStrength(x)) - x)).toBeLessThan(1e-12);
    }
    // Arbitrary strengths across six decades come back to 12 significant
    // digits (the snap).
    for (let e = -6; e <= 0; e += 0.05) {
      const s = 10 ** e;
      const back = gridAlignStrength(gridAlignSlider(s));
      expect(Math.abs(back - s)).toBeLessThanOrEqual(1e-11 * s);
    }
  });

  it("returns decimal strengths bit-exactly through the slider", () => {
    // The default, the ring URL, URL strengths (rounded to 6 places).
    for (const s of [0.1, 0.2, 0.05, 0.5, 0.002933, 0.000978, 0.123456, 1e-4]) {
      expect(gridAlignStrength(gridAlignSlider(s))).toBe(s);
    }
    for (let i = 1; i < 1000000; i += 997) {
      const s = i / 1000000;
      expect(gridAlignStrength(gridAlignSlider(s))).toBe(s);
    }
  });

  it("is strictly increasing", () => {
    let prev = -1;
    for (let i = 0; i <= 1000; i++) {
      const s = gridAlignStrength(i / 1000);
      expect(s).toBeGreaterThan(prev);
      prev = s;
    }
  });

  it("doubles the strength every tenth of the slider: (2^(10x) - 1) / 1023", () => {
    for (let i = 0; i <= 10; i++) {
      expect(gridAlignStrength(i / 10)).toBeCloseTo((2 ** i - 1) / 1023, 12);
    }
  });

  it("places today's strengths where the panel will show them", () => {
    // The default strength (0.1) and the user's ring URL (ga=0.2).
    expect(gridAlignSlider(0.1)).toBeCloseTo(0.669, 3);
    expect(gridAlignSlider(0.2)).toBeCloseTo(0.768, 3);
  });
});
