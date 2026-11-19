// K1500 (26K): the marker discs' gap under rp=gf. Today's renderer fades a thread away from a
// start/exit disc over fadeLength (ribbon/crossing_gaps.ts renderMarkerGaps; gap_mask.ts gapKeepAt's
// n <= 1 branch); gf_look had no port of it, so the thread stayed crisp at every fadeLength. The port:
// gfMarkerUniforms marches today's window per disc into uniforms (uMkA/uMkB) and lkMarker applies
// today's radial ramp at the label's foot (its CPU twin: markerCutAt).
import { describe, expect, it } from "vitest";
import { gfMarkerUniforms, lookForm, markerArmReach, markerCutAt, markerWindow, type GapSamples, type GfMarkerSource } from "../../src/render/gpu_field/gf_look";
import { gfFs } from "../../src/render/gpu_field/gf_glsl";
import type { KChain, KData } from "../../src/render/paint_math";

describe("K1500 lkMarker shader: today's marker ramp at the label and the fringe", () => {
  const f = lookForm(gfFs(false, true));
  it("declares the disc uniforms and the radial cut", () => {
    expect(f).toContain("uniform vec4 uMkA[4]; uniform vec4 uMkB[4];");
    expect(f).toContain("float lkMarker(int c, float arc, vec2 p)");
    expect(f).toContain("float e = d - uMkA[i].z - uLkG;");
    expect(f).toContain("float k = clamp((e + 0.5 * pxw) / max(uLkF, pxw), 0.0, 1.0);");
  });
  it("cuts the label and the unlabelled fringe by it", () => {
    expect(f).toContain("if (lkJb >= 0) { float mk = lkMarker(lab, lkArc(lab, lq), p); lkg = max(lkg, mk); lkg2.y = max(lkg2.y, mk); }");
    expect(f).toContain("g = max(g, vec2(lkMarker(PC(jU), lkArc(PC(jU), fq), p)));");
  });
});

const RADIUS = 1.128, MARGIN = 0.07, H = 0.13;
// one device pixel in world units on link A (ppw 42.6 at DSF 2)
const PXW = 1 / 42.6;

function straight(x0: number, y0: number, x1: number, y1: number, step = 0.1): GapSamples & { positions: Float32Array; count: number } {
  const raw: [number, number][] = [];
  const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(len / step));
  for (let k = 0; k < n; k++) raw.push([x0 + (x1 - x0) * (k / n), y0 + (y1 - y0) * (k / n)]);
  raw.push([x1, y1]);
  const positions = new Float32Array(raw.length * 2);
  raw.forEach(([x, y], i) => { positions[2 * i] = x; positions[2 * i + 1] = y; });
  return { positions, count: raw.length, closed: false, total: (raw.length - 1) * step, arcPer: step };
}

describe("K1500 markerWindow (renderMarkerGaps' march)", () => {
  it("ends where the centreline clears radius + margin + fade + both half-widths", () => {
    const S = straight(0, 0, 20, 0);
    const exitD = RADIUS + MARGIN + 1.2 + 2 * H + 0.05;
    const [wn, wp] = markerWindow(S, 10, 10, 0, exitD);
    expect(wp).toBeGreaterThanOrEqual(exitD);
    expect(wp).toBeLessThan(exitD + 0.15);
    expect(wn).toBeGreaterThanOrEqual(exitD);
    expect(wn).toBeLessThan(exitD + 0.15);
  });
  it("an open chain's end caps the window that runs into it", () => {
    const S = straight(0, 0, 20, 0);
    const [wn, wp] = markerWindow(S, 0, 0, 0, RADIUS + MARGIN + 1.2 + 2 * H + 0.05);
    expect(wn).toBe(0);
    expect(wp).toBeGreaterThan(2.7);
  });
});

describe("K1500 markerCutAt (gapKeepAt's marker ramp)", () => {
  const cov = (fade: number, e: number, off = 0, wn = 9, wp = 9) =>
    1 - markerCutAt(RADIUS + MARGIN + e, RADIUS, off, wn, wp, MARGIN, fade, PXW);
  it("fades over fadeLength: coverage 0 at the margin, 1 a fade past it, ~0.5 midway", () => {
    expect(cov(1.2, 0)).toBeLessThan(0.01);
    expect(cov(1.2, 1.2)).toBeGreaterThan(0.99);
    expect(cov(1.2, 0.6)).toBeCloseTo(0.5, 1);
  });
  it("the 10%-90% ramp is ~0.61 of the fade (the smoothstep's), starting at the margin", () => {
    let d10 = -1, d90 = -1;
    for (let e = 0; e <= 1.2; e += 0.005) {
      const c = cov(1.2, e);
      if (d10 < 0 && c >= 0.1) d10 = e;
      if (c >= 0.9) { d90 = e; break; }
    }
    expect(d10).toBeGreaterThan(0.15 * 1.2);
    expect(d10).toBeLessThan(0.25 * 1.2);
    expect(d90 - d10).toBeGreaterThan(0.55 * 1.2);
    expect(d90 - d10).toBeLessThan(0.68 * 1.2);
  });
  it("fl 0 stays a crisp cut within one device pixel", () => {
    expect(cov(0, -0.5 * PXW)).toBe(0);
    expect(cov(0, 0.5 * PXW)).toBe(1);
  });
  it("no cut outside the window, and the window end dissolves the fade", () => {
    expect(markerCutAt(RADIUS, RADIUS, 10.2, 9, 9, MARGIN, 1.2, PXW)).toBe(0);
    // deep inside (e < 0) the cut holds nearly to the window's end; at the end inWin is mid-ramp
    expect(markerCutAt(RADIUS, RADIUS, 8.9, 9, 9, MARGIN, 1.2, PXW)).toBeGreaterThan(0.9);
    expect(markerCutAt(RADIUS, RADIUS, 9, 9, 9, MARGIN, 1.2, PXW)).toBeCloseTo(0.5, 1);
  });
});

const under = straight(0, 0, 20, 0);
const over = straight(0, 5, 20, 5);
let kd: KData;
let kcv: KChain[];

describe("K1500 gfMarkerUniforms", () => {
  const geom = new Float32Array(16);
  geom[0] = over.total; geom[1] = over.arcPer;
  geom[4] = 0; geom[5] = over.total;
  geom[8] = under.total; geom[9] = under.arcPer;
  geom[12] = 0; geom[13] = under.total;
  kd = { stat: new Float32Array(4), geom, reveal: new Float32Array(4), paint: new Float32Array(4) } as unknown as KData;
  kcv = [
    { ch: 0, nCtrl: 2, closed: false, geom: 0, total: over.total },
    { ch: 1, nCtrl: 2, closed: false, geom: 2, total: under.total },
  ] as unknown as KChain[];
  const src: GfMarkerSource = {
    kd, kcv,
    chainSamples: [{ positions: over.positions, count: over.count }, { positions: under.positions, count: under.count }],
    markers: [{ chain: 1, ctrl: 0.5, radius: RADIUS }],
    fillHalf: H, margin: MARGIN, fade: 1.2,
    cuspRadius: 0, junctionArcs: [], underArcs: [],
  };
  it("bakes the disc's centre, radius, chain and window; unused slots read chain -1", () => {
    const { a, b } = gfMarkerUniforms(src);
    expect(a[0]).toBeCloseTo(10, 5);
    expect(a[1]).toBeCloseTo(0, 5);
    expect(a[2]).toBeCloseTo(RADIUS, 5);
    expect(a[3]).toBe(1);
    expect(b[0]).toBeCloseTo(10, 5);
    const exitD = RADIUS + MARGIN + 1.2 + 2 * H + 0.05;
    expect(b[1]).toBeGreaterThanOrEqual(exitD);
    expect(b[1]).toBeLessThan(exitD + 0.15);
    expect(b[2]).toBeGreaterThanOrEqual(exitD);
    expect(b[2]).toBeLessThan(exitD + 0.15);
    expect(b[3]).toBe(0); // open
    expect(a[7]).toBe(-1);
    expect(a[11]).toBe(-1);
  });
});

describe("K1500 fan clip (today's fan material keeps no marker fade)", () => {
  it("markerArmReach is joinery's armReach: domain-capped, stopped a fillHalf short of the nearest cut", () => {
    // link A's chains at cuspRadius 6, threadWidth 0.8: L = 0.4 * 1.25 * 6 = 3
    expect(markerArmReach(3, 4.67, 0.95, 0.4)).toBeCloseTo(0.9, 6); // the start chain's junction arm
    expect(markerArmReach(3, 3.04, Infinity, 0.4)).toBeCloseTo(3, 6); // the exit chain's: no cut on the arm
    expect(markerArmReach(3, 0.5, Infinity, 0.4)).toBeCloseTo(0.9, 6); // a short domain still rounds: 0.3 L floor
  });
  const atStart: GfMarkerSource = {
    kd, kcv,
    chainSamples: [{ positions: over.positions, count: over.count }, { positions: under.positions, count: under.count }],
    markers: [{ chain: 1, ctrl: 0, radius: RADIUS }],
    fillHalf: 0.4, margin: MARGIN, fade: 1.2, cuspRadius: 6,
    junctionArcs: [], underArcs: [],
  };
  it("a junction fan reaching the disc clips the window away (the exit on link A)", () => {
    const { b } = gfMarkerUniforms({ ...atStart, junctionArcs: [, [3.04]], underArcs: [, [4.93]] });
    expect(b[2]).toBeCloseTo(0.04, 1); // winPos: |3.04 - 0| - reach 3
    const { b: b0 } = gfMarkerUniforms({ ...atStart, junctionArcs: [, []], underArcs: [, []] });
    expect(b0[2]).toBeGreaterThan(3.2); // no junction: the marched window stands
  });
  it("a fan stopped short of the fade by its own cut leaves the window (the start on link A)", () => {
    const { b } = gfMarkerUniforms({ ...atStart, junctionArcs: [, [4.67]], underArcs: [, [3.72]] });
    const exitD = RADIUS + MARGIN + 1.2 + 2 * 0.4 + 0.05;
    expect(b[2]).toBeGreaterThanOrEqual(exitD);
    expect(b[2]).toBeLessThan(exitD + 0.15);
  });
});
