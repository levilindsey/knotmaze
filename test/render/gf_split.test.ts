// K1362 s7: the two-pass split's programs (gf_glsl.ts SPLIT1 / SPLIT2, gf_split.ts). Exactness on the GPU is the cmp
// bench's (0 px against full on 12 scenes, both GPUs); here the text: each pass gets its define and its outputs or
// samplers, the split refuses what it cannot carry, and pass 2 rebuilds pd, pfx, pfy and the corner radii with the
// scan's own lines (a reworded copy could round differently and move pixels).
import { describe, expect, it } from "vitest";
import { gfFs, type GfTier } from "../../src/render/gpu_field/gf_glsl";
import { GF_SPLIT_BYTES, GF_SPLIT_TARGETS } from "../../src/render/gpu_field/gf_split";

const T: GfTier = { p: 3, k: 2, ramps: true };
const count = (s: string, sub: string): number => s.split(sub).length - 1;

describe("gf_split", () => {
  it("defines each pass and its interface", () => {
    const a = gfFs(false, true, T, { split: 1 });
    const b = gfFs(false, true, T, { split: 2 });
    const c = gfFs(false, true, T, { split: 1, splitSkip: true });
    expect(a).toContain("#define SPLIT1 1\n");
    expect(a).not.toContain("#define SPLITSKIP");
    expect(b).toContain("#define SPLIT2 1\n");
    expect(c).toContain("#define SPLITSKIP 1\n");
    expect(a).toContain("#define TIER 1");
    expect(a).toContain("layout(location = 3) out uvec2 o3;");
    expect(b).toContain("uniform highp usampler2D uP0, uP1, uP2, uP3;");
    expect(GF_SPLIT_TARGETS).toBe(4);
    expect(GF_SPLIT_BYTES).toBe(56);
  });

  it("refuses the probe, no tier, and tiers wider than its fields", () => {
    expect(() => gfFs(true, true, T, { split: 1 })).toThrow();
    expect(() => gfFs(false, true, undefined, { split: 2 })).toThrow();
    expect(() => gfFs(false, true, { p: 4, k: 2, ramps: true }, { split: 1 })).toThrow();
    expect(() => gfFs(false, true, { p: 3, k: 3, ramps: true }, { split: 2 })).toThrow();
  });

  it("rebuilds pass 1's values with the scan's own lines", () => {
    const src = gfFs(false, true, T, {});
    for (const line of [
      "float ax = A.x; float ay = A.y; float dx = B.x - ax; float dy = B.y - ay;",
      "float l2 = dx * dx + dy * dy; float u = l2 > 0.0 ? clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0.0, 1.0) : 0.0;",
      "float fx = ax + dx * u; float fy = ay + dy * u; float ex = x - fx; float ey = y - fy; float d2 = ex * ex + ey * ey;",
      "float rx = x - K0.x; float ry = y - K0.y; float rho = sqrt(rx * rx + ry * ry);",
      "bool sec = inSector(k, p); bool inR = rho <= K0.w && sec;",
    ]) expect(count(src, line)).toBeGreaterThanOrEqual(2);
    expect(count(src, "kIn[i] = !inR ? 0 : rho > K0.z - aa ? 2 : 1;")).toBe(1);
    expect(count(src, "kIn[nk] = !inR ? 0 : rho > K0.z - aa ? 2 : 1;")).toBe(1);
  });
});
