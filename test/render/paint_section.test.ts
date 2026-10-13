// G2.2 (section colors on the GPU): the CPU mirror's knotSection - the
// line-for-line twin of the vertex shader's - against core evalRunSection
// over real run tables, the ribbon-Gouraud twin kSectionAtArc, and the
// seeded ctrl search the fans use (it must return kCtrlOfArc's answer).

import { describe, expect, it } from "vitest";
import {
  buildSectionRuns,
  evalRunSection,
  gamutConfig,
  type ColorScheme,
  type RunChain,
} from "../../src/core/section_colors";
import type { WalkEdge, WalkGraph, WalkVertex } from "../../src/core/walk_graph";
import {
  MAX_KNOTS,
  kChain,
  kCtrlOfArc,
  kCtrlOfArcNear,
  kSectionAtArc,
  knotSection,
  writeChainHeader,
  writeGeomTable,
  writeRunTexels,
  type KData,
  type KUniforms,
} from "../../src/render/paint_math";
import { randomChain } from "./fixtures/chains";
import type { FrozenSamples } from "./fixtures/pre_g2";

const SEED = 477972011;
const HUE = SEED % 360;

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296);
}

function uniforms(dist: number): KUniforms {
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
    uKSect: new Float32Array([dist, Math.min(1, dist), 0, 0]),
  };
}

// A walk over random chains: each chain cut at random junction slots into
// runs (closed chains: the last run wraps the seam), junction vertices
// shared between consecutive runs of a chain and, now and then, across
// chains (so segments' junction means mix several runs).
function randomWalk(r: () => number, chains: RunChain[]): WalkGraph {
  const edges: WalkEdge[] = [];
  const vertices = new Map<string, WalkVertex>();
  const touch = (id: string, chain: number, e: number): void => {
    const v = vertices.get(id) ?? { id, isEnd: false, chain, ctrl: 0, edges: [] };
    v.edges.push(e);
    vertices.set(id, v);
  };
  chains.forEach((g, c) => {
    const cuts: number[] = [];
    for (let s = 0; s < g.len - 1; s += 3 + Math.floor(r() * 9)) cuts.push(s);
    if (!g.closed) cuts.push(g.len - 1);
    const vid = (k: number): string => (r() < 0.2 && c > 0 ? `c${c - 1}v0` : `c${c}v${k}`);
    const ids = cuts.map((_, k) => vid(k));
    const pairs: Array<[number, number, number, number]> = [];
    for (let k = 0; k + 1 < cuts.length; k++) pairs.push([cuts[k], cuts[k + 1], k, k + 1]);
    if (g.closed && cuts.length > 0) pairs.push([cuts[cuts.length - 1], cuts[0] + g.len, cuts.length - 1, 0]);
    for (const [a, b, ka, kb] of pairs) {
      const id = edges.length;
      edges.push({ id, va: ids[ka], vb: ids[kb], chain: c, ctrlA: a, ctrlB: b, length: (b - a) * (0.5 + r()) });
      touch(ids[ka], c, id);
      touch(ids[kb], c, id);
    }
  });
  const start = [...vertices.keys()][0];
  return { vertices, edges, start, exit: start, optimalLength: 1, distToExit: new Map() };
}

// One scene's KData: chain headers, CTRLIDX .x (slot -> run), RUNS, KGEOM.
function scene(samples: FrozenSamples[], sr: ReturnType<typeof buildSectionRuns>): KData {
  const n = samples.length;
  let t = 2 * n;
  const idx: number[] = [];
  for (const s of samples) {
    idx.push(t);
    t += s.controlArcLengths.length;
  }
  const runBase = t;
  const stat = new Float32Array((runBase + 4 * sr.runs.length + 4) * 4);
  let g = 0;
  const geomBase: number[] = [];
  for (const s of samples) {
    geomBase.push(g);
    g += 1 + Math.ceil(s.controlArcLengths.length / 4);
  }
  const geom = new Float32Array((g + 1) * 4);
  samples.forEach((s, c) => {
    writeChainHeader(stat, c, {
      nCtrl: s.controlArcLengths.length,
      closed: s.closed,
      count: s.count,
      idxBase: idx[c],
      geomBase: geomBase[c],
      srcFirst: 0,
      srcCount: 0,
      paintBase: 0,
    });
    for (let k = 0; k < s.controlArcLengths.length; k++) stat[(idx[c] + k) * 4] = sr.slotRun[c][k];
    writeGeomTable(geom, geomBase[c], s.totalLength, s.count, s.closed, s.controlArcLengths);
  });
  sr.runs.forEach((run, i) => writeRunTexels(stat, runBase, i, run));
  return { stat, geom, reveal: new Float32Array(8), paint: new Float32Array(4) };
}

const SCHEMES: ColorScheme[] = ["mono", "strands", "depth", "segments"];

describe("G2.2 section mirror (knotSection)", () => {
  it("equals evalRunSection over real run tables (4 schemes x 5 blends)", () => {
    const r = rng(2024);
    for (let trial = 0; trial < 6; trial++) {
      const samples = [0, 1, 2, 3].map((i) => randomChain(r, 20 + Math.floor(r() * 80), (i + trial) % 2 === 0));
      const chains: RunChain[] = samples.map((s) => ({ len: s.controlArcLengths.length, closed: s.closed }));
      const walk = randomWalk(r, chains);
      for (const scheme of SCHEMES) {
        const sr = buildSectionRuns(scheme, walk, chains, undefined, SEED, HUE);
        const D = scene(samples, sr);
        for (const dist of [0, 0.1, 0.5, 0.88, 3]) {
          const U = uniforms(dist);
          U.uKBase[0] = 2 * samples.length + chains.reduce((a, g) => a + g.len, 0);
          for (let c = 0; c < chains.length; c++) {
            const kc = kChain(D, c);
            const top = chains[c].closed ? chains[c].len : chains[c].len - 1;
            // One assertion per chain on the worst point: 96k points x 3
            // channels of expect() overhead ran this test into the 5 s
            // timeout on CI's runner.
            let worst = 0;
            let worstCtrl = -1;
            for (let i = 0; i < 200; i++) {
              const ctrl = r() * top;
              const slot = Math.min(chains[c].len - 1, Math.floor(ctrl));
              const want = evalRunSection(sr.runs[sr.slotRun[c][slot]], ctrl, chains[c].len, chains[c].closed, dist, HUE);
              const got = [0, 0, 0];
              knotSection(D, U, kc, ctrl, got);
              for (let k = 0; k < 3; k++) {
                const err = Math.abs(got[k] - want[k]);
                // A NaN sticks (no later err compares greater), and fails.
                if (Number.isNaN(err) || err > worst) {
                  worst = err;
                  worstCtrl = ctrl;
                }
              }
            }
            // f32 table storage: ~1e-6.
            expect(worst, `trial ${trial}, ${scheme}, blend ${dist}, chain ${c}, ctrl ${worstCtrl}`).toBeLessThan(2e-5);
          }
        }
      }
    }
  });

  it("kSectionAtArc is the ribbon's Gouraud of its vertex sections", () => {
    const r = rng(77);
    const samples = [randomChain(r, 90, true), randomChain(r, 70, false)];
    const chains: RunChain[] = samples.map((s) => ({ len: s.controlArcLengths.length, closed: s.closed }));
    const sr = buildSectionRuns("segments", randomWalk(r, chains), chains, undefined, SEED, HUE);
    const D = scene(samples, sr);
    const U = uniforms(0.88);
    U.uKBase[0] = 4 + chains.reduce((a, g) => a + g.len, 0);
    for (let c = 0; c < 2; c++) {
      const kc = kChain(D, c);
      for (let i = 0; i < 400; i++) {
        const a = r() * kc.total;
        const f = kc.closed ? (a / kc.total) * kc.count : (a / kc.total) * (kc.count - 1);
        const k0 = Math.floor(f) % kc.count;
        const k1 = kc.closed ? (k0 + 1) % kc.count : Math.min(kc.count - 1, k0 + 1);
        const s0 = [0, 0, 0];
        const s1 = [0, 0, 0];
        knotSection(D, U, kc, kCtrlOfArc(D, kc, k0 * kc.arcPer), s0);
        knotSection(D, U, kc, kCtrlOfArc(D, kc, k1 * kc.arcPer), s1);
        const fr = f - Math.floor(f);
        const seeded = [0, 0, 0];
        const unseeded = [0, 0, 0];
        kSectionAtArc(D, U, kc, a, kCtrlOfArc(D, kc, a) + (r() - 0.5) * 6, seeded);
        kSectionAtArc(D, U, kc, a, -1, unseeded);
        for (let k = 0; k < 3; k++) {
          // (The mirror's sample scratch is f32, as the GPU varyings are.)
          expect(unseeded[k]).toBeCloseTo(s0[k] + (s1[k] - s0[k]) * fr, 6);
          expect(seeded[k]).toBe(unseeded[k]);
        }
      }
    }
  });

  it("kCtrlOfArcNear returns kCtrlOfArc's answer from any seed", () => {
    const r = rng(5);
    for (let trial = 0; trial < 20; trial++) {
      const s = randomChain(r, 30 + Math.floor(r() * 200), trial % 2 === 0);
      const cal = s.controlArcLengths;
      // Duplicate arcs (zero-length slots) where fused tips collapse.
      if (trial % 3 === 0) for (let k = 5; k < 8; k++) cal[k] = cal[4];
      const D: KData = {
        stat: new Float32Array(16),
        geom: new Float32Array((2 + Math.ceil(cal.length / 4)) * 4),
        reveal: new Float32Array(8),
        paint: new Float32Array(4),
      };
      writeChainHeader(D.stat, 0, { nCtrl: cal.length, closed: s.closed, count: s.count, idxBase: 2, geomBase: 0, srcFirst: 0, srcCount: 0, paintBase: 0 });
      writeGeomTable(D.geom, 0, s.totalLength, s.count, s.closed, cal);
      const c = kChain(D, 0);
      for (let i = 0; i < 300; i++) {
        const a = r() * c.total;
        const seed = r() * (cal.length - 1);
        expect(kCtrlOfArcNear(D, c, a, seed)).toBe(kCtrlOfArc(D, c, a));
      }
    }
  });
});
