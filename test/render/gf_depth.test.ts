// K1369 s4: rp=gf's builds in flight by gesture (gf_build.ts gfDepth):
// depth 2 while no thread is grabbed, the reveal or not (K1383 s1's depth 1
// outside the reveal cut intro-i to 19.5 builds a second on the Pixel), and
// depth 1 during a drag. An A/B's fixed `depth` wins, and `gesture: false`
// keeps stage 3's one depth.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GF_DEPTH_DRAG, GF_DEPTH_IDLE, gfDepth } from "../../src/render/gpu_field/gf_build";

describe("K1369 s4 depth by gesture", () => {
  it("is 2 at rest, 1 during a drag", () => {
    expect(GF_DEPTH_IDLE).toBe(2);
    expect(GF_DEPTH_DRAG).toBe(1);
    expect(gfDepth({}, false)).toBe(2);
    expect(gfDepth({}, true)).toBe(1);
  });
  it("a fixed depth wins, floored at 1", () => {
    expect(gfDepth({ depth: 1 }, false)).toBe(1);
    expect(gfDepth({ depth: 2 }, true)).toBe(2);
    expect(gfDepth({ depth: 3.7 }, false)).toBe(3);
    expect(gfDepth({ depth: 0 }, false)).toBe(1);
    expect(gfDepth({ depth: 2, gesture: false }, false)).toBe(2);
  });
  it("gesture: false is depth 1 throughout", () => {
    expect(gfDepth({ gesture: false }, false)).toBe(1);
    expect(gfDepth({ gesture: false }, true)).toBe(1);
  });
  it("gf_app asks it with the mirror's grab, for both the post and the gate", () => {
    const src = readFileSync(new URL("../../src/render/gpu_field/gf_app.ts", import.meta.url), "utf8");
    expect(src).toContain("gfDepth(opts(), (ctx.scene.ps?.grabbedParticle ?? -1) >= 0)");
    // busy() and rebuild() both read depth(), never a constant.
    expect(src.match(/flights\.size (<|>=) (d|depth\(\))/g)?.length).toBe(2);
  });
});
