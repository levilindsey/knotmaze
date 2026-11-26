// K1584 s6: at a tight turn's ball the crossing gap is a wedge cut from the ball's centre (Levi, 2026-11-24: "taper
// the gap--it should be widen out from the ball center, so it shows as a wedge cut out from the center; the fade should
// then also taper here"). lkBall scales the gap's margin and fade by |p - centre| / (fillet radius + W) on the ball's
// own chain; ballScaleAt and gapCutAt are its CPU twins.
import { describe, expect, it } from "vitest";
import { GAP_BALL_ARC, GAP_OPEN_END, GAP_OPEN_FULL, GAP_WEDGE_THETA, ballOpenAt, ballScaleAt, gapCutAt, lookForm } from "../../src/render/gpu_field/gf_look";
import { gfFs } from "../../src/render/gpu_field/gf_glsl";

// two corners: k0 a tight turn of chains 3 and 5 at (1, 2), fillet radius 0.05; k1 the same place but not tight; both
// open 0.7 rad (40.1 degrees, A_3 k63's), under the wedge's line
const T = {
  nK: 2,
  kTight: Uint8Array.from([1, 0]),
  kTheta: Float64Array.from([0.7, 0.7]),
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

describe("K1584 s10 the wedge's line picks its form (Levi, 2026-11-25: balls #1-#3 get the wedge; the looser ones keep stage 8's)", () => {
  const deg = (d: number): number => (d * Math.PI) / 180;
  const Tt = (th: number): typeof T => ({ ...T, kTheta: Float64Array.from([th, th]) });
  // the ranked balls' opening angles (tables.ts kTheta, rad): #1 A_3 k63, #2 A_5 k176, #3 A_6 k265 | #4 A_6 k331, #5 A_a k202
  const tightSide = [0.69902, 0.75313, 0.78319], looseSide = [0.78847, 0.79695];
  it("lies between #3 (A_6 k265, 44.87 degrees) and #4 (A_6 k331, 45.18), read as the shader reads the packed float", () => {
    for (const th of tightSide) expect(Math.fround(1 + th)).toBeLessThan(Math.fround(1 + GAP_WEDGE_THETA));
    for (const th of looseSide) expect(Math.fround(1 + th)).toBeGreaterThanOrEqual(Math.fround(1 + GAP_WEDGE_THETA));
    expect(GAP_WEDGE_THETA).toBeCloseTo(deg(45), 12);
  });
  it("every tight turn scales its gap as stage 8 did, on either side of the line", () => {
    for (const th of [...tightSide, ...looseSide, deg(61.1)]) {
      expect(ballScaleAt(Tt(th), W, 3, 10, 1, 2)).toBe(0);
      expect(ballScaleAt(Tt(th), W, 3, 10.1, 1 + 0.5 * R, 2)).toBeCloseTo(0.5, 12);
      expect(ballScaleAt(Tt(th), W, 3, 10, 1 + 2 * R, 2)).toBe(1);
    }
  });
  it("only a turn under the line takes the open form: whole to GAP_OPEN_FULL radii, blending out by GAP_OPEN_END, on its own chains near the tangent point", () => {
    expect(GAP_OPEN_FULL).toBeGreaterThan(1); expect(GAP_OPEN_END).toBeGreaterThan(GAP_OPEN_FULL);
    for (const th of tightSide) {
      expect(ballOpenAt(Tt(th), W, 3, 10, 1, 2)).toBe(1);
      expect(ballOpenAt(Tt(th), W, 5, 4.05, 1 + 0.9 * R, 2)).toBe(1);
      expect(ballOpenAt(Tt(th), W, 3, 10, 1 + GAP_OPEN_FULL * R, 2)).toBeCloseTo(1, 12);
      expect(ballOpenAt(Tt(th), W, 3, 10, 1 + 0.5 * (GAP_OPEN_FULL + GAP_OPEN_END) * R, 2)).toBeCloseTo(0.5, 12);
      expect(ballOpenAt(Tt(th), W, 3, 10, 1 + GAP_OPEN_END * R, 2)).toBe(0);
      expect(ballOpenAt(Tt(th), W, 3, 10, 1 + 1.01 * GAP_OPEN_END * R, 2)).toBe(0);
      expect(ballOpenAt(Tt(th), W, 4, 10, 1, 2)).toBe(0);
      expect(ballOpenAt(Tt(th), W, 3, 10 + GAP_BALL_ARC + 0.01, 1, 2)).toBe(0);
      expect(ballOpenAt(Tt(th), W, 3, 10, 1, 2, [1])).toBe(0);
      // the scale (the wedge's taper) is the same on either side of the line: the apex stays at the centre
      expect(ballScaleAt(Tt(th), W, 3, 10, 1, 2)).toBe(0);
    }
    for (const th of [...looseSide, deg(61.1)]) expect(ballOpenAt(Tt(th), W, 3, 10, 1, 2)).toBe(0);
  });
  it("lkBall reads the line from the packed angle (corner texel 5 .w = 1 + angle); the program's other reads test .w > 0.5", () => {
    const f = lookForm(gfFs(false, true));
    expect(f).toContain("if (K5.w < 0.5) continue;");
    expect(f).toContain(`if (K5.w < ${String(Math.fround(1 + GAP_WEDGE_THETA))}) tw = max(tw, 1.0 - smoothstep(${GAP_OPEN_FULL.toFixed(1)}, ${GAP_OPEN_END.toFixed(1)}, r));`);
    expect(f).toContain("if (lkTw >= 1.0) fo = false;");
    expect(f).toContain("if (lkTw > 0.0) { sc = mix(sc, vec2(1.0), lkTw); scA = mix(scA, vec2(1.0), lkTw); if (lkTw >= 1.0) jf = false; }");
    expect(f).toContain("(F(uOK + 6 * k + 5).w > 0.5 ? 0.0 : outlineBur(m, q, p, S))");
    expect(f.match(/\b(K5|Z5)\.w\b/g)?.length).toBe(2);
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
    expect(f).toContain("vec2 lkBall(vec2 p, int c, float arc) {");
    expect(f).toContain("int k = kk[i] & 32767;");
    expect(f).toContain("float r = length(p - K0.xy) / max(K0.z + uW, 1e-6);");
    expect(f).toContain("s = min(s, r);");
    expect(f).toContain("float bs = sc.x > 0.0 ? lkBs : 1.0;");
    // K1584 s10: the gap is recomputed with the ball's scale where a ball scales it (stage 8) or a tight wedge opens it
    expect(f).toContain("vec2 lkb2 = lkBall(p, lab, lkArc(lab, lq)); if (lkb2.y > 0.0 || ((lkg2.x > 0.0 || lkg2.y > 0.0) && lkb2.x < 1.0)) { lkBs = lkb2.x; lkTw = lkb2.y; lkg2 = lkGap(lkKb, p, lq, lab); lkBs = 1.0; lkTw = 0.0; }");
    expect(f.indexOf("float lkBs = 1.0;")).toBeLessThan(f.indexOf("float lkCut("));
    expect(f.indexOf("float lkTw = 0.0;")).toBeLessThan(f.indexOf("vec2 lkGap("));
    expect(f.indexOf("int kk[")).toBeLessThan(f.indexOf("vec2 lkBall("));
  });
});
