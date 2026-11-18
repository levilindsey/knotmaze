// K1395 (24D): the appearance reveal's colours under rp=gf (gf_look.ts GfFxTable, gf_reveal.ts's
// width). The bake is pinned against paint_math's kFxColor / kBurnAge / kGlow at the same sample,
// and the reveal table's width against widthMulFor's mask x swell formula.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { gfFs } from "../../src/render/gpu_field/gf_glsl";
import { GfFxTable, LOOK_COMP_FS, fxAt, lookForm } from "../../src/render/gpu_field/gf_look";
import { cornerPlan, GF_TIERS } from "../../src/render/gpu_field/gf_pass";
import { GfRevealTable, revealAt, revealForm, revealWidthAt, type GfRevealSource } from "../../src/render/gpu_field/gf_reveal";
import {
  kBurnAge, kChain, kFxColor, kGlow, kIgnition, kRevealMaskAt, kSwell, kFxAge,
  layoutSources, sourceHints, sourcePieces, writeChainHeader, writeGeomTable,
  type KData, type KSource,
} from "../../src/render/paint_math";
import { knotUniformValues } from "../../src/render/paint_model";

// One open chain, ctrls = arcs 0..4, one front from ctrl 0 at rate 2 (tA = ctrl / 2, done at anim 2).
const N = 5;
const srcs: KSource[] = [{ chain: 0, cFrom: 0, cTo: 4, t0: 0, rate: 2 }];
const pieces = sourcePieces(srcs, N, false);
const lay = layoutSources([pieces]);
const idxBase = 8;
const stat = new Float32Array((idxBase + N + 4) * 4);
writeChainHeader(stat, 0, { nCtrl: N, closed: false, count: N, idxBase, geomBase: 0, srcFirst: lay.first[0], srcCount: lay.count[0], paintBase: 0 });
const hints = sourceHints(pieces, lay.first[0], N);
for (let i = 0; i < N; i++) { stat[(idxBase + i) * 4 + 1] = hints.hints[i]; stat[(idxBase + i) * 4 + 3] = hints.tLate[i]; }
const geom = new Float32Array((2 + Math.ceil(N / 4)) * 4);
writeGeomTable(geom, 0, 4, N, false, [0, 1, 2, 3, 4], 1e9);
const kd = { stat, geom, reveal: lay.data, paint: new Float32Array(4) } as KData;
const c = kChain(kd, 0);
const chainSamples = [{ positions: new Float32Array([0, 0, 1, 0, 2, 0, 3, 0, 4, 0]), count: N }];
const rSrc = { kd, kcv: [c], chainSamples };

function setU(style: number, animT: number, fxNow: number): void {
  const U = knotUniformValues();
  U.uKFx.set([style, animT, fxNow, 1]);
  U.uKFx2.set([0.3, 0.7, 1, 0.1]);
  U.uKInk.set([1, 0, 0, 0]);
  U.uKShape.set([0.3, 0, 1.15, 0]);
  U.uKBase.set([0, 0, 0, 1]);
  U.uKKnots.set([0, 0, 1, 1]);
}

/** paint_math's FX at sample k, as the bake should carry it: (pRain, alpha, burnAge, hiA, kSample, glow). */
function expected(k: number): number[] {
  const U = knotUniformValues();
  const out = { pRain: 0, alpha: 1 };
  kFxColor(kd, U, c, k, k, [0, 0, 0], out);
  const st = Math.round(U.uKFx[0]);
  let burnAge = 9;
  if (st === 4 || st === 5) {
    const g = kIgnition(kd, U, c, k);
    if (g.hit && U.uKFx[1] >= g.tA) burnAge = kBurnAge(kd, U, c, g, k);
  }
  const glow = kGlow(kd, U, c, k);
  return [out.pRain, out.alpha, burnAge, Math.max(glow, out.alpha), k, glow];
}

describe("K1395 gf FX table", () => {
  it("bakes the burn age and tint fields per sample (kFxColor / kBurnAge)", () => {
    setU(4, 1.2, 1.2);
    const V = new GfFxTable().values(rSrc);
    for (let k = 0; k < N; k++) {
      const got = fxAt(V, 0, N, false, k, 0);
      const exp = expected(k);
      for (let j = 0; j < 6; j++) expect(got[j]).toBeCloseTo(exp[j], 5);
    }
    // the front is hot mid-chain and unburnt ahead of it
    expect(fxAt(V, 0, N, false, 2, 0)[2]).toBeLessThan(1.3);
    expect(fxAt(V, 0, N, false, 4, 0)[2]).toBe(9);
  });
  it("bakes each sample's junction distance from the tables' corner arcs (1e9 without)", () => {
    setU(4, 1.2, 1.2);
    const jn = { nK: 1, kCa: new Int32Array([0]), kCb: new Int32Array([0]), kSa: new Float64Array([2]), kSb: new Float64Array([3]) };
    const V = new GfFxTable().values(rSrc, undefined, jn);
    for (let k = 0; k < N; k++) expect(fxAt(V, 0, N, false, k, 0)[6]).toBeCloseTo(Math.min(Math.abs(k - 2), Math.abs(k - 3)), 5);
    const V0 = new GfFxTable().values(rSrc);
    for (let k = 0; k < N; k++) expect(fxAt(V0, 0, N, false, k, 0)[6]).toBe(1e9);
    // the shader windows the reveal interior by that distance (today's junction cut, uLkJ)
    const f = lookForm(revealForm(gfFs(false, true)));
    expect(f).toContain("lkHi = f0.w; if (uLkJ > 0.0) lkHi *= clamp((f1.z - uLkJ) / max(2.0 * uAA, 1e-5) + 0.5, 0.0, 1.0);");
    expect(f).toContain("uniform float uLkJ;");
  });
  it("bakes the rainbow progress (kFxColor) and the materialize alpha (dust)", () => {
    setU(1, 1.2, 1.2);
    let V = new GfFxTable().values(rSrc);
    for (let k = 0; k < N; k++) {
      const got = fxAt(V, 0, N, false, k, 0);
      const exp = expected(k);
      for (let j = 0; j < 6; j++) expect(got[j]).toBeCloseTo(exp[j], 5);
    }
    expect(fxAt(V, 0, N, false, 2, 0)[0]).toBeGreaterThan(0.9);
    setU(3, 0.6, 0.6);
    V = new GfFxTable().values(rSrc);
    for (let k = 0; k < N; k++) {
      const got = fxAt(V, 0, N, false, k, 0);
      const exp = expected(k);
      for (let j = 0; j < 6; j++) expect(got[j]).toBeCloseTo(exp[j], 5);
    }
    // ahead of the dust front: transparent, and no interior solidity
    expect(fxAt(V, 0, N, false, 4, 0)[1]).toBe(0);
    expect(fxAt(V, 0, N, false, 4, 0)[3]).toBe(0);
  });
  it("the reveal table's width is the mask times the rainbow swell; its mask is untouched", () => {
    setU(1, 1.2, 1.2);
    const T = new GfRevealTable();
    const src = { ...rSrc, revealOn: true, fxLive: true, paintScene: { revealSpan: (): [number, number] => [0, 2] } } as unknown as GfRevealSource;
    T.build(src, { nK: 0, kCa: new Int32Array(0), kCb: new Int32Array(0), kSa: new Float64Array(0), kSb: new Float64Array(0) });
    const U = knotUniformValues();
    const d = T.data;
    expect(d[0]).toBe(2); // KNOTS
    const k0 = d[1]; const kn = d[2]; const ring = d[3];
    const K: number[] = [];
    for (let q = 0; q < kn; q++) K.push(d[4 * (k0 + q)], d[4 * (k0 + q) + 1], d[4 * (k0 + q) + 2]);
    let swelled = false;
    for (let k = 0; k < N; k++) {
      const mask = kRevealMaskAt(kd, U, c, k);
      const g = kIgnition(kd, U, c, k);
      const width = mask > 0 && g.hit && U.uKFx[1] >= g.tA ? mask * kSwell(kFxAge(U, g)) : mask;
      if (width > mask + 0.01) swelled = true;
      expect(revealAt(K, 0, kn, ring, k)).toBeCloseTo(mask, 5);
      expect(revealWidthAt(K, 0, kn, ring, k)).toBeCloseTo(width, 5);
    }
    expect(swelled).toBe(true);
  });
  it("the look form shades the label by the baked FX; the composite fills the border interior; the originals are untouched", () => {
    const T = GF_TIERS[0];
    const programs = [...cornerPlan(T).map((e) => gfFs(false, true, e.tier)), gfFs(false, true)];
    for (const s of programs) {
      const f = lookForm(revealForm(s));
      expect(f).toContain("uniform highp sampler2D uFx;");
      expect(f).toContain("lkBurn(lkCo.rgb");
      expect(f).toContain("lkRainbow(lkCo.rgb");
      expect(f).toContain("lkHi = f0.w;");
      expect(s).not.toContain("uFx");
    }
    expect(LOOK_COMP_FS).toContain("uniform float uRvFx;");
    expect(LOOK_COMP_FS).toContain("float ia = clamp(c.z, 0.0, 1.0) * cov * (1.0 - a);");
    // K1431: the rainbow's across coordinate divides by the reveal width at the label's foot
    // (the reveal form only; the plain form has no rvM).
    const rf = lookForm(revealForm(gfFs(false, true)));
    // The baked word is (pRain, alpha, burnAge, solidity): alpha (f0.y) scales ink/cov,
    // burn reads the age (f0.z), solidity rides f0.w.
    expect(rf).toContain("ink *= f0.y; cov *= f0.y; lkHi = f0.w;");
    expect(rf).toContain("lkBurn(lkCo.rgb, f0.z, f1.x");
    expect(rf).toContain("max(rvM(lab, lkArc(lab, lq)), 1e-6)");
    expect(lookForm(gfFs(false, true))).not.toContain("rvM(lab, lkArc");
    const app = readFileSync(new URL("../../src/render/gpu_field/gf_app.ts", import.meta.url), "utf8");
    expect(app).toContain("new GfFxTable()");
    expect(app).toContain("fxShow(fxSnap())");
    const pass = readFileSync(new URL("../../src/render/gpu_field/gf_pass.ts", import.meta.url), "utf8");
    expect(pass).toContain("TEXTURE10");
    expect(pass).toContain("uFxLive");
  });
});
