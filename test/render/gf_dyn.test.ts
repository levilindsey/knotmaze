// K1414 part 2 (24C): the pulses and the telegraph under rp=gf (gf_look.ts GfDynTable).
// The declaration's geometry is baked per kept sample; the shader evaluates the trains from
// the reduced clocks. These tests pin the bake and the CPU twins (dynPulseV / dynTeleG)
// against paint_math's kPulseV / kPulseV2 / kPaintAt on the same declaration.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { gfFs } from "../../src/render/gpu_field/gf_glsl";
import {
  GfDynTable,
  dynKey,
  dynPulseV,
  dynTeleG,
  lookForm,
  type DynUniforms,
  type GfDynSource,
} from "../../src/render/gpu_field/gf_look";
import { cornerPlan, GF_TIERS } from "../../src/render/gpu_field/gf_pass";
import { kPaintAt, kPulseV, kPulseV2, type KChain, type KData, type KPaintState, type KUniforms } from "../../src/render/paint_math";

describe("K1414 part 2 gf dyn table", () => {
  // As gf_paint.test: chain 0 an open line (5 samples, controls at arcs
  // 0..4), chain 1 a closed square (4 samples, controls at arcs 0..3).
  const geom = new Float32Array(64);
  geom.set([4, 1, 0, 0, 0, 1, 2, 3, 4, 0, 0, 0], 0);
  geom.set([4, 1, 0, 0, 0, 1, 2, 3], 16);
  const kd = { stat: new Float32Array(16), geom, reveal: new Float32Array(4), paint: new Float32Array(4) } as KData;
  const kcv = [
    { ch: 0, nCtrl: 5, closed: false, count: 5, idx: 0, geom: 0, total: 4, arcPer: 1 },
    { ch: 1, nCtrl: 4, closed: true, count: 4, idx: 0, geom: 4, total: 4, arcPer: 1 },
  ] as unknown as KChain[];
  const chainSamples = [
    { positions: new Float32Array([0, 0, 1, 0, 2, 0, 3, 0, 4, 0]), count: 5 },
    { positions: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), count: 4 },
  ];
  const src = (over: Partial<GfDynSource>): GfDynSource => ({
    kd, kcv, chainSamples, paintSpans: [], paintCaps: [], paintPulses: [], paintTele: null, teleGap: 0.5, ...over,
  });
  const U: DynUniforms = { travelIn: 0.7, travelOut: 0.2, spacing: 2.5, fadeIn: 0.9, reach: 3, reachFade: 1, hoverBreath: 0.6, head: 0 };
  const kU = {
    uKPaint: new Float32Array([1, 0, 0, U.hoverBreath]),
    uKPulse: new Float32Array([U.travelIn, U.travelOut, U.spacing, U.fadeIn]),
    uKReach: new Float32Array([U.reach, U.reachFade, 0, 0]),
    uKHead: new Float32Array([U.head]),
    uKTeleAt: new Float32Array([0]),
  } as unknown as KUniforms;

  it("bakes a pulse arm's field per sample; dynPulseV matches kPulseV", () => {
    const T = new GfDynTable();
    const V = T.values(src({ paintPulses: [{ chain: 0, cJunction: 0, cFar: 4, inward: false, hovered: false, dist0: 0.5 }] }));
    expect(T.nPos).toBe(10);
    // chain 0 samples at arcs 0..4: gA = 0.5 + arc, present, endWin clamped at the far end
    for (let k = 0; k < 5; k++) {
      const o = k * 12;
      expect(V[o + 2]).toBe(16);
      expect(dynPulseV(V[o], V[o + 1], V[o + 2], V[o + 3], U)).toBeCloseTo(kPulseV(kU, k, 4, false, false, 0.5, false), 6);
    }
    // chain 1 carries no arm
    expect(V[5 * 12 + 2]).toBe(0);
    expect(dynPulseV(0, 0, 0, 0, U)).toBe(0);
  });

  it("bakes a two-ended arm; dynPulseV matches kPulseV2", () => {
    const T = new GfDynTable();
    const V = T.values(src({ paintPulses: [{ chain: 0, cJunction: 0, cFar: 4, inward: true, hovered: false, dist0: 0.25, two: true, dB: 1.5, inwardB: false }] }));
    for (let k = 0; k < 5; k++) {
      const o = k * 12;
      expect(V[o + 2]).toBe(16 | 1 | 4);
      expect(dynPulseV(V[o], V[o + 1], V[o + 2], V[o + 3], U)).toBeCloseTo(kPulseV2(kU, k, 4, 0.25, 1.5, true, false, false), 6);
    }
  });

  it("bakes the telegraph's strongest piece; dynTeleG matches kPaintAt's TELE branch", () => {
    const T = new GfDynTable();
    const V = T.values(src({ paintTele: [{ chain: 0, c0: 1, c1: 3, alpha: 0.8, j0: true, j1: true }] }));
    // the same declaration as a KPAINT TELE item (writePaintItems: gaps rimGap, fades 0.2)
    const paint = new Float32Array(256);
    const D = { ...kd, paint } as KData;
    paint.set([0, 1, 0, 0], 2 * 4); // chain 0, ctrl slot 2: first item 0, one item
    paint.set([0, 0, 0, 0], 0); // ref texel 0 -> item 0 (refBase 0)
    paint.set([9, 1, 3, 0.8, 0.5, 0.5, 0.2, 0.2], 10 * 4); // itemBase 10: T0, T1
    const UU = { ...kU, uKPaint: new Float32Array([1, 0, 10, 0.5]) } as unknown as KUniforms;
    const st: KPaintState = { p: 0, band: false, v: 0, rim: 0, tele: 0 };
    kPaintAt(D, UU, kcv[0], 2, 2, 0, st);
    const o = 2 * 12;
    expect(V[o + 7]).toBeCloseTo(0.8, 6);
    expect(dynTeleG(V[o + 4], V[o + 5], V[o + 6], V[o + 7], V[o + 8], V[o + 9], V[o + 10], V[o + 11], 0)).toBeCloseTo(st.tele, 6);
    expect(st.tele).toBeGreaterThan(0);
    // outside the piece: nothing baked
    expect(V[0 * 12 + 7]).toBe(0);
  });

  it("a riding telegraph end follows the spot arc (dynTeleG vs kPaintAt with uKTeleAt)", () => {
    const T = new GfDynTable();
    const V = T.values(src({ paintTele: [{ chain: 0, c0: 0, c1: 4, alpha: 1, j0: false, j1: true, ride: 0 }] }));
    expect(T.rideChain).toBe(0);
    const o = 3 * 12; // sample at arc 3
    expect(V[o + 10]).toBeLessThan(0); // fade0 negative: end 0 rides
    const paint = new Float32Array(256);
    const D = { ...kd, paint } as KData;
    paint.set([0, 1, 0, 0], 3 * 4);
    paint.set([9, 0, 4, 1, 0, 0.5, -0.3, 0.2], 10 * 4);
    const UU = { ...kU, uKPaint: new Float32Array([1, 0, 10, 0.5]), uKTeleAt: new Float32Array([1.5]) } as unknown as KUniforms;
    const st: KPaintState = { p: 0, band: false, v: 0, rim: 0, tele: 0 };
    kPaintAt(D, UU, kcv[0], 3, 3, 0, st);
    // the baked frame's riding arc: the spot ctrl 1.5 at arc 1.5 (fixture arcs = ctrls)
    expect(dynTeleG(V[o + 4], V[o + 5], V[o + 6], V[o + 7], V[o + 8], V[o + 9], V[o + 10], V[o + 11], 1.5)).toBeCloseTo(st.tele, 6);
  });

  it("dynKey moves with the pulse/telegraph declaration and only with it", () => {
    const a = { paintPulses: [{ chain: 0, cJunction: 0, cFar: 4, inward: false, hovered: false }], paintTele: null, teleGap: 0.5 };
    expect(dynKey({ ...a, paintPulses: [{ chain: 0, cJunction: 0, cFar: 4, inward: false, hovered: false }] })).toBe(dynKey(a));
    expect(dynKey({ ...a, paintPulses: [] })).not.toBe(dynKey(a));
    expect(dynKey({ ...a, paintTele: [{ chain: 0, c0: 1, c1: 3, alpha: 1, j0: true, j1: false }] })).not.toBe(dynKey(a));
    expect(dynKey({ ...a, teleGap: 0.25 })).not.toBe(dynKey(a));
  });

  it("the look form evaluates pulses and the telegraph over the baked table; the originals are untouched", () => {
    const T = GF_TIERS[0];
    const programs = [...cornerPlan(T).map((e) => gfFs(false, true, e.tier)), gfFs(false, true)];
    for (const s of programs) {
      const f = lookForm(s);
      expect(f).toContain("uniform highp sampler2D uDyn;");
      expect(f).toContain("lkPulse(lab, lq)");
      expect(f).toContain("lkTele(lab, lq)");
      expect(f).toContain("uTeleAtU");
      expect(s).not.toContain("uDyn");
    }
    const app = readFileSync(new URL("../../src/render/gpu_field/gf_app.ts", import.meta.url), "utf8");
    expect(app).toContain("new GfDynTable()");
    expect(app).toContain("dynKey(");
    const pass = readFileSync(new URL("../../src/render/gpu_field/gf_pass.ts", import.meta.url), "utf8");
    expect(pass).toContain("uDyn");
    expect(pass).toContain("TEXTURE9");
  });
});
