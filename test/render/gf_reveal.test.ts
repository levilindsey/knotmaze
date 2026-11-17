// K1383 s1: the appearance reveal under rp=gf (gf_reveal.ts). The knots are
// exact under the linear interpolation the ribbon mesh and the shader both
// use; the lookup wraps rings and clamps open ends; the reveal form finds
// its anchors in every program the pass draws and leaves the originals as
// they were. K1395 (24D): a knot also carries the width (mask x rainbow
// swell); revealAt reads the mask, revealWidthAt the width.
import { describe, expect, it } from "vitest";
import { gfFs } from "../../src/render/gpu_field/gf_glsl";
import { cornerPlan, GF_TIERS } from "../../src/render/gpu_field/gf_pass";
import { gfRevealing, revealAt, revealForm, revealKnots, revealWidthAt } from "../../src/render/gpu_field/gf_reveal";

/** The dense reference: linear interpolation over every sample (a duplicate run draws its last/first point). */
function dense(s: number[], m: number[], x: number): number {
  if (x <= s[0]) return m[0];
  const n = s.length;
  if (x >= s[n - 1]) return m[n - 1];
  for (let k = 0; k < n - 1; k++) {
    if (x >= s[k] && x <= s[k + 1] && s[k + 1] > s[k]) return m[k] + (m[k + 1] - m[k]) * ((x - s[k]) / (s[k + 1] - s[k]));
  }
  return m[n - 1];
}

describe("K1383 s1 reveal knots", () => {
  it("keep only where the mask changes, exact under linear interpolation", () => {
    const s: number[] = []; const m: number[] = [];
    for (let k = 0; k < 40; k++) {
      s.push(k * 0.5);
      // full, then a front ramping down, then hidden
      m.push(k < 15 ? 1 : k < 20 ? 1 - (k - 15) / 5 : 0);
    }
    const out: number[] = [];
    revealKnots(s, m, m, s.length, false, out);
    expect(out.length / 3).toBeLessThan(12);
    for (let x = -1; x <= 21; x += 0.037) {
      expect(revealAt(out, 0, out.length / 3, 0, x)).toBeCloseTo(dense(s, m, x), 12);
      expect(revealWidthAt(out, 0, out.length / 3, 0, x)).toBeCloseTo(dense(s, m, x), 12);
    }
  });
  it("collapse a tucked end's duplicate runs to the point the ribbon draws", () => {
    // start run at s 0 (masks 0.2, 0.4, 0.6: the last one is drawn), end run at s 5 (first one drawn)
    const s = [0, 0, 0, 1, 2, 3, 4, 5, 5, 5];
    const m = [0.2, 0.4, 0.6, 0.7, 0.8, 0.9, 1, 0.5, 0.3, 0.1];
    const out: number[] = [];
    revealKnots(s, m, m, s.length, false, out);
    expect(out.slice(0, 3)).toEqual([0, 0.6, 0.6]);
    expect(out.slice(-3)).toEqual([5, 0.5, 0.5]);
    expect(revealAt(out, 0, out.length / 3, 0, -1)).toBe(0.6);
    expect(revealAt(out, 0, out.length / 3, 0, 9)).toBe(0.5);
  });
  it("keep a mid-chain duplicate pair (a step) as two knots", () => {
    const s = [0, 1, 2, 2, 3, 4];
    const m = [1, 1, 1, 0, 0, 0];
    const out: number[] = [];
    revealKnots(s, m, m, s.length, true, out);
    expect(revealAt(out, 0, out.length / 3, 0, 1.999)).toBe(1);
    expect(revealAt(out, 0, out.length / 3, 0, 2.001)).toBe(0);
  });
  it("K1395: keeps where only the width (swell) changes, the mask flat", () => {
    const s = [0, 1, 2, 3, 4];
    const m = [1, 1, 1, 1, 1];
    const w = [2, 1.6, 1.3, 1.1, 1];
    const out: number[] = [];
    revealKnots(s, m, w, s.length, false, out);
    expect(out.length / 3).toBe(5);
    for (let x = 0; x <= 4; x += 0.11) {
      expect(revealWidthAt(out, 0, out.length / 3, 0, x)).toBeCloseTo(dense(s, w, x), 12);
      expect(revealAt(out, 0, out.length / 3, 0, x)).toBe(1);
    }
  });
});

describe("K1383 s1 revealAt", () => {
  const K = [9, 9, 9, 0, 0, 0, 2, 1, 1, 4, 0.5, 0.5]; // a leading foreign knot, then this chain's (0,0,0) (2,1,1) (4,.5,.5)
  it("clamps an open chain's ends", () => {
    expect(revealAt(K, 1, 3, 0, -3)).toBe(0);
    expect(revealAt(K, 1, 3, 0, 7)).toBe(0.5);
    expect(revealAt(K, 1, 3, 0, 1)).toBeCloseTo(0.5, 12);
    expect(revealAt(K, 1, 3, 0, 3)).toBeCloseTo(0.75, 12);
  });
  it("wraps a ring", () => {
    expect(revealAt(K, 1, 3, 4, 5)).toBeCloseTo(revealAt(K, 1, 3, 4, 1), 12);
    expect(revealAt(K, 1, 3, 4, -1)).toBeCloseTo(revealAt(K, 1, 3, 4, 3), 12);
  });
  it("has no knots: hidden", () => {
    expect(revealAt(K, 1, 0, 0, 1)).toBe(0);
  });
});

describe("K1383 s1 reveal form", () => {
  const T = GF_TIERS[0];
  const programs = [...cornerPlan(T).map((e) => gfFs(false, true, e.tier)), gfFs(false, true)];
  it("finds its anchors in every program the pass draws", () => {
    for (const src of programs) {
      const f = revealForm(src);
      expect(f).toContain("float rvm = rvM(c, s);");
      expect(f).toContain("uniform highp sampler2D uRv;");
      // the corner gate goes wherever a program reads corner keys
      const keys = src.split("int k = int(L4(uOKL, q));").length - 1;
      expect(f.split("if (RV(uORvK + k).x < 0.5) continue;").length - 1).toBe(keys);
    }
    // the corner programs (the frame tier's corner program and the full program) have the gate
    expect(programs.filter((p) => p.includes("int k = int(L4(uOKL, q));")).length).toBeGreaterThanOrEqual(2);
  });
  it("leaves the original programs as they were", () => {
    for (const src of programs) {
      expect(src).not.toContain("rvM");
      expect(src).not.toContain("uRv");
    }
    expect(gfFs(false, true)).toBe(programs[programs.length - 1]);
  });
  it("refuses a program without its anchors", () => {
    expect(() => revealForm("void main() {}")).toThrow(/gf reveal/);
  });
});

describe("K1383 s1 gfRevealing", () => {
  it("is today's widthMulFor reveal flag", () => {
    expect(gfRevealing(null)).toBe(false);
    expect(gfRevealing({ revealOn: true, fxLive: true })).toBe(true);
    expect(gfRevealing({ revealOn: true, fxLive: false })).toBe(false);
    expect(gfRevealing({ revealOn: false, fxLive: true })).toBe(false);
  });
});
