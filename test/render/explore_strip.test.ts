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
import { EXPLORE_DECL_GLSL, EXPLORE_VIS_GLSL } from "../../src/render/explore_glsl";
import { FIELD_EXPLORE_EDITS, JUNCTION_FRAG, withExploreField } from "../../src/render/junction_field";

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
    expect(count(ex, "finalColor = exC * vColor * (aM * gk);")).toBe(1);
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
