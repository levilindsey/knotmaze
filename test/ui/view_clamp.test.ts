import { describe, expect, it } from "vitest";
import {
  PAN_SLACK,
  clampFitView,
  panRange,
} from "../../src/ui/view_clamp";
import type { FitView } from "../../src/ui/view_clamp";

// K149: the fit camera's pan clamp with slack.
const W = 1400;
const H = 900;
const MAX = 8;
const view = (zoom: number, panX: number, panY: number): FitView => ({
  zoom,
  panX,
  panY,
});
const clamped = (v: FitView, slack?: number): FitView => {
  clampFitView(v, W, H, MAX, slack);
  return v;
};

describe("pan range", () => {
  it("is the slack either side of home at zoom 1", () => {
    const r = panRange(W, 1);
    expect(r.lo).toBeCloseTo(-PAN_SLACK * W, 9);
    expect(r.hi).toBeCloseTo(PAN_SLACK * W, 9);
  });

  it("keeps the slack at every zoom (the frame's edge may come in by it)", () => {
    for (const z of [1, 1.5, 2, 4, 8]) {
      const r = panRange(W, z);
      // The frame spans [pan, pan + W * z]: at the range's ends its start
      // edge is `slack` of the screen in, and its end edge too.
      expect(r.hi).toBeCloseTo(PAN_SLACK * W, 9);
      expect(r.lo + W * z).toBeCloseTo(W - PAN_SLACK * W, 9);
    }
  });

  it("is the pre-K149 range with no slack", () => {
    for (const z of [1, 2, 8]) {
      const r = panRange(W, z, 0);
      expect(r.hi).toBe(0);
      expect(r.lo).toBeCloseTo(W * (1 - z), 9);
    }
    // A negative slack is no slack, never a smaller frame.
    expect(panRange(W, 2, -0.5)).toEqual(panRange(W, 2, 0));
  });
});

describe("clamping a view", () => {
  it("lets the maze be dragged off at zoom 1, up to the slack", () => {
    const limit = PAN_SLACK * W;
    expect(clamped(view(1, -200, 0)).panX).toBe(-200);
    expect(clamped(view(1, 200, 0)).panX).toBe(200);
    expect(clamped(view(1, -5000, 0)).panX).toBeCloseTo(-limit, 9);
    expect(clamped(view(1, 5000, 0)).panX).toBeCloseTo(limit, 9);
    const vy = PAN_SLACK * H;
    expect(clamped(view(1, 0, -5000)).panY).toBeCloseTo(-vy, 9);
    expect(clamped(view(1, 0, 5000)).panY).toBeCloseTo(vy, 9);
  });

  it("clears the open panel: the slack is more than the panel needs", () => {
    // The desktop panel is 256 px wide at 10 px from the right edge, and a
    // maze that fills the width has a 40 px margin (FIT_MARGIN): it must
    // move left by panel + gap - margin to clear it. The slack covers that
    // down to an 800 px window (below 700 the panel starts closed).
    const panel = 266;
    const margin = 40;
    const gap = 14;
    for (const w of [800, 1000, 1400, 1920]) {
      const v = view(1, -1e6, 0);
      clampFitView(v, w, H, MAX);
      expect(-v.panX).toBeGreaterThanOrEqual(panel + gap - margin);
    }
  });

  it("clamps the zoom to [1, max]", () => {
    expect(clamped(view(0.4, 0, 0)).zoom).toBe(1);
    expect(clamped(view(3, 0, 0)).zoom).toBe(3);
    expect(clamped(view(80, 0, 0)).zoom).toBe(MAX);
  });

  it("clamps the pan against the CLAMPED zoom", () => {
    // A zoom past the max is cut first; its pan range is the max's.
    const v = clamped(view(80, -1e6, 1e6));
    expect(v.zoom).toBe(MAX);
    expect(v.panX).toBeCloseTo(W * (1 - MAX) - PAN_SLACK * W, 9);
    expect(v.panY).toBeCloseTo(PAN_SLACK * H, 9);
  });

  it("leaves a view inside the range alone, and is idempotent", () => {
    const inside = view(2.5, -300, -120);
    expect(clamped({ ...inside })).toEqual(inside);
    const out = view(3, 4000, -9000);
    const once = { ...clamped(out) };
    expect(clamped({ ...once })).toEqual(once);
  });

  it("never lets more than the slack of the screen go empty", () => {
    // Property: after clamping, the zoomed frame covers at least
    // (1 - slack) of the screen on each axis, at any zoom and pan.
    for (let z = 0.5; z <= 10; z += 0.37) {
      for (const px of [-1e5, -3000, -700, -90, 0, 90, 700, 3000, 1e5]) {
        for (const py of [-1e5, -2000, -300, 0, 300, 2000, 1e5]) {
          const v = view(z, px, py);
          clampFitView(v, W, H, MAX);
          const covX = Math.min(W, v.panX + W * v.zoom) - Math.max(0, v.panX);
          const covY = Math.min(H, v.panY + H * v.zoom) - Math.max(0, v.panY);
          expect(covX).toBeGreaterThanOrEqual((1 - PAN_SLACK) * W - 1e-6);
          expect(covY).toBeGreaterThanOrEqual((1 - PAN_SLACK) * H - 1e-6);
        }
      }
    }
  });

  it("with no slack is exactly the old clamp (the frame covers the screen)", () => {
    for (let z = 0.5; z <= 10; z += 0.41) {
      for (const px of [-1e5, -800, -3, 0, 3, 800, 1e5]) {
        const v = view(z, px, px);
        clampFitView(v, W, H, MAX, 0);
        const zc = Math.min(MAX, Math.max(1, z));
        expect(v.zoom).toBe(zc);
        expect(v.panX).toBe(Math.min(0, Math.max(W * (1 - zc), px)));
        expect(v.panY).toBe(Math.min(0, Math.max(H * (1 - zc), px)));
      }
    }
  });
});
