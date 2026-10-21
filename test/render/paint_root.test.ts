// K620: the glyph root's paint (paint_math.ts, THE GLYPH ROOT'S PAINT). A
// synthetic body chain (C arrives at J, O leaves) and a root chain whose
// first stretch R -> J is the tapered root: at R each side equals its
// stroke's paint at its foot, at J both sides equal the spur's paint, the
// seam is one pixel of coverage, and the table round-trips.

import { describe, expect, it } from "vitest";
import { buildSectionRuns, gamutConfig, type ColorScheme, type RunChain } from "../../src/core/section_colors";
import type { WalkEdge, WalkGraph, WalkVertex } from "../../src/core/walk_graph";
import {
  MAX_KNOTS,
  kChain,
  kCtrlOfArc,
  kRootAt,
  kRootFragSections,
  kRootOf,
  kRootPaint,
  kRootSpurSection,
  kSectionAtArc,
  kShadeFx,
  writeChainHeader,
  writeGeomTable,
  writeRootTable,
  writeRunTexels,
  ROOT_ENTRY,
  ROOT_HEAD,
  type KData,
  type KUniforms,
} from "../../src/render/paint_math";

const SEED = 477972011;
const HUE = SEED % 360;
const TOL = 1 / 255;

function uniforms(dist: number, ease: number): KUniforms {
  const K = new Float32Array(MAX_KNOTS * 4);
  K.set([0, 0, 1, 1]);
  const [arc, sat, light] = gamutConfig();
  return {
    uKBase: new Float32Array([0, 0, 0, 1]),
    uKFx: new Float32Array(4),
    uKFx2: new Float32Array(4),
    uKShape: new Float32Array([1, 0, 1, 0]),
    uKInk: new Float32Array([1, 0, 0, 0]),
    uKKnots: K,
    uKGamut: new Float32Array([HUE, arc, sat, light]),
    uKSect: new Float32Array([dist, ease, 0, 0]),
    uKPaint: new Float32Array(4),
    uKPulse: new Float32Array(4),
    uKReach: new Float32Array(4),
    uKGold: new Float32Array([1, 0.8, 0.2, 1]),
  };
}

// Chain 0 (the body): open, ctrl 0..40, junctions at 12, J = 20, 28.
// Chain 1 (root + spur): open, ctrl 0..20; R = ctrl 0, J = ctrl 8 (joint 4).
const BODY_N = 41;
const ROOT_N = 21;
const BODY_J = 20;
const JOINT = 4;

function cal(n: number, step: (i: number) => number): number[] {
  const out = [0];
  let a = 0;
  for (let i = 1; i < n; i++) {
    a += step(i);
    out.push(Math.fround(a));
  }
  return out;
}

const BODY_CAL = cal(BODY_N, (i) => 0.3 + 0.1 * Math.sin(i));
const ROOT_CAL = cal(ROOT_N, (i) => 0.25 + 0.05 * Math.cos(i * 0.7));

function walk(): WalkGraph {
  const vertices = new Map<string, WalkVertex>();
  const edges: WalkEdge[] = [];
  const v = (id: string, chain: number, ctrl: number, isEnd: boolean): void => {
    vertices.set(id, { id, isEnd, chain, ctrl, edges: [] });
  };
  v("b0", 0, 0, true);
  v("b1", 0, 12, false);
  v("J", 0, BODY_J, false);
  v("b3", 0, 28, false);
  v("b4", 0, 40, true);
  v("R", 1, 0, true);
  v("T", 1, 20, true);
  const e = (va: string, vb: string, chain: number, a: number, b: number): void => {
    const id = edges.length;
    edges.push({ id, va, vb, chain, ctrlA: a, ctrlB: b, length: (b - a) * 0.4 });
    vertices.get(va)!.edges.push(id);
    vertices.get(vb)!.edges.push(id);
  };
  e("b0", "b1", 0, 0, 12);
  e("b1", "J", 0, 12, BODY_J);
  e("J", "b3", 0, BODY_J, 28);
  e("b3", "b4", 0, 28, 40);
  e("R", "J", 1, 0, 2 * JOINT);
  e("J", "T", 1, 2 * JOINT, 20);
  return { vertices, edges, start: "b0", exit: "b4", optimalLength: 1, distToExit: new Map() };
}

interface Root {
  footC: number[]; // body arcs of C's feet, R -> J
  footO: number[];
  hw: number[];
  uv: number[][]; // (uvMC, uvEC, uvMO, uvEO)
}

// A root of 17 entries: the feet close on J (C before it, O after), the
// half-width tapers to 0 at J, the across coordinates sit inside the strokes.
function makeRoot(): Root {
  const arcJ = BODY_CAL[BODY_J];
  const r: Root = { footC: [], footO: [], hw: [], uv: [] };
  for (let k = 0; k <= 16; k++) {
    const p = 1 - k / 16;
    r.footC.push(arcJ - 2.1 * p);
    r.footO.push(arcJ + 1.7 * p - 0.15 * Math.sin(Math.PI * p));
    r.hw.push(0.26 * p);
    r.uv.push([0.5 - 0.3 * p, 0.5 - 0.3 * p + 0.25 * p, 0.5 + 0.28 * p, 0.5 + 0.28 * p - 0.22 * p]);
  }
  return r;
}

function scene(scheme: ColorScheme, root: Root, side: number): KData {
  const chains: RunChain[] = [
    { len: BODY_N, closed: false },
    { len: ROOT_N, closed: false },
  ];
  const sr = buildSectionRuns(scheme, walk(), chains, undefined, SEED, HUE);
  const idx = [4, 4 + BODY_N];
  const runBase = 4 + BODY_N + ROOT_N;
  const stat = new Float32Array((runBase + 4 * sr.runs.length + 4) * 4);
  const geomBase = [0, 1 + Math.ceil(BODY_N / 4)];
  const geomEnd = geomBase[1] + 1 + Math.ceil(ROOT_N / 4);
  const NR = root.footC.length;
  const geom = new Float32Array((geomEnd + ROOT_HEAD + NR * ROOT_ENTRY + 1) * 4);
  const cals = [BODY_CAL, ROOT_CAL];
  cals.forEach((c, ch) => {
    writeChainHeader(stat, ch, {
      nCtrl: c.length,
      closed: false,
      count: 64,
      idxBase: idx[ch],
      geomBase: geomBase[ch],
      srcFirst: 0,
      srcCount: 0,
      paintBase: ch === 1 ? geomEnd + 1 : 0,
    });
    for (let k = 0; k < c.length; k++) stat[(idx[ch] + k) * 4] = sr.slotRun[ch][k];
    writeGeomTable(geom, geomBase[ch], c[c.length - 1], 64, false, c);
  });
  sr.runs.forEach((run, i) => writeRunTexels(stat, runBase, i, run));
  const e0: number[] = [];
  const e1: number[] = [];
  for (let k = 0; k < NR; k++) {
    e0.push(root.footC[k], root.footO[k], root.hw[k], 0);
    e1.push(...root.uv[k]);
  }
  writeRootTable(geom, geomEnd, 0, side, ROOT_CAL[2 * JOINT], 2 * JOINT, e0, e1);
  return { stat, geom, reveal: new Float32Array(8), paint: new Float32Array(4) };
}

// The stroke's own paint at body arc `a`, across coordinate `uv`: the
// ribbon's Gouraud section there plus the FX (what SECTION_FRAG shows).
function strokePaint(D: KData, U: KUniforms, a: number, uv: number): number[] {
  const b = kChain(D, 0);
  const rgb = new Float32Array(3);
  kSectionAtArc(D, U, b, a, -1, rgb);
  kShadeFx(D, U, b, kCtrlOfArc(D, b, a), a / b.arcPer, uv, rgb);
  return [...rgb];
}

// The spur's paint just past J (the ordinary path at root arc `a`).
function spurPaint(D: KData, U: KUniforms, a: number, side: number): number[] {
  const c = kChain(D, 1);
  const rgb = new Float32Array(3);
  kSectionAtArc(D, U, c, a, -1, rgb);
  kShadeFx(D, U, c, kCtrlOfArc(D, c, a), a / c.arcPer, side, rgb);
  return [...rgb];
}

function rootPaint(D: KData, U: KUniforms, alpha: number, side: number, pxW: number): number[] {
  const root = kChain(D, 1);
  const r = kRootOf(D, 1)!;
  const sC = new Float32Array(3);
  const sO = new Float32Array(3);
  const sJ = new Float32Array(3);
  kRootFragSections(D, U, root, r, alpha, sC, sO);
  kRootSpurSection(D, U, root, r, sJ);
  const out = { rgb: new Float32Array(3), alpha: 1 };
  kRootPaint(D, U, root, r, alpha, side, pxW, sC, sO, sJ, out);
  return [...out.rgb];
}

function maxDiff(a: number[], b: number[]): number {
  return Math.max(...a.map((x, i) => Math.abs(x - b[i])));
}

const SCHEMES: ColorScheme[] = ["mono", "strands", "depth", "segments", "noise"];

describe("K620 root paint mirror", () => {
  it("round-trips the root table", () => {
    const root = makeRoot();
    const D = scene("segments", root, 1);
    const r = kRootOf(D, 1)!;
    expect(r.body).toBe(0);
    expect(r.side).toBe(1);
    expect(r.n).toBe(17);
    expect(r.ctrlJ).toBe(2 * JOINT);
    expect(r.arcJ).toBe(Math.fround(ROOT_CAL[2 * JOINT]));
    expect(kRootOf(D, 0)).toBeNull();
    const t = new Float64Array(8);
    kRootAt(D, r, 0, t);
    expect(t[0]).toBeCloseTo(root.footC[0], 5);
    expect(t[1]).toBeCloseTo(root.footO[0], 5);
    kRootAt(D, r, r.arcJ, t);
    expect(t[0]).toBeCloseTo(root.footC[16], 5);
    kRootAt(D, r, r.arcJ * (3.5 / 16), t);
    expect(t[1]).toBeCloseTo((root.footO[3] + root.footO[4]) / 2, 5);
  });

  for (const scheme of SCHEMES) {
    for (const side of [1, -1]) {
      it(`R = each stroke's paint at its foot, J = the spur's (${scheme}, sideSign ${side})`, () => {
        const root = makeRoot();
        const D = scene(scheme, root, side);
        for (const [dist, ease] of [
          [0.88, 0.88],
          [0, 0],
          [3, 1],
        ]) {
          const U = uniforms(dist, ease);
          const pxW = 0.02;
          // vUV.y on C's edge: sideSign +1 puts C on the vUV.y > 0.5 side.
          const sC = side > 0 ? 1 : 0;
          const sO = 1 - sC;
          const atR_C = rootPaint(D, U, 0, sC, pxW);
          const atR_O = rootPaint(D, U, 0, sO, pxW);
          expect(maxDiff(atR_C, strokePaint(D, U, root.footC[0], root.uv[0][1]))).toBeLessThanOrEqual(TOL);
          expect(maxDiff(atR_O, strokePaint(D, U, root.footO[0], root.uv[0][3]))).toBeLessThanOrEqual(TOL);
          const arcJ = Math.fround(ROOT_CAL[2 * JOINT]);
          const spur = spurPaint(D, U, arcJ, 0.5);
          for (const s of [0, 0.25, 0.5, 0.75, 1]) {
            expect(maxDiff(rootPaint(D, U, arcJ * (1 - 1e-7), s, pxW), spur)).toBeLessThanOrEqual(TOL);
          }
          // Continuity across J: the ordinary paint just past it.
          expect(maxDiff(spurPaint(D, U, arcJ + 1e-4, 0.5), spur)).toBeLessThanOrEqual(TOL);
        }
      });
    }
  }

  it("antialiases the seam over one pixel, centred on the centerline", () => {
    const root = makeRoot();
    const D = scene("segments", root, 1);
    const U = uniforms(0.88, 0.88);
    const r = kRootOf(D, 1)!;
    const alpha = r.arcJ * 0.25;
    const t = new Float64Array(8);
    kRootAt(D, r, alpha, t);
    const hw = t[2];
    const pxW = 0.02;
    const cOnly = rootPaint(D, U, alpha, 0.5 + pxW / (4 * hw) + 1e-6, pxW);
    const oOnly = rootPaint(D, U, alpha, 0.5 - pxW / (4 * hw) - 1e-6, pxW);
    const mid = rootPaint(D, U, alpha, 0.5, pxW);
    for (let i = 0; i < 3; i++) expect(mid[i]).toBeCloseTo((cOnly[i] + oOnly[i]) / 2, 2);
    // One pixel past the centerline on either side: that side alone.
    const far = rootPaint(D, U, alpha, 0.5 + pxW / (2 * hw), pxW);
    const farC = rootPaint(D, U, alpha, 0.5 + pxW / hw, pxW);
    expect(maxDiff(far.map((x, i) => x - farC[i]), [0, 0, 0])).toBeLessThan(0.02);
  });

  it("blends by the junction ease (monotone from the strokes to the spur)", () => {
    const root = makeRoot();
    const D = scene("segments", root, 1);
    const U = uniforms(0.88, 0.88);
    const r = kRootOf(D, 1)!;
    const spur = spurPaint(D, U, r.arcJ, 0.5);
    let prev = Infinity;
    for (let k = 0; k <= 16; k++) {
      const d = maxDiff(rootPaint(D, U, (r.arcJ * k) / 16, 0.9, 0.02), spur);
      expect(d).toBeLessThanOrEqual(prev + 0.05);
      prev = d;
    }
    expect(prev).toBeLessThanOrEqual(TOL);
  });
});
