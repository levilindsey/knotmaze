// K1414 part 1 (24F): the hover rim under rp=gf (gf_look.ts lkRim, rimAlong/rimAcross CPU twins).
import { describe, expect, it } from "vitest";
import { gfFs } from "../../src/render/gpu_field/gf_glsl";
import { lookForm, rimAcross, rimAlong } from "../../src/render/gpu_field/gf_look";
import { cornerPlan, GF_TIERS } from "../../src/render/gpu_field/gf_pass";
import { revealForm } from "../../src/render/gpu_field/gf_reveal";

describe("K1414 gf hover rim (look form)", () => {
  it("the look form carries the rim term; the originals are untouched", () => {
    const programs = [...cornerPlan(GF_TIERS[0]).map((e) => gfFs(false, true, e.tier)), gfFs(false, true)];
    for (const s of programs) {
      for (const f of [lookForm(s), lookForm(revealForm(s))]) {
        expect(f).toContain("lkRim(lkCo.rgb, lab, lq, p)");
        expect(f).toContain("uRimA");
      }
      expect(s).not.toContain("uRimA");
    }
  });
});

describe("K1414 gf hover rim (CPU twins)", () => {
  it("rimAlong: full at the hover point, gone at its length and inside the end gap", () => {
    // strength 0.4, length 3, fade 0.2, gap 0.5, run span 6
    expect(rimAlong(0.4, 0, 3, 0.5, 3, 0.2, 6)).toBeCloseTo(0.4, 6);
    expect(rimAlong(0.4, 3, 3, 0.5, 3, 0.2, 6)).toBeCloseTo(0, 6);
    expect(rimAlong(0.4, 0, 0.4, 0.5, 3, 0.2, 6)).toBeCloseTo(0, 6);
    expect(rimAlong(0, 0, 3, 0.5, 3, 0.2, 6)).toBe(0);
  });

  it("rimAcross: full at the edge, gone inside the rim edge", () => {
    expect(rimAcross(1, 1)).toBeCloseTo(1, 6);
    expect(rimAcross(0, 1)).toBeCloseTo(0, 6);
    expect(rimAcross(0.5, 1)).toBeGreaterThan(0);
    expect(rimAcross(0.5, 1)).toBeLessThan(1);
  });
});
