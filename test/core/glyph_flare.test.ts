// K843: junction flares, as the glyph builder emits them (Strand.flare).
// The a carries two on its body (above each tangent attachment), the
// i's stem one on its spur. Units: GU in the glyph, scaled to LU by the
// builder (peak 6 GU at xh 2 = 6/36 LU).
import { describe, expect, it } from "vitest";
import { buildGlyphGraph } from "../../src/core/glyphs/glyph_graph";
import { NODE_TYPE } from "../../src/core/types";

describe("K843: junction flares", () => {
  it("the a's body carries a flare above each attachment, in LU", () => {
    const b = buildGlyphGraph("a", { xHeight: 2 })!;
    const body = b.graph.strands.find((s) => s.flare && !s.taper);
    expect(body).toBeDefined();
    expect(body!.flare).toHaveLength(2);
    const [fl, fr] = body!.flare!;
    // L: upward from the junction (toward the exit along the body).
    expect(fl.dir).toBe(1);
    // R: upward from the junction (back toward the top, before travel).
    expect(fr.dir).toBe(-1);
    for (const f of body!.flare!) {
      expect(f.peak).toBeCloseTo(6 / 36, 6);
      expect(f.len).toBeCloseTo(30 / 36, 6);
      // The flare sits at a junction node of the strand.
      expect(b.graph.nodes.get(body!.nodes[f.joint])!.type).toBe(NODE_TYPE.JUNCTION);
    }
  });

  it("the i's stem spur carries one flare at its root, toward the tip", () => {
    const b = buildGlyphGraph("ai", { xHeight: 2 })!;
    const spur = b.graph.strands.find((s) => s.flare && s.taper);
    expect(spur).toBeDefined();
    expect(spur!.flare).toHaveLength(1);
    const f = spur!.flare![0];
    expect(f.dir).toBe(1);
    expect(f.peak).toBeCloseTo(6 / 36, 6);
    expect(f.len).toBeCloseTo(34 / 36, 6);
    expect(b.graph.nodes.get(spur!.nodes[f.joint])!.type).toBe(NODE_TYPE.JUNCTION);
  });
});
