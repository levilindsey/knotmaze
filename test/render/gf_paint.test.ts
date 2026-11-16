// K1405: the gold traveled path under rp=gf (gf_look.ts GfPaintTable).
// The fabric's paint declaration (traveled spans + junction caps, the
// memory trail's fade included) is baked per kept sample in the look
// positions' layout; the look form mixes the label's colour toward gold.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { gfFs } from "../../src/render/gpu_field/gf_glsl";
import { GfPaintTable, lookForm, paintKey, paintPAt, type GfPaintSource } from "../../src/render/gpu_field/gf_look";
import { cornerPlan, GF_TIERS } from "../../src/render/gpu_field/gf_pass";
import type { KChain, KData } from "../../src/render/paint_math";

describe("K1405 gf paint table", () => {
  // As gf_look.test: chain 0 an open line (5 samples, controls at arcs
  // 0..4), chain 1 a closed square (4 samples, controls at arcs 0..3).
  const geom = new Float32Array(64);
  geom.set([4, 1, 0, 0, 0, 1, 2, 3, 4, 0, 0, 0], 0);
  geom.set([4, 1, 0, 0, 0, 1, 2, 3], 16);
  const kd = { stat: new Float32Array(16), geom, reveal: new Float32Array(4), paint: new Float32Array(4) } as KData;
  const kcv = [
    { ch: 0, nCtrl: 5, closed: false, count: 5, geom: 0, total: 4 },
    { ch: 1, nCtrl: 4, closed: true, count: 4, geom: 4, total: 4 },
  ] as unknown as KChain[];
  const chainSamples = [
    { positions: new Float32Array([0, 0, 1, 0, 2, 0, 3, 0, 4, 0]), count: 5 },
    { positions: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), count: 4 },
  ];
  const src = (paintSpans: GfPaintSource["paintSpans"], paintCaps: GfPaintSource["paintCaps"] = []): GfPaintSource =>
    ({ kd, kcv, chainSamples, paintSpans, paintCaps });

  it("bakes traveled spans and caps per sample, in the look positions' layout", () => {
    const T = new GfPaintTable();
    const V = T.values(src([{ chain: 0, c0: 1, c1: 3 }], [{ chain: 0, ctrl: 4, radius: 0.6, p: 1 }]));
    expect(T.nPos).toBe(10);
    // chain 0 at pb 0: the span golds arcs 1..3, the cap arc 4, arc 0 bare
    expect([...V.slice(0, 5)]).toEqual([0, 1, 1, 1, 1]);
    // chain 1 at pb 5: nothing declared, its closing entry repeats sample 0
    expect([...V.slice(5, 10)]).toEqual([0, 0, 0, 0, 0]);
  });

  it("bakes the memory trail's fade linearly in arc (trail_paint via setPaint spans)", () => {
    const T = new GfPaintTable();
    const V = T.values(src([{ chain: 1, c0: 0, c1: 4, p0: 0, p1: 1 }]));
    expect([...V.slice(5, 10)]).toEqual([0, 0.25, 0.5, 0.75, 0]);
  });

  it("caps never darken (paint_math's goldUOf order), and a brighter cap wins", () => {
    const T = new GfPaintTable();
    const dim = T.values(src([{ chain: 0, c0: 0, c1: 4, p0: 0.4, p1: 0.4 }], [{ chain: 0, ctrl: 2, radius: 0.6, p: 0.2 }]));
    expect(dim[2]).toBeCloseTo(0.4, 6);
    const bright = T.values(src([{ chain: 0, c0: 0, c1: 4, p0: 0.4, p1: 0.4 }], [{ chain: 0, ctrl: 2, radius: 0.6, p: 0.9 }]));
    expect(bright[2]).toBeCloseTo(0.9, 6);
    expect(bright[0]).toBeCloseTo(0.4, 6);
  });

  it("compacts duplicate samples exactly as the look positions do", () => {
    const dup = [
      { positions: new Float32Array([0, 0, 1, 0, 1, 0, 3, 0, 4, 0]), count: 5 },
      chainSamples[1],
    ];
    const T = new GfPaintTable();
    const V = T.values({ kd, kcv, chainSamples: dup, paintSpans: [{ chain: 0, c0: 0, c1: 4, p0: 0, p1: 1 }], paintCaps: [] });
    // kept samples 0,1,3,4 (arcs 0,1,3,4), then the open chain's end pad
    expect([...V.slice(0, 5)]).toEqual([0, 0.25, 0.75, 1, 1]);
  });

  it("paintPAt lerps a segment's two samples and clamps to the chain's end", () => {
    const V = new Float32Array([0, 0.25, 0.75, 1, 1]);
    expect(paintPAt(V, 0, 5, false, 1, 0.5)).toBeCloseTo(0.5, 6);
    expect(paintPAt(V, 0, 5, false, 9, 0.5)).toBe(1);
    expect(paintPAt(V, 0, 5, false, -2, 0.5)).toBe(0);
  });

  it("paintKey moves with the declaration and only with it", () => {
    const a = src([{ chain: 0, c0: 1, c1: 3 }]);
    expect(paintKey(src([{ chain: 0, c0: 1, c1: 3 }]))).toBe(paintKey(a));
    expect(paintKey(src([{ chain: 0, c0: 1, c1: 3, p0: 0.5 }]))).not.toBe(paintKey(a));
    expect(paintKey(src([], [{ chain: 0, ctrl: 2, radius: 0.6 }]))).not.toBe(paintKey(a));
  });

  it("the look form mixes the label colour toward gold; the originals are untouched", () => {
    const T = GF_TIERS[0];
    const programs = [...cornerPlan(T).map((e) => gfFs(false, true, e.tier)), gfFs(false, true)];
    for (const s of programs) {
      const f = lookForm(s);
      expect(f).toContain("uniform highp sampler2D uPt; uniform vec3 uGold;");
      expect(f).toContain("lkCo.rgb = mix(lkCo.rgb, uGold, lkPaint(lab, lq));");
      expect(s).not.toContain("uPt");
    }
  });

  it("gf_app snapshots the paint with each build and refreshes it when the declaration moves", () => {
    const app = readFileSync(new URL("../../src/render/gpu_field/gf_app.ts", import.meta.url), "utf8");
    expect(app).toContain("new GfPaintTable()");
    expect(app).toContain("paintKey(r.paintState)");
    const pass = readFileSync(new URL("../../src/render/gpu_field/gf_pass.ts", import.meta.url), "utf8");
    expect(pass).toContain("uPt");
    expect(pass).toContain("TEXTURE8");
  });
});
