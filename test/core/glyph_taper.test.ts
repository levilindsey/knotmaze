// K580: the tangent join's tapered root, as the glyph builder emits it. The
// A_TANGENT exemplar's spur at J (body index 6) is `tangent`: its strand starts at the part
// point R (a degree-1 TURN marked rootStart), runs the root to J and goes on
// as the spur, and carries the root's width profile in Strand.taper.
import { describe, expect, it } from "vitest";
import { buildGlyphGraph, tangentRoot, TAPER_PART_LU, TAPER_PROFILE_N, GU_PER_XH } from "../../src/core/glyphs/glyph_graph";
import { A_TANGENT } from "../../src/core/glyphs/glyph_data";
import { checkStructure } from "../../src/core/tangle_graph";
import { NODE_TYPE } from "../../src/core/types";

const tapered = (xh: number, opts: { taper?: boolean; aLanded?: boolean } = {}) =>
  buildGlyphGraph("a", { xHeight: xh, aTangent: true, ...opts })!.graph.strands.filter((s) => s.taper);

describe("K580: the tangent a's tapered root", () => {
  for (const xh of [2, 3]) {
    it(`the profile at xh ${xh}: double width at R, falling monotonically to normal at J`, () => {
      const b = buildGlyphGraph("a", { xHeight: xh, aTangent: true })!;
      expect(checkStructure(b.graph)).toBe(true);
      const roots = b.graph.strands.filter((s) => s.taper);
      expect(roots.length).toBe(1);
      const s = roots[0];
      // sep: the strokes' separation (LU) at even steps of the root's arc
      // from R to J; joint: J's index in the strand's nodes.
      const { sep, joint } = s.taper!;
      expect(sep.length).toBe(TAPER_PROFILE_N + 1);
      // At R the strokes' inner edges touch, so the root spans both threads
      // at least: the width multiplier 1 + sep / thread width reads 2 or a
      // little more (2.01 at xh 2, 2.15 at xh 3: the root's normal crosses
      // the strokes obliquely there).
      expect(sep[0] / TAPER_PART_LU).toBeGreaterThanOrEqual(1 - 1e-6);
      expect(sep[0] / TAPER_PART_LU).toBeLessThanOrEqual(1.3);
      for (let i = 1; i < sep.length; i++) expect(sep[i], `step ${i}`).toBeLessThanOrEqual(sep[i - 1] + 1e-12);
      expect(sep[sep.length - 1]).toBe(0);
      // R is a degree-1 TURN that starts the root; J is the junction.
      const r = b.graph.nodes.get(s.nodes[0])!;
      expect(r.type).toBe(NODE_TYPE.TURN);
      expect(r.rootStart).toBe(true);
      expect(b.graph.nodes.get(s.nodes[joint])!.type).toBe(NODE_TYPE.JUNCTION);
    });
  }

  it("the part point: where the strokes' medial gap reaches one thread width", () => {
    for (const xh of [2, 3]) {
      const k = GU_PER_XH / xh;
      const root = tangentRoot(A_TANGENT.body, 6, TAPER_PART_LU * k)!;
      expect(root).not.toBeNull();
      // R is on the medial axis, r from both strokes, with 2r the part.
      expect((2 * root.rAt(root.aR)) / k).toBeCloseTo(TAPER_PART_LU, 6);
      expect(root.rAt(0)).toBe(0);
      // The width there reaches past both threads (the nearer outer edge).
      expect(root.sepAt(root.aR) / k).toBeGreaterThanOrEqual(TAPER_PART_LU - 1e-6);
      expect(root.sepAt(0)).toBeCloseTo(0, 9);
      // Both feet lie on their strokes, past J.
      expect(root.aR).toBeGreaterThan(0);
      expect(root.bR).toBeGreaterThan(0);
      expect(root.footC(root.aR)).toBeGreaterThan(0);
      expect(root.footO(root.aR)).toBeGreaterThan(0);
    }
  });

  it("notaper and the landed J build no root", () => {
    for (const xh of [2, 3]) {
      expect(tapered(xh, { taper: false })).toEqual([]);
      expect(tapered(xh, { aLanded: true })).toEqual([]);
      // The K831 a joins at a fork: no tangent spur, no root.
      expect(buildGlyphGraph("a", { xHeight: xh })!.graph.strands.filter((s) => s.taper)).toEqual([]);
    }
  });
});
