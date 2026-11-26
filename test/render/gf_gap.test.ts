// K1423 (24G): gf's crossing-gap window. Today's gap shader cuts the under
// thread only inside a window marched along it (crossing_gaps.ts marchUnder:
// the centreline-distance exit, the eye-wall limit, the neighbour caps);
// gf_look's lkGap had no window and kept cutting along eye walls. The bake
// (GfGapTable) marches the same window on CPU per crossing and stores, per
// under sample, the signed arc distance to the nearest window end.
import { describe, expect, it } from "vitest";
import { GAP_FAR_OFF, GfGapTable, gapWindow, gfJointArcs, lookForm, type GapSamples, type GfGapSource } from "../../src/render/gpu_field/gf_look";
import { gfFs } from "../../src/render/gpu_field/gf_glsl";
import type { KChain, KData } from "../../src/render/paint_math";

describe("K1423 lkGap shader: the cut is windowed by the baked winM", () => {
  it("reads uGw at the label foot and applies inWin + the window-end fs", () => {
    const f = lookForm(gfFs(false, true));
    expect(f).toContain("uniform highp sampler2D uGw; uniform float uGwLive;");
    expect(f).toContain("float lkWinM(int c, vec2 q)");
    expect(f).toContain("float wm = uGwLive > 0.5 ? lkWinM(cU, qU) : 1e3;");
    expect(f).toContain("cut *= clamp(wm / pxw + 0.5, 0.0, 1.0) * fs;");
    expect(f).toContain("float fs = clamp(wm / max(0.5 * uLkF, pxw), 0.0, 1.0);");
  });
  it("K1482 s8: inside a baked window only the named crossing's over thread cuts", () => {
    const f = lookForm(gfFs(false, true));
    expect(f).toContain("int cS = sl.x >= 0.0 ? int(sl.x + 0.5) : -1;");
    // K1561 (27Q): the coverage (gA) takes the named over chain inside a window too, not every higher piece
    expect(f).toContain("if (cS < 0) gA = max(gA, cj);");
    expect(f).toContain("if (cS < 0) g = max(g, cj);");
    // K1584 s4: the slot's border codes (left in z's fraction, right in x's at half scale), the pixel's own border's
    expect(f).toContain("int pk = int(fract(sl.z) * 1024.0 + 0.5); int pkR = int(fract(sl.x) * 4096.0 + 0.5);");
    // K1584 s7 corner rule: the right code's GAP_FAR_OFF bit turns the outline's far term off, its coverage kept
    expect(f).toContain("fo = pkR >= 1024; pkR -= fo ? 1024 : 0;");
    expect(f).toContain("if (!fo) g = max(g, jf ? lkCut(N.x, sinT, exg, wm, pxw, sc) : cN);");
    // code 0 closes that border's outline cut (K1482 s16: its fade starts a pixel inside the over's outline)
    expect(f).toContain("sc = jf ? vec2(uLkG > 0.0 ? -pxw / uLkG : 0.0, 0.3) : vec2(float(pk - (pk / 32) * 32), float(pk / 32)) / 31.0;");
    expect(f).toContain("scA = jf ? vec2(0.5, 0.45) : sc;");
    expect(f).toContain("float e = d - uH - uLkG * sc.x * bs;");
    expect(f).toContain("else if (PC(j) == cS) { g = max(g, jf ? lkCut(pd[j], sinT, exg, wm, pxw, sc) : cj); g0 = max(g0, cj); gA = max(gA, cj); }");
    // K1482 s16: the coverage's far-reach term is gated by the unclosed cut, so the closure never reaches the fill
    expect(f).toContain("if (gA < 0.999 && g0 < 0.999) gA = max(gA, cN);");
    expect(f).toContain("ink *= 1.0 - g.x * (1.0 - aT); cov *= 1.0 - g.y * (1.0 - aT);");
  });
});

const H = 0.13, MARGIN = 0.07, FADE = 0.14;

/** Samples along pts resampled every step (open chain, arc = index * step). */
function samples(pts: [number, number][], step = 0.1): GapSamples & { positions: Float32Array; count: number } {
  const raw: [number, number][] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const len = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(len / step));
    for (let k = 0; k < n; k++) raw.push([ax + (bx - ax) * (k / n), ay + (by - ay) * (k / n)]);
  }
  raw.push(pts[pts.length - 1]);
  const positions = new Float32Array(raw.length * 2);
  raw.forEach(([x, y], i) => { positions[2 * i] = x; positions[2 * i + 1] = y; });
  return { positions, count: raw.length, closed: false, total: (raw.length - 1) * step, arcPer: step };
}
const straight = (x0: number, y0: number, x1: number, y1: number, step = 0.1) =>
  samples([[x0, y0], [x1, y1]], step);

describe("K1423 gapWindow (marchUnder's perp window on polylines)", () => {
  it("steep crossing: the window ends just past the fade exit", () => {
    const under = straight(0, 0, 20, 0);
    const over = straight(10, -10, 10, 10);
    const [wn, wp] = gapWindow(under, over, 10, 10, H, MARGIN, FADE, 4.5, 4.5);
    // all lanes out at 2h+margin = 0.33; fade exit 0.47 (+pad), eye limit 0.33+0.14 = 0.47
    expect(wn).toBeGreaterThan(0.38);
    expect(wn).toBeLessThan(0.68);
    expect(wp).toBeGreaterThan(0.38);
    expect(wp).toBeLessThan(0.68);
  });
  it("shallow crossing: the eye-wall limit ends it, not the distant fade exit", () => {
    const under = straight(0, 0, 30, 0);
    const s = 0.1, c = Math.sqrt(1 - s * s);
    const over = samples([[10 - 12 * c, -12 * s], [10 + 12 * c, 12 * s]]);
    const [wn, wp] = gapWindow(under, over, 10, 12, H, MARGIN, FADE, 4.5, 4.5);
    // centreline distance reaches 2h+margin at arc 3.3; the fade exit would be
    // 4.7 away, but the eye-wall limit ends the window at 3.3 + 0.14/0.2 = 4.0
    expect(wp).toBeGreaterThan(3.7);
    expect(wp).toBeLessThan(4.4);
    expect(wn).toBeGreaterThan(3.7);
    expect(wn).toBeLessThan(4.4);
  });
  it("parallel ride past the casing: the eye-wall limit still ends the window", () => {
    const under = straight(0, 0, 20, 0);
    const over = straight(0, 0.4, 20, 0.4);
    const [, wp] = gapWindow(under, over, 10, 10, H, MARGIN, FADE, 2.0, 2.0);
    // d = 0.4 is past the all-lanes exit (0.33) at the centre itself, and sin
    // is 0, so the window ends fade/0.2 of arc later, as today's march does
    expect(wp).toBeGreaterThan(0.7);
    expect(wp).toBeLessThan(0.95);
  });
  it("K1458: a fused joint's room caps the window past the all-lanes exit (crossing_gaps.ts K1218 S3)", () => {
    const under = straight(0, 0, 30, 0);
    const s = 0.1, c = Math.sqrt(1 - s * s);
    const over = samples([[10 - 12 * c, -12 * s], [10 + 12 * c, 12 * s]]);
    // no joint: the eye-wall limit near 4.0 (above); a joint whose room ends at 3.5 caps the positive side there
    const [wn, wp] = gapWindow(under, over, 10, 12, H, MARGIN, FADE, 4.5, 4.5, 1e6, 3.5);
    expect(wp).toBeCloseTo(3.5, 5);
    expect(wn).toBeGreaterThan(3.7);
    // a window never ends before its all-lanes exit (~3.3), however close the joint
    const [, wp2] = gapWindow(under, over, 10, 12, H, MARGIN, FADE, 4.5, 4.5, 1e6, 0.5);
    expect(wp2).toBeGreaterThan(3.2);
    expect(wp2).toBeLessThan(3.5);
  });
  it("K1458: the joint's clearance scales (crossing_gaps.ts clearScales): margin then fade, to their floors", () => {
    const under = straight(0, 0, 20, 0);
    const over = straight(10, -10, 10, 10);
    // steep: sil = h = 0.13, cut = h + margin = 0.2; room 0.3 leaves the margin whole and the fade 0.1/0.14
    const r1 = gapWindow(under, over, 10, 10, H, MARGIN, FADE, 4.5, 4.5, 1e6, 0.3);
    expect(r1[2]).toBe(1); expect(r1[3]).toBe(1); // no joint on the negative side
    expect(r1[4]).toBe(1);
    expect(r1[5]).toBeCloseTo(0.1 / FADE, 1);
    // room 0.15: the margin shrinks to (0.15 - 0.13) / 0.07, below its floor 0.5; the fade sits on its floor 0.45
    const r2 = gapWindow(under, over, 10, 10, H, MARGIN, FADE, 4.5, 4.5, 1e6, 0.15);
    expect(r2[4]).toBe(0.5);
    expect(r2[5]).toBe(0.45);
  });
  it("K1476: a ride that never clears ends at the joint room, not the cap", () => {
    const under = straight(0, 0, 20, 0);
    const over = straight(0, 0.2, 20, 0.2);
    // d = 0.2 stays inside the fade band (all-lanes exit 0.33): no all, no win
    const [wn, wp] = gapWindow(under, over, 10, 10, H, MARGIN, FADE, 2.0, 2.0, 1e6, 0.58);
    expect(wp).toBeCloseTo(0.58, 5);
    expect(wn).toBeCloseTo(2.0, 5);
    const [, wp2] = gapWindow(under, over, 10, 10, H, MARGIN, FADE, 2.0, 2.0);
    expect(wp2).toBeCloseTo(2.0, 5);
  });
});

describe("K1423 GfGapTable", () => {
  // chain 0 (over): an eye over chain 1 (under, straight along x): crosses at
  // x=10, rides parallel at y=0.3, crosses back at x=13 (twin crossings, so
  // each window is capped at half the eye's length, NB_CLEAR_TWIN).
  const under = straight(0, 0, 20, 0);
  const over = samples([[8, -2], [10, 0], [11, 0.28], [12, 0.3], [13, 0], [15, -2]]);
  const geom = new Float32Array(16);
  geom[0] = over.total; geom[1] = over.arcPer; // chain 0 G0 (texel 0)
  geom[4] = 0; geom[5] = over.total; // chain 0 control arcs (texel 1)
  geom[8] = under.total; geom[9] = under.arcPer; // chain 1 G0 (texel 2)
  geom[12] = 0; geom[13] = under.total; // chain 1 control arcs (texel 3)
  const kd = { stat: new Float32Array(4), geom, reveal: new Float32Array(4), paint: new Float32Array(4) } as unknown as KData;
  const kcv = [
    { ch: 0, nCtrl: 2, closed: false, geom: 0, total: over.total },
    { ch: 1, nCtrl: 2, closed: false, geom: 2, total: under.total },
  ] as unknown as KChain[];
  const arcOf = (S: GapSamples, x: number, y: number) => {
    let best = 1e9, ba = 0;
    for (let a = 0; a <= S.total; a += 0.05) {
      const i = Math.min(S.count - 1, Math.round(a / S.arcPer));
      const d = Math.hypot(S.positions[2 * i] - x, S.positions[2 * i + 1] - y);
      if (d < best) { best = d; ba = a; }
    }
    return ba;
  };
  const src: GfGapSource = {
    kd, kcv,
    chainSamples: [{ positions: over.positions, count: over.count }, { positions: under.positions, count: under.count }],
    crossings: [
      { overChain: 0, overCtrl: arcOf(over, 10, 0) / over.total, underChain: 1, underCtrl: arcOf(under, 10, 0) / under.total },
      { overChain: 0, overCtrl: arcOf(over, 13, 0) / over.total, underChain: 1, underCtrl: arcOf(under, 13, 0) / under.total },
    ],
    fillHalf: H, margin: MARGIN, fade: FADE,
  };
  it("eye walls: the window from each crossing ends near the eye's midpoint (twin cap)", () => {
    const T = new GfGapTable();
    const V = T.values(src);
    const at = (x: number) => V[4 * (over.count + Math.round(x / under.arcPer))]; // chain 1 follows chain 0 in the layout
    // at the crossing the sample is deep inside (winM near the window's reach)
    expect(at(10)).toBeGreaterThan(0.5);
    // the eye's middle (x=11.5) sits at both windows' ends: winM near or below
    // zero there, so lkGap cuts nothing along the wall where master gf cut fully
    expect(at(11.5)).toBeLessThan(0.2);
    // just inside the first window's end it is still positive but small
    expect(at(11)).toBeGreaterThan(0);
    expect(at(11)).toBeLessThan(at(10));
  });
  it("K1458: each windowed under sample names its over pass and the over sample nearest it", () => {
    const V = new GfGapTable().values(src);
    const ent = (x: number) => 4 * (over.count + Math.round(x / under.arcPer));
    for (const x of [9.6, 10, 10.4, 13]) {
      const i = ent(x);
      expect(Math.floor(V[i + 1])).toBe(0); // the over chain (its fraction is the right border's code, below 0.5)
      expect(V[i + 1] - Math.floor(V[i + 1])).toBeLessThan(0.5);
      const k = V[i + 2];
      expect(Number.isInteger(k)).toBe(true);
      // the named over sample sits within the scan of the over point nearest (x, 0)
      const d = Math.hypot(over.positions[2 * k] - x, over.positions[2 * k + 1]);
      let best = 1e9;
      for (let j = 0; j < over.count; j++) best = Math.min(best, Math.hypot(over.positions[2 * j] - x, over.positions[2 * j + 1]));
      expect(d - best).toBeLessThan(V[i + 3] * over.arcPer + 1e-6);
      expect(V[i + 3]).toBeGreaterThan(0);
    }
    // far from both crossings no over pass is named
    expect(V[ent(2) + 1]).toBe(-1);
    expect(V[ent(18) + 1]).toBe(-1);
  });
  // K1584 s4: a slot's border codes: the left border's in z's fraction (code / 1024), the right border's in x's
  // ((code + the s7 far-off bit) / 4096); code = round(fs*31)*32 + round(ms*31), 0 = that border's outline closed
  const codesAt = (V: Float32Array, x: number) => {
    const i = 4 * (over.count + Math.round(x / under.arcPer)), X = V[i + 1], Z = V[i + 3];
    return { left: Math.round((Z - Math.floor(Z)) * 1024), right: Math.round((X - Math.floor(X)) * 4096) % GAP_FAR_OFF };
  };
  const FULL = 31 * 32 + 31;
  it("K1584 s4: a joint member beside the crossing closes no border (s15/s17's over rule and s18's under rule are gone)", () => {
    // the eye wall past x 10.55 is a fused joint's surface; the under thread past 10.9 an arm of one: neither changes
    // the bake (the joint's own outline stays closed through the joint room's code 0 instead, below)
    const memO = (c: number, k: number) => c === 0 && over.positions[2 * k] >= 10.55;
    const memU = (c: number, k: number) => c === 1 && under.positions[2 * k] >= 10.9;
    const V0 = new GfGapTable().values(src);
    expect(Array.from(new GfGapTable().values({ ...src, overMember: memO }))).toEqual(Array.from(V0));
    expect(Array.from(new GfGapTable().values({ ...src, overMember: memU }))).toEqual(Array.from(V0));
    // with no joint near, every windowed slot carries the full gap on both borders
    for (const x of [10, 10.6, 11, 11.3, 13]) expect(codesAt(V0, x)).toEqual({ left: FULL, right: FULL });
  });
  const scalesAt = (V: Float32Array, x: number) => {
    const z = V[4 * (over.count + Math.round(x / under.arcPer)) + 3], pk = Math.round((z - Math.floor(z)) * 1024);
    return { ms: (pk % 32) / 31, fs: Math.floor(pk / 32) / 31 };
  };
  it("K1584 s3: a side's joint room runs to gf's own joint corner, not to the ribbon renderer's fillet reach", () => {
    // a fused joint at x 11.4 on the under thread, its corner's tangent point at 11.2 (gf's joint geometry)
    const joints = new Map([[1, [{ ctrl: 11.4 / under.total }]]]);
    // the old room: the joint ctrl less jointClear (1.2 here, as link A's 1.72 to its fill half-width): room 0, the floors
    const old = new GfGapTable().values({ ...src, joints, jointClear: 1.2 });
    expect(scalesAt(old, 10.3).ms).toBeLessThan(0.6);
    // the corner's tangent point 1.2 past the crossing at 10: room for the full gap, which ends short of the corner
    const ja = new GfGapTable().values({ ...src, joints, jointClear: 1.2, jointArcs: new Map([[1, [11.2 / under.arcPer]]]) });
    expect(scalesAt(ja, 10.3)).toEqual({ ms: 1, fs: 1 });
    // a corner 0.3 past it leaves room short of the full gap: the scales yield, but no further than that room forces
    const near = new GfGapTable().values({ ...src, joints, jointClear: 1.2, jointArcs: new Map([[1, [10.3 / under.arcPer]]]) });
    const s = scalesAt(near, 10.15);
    expect(s.ms < 1 || s.fs < 1).toBe(true);
    expect(s.ms + s.fs).toBeGreaterThanOrEqual(scalesAt(old, 10.15).ms + scalesAt(old, 10.15).fs);
  });
});

describe("K1584 s4: per-border joint rooms (a right-angle crossing: both borders clear the over alike)", () => {
  const under = straight(0, 0, 20, 0), over = straight(10, -10, 10, 10);
  const geom = new Float32Array(16);
  geom[0] = over.total; geom[1] = over.arcPer; geom[4] = 0; geom[5] = over.total;
  geom[8] = under.total; geom[9] = under.arcPer; geom[12] = 0; geom[13] = under.total;
  const kd = { stat: new Float32Array(4), geom, reveal: new Float32Array(4), paint: new Float32Array(4) } as unknown as KData;
  const kcv = [
    { ch: 0, nCtrl: 2, closed: false, geom: 0, total: over.total },
    { ch: 1, nCtrl: 2, closed: false, geom: 2, total: under.total },
  ] as unknown as KChain[];
  const src: GfGapSource = {
    kd, kcv,
    chainSamples: [{ positions: over.positions, count: over.count }, { positions: under.positions, count: under.count }],
    crossings: [{ overChain: 0, overCtrl: 0.5, underChain: 1, underCtrl: 0.5 }],
    fillHalf: H, margin: MARGIN, fade: FADE,
  };
  // a slot's border codes: the left border's in z's fraction (code / 1024), the right border's in x's ((code + the s7
  // far-off bit) / 4096); code = round(fs*31)*32 + round(ms*31), 0 = that border's outline closed
  const rightAt = (V: Float32Array, x: number) => {
    const X = V[4 * (over.count + Math.round(x / under.arcPer)) + 1];
    return Math.round((X - Math.floor(X)) * 4096);
  };
  const codesAt = (V: Float32Array, x: number) => {
    const i = 4 * (over.count + Math.round(x / under.arcPer)), Z = V[i + 3];
    return { left: Math.round((Z - Math.floor(Z)) * 1024), right: rightAt(V, x) % GAP_FAR_OFF };
  };
  const farOff = (V: Float32Array, x: number) => rightAt(V, x) >= GAP_FAR_OFF;
  const FULL = 31 * 32 + 31;
  const withJoint = (ctrlX: number, extra: Partial<GfGapSource> = {}) => new GfGapTable().values({
    ...src, joints: new Map([[1, [{ ctrl: ctrlX / under.total }]]]), jointArcs: new Map(), jointLats: new Map(), ...extra,
  });
  it("no joint near: the full gap on both borders", () => {
    const V = new GfGapTable().values(src);
    for (const x of [9.7, 10, 10.3]) expect(codesAt(V, x)).toEqual({ left: FULL, right: FULL });
  });
  it("K1584 s5: a joint corner short of the full gap no longer shortens it: the gap carves into the junction's outline", () => {
    // the corner's tangent point 0.3 past the crossing (short of the full gap's 0.34) on the left border (+y; the under
    // tangent is +x); the joint itself (ctrl 14) is far. Stage 4 shrank that border's fade to fit (link A_4 t84e).
    const at = (lat: number, c = 10.3, x = 10.15) => codesAt(withJoint(14, { jointArcs: new Map([[1, [c / under.arcPer]]]), jointLats: new Map([[1, [lat]]]) }), x);
    for (const lat of [1, -1, 0]) expect(at(lat)).toEqual({ left: FULL, right: FULL });
    // a corner at the over's outline (room 0.05: stage 4 closed that border, nothing fitting before it): the full gap,
    // carved into the joint's outline past the corner
    for (const x of [10.05, 10.2, 10.3]) expect(at(0, 10.05, x)).toEqual({ left: FULL, right: FULL });
  });
  // a joint corner of either side (lat 0) at `at`: both borders' room runs from the crossing (10) to `at` itself (no exit pad)
  const withCorner = (at: number, ctrlX = 14) => withJoint(ctrlX, { jointArcs: new Map([[1, [at / under.arcPer]]]), jointLats: new Map([[1, [0]]]) });
  it("K1584 s5: past a border's own gap end the slot closes it (the joint's outline beyond the gap stays); the room closes nothing", () => {
    // a corner at 10.42: a room of 0.42 holds the full gap (0.13 + 0.07 + 0.14)
    const room = withCorner(10.42);
    expect(codesAt(room, 10.3)).toEqual({ left: FULL, right: FULL });
    // a slot past the border's own end (0.34 + the end pad), still in the window: the joint's outline there stays closed
    expect(codesAt(room, 10.55)).toEqual({ left: 0, right: 0 });
    // the other side of the crossing has no joint and keeps the full gap
    expect(codesAt(room, 9.55)).toEqual({ left: FULL, right: FULL });
    // a corner at 10.32 (stage 4 shrank the fade to fit) or 10.1 (stage 4: past the room, closed): the full gap
    expect(codesAt(withCorner(10.32), 10.2)).toEqual({ left: FULL, right: FULL });
    expect(codesAt(withCorner(10.1), 10.25)).toEqual({ left: FULL, right: FULL });
  });
  it("K1584 s7 corner rule: from a pair corner's tangent point on, a slot's far term is off (the codes unchanged)", () => {
    // a corner at 10.42 whose two chains are this crossing's under (1) and over (0): the under's border turns there into
    // the fillet that joins it to the over, so the outline's far term would find the over near all along it
    const wc = (partner: number) => withJoint(14, {
      jointArcs: new Map([[1, [10.42 / under.arcPer]]]), jointLats: new Map([[1, [0]]]), jointPartners: new Map([[1, [partner]]]),
    });
    const pair = wc(0), other = wc(5);
    // short of the corner: no bit
    for (const x of [9.6, 10, 10.3]) expect(farOff(pair, x)).toBe(false);
    // from the slot holding the corner's tangent point on: the bit
    for (const x of [10.42, 10.55]) expect(farOff(pair, x)).toBe(true);
    // the other side of the crossing, and a corner with another chain: no bit
    expect(farOff(pair, 9.55)).toBe(false);
    for (const x of [9.55, 10.3, 10.42, 10.55]) expect(farOff(other, x)).toBe(false);
    // the border codes are the other corner's (the loop term is untouched), and the chain still reads int(x + 0.5)
    for (const x of [9.55, 10, 10.3, 10.42, 10.55]) {
      expect(codesAt(pair, x)).toEqual(codesAt(other, x));
      const X = pair[4 * (over.count + Math.round(x / under.arcPer)) + 1];
      expect(Math.floor(X + 0.5)).toBe(0);
    }
  });
  it("K1584 s8: where both borders' gaps reach the pair corner's fillet start (the over's tangent point projected onto the under), the far term is off from there", () => {
    // the over crosses at x 10 and bends right above it to (tx, 1.2), where its outline turns into the pair corner's
    // fillet (its tangent point, partner the under); the under's own tangent point is at uTp (lat 0: both borders). The
    // over's tangent point, projected onto the under (to the nearest sample of the under's within reach), is where the
    // fillet starts on the under. s7 flagged from uTp less half a sample (the bend before it kept its far cut).
    const bent = (tx: number, uTp: number) => {
      const ob = samples([[10, -10], [10, 0.6], [tx, 1.2]]);
      const g = new Float32Array(16);
      g[0] = ob.total; g[1] = ob.arcPer; g[4] = 0; g[5] = ob.total;
      g[8] = under.total; g[9] = under.arcPer; g[12] = 0; g[13] = under.total;
      const kdB = { stat: new Float32Array(4), geom: g, reveal: new Float32Array(4), paint: new Float32Array(4) } as unknown as KData;
      const kcvB = [
        { ch: 0, nCtrl: 2, closed: false, geom: 0, total: ob.total },
        { ch: 1, nCtrl: 2, closed: false, geom: 2, total: under.total },
      ] as unknown as KChain[];
      const table = (overTp: boolean) => new GfGapTable().values({
        ...src, kd: kdB, kcv: kcvB,
        chainSamples: [{ positions: ob.positions, count: ob.count }, { positions: under.positions, count: under.count }],
        crossings: [{ overChain: 0, overCtrl: 10 / ob.total, underChain: 1, underCtrl: 0.5 }],
        joints: new Map([[1, [{ ctrl: 14 / under.total }]]]),
        jointArcs: new Map(overTp ? [[1, [uTp / under.arcPer]], [0, [ob.count - 1]]] : [[1, [uTp / under.arcPer]]]),
        jointLats: new Map([[1, [0]], [0, [0]]]),
        jointPartners: new Map([[1, [0]], [0, [1]]]),
      });
      const at = (V: Float32Array, x: number) => {
        const i = 4 * (ob.count + Math.round(x / under.arcPer)), X = V[i + 1], Z = V[i + 3];
        const right = Math.round((X - Math.floor(X)) * 4096);
        return { far: right >= GAP_FAR_OFF, left: Math.round((Z - Math.floor(Z)) * 1024), right: right % GAP_FAR_OFF, chain: Math.floor(X + 0.5) };
      };
      return { s8: table(true), s7: table(false), at };
    };
    const xs = [9.55, 9.7, 10, 10.1, 10.2, 10.3, 10.42, 10.55];
    // the fillet starts about 0.22 past the crossing, inside both borders' gaps (0.34): from there the far term is off
    const a = bent(10.25, 10.42);
    for (const x of [10.3, 10.42, 10.55]) expect(a.at(a.s8, x).far).toBe(true);
    for (const x of [9.55, 9.7, 10, 10.1, 10.2]) expect(a.at(a.s8, x).far).toBe(false);
    // s7 (no over tangent point given) started at the under's own tangent point less half a sample
    expect(a.at(a.s7, 10.3).far).toBe(false);
    expect(a.at(a.s7, 10.42).far).toBe(true);
    // the codes (the loop term and the gap's length) are s7's, and the chain still reads int(x + 0.5)
    for (const x of xs) {
      const p = a.at(a.s8, x), q = a.at(a.s7, x);
      expect({ left: p.left, right: p.right, chain: p.chain }).toEqual({ left: q.left, right: q.right, chain: 0 });
    }
    // a fillet that starts past both borders' gaps (about 0.42 against 0.34) keeps s7's flag: a crossing's gap beside a
    // junction keeps its length (D_a x174)
    const b = bent(10.44, 10.52);
    for (const x of [...xs, 10.62]) expect(b.at(b.s8, x)).toEqual(b.at(b.s7, x));
  });
  it("a joint ctrl near the crossing closes no border: each border's room runs to its own corners", () => {
    // stage 3 held both sides to the joint ctrl less a fill half-width (0.07 here, nothing fits): a border no joint
    // corner meets (the straight side of a T) now keeps the full gap; the ctrl still caps the window
    const V = withJoint(10.2);
    for (const x of [10.05, 10.1, 9.9]) expect(codesAt(V, x)).toEqual({ left: FULL, right: FULL });
  });
  it("a border's gap ends where it first clears the over's fill, margin and fade: the over coming back cuts nothing", () => {
    // the over crosses at x 10, rides 0.3 to the left of the under to x 11 and comes back in to end on it at x 11.3 (A_c
    // j104: the over, a joint member, converging into the joint; A_c x111 by t48e's end cap): the under's centreline
    // stays inside the all-lanes distance, so the window runs on to about 1.9, and at 11.3 the right border is 0.13
    // from the over's end, inside its fill. Stage 3's joint flags kept such sides closed; a cut there left a sliver.
    const u = straight(0, 0, 20, 0), o = samples([[10, -5], [10, 0.3], [11, 0.3], [11.3, 0]]);
    const g = gapWindow(u, o, 10, 5, H, MARGIN, FADE, 4.5, 4.5, 1e6, 1e6, undefined, undefined, 0, [1e6, 1e6, 5, 5]);
    expect(g[1]).toBeGreaterThan(1.5);
    // the right border's own gap ends near fill + margin + fade (0.34) past the crossing; its slots past it close nothing
    expect(Math.abs(g[17] - (H + MARGIN + FADE))).toBeLessThan(0.08);
    // the left border rides inside the over's margin and clears it only past the over's end: its cut runs the whole ride
    expect(g[16]).toBeGreaterThan(1.3);
    // the negative side has no room given (per-border scales not asked for): no end recorded
    expect(g[14]).toBe(1e6);
  });
  it("K1584 s7 rule K: a border that never clears the over (a loop's tip) ends at its joint room less the end pad", () => {
    // the over crosses at x 10 and rides 0.3 to the left of the under on past every cap: the left border sits inside the
    // over's margin all along (it leaves the fill, never the margin), so it never reaches its own gap end before the
    // march's cap (2). Stage 6 cut it on to that cap and closed nothing (no end): the extra cut in the middle of a
    // sharply turning border. The end pad is GAP_MARCH_STEP + GAP_EXIT_PAD (0.12).
    const u = straight(0, 0, 20, 0), o = samples([[10, -5], [10, 0.3], [20, 0.3]]);
    const win = (rm: number) => gapWindow(u, o, 10, 5, H, MARGIN, FADE, 2, 2, 1e6, 1e6, undefined, undefined, 0, [1e6, 1e6, rm, rm]);
    // a room of 1.0 (the corner's tangent point) holds the cut and its fade: the border ends there less the end pad, and
    // the window there
    const k = win(1.0);
    expect(k[16]).toBeCloseTo(1.0 - 0.12, 5);
    expect(k[1]).toBeCloseTo(1.0, 5);
    // the right border clears the over at once: its end and the window past the room are stage 6's
    expect(k[17]).toBeLessThan(0.5);
    // a room too short for the fade past the border's cut keeps stage 6's: no end, the window to the march's reach
    const s = win(0.3);
    expect(s[16]).toBe(1e6);
    expect(s[1]).toBeGreaterThan(1.0);
    // no room: no end
    expect(win(1e6)[16]).toBe(1e6);
  });
});
describe("K1584 s3: gfJointArcs (each joint corner's tangent point as a fractional field-vertex index)", () => {
  it("maps kSa/kSb past an open chain's pad vertex, wraps a closed chain, and skips through-pass bends", () => {
    const T = {
      nK: 2, kThru: [0, 1], kCa: [0, 0], kCb: [1, 1], kSa: [2.5, 0.5], kSb: [9, 1],
      // chain 0: open, a pad vertex (vs < 0) then vertices at s 0, 1, 2, 3; chain 1: closed, s 0, 2, 4, 6, length 8
      cV0: [0, 5], cNV: [5, 4], cClosed: [0, 1], cLen: [3, 8], vs: [-1, 0, 1, 2, 3, 0, 2, 4, 6],
    };
    const J = gfJointArcs(T);
    expect(J.get(0)).toEqual([2.5]); // s 2.5 lies halfway from the kept vertex 2 (s 2) to 3 (s 3); corner 1 is a bend
    expect(J.get(1)).toEqual([0.5]); // s 9 wraps to 1 on the closed chain: halfway from vertex 0 (s 0) to 1 (s 2)
    // K1584 s4: and each corner's border: the side of the chain's tangent the joint's centre lies on (+1 left)
    const lats = new Map<number, number[]>();
    gfJointArcs({
      ...T, kCx: [2.5, 0], kCy: [1, 0],
      // chain 0 runs along +x (the joint's centre is on its left), chain 1 along -x (the same centre on its right)
      vx: [0, 0, 1, 2, 3, 0, -2, -4, -6], vy: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    }, lats);
    expect(lats.get(0)).toEqual([1]);
    expect(lats.get(1)).toEqual([-1]);
  });
});
describe("K1460 s3: a kink loop's self-crossing window (setupUnder's split and selfEx)", () => {
  // one open chain: a 45 degree leg up to a small loop and a leg back down across the first, a
  // right-angle self crossing at (10, 0) whose two passes are 3.7 apart along the chain
  const chain = samples([[8, -2], [10.6, 0.6], [10.6, 1.0], [9.4, 1.0], [9.4, 0.6], [12, -2]], 0.02);
  const r2 = Math.SQRT2;
  const oC = 2 * r2, uC = 2.6 * r2 + 2.0 + 0.6 * r2;
  const sep = uC - oC;
  const splitN = Math.max(0.12, sep / 2 - 0.08); // the under side toward the loop; the over side toward it too
  const selfEx = 2 * H + MARGIN + FADE + 0.05;
  it("ends like an ordinary right-angle crossing once the chain's own pass is excluded", () => {
    const [wn, wp] = gapWindow(chain, chain, uC, oC, H, MARGIN, FADE, splitN, 2.5, 1e6, 1e6, 3.4, splitN, selfEx);
    expect(wn).toBeGreaterThan(0.38); expect(wn).toBeLessThan(0.68);
    expect(wp).toBeGreaterThan(0.38); expect(wp).toBeLessThan(0.68);
  });
  it("without them (stage 2's bake) the over polyline held the under pass and the window ran to its cap", () => {
    const [wn] = gapWindow(chain, chain, uC, oC, H, MARGIN, FADE, splitN, 2.5);
    expect(wn).toBeCloseTo(splitN, 5);
  });
});
