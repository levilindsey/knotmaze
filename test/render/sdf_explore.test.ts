// K825: the SDF ribbon's explore variant (withExploreSdf) applies the
// thread reveal's edits at the SDF fragment's own anchors, and the
// registry warms the program on an exploring rp=sdf page.
import { describe, expect, it } from "vitest";
import { withExploreSdf } from "../../src/render/explore_glsl";
import { SDF_FRAG } from "../../src/render/ribbon/ribbon_sdf";

describe("K825 SDF explore variant", () => {
  const frag = withExploreSdf(SDF_FRAG);

  it("carries the reveal's evaluation and its main block", () => {
    expect(frag).toContain("kExploreAt(kc, kctrl)");
    expect(frag).toContain("aM *= ev;");
    expect(frag).toContain("uniform vec4 uKExplore;");
  });

  it("recomputes kctrl while the mode is on (the SDF anchor)", () => {
    expect(frag).toContain("bool exHere = uKExplore.x > 0.5;");
    expect(frag).toContain("fxHere || paintHere || exHere ? kCtrlNear(kc, kpt.x, kpt.y)");
    expect(frag).not.toContain("float kctrl = fxHere || paintHere ? kCtrlNear(kc, kpt.x, kpt.y) : 0.0;");
    expect(frag).toContain("highp float kSideFw = fwidth(vUV.y);");
  });

  it("keeps the master's gap call after the visibility", () => {
    const evAt = frag.indexOf("aM *= ev;");
    const gapAt = frag.indexOf("float gk = gapKeepAt(pxW, vPos, arc, vDir, vIds);");
    expect(evAt).toBeGreaterThan(0);
    expect(gapAt).toBeGreaterThan(evAt);
  });

  it("is a distinct text; the master is untouched", () => {
    expect(frag).not.toBe(SDF_FRAG);
    expect(frag.length).toBeGreaterThan(SDF_FRAG.length);
    expect(SDF_FRAG).not.toContain("kExploreAt");
  });
});
