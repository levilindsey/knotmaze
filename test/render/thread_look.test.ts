import { describe, expect, it } from "vitest";
import { JUNCTION_FRAG, withExploreField } from "../../src/render/junction_field";
import { PLUCK_FRAG, PLUCK_STILL_FRAG } from "../../src/render/pluck_overlay";
import { TriFanMesh } from "../../src/render/ribbon_mesh";

// K797b/K798: the thread look (fill / border / both) beyond the ribbons:
// fillets read an aLook coordinate (cover strips: across 0..1; fans:
// apex 0 to rim 1), and both pluck programs take the two-band form.
describe("thread look beyond the ribbons", () => {
  it("stamps aLook on fan and cover-strip vertices", () => {
    const m = new TriFanMesh(16, 32);
    m.begin();
    m.pushFan(0, 0, [1, 0, 0, 1, -1, 0], 3);
    m.pushStrip([0, 0, 1, 0, 0, 1, 1, 1], 3);
    const look = m.mesh.geometry.getBuffer("aLook").data as Float32Array;
    // Fan: apex 0, every rim vertex 1.
    expect(Array.from(look.slice(0, 4))).toEqual([0, 1, 1, 1]);
    // Cover strip: left 0, right 1 per sample.
    expect(Array.from(look.slice(4, 8))).toEqual([0, 1, 0, 1]);
  });

  it("gates fillet fill by the look in both fan programs", () => {
    expect(JUNCTION_FRAG).toContain("float lookCoord = strip ? abs(2.0 * vLook - 1.0) : vLook;");
    expect(JUNCTION_FRAG).toContain("if (gk * lookA <= 0.002) discard;");
    const ex = withExploreField(JUNCTION_FRAG);
    expect(ex).toContain("exC.rgb = base * exC.a;");
    expect(ex).toContain("finalColor = exC * vColor * (aM * gk * lookA);");
  });

  it("takes the two-band form in moving and still plucks", () => {
    expect(PLUCK_FRAG).toContain("float strokeSpan(");
    expect(PLUCK_FRAG).toContain("float strokeGhost(");
    expect(PLUCK_FRAG).toContain("bool edgeOnly = lookBorder || lookIntro;");
    expect(PLUCK_STILL_FRAG).toContain("if (lookBorder || lookIntro) c *= lookEdge;");
  });
});
