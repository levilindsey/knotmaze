import { describe, expect, it } from "vitest";
import {
  BACKGROUNDS,
  BACKGROUND_ACCENTS_USED,
  BACKGROUND_ANGLE_AUTO,
  BACKGROUND_COLOR_MODES,
  BACKGROUND_DETAIL_MAX,
  BACKGROUND_PAUSE_GRACE,
  BACKGROUND_PROFILES,
  BACKGROUND_SCALE_MAX,
  BACKGROUND_SCALE_MIN,
  BACKGROUND_SHAPE_DEFAULTS,
  BACKGROUND_SPEED_AUTO,
  BACKGROUND_SPEED_MAX,
  BACKGROUND_TEXTURE_MAX,
  BackgroundClock,
  accentHexes,
  autoSilkAngle,
  backgroundColors,
  backgroundDrift,
  backgroundSeedOffset,
  customBackgroundColors,
  detailGain,
  effectiveSpeed,
  hexRgb,
  isAutoAngle,
  isAutoSpeed,
  needsShapeProgram,
  parseHexColor,
  readsDetail,
  rgbHex,
  sanitizeBackgroundAngle,
  sanitizeBackgroundDetail,
  sanitizeBackgroundScale,
  sanitizeBackgroundShape,
  sanitizeBackgroundTexture,
  silkAngleUniform,
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

describe("animation speed (K79)", () => {
  // The drift every effect had before backgroundSpeed existed (K21): AUTO
  // must reproduce it exactly, or every existing link changes pace.
  const PRE_K79_DRIFT: Record<string, number> = {
    vellum: 0,
    mist: 0.35,
    wash: 0.8,
    silk: 0.8,
    aurora: 1,
    contours: 0.3,
  };

  it("reproduces the pre-K79 drift exactly at auto (the default, -1)", () => {
    for (const id of BACKGROUNDS) {
      if (id === "none") continue;
      expect([id, backgroundDrift(id, BACKGROUND_SPEED_AUTO)]).toEqual([
        id,
        PRE_K79_DRIFT[id],
      ]);
      // Any negative value, and NaN, reads as auto.
      expect(backgroundDrift(id, -0.5)).toBe(PRE_K79_DRIFT[id]);
      expect(backgroundDrift(id, NaN)).toBe(PRE_K79_DRIFT[id]);
    }
    expect(isAutoSpeed(BACKGROUND_SPEED_AUTO)).toBe(true);
    expect(isAutoSpeed(0)).toBe(false);
  });

  it("keeps vellum static at auto and moves it at a set speed", () => {
    expect(effectiveSpeed("vellum", BACKGROUND_SPEED_AUTO)).toBe(0);
    expect(effectiveSpeed("mist", BACKGROUND_SPEED_AUTO)).toBe(1);
    const v = BACKGROUND_PROFILES.vellum;
    expect(v.autoSpeed).toBe(0);
    expect(v.drift).toBeGreaterThan(0);
    expect(backgroundDrift("vellum", 1)).toBe(v.drift);
    expect(backgroundDrift("vellum", 2)).toBe(2 * v.drift);
  });

  it("is static at 0 and multiplies the designed drift otherwise", () => {
    for (const id of BACKGROUNDS) {
      if (id === "none") continue;
      const d = BACKGROUND_PROFILES[id].drift;
      expect(backgroundDrift(id, 0)).toBe(0);
      expect(backgroundDrift(id, 1)).toBe(d);
      expect(backgroundDrift(id, 2)).toBe(2 * d);
      expect(backgroundDrift(id, 0.25)).toBe(0.25 * d);
      // Up to the slider's max (8x, Levi 2026-10-13), clamped above it.
      expect(backgroundDrift(id, 8)).toBe(8 * d);
      expect(backgroundDrift(id, 10)).toBe(BACKGROUND_SPEED_MAX * d);
      expect(backgroundDrift(id, 1e9)).toBe(8 * d);
    }
    expect(BACKGROUND_SPEED_MAX).toBe(8);
    expect(effectiveSpeed("mist", 8)).toBe(8);
    expect(effectiveSpeed("mist", 8.5)).toBe(8);
    // 0 stays static and a negative value stays auto, at any max.
    expect(effectiveSpeed("mist", 0)).toBe(0);
    expect(effectiveSpeed("mist", -3)).toBe(1);
    expect(backgroundDrift("none", 2)).toBe(0);
    expect(effectiveSpeed("none", BACKGROUND_SPEED_AUTO)).toBe(0);
  });

  it("runs the drift clock at the effective drift (2x = twice the time)", () => {
    const a = new BackgroundClock();
    const b = new BackgroundClock();
    run(a, 10, backgroundDrift("wash", 1), 15, true);
    run(b, 10, backgroundDrift("wash", 2), 15, true);
    expect(b.time).toBeCloseTo(2 * a.time, 9);
    const s = new BackgroundClock();
    expect(run(s, 10, backgroundDrift("wash", 0), 15, true)).toBe(1);
    expect(s.time).toBe(0);
  });
});

describe("shape params (K79 stage B)", () => {
  const D = BACKGROUND_SHAPE_DEFAULTS;

  it("clamps every shape param to its slider; garbage reads as the default", () => {
    // The scale slider ends at 2 (K129: at 3 wash and contours are nearly
    // empty and vellum's fibers read as long hatching); 2 and below pass.
    expect(BACKGROUND_SCALE_MAX).toBe(2);
    expect([0.1, 0.5, 1.25, 2, 3, 9, NaN, Infinity].map(sanitizeBackgroundScale)).toEqual([
      BACKGROUND_SCALE_MIN, 0.5, 1.25, BACKGROUND_SCALE_MAX, 2, 2, 1, 1,
    ]);
    expect([-1, 0, 1.5, 2, 5, NaN].map(sanitizeBackgroundDetail)).toEqual([
      0, 0, 1.5, BACKGROUND_DETAIL_MAX, 2, 1,
    ]);
    expect([-1, 0, 2.5, 3, 7, NaN].map(sanitizeBackgroundTexture)).toEqual([
      0, 0, 2.5, BACKGROUND_TEXTURE_MAX, 3, 1,
    ]);
    // The angle: negative and garbage = AUTO; anything else wraps.
    expect([-1, -30, NaN, Infinity, 0, 90, 359, 360, 450].map(sanitizeBackgroundAngle)).toEqual([
      BACKGROUND_ANGLE_AUTO, -1, -1, -1, 0, 90, 359, 0, 90,
    ]);
    expect(isAutoAngle(BACKGROUND_ANGLE_AUTO)).toBe(true);
    expect(isAutoAngle(0)).toBe(false);
    expect(sanitizeBackgroundShape({ scale: 9, detail: -1, fibers: 4, grain: NaN, angle: 400 }))
      .toEqual({ scale: 2, detail: 0, fibers: 3, grain: 1, angle: 40 });
    expect(sanitizeBackgroundShape({ ...D })).toEqual(D);
  });

  it("uses each effect's own program at the defaults", () => {
    for (const id of BACKGROUNDS) {
      expect([id, needsShapeProgram(id, { ...D })]).toEqual([id, false]);
    }
  });

  it("switches to the shaped program only for params the effect reads", () => {
    const shaped = (s: Partial<typeof D>): string[] =>
      BACKGROUNDS.filter((id) => needsShapeProgram(id, { ...D, ...s }));
    const all = BACKGROUNDS.filter((id) => id !== "none");
    expect(shaped({ scale: 2 })).toEqual(all);
    expect(shaped({ scale: 0.5 })).toEqual(all);
    // Detail: only the effects with an fbm that carries their look (the
    // B2 sheets: vellum and aurora moved 0.4 levels, the rest 1-3).
    expect(shaped({ detail: 0 })).toEqual(["mist", "wash", "silk", "contours"]);
    expect(shaped({ detail: 2 })).toEqual(["mist", "wash", "silk", "contours"]);
    expect(BACKGROUNDS.filter(readsDetail)).toEqual(["mist", "wash", "silk", "contours"]);
    expect(shaped({ fibers: 0 })).toEqual(["vellum"]);
    expect(shaped({ grain: 3 })).toEqual(["vellum"]);
    expect(shaped({ angle: 0 })).toEqual(["silk"]);
    expect(shaped({ angle: 270 })).toEqual(["silk"]);
  });

  it("maps detail to fbm's octave gain (0.5 = the designed fbm)", () => {
    expect(detailGain(1)).toBe(0.5);
    expect(detailGain(0)).toBe(0.25);
    expect(detailGain(BACKGROUND_DETAIL_MAX)).toBe(0.75);
  });

  it("shows silk's auto angle as the direction its shader draws", () => {
    // The shader turns the streaks by uParams.y * 0.3 (y-down) at AUTO; the
    // panel shows autoSilkAngle, and setting that angle must draw the same
    // streaks (equal mod 2 pi: the shader only takes its cos and sin).
    for (let s = 0; s < 200; s++) {
      const seed = (s * 2654435761) >>> 0;
      const shown = autoSilkAngle(seed);
      expect(shown >= 0 && shown < 360).toBe(true);
      const auto = backgroundSeedOffset(seed)[1] * 0.3;
      const set = silkAngleUniform(shown);
      expect(set >= 0 && set < 2 * Math.PI).toBe(true);
      expect(Math.cos(set)).toBeCloseTo(Math.cos(auto), 9);
      expect(Math.sin(set)).toBeCloseTo(Math.sin(auto), 9);
    }
    // Counterclockwise on screen = clockwise in the shader's y-down frame:
    // 90 = upward (0, -1).
    expect(silkAngleUniform(0)).toBe(0);
    expect(Math.cos(silkAngleUniform(90))).toBeCloseTo(0, 12);
    expect(Math.sin(silkAngleUniform(90))).toBeCloseTo(-1, 12);
    expect(silkAngleUniform(BACKGROUND_ANGLE_AUTO)).toBe(-1);
    expect(silkAngleUniform(NaN)).toBe(-1);
  });
});

describe("custom colors (K79 stage B)", () => {
  it("keeps the codec's option order for the color mode", () => {
    const p = codecTable(CODEC_VERSION)!.params.find((q) => q.name === "backgroundColorMode");
    expect(p && p.type === "enum" ? [...p.options] : null).toEqual([...BACKGROUND_COLOR_MODES]);
    expect(BACKGROUND_COLOR_MODES[0]).toBe("gamut");
  });

  it("converts between hex text and RGB", () => {
    expect(parseHexColor("#ABcdef", 7)).toBe(0xabcdef);
    for (const bad of ["abcdef", "#abc", "#abcdeg", "", "#abcdef0"]) {
      expect([bad, parseHexColor(bad, 7)]).toEqual([bad, 7]);
    }
    expect(rgbHex([1, 128 / 255, 0])).toBe("#ff8000");
    expect(rgbHex([-1, 2, 0.2])).toBe("#00ff33");
    for (const hex of ["#000000", "#ffffff", "#151b28", "#7ab8cd"]) {
      expect(rgbHex(hexRgb(parseHexColor(hex, 0)))).toBe(hex);
    }
  });

  it("puts accent 1 in the main slot (the gamut's middle color)", () => {
    const c = customBackgroundColors("#102030", "#ff0000", "#00ff00", "#0000ff", 0x151b28);
    expect(c.ink).toEqual(hexRgb(0x102030));
    expect(c.accents).toEqual([[0, 1, 0], [1, 0, 0], [0, 0, 1]]);
    expect(accentHexes(c)).toEqual(["#ff0000", "#00ff00", "#0000ff"]);
    // Garbage: the base reads as the page ink, an accent as black.
    const g = customBackgroundColors("nope", "#ff0000", "", "#12", 0x151b28);
    expect(g.ink).toEqual(hexRgb(0x151b28));
    expect(g.accents).toEqual([[0, 0, 0], [1, 0, 0], [0, 0, 0]]);
  });

  it("starts custom from the design's own colors (8-bit exact)", () => {
    setGamutConfig(130, "pastel");
    const design = backgroundColors(0x151b28, 210);
    const [a1, a2, a3] = accentHexes(design);
    expect([a1, a2, a3]).toEqual([
      rgbHex(gamutRgb(210, 0.5)),
      rgbHex(gamutRgb(210, 0.12)),
      rgbHex(gamutRgb(210, 0.88)),
    ]);
    const custom = customBackgroundColors("#151b28", a1, a2, a3, 0x151b28);
    expect(custom.ink).toEqual(design.ink);
    for (let k = 0; k < 3; k++) {
      for (let ch = 0; ch < 3; ch++) {
        expect(Math.abs(custom.accents[k][ch] - design.accents[k][ch])).toBeLessThanOrEqual(
          0.5 / 255 + 1e-12
        );
      }
    }
  });

  it("lists the accents each effect reads", () => {
    expect(Object.keys(BACKGROUND_ACCENTS_USED).sort()).toEqual([...BACKGROUNDS].sort());
    expect(BACKGROUND_ACCENTS_USED.none).toEqual([]);
    expect(BACKGROUND_ACCENTS_USED.vellum).toEqual([1]);
    for (const used of Object.values(BACKGROUND_ACCENTS_USED)) {
      for (const n of used) expect([1, 2, 3]).toContain(n);
    }
  });
});
