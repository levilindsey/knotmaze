// K1220 S4: a tapered root arm's strip texel wears the root's K620 paint
// per side (paint_math kRootStripSection, the CPU twin of arm_strip's
// root modes): at R each side is its foot's body section, at J both are
// the spur's, and the centre is their mean at the same ease.

import { describe, expect, it } from "vitest";
import { buildSectionRuns, gamutConfig, type RunChain } from "../../src/core/section_colors";
import type { WalkGraph } from "../../src/core/walk_graph";
import {
  MAX_KNOTS,
  kChain,
  kRootStripSection,
  kSectionAtArc,
  writeChainHeader,
  writeGeomTable,
  writeRootTable,
  writeRunTexels,
  ROOT_HEAD,
  ROOT_ENTRY,
  type KData,
  type KUniforms,
} from "../../src/render/paint_math";

const SEED = 477972011;
const HUE = SEED % 360;
const TOL = 1 / 255;
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

function uniforms(): KUniforms {
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
    uKSect: new Float32Array([0.88, 0.88, 0, 0]),
    uKPaint: new Float32Array(4),
    uKPulse: new Float32Array(4),
    uKReach: new Float32Array(4),
    uKGold: new Float32Array([1, 0.8, 0.2, 1]),
  };
}

function walk(): WalkGraph {
  const vertices = new Map();
  const edges: never[] = [];
  const v = (id: string, chain: number, ctrl: number, isEnd: boolean): void => {
    vertices.set(id, { id, isEnd, chain, ctrl, edges: [] });
  };
  v("b0", 0, 0, true);
  v("J", 0, BODY_J, false);
  v("b4", 0, 40, true);
  v("R", 1, 0, true);
  v("T", 1, 20, true);
  const e = (va: string, vb: string, chain: number, a: number, b: number): void => {
    const id = edges.length;
    edges.push({ id, va, vb, chain, ctrlA: a, ctrlB: b, length: (b - a) * 0.4 } as never);
    vertices.get(va)!.edges.push(id);
    vertices.get(vb)!.edges.push(id);
  };
  e("b0", "J", 0, 0, BODY_J);
  e("J", "b4", 0, BODY_J, 40);
  e("R", "J", 1, 0, 2 * JOINT);
  e("J", "T", 1, 2 * JOINT, 20);
  return { vertices, edges, start: "b0", exit: "b4", optimalLength: 1, distToExit: new Map() } as WalkGraph;
}

function scene(): { D: KData; footC0: number; footO0: number; arcJ: number } {
  const chains: RunChain[] = [
    { len: BODY_N, closed: false },
    { len: ROOT_N, closed: false },
  ];
  const sr = buildSectionRuns("segments", walk(), chains, undefined, SEED, HUE);
  const idx = [4, 4 + BODY_N];
  const runBase = 4 + BODY_N + ROOT_N;
  const stat = new Float32Array((runBase + 4 * sr.runs.length + 4) * 4);
  const geomBase = [0, 1 + Math.ceil(BODY_N / 4)];
  const geomEnd = geomBase[1] + 1 + Math.ceil(ROOT_N / 4);
  const arcJ = BODY_CAL[BODY_J];
  const NR = 17;
  const geom = new Float32Array((geomEnd + ROOT_HEAD + NR * ROOT_ENTRY + 1) * 4);
  const cals = [BODY_CAL, ROOT_CAL];
  cals.forEach((c, ch) => {
    writeChainHeader(stat, ch, {
      nCtrl: c.length, closed: false, count: 64, idxBase: idx[ch],
      geomBase: geomBase[ch], srcFirst: 0, srcCount: 0,
      paintBase: ch === 1 ? geomEnd + 1 : 0,
    });
    for (let k = 0; k < c.length; k++) stat[(idx[ch] + k) * 4] = sr.slotRun[ch][k];
    writeGeomTable(geom, geomBase[ch], c[c.length - 1], 64, false, c);
  });
  sr.runs.forEach((run, i) => writeRunTexels(stat, runBase, i, run));
  const e0: number[] = [];
  const e1: number[] = [];
  for (let k = 0; k < NR; k++) {
    const p = 1 - k / 16;
    e0.push(arcJ - 2.1 * p, arcJ + 1.7 * p, 0.26 * p, 0);
    e1.push(0.5, 0.75, 0.5, 0.28);
  }
  writeRootTable(geom, geomEnd, 0, 1, ROOT_CAL[2 * JOINT], 2 * JOINT, e0, e1);
  return { D: { stat, geom, reveal: new Float32Array(8), paint: new Float32Array(4) }, footC0: arcJ - 2.1, footO0: arcJ + 1.7, arcJ: ROOT_CAL[2 * JOINT] };
}

const sec = (D: KData, U: KUniforms, ch: number, a: number): number[] => {
  const out = new Float32Array(3);
  kSectionAtArc(D, U, kChain(D, ch), a, -1, out);
  return [...out];
};
const maxDiff = (a: number[], b: number[]): number => Math.max(...a.map((x, i) => Math.abs(x - b[i])));

describe("K1220 S4 root strip section", () => {
  it("at R each side is its foot's section; at J both are the spur's; centre is the mean", () => {
    const { D, footC0, footO0, arcJ } = scene();
    const U = uniforms();
    const out = new Float32Array(3);
    expect(kRootStripSection(D, U, 1, 0, 1, out)).toBe(true);
    expect(maxDiff([...out], sec(D, U, 0, footC0))).toBeLessThanOrEqual(TOL);
    expect(kRootStripSection(D, U, 1, 0, 0, out)).toBe(true);
    expect(maxDiff([...out], sec(D, U, 0, footO0))).toBeLessThanOrEqual(TOL);
    const spur = sec(D, U, 1, arcJ);
    for (const cov of [0, 0.5, 1]) {
      expect(kRootStripSection(D, U, 1, arcJ * (1 - 1e-7), cov, out)).toBe(true);
      expect(maxDiff([...out], spur)).toBeLessThanOrEqual(TOL);
    }
    const mid = arcJ * 0.5;
    const c = new Float32Array(3);
    const o = new Float32Array(3);
    const m = new Float32Array(3);
    kRootStripSection(D, U, 1, mid, 1, c);
    kRootStripSection(D, U, 1, mid, 0, o);
    kRootStripSection(D, U, 1, mid, 0.5, m);
    for (let i = 0; i < 3; i++) expect(m[i]).toBeCloseTo((c[i] + o[i]) / 2, 6);
    // No root on the body chain; at/past J is the spur's own section.
    expect(kRootStripSection(D, U, 0, 0, 1, out)).toBe(false);
    expect(kRootStripSection(D, U, 1, arcJ, 1, out)).toBe(false);
  });
});
