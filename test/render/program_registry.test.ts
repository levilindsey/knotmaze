import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PROGRAM_SITES,
  programRegistry,
  type WarmContext,
} from "../../src/render/program_registry";
import { allBackgroundProgramIds, backgroundWarmIds } from "../../src/render/background";
import { BACKGROUNDS } from "../../src/render/background_model";

// K307 stage 2: every pixi program site in src/ must be on the warm-up
// registry, or its first draw links cold and freezes the screen (FXC on
// D3D11: up to 2.8 s). A source scan in K108's style: count the sites per
// file, comments stripped, and compare with the registry's table exactly.
// GlPrograms are never built here (pixi's constructor needs a DOM).

const SITE =
  /GlProgram\.from|new GlProgram\(|Shader\.from|new Filter\b|new \w*Filter\(|new ParticleContainer/g;
const EXCLUDED = new Set(["src/render/program_registry.ts", "src/render/shader_warmup.ts"]);

function scanSites(): Record<string, number> {
  const src = fileURLToPath(new URL("../../src", import.meta.url));
  const out: Record<string, number> = {};
  for (const f of readdirSync(src, { recursive: true }).map(String)) {
    if (!f.endsWith(".ts")) continue;
    const rel = "src/" + f.split("\\").join("/");
    if (EXCLUDED.has(rel)) continue;
    // Strip comments so prose may name a site.
    const text = readFileSync(join(src, f), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    const n = text.match(SITE)?.length ?? 0;
    if (n > 0) out[rel] = n;
  }
  return out;
}

const DAILY: WarmContext = {
  fabric: true,
  explore: false,
  fog: false,
  reduced: false,
  ripple: true,
  bgIds: ["vellum"],
  maxBatchTextures: 16,
};

function wave1Names(ctx: WarmContext): string[] {
  return programRegistry()
    .filter((e) => e.wave1(ctx))
    .map((e) => e.name)
    .sort();
}

describe("program registry (K307)", () => {
  it("lists every program site in src/, per file", () => {
    expect(scanSites()).toEqual(PROGRAM_SITES);
  });

  it("has unique names, and every site file is some entry's", () => {
    const entries = programRegistry();
    const names = entries.map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
    const covered = new Set(entries.flatMap((e) => [...e.files]));
    expect([...covered].sort()).toEqual(Object.keys(PROGRAM_SITES).sort());
  });

  it("puts what the daily's intro draws in wave 1", () => {
    expect(wave1Names(DAILY)).toEqual(
      [
        "batch",
        "bg-blit",
        "bg-vellum",
        "junction-field",
        "arm-strip",
        "knot-marker",
        "particles",
        "pluck-blur",
        "pluck-ripple",
        "section-rgb",
      ].sort(),
    );
  });

  it("follows the mode, the reveal, the fog and reduced motion", () => {
    const knot = wave1Names({ ...DAILY, fabric: false, bgIds: [] });
    expect(knot).toEqual(["batch", "particles", "pluck-blur", "pluck-ripple", "section-rgb"]);
    const reveal = wave1Names({ ...DAILY, explore: true, reduced: true, ripple: false });
    expect(reveal).toEqual(
      [
        "arm-strip-explore",
        "batch",
        "bg-blit",
        "bg-vellum",
        "junction-field-explore",
        "knot-marker",
        "particles",
        "pluck-still-explore",
        "section-rgb-explore",
      ].sort(),
    );
    const fog = wave1Names({ ...DAILY, fog: true, bgIds: ["mist"] });
    expect(fog).toContain("displacement-filter");
    expect(fog).toContain("bg-fog");
    expect(fog).toContain("bg-mist");
    expect(fog).not.toContain("bg-vellum");
  });

  it("has an entry for every program a background can start with", () => {
    const names = new Set(programRegistry().map((e) => e.name));
    const ids = new Set(allBackgroundProgramIds());
    for (const id of BACKGROUNDS) {
      for (const speed of [-1, 0, 1]) {
        for (const shape of [
          { scale: 1, detail: 1, fibers: 1, grain: 1, angle: -1 },
          { scale: 0.5, detail: 2, fibers: 3, grain: 0, angle: 30 },
        ]) {
          for (const pid of backgroundWarmIds(id, 0.5, speed, shape)) {
            expect(ids.has(pid)).toBe(true);
            expect(names.has(`bg-${pid}`)).toBe(true);
          }
        }
      }
      expect(backgroundWarmIds(id, 0, 1, { scale: 1, detail: 1, fibers: 1, grain: 1, angle: -1 })).toEqual([]);
    }
    expect(backgroundWarmIds("none", 1, 1, { scale: 1, detail: 1, fibers: 1, grain: 1, angle: -1 })).toEqual([]);
  });
});
