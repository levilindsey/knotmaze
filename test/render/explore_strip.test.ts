// K268 stage 2 (K275): the thread reveal's strip and fan programs. The arm
// strips write the thread's visibility as premultiplied alpha
// (withExploreStrip) and the fans read and blend them premultiplied
// (withExploreField), so a web fades with its arms and a cap with its
// thread. These pin the texts: every edit lands at an exact-once anchor,
// undoing the edits gives master's program back (the mode off draws
// master's text, which no edit touches), and the premultiplied lookup is
// master's lookup on four channels.
import { describe, expect, it } from "vitest";
import {
  STRIP_EXPLORE_CTRL_GLSL,
  STRIP_EXPLORE_DECL_GLSL,
  STRIP_EXPLORE_OUT_GLSL,
  STRIP_FRAG,
  STRIP_LOOKUP_GLSL,
  STRIP_LOOKUP_P_GLSL,
  withExploreStrip,
} from "../../src/render/arm_strip";
import {
  EXPLORE_DECL_GLSL,
  EXPLORE_FAN_CUT_GLSL,
  EXPLORE_FAN_SURE_GLSL,
  EXPLORE_GAP_CUT_GLSL,
  EXPLORE_GAP_SHAPE_GLSL,
  EXPLORE_GAP_SURE_GLSL,
  EXPLORE_LOOK_GLSL,
  EXPLORE_VIS_GLSL,
} from "../../src/render/explore_glsl";
import { GAP_FRAG_LIB } from "../../src/render/gap_mask";
import { FIELD_EXPLORE_EDITS, JUNCTION_FRAG, withExploreField } from "../../src/render/junction_field";
import { PAINT_GATE_GLSL } from "../../src/render/paint_glsl";
import {
  PLUCK_STILL_EXPLORE_EDITS,
  PLUCK_STILL_FRAG,
  withExploreStill,
} from "../../src/render/pluck_overlay";

function count(s: string, sub: string): number {
  let n = 0;
  for (let i = s.indexOf(sub); i >= 0; i = s.indexOf(sub, i + 1)) n++;
  return n;
}

const MASTER_OUT =
  "  finalColor = vec4(chainMaterial(int(t0.x + 0.5), t0.y + t0.z * fk, t1.x + t1.y * fk, t1.z > 0.5), 1.0);\n";

describe("K268 stage 2: the strip variant", () => {
  const ex = withExploreStrip(STRIP_FRAG);

  it("inserts each piece once, at anchors that occur once in master's text", () => {
    expect(count(STRIP_FRAG, "highp float kStripPx;\n")).toBe(1);
    expect(count(STRIP_FRAG, "  highp float actrl = kCtrlOfArcNear(c, an, kSecK0);\n")).toBe(1);
    expect(count(STRIP_FRAG, MASTER_OUT)).toBe(1);
    expect(count(ex, STRIP_EXPLORE_DECL_GLSL)).toBe(1);
    expect(count(ex, STRIP_EXPLORE_CTRL_GLSL)).toBe(1);
    expect(count(ex, STRIP_EXPLORE_OUT_GLSL)).toBe(1);
    expect(count(ex, MASTER_OUT)).toBe(0);
    // The visibility is the ribbons' own function (kExploreAt), declared
    // before the material reads it.
    expect(STRIP_EXPLORE_DECL_GLSL.startsWith(EXPLORE_VIS_GLSL)).toBe(true);
    expect(ex.indexOf(STRIP_EXPLORE_DECL_GLSL)).toBeLessThan(ex.indexOf("vec3 chainMaterial("));
  });

  it("is master's text once its edits are undone", () => {
    const back = ex
      .replace(STRIP_EXPLORE_DECL_GLSL, "")
      .replace(STRIP_EXPLORE_CTRL_GLSL, "")
      .replace(STRIP_EXPLORE_OUT_GLSL, MASTER_OUT);
    expect(back).toBe(STRIP_FRAG);
  });

  it("writes the material premultiplied by the visibility, which is 1 unless the reveal sets it", () => {
    expect(STRIP_EXPLORE_OUT_GLSL).toContain("kStripVis = 1.0;");
    expect(STRIP_EXPLORE_OUT_GLSL).toContain("finalColor = vec4(exM * kStripVis, kStripVis);");
    expect(STRIP_EXPLORE_CTRL_GLSL).toContain("if (uKExplore.x > 0.5) kStripVis = kExploreAt(c, actrl);");
  });

  it("shares the ribbons' visibility text exactly (EXPLORE_DECL_GLSL starts with it)", () => {
    expect(EXPLORE_DECL_GLSL.startsWith(EXPLORE_VIS_GLSL)).toBe(true);
    expect(EXPLORE_VIS_GLSL).toContain("highp float kExploreAt(");
  });
});

describe("K268 stage 2: the premultiplied lookup", () => {
  it("is master's stripAt on four channels", () => {
    const fromMaster = STRIP_LOOKUP_GLSL.replace("uniform highp sampler2D uStrip;\n", "")
      .replace("vec3 stripAt(", "vec4 stripAtP(")
      .replace(/vec3 ([ab]) = (texelFetch\([^;]*\))\.rgb;/g, "vec4 $1 = $2;");
    expect(STRIP_LOOKUP_P_GLSL).toBe(fromMaster);
  });
});

describe("K268 stage 2: the fan variant", () => {
  const ex = withExploreField(JUNCTION_FRAG);

  it("edits at anchors that occur exactly once in master's text", () => {
    for (const [anchor] of FIELD_EXPLORE_EDITS) {
      expect(count(JUNCTION_FRAG, anchor), anchor).toBe(1);
    }
    expect(count(ex, "vec4 stripAtP(")).toBe(1);
    expect(count(ex, "vec3 armPaint(")).toBe(0);
    expect(count(ex, "vec3 junctionBase(")).toBe(0);
    expect(count(ex, "vec3 junctionField(")).toBe(0);
    expect(count(ex, "finalColor = exC * vColor * (aM * gk * lookA);")).toBe(1);
  });

  it("reads every strip premultiplied", () => {
    // Every lookup in the field goes through stripAtP (stripAt itself stays
    // declared, unused, by master's STRIP_LOOKUP_GLSL).
    const body = ex.slice(ex.indexOf("vec4 jAt(int i)"));
    expect(count(body, "stripAt(")).toBe(0);
    expect(count(body, "stripAtP(")).toBeGreaterThanOrEqual(2);
  });

  it("is master's text once its edits are undone", () => {
    let back = ex;
    for (const [anchor, to] of [...FIELD_EXPLORE_EDITS].reverse()) {
      expect(count(back, to), to).toBe(1);
      back = back.replace(to, anchor);
    }
    expect(back).toBe(JUNCTION_FRAG);
  });
});

// K268 stage 2 (item 3): the fans and the still pluck take the shaped cut.
// Master's inside-silhouette branch, as gapKeepAt runs it.
const MASTER_EARLY =
  "    if (best < sure2) {\n" +
  "      keep = min(keep, 1.0 - (full ? inWin * inFoot : 1.0) * gst);\n" +
  "      continue;\n" +
  "    }\n";
// The fan's copy of it, inside the shaped branch, against the true nearest
// point (sure2 is 0 there; exSure2 keeps master's value). K397: not where the
// dots' shape cuts (kExCutOn).
const FAN_EARLY =
  "      if (best < exSure2 && !kExCutOn) {\n" +
  "        keep = min(keep, 1.0 - (full ? inWin * inFoot : 1.0) * gst);\n" +
  "        continue;\n" +
  "      }\n";
// gapKeepAt's casing distance, which the dots' shape (K397) precedes.
const CASING = "    highp float e = d - hO - margin;\n";

describe("K268 stage 2: the shaped cut's texts", () => {
  it("splits the section variant's declarations byte for byte", () => {
    expect(EXPLORE_DECL_GLSL).toBe(EXPLORE_VIS_GLSL + EXPLORE_LOOK_GLSL);
    expect(EXPLORE_LOOK_GLSL).toContain("highp float kExploreLook(");
    expect(EXPLORE_LOOK_GLSL).toContain("highp float exploreCutCover(");
  });

  it("gives a fan the ribbon's cut plus master's inside-silhouette branch", () => {
    expect(count(GAP_FRAG_LIB, MASTER_EARLY)).toBe(1);
    expect(count(EXPLORE_FAN_CUT_GLSL, FAN_EARLY)).toBe(1);
    expect(EXPLORE_FAN_CUT_GLSL.replace(FAN_EARLY, "")).toBe(EXPLORE_GAP_CUT_GLSL);
    // The branch follows the shaped strength's own early out.
    expect(EXPLORE_FAN_CUT_GLSL.indexOf(FAN_EARLY)).toBeGreaterThan(
      EXPLORE_FAN_CUT_GLSL.indexOf("if (gst <= 0.0) continue;"),
    );
    // A fan's search keeps master's sure2 before it drops the early stop.
    expect(EXPLORE_FAN_SURE_GLSL).toContain("highp float exSure2 = sure2;\n    if (exShaped) sure2 = 0.0;");
    expect(EXPLORE_FAN_SURE_GLSL).not.toContain("!fan");
    expect(EXPLORE_GAP_SURE_GLSL).toContain("full && !fan");
  });
});

describe("K268 stage 2: the fans' shaped cut", () => {
  const ex = withExploreField(JUNCTION_FRAG);

  it("lands the fan texts once, after kSmooth and before gapKeepAt", () => {
    expect(count(ex, EXPLORE_FAN_SURE_GLSL)).toBe(1);
    expect(count(ex, EXPLORE_FAN_CUT_GLSL)).toBe(1);
    expect(count(ex, EXPLORE_GAP_SURE_GLSL)).toBe(0);
    expect(count(ex, "uniform vec4 uKExplore;")).toBe(1);
    expect(count(ex, EXPLORE_LOOK_GLSL)).toBe(1);
    expect(ex.indexOf("highp float kSmooth(")).toBeLessThan(ex.indexOf(EXPLORE_LOOK_GLSL));
    expect(ex.indexOf(EXPLORE_LOOK_GLSL)).toBeLessThan(ex.indexOf("highp float gapKeepAt("));
    // Master's own branch is still there: the mode off and unshaped slots
    // take it as before.
    expect(count(ex, MASTER_EARLY)).toBe(1);
  });

  it("measures a dots cut's casing from the dots' shape (K397), once, before the casing", () => {
    expect(count(ex, EXPLORE_GAP_SHAPE_GLSL)).toBe(1);
    expect(count(ex, EXPLORE_GAP_SHAPE_GLSL + CASING)).toBe(1);
    expect(ex.indexOf(EXPLORE_FAN_CUT_GLSL)).toBeLessThan(ex.indexOf(EXPLORE_GAP_SHAPE_GLSL));
  });
});

describe("K268 stage 2: the still pluck's shaped cut", () => {
  const ex = withExploreStill(PLUCK_STILL_FRAG);
  const kSmooth = PAINT_GATE_GLSL.slice(
    PAINT_GATE_GLSL.indexOf("highp float kSmooth("),
    PAINT_GATE_GLSL.indexOf("}\n", PAINT_GATE_GLSL.indexOf("highp float kSmooth(")) + 2,
  );

  it("declares what master's still fragment lacks, once", () => {
    expect(count(PLUCK_STILL_FRAG, "kSmooth(")).toBe(0);
    expect(count(PLUCK_STILL_FRAG, "uKExplore")).toBe(0);
    expect(count(ex, kSmooth)).toBe(1);
    expect(count(ex, "uniform vec4 uKExplore;")).toBe(1);
    expect(count(ex, EXPLORE_LOOK_GLSL)).toBe(1);
    expect(ex.indexOf(kSmooth)).toBeLessThan(ex.indexOf(EXPLORE_LOOK_GLSL));
    expect(ex.indexOf(EXPLORE_LOOK_GLSL)).toBeLessThan(ex.indexOf("highp float gapKeepAt("));
  });

  it("takes the ribbons' texts (a still pluck draws a ribbon)", () => {
    expect(count(ex, EXPLORE_GAP_SURE_GLSL)).toBe(1);
    expect(count(ex, EXPLORE_GAP_CUT_GLSL)).toBe(1);
    expect(count(ex, EXPLORE_FAN_CUT_GLSL)).toBe(0);
    expect(count(ex, EXPLORE_GAP_SHAPE_GLSL + CASING)).toBe(1);
  });

  it("is master's text once its edits are undone", () => {
    for (const [anchor] of PLUCK_STILL_EXPLORE_EDITS) {
      expect(count(PLUCK_STILL_FRAG, anchor), anchor).toBe(1);
    }
    let back = ex;
    for (const [anchor, to] of [...PLUCK_STILL_EXPLORE_EDITS].reverse()) {
      expect(count(back, to), to).toBe(1);
      back = back.replace(to, anchor);
    }
    expect(back).toBe(PLUCK_STILL_FRAG);
  });
});
