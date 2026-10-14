import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  BLIT_FRAG,
  FOG_FRAG,
  FOG_VERT,
  QUAD_VERT,
  effectFragment,
  effectProgram,
} from "../../src/render/background_shaders";
import { readsDetail } from "../../src/render/background_model";
import type { BackgroundId } from "../../src/render/background_model";

const sha256 = (text: string): string =>
  createHash("sha256").update(text).digest("hex");

// The shader sources of master 66ee658 (K21 + K79 stage A). At their
// defaults every effect draws its K21 / stage-A program byte for byte:
// the stage-B shape params switch an effect to its shaped `<id>-x`
// program only when one of them leaves its default. A changed hash here
// changes every default frame - take a same-state A/B against the
// previous build (probes/K79 run_ab.ps1) before re-pinning it.
const DEFAULT_PROGRAMS: Record<string, string> = {
  vellum: "c12b86646beffc2d76a643bd1d84a63dd3e305ec7d5535063be5baea462b2ea8",
  "vellum-drift":
    "71fdf3786a48c265b6e6376a97344eb13cf16d5dd5ca3fda7947db03a5470758",
  mist: "db2b1f593b6eefad37ed7fe50105f8212902bdce8646483ff06648a7502c3f82",
  wash: "0d0a2b232b5452a24a1109e7a4eae776c4b1e2c46d62bf346fd4f2f84d388894",
  silk: "99ad5edaf5c096608933985a34193582b21ff71372ef5d1eab48cc002cb6e617",
  aurora: "81c625bdaeb997f2c957827390a0b1ac4a73fbd6b31d3de6d38efd6e22d7786e",
  contours: "6be77259776c50f8a5111ab806f2b4ae8dc3782e4b225f80ce76ca507cbcb08f",
};
const SHARED_SOURCES: Record<string, [string, string]> = {
  QUAD_VERT: [
    QUAD_VERT,
    "ef404af733b8654d90e6a1033f446b452d68f7a9cb65adf40ad45337f40f618b",
  ],
  BLIT_FRAG: [
    BLIT_FRAG,
    "70901ef59c043ac5305d998f7919002893d5143b9e0004847538a7492f744a5b",
  ],
  FOG_VERT: [
    FOG_VERT,
    "2e1654b1907fd90ee5ffee4e392a7427a6b4cc4bacccef657d47303a7fecaa76",
  ],
  FOG_FRAG: [
    FOG_FRAG,
    "5893e5cb8c081e3423f35513eb5fa58c61cdd1e6b16f8a07ab787d801035c16a",
  ],
};
const EFFECTS = ["vellum", "mist", "wash", "silk", "aurora", "contours"];

describe("background shader sources (K79 stage B)", () => {
  it("keeps every default program byte for byte", () => {
    for (const [id, hash] of Object.entries(DEFAULT_PROGRAMS)) {
      expect(sha256(effectFragment(id)), id).toBe(hash);
    }
  });

  it("keeps the blit and the fog backdrop byte for byte", () => {
    for (const [name, [text, hash]] of Object.entries(SHARED_SOURCES)) {
      expect(sha256(text), name).toBe(hash);
    }
  });

  it("gives every effect a shaped program, and only those read uShape", () => {
    for (const id of EFFECTS) {
      const shaped = effectFragment(`${id}-x`);
      expect(shaped, id).toContain("uniform vec4 uShape;");
      expect(shaped, id).toContain("uniform vec4 uShape2;");
      expect(shaped, id).toContain("uShape.x");
      expect(shaped, id).not.toBe(effectFragment(id));
    }
    for (const id of Object.keys(DEFAULT_PROGRAMS)) {
      expect(effectFragment(id), id).not.toContain("uShape");
    }
  });

  it("swaps silk's seed angle for a set one, and fbm's gain for detail", () => {
    const silk = effectFragment("silk-x");
    expect(silk).toContain(
      "float a = uShape2.x < 0.0 ? uParams.y * 0.3 : uShape2.x;"
    );
    expect(silk).not.toContain("  float a = uParams.y * 0.3;\n");
    expect(effectFragment("silk")).toContain("  float a = uParams.y * 0.3;\n");
    // Only the effects that read detail get the roughness fbm; vellum and
    // aurora keep the designed fbm in their shaped programs.
    for (const id of EFFECTS) {
      expect(effectFragment(`${id}-x`).includes("a *= uShape.y;"), id).toBe(
        readsDetail(id as BackgroundId)
      );
      expect(effectFragment(id), id).not.toContain("a *= uShape.y;");
    }
    expect(effectFragment("vellum-x")).not.toContain("a *= uShape.y;");
    expect(effectFragment("aurora-x")).not.toContain("a *= uShape.y;");
    expect(effectFragment("vellum-x")).toContain("uShape.z");
    expect(effectFragment("vellum-x")).toContain("uShape.w");
  });

  it("names the program an effect renders with", () => {
    expect(effectProgram("vellum", 0)).toBe("vellum");
    expect(effectProgram("vellum", 1)).toBe("vellum-drift");
    expect(effectProgram("mist", 5)).toBe("mist");
    expect(effectProgram("silk", 0, true)).toBe("silk-x");
    expect(effectProgram("vellum", 3, true)).toBe("vellum-x");
    expect(effectProgram("contours", 0, false)).toBe("contours");
  });

  it("refuses an unknown effect, shaped or not", () => {
    expect(() => effectFragment("bogus")).toThrow();
    expect(() => effectFragment("bogus-x")).toThrow();
    expect(() => effectFragment("vellum-drift-x")).toThrow();
    expect(() => effectFragment("none")).toThrow();
  });
});
