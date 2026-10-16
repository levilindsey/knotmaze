import { describe, expect, it } from "vitest";
import {
  FINISH_PEEK_HOLD_S,
  FINISH_PEEK_TWEEN_S,
  finishPeekPlan,
} from "../../src/ui/finish_peek";
import type { FinishPeekInput } from "../../src/ui/finish_peek";

// K488: the finish indicator's tap peeks at the exit.
describe("the finish peek plan", () => {
  const exit = { x: 30, y: -12 };
  // 411x753 at the follow span: min(411, 753) / 13.
  const phoneFollow = 411 / 13;
  const base: FinishPeekInput = {
    exit,
    scale: 90,
    followScale: phoneFollow,
    reduced: false,
  };

  it("frames the exit, centered, at the follow scale", () => {
    // The thread-reveal start on a phone: the fit camera sits at its
    // 90 px/world cap on the seen thread, the exit viewports away.
    const p = finishPeekPlan(base);
    expect(p.x).toBe(exit.x);
    expect(p.y).toBe(exit.y);
    expect(p.s).toBeCloseTo(phoneFollow);
  });

  it("eases out, holds about 2.5 s, and eases back", () => {
    const p = finishPeekPlan(base);
    expect(p.dur).toBe(FINISH_PEEK_TWEEN_S);
    expect(p.hold).toBe(FINISH_PEEK_HOLD_S);
    expect(FINISH_PEEK_HOLD_S).toBe(2.5);
    expect(p.backDur).toBe(FINISH_PEEK_TWEEN_S);
  });

  it("never zooms in: a player further out keeps their scale", () => {
    const p = finishPeekPlan({ ...base, scale: phoneFollow / 2 });
    expect(p.s).toBeCloseTo(phoneFollow / 2);
    expect(p.x).toBe(exit.x);
  });

  it("caps a zoomed-in view at the follow scale", () => {
    // 1400x900: min(1400, 900) / 13.
    const p = finishPeekPlan({ ...base, scale: 175, followScale: 900 / 13 });
    expect(p.s).toBeCloseTo(900 / 13);
  });

  it("keeps the scale when already at the follow framing", () => {
    const p = finishPeekPlan({ ...base, scale: phoneFollow });
    expect(p.s).toBeCloseTo(phoneFollow);
  });

  it("jumps under reduced motion but still holds", () => {
    const p = finishPeekPlan({ ...base, reduced: true });
    expect(p.dur).toBe(0);
    expect(p.backDur).toBe(0);
    expect(p.hold).toBe(2.5);
    expect(p.s).toBeCloseTo(phoneFollow);
  });
});
