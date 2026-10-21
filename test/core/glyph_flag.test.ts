// K580 s5: the glyph flag (core Strand.glyph). The glyph graph (#glyphs2)
// sets it on every strand it builds, tapered and notaper alike, so the
// renderer can give a glyph's fused spur tips the stadium cap cover
// (src/render/ribbon/tip_stadium.ts) while maze bridges keep the disc alone.
// Nothing else sets it: not the Hershey text path, not a maze.
import { describe, expect, it } from "vitest";
import { buildTextGraph } from "../../src/core/text_graph";
import { buildSceneGraph } from "../../src/core/scene_graph";
import { fabricScene } from "../physics/fabric_scene";
import { NODE_TYPE } from "../../src/core/types";
import type { TangleGraph } from "../../src/core/types";

// Strands with a fused spur tip: an end node that is a junction, the way the
// renderer finds chainTipFused (the strand's first or last node).
const fusedTipStrands = (g: TangleGraph) =>
  g.strands.filter((s) => {
    if (s.closed || s.nodes.length < 2) return false;
    const a = g.nodes.get(s.nodes[0]);
    const b = g.nodes.get(s.nodes[s.nodes.length - 1]);
    return a?.type === NODE_TYPE.JUNCTION || b?.type === NODE_TYPE.JUNCTION;
  });

describe("K580 s5: the glyph flag", () => {
  // "1" is the bare #glyphs2 (xh 3, tapered).
  const modes = ["1", "xh2", "notaper", "xh2,notaper", "aland", "xh2,aland"];
  for (const text of ["a", "ai"]) {
    for (const mode of modes) {
      it(`every strand of "${text}" under #glyphs2=${mode} is a glyph strand`, () => {
        const g = buildTextGraph(text, { glyphs2: mode });
        expect(g.strands.length).toBeGreaterThan(0);
        for (const [i, s] of g.strands.entries()) expect(s.glyph, `strand ${i}`).toBe(true);
        // The flag matters only where a spur meets a junction: there is one
        // in every mode (the a's stem foot; the i's joint in "ai").
        expect(fusedTipStrands(g).length).toBeGreaterThan(0);
      });
    }
  }

  it("notaper has the flag although it has no tapered root", () => {
    const g = buildTextGraph("a", { glyphs2: "xh2,notaper" });
    expect(g.strands.some((s) => s.taper)).toBe(false);
    expect(g.strands.every((s) => s.glyph === true)).toBe(true);
  });

  it("the Hershey text path sets no flag", () => {
    const g = buildTextGraph("ai", { glyphs2: "" });
    expect(g.strands.length).toBeGreaterThan(0);
    expect(g.strands.some((s) => s.glyph !== undefined)).toBe(false);
  });

  it("a maze sets no flag", () => {
    const { params } = fabricScene("?7&gs=8");
    const g = buildSceneGraph(params).graph;
    expect(fusedTipStrands(g).length).toBeGreaterThan(0);
    expect(g.strands.some((s) => s.glyph !== undefined)).toBe(false);
  });
});
