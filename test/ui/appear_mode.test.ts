import { describe, expect, it } from "vitest";
import {
  APPEAR_MODES,
  APPEAR_PRESETS,
  appearModeFor,
  applyAppearMode,
} from "../../src/ui/url_state";
import type { AppearPreset, UrlParams } from "../../src/ui/url_state";

type Appear = Pick<
  UrlParams,
  "appearMode" | "appearSequence" | "appearFx" | "appearSpeed"
>;
// Values no preset uses, so every overwrite shows.
const appear = (mode: Appear["appearMode"]): Appear => ({
  appearMode: mode,
  appearSequence: "draw",
  appearFx: "none",
  appearSpeed: 0.7,
});

describe("appearance modes", () => {
  it("lists every mode once, instant first", () => {
    expect(APPEAR_MODES[0]).toBe("instant");
    expect(new Set(APPEAR_MODES).size).toBe(APPEAR_MODES.length);
  });

  it("a preset sets all three values, which derive back to it", () => {
    for (const id of Object.keys(APPEAR_PRESETS) as AppearPreset[]) {
      const p = appear(id);
      applyAppearMode(p);
      const v = APPEAR_PRESETS[id];
      expect(p).toEqual({
        appearMode: id,
        appearSequence: v.sequence,
        appearFx: v.fx,
        appearSpeed: v.speed,
      });
      expect(appearModeFor(p)).toBe(id);
    }
  });

  it("an edited preset derives custom; an instant sequence derives instant", () => {
    const p = appear("trace-burn");
    applyAppearMode(p);
    p.appearSpeed = 2.95;
    expect(appearModeFor(p)).toBe("custom");
    p.appearSpeed = 3;
    expect(appearModeFor(p)).toBe("trace-burn");
    p.appearSequence = "instant";
    expect(appearModeFor(p)).toBe("instant");
  });

  it("custom keeps the values; instant sets only the sequence", () => {
    const c = appear("custom");
    applyAppearMode(c);
    expect(c).toEqual(appear("custom"));
    const i = appear("instant");
    applyAppearMode(i);
    expect(i).toEqual({ ...appear("instant"), appearSequence: "instant" });
  });

  it("random rolls a real reveal, a visible effect and a gridded speed", () => {
    let s = 1;
    const rand = (): number => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
    const seqs = new Set<string>();
    const fxs = new Set<string>();
    for (let k = 0; k < 300; k++) {
      const p = appear("random");
      applyAppearMode(p, rand);
      expect(p.appearMode).toBe("random");
      expect(p.appearSequence).not.toBe("instant");
      expect(p.appearFx).not.toBe("none");
      expect(p.appearSpeed).toBeGreaterThanOrEqual(1.5);
      expect(p.appearSpeed).toBeLessThanOrEqual(3);
      expect(String(p.appearSpeed)).toMatch(/^\d(\.\d\d?)?$/);
      seqs.add(p.appearSequence);
      fxs.add(p.appearFx);
    }
    expect(seqs.size).toBe(6); // + edges / edgesAll (K798)
    expect(fxs.size).toBe(5);
  });
});
