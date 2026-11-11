// K1291 s2: the thread reveal's looks in rp=outline. The outline's fill
// takes EXPLORE_LOOK_GLSL only up to its shaped cut (which reads today's
// uGapData, absent from the outline programs): exLookGlsl is that slice.
import { describe, expect, it } from "vitest";
import { EXPLORE_LOOK_GLSL } from "../../src/render/explore_glsl";
import { EX_LOOK_GLSL, exLookGlsl } from "../../src/render/outline/outline_app";

describe("exLookGlsl", () => {
  it("keeps kExploreLook and drops the shaped cut", () => {
    expect(EX_LOOK_GLSL).toContain("kExploreLook(");
    expect(EX_LOOK_GLSL).not.toContain("uGapData");
    expect(EX_LOOK_GLSL).not.toContain("highp float kExCutSd;");
    expect(EXPLORE_LOOK_GLSL.startsWith(EX_LOOK_GLSL)).toBe(true);
  });

  it("throws when the cut's anchor is gone or sits before kExploreLook", () => {
    expect(() => exLookGlsl("highp float kExploreLook(int look) { return 1.0; }")).toThrow(/shaped cut moved/);
    expect(() => exLookGlsl("highp float kExCutSd;\nhighp float kExploreLook(int look) { return 1.0; }")).toThrow(
      /shaped cut moved/,
    );
  });

  it("slices a well-formed source right before the cut", () => {
    const src = "float kExploreLook(int l) { return 1.0; }\nhighp float kExCutSd;\nuniform sampler2D uGapData;";
    expect(exLookGlsl(src)).toBe("float kExploreLook(int l) { return 1.0; }\n");
  });
});
