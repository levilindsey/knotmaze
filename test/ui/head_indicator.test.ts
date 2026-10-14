import { describe, expect, it } from "vitest";
import {
  HEAD_RETURN_S,
  headIndicatorWhy,
  headReturnPlan,
} from "../../src/ui/head_indicator";
import type { HeadReturnInput } from "../../src/ui/head_indicator";
import {
  EDGE_MARGIN,
  layoutIndicators,
  offscreen,
} from "../../src/ui/offscreen_indicators";

// K148: the player's off-screen indicator.
describe("when the head's indicator may show", () => {
  const scene = { mazeFabric: true, built: true, shown: true };

  it("shows in any built maze: no solved, intro or fog condition", () => {
    expect(headIndicatorWhy(scene)).toBe("");
  });

  it("hides in knot mode and before the maze is built", () => {
    expect(headIndicatorWhy({ ...scene, mazeFabric: false })).toBe("no maze");
    expect(headIndicatorWhy({ ...scene, built: false })).toBe("no maze");
    // Both at once: there is no maze either way.
    expect(headIndicatorWhy({ mazeFabric: false, built: false, shown: false })).toBe("no maze");
  });

  it("hides while the load settle keeps the world off screen", () => {
    expect(headIndicatorWhy({ ...scene, shown: false })).toBe("loading");
  });
});

describe("when the head is off screen (the shared off-screen test)", () => {
  const VW = 1400;
  const VH = 900;
  const R = 17; // The head marker's screen radius at the home view.

  it("shows once its whole disc is past the margin, and not before", () => {
    const m = R + EDGE_MARGIN;
    expect(offscreen({ x: 700, y: 450 }, R, VW, VH, false)).toBe(false);
    expect(offscreen({ x: m, y: 450 }, R, VW, VH, false)).toBe(false);
    expect(offscreen({ x: m - 1, y: 450 }, R, VW, VH, false)).toBe(true);
    expect(offscreen({ x: VW + 300, y: -80 }, R, VW, VH, false)).toBe(true);
  });

  it("sits at the edge toward the head and aims at it", () => {
    const out = layoutIndicators(
      [{ id: "head", at: { x: -400, y: 450 }, radius: R, shown: false }],
      VW,
      VH,
      { left: 0, top: 0, right: 0, bottom: 0 },
      []
    );
    const p = out.get("head")!;
    expect(p.x).toBeLessThan(40);
    expect(p.y).toBeCloseTo(450, 6);
    // Straight left: pi.
    expect(Math.abs(Math.abs(p.angle) - Math.PI)).toBeLessThan(1e-9);
  });

  it("keeps clear of the finish's indicator when both point the same way", () => {
    const out = layoutIndicators(
      [
        { id: "finish", at: { x: -900, y: 440 }, radius: R, shown: false },
        { id: "head", at: { x: -400, y: 450 }, radius: R, shown: false },
      ],
      VW,
      VH,
      { left: 0, top: 0, right: 0, bottom: 0 },
      []
    );
    const a = out.get("finish")!;
    const b = out.get("head")!;
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(56 - 1e-6);
  });
});

describe("what a tap on it does", () => {
  const base: HeadReturnInput = {
    follow: false,
    head: { x: 31.5, y: -8.25 },
    scale: 22,
    followScale: 70,
    intro: false,
    reduced: false,
    followSettle: 2.2,
  };

  it("fit camera: centers the head at the zoom the player is at", () => {
    const p = headReturnPlan(base);
    expect(p).toMatchObject({
      tween: true,
      x: 31.5,
      y: -8.25,
      s: 22,
      dur: HEAD_RETURN_S,
      resume: false,
    });
  });

  it("follow camera: lands on the follow framing and resumes the follow at once", () => {
    const p = headReturnPlan({ ...base, follow: true });
    expect(p).toMatchObject({ tween: true, x: 31.5, y: -8.25, s: 70, resume: false });
    // The spring is back at full strength the moment the tween ends: its
    // hold is minus the idle time that ramps it to full.
    expect(p.hold).toBe(-2.2);
  });

  it("follow camera during the intro: no tween, the spring just pulls", () => {
    const p = headReturnPlan({ ...base, follow: true, intro: true });
    expect(p.tween).toBe(false);
    expect(p.resume).toBe(true);
    // The intro does not change the fit camera's plan.
    expect(headReturnPlan({ ...base, intro: true }).tween).toBe(true);
  });

  it("reduced motion jumps (a zero-length tween) in both cameras", () => {
    expect(headReturnPlan({ ...base, reduced: true }).dur).toBe(0);
    expect(headReturnPlan({ ...base, follow: true, reduced: true }).dur).toBe(0);
  });
});
