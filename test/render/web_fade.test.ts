import { describe, expect, it } from "vitest";
import { WEB_FADE_S, WebFade, webFadeLevel } from "../../src/render/web_fade";

// K169: the fully traveled gold web fades in over about 0.25 s. The renderer
// asks this module for the level at its paint clock; these tests pin the
// timing (the frames at 0, about 0.12 and 0.25 s after the web completes),
// the bookkeeping around it, and the cases where nothing may fade.

describe("webFadeLevel (K169)", () => {
  it("is 0 when the web completes, about half-way at 0.12 s and 1 at 0.25 s", () => {
    expect(WEB_FADE_S).toBe(0.25);
    expect(webFadeLevel(0)).toBe(0);
    // 0.12 / 0.25 = 0.48 of the way, eased: smoothstep(0.48) = 0.470016.
    expect(webFadeLevel(0.12)).toBeCloseTo(0.470016, 5);
    expect(webFadeLevel(0.125)).toBeCloseTo(0.5, 6);
    expect(webFadeLevel(0.25)).toBe(1);
    expect(webFadeLevel(5)).toBe(1);
  });

  it("never runs backwards and is clamped to [0, 1]", () => {
    expect(webFadeLevel(-1)).toBe(0);
    expect(webFadeLevel(Number.NaN)).toBe(0);
    let prev = 0;
    for (let i = 0; i <= 300; i++) {
      const lv = webFadeLevel(i / 1000);
      expect(lv).toBeGreaterThanOrEqual(prev);
      expect(lv).toBeLessThanOrEqual(1);
      prev = lv;
    }
    expect(prev).toBe(1);
  });

  it("is a smoothstep: neither end jumps (slope 0 at 0 and at the end)", () => {
    const eps = 1e-4;
    expect(webFadeLevel(eps)).toBeLessThan(1e-4);
    expect(1 - webFadeLevel(WEB_FADE_S - eps)).toBeLessThan(1e-4);
  });

  it("is off (always 1) at a length of 0", () => {
    expect(webFadeLevel(0, 0)).toBe(1);
    expect(webFadeLevel(-3, 0)).toBe(1);
    expect(webFadeLevel(0, -1)).toBe(1);
  });

  it("scales with the length", () => {
    expect(webFadeLevel(0.5, 1)).toBeCloseTo(0.5, 6);
    expect(webFadeLevel(1, 1)).toBe(1);
  });
});

describe("WebFade (K169)", () => {
  it("fades a web that becomes full after the first declaration", () => {
    const f = new WebFade();
    f.retarget(new Set(), 10);
    expect(f.active).toBe(false);
    f.retarget(new Set([4]), 12);
    expect(f.active).toBe(true);
    expect(f.has(4)).toBe(true);
    expect(f.level(4, 12)).toBe(0);
    expect(f.level(4, 12.125)).toBeCloseTo(0.5, 6);
    expect(f.level(4, 12.25)).toBe(1);
    // A web that is not fading is simply at 1.
    expect(f.level(9, 12)).toBe(1);
  });

  it("shows webs that are already full on the first declaration without a fade", () => {
    // A saved attempt restored on load: nothing became full.
    const f = new WebFade();
    f.retarget(new Set([1, 2]), 5);
    expect(f.active).toBe(false);
    expect(f.level(1, 5)).toBe(1);
    // ... and they stay un-faded while they stay full.
    f.retarget(new Set([1, 2]), 6);
    expect(f.active).toBe(false);
  });

  it("does not restart a fade when the same web is declared again", () => {
    const f = new WebFade();
    f.retarget(new Set(), 0);
    f.retarget(new Set([7]), 1);
    f.retarget(new Set([7]), 1.1);
    expect(f.level(7, 1.125)).toBeCloseTo(0.5, 6);
  });

  it("drops a fade when the web stops being full, and fades again when it refills", () => {
    const f = new WebFade();
    f.retarget(new Set(), 0);
    f.retarget(new Set([3]), 1);
    f.retarget(new Set(), 1.05);
    expect(f.active).toBe(false);
    expect(f.has(3)).toBe(false);
    f.retarget(new Set([3]), 2);
    expect(f.level(3, 2)).toBe(0);
    expect(f.level(3, 2.25)).toBe(1);
  });

  it("fades each web on its own clock", () => {
    const f = new WebFade();
    f.retarget(new Set(), 0);
    f.retarget(new Set([1]), 1);
    f.retarget(new Set([1, 2]), 1.1);
    expect(f.level(1, 1.2)).toBeCloseTo(webFadeLevel(0.2), 9);
    expect(f.level(2, 1.2)).toBeCloseTo(webFadeLevel(0.1), 9);
  });

  it("does not fade at all when the length is 0", () => {
    const f = new WebFade();
    f.seconds = 0;
    f.retarget(new Set(), 0);
    f.retarget(new Set([5]), 1);
    expect(f.active).toBe(false);
    expect(f.level(5, 1)).toBe(1);
  });

  it("steps through the frames at 60 fps and finishes, reporting the end once", () => {
    // Desktop and phone alike: the level depends on the clock, not on the
    // viewport, so the frames at 0, ~0.12 and 0.25 s are the same on both.
    const f = new WebFade();
    f.retarget(new Set(), 0);
    f.retarget(new Set([8]), 100);
    const dt = 1 / 60;
    const seen: number[] = [];
    let now = 100;
    for (let frame = 0; frame < 30; frame++) {
      const steps = f.step(now);
      if (steps.length > 0) seen.push(steps[0][1]);
      expect(f.active).toBe(steps.length > 0 && steps[0][1] < 1);
      now += dt;
    }
    expect(seen[0]).toBe(0); // the frame the web completes
    expect(seen[7]).toBeCloseTo(webFadeLevel(7 / 60), 9); // ~0.117 s
    expect(seen[7]).toBeGreaterThan(0.4);
    expect(seen[7]).toBeLessThan(0.5);
    const last = seen[seen.length - 1];
    expect(last).toBe(1); // reached once...
    expect(seen.filter((lv) => lv === 1)).toHaveLength(1); // ...reported once
    expect(seen).toHaveLength(16); // frames 0..15 (0.25 s = 15 frames)
    expect(f.active).toBe(false);
    expect(f.level(8, now)).toBe(1);
  });

  it("holds a pinned clock at its level (probes pin the paint clock)", () => {
    const f = new WebFade();
    f.retarget(new Set(), 100);
    f.retarget(new Set([2]), 100);
    for (let i = 0; i < 5; i++) {
      expect(f.step(100)[0][1]).toBe(0);
      expect(f.active).toBe(true);
    }
    expect(f.step(100.12)[0][1]).toBeCloseTo(0.470016, 5);
    expect(f.step(100.25)[0][1]).toBe(1);
    expect(f.active).toBe(false);
  });

  it("reset forgets everything, including what was already full", () => {
    const f = new WebFade();
    f.retarget(new Set(), 0);
    f.retarget(new Set([1]), 1);
    f.reset();
    expect(f.active).toBe(false);
    f.retarget(new Set([1]), 2);
    expect(f.active).toBe(false); // a new scene's first declaration
  });
});
