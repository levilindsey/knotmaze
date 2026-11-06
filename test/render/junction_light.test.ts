import { afterEach, describe, expect, it } from "vitest";
import {
  JUNCTION_FRAG,
  LIGHT_RAMP_FH,
  LIGHT_SOFT_FH,
  LIGHT_STRIP_FH,
  junctionLight,
  lightAllowance,
  lightEase,
  lightSoftCover,
  setJunctionLight,
} from "../../src/render/junction_field";

// K1211 S1: the junction light switch and the pure pieces of look B, which
// keeps the bands with a soft sideways falloff (lightSoftCover) let into
// the arms off the band only near the joint (lightAllowance, eased by
// lightEase). The GLSL copies (jLightEase, jLightSoft, jLightAllow) are
// pinned against these by text below; the CPU twin (joinery.ts
// cpuJunctionField) calls these functions directly. S2 removed look A
// (value 1): it falls back to 0, and B keeps 2.

describe("the switch (K1211)", () => {
  afterEach(() => setJunctionLight(0));

  it("defaults to 0 (today's look), takes 2, and 1 (look A, removed) falls back to 0", () => {
    expect(junctionLight()).toBe(0);
    setJunctionLight(2);
    expect(junctionLight()).toBe(2);
    setJunctionLight(1);
    expect(junctionLight()).toBe(0);
    setJunctionLight(2);
    setJunctionLight(0);
    expect(junctionLight()).toBe(0);
  });

  it("rounds first, then falls back to 0 out of range", () => {
    setJunctionLight(1.4);
    expect(junctionLight()).toBe(0);
    setJunctionLight(1.6);
    expect(junctionLight()).toBe(2);
    setJunctionLight(2.6);
    expect(junctionLight()).toBe(0);
    setJunctionLight(-1);
    expect(junctionLight()).toBe(0);
    setJunctionLight(Number.NaN);
    expect(junctionLight()).toBe(0);
  });
});

describe("lightEase", () => {
  it("is 0 at the joint and 1 at the ramp's end, clamped outside", () => {
    for (const e of [0, 0.5, 1]) {
      expect(lightEase(0, e)).toBe(0);
      expect(lightEase(1, e)).toBe(1);
      expect(lightEase(-0.5, e)).toBe(0);
      expect(lightEase(3, e)).toBe(1);
    }
  });

  it("is linear at ease 0 and a smoothstep at ease 1 (junctionBlend's kEase)", () => {
    for (const u of [0.1, 0.25, 0.5, 0.8]) {
      expect(lightEase(u, 0)).toBeCloseTo(u, 12);
      expect(lightEase(u, 1)).toBeCloseTo(u * u * (3 - 2 * u), 12);
    }
  });

  it("is monotone", () => {
    let prev = -1;
    for (let i = 0; i <= 100; i++) {
      const v = lightEase(i / 100, 0.7);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe("lightSoftCover (look B)", () => {
  const fh = 0.26;
  it("is solid to the half-width and 0 past LIGHT_SOFT_FH more", () => {
    expect(lightSoftCover(0, fh)).toBe(1);
    expect(lightSoftCover(fh, fh)).toBe(1);
    expect(lightSoftCover(fh * (1 + LIGHT_SOFT_FH), fh)).toBe(0);
    expect(lightSoftCover(10 * fh, fh)).toBe(0);
    expect(lightSoftCover(fh * (1 + LIGHT_SOFT_FH / 2), fh)).toBeCloseTo(0.5, 12);
  });

  it("falls monotonically with a flat start (no step at the half-width)", () => {
    let prev = 2;
    for (let i = 0; i <= 200; i++) {
      const v = lightSoftCover((i / 200) * 3 * fh, fh);
      expect(v).toBeLessThanOrEqual(prev);
      prev = v;
    }
    // smoothstep: the slope is 0 at both ends, so just past the half-width
    // the cover has barely moved
    expect(1 - lightSoftCover(fh * 1.01, fh)).toBeLessThan(1e-3);
  });
});

describe("lightAllowance (look B)", () => {
  const fh = 0.3;
  it("lets the band's own arms in everywhere", () => {
    for (const s of [0, fh, 5 * fh, 50]) expect(lightAllowance(true, s, fh, 1)).toBe(1);
  });

  it("lets other arms in only near the joint, eased out over LIGHT_RAMP_FH", () => {
    expect(lightAllowance(false, 0, fh, 1)).toBe(1);
    expect(lightAllowance(false, LIGHT_RAMP_FH * fh, fh, 1)).toBe(0);
    expect(lightAllowance(false, 4 * LIGHT_RAMP_FH * fh, fh, 1)).toBe(0);
    expect(lightAllowance(false, 0.5 * LIGHT_RAMP_FH * fh, fh, 0)).toBeCloseTo(0.5, 12);
    expect(lightAllowance(false, 0.25 * LIGHT_RAMP_FH * fh, fh, 1)).toBeCloseTo(1 - 0.15625, 12);
  });

  it("ends inside the cover strips the looks draw", () => {
    expect(LIGHT_STRIP_FH).toBeGreaterThan(LIGHT_RAMP_FH);
  });
});

describe("the shader's copies (K1211)", () => {
  it("carries the switch, the ease, the soft cover and the allowance, and no look A", () => {
    expect(JUNCTION_FRAG).toContain("float jLightEase(");
    expect(JUNCTION_FRAG).toContain("float jLightSoft(");
    expect(JUNCTION_FRAG).toContain("float jLightAllow(");
    expect(JUNCTION_FRAG).not.toContain("jLightA(");
    expect(JUNCTION_FRAG).not.toContain("JCOL");
    expect(JUNCTION_FRAG).toContain("uJParams.z");
    expect(JUNCTION_FRAG).toContain(`(${LIGHT_SOFT_FH.toFixed(3)} * uJParams.x)`);
    expect(JUNCTION_FRAG).toContain(`${LIGHT_RAMP_FH.toFixed(3)} * uJParams.x`);
  });
});
