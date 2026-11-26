// K1627: a notch of paper cut into a junction's rounded corner (Levi's link ?3.FCBQ1H6L4-6NPbeg8HHN09w, 18 places on
// it). The corner's key is its nearer arm's z at the tangent point less uZt, and outside a gap window lkGap let every
// piece above that z cut it: the arm itself, where a crossing's depth tent beside the junction lifts the arm toward the
// junction. A corner label now skips its own chain within sx (K1460's selfEx) of the corner's arc, wrapped on a closed
// chain as lkNearOn's self crossing is; other threads still cut. The look's gap cut has no CPU mirror (eval.ts draws no
// gaps; gapCutAt twins lkCut, which is unchanged), so the programs' text is the pin.
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
import { lookForm } from "../../src/render/gpu_field/gf_look";

const SKIP = "if (cSelf && PC(j) == cU) { float da = lkArc(cU, qO) - aU; if (cPer > 0.0) da -= cPer * floor(da / cPer + 0.5); if (abs(da) < sx) continue; }";

describe("K1627 a corner's own arm does not cut the corner", () => {
  const T = GF_TIERS[0];
  const programs = [...cornerPlan(T).map((e) => gfFs(false, true, e.tier)), gfFs(false, true)];
  it("every program, alone and over the reveal form, keeps the corner's chain and skips it in lkGap's piece loop", () => {
    for (const src of programs) {
      for (const f of [lookForm(src), lookForm(revealForm(src))]) {
        // set only with the best configuration's label, and only for a corner (lkJ < 0); a piece label keeps -1
        expect(f).toContain("lkJb = lkJ; lkSb = lkS; lkKb = lkK; lkCs = labC >= 0 && lkJ < 0 ? labC : -1;");
        expect(f).toContain("int lkCs = -1;");
        expect(f.indexOf("int lkCs = -1;")).toBeLessThan(f.indexOf("vec2 lkGap("));
        expect(f).toContain("bool cSelf = lkCs >= 0 && lkCs == cU;");
        expect(f).toContain("if (cSelf) { vec4 cC0 = F(uOCh + 3 * cU); if (cC0.z > 0.5) cPer = F(uOV + int(cC0.x) + int(cC0.y) - 1).z; }");
        // the skip runs after the key test and before the piece's cut, inside lkGap's loop, once
        const g = f.slice(f.indexOf("vec2 lkGap("), f.indexOf("// K1500: today's marker-disc cut"));
        expect(g.split(SKIP).length).toBe(2);
        expect(g.indexOf("if (!(pkey[j] > key + uZt)) continue;\n    vec2 qO = lookQ(j, p);\n    " + SKIP)).toBeGreaterThan(0);
        expect(g.indexOf(SKIP)).toBeLessThan(g.indexOf("float cj = lkCut("));
        // the window's named over pass (lkNearOn) and lkFringe's piece calls are untouched
        expect(f).toContain("vec3 N = lkNearOn(cO, sl.y, sl.z, p, cO == cU ? aU : -1.0, sx);");
        expect(f).toContain("vec2 g = lkGap(kU, p, fq, PC(jU));");
      }
    }
  });
  it("the skip's arc wrap is lkNearOn's (nearest image on a closed chain)", () => {
    // the GLSL's da wrap, in JS: an arc just past the seam is near an arc just before it
    const wrap = (aJ: number, aU: number, per: number) => { let da = aJ - aU; if (per > 0) da -= per * Math.floor(da / per + 0.5); return da; };
    expect(wrap(0.1, 9.9, 10)).toBeCloseTo(0.2, 12);
    expect(wrap(9.9, 0.1, 10)).toBeCloseTo(-0.2, 12);
    expect(wrap(5, 0.1, 10)).toBeCloseTo(4.9, 12);
    expect(wrap(9.9, 0.1, 0)).toBeCloseTo(9.8, 12);
  });
});
