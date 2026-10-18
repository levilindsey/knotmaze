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
import { withExplore, withExplorePaint } from "../../src/render/explore_glsl";
import { GAP_FRAG, GAP_FRAG_LIB, GAP_FRAG_LIB_FAN } from "../../src/render/gap_mask";
import { JUNCTION_FRAG, withExploreField } from "../../src/render/junction_field";
import * as G from "../../src/render/paint_glsl";
import {
  PAINT_GATE_GLSL,
  PAINT_GATE_THREAD_GLSL,
} from "../../src/render/paint_glsl";
import { PLUCK_STILL_FRAG, withExploreStill } from "../../src/render/pluck_overlay";
import { GAP_MASK_FRAG, GAP_ONLY_FRAG, gapOnlyFragExplore } from "../../src/render/ribbon/ribbon_shader";

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
    if (k === "GAP_MASK_FRAG") return GAP_MASK_FRAG;
    const v = (G as unknown as Record<string, string>)[k];
    if (typeof v !== "string") throw new Error(`unknown interpolation ${k}`);
    return v;
  });

const SECTION_EXPLORE_FRAG = withExplorePaint(SECTION_FRAG);
const GAP_EXPLORE_FRAG = gapOnlyFragExplore();
const STRIP_EXPLORE_FRAG = withExploreStrip(STRIP_FRAG);
const JUNCTION_EXPLORE_FRAG = withExploreField(JUNCTION_FRAG);
const STILL_EXPLORE_FRAG = withExploreStill(PLUCK_STILL_FRAG);

describe("K320 stage 1: char budgets", () => {
  it("keeps the slimmed fragments under budget", () => {
    // K320 2b re-pin: SECTION_FRAG is the paint half (mask sample, no
    // search); the gap halves carry the search alone. Measured at 2b:
    // paint 29,366, paint-explore 39,477, gap 17,659, gap-explore 26,821.
    expect(SECTION_FRAG.length).toBeLessThanOrEqual(30_500);
    expect(SECTION_EXPLORE_FRAG.length).toBeLessThanOrEqual(40_500);
    expect(GAP_ONLY_FRAG.length).toBeLessThanOrEqual(18_500);
    expect(GAP_EXPLORE_FRAG.length).toBeLessThanOrEqual(27_500);
    expect(STRIP_FRAG.length).toBeLessThanOrEqual(31_400);
    expect(JUNCTION_FRAG.length).toBeLessThanOrEqual(26_600);
    expect(PLUCK_STILL_FRAG.length).toBeLessThanOrEqual(20_300);
  });

  it("splits the search out of paint (brief 9 invariants)", () => {
    for (const paint of [SECTION_FRAG, SECTION_EXPLORE_FRAG]) {
      expect(paint).not.toContain("gapKeepAt");
      expect(paint).not.toContain("gapNearestFast");
      expect(paint.split("texelFetch(uGapMask").length - 1).toBe(1);
      expect(paint).toContain("gapKeepFromMask(kc.ch)");
    }
    for (const gap of [GAP_ONLY_FRAG, GAP_EXPLORE_FRAG]) {
      expect(gap).toContain("gapKeepAt(");
      expect(gap).not.toContain("kPaintAt");
      expect(gap).not.toContain("kComposePaint");
      expect(gap).not.toContain("kFxColor");
    }
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
    expect(GAP_EXPLORE_FRAG).toContain("gapOverPt(");
  });

  it("gives fans the fan gap library (no ribbon arm, no protect chain)", () => {
    expect(GAP_FRAG_LIB).toContain("bool fan = false;");
    expect(GAP_FRAG_LIB).toContain("gapProtCover(");
    expect(GAP_FRAG_LIB_FAN).toContain("bool fan = true;");
    expect(GAP_FRAG_LIB_FAN).not.toContain("gapProtCover");
    expect(GAP_FRAG_LIB_FAN).not.toContain("gapInterval(");
    expect(GAP_FRAG_LIB_FAN).not.toContain("fa = turn * t1.x;");
    expect(JUNCTION_FRAG).toContain("bool fan = true;");
    expect(GAP_ONLY_FRAG).toContain("bool fan = false;");
  });
});
