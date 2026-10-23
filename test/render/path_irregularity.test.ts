import { describe, expect, it } from "vitest";
import {
  PATH_IRREGULARITY_DEFAULT,
  PATH_IRREGULARITY_MAX_MULT,
  excursionCap,
  excursionGate,
  excursionSwell,
  fillExcursion,
  fillIrregularityExcess,
  softKnee,
  yarnIrregularityMult,
} from "../../src/render/path_irregularity";

// K835: the two sliders' anchors — 0 lies on the thread, the defaults
// reproduce the pre-slider string and fills exactly, excursion is
// gated shut at exactly zero irregularity.
describe("K835 path irregularity scale", () => {
  it("anchors the yarn multiplier", () => {
    expect(yarnIrregularityMult(0)).toBe(0);
    expect(yarnIrregularityMult(PATH_IRREGULARITY_DEFAULT)).toBe(1);
    expect(yarnIrregularityMult(1)).toBe(PATH_IRREGULARITY_MAX_MULT);
    expect(PATH_IRREGULARITY_MAX_MULT).toBeGreaterThan(2);
  });

  it("keeps the fills at today's look until past the default", () => {
    expect(fillIrregularityExcess(0)).toBe(0);
    expect(fillIrregularityExcess(PATH_IRREGULARITY_DEFAULT)).toBe(0);
    expect(fillIrregularityExcess(1)).toBe(1);
    const mid = fillIrregularityExcess(0.7);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });

  it("gates the excursion shut at exactly zero irregularity", () => {
    expect(excursionGate(0)).toBe(0);
    expect(excursionGate(-0.5)).toBe(0);
    expect(fillExcursion(1, 0)).toBe(0);
    expect(excursionSwell(1, 0)).toBe(0);
    // A little irregularity unlocks most of the swell; by 0.3 it is open.
    expect(excursionGate(0.075)).toBeCloseTo(0.5);
    expect(excursionGate(0.3)).toBe(1);
    expect(excursionGate(1)).toBe(1);
    expect(fillExcursion(1, PATH_IRREGULARITY_DEFAULT)).toBe(1);
    expect(excursionSwell(0.5, 1)).toBe(1);
  });

  it("caps the offset past the pre-slider maximum only when asked", () => {
    expect(excursionCap(0)).toBeCloseTo(0.9);
    expect(excursionCap(1)).toBeCloseTo(2.5);
    // Identity inside the cap, quarter overshoot past it, odd-symmetric.
    expect(softKnee(0.85, excursionCap(0))).toBe(0.85);
    expect(softKnee(-0.85, excursionCap(0))).toBe(-0.85);
    expect(softKnee(1.3, 0.9)).toBeCloseTo(1.0);
    expect(softKnee(-1.3, 0.9)).toBeCloseTo(-1.0);
    expect(softKnee(0, 0.9)).toBe(0);
  });

  it("is monotonic in the sliders", () => {
    let prev = -1;
    for (let v = 0; v <= 1.0001; v += 0.05) {
      const s = Math.min(v, 1);
      expect(yarnIrregularityMult(s)).toBeGreaterThanOrEqual(prev);
      expect(excursionGate(s)).toBeGreaterThanOrEqual(
        s === 0 ? 0 : excursionGate(s - 0.05)
      );
      prev = yarnIrregularityMult(s);
    }
  });
});
