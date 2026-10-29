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
import { G3_CHAIN_GLSL, JUNCTION_CUT_GLSL } from "../../src/render/fabric_sdf";
import { bandEdgeSources } from "../../src/render/label/label_band_gpu";
import { labelSources } from "../../src/render/label/label_glsl";
import { DATA_W } from "../../src/render/label/label_pieces";
import { TBL_W } from "../../src/render/label/label_tables";

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
    if (k === "G3_CHAIN_GLSL") return G3_CHAIN_GLSL;
    if (k === "JUNCTION_CUT_GLSL") return JUNCTION_CUT_GLSL;
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
    // K620 (2026-10-20) raised them again: the glyph root's section blend
    // (paint_glsl.ts ROOT_FRAG_GLSL, the vKR* varyings and one SECTION_FRAG
    // line, ribbon-only, no extra kFxColor call) adds 762 characters to both
    // (46,844 -> 47,606 and 63,259 -> 64,021 here); one more cold compile of
    // each per player.
    // K324 stage 2 (K654, 2026-10-20) raised them again: the riding lead
    // (`uniform vec4 uKTeleAt;`, the two `T1.z < 0.0 ? uKTeleAt.x :` end
    // picks and two abs() on the fades) adds 85 to both (47,606 -> 47,691
    // and 64,021 -> 64,106 here); the rest stay byte for byte.
    // K797b (2026-10-21): the thread look (uKLook + the edge-stroke block
    // in SECTION_FRAG, ribbon-only) adds 779 to both (47,691 -> 48,470
    // and 64,106 -> 64,885 here); one more cold compile of each per player.
    // K798 (2026-10-21): the border-at-a-time intro gate in SECTION_FRAG
    // adds 481 to both (48,470 -> 48,951 and 64,885 -> 65,366 here).
    // K799 (2026-10-21): the traveled-path look (uKPath and the gold
    // width/texture mask, ribbon-only) adds 1,071 to both (48,951 ->
    // 50,022 and 65,366 -> 66,437 here).
    // K137 fray (2026-10-21): the FRAY paint item (kPaintAt branch +
    // kFrayHere) and the ribbon's pale/thin compose add 1,314 to both
    // (50,080 -> 51,394 measured here); budgets follow the measurement.
    // K813 (2026-10-22): the highlights' colors and widths and the
    // border look's interior highlights (the uKHl* uniforms, kTeleAcross,
    // the pulse/fray widths and the over-nothing compose in
    // SECTION_FRAG) add 2,594 to the section pair (51,394 -> 53,988 and
    // 67,794 -> 70,403 measured here), 640 to the strips (31,849 ->
    // 32,489; the shared paint core), 92 to the junction field and 9 to
    // the still pluck (the shared uniform block).
    // K820 (2026-10-22): the border stroke's width and color and the
    // gold grain's strength (uKBorder, uKLook.w, uKHlPulse.w and the
    // stroke/grain expressions in the ribbon, fan and pluck texts) add
    // 352 to the section pair (54,020 -> 54,372 and 70,435 -> 70,787
    // measured here), 44 to the junction field and 35 to the still pluck.
    // K832 (2026-10-23): the junction cut (fabric_sdf JUNCTION_CUT_GLSL
    // + the caps fetch G3_CHAIN_GLSL, ribbon fragments only) adds 833
    // to the section pair (54,372 -> 55,205 and 70,787 -> 71,620
    // measured here); the fans' rim-only border outline adds 609 to
    // the junction field (28,235 -> 28,844 measured). The arm strips
    // and the still pluck keep their bytes (the cut chunk is not in
    // the shared fabric text).
    // K835 (2026-10-23): the traveled fill's hand-drawn edge wobble
    // (uKPathB + the ge wobble/swell in both ribbon mains) adds 295
    // to the section pair (55,205 -> 55,500 and 71,620 -> 71,915 measured
    // here); the shared decl adds 22 to the strips, the junction
    // field and the still pluck, which stay inside their budgets.
    // K846 (2026-10-23): the junction side cut (kJunctionSideCut in
    // the same chunk, both ribbon mains) adds 1,687 to the pair
    // (55,500 -> 57,187 and 71,915 -> 73,602 measured here).
    // K849 (2026-10-23): the side cut's world-arc form adds 180 to
    // the pair (57,187 -> 57,367 measured here); the fans' metric
    // rim band adds ~340 to the junction field (under its budget).
    expect(SECTION_FRAG.length).toBeLessThanOrEqual(57_430);
    expect(SECTION_EXPLORE_FRAG.length).toBeLessThanOrEqual(73_850);
    expect(STRIP_FRAG.length).toBeLessThanOrEqual(32_550);
    // K797b/K798 fillets (2026-10-21): the fan look gate and stroke
    // (junction_field.ts) add 755 (26,600 -> 27,355 here).
    // K815: the fans' flank coordinate (aFlank + the fanEdge block) adds
    // 788 to the junction field (27,447 -> 28,235 measured).
    // K849: the fans' rim band (metric block, then the baked-ring
    // form) adds 1,021 (28,844 -> 29,865).
    // K854 (2026-10-26): the fans' solid straddling rim band (the
    // outer-ring discard + the two-AA fanEdge + the pixel-wide tip
    // switch in the border-look block) adds 649 (29,940 -> 30,589
    // measured here).
    expect(JUNCTION_FRAG.length).toBeLessThanOrEqual(30_650);
    // K799: uKPath joins KNOT_UNIFORMS_GLSL, which the still pluck
    // includes (+18 here).
    expect(PLUCK_STILL_FRAG.length).toBeLessThanOrEqual(20_550);
  });

  it("keeps the label and band programs under budget (K868 R10)", () => {
    // K868 S3a4 (2026-10-28): the lbi label's two programs (label_glsl.ts,
    // packed, as LabelPass compiles them) and the band pass's two
    // (label_band.ts, its module-private texts sliced like SECTION_FRAG),
    // both stages, at today's lengths rounded up to the next 50: the
    // headroom the entries above carry (0 to 61 characters). Measured:
    // tube 846 + 1,574, fill 645 + 3,962, band 988 + 2,338, band
    // composite 231 + 345. They compile only with the flag on.
    const lab = labelSources(true, DATA_W);
    expect(lab.tubeVs.length).toBeLessThanOrEqual(850);
    expect(lab.tubeFs.length).toBeLessThanOrEqual(1_600);
    expect(lab.fillVs.length).toBeLessThanOrEqual(650);
    expect(lab.fillFs.length).toBeLessThanOrEqual(4_000);
    // K868 S3a8a (2026-10-28): with the GPU pieces the fills compile from
    // the same text with GPU_FILLS, its blocks kept or dropped in JS
    // (labelSources), so each program carries only its own foot: the
    // z-split fill above is still master's text char for char, and the
    // GPU fill (the table foot and the tube's plateau depthAt) measures
    // 684 + 6,200 here (the vertex stage: its two #defines).
    const gpu = labelSources(true, DATA_W, true, TBL_W);
    expect(gpu.fillVs.length).toBeLessThanOrEqual(700);
    expect(gpu.fillFs.length).toBeLessThanOrEqual(6_250);
    const band = readFileSync(new URL("../../src/render/label/label_band.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n");
    const h0 = band.indexOf("const HEAD = `");
    const HEAD = band.slice(h0 + "const HEAD = `".length, band.indexOf("`;", h0));
    const text = (name: string): string => {
      const i = band.indexOf(`const ${name} = \``);
      expect(i, name).toBeGreaterThan(0);
      return band.slice(i + `const ${name} = \``.length, band.indexOf("`;", i)).replace("${HEAD}", HEAD);
    };
    expect(HEAD).toContain("#version 300 es");
    expect(text("BAND_VS").length).toBeLessThanOrEqual(1_000);
    expect(text("BAND_FS").length).toBeLessThanOrEqual(2_350);
    expect(text("COMP_VS").length).toBeLessThanOrEqual(250);
    expect(text("COMP_FS").length).toBeLessThanOrEqual(350);
    // K868 S3a8b (2026-10-28): the band edges from the tables
    // (label_band_gpu.ts, call 3), both depth variants split in JS
    // (bandEdgeSources), at today's lengths rounded up to the next 50.
    // Measured: vertex 1,949 (both), fragment 1,770 without depth and 3,830
    // with it (the pin table's plateau depthAt).
    const edge = bandEdgeSources(TBL_W, false);
    const edgeD = bandEdgeSources(TBL_W, true);
    expect(edge.vs.length).toBeLessThanOrEqual(1_950);
    expect(edge.fs.length).toBeLessThanOrEqual(1_800);
    expect(edgeD.vs.length).toBeLessThanOrEqual(1_950);
    expect(edgeD.fs.length).toBeLessThanOrEqual(3_850);
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
