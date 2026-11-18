// K1396 (24E): the K76 thread reveal (explore view) under rp=gf (gf_explore.ts's knots table and
// gf_look.ts's explore sites). The bake is pinned against explore_view's pieceVis at the samples,
// the shader lookup (exAt) at its knots, and the look form finds its explore sites in every
// program the pass draws, alone and over the reveal form.
import { describe, expect, it } from "vitest";
import { gfFs } from "../../src/render/gpu_field/gf_glsl";
import { cornerPlan, GF_TIERS } from "../../src/render/gpu_field/gf_pass";
import { revealForm } from "../../src/render/gpu_field/gf_reveal";
import { lookForm } from "../../src/render/gpu_field/gf_look";
import { GfExploreTable, burnAt, exAt, exBurnAt, exploreKnots, exploreStateAt, gfExploring } from "../../src/render/gpu_field/gf_explore";
import { pieceVis, type ExplorePiece } from "../../src/game/explore_view";
import { kChain, writeChainHeader, writeGeomTable, type KData } from "../../src/render/paint_math";

// One open chain, ctrls = arcs 0..4 (5 samples on a line).
const N = 5;
const stat = new Float32Array(64);
writeChainHeader(stat, 0, { nCtrl: N, closed: false, count: N, idxBase: 8, geomBase: 0, srcFirst: 0, srcCount: 0, paintBase: 0 });
const geom = new Float32Array(16);
writeGeomTable(geom, 0, 4, N, false, [0, 1, 2, 3, 4], 1e9);
const kd = { stat, geom, reveal: new Float32Array(4), paint: new Float32Array(4) } as KData;
const c = kChain(kd, 0);
const chainSamples = [{ positions: new Float32Array([0, 0, 1, 0, 2, 0, 3, 0, 4, 0]), count: N }];
const piece: ExplorePiece = { chain: 0, c0: 1, c1: 3, f0: 1, f1: 1, tip0: true, tip1: true };
const T = { nK: 2, kCa: new Int32Array([0, 0]), kCb: new Int32Array([0, 0]), kSa: new Float64Array([0.5, 0]), kSb: new Float64Array([3.5, 2]) };

describe("K1396 gf explore state", () => {
  it("reads a piece like pieceVis, with the frontier's tip and fade length", () => {
    for (const ctrl of [0, 0.25, 0.5, 1, 2, 3, 3.5, 4]) {
      const st = exploreStateAt([piece], kd, c, ctrl);
      expect(st.v).toBeCloseTo(pieceVis(piece, ctrl, N, false), 9);
    }
    const mid = exploreStateAt([piece], kd, c, 0.5);
    expect(mid.tip).toBeCloseTo(0.5, 9);
    expect(mid.lf).toBeCloseTo(1, 9);
    const inside = exploreStateAt([piece], kd, c, 2);
    expect(inside.v).toBe(1);
    expect(inside.tip).toBe(-1);
    const none = exploreStateAt([], kd, c, 2);
    expect(none.v).toBe(0);
  });
  it("keeps knot ends and change points only", () => {
    const out: number[] = [];
    exploreKnots([0, 1, 2, 3, 4], [0, 0, 1, 1, 0], [1, 1, -1, -1, 1], [1, 1, 0, 0, 1], 5, false, out);
    expect(out.length / 4).toBe(5);
    const flat: number[] = [];
    exploreKnots([0, 1, 2, 3, 4], [1, 1, 1, 1, 1], [-1, -1, -1, -1, -1], [0, 0, 0, 0, 0], 5, false, flat);
    expect(flat.length / 4).toBe(2);
  });
});

describe("K1396 gf explore table", () => {
  it("bakes headers, corner gates and knots in the reveal table's layout", () => {
    const tab = new GfExploreTable();
    tab.build({ explorePieces: [piece], exploreWhole: new Uint8Array([0]), kd, kcv: [c], chainSamples }, T);
    const d = tab.data;
    expect(d[0]).toBe(2); // knots
    expect(tab.oK).toBe(1);
    // corner 0: both arms fading (vis 0.5 at the feet) draws; corner 1: an arm hidden (vis 0) does not
    expect(d[4 * tab.oK]).toBe(1);
    expect(d[4 * (tab.oK + 1)]).toBe(0);
    const at = (s: number) => exAt(d, 0, s);
    expect(at(2)[0]).toBeCloseTo(1, 6);
    expect(at(0)[0]).toBeCloseTo(0, 6);
    expect(at(4)[0]).toBeCloseTo(0, 6);
    // at a knot the lookup is the sample's own state
    expect(at(1)[0]).toBeCloseTo(pieceVis(piece, 1, N, false), 6);
    expect(at(3)[0]).toBeCloseTo(pieceVis(piece, 3, N, false), 6);
  });
  it("marks whole chains full and pieceless chains hidden", () => {
    const tab = new GfExploreTable();
    tab.build({ explorePieces: [piece], exploreWhole: new Uint8Array([1]), kd, kcv: [c], chainSamples }, T);
    expect(tab.data[0]).toBe(1);
    expect(exAt(tab.data, 0, 2)[0]).toBe(1);
    const tab2 = new GfExploreTable();
    tab2.build({ explorePieces: [], exploreWhole: new Uint8Array([0]), kd, kcv: [c], chainSamples }, T);
    expect(tab2.data[0]).toBe(0);
    expect(exAt(tab2.data, 0, 2)[0]).toBe(0);
  });
  it("is on exactly while the renderer declares pieces", () => {
    expect(gfExploring({ explorePieces: [] })).toBe(true);
    expect(gfExploring({ explorePieces: null })).toBe(false);
    expect(gfExploring(null)).toBe(false);
  });
});

describe("K1396 look form explore sites", () => {
  const T0 = GF_TIERS[0];
  const programs = [...cornerPlan(T0).map((e) => gfFs(false, true, e.tier)), gfFs(false, true)];
  it("finds its sites in every program, alone and over the reveal form", () => {
    for (const src of programs) {
      for (const f of [lookForm(src), lookForm(revealForm(src))]) {
        expect(f).toContain("uniform highp sampler2D uEx;");
        expect(f).toContain("exAt(c, s)");
        expect(f).toContain("lkExploreLook");
        expect(f).toContain("uExLive > 0.5");
      }
      expect(src).not.toContain("uExLive");
    }
    // the full program (and the corner tier) gate their corners on the table's flags
    expect(lookForm(programs[programs.length - 1])).toContain("uOExK + k");
  });
});

describe("K1434 gf explore burn", () => {
  const span = { chain: 0, b0: 1, b1: 3 };
  it("reads a char span's ramp like kCharAt", () => {
    const burn = { gate: null, char: [span] };
    expect(burnAt(burn, kd, c, 2).char).toBeCloseTo(1, 9);
    expect(burnAt(burn, kd, c, 1).char).toBeCloseTo(0.5, 9);
    expect(burnAt(burn, kd, c, 3).char).toBeCloseTo(0.5, 9);
    expect(burnAt(burn, kd, c, 0.5).char).toBe(0);
    expect(burnAt(null, kd, c, 2)).toEqual({ char: 0, ember: 0, smolder: 0 });
  });
  it("reads a front's band and ember, gone putting the whole ember ahead", () => {
    const front = { chain: 0, c: 2, dir: 1, kind: 0 };
    const charBurn = { gate: null, char: [] as typeof span[], fronts: [front] };
    expect(burnAt(charBurn, kd, c, 2).ember).toBeCloseTo(1, 9);
    expect(burnAt(charBurn, kd, c, 2).char).toBeCloseTo(0.5, 9);
    expect(burnAt(charBurn, kd, c, 2.2).ember).toBe(0);
    const goneBurn = { gate: null, char: null, fronts: [front] };
    expect(burnAt(goneBurn, kd, c, 2.2).ember).toBeGreaterThan(0.5);
    expect(burnAt(goneBurn, kd, c, 2.2).ember).toBeLessThan(0.6);
    const sm = { gate: null, char: [] as typeof span[], smolder: [span] };
    expect(burnAt(sm, kd, c, 2).smolder).toBeCloseTo(1, 9);
    expect(burnAt(sm, kd, c, 0.5).smolder).toBe(0);
  });
  it("bakes the burn beside the knots, whole burnt chains included", () => {
    const whole: ExplorePiece = { chain: 0, c0: 0, c1: 4, f0: 0, f1: 0, tip0: false, tip1: false };
    const tab = new GfExploreTable();
    tab.build({
      explorePieces: [whole], exploreWhole: new Uint8Array([1]),
      exploreBurn: { gate: null, char: [span], fronts: [{ chain: 0, c: 3, dir: -1, kind: 0 }] },
      kd, kcv: [c], chainSamples,
    }, T);
    expect(tab.data[0]).toBe(2); // knots, not full: the burn must read
    expect(exBurnAt(tab.data, 0, 2)[0]).toBeCloseTo(1, 6);
    expect(exBurnAt(tab.data, 0, 3)[0]).toBeCloseTo(1, 6);
    expect(exBurnAt(tab.data, 0, 3)[1]).toBeCloseTo(1, 6);
    expect(exBurnAt(tab.data, 0, 0)).toEqual([0, 0, 0]);
    expect(exAt(tab.data, 0, 2)[0]).toBeCloseTo(1, 6);
  });
  it("gates corners on the burn's gate pieces, not the declared ones", () => {
    const T1 = { nK: 1, kCa: new Int32Array([0]), kCb: new Int32Array([0]), kSa: new Float64Array([2]), kSb: new Float64Array([0]) };
    const whole: ExplorePiece = { chain: 0, c0: 0, c1: 4, f0: 0, f1: 0, tip0: false, tip1: false };
    const plain = new GfExploreTable();
    plain.build({ explorePieces: [piece], exploreWhole: new Uint8Array([0]), kd, kcv: [c], chainSamples }, T1);
    expect(plain.data[4 * plain.oK]).toBe(0); // an arm hidden at its slot
    const gated = new GfExploreTable();
    gated.build({
      explorePieces: [piece], exploreWhole: new Uint8Array([0]),
      exploreBurn: { gate: [whole], char: [] },
      kd, kcv: [c], chainSamples,
    }, T1);
    expect(gated.data[4 * gated.oK]).toBe(1); // the gate sees the junction, one arm declared
    const shut = new GfExploreTable();
    shut.build({
      explorePieces: [whole], exploreWhole: new Uint8Array([1]),
      exploreBurn: { gate: [piece], char: [] },
      kd, kcv: [c], chainSamples,
    }, T1);
    expect(shut.data[4 * shut.oK]).toBe(0); // the gate hides it though the chain is whole
  });
  it("keeps each chain's knots at its own texels (two knotted chains)", () => {
    const tab = new GfExploreTable();
    const p1: ExplorePiece = { chain: 1, c0: 1, c1: 3, f0: 1, f1: 1, tip0: true, tip1: true };
    tab.build({
      explorePieces: [piece, p1], exploreWhole: new Uint8Array([0, 0]),
      kd, kcv: [c, c], chainSamples: [chainSamples[0], chainSamples[0]],
    }, T);
    expect(exAt(tab.data, 1, 2)[0]).toBeCloseTo(1, 6);
    expect(exAt(tab.data, 1, 0)[0]).toBeCloseTo(0, 6);
    expect(exBurnAt(tab.data, 1, 2)).toEqual([0, 0, 0]);
  });
  it("shades the label with the burn in the look form", () => {
    const f = lookForm(gfFs(false, true));
    expect(f).toContain("exBurnAt(lab, lkArc(lab, lq))");
    expect(f).toContain("lkCharLook(lkCo.rgb");
    expect(f).toContain("lkEmberLook(lkCo.rgb");
  });
});
