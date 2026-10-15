import { describe, expect, it } from "vitest";
import { WEB_FADE_S, WebFade, webFadeLevel } from "../../src/render/web_fade";

// K169: the fully traveled gold web fades in over about 0.25 s; K191: it fades
// out the same way when it stops being fully traveled. The renderer asks this
// module for the level at its paint clock; these tests pin the timing (the
// frames at 0, about 0.12 and 0.25 s after the web completes or stops being
// complete), the bookkeeping around it, the reversals mid-fade, and the cases
// where nothing may fade.

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
    // A web that is not fading is settled: 1 if it is full, else 0.
    f.step(13);
    expect(f.level(4, 13)).toBe(1);
    expect(f.level(9, 13)).toBe(0);
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

  it("turns a web that stops being full around, and fades again when it refills", () => {
    // (K169 dropped the fade here, K191 fades the web out from its level.)
    const f = new WebFade();
    f.retarget(new Set(), 0);
    f.retarget(new Set([3]), 1);
    f.retarget(new Set(), 1.125); // half-way in, level 0.5
    expect(f.active).toBe(true);
    expect(f.has(3)).toBe(true);
    expect(f.level(3, 1.125)).toBeCloseTo(0.5, 6);
    f.step(2); // the fade-out ends
    expect(f.active).toBe(false);
    expect(f.has(3)).toBe(false);
    expect(f.level(3, 2)).toBe(0);
    f.retarget(new Set([3]), 3);
    expect(f.level(3, 3)).toBe(0);
    expect(f.level(3, 3.25)).toBe(1);
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
    // ... nor out.
    f.retarget(new Set(), 2);
    expect(f.active).toBe(false);
    expect(f.level(5, 2)).toBe(0);
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

describe("WebFade fade-out (K191)", () => {
  // A web that became full at clock 1 and finished its fade-in.
  function settledFull(ji = 3): WebFade {
    const f = new WebFade();
    f.retarget(new Set(), 0);
    f.retarget(new Set([ji]), 1);
    f.step(1.25);
    expect(f.active).toBe(false);
    expect(f.level(ji, 1.25)).toBe(1);
    return f;
  }

  it("fades a web out over 0.25 s: 1 at once, 0.530 at 0.12 s, 0 at 0.25 s", () => {
    const f = settledFull();
    f.retarget(new Set(), 5);
    expect(f.active).toBe(true);
    expect(f.has(3)).toBe(true);
    expect(f.level(3, 5)).toBe(1);
    expect(f.level(3, 5.12)).toBeCloseTo(0.529984, 5);
    expect(f.level(3, 5.125)).toBeCloseTo(0.5, 6);
    expect(f.level(3, 5.25)).toBe(0);
    expect(f.level(3, 5.4)).toBe(0);
  });

  it("is the fade-in run backwards: the two levels add up to 1 at every frame", () => {
    const f = settledFull(1);
    const g = new WebFade();
    g.retarget(new Set(), 0);
    g.retarget(new Set([1]), 5);
    f.retarget(new Set(), 5);
    for (let i = 0; i <= 25; i++) {
      const t = 5 + i / 100;
      expect(f.level(1, t) + g.level(1, t)).toBeCloseTo(1, 12);
    }
  });

  it("eases like the fade-in: neither end jumps, it never runs forwards", () => {
    const f = settledFull();
    f.retarget(new Set(), 5);
    let prev = 1;
    for (let i = 0; i <= 250; i++) {
      const lv = f.level(3, 5 + i / 1000);
      expect(lv).toBeLessThanOrEqual(prev + 1e-12);
      expect(lv).toBeGreaterThanOrEqual(0);
      prev = lv;
    }
    expect(prev).toBe(0);
    expect(1 - f.level(3, 5 + 1e-4)).toBeLessThan(1e-4);
    expect(f.level(3, 5.25 - 1e-4)).toBeLessThan(1e-4);
  });

  it("does not restart a fade-out when the same web is declared again", () => {
    const f = settledFull(7);
    f.retarget(new Set(), 5);
    f.retarget(new Set(), 5.1);
    expect(f.level(7, 5.125)).toBeCloseTo(0.5, 6);
  });

  it("steps through the frames at 60 fps, ends at 0 and reports the end once", () => {
    // Desktop and phone alike: the level depends on the clock only.
    const f = settledFull(8);
    f.retarget(new Set(), 100);
    const dt = 1 / 60;
    const seen: number[] = [];
    let now = 100;
    for (let frame = 0; frame < 30; frame++) {
      const steps = f.step(now);
      if (steps.length > 0) seen.push(steps[0][1]);
      expect(f.active).toBe(steps.length > 0 && steps[0][1] > 0);
      now += dt;
    }
    expect(seen[0]).toBe(1); // the frame the web stops being full
    expect(seen[7]).toBeCloseTo(1 - webFadeLevel(7 / 60), 9); // ~0.117 s
    expect(seen[7]).toBeGreaterThan(0.5);
    expect(seen[7]).toBeLessThan(0.6);
    expect(seen[seen.length - 1]).toBe(0); // reached once...
    expect(seen.filter((lv) => lv === 0)).toHaveLength(1); // ...reported once
    expect(seen).toHaveLength(16); // frames 0..15 (0.25 s = 15 frames)
    expect(f.active).toBe(false);
    expect(f.level(8, now)).toBe(0);
  });

  it("holds a pinned clock at its level (probes pin the paint clock)", () => {
    const f = settledFull(2);
    f.retarget(new Set(), 100);
    for (let i = 0; i < 5; i++) {
      expect(f.step(100)[0][1]).toBe(1);
      expect(f.active).toBe(true);
    }
    expect(f.step(100.12)[0][1]).toBeCloseTo(0.529984, 5);
    expect(f.step(100.25)[0][1]).toBe(0);
    expect(f.active).toBe(false);
  });

  it("goes quiet once every fade has ended", () => {
    const f = new WebFade();
    f.retarget(new Set(), 0);
    f.retarget(new Set([1, 2]), 1);
    f.step(1.25);
    f.retarget(new Set([1]), 2); // 2 out
    f.retarget(new Set([1, 3]), 2.1); // 3 in while 2 is still going out
    expect(f.active).toBe(true);
    f.step(2.25); // 2 is done, 3 is not
    expect(f.active).toBe(true);
    expect(f.has(2)).toBe(false);
    expect(f.has(3)).toBe(true);
    f.step(2.36);
    expect(f.active).toBe(false);
    expect([1, 2, 3].map((ji) => f.level(ji, 3))).toEqual([1, 0, 1]);
  });

  it("fades the webs out and in on their own clocks", () => {
    // A backtrack: the old head's web leaves full at the tap, the new head's
    // when the move ends.
    const f = new WebFade();
    f.retarget(new Set(), 0);
    f.retarget(new Set([1, 2]), 1);
    f.step(1.25);
    f.retarget(new Set([2]), 5); // 1 leaves
    f.retarget(new Set(), 5.1); // 2 leaves
    expect(f.level(1, 5.2)).toBeCloseTo(1 - webFadeLevel(0.2), 9);
    expect(f.level(2, 5.2)).toBeCloseTo(1 - webFadeLevel(0.1), 9);
  });

  it("turns a fade-out around without a jump when the web is full again", () => {
    const f = settledFull();
    f.retarget(new Set(), 5);
    const before = f.level(3, 5.1); // 0.4 of the way, level 0.648
    expect(before).toBeCloseTo(1 - webFadeLevel(0.1), 9);
    f.retarget(new Set([3]), 5.1);
    expect(f.active).toBe(true);
    expect(f.level(3, 5.1)).toBeCloseTo(before, 12); // no jump
    // ... and it climbs back to 1 over the full length, never backwards.
    let prev = f.level(3, 5.1);
    for (let i = 1; i <= 250; i++) {
      const lv = f.level(3, 5.1 + i / 1000);
      expect(lv).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = lv;
    }
    expect(prev).toBe(1);
    expect(f.level(3, 5.1 + 0.125)).toBeGreaterThan(before);
    expect(f.step(5.1 + 0.25)[0][1]).toBe(1);
    expect(f.active).toBe(false);
    expect(f.level(3, 9)).toBe(1);
  });

  it("turns a fade-in around without a jump when the web stops being full", () => {
    const f = new WebFade();
    f.retarget(new Set(), 0);
    f.retarget(new Set([3]), 1);
    const before = f.level(3, 1.1); // 0.4 of the way, level 0.352
    expect(before).toBeCloseTo(webFadeLevel(0.1), 9);
    f.retarget(new Set(), 1.1);
    expect(f.active).toBe(true);
    expect(f.level(3, 1.1)).toBeCloseTo(before, 12); // no jump
    let prev = f.level(3, 1.1);
    for (let i = 1; i <= 250; i++) {
      const lv = f.level(3, 1.1 + i / 1000);
      expect(lv).toBeLessThanOrEqual(prev + 1e-12);
      prev = lv;
    }
    expect(prev).toBe(0);
    expect(f.step(1.1 + 0.25)[0][1]).toBe(0);
    expect(f.active).toBe(false);
    expect(f.level(3, 9)).toBe(0);
  });

  it("leaves nothing fading when a web turns around in the same instant", () => {
    const f = settledFull();
    f.retarget(new Set(), 5);
    f.retarget(new Set([3]), 5); // still at level 1: nothing to fade
    expect(f.active).toBe(false);
    expect(f.level(3, 5)).toBe(1);
    // ... and a fade-in turned around at its first instant.
    const g = new WebFade();
    g.retarget(new Set(), 0);
    g.retarget(new Set([3]), 1);
    g.retarget(new Set(), 1);
    expect(g.active).toBe(false);
    expect(g.level(3, 1)).toBe(0);
  });

  it("can turn around more than once, each time from where it is", () => {
    const f = settledFull();
    f.retarget(new Set(), 5);
    const a = f.level(3, 5.05);
    f.retarget(new Set([3]), 5.05);
    expect(f.level(3, 5.05)).toBeCloseTo(a, 12);
    const b = f.level(3, 5.12);
    f.retarget(new Set(), 5.12);
    expect(f.level(3, 5.12)).toBeCloseTo(b, 12);
    expect(f.level(3, 5.12 + 0.25)).toBe(0);
  });

  it("fades a restored web out too: only its first declaration is exempt", () => {
    const f = new WebFade();
    f.retarget(new Set([1, 2]), 5); // restored on load, no fade
    expect(f.active).toBe(false);
    expect(f.level(1, 5)).toBe(1);
    f.retarget(new Set([2]), 6); // the player backs out of 1
    expect(f.active).toBe(true);
    expect(f.level(1, 6)).toBe(1);
    expect(f.level(1, 6.25)).toBe(0);
    expect(f.level(2, 6.1)).toBe(1); // ... and 2 stays full
  });

  it("does not fade a web out that is no longer routed (nothing to blend)", () => {
    // A reset, a string-mode switch or the trail's end takes the junction
    // out of the routes with the gold: the shader cannot blend an unrouted
    // record, and the arms have no gold left to show.
    const f = settledFull();
    f.retarget(new Set(), 5, new Set()); // not routed any more
    expect(f.active).toBe(false);
    expect(f.has(3)).toBe(false);
    expect(f.level(3, 5)).toBe(0);
    // Still routed (a backtrack): it fades.
    const g = settledFull();
    g.retarget(new Set(), 5, new Set([3]));
    expect(g.active).toBe(true);
    expect(g.level(3, 5.125)).toBeCloseTo(0.5, 6);
  });

  it("ends a running fade-out when its junction stops being routed", () => {
    const f = settledFull();
    f.retarget(new Set(), 5, new Set([3]));
    f.retarget(new Set(), 5.1, new Set()); // a second backtrack drops its last pass
    expect(f.active).toBe(false);
    expect(f.level(3, 5.1)).toBe(0);
    // A web fading IN is not touched by the routed set.
    const g = new WebFade();
    g.retarget(new Set(), 0, new Set());
    g.retarget(new Set([4]), 1, new Set([4]));
    expect(g.active).toBe(true);
  });

  it("empties many webs at once as a set of fades on one clock (a reset)", () => {
    // Webs that stay routed all fade together; the ones that left the routes
    // just end.
    const f = new WebFade();
    f.retarget(new Set(), 0);
    f.retarget(new Set([1, 2, 3, 4]), 1);
    f.step(1.25);
    f.retarget(new Set(), 5, new Set([1, 2])); // 3 and 4 left the routes
    expect(
      f
        .levels(5.125)
        .map(([ji]) => ji)
        .sort()
    ).toEqual([1, 2]);
    expect(f.levels(5.125).every(([, lv]) => Math.abs(lv - 0.5) < 1e-6)).toBe(true);
    expect(f.level(3, 5)).toBe(0);
    expect(f.level(4, 5)).toBe(0);
  });

  it("levels() reads the fades without ending them", () => {
    const f = settledFull();
    f.retarget(new Set(), 5);
    expect(f.levels(5.25)).toEqual([[3, 0]]);
    expect(f.active).toBe(true); // only step() ends a fade
    f.step(5.25);
    expect(f.levels(5.25)).toEqual([]);
    expect(f.active).toBe(false);
  });
});
