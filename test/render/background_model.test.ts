import { describe, expect, it } from "vitest";
import {
  BACKGROUNDS,
  BACKGROUND_PAUSE_GRACE,
  BACKGROUND_PROFILES,
  BackgroundClock,
  backgroundColors,
  backgroundSeedOffset,
  hexRgb,
} from "../../src/render/background_model";
import { gamutRgb, setGamutConfig } from "../../src/core/section_colors";
import { codecTable, CODEC_VERSION } from "../../src/ui/param_codec";

const FRAME = 1 / 60;

// Runs `seconds` of 60 fps frames; returns how many re-renders happened.
const run = (
  clock: BackgroundClock,
  seconds: number,
  drift: number,
  fps: number,
  active: boolean,
  pause = true
): number => {
  let renders = 0;
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    if (clock.tick(FRAME, drift, fps, active, pause)) renders++;
  }
  return renders;
};

describe("background effects", () => {
  it("lists none first, then every effect with a profile", () => {
    expect(BACKGROUNDS[0]).toBe("none");
    expect(new Set(BACKGROUNDS).size).toBe(BACKGROUNDS.length);
    expect(Object.keys(BACKGROUND_PROFILES).sort()).toEqual(
      BACKGROUNDS.filter((b) => b !== "none").sort()
    );
  });

  it("keeps the codec's option order (links store the index)", () => {
    const p = codecTable(CODEC_VERSION)!.params.find((q) => q.name === "background");
    expect(p && p.type === "enum" ? [...p.options] : null).toEqual([...BACKGROUNDS]);
  });

  it("gives every drifting effect a re-render rate, phones a cheaper one", () => {
    for (const [id, p] of Object.entries(BACKGROUND_PROFILES)) {
      expect([id, p.scale > 0 && p.scale <= 1]).toEqual([id, true]);
      expect([id, p.phoneScale <= p.scale]).toEqual([id, true]);
      if (p.drift > 0) {
        expect([id, p.fps >= 6 && p.fps <= 30]).toEqual([id, true]);
        expect([id, p.phoneFps > 0 && p.phoneFps <= p.fps]).toEqual([id, true]);
      }
    }
  });
});

describe("background colors", () => {
  it("is the ink plus three accents from the design's gamut", () => {
    setGamutConfig(130, "pastel");
    const c = backgroundColors(0x151b28, 210);
    expect(c.ink).toEqual([0x15 / 255, 0x1b / 255, 0x28 / 255]);
    expect(c.accents).toEqual([
      gamutRgb(210, 0.12),
      gamutRgb(210, 0.5),
      gamutRgb(210, 0.88),
    ]);
    // A recolor (new palette) moves the accents, never the ink.
    setGamutConfig(130, "ember");
    const e = backgroundColors(0x151b28, 210);
    expect(e.ink).toEqual(c.ink);
    expect(e.accents[1]).not.toEqual(c.accents[1]);
    setGamutConfig(130, "pastel");
  });

  it("converts hex", () => {
    expect(hexRgb(0xff8000)).toEqual([1, 128 / 255, 0]);
  });

  it("offsets the noise per seed, deterministically and boundedly", () => {
    const seen = new Set<string>();
    for (let s = 0; s < 200; s++) {
      const [x, y] = backgroundSeedOffset(s * 7919);
      expect(x >= 0 && x < 64 && y >= 0 && y < 64).toBe(true);
      seen.add(`${x},${y}`);
    }
    expect(seen.size).toBe(200);
    expect(backgroundSeedOffset(42)).toEqual(backgroundSeedOffset(42));
  });
});

describe("background clock (drift + the K24 hook)", () => {
  it("renders once when dirty, then never for a static effect", () => {
    const c = new BackgroundClock();
    expect(c.needsFrame()).toBe(true);
    expect(run(c, 5, 0, 0, true)).toBe(1);
    expect(c.needsFrame()).toBe(false);
    expect(c.time).toBe(0);
    c.dirty = true;
    expect(run(c, 1, 0, 0, true)).toBe(1);
  });

  it("re-renders a drifting effect at its own rate, not the display's", () => {
    const c = new BackgroundClock();
    const n = run(c, 4, 1, 15, true);
    // The dirty render plus ~15 per second.
    expect(n).toBeGreaterThanOrEqual(59);
    expect(n).toBeLessThanOrEqual(62);
    expect(c.time).toBeCloseTo(4, 6);
  });

  it("scales the drift time by the effect's speed", () => {
    const c = new BackgroundClock();
    run(c, 10, 0.35, 15, true);
    expect(c.time).toBeCloseTo(3.5, 6);
  });

  it("pauses once the rest of the scene is static, resumes at once", () => {
    const c = new BackgroundClock();
    run(c, 1, 1, 15, true);
    const t0 = c.time;
    // Static scene: drifting continues through the grace period...
    run(c, BACKGROUND_PAUSE_GRACE - 0.2, 1, 15, false);
    expect(c.isDrifting).toBe(true);
    // ...then stops: no renders, no time, needsFrame false.
    run(c, 0.4, 1, 15, false);
    expect(c.isDrifting).toBe(false);
    const t1 = c.time;
    expect(t1).toBeGreaterThan(t0);
    expect(run(c, 30, 1, 15, false)).toBe(0);
    expect(c.time).toBe(t1);
    expect(c.needsFrame()).toBe(false);
    // Activity resumes the drift from where it stopped (no jump).
    c.tick(FRAME, 1, 15, true, true);
    expect(c.isDrifting).toBe(true);
    expect(c.time).toBeCloseTo(t1 + FRAME, 9);
    expect(run(c, 1, 1, 15, true)).toBeGreaterThanOrEqual(14);
  });

  it("never pauses with the policy off; a dirty frame renders even paused", () => {
    const c = new BackgroundClock();
    expect(run(c, 10, 1, 15, false, false)).toBeGreaterThan(140);
    const p = new BackgroundClock();
    run(p, 10, 1, 15, false);
    expect(p.isDrifting).toBe(false);
    p.dirty = true;
    expect(p.needsFrame()).toBe(true);
    expect(run(p, 1, 1, 15, false)).toBe(1);
  });

  it("clamps a long stall (a background tab) to a quarter second", () => {
    const c = new BackgroundClock();
    c.tick(FRAME, 1, 15, true, true);
    const t = c.time;
    c.tick(30, 1, 15, true, true);
    expect(c.time - t).toBeCloseTo(0.25, 9);
  });

  it("asks for a frame only when the next tick would render", () => {
    const c = new BackgroundClock();
    c.tick(FRAME, 1, 10, true, true); // The dirty render.
    let asked = 0;
    let rendered = 0;
    for (let i = 0; i < 600; i++) {
      const want = c.needsFrame(FRAME);
      const did = c.tick(FRAME, 1, 10, true, true);
      if (want) asked++;
      if (did) rendered++;
      expect(did).toBe(want);
    }
    expect(rendered).toBe(asked);
    expect(rendered).toBeGreaterThanOrEqual(99);
    expect(rendered).toBeLessThanOrEqual(101);
  });
});
