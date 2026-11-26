// K1584 s6: at a tight turn's ball the crossing gap is a wedge cut from the ball's centre (Levi, 2026-11-24: "taper
// the gap--it should be widen out from the ball center, so it shows as a wedge cut out from the center; the fade should
// then also taper here"). lkBall scales the gap's margin and fade by |p - centre| / (fillet radius + W) on the ball's
// own chain; ballScaleAt and gapCutAt are its CPU twins.
import { describe, expect, it } from "vitest";
import { GAP_BALL_ARC, ballScaleAt, gapCutAt, lookForm } from "../../src/render/gpu_field/gf_look";
import { gfFs } from "../../src/render/gpu_field/gf_glsl";

// two corners: k0 a tight turn of chains 3 and 5 at (1, 2), fillet radius 0.05; k1 the same place but not tight
const T = {
  nK: 2,
  kTight: Uint8Array.from([1, 0]),
  kCa: Int32Array.from([3, 3]), kCb: Int32Array.from([5, 5]),
  kSa: Float64Array.from([10, 10]), kSb: Float64Array.from([4, 4]),
  kCx: Float64Array.from([1, 1]), kCy: Float64Array.from([2, 2]),
  kR: Float64Array.from([0.05, 0.05]),
};
const W = 0.15; const R = 0.05 + W;

describe("K1584 s6 ballScaleAt (lkBall's twin)", () => {
  it("is 0 at the ball's centre, rho / R inside the ball, 1 at and past its edge", () => {
    expect(ballScaleAt(T, W, 3, 10, 1, 2)).toBe(0);
    expect(ballScaleAt(T, W, 3, 10.1, 1 + 0.5 * R, 2)).toBeCloseTo(0.5, 12);
    expect(ballScaleAt(T, W, 5, 4.05, 1, 2 - 0.25 * R)).toBeCloseTo(0.25, 12);
    expect(ballScaleAt(T, W, 3, 10, 1 + R, 2)).toBeCloseTo(1, 12);
    expect(ballScaleAt(T, W, 3, 10, 1 + 2 * R, 2)).toBe(1);
  });
  it("only on the ball's own chains, near their tangent points, and only at tight turns", () => {
    expect(ballScaleAt(T, W, 4, 10, 1, 2)).toBe(1);
    expect(ballScaleAt(T, W, 3, 10 + GAP_BALL_ARC + 0.01, 1, 2)).toBe(1);
    expect(ballScaleAt(T, W, 5, 10, 1, 2)).toBe(1); // chain 5's tangent point is at arc 4
    expect(ballScaleAt(T, W, 3, 10, 1, 2, [1])).toBe(1);
    expect(ballScaleAt({ ...T, kTight: undefined }, W, 3, 10, 1, 2)).toBe(1);
  });
});

describe("K1584 s6 gapCutAt (lkCut's twin) with the ball's scale", () => {
  const h = 0.4, margin = 0.07, fade = 0.14, aa = 0.0117;
  it("bs 1 is stage 5's cut", () => {
    for (const d of [0.39, 0.41, 0.44, 0.47, 0.5, 0.55, 0.62, 0.7]) {
      const pxw = 2 * aa; const inner = Math.min(1, Math.max(0, (d - (h - aa)) / (2 * aa)));
      const k = Math.min(1, Math.max(0, (d - h - margin + 0.5 * pxw) / Math.max(fade, pxw)));
      expect(gapCutAt(d, h, margin, fade, 1, aa, 1, 1, 1)).toBeCloseTo((1 - k * k * (3 - 2 * k)) * inner * inner * (3 - 2 * inner), 12);
    }
  });
  it("narrows margin and fade together: the cut never grows as bs falls, and at bs 0 is gone a pixel past the outline", () => {
    for (const d of [0.405, 0.42, 0.45, 0.48, 0.52, 0.6]) {
      let last = Infinity;
      for (const bs of [1, 0.75, 0.5, 0.25, 0]) { const c = gapCutAt(d, h, margin, fade, 1, aa, 1, 1, bs); expect(c).toBeLessThanOrEqual(last + 1e-15); last = c; }
    }
    expect(gapCutAt(h + 2 * aa, h, margin, fade, 1, aa, 1, 1, 0)).toBe(0);
    // half the scale: the full cut reaches half the margin, the ramp ends half the fade past it (pxw floors aside)
    expect(gapCutAt(h + 0.5 * margin - 1.5 * aa, h, margin, fade, 1, aa, 1, 1, 0.5)).toBeCloseTo(1, 9);
    expect(gapCutAt(h + 0.5 * margin + 0.5 * fade + 0.01, h, margin, fade, 1, aa, 1, 1, 0.5)).toBe(0);
  });
  it("a closed border (margin scale < 0) keeps its own closure whatever the ball's scale", () => {
    const sc = -2 * aa / margin;
    for (const d of [0.39, 0.4, 0.41, 0.43]) expect(gapCutAt(d, h, margin, fade, 1, aa, sc, 0.3, 0)).toBe(gapCutAt(d, h, margin, fade, 1, aa, sc, 0.3, 1));
  });
  it("an over outline through the ball's centre cuts a wedge: the cut's width grows with the distance from the centre", () => {
    // the over thread's outline runs along y = 0 through the centre (0, 0); the under's ball pixel (x, y), y > 0 past it
    const width = (rho: number): number => {
      const bs = Math.min(1, rho / R); let y = 2 * aa;
      while (gapCutAt(h + y, h, margin, fade, 1, aa, 1, 1, bs) > 0.5) y += 1e-4;
      return y;
    };
    const w1 = width(0.5 * R), w2 = width(0.75 * R), w4 = width(R);
    expect(w1).toBeLessThan(w2); expect(w2).toBeLessThan(w4);
    expect(width(1.5 * R)).toBeCloseTo(w4, 9); // past the ball, the ordinary gap
    expect(w2 - w1).toBeCloseTo(w4 - w2, 3);
  });
});

describe("K1584 s6 the look programs carry the ball", () => {
  it("lkBall, the scale in lkCut and the rescale at the output site", () => {
    const f = lookForm(gfFs(false, true));
    expect(f).toContain("float lkBs = 1.0;");
    expect(f).toContain("float lkBall(vec2 p, int c, float arc) {");
    expect(f).toContain("int k = kk[i] & 32767;");
    expect(f).toContain("s = min(s, length(p - K0.xy) / max(K0.z + uW, 1e-6));");
    expect(f).toContain("float bs = sc.x > 0.0 ? lkBs : 1.0;");
    expect(f).toContain("if (lkg2.x > 0.0 || lkg2.y > 0.0) { lkBs = lkBall(p, lab, lkArc(lab, lq)); if (lkBs < 1.0) lkg2 = lkGap(lkKb, p, lq, lab); lkBs = 1.0; }");
    expect(f.indexOf("float lkBs = 1.0;")).toBeLessThan(f.indexOf("float lkCut("));
    expect(f.indexOf("int kk[")).toBeLessThan(f.indexOf("float lkBall("));
  });
});
