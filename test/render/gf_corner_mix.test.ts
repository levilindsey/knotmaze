// K1627 s2: a junction's rounded corner drew each half in one flat colour, its nearer arm's at the tangent point (the
// label's lookQs(lab, sa or sb)), so where the halves met there was a hard colour edge: a triangle of the wrong colour
// in the corner (Levi's link ?3.FCBQ1H6L4-6NPbeg8HHN09w&rp=gf&gfh=1, (2329,584)). A corner-labelled pixel now blends
// its two arms' colours (gold mixed in), each read at the pixel's projection onto that arm, by its distances to the
// arms' outline lines: arm A's colour alone on A's outline, B's alone on B's, the halves' mean on the bisector.
// The blend is GLSL only; cornerMixW and cornerArmS are its CPU twins, and the programs' text is the pin.
import { describe, expect, it, vi } from "vitest";
vi.mock("../../src/render/paint_math", async (orig) => ({
  ...(await orig<typeof import("../../src/render/paint_math")>()),
  knotSection: (_D: unknown, _U: unknown, c: { ch: number }, ctrl: number, out: number[]) => { out[0] = ctrl; out[1] = c.ch; out[2] = 0; },
}));
vi.mock("../../src/render/paint_model", async (orig) => ({
  ...(await orig<typeof import("../../src/render/paint_model")>()),
  knotUniformValues: () => ({}),
}));
import { gfFs } from "../../src/render/gpu_field/gf_glsl";
import { cornerPlan, GF_TIERS } from "../../src/render/gpu_field/gf_pass";
import { revealForm } from "../../src/render/gpu_field/gf_reveal";
import { cornerArmS, cornerMixW, lookForm } from "../../src/render/gpu_field/gf_look";

const CALL = "if (lkKib >= 0) { vec4 lkCm = lkCornerMix(lkKib, p); lkCo.rgb = lkCm.rgb; lkgp = lkCm.a; }";

describe("K1627 s2 a corner's colour runs from one arm's to the other's", () => {
  const T = GF_TIERS[0];
  const programs = [...cornerPlan(T).map((e) => gfFs(false, true, e.tier)), gfFs(false, true)];
  it("every program, alone and over the reveal form, blends only a corner label's pixels", () => {
    let labrun = 0; let full = 0;
    for (const src of programs) {
      for (const f of [lookForm(src), lookForm(revealForm(src))]) {
        // the best configuration's corner: set only when its label is a corner (lkJ < 0), cleared by the through label
        expect(f).toContain("lkCs = labC >= 0 && lkJ < 0 ? labC : -1; lkKib = labC >= 0 && lkJ < 0 ? lkKi : -1;");
        expect(f).toContain("lab = own; lkJb = -1; lkSb = K3.z; lkKb = BIG; lkKib = -1;");
        expect(f).toContain("int lkKi = -1; int lkKib = -1; int lkki[MAXS];");
        // every corner label site records its corner k; a piece's surface records none
        if (f.includes("labC = nearerA ? int(K3.x) : int(K3.y); lkJ = -1;")) {
          labrun++;
          expect(f).toContain("labC = nearerA ? int(K3.x) : int(K3.y); lkJ = -1; lkS = nearerA ? K3.z : K3.w; lkK = key; lkKi = k; }");
        }
        if (f.includes("scch[e] = nearerA ? int(K3.x) : int(K3.y);")) {
          full++;
          expect(f).toContain("scch[e] = nearerA ? int(K3.x) : int(K3.y); lkj[e] = -1; lks[e] = nearerA ? K3.z : K3.w; lkki[e] = k;");
          expect(f).toContain("scch[e] = PC(j); lkj[e] = j; lkki[e] = -1;");
          expect(f).toContain("lkK = sckey[top]; lkKi = lkki[top]; }");
        }
        // one call, at the output, after the label's flat colour and gold and before the route band, rim and fx
        expect(f.split("lkCornerMix(lkKib, p)").length).toBe(2);
        expect(f).toContain("lkCo.rgb = mix(lkCo.rgb, uGold, lkgp); " + CALL + " lkCo.rgb = lkRoute(");
        expect(f.split("vec4 lkCornerMix(int k, vec2 p) {").length).toBe(2);
        expect(f).toContain("float w = dA + dB > 0.0 ? dA / (dA + dB) : 0.5;");
        expect(f.indexOf("int lkKi = -1;")).toBeLessThan(f.indexOf("vec4 lkCornerMix("));
      }
    }
    // both corner label forms are exercised
    expect(labrun).toBeGreaterThan(0);
    expect(full).toBeGreaterThan(0);
  });
  // a corner whose circle (centre (0, 0), radius 1) touches arm A's outline y = -1 at TA and arm B's x = -1 at TB, the
  // outlines meeting at V = (-1, -1); the corner's pixels lie outside the circle and on both lines' inner (circle) sides
  const eA = [0, -1]; const eB = [-1, 0];
  const TA = [0, -1]; const TB = [-1, 0];
  it("weight: 0 on arm A's outline, 1 on arm B's, a half on the bisector, monotone and continuous between", () => {
    expect(cornerMixW([-0.5, -1], TA, eA, TB, eB)).toBe(0);
    expect(cornerMixW([-1, -0.5], TA, eA, TB, eB)).toBe(1);
    expect(cornerMixW([-0.9, -0.9], TA, eA, TB, eB)).toBeCloseTo(0.5, 12);
    expect(cornerMixW([-1, -1], TA, eA, TB, eB)).toBe(0.5);
    let prev = -1;
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const w = cornerMixW([-0.5 - 0.5 * t, -1 + 0.5 * t], TA, eA, TB, eB);
      expect(w).toBeCloseTo(t, 12);
      if (prev >= 0) { expect(w).toBeGreaterThan(prev); expect(w - prev).toBeLessThan(0.06); }
      prev = w;
    }
  });
  it("arm s: the tangent point keeps its s, a run along the segment adds its s per length", () => {
    const A = [0, 0, 10]; const B = [4, 0, 12];
    expect(cornerArmS(11, A, B, [2, 0], [2, 0])).toBe(11);
    expect(cornerArmS(11, A, B, [3, 5], [2, 0])).toBeCloseTo(11.5, 12);
    expect(cornerArmS(11, A, B, [0, -1], [2, 0])).toBeCloseTo(10, 12);
    expect(cornerArmS(11, [1, 1, 3], [1, 1, 3], [5, 5], [1, 1])).toBe(11);
  });
});
