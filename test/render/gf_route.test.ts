// K1414 part 1 (24B): the K81 route bands and the hover rim under rp=gf
// (gf_look.ts GfRouteTable, the look form's band/rim terms, rimAlong's CPU twin).
import { describe, expect, it } from "vitest";
import { gfFs } from "../../src/render/gpu_field/gf_glsl";
import {
  GfRouteTable,
  fanAt,
  lookForm,
  rimAcross,
  rimAlong,
  routeDeclKey,
  type GfRouteSource,
} from "../../src/render/gpu_field/gf_look";
import { cornerPlan, GF_TIERS } from "../../src/render/gpu_field/gf_pass";
import { revealForm } from "../../src/render/gpu_field/gf_reveal";
import type { SplineSamples } from "../../src/geometry/spline_generator";
import type { KChain, KData } from "../../src/render/paint_math";

const line = (pts: [number, number][], cal: number[]): SplineSamples => {
  const count = pts.length;
  const positions = new Float32Array(count * 2);
  const tangents = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    positions[2 * i] = pts[i][0];
    positions[2 * i + 1] = pts[i][1];
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(count - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    tangents[2 * i] = dx / l;
    tangents[2 * i + 1] = dy / l;
  }
  return { count, positions, tangents, totalLength: cal[cal.length - 1], controlArcLengths: cal, closed: false };
};

// chain 0 runs west-east through (2,0); chain 1 runs south-north through (2,0).
const samples0 = line([[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], [0, 1, 2, 3, 4]);
const samples1 = line([[2, -2], [2, -1], [2, 0], [2, 1], [2, 2]], [0, 1, 2, 3, 4]);
const geom = new Float32Array(64);
geom.set([4, 1, 0, 0, 0, 1, 2, 3, 4], 0);
geom.set([4, 1, 0, 0, 0, 1, 2, 3, 4], 16);
const kd = { stat: new Float32Array(16), geom, reveal: new Float32Array(4), paint: new Float32Array(4) } as KData;
const kcv = [
  { ch: 0, nCtrl: 5, closed: false, count: 5, geom: 0, total: 4 },
  { ch: 1, nCtrl: 5, closed: false, count: 5, geom: 4, total: 4 },
] as unknown as KChain[];

const src = (routes: GfRouteSource["routesByJn"]): GfRouteSource => ({
  kd,
  kcv,
  chainSamples: [samples0, samples1],
  style: { threadWidth: 0.44, casingWidth: 0.6 },
  cuspRadius: 1,
  junctionArms: [{
    arms: [
      { chain: 0, slot: 2, dir: -1 }, { chain: 0, slot: 2, dir: 1 },
      { chain: 1, slot: 2, dir: -1 }, { chain: 1, slot: 2, dir: 1 },
    ],
  }],
  routesByJn: routes,
  fullJn: new Set<number>(),
  armNextJointCtrl: () => null,
});

describe("K1414 gf route bands", () => {
  it("builds one band per resolved route, tau running A to B through the turn", () => {
    const T = new GfRouteTable();
    const S = T.snapshot(src(new Map([[0, [{ a: { chain: 0, slot: 2, dir: -1 as const }, b: { chain: 1, slot: 2, dir: 1 as const } }]]])));
    expect(S).not.toBeNull();
    expect(T.nBands).toBe(1);
    expect(T.nDiscs).toBe(1);
    const band = T.bands[0];
    expect(band.chainA).toBe(0);
    expect(band.chainB).toBe(1);
    expect(band.tau0).toBeLessThan(-0.5);
    expect(band.tau1).toBeGreaterThan(0.5);
    // the turn's midpoint vertex sits near the junction centre (2,0)
    const mid = band.verts.reduce((p, v) => (Math.abs(v[2]) < Math.abs(p[2]) ? v : p), band.verts[0]);
    expect(Math.hypot(mid[0] - 2, mid[1] - 0)).toBeLessThan(0.45);
    // one texel header (band/disc counts) then the band's header texels
    expect(S!.data[0]).toBe(1);
    expect(S!.data[1]).toBe(1);
  });

  it("a one-arm route (the head) runs in to the junction centre", () => {
    const T = new GfRouteTable();
    T.snapshot(src(new Map([[0, [{ a: { chain: 0, slot: 2, dir: -1 as const }, b: null }]]])));
    expect(T.nBands).toBe(1);
    const band = T.bands[0];
    expect(band.chainB).toBe(-1);
    const last = band.verts[band.verts.length - 1];
    expect(Math.hypot(last[0] - 2, last[1] - 0)).toBeLessThan(0.05);
    expect(last[2]).toBeCloseTo(0, 6);
  });

  it("no routes: an empty table, and routeDeclKey follows the declaration", () => {
    const T = new GfRouteTable();
    const S = T.snapshot(src(new Map()));
    expect(T.nBands).toBe(0);
    expect(S!.data[0]).toBe(0);
    const a = src(new Map([[0, [{ a: { chain: 0, slot: 2, dir: -1 as const }, b: null }]]]));
    expect(routeDeclKey(a)).not.toBe(routeDeclKey(src(new Map())));
    expect(routeDeclKey(a)).toBe(routeDeclKey(src(new Map([[0, [{ a: { chain: 0, slot: 2, dir: -1 as const }, b: null }]]]))));
  });

  it("K1424: the fan bake marks every arm's samples within the fan reach, third arms included", () => {
    // fh 0.6, fan reach max(1.25 * 0.6, 1.2) + 0.25 = 1.45 world: samples 1 world
    // from the root are fan, samples 2 world from it are not.
    const wide: GfRouteSource = { ...src(new Map([[0, [{ a: { chain: 0, slot: 2, dir: -1 as const }, b: { chain: 1, slot: 2, dir: 1 as const } }]]])), style: { threadWidth: 1.2, casingWidth: 1.4 } };
    const T = new GfRouteTable();
    const S = T.snapshot(wide);
    expect(T.bands[0].disc).toBe(0);
    expect(S!.data[3]).toBe(T.fanBase);
    expect(S!.data[(1 + 6 * 0) * 4 + 20]).toBe(0); // H5: the band's disc ordinal
    // positions layout: chain 0 at base 0, chain 1 at base 5 (5 open samples each)
    expect([...T.fan.slice(0, 5)]).toEqual([0, 1, 1, 1, 0]);
    expect([...T.fan.slice(5, 10)]).toEqual([0, 1, 1, 1, 0]);
    // the shader twin: nearest kept sample decides
    expect(fanAt(T.fan, 0, 5, false, 1, 0)).toBe(0);
    expect(fanAt(T.fan, 0, 5, false, 0, 0)).toBe(-1);
    expect(fanAt(T.fan, 5, 5, false, 3, 0.4)).toBe(0);
    expect(fanAt(T.fan, 5, 5, false, 4, 0)).toBe(-1);
    expect(fanAt(T.fan, 5, 5, false, 3, 0.6)).toBe(-1); // nearer sample 4: no fan
  });

  it("the look form carries the band and rim terms; the originals are untouched", () => {
    const programs = [...cornerPlan(GF_TIERS[0]).map((e) => gfFs(false, true, e.tier)), gfFs(false, true)];
    for (const s of programs) {
      for (const f of [lookForm(s), lookForm(revealForm(s))]) {
        expect(f).toContain("uniform highp sampler2D uRt;");
        expect(f).toContain("lkRoute(lkCo.rgb, lab, lq, p, lkJb >= 0)");
        expect(f).toContain("int lkFan(int c, vec2 q)");
        expect(f).toContain("bool inFan = fanD == bDisc");
        expect(f).toContain("if (!inFan && (!(stp > 0.0) || ad / stp > 1.25)) continue;");
        expect(f).toContain("lkRim(lkCo.rgb, lab, lq, p)");
      }
      expect(s).not.toContain("uRt");
    }
  });
});

describe("K1414 gf hover rim (CPU twins)", () => {
  it("rimAlong: full at the hover point, gone at its length and inside the end gap", () => {
    // strength 0.4, length 3, fade 0.2, gap 0.5, run span 6
    expect(rimAlong(0.4, 0, 3, 0.5, 3, 0.2, 6)).toBeCloseTo(0.4, 6);
    expect(rimAlong(0.4, 3, 3, 0.5, 3, 0.2, 6)).toBeCloseTo(0, 6);
    expect(rimAlong(0.4, 0, 0.4, 0.5, 3, 0.2, 6)).toBeCloseTo(0, 6);
    expect(rimAlong(0, 0, 3, 0.5, 3, 0.2, 6)).toBe(0);
  });

  it("rimAcross: full at the edge, gone inside the rim edge", () => {
    expect(rimAcross(1, 1)).toBeCloseTo(1, 6);
    expect(rimAcross(0, 1)).toBeCloseTo(0, 6);
    expect(rimAcross(0.5, 1)).toBeGreaterThan(0);
    expect(rimAcross(0.5, 1)).toBeLessThan(1);
  });
});
