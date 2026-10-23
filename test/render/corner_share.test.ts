import { describe, expect, it } from "vitest";
import { buildGlyphGraph } from "../../src/core/glyphs/glyph_graph";
import { ParticleSystem } from "../../src/physics/particle_system";
import {
  cornerWedgeKey,
  roundedCornerKeys,
  type CornerCandidate,
} from "../../src/render/ribbon/corner_share";

const candidates: CornerCandidate[] = [
  { key: "point", gap: 0.3 },
  { key: "bend", gap: 1.2 },
  { key: "valley", gap: 2.4 },
  { key: "pinned-sharp", gap: 0.1, pin: "sharp" },
  { key: "pinned-round", gap: 2.5, pin: "round" },
];

describe("K830 corner share", () => {
  it("uses a stable directed arm-pair key", () => {
    expect(
      cornerWedgeKey(
        4,
        { chain: 1, slot: 7, dir: -1 },
        { chain: 2, slot: 3, dir: 1 }
      )
    ).toBe("4:1:7:-1>2:3:1");
  });

  it("rounds broad wedges first and keeps narrow points sharp", () => {
    expect([...roundedCornerKeys(candidates, 0.4)].sort()).toEqual([
      "pinned-round",
      "valley",
    ]);
  });

  it("honors the endpoints for unpinned corners", () => {
    expect([...roundedCornerKeys(candidates, 0)]).toEqual(["pinned-round"]);
    expect([...roundedCornerKeys(candidates, 1)].sort()).toEqual([
      "bend",
      "pinned-round",
      "point",
      "valley",
    ]);
  });

  it("lets builder pins override the share", () => {
    const atZero = roundedCornerKeys(candidates, 0);
    expect(atZero.has("pinned-round")).toBe(true);
    expect(atZero.has("pinned-sharp")).toBe(false);
    const atOne = roundedCornerKeys(candidates, 1);
    expect(atOne.has("pinned-sharp")).toBe(false);
  });

  it("carries glyph spur pins to graph nodes and fused junctions", () => {
    const built = buildGlyphGraph("a", {
      xHeight: 2,
      glyphFor: (g) => ({
        ...g,
        spurs: g.spurs.map((s, i) =>
          i === 0 ? { ...s, cornerPin: "sharp" as const, landCornerPin: "round" as const } : s
        ),
      }),
    })!;
    expect(built.graph.nodes.get("tj0")?.cornerPin).toBe("sharp");
    expect(built.graph.nodes.get("tl0")?.cornerPin).toBe("round");

    const ps = new ParticleSystem(built.graph);
    expect(ps.fusedJunctionPins).toContain("sharp");
    expect(ps.fusedJunctionPins).toContain("round");
    expect(ps.fusedJunctionPins.length).toBe(ps.fusedJunctions.length);
  });
});
