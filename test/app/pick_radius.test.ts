import { describe, expect, it } from "vitest";
import { pickRadiusFor } from "../../src/app/input_pointer";
import { PARAM_DEFAULTS } from "../../src/ui/url_state";

// K331 (Levi, 2026-10-14): touch picks in pixels. A touch at a fixed pixel
// distance past a thread's drawn edge picks the same thing at every zoom,
// for a plain run and for a choice. The old touch radii were world units
// (0.7, and max(0.9, 1.6 x threadWidth) on a choice), so their pixel reach
// grew with the zoom and this test failed on them.
const P = {
  threadWidth: PARAM_DEFAULTS.threadWidth,
  pickMargin: PARAM_DEFAULTS.pickMargin,
  touchPickMargin: PARAM_DEFAULTS.touchPickMargin,
  pickChoiceRatio: PARAM_DEFAULTS.pickChoiceRatio,
};
// CSS px past the ribbon's edge that a pick radius reaches at a view scale.
const pastEdgePx = (radius: number, scale: number): number =>
  (radius - 0.5 * P.threadWidth) * scale;
// Whether a point dPx past the edge (along the thread's normal) is picked.
const picks = (pt: string, choice: boolean, scale: number, dPx: number): boolean =>
  0.5 * P.threadWidth + dPx / scale <= pickRadiusFor(P, scale, pt, choice) + 1e-9;

// The phone's default-zoom scale (K298's notes: the old 0.7 world radius
// reached 3.9 px past the edge there), and 2x / 4x pinch zooms on it.
const BASE = 3.9 / (0.7 - 0.5 * P.threadWidth);
const ZOOMS = [BASE, 2 * BASE, 4 * BASE];

describe("touch pick radius (K331)", () => {
  it("keeps a plain run's touch zone at the touch margin at 1x, 2x and 4x", () => {
    expect(P.touchPickMargin).toBe(4);
    for (const s of ZOOMS) {
      expect(pastEdgePx(pickRadiusFor(P, s, "touch"), s)).toBeCloseTo(4, 9);
      expect(picks("touch", false, s, 3)).toBe(true);
      expect(picks("touch", false, s, 5)).toBe(false);
    }
  });

  it("keeps a choice's touch zone at margin x choice ratio at every zoom", () => {
    for (const s of ZOOMS) {
      expect(pastEdgePx(pickRadiusFor(P, s, "touch", true), s)).toBeCloseTo(6, 9);
      expect(picks("touch", true, s, 5)).toBe(true);
      expect(picks("touch", true, s, 7)).toBe(false);
    }
  });

  it("uses touch's own margin, and leaves mouse and pen on theirs", () => {
    const wide = { ...P, touchPickMargin: 10 };
    for (const s of ZOOMS) {
      expect(pastEdgePx(pickRadiusFor(wide, s, "touch"), s)).toBeCloseTo(10, 9);
      expect(pastEdgePx(pickRadiusFor(wide, s, "touch", true), s)).toBeCloseTo(15, 9);
      expect(pastEdgePx(pickRadiusFor(wide, s, "mouse"), s)).toBeCloseTo(4, 9);
      expect(pastEdgePx(pickRadiusFor(wide, s, "pen"), s)).toBeCloseTo(4, 9);
      expect(pastEdgePx(pickRadiusFor(wide, s, "mouse", true), s)).toBeCloseTo(6, 9);
    }
  });
});
