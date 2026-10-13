// G2.1 (reveal + appearance FX on the GPU): the CPU mirror against the
// frozen pre-G2 per-sample code (fixtures/pre_g2.ts). The shaders are
// line-for-line twins of the mirror (census-checked in the browser), so
// these suites pin the mirror to what the old pipeline computed.

import { describe, expect, it } from "vitest";
import {
  FX_STYLE,
  PAINT_CONST,
} from "../../src/render/paint_const";
import {
  MAX_KNOTS,
  kBurn,
  kArcU,
  kChain,
  kCtrlOfArc,
  kFanAlpha,
  kFxColor,
  kFxDoneWall,
  kFxSolid,
  kFxWeight,
  kHeadLeave,
  kIgnition,
  kRevealMaskAt,
  kSwell,
  kWall,
  layoutSources,
  sourceHints,
  sourcePieces,
  writeChainHeader,
  writeGeomTable,
  type KData,
  type KSource,
  type KUniforms,
} from "../../src/render/paint_math";
import { intervalsAt, type RevealPlan } from "../../src/core/reveal_plan";
import {
  oldBurnSample,
  oldFanFx,
  oldFxSolid,
  oldFxWeight,
  oldIntervalMask,
  oldSwell,
  type FrozenSamples,
} from "./fixtures/pre_g2";
import { randomChain } from "./fixtures/chains";

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296);
}

function uniforms(): KUniforms {
  const K = new Float32Array(MAX_KNOTS * 4);
  K.set([0, 0, 1, 1]);
  return {
    uKBase: new Float32Array(4),
    uKFx: new Float32Array(4),
    uKFx2: new Float32Array(4),
    uKShape: new Float32Array([1, 0, 1, 0]),
    uKInk: new Float32Array([1, 0, 0, 0]),
    uKKnots: K,
    uKGamut: new Float32Array([0, 280, 0.45, 0.64]),
    uKSect: new Float32Array(4),
  };
}

// One chain + its sources laid out exactly as PaintScene does.
function scene(s: FrozenSamples, srcs: KSource[]): KData {
  const n = s.controlArcLengths.length;
  const pieces = sourcePieces(srcs, n, s.closed);
  const lay = layoutSources([pieces]);
  const idxBase = 8;
  const stat = new Float32Array((idxBase + n + 4) * 4);
  writeChainHeader(stat, 0, {
    nCtrl: n,
    closed: s.closed,
    count: s.count,
    idxBase,
    geomBase: 0,
    srcFirst: lay.first[0],
    srcCount: lay.count[0],
    paintBase: 0,
  });
  const h = sourceHints(pieces, lay.first[0], n);
  expect(h.overflow).toBe(0);
  for (let i = 0; i < n; i++) {
    stat[(idxBase + i) * 4 + 1] = h.hints[i];
    stat[(idxBase + i) * 4 + 3] = h.tLate[i];
  }
  const geom = new Float32Array((2 + Math.ceil(n / 4)) * 4);
  writeGeomTable(geom, 0, s.totalLength, s.count, s.closed, s.controlArcLengths);
  return { stat, geom, reveal: lay.data, paint: new Float32Array(4) };
}

// Trace-like plan on one chain: runs between junction ctrls (even ints),
// each revealed by two fronts meeting where arrival times balance.
function tracePlan(r: () => number, n: number, closed: boolean): KSource[] {
  const stops: number[] = [];
  for (let c = 0; c < n - 1; c += 2 + 2 * Math.floor(r() * 6)) stops.push(c);
  if (!closed) stops.push(n - 1);
  // Arrival times like the plan's Dijkstra: consistent along every run
  // (|Ta - Tb| <= span / rate - the triangle inequality), else a run's
  // single front would reach its far vertex at a different time than that
  // vertex's own fronts start (a seam real plans cannot have).
  const rate = 2 + r() * 6;
  const T = stops.map(() => r() * 3);
  const edges: Array<[number, number, number]> = [];
  for (let i = 0; i + 1 < stops.length; i++) edges.push([i, i + 1, stops[i + 1] - stops[i]]);
  if (closed && stops.length > 1) edges.push([stops.length - 1, 0, stops[0] + n - stops[stops.length - 1]]);
  for (let pass = 0; pass < stops.length + 2; pass++) {
    for (const [i, j, span] of edges) {
      T[j] = Math.min(T[j], T[i] + span / rate);
      T[i] = Math.min(T[i], T[j] + span / rate);
    }
  }
  const out: KSource[] = [];
  const runs: Array<[number, number, number, number]> = [];
  for (let i = 0; i + 1 < stops.length; i++) runs.push([stops[i], stops[i + 1], T[i], T[i + 1]]);
  if (closed && stops.length > 0) runs.push([stops[stops.length - 1], stops[0] + n, T[stops.length - 1], T[0]]);
  for (const [a, b, Ta, Tb] of runs) {
    const span = b - a;
    const tMeet = (span / rate + Ta + Tb) / 2;
    const cMeet = a + Math.max(0, Math.min(span, (tMeet - Ta) * rate));
    if (cMeet - a > 1e-9) out.push({ chain: 0, cFrom: a, cTo: cMeet, t0: Ta, rate });
    if (b - cMeet > 1e-9) out.push({ chain: 0, cFrom: b, cTo: cMeet, t0: Tb, rate });
  }
  return out;
}

describe("G2.1 FX mirror vs the frozen per-sample code", () => {
  it("burn / roots colors match applyBurnColors' per-sample block", () => {
    const r = rng(77);
    const U = uniforms();
    for (let i = 0; i < 4000; i++) {
      const clock = r() * 200;
      U.uKFx2[0] = (13 * clock) % (Math.PI * 2);
      U.uKFx2[1] = (29 * clock) % (Math.PI * 2);
      U.uKFx2[3] = 0.3 * Math.sin(13 * clock) + 0.2 * Math.sin(29 * clock);
      const t = r() * 1.5;
      const k = Math.floor(r() * 3000);
      const roots = r() < 0.3;
      const base = [r(), r(), r()];
      const a = [...base];
      const b = [...base];
      oldBurnSample(a, t, k, clock, roots);
      kBurn(U, b, t, k, roots);
      for (let c = 0; c < 3; c++) expect(b[c]).toBeCloseTo(a[c], 6);
    }
  });

  it("rainbow / materialize weights, fan alpha and the swell match", () => {
    for (let i = 0; i <= 400; i++) {
      const age = (i / 400) * 1.6;
      expect(kFxWeight(FX_STYLE.rainbow, age)).toBeCloseTo(oldFxWeight("rainbow", age), 12);
      expect(kFxWeight(FX_STYLE.dust, age)).toBeCloseTo(oldFxWeight("dust", age), 12);
      expect(kFxWeight(FX_STYLE.comet, age)).toBeCloseTo(oldFxWeight("comet", age), 12);
      expect(kSwell(age)).toBeCloseTo(oldSwell(oldFxWeight("rainbow", age)), 12);
      for (const w of [oldFxWeight("rainbow", age), oldFxWeight("dust", age)]) {
        expect(kFxSolid(w)).toBeCloseTo(oldFxSolid(w), 12);
        expect(kFanAlpha(kFxSolid(w))).toBeCloseTo(1 + oldFanFx(oldFxSolid(w)), 12);
      }
    }
  });

  it("the reveal width mask equals revealMaskFor's interval union", () => {
    const r = rng(4242);
    for (let trial = 0; trial < 40; trial++) {
      const closed = trial % 2 === 0;
      const s = randomChain(r, 12 + Math.floor(r() * 200), closed);
      const n = s.controlArcLengths.length;
      const srcs = tracePlan(r, n, closed);
      const D = scene(s, srcs);
      const c = kChain(D, 0);
      const U = uniforms();
      const plan: RevealPlan = {
        mode: "trace",
        sources: [srcs.map((x) => ({ ...x }))],
        duration: 10,
        origin: { chain: 0, ctrl: 0 },
        inkSpeed: 1,
      };
      for (const [taperMul, tf] of [[1, 0], [1.6, 0.55], [8, 0.5], [16, 0]]) {
        U.uKShape[0] = PAINT_CONST.REVEAL_TAPER_ARC * taperMul;
        U.uKShape[1] = tf;
        U.uKFx2[2] = 1;
        for (const t of [0.3, 1.1, 2.4, 4.0, 9.0]) {
          U.uKFx[1] = t;
          const old = oldIntervalMask(
            s,
            intervalsAt(plan, 0, t),
            U.uKShape[0],
            tf
          );
          for (let k = 0; k < s.count; k++) {
            const a = s.closed
              ? (k / s.count) * s.totalLength
              : (k / (s.count - 1)) * s.totalLength;
            const m = kRevealMaskAt(D, U, c, kCtrlOfArc(D, c, a));
            if (Math.abs(m - old[k]) >= 2e-5) {
              console.log(JSON.stringify({ trial, closed, n, count: s.count, total: s.totalLength, k, a, ctrl: kCtrlOfArc(D, c, a), t, taperMul, tf, m, old: old[k], srcs, ivs: intervalsAt(plan, 0, t) }));
            }
            expect(Math.abs(m - old[k])).toBeLessThan(2e-5);
          }
        }
      }
    }
    // (~4 s alone; the full suite runs files in parallel.)
  }, 30000);

  it("ignition times are continuous along a chain (no bands by design)", () => {
    const r = rng(9);
    const s = randomChain(r, 160, true);
    const srcs = tracePlan(r, 160, true);
    const D = scene(s, srcs);
    const c = kChain(D, 0);
    const U = uniforms();
    let prev = NaN;
    let maxJump = 0;
    for (let x = 0; x < 160; x += 0.01) {
      const g = kIgnition(D, U, c, x);
      expect(g.hit).toBe(true);
      if (!Number.isNaN(prev)) maxJump = Math.max(maxJump, Math.abs(g.tA - prev));
      prev = g.tA;
    }
    // Steps of 0.01 ctrl at rates >= 2 ctrl/s move tA by <= 0.005 s.
    expect(maxJump).toBeLessThan(0.006);
  });

  it("a chain's FX settle time (fxDone) skips only identity FX", () => {
    const r = rng(9001);
    const styles = [FX_STYLE.rainbow, FX_STYLE.comet, FX_STYLE.dust, FX_STYLE.burn, FX_STYLE.roots];
    for (let trial = 0; trial < 16; trial++) {
      const closed = trial % 2 === 0;
      const s = randomChain(r, 20 + Math.floor(r() * 120), closed);
      const n = s.controlArcLengths.length;
      const srcs = tracePlan(r, n, closed);
      const D = scene(s, srcs);
      let tDone = -Infinity;
      for (const q of srcs) tDone = Math.max(tDone, q.t0 + Math.abs(q.cTo - q.cFrom) / q.rate);
      for (const style of styles) {
        const U = uniforms();
        U.uKFx[0] = style;
        U.uKFx[3] = 1;
        U.uKShape[0] = PAINT_CONST.REVEAL_TAPER_ARC;
        const fxDone = kFxDoneWall(U, tDone);
        for (const dt of [0, 1e-3, 0.4, 3]) {
          // One knot at speed 1: anim time = wall time.
          U.uKFx[2] = fxDone + dt;
          U.uKFx[1] = U.uKFx[2];
          for (let i = 0; i < 60; i++) {
            const ctrl = r() * (closed ? n : n - 1);
            const base = [r(), r(), r()];
            const full = [...base];
            const skip = [...base];
            const oFull = { pRain: 0, alpha: 1 };
            const oSkip = { pRain: 0, alpha: 1 };
            D.geom[2] = 1e9; // G0.z: never skip -> the full evaluation.
            kFxColor(D, U, kChain(D, 0), ctrl, ctrl * 3.7, full, oFull);
            D.geom[2] = fxDone;
            kFxColor(D, U, kChain(D, 0), ctrl, ctrl * 3.7, skip, oSkip);
            expect(skip).toEqual(full);
            expect(oSkip).toEqual(oFull);
            expect(full).toEqual(base); // ...and both are the identity.
            expect(oFull).toEqual({ pRain: 0, alpha: 1 });
          }
        }
      }
    }
  });

  it("the settled-slot skip (CTRLIDX .w) changes nothing, at any time", () => {
    const r = rng(31337);
    const styles = [FX_STYLE.rainbow, FX_STYLE.comet, FX_STYLE.dust, FX_STYLE.burn, FX_STYLE.roots];
    let skipped = 0;
    let total = 0;
    for (let trial = 0; trial < 12; trial++) {
      const closed = trial % 2 === 0;
      const s = randomChain(r, 20 + Math.floor(r() * 120), closed);
      const n = s.controlArcLengths.length;
      const srcs = tracePlan(r, n, closed);
      const D = scene(s, srcs);
      const idx = kChain(D, 0).idx;
      const tLate = Float64Array.from({ length: n }, (_, i) => D.stat[(idx + i) * 4 + 3]);
      for (const style of styles) {
        const U = uniforms();
        U.uKFx[0] = style;
        U.uKFx[3] = 1;
        U.uKShape[0] = PAINT_CONST.REVEAL_TAPER_ARC;
        // Speed 2 from anim 0, then 0.5 from anim 3 (wall 1.5).
        U.uKKnots.set([0, 0, 0.5, 1, 3, 1.5, 2, 1]);
        for (let i = 0; i < 400; i++) {
          U.uKFx[1] = r() * 12;
          U.uKFx[2] = kWall(U, U.uKFx[1]);
          const ctrl = r() * (closed ? n : n - 1);
          const base = [r(), r(), r()];
          const full = [...base];
          const fast = [...base];
          const oFull = { pRain: 0, alpha: 1 };
          const oFast = { pRain: 0, alpha: 1 };
          for (let k = 0; k < n; k++) D.stat[(idx + k) * 4 + 3] = 1e9;
          kFxColor(D, U, kChain(D, 0), ctrl, ctrl * 2.3, full, oFull);
          for (let k = 0; k < n; k++) D.stat[(idx + k) * 4 + 3] = tLate[k];
          kFxColor(D, U, kChain(D, 0), ctrl, ctrl * 2.3, fast, oFast);
          expect(fast).toEqual(full);
          expect(oFast).toEqual(oFull);
          const sl = Math.min(n - 1, Math.floor(ctrl));
          total++;
          if (U.uKFx[2] >= kWall(U, D.stat[(idx + sl) * 4 + 3]) + 0.5) skipped++;
        }
      }
    }
    // The skip must actually fire on a good share of the samples.
    expect(skipped / total).toBeGreaterThan(0.2);
  });

  it("the burn hot head leaves points continuously, BURN_HOT_ARC behind the tip", () => {
    const r = rng(606);
    for (const closed of [true, false]) {
      const s = randomChain(r, 140, closed);
      const n = s.controlArcLengths.length;
      const D = scene(s, tracePlan(r, n, closed));
      const c = kChain(D, 0);
      const U = uniforms();
      let maxJump = 0;
      let prev = NaN;
      let prevKey = "";
      let checked = 0;
      for (let x = 0; x < (closed ? n : n - 1); x += 0.002) {
        const g = kIgnition(D, U, c, x);
        if (!g.hit) continue;
        const tl = kHeadLeave(D, c, g, x);
        const key = g.t0 + ":" + g.cFrom + ":" + g.dir;
        // Within one front the head-leave time is continuous (fronts meeting
        // at a balance point, or leaving a junction both ways, switch).
        // Its slope is the tip's: (arc per ctrl here) / (arc per ctrl at the
        // tip) / rate - up to 4x a point's own (segments 0.16..0.64).
        if (key === prevKey) maxJump = Math.max(maxJump, Math.abs(tl - prev));
        prev = tl;
        prevKey = key;
        // Unclamped: the tip is exactly BURN_HOT_ARC further along then (an
        // open chain's end clamps the tip; tEnd is f32 in the texture).
        if (tl > g.tA + 1e-6 && tl < g.tEnd - 1e-6) {
          const tip = g.cFrom + g.dir * (tl - g.t0) * g.rate;
          const dArc = g.dir * (kArcU(D, c, tip) - kArcU(D, c, x));
          expect(dArc).toBeCloseTo(PAINT_CONST.BURN_HOT_ARC, 4);
          checked++;
        }
      }
      // 0.002 ctrl at rates >= 2 ctrl/s: <= 4 x 0.001 s per step.
      expect(maxJump).toBeLessThan(0.005);
      expect(checked).toBeGreaterThan(1000);
    }
  });
  it("speed knots map anim time to wall time piecewise-linearly", () => {
    const U = uniforms();
    const K = U.uKKnots;
    // speed 2 from t=0, then speed 0.5 from anim 4 (wall 2).
    K.set([0, 0, 0.5, 1, 4, 2, 2, 1]);
    expect(kWall(U, 1)).toBeCloseTo(0.5, 12);
    expect(kWall(U, 4)).toBeCloseTo(2, 12);
    expect(kWall(U, 5)).toBeCloseTo(4, 12);
    // A floor knot maps folded history far into the past.
    K.set([0, -1e4, 0, 1, 4, 2, 2, 1]);
    expect(kWall(U, 1)).toBe(-1e4);
    expect(kWall(U, 6)).toBeCloseTo(6, 12);
  });
});
