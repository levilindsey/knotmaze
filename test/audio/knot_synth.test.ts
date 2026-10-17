import { describe, expect, it } from "vitest";
import { clampPan } from "../../src/audio/knot_synth";

// K526: the pan control's clamp - a StereoPanner value in [-1, 1];
// garbage pans center.
describe("clampPan (K526)", () => {
  it("clamps to [-1, 1] and centers garbage", () => {
    expect(clampPan(-2)).toBe(-1);
    expect(clampPan(-0.25)).toBe(-0.25);
    expect(clampPan(0)).toBe(0);
    expect(clampPan(0.75)).toBe(0.75);
    expect(clampPan(3)).toBe(1);
    expect(clampPan(NaN)).toBe(0);
    expect(clampPan(Infinity)).toBe(0);
  });
});
