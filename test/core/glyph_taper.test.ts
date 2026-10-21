// K580: the tangent join's tapered root, as the glyph builder emits it. The
// a's spur at J (body index 6) is `tangent`: its strand starts at the part
// point R (a degree-1 TURN marked rootStart), runs the root to J and goes on
// as the spur, and carries the root's width profile in Strand.taper.
import { describe, expect, it } from "vitest";
import { buildGlyphGraph, tangentRoot, TAPER_PART_LU, TAPER_PROFILE_N, GU_PER_XH } from "../../src/core/glyphs/glyph_graph";
import { GLYPHS } from "../../src/core/glyphs/glyph_data";
import { checkStructure } from "../../src/core/tangle_graph";
import { NODE_TYPE } from "../../src/core/types";

const tapered = (xh: number, opts: { taper?: boolean; aLanded?: boolean } = {}) =>
  buildGlyphGraph("a", { xHeight: xh, ...opts })!.graph.strands.filter((s) => s.taper);

describe("K580: the tangent a's tapered root", () => {
  for (const xh of [2, 3]) {
    it(`the profile at xh ${xh}: double width at R, falling monotonically to normal at J`, () => {
      const b = buildGlyphGraph("a", { xHeight: xh })!;
      expect(checkStructure(b.graph)).toBe(true);
      const roots = b.graph.strands.filter((s) => s.taper);
      expect(roots.length).toBe(1);
      const s = roots[0];
      // sep: the strokes' separation (LU) at even steps of the root's arc
      // from R to J; joint: J's index in the strand's nodes.
      const { sep, joint } = s.taper!;
      expect(sep.length).toBe(TAPER_PROFILE_N + 1);
      // The thread width at R, so the width multiplier 1 + sep / thread
      // width reads 2 there.
      expect(sep[0] / TAPER_PART_LU).toBeCloseTo(1, 6);
      for (let i = 1; i < sep.length; i++) expect(sep[i], `step ${i}`).toBeLessThanOrEqual(sep[i - 1] + 1e-12);
      expect(sep[sep.length - 1]).toBe(0);
      // R is a degree-1 TURN that starts the root; J is the junction.
      const r = b.graph.nodes.get(s.nodes[0])!;
      expect(r.type).toBe(NODE_TYPE.TURN);
      expect(r.rootStart).toBe(true);
      expect(b.graph.nodes.get(s.nodes[joint])!.type).toBe(NODE_TYPE.JUNCTION);
    });
  }

  it("the part point: where the paired strokes sit one thread width apart", () => {
    for (const xh of [2, 3]) {
      const k = GU_PER_XH / xh;
      const root = tangentRoot(GLYPHS.get("a")!.body, 6, TAPER_PART_LU * k)!;
      expect(root).not.toBeNull();
      expect(root.sepAt(root.aR) / k).toBeCloseTo(TAPER_PART_LU, 6);
      expect(root.sepAt(0)).toBeCloseTo(0, 9);
    }
  });

  it("notaper and the landed J build no root", () => {
    for (const xh of [2, 3]) {
      expect(tapered(xh, { taper: false })).toEqual([]);
      expect(tapered(xh, { aLanded: true })).toEqual([]);
    }
  });
});
