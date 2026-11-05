// K1186 (21E): the probe-only fillet vote override's wiring pin. The
// same-state A/B probe (.claude/probes/K1186/, out21e) forces one arm's
// (top, dives) pair through RibbonRenderer.voteOverride; this pin holds
// the force to rebuildFillets' vote resolution, to the one named arm,
// and the facade to its delegation to Joinery, so a force wired
// anywhere else (or to every arm) cannot pass. The behavioural half
// (override unset renders 0 px at one captured state) is the probe's
// same-build control, not this file.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const joinery = readFileSync(
  new URL("../../src/render/ribbon/joinery.ts", import.meta.url),
  "utf8"
).replace(/\r\n/g, "\n");
const renderer = readFileSync(
  new URL("../../src/render/ribbon_renderer.ts", import.meta.url),
  "utf8"
).replace(/\r\n/g, "\n");

describe("fillet vote override (K1186)", () => {
  it("defaults unset in Joinery (today's votes)", () => {
    expect(joinery).toContain("voteOverride: VoteOverride | null = null;");
  });

  it("applies only in the vote resolution, to the named arm alone", () => {
    const i = joinery.indexOf("a.top = overNear.has(k) && !under;");
    expect(i).toBeGreaterThanOrEqual(0);
    const slice = joinery.slice(i, joinery.indexOf("const armTop", i));
    expect(slice).toContain("a.dives = under && gapNearOf(a) < fillHalf * FILLET_DIVE_NEAR;");
    expect(slice).toContain("if (this.voteOverride !== null && this.voteOverride.key === k) {");
    expect(slice).toContain("a.top = this.voteOverride.top;");
    expect(slice).toContain("a.dives = this.voteOverride.dives;");
    // Nowhere else in Joinery reads the override: the guard (twice)
    // and the two forced writes are its only uses.
    expect(joinery.split("this.voteOverride").length - 1).toBe(4);
  });

  it("the renderer's accessor delegates to Joinery (skipJointPairs' shape)", () => {
    const i = renderer.indexOf("get voteOverride(): VoteOverride | null {");
    expect(i).toBeGreaterThanOrEqual(0);
    const slice = renderer.slice(i, i + 320);
    expect(slice).toContain("return this.joinery.voteOverride;");
    expect(slice).toContain("set voteOverride(v: VoteOverride | null) {");
    expect(slice).toContain("this.joinery.voteOverride = v;");
  });
});
