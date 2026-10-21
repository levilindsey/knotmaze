// K320 stage 1: the slim bundle's guards. The section-rgb family ships
// per-consumer library forms (paint_glsl's GATE / PAINT forms, gap_mask's
// ribbon / fan gap libraries); the functions each program never calls are
// absent from its text, and the fragment sizes stay under budget (a new
// program-text addition pays a cold recompile for every player, so growth
// past the budget is a deliberate decision, not drift). Baselines at
// bd3933a (docs/design/K320_section_rgb.md): section-rgb 48,737,
// section-rgb-explore 64,764, arm-strip 33,122, junction-field 29,599,
// pluck-still 21,075. Program texts are rebuilt from the exported chunks
// (GlPrograms are never built here: pixi's constructor needs a DOM).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { STRIP_FRAG, withExploreStrip } from "../../src/render/arm_strip";
import { withExplore } from "../../src/render/explore_glsl";
import { GAP_FRAG, GAP_FRAG_LIB, GAP_FRAG_LIB_FAN } from "../../src/render/gap_mask";
import { JUNCTION_FRAG, withExploreField } from "../../src/render/junction_field";
import * as G from "../../src/render/paint_glsl";
import {
  PAINT_GATE_GLSL,
  PAINT_GATE_THREAD_GLSL,
} from "../../src/render/paint_glsl";
import { PLUCK_STILL_FRAG, withExploreStill } from "../../src/render/pluck_overlay";

// The section fragment as ribbon/ribbon_shader.ts writes it (the same
// slice paint_explore.test.ts and the K320 probe use), interpolated with
// the chunks it names.
const src = readFileSync(new URL("../../src/render/ribbon/ribbon_shader.ts", import.meta.url), "utf8").replace(
  /\r\n/g,
  "\n"
);
const start = src.indexOf("const SECTION_FRAG = /* glsl */ `");
const SECTION_FRAG = src
  .slice(start, src.indexOf("`;", start))
  .replace(/\$\{(\w+)\}/g, (_, k: string) => {
    if (k === "GAP_FRAG") return GAP_FRAG;
    const v = (G as unknown as Record<string, string>)[k];
    if (typeof v !== "string") throw new Error(`unknown interpolation ${k}`);
    return v;
  });

const SECTION_EXPLORE_FRAG = withExplore(SECTION_FRAG);
const STRIP_EXPLORE_FRAG = withExploreStrip(STRIP_FRAG);
const JUNCTION_EXPLORE_FRAG = withExploreField(JUNCTION_FRAG);
const STILL_EXPLORE_FRAG = withExploreStill(PLUCK_STILL_FRAG);

describe("K320 stage 1: char budgets", () => {
  it("keeps the slimmed fragments under budget", () => {
    // K525 (2026-10-20) raised the section's two on purpose: the telegraph
    // rims (paint_glsl.ts TELE_ITEM_GLSL, ribbon-only) add 797 characters to
    // both (46,047 -> 46,844 and 62,462 -> 63,259 here), one cold compile
    // of section-rgb and its explore variant per player. The strip, the
    // junction field and the plucks keep their text byte for byte.
    // K620 (2026-10-20) raised them again: the glyph root's paint
    // (paint_glsl.ts ROOT_FRAG_GLSL, the vKR* varyings and one SECTION_FRAG
    // line, ribbon-only) adds 1,545 characters to both (46,844 -> 48,389
    // and 63,259 -> 64,804 here); one more cold compile of each per player.
    expect(SECTION_FRAG.length).toBeLessThanOrEqual(48_450);
    expect(SECTION_EXPLORE_FRAG.length).toBeLessThanOrEqual(64_850);
    expect(STRIP_FRAG.length).toBeLessThanOrEqual(31_400);
    expect(JUNCTION_FRAG.length).toBeLessThanOrEqual(26_600);
    expect(PLUCK_STILL_FRAG.length).toBeLessThanOrEqual(20_300);
  });
});

describe("K320 stage 1: dead text stays out of its non-consumers", () => {
  it("drops the fan gate chain from the thread programs, keeps it for fans", () => {
    for (const t of [SECTION_FRAG, SECTION_EXPLORE_FRAG, STRIP_FRAG]) {
      expect(t).not.toContain("float knotFanAlpha(");
      expect(t).not.toContain("float kFanAlpha(");
      expect(t).not.toContain("float kFxWeight(");
    }
    expect(JUNCTION_FRAG).toContain("float knotFanAlpha(");
    expect(PAINT_GATE_GLSL).toContain("float knotFanAlpha(");
    expect(PAINT_GATE_THREAD_GLSL).not.toContain("knotFanAlpha");
  });

  it("drops each compose form from the program that never calls it", () => {
    expect(SECTION_FRAG).not.toContain("vec3 kComposePaintFlat(");
    expect(SECTION_FRAG).toContain("vec3 kComposePaintAcross(");
    expect(STRIP_FRAG).not.toContain("vec3 kComposePaintAcross(");
    expect(STRIP_FRAG).toContain("vec3 kComposePaintFlat(");
  });

  it("ships no kArcScale or gapPt anywhere (explore calls gapOverPt)", () => {
    for (const t of [
      SECTION_FRAG,
      SECTION_EXPLORE_FRAG,
      STRIP_FRAG,
      STRIP_EXPLORE_FRAG,
      JUNCTION_FRAG,
      JUNCTION_EXPLORE_FRAG,
      PLUCK_STILL_FRAG,
      STILL_EXPLORE_FRAG,
    ]) {
      expect(t).not.toContain("kArcScale");
      expect(t).not.toContain("gapPt(");
    }
    expect(SECTION_EXPLORE_FRAG).toContain("gapOverPt(exT4, exT9, bk)");
    expect(SECTION_EXPLORE_FRAG).toContain("gapOverPt(t4, t9, bk2)");
  });

  it("gives fans the fan gap library (no ribbon arm, no protect chain)", () => {
    expect(GAP_FRAG_LIB).toContain("bool fan = false;");
    expect(GAP_FRAG_LIB).toContain("gapProtCover(");
    expect(GAP_FRAG_LIB_FAN).toContain("bool fan = true;");
    expect(GAP_FRAG_LIB_FAN).not.toContain("gapProtCover");
    expect(GAP_FRAG_LIB_FAN).not.toContain("gapInterval(");
    expect(GAP_FRAG_LIB_FAN).not.toContain("fa = turn * t1.x;");
    expect(JUNCTION_FRAG).toContain("bool fan = true;");
    expect(SECTION_FRAG).toContain("bool fan = false;");
  });
});
