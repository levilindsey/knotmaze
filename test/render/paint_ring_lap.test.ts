// K299: a closed ring's lap at an EXACT lap boundary (ctrl == k * n).
// The paint shaders took the lap as floor(ctrl / n), and the GPU's float
// division is approximate: on an RX 6800 XT under ANGLE D3D11,
// floor(28.0 / 28.0) came out 0 (floor(k n / n) = k - 1 for about a fifth
// of the (k, n) pairs measured), so control n's arc was read one texel past
// the ring's arc table, from the NEXT chain's header. A choice pulse that
// started on a ring's seam vanished and a garbage one drew elsewhere, and a
// trail span ending on the seam painted gold over the start of the ring.
// The float64 mirror divides exactly, so the G2 parity suites never saw it.
//
// Pinned here: (1) kLapOf / kWrap are exact under any quotient within a few
// ulps of the true one (the shader's correction, fed the GPU's quotients);
// (2) the mechanism, so a regression has a name; (3) the paint semantics at
// the seam (spans, pulses, the hover rim and caps on runs that end, start or
// lap there); (4) every floor/mod-of-a-division in the render GLSL is either
// an exact helper or a reviewed site where an off-by-one quotient is benign.

import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ITEM_FLAG, PAINT_ITEM } from "../../src/render/paint_const";
import {
  MAX_KNOTS,
  kArcOfCtrl,
  kArcU,
  kCA,
  kChain,
  kLapOf,
  kPaintAt,
  kWrap,
  writeChainHeader,
  writeGeomTable,
  type KData,
  type KPaintState,
  type KUniforms,
} from "../../src/render/paint_math";
import { randomChain } from "./fixtures/chains";

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296);
}

// f32 ulp steps (the GPU's quotients are f32).
const F = new Float32Array(1);
const I = new Int32Array(F.buffer);
function ulps(x: number, k: number): number {
  F[0] = x;
  for (let i = 0; i < Math.abs(k); i++) {
    const up = k > 0;
    if (F[0] === 0) {
      I[0] = 1;
      if (!up) F[0] = -F[0];
    } else if (F[0] > 0 === up) I[0]++;
    else I[0]--;
  }
  return F[0];
}

// Exact floor division of integers.
function floorDiv(a: number, n: number): number {
  return (a - (((a % n) + n) % n)) / n;
}

describe("K299 exact lap helpers", () => {
  it("kLapOf is floor(fl / n) under any quotient within a step of the truth", () => {
    let bad = 0;
    let plainWrong = 0;
    for (let n = 1; n <= 256; n++) {
      for (let k = -3; k <= 60; k++) {
        for (const fl of [k * n - 1, k * n, k * n + 1]) {
          const truth = floorDiv(fl, n);
          const q0 = Math.fround(fl / n);
          const qs = [fl / n, truth - 1, truth - 0.5, truth + 1.999];
          for (let s = -3; s <= 3; s++) qs.push(ulps(q0, s));
          // The measured GPU case: k n / n one ulp under k.
          if (fl === k * n) qs.push(ulps(k, -1));
          for (const q of qs) {
            if (kLapOf(fl, n, q) !== truth) bad++;
            if (Math.floor(q) !== truth) plainWrong++;
          }
        }
      }
    }
    expect(bad).toBe(0);
    // The quotient models do reach the failure a plain floor makes.
    expect(plainWrong).toBeGreaterThan(0);
  });

  it("kWrap lands in [0, m) at the true ring position", () => {
    const r = rng(2990);
    let checked = 0;
    for (let t = 0; t < 60; t++) {
      const m = randomChain(r, 3 + Math.floor(r() * 120), true).totalLength;
      for (let k = -3; k <= 4; k++) {
        for (const dl of [-1e-6, 0, 1e-6]) {
          const x = k * m + dl;
          const exact = (((x % m) + m) % m) % m;
          const q0 = Math.fround(x / m);
          for (let s = -3; s <= 3; s++) {
            const w = kWrap(x, m, ulps(q0, s));
            expect(w).toBeGreaterThanOrEqual(0);
            expect(w).toBeLessThan(m);
            const d = Math.abs(w - exact);
            expect(Math.min(d, m - d)).toBeLessThan(1e-9);
            checked++;
          }
        }
      }
    }
    expect(checked).toBe(60 * 8 * 3 * 7);
  });
});

// A regular 28-control ring (Levi's chain 4 had 28 controls, total 12.509):
// control i at arc 0.45 i, f32 as the texture holds it.
const N = 28;
const STEP = 0.45;
const CAL = Array.from({ length: N }, (_, i) => Math.fround(STEP * i));
const TOTAL = Math.fround(STEP * N);
const A = (i: number): number => CAL[((i % N) + N) % N];

function uniforms(): KUniforms {
  const K = new Float32Array(MAX_KNOTS * 4);
  K.set([0, 0, 1, 1]);
  const s = 2.5;
  return {
    uKBase: new Float32Array([0, 0, 0, 1]),
    uKFx: new Float32Array(4),
    uKFx2: new Float32Array(4),
    uKShape: new Float32Array([1, 0, 1, 0]),
    uKInk: new Float32Array([1, 0, 0, 0]),
    uKKnots: K,
    uKGamut: new Float32Array([0, 280, 0.45, 0.64]),
    uKSect: new Float32Array(4),
    uKPaint: new Float32Array([1, 0, 0, 0.8]),
    // Pulse clocks at 20 s, born at 0 (fully faded in).
    uKPulse: new Float32Array([(20 * 1.6) % s, (20.3 * 1.6) % s, s, 1]),
    uKReach: new Float32Array([1e6, 1, 0, 0]),
    uKGold: new Float32Array([1, 0.82, 0.29, 1]),
  };
}

interface Item {
  type: number;
  c0: number;
  c1: number;
  a?: number;
  b?: number;
  flags?: number;
  radius?: number;
}

// The ring's tables + a declaration as KPAINT (PaintScene.setPaintItems'
// layout; every item listed in every slot, since only order matters here).
function scene(items: Item[], U: KUniforms): KData {
  const idxBase = 2;
  const stat = new Float32Array((idxBase + N) * 4);
  writeChainHeader(stat, 0, { nCtrl: N, closed: true, count: 140, idxBase, geomBase: 0, srcFirst: 0, srcCount: 0, paintBase: 0 });
  const geom = new Float32Array((2 + Math.ceil(N / 4)) * 4);
  writeGeomTable(geom, 0, TOTAL, 140, true, CAL);
  const raw: number[] = [];
  for (const it of items) raw.push(it.type, it.c0, it.c1, it.a ?? 1, it.b ?? 1, it.flags ?? 0, it.radius ?? 0, 0);
  const nItems = items.length;
  const refBase = idxBase + N;
  const itemBase = refBase + Math.ceil((N * nItems) / 4) + 1;
  const paint = new Float32Array((itemBase + 2 * nItems + 1) * 4);
  let r = 0;
  for (let s = 0; s < N; s++) {
    paint[(idxBase + s) * 4] = r;
    paint[(idxBase + s) * 4 + 1] = nItems;
    for (let i = 0; i < nItems; i++, r++) paint[(refBase + (r >> 2)) * 4 + (r & 3)] = i;
  }
  for (let i = 0; i < raw.length; i++) paint[itemBase * 4 + i] = Math.fround(raw[i]);
  U.uKPaint[1] = refBase;
  U.uKPaint[2] = itemBase;
  return { stat, geom, reveal: new Float32Array(8), paint };
}

const PX = 0.02;
function paintAt(D: KData, U: KUniforms, arc: number): KPaintState {
  const c = kChain(D, 0);
  const a = kWrap(arc, TOTAL);
  const ctrl = Math.min(N - 1e-6, a / STEP);
  return kPaintAt(D, U, c, ctrl, a, PX, { p: 0, band: false, v: 0, rim: 0 });
}
const span = (c0: number, c1: number): Item => ({ type: PAINT_ITEM.SPAN, c0, c1 });
const pulse = (cJ: number, cF: number, flags = 0): Item => ({ type: PAINT_ITEM.PULSE, c0: cJ, c1: cF, a: 0, b: 0, flags });
const arcs = (a0: number, a1: number, k = 24): number[] =>
  Array.from({ length: k + 1 }, (_, i) => a0 + ((a1 - a0) * i) / k);

describe("K299 the mechanism", () => {
  it("a lap one short reads control n from the next chain's header", () => {
    const r = rng(299);
    const ring = randomChain(r, N, true);
    const next = randomChain(r, 10, true);
    // Chain 0 = 1 header + 7 arc texels, so chain 1's header is texel 8.
    const geom = new Float32Array(12 * 4);
    writeGeomTable(geom, 0, ring.totalLength, ring.count, true, ring.controlArcLengths);
    writeGeomTable(geom, 8, next.totalLength, next.count, true, next.controlArcLengths);
    const stat = new Float32Array(16);
    writeChainHeader(stat, 0, { nCtrl: N, closed: true, count: ring.count, idxBase: 4, geomBase: 0, srcFirst: 0, srcCount: 0, paintBase: 0 });
    writeChainHeader(stat, 1, { nCtrl: 10, closed: true, count: next.count, idxBase: 32, geomBase: 8, srcFirst: 0, srcCount: 0, paintBase: 0 });
    const D: KData = { stat, geom, reveal: new Float32Array(8), paint: new Float32Array(8) };
    const c = kChain(D, 0);
    // The GPU's 28 / 28: one ulp under 1.
    const q = ulps(1, -1);
    expect(Math.floor(q)).toBe(0);
    const oldI0 = N - N * Math.floor(q); // the pre-K299 shader's slot
    expect(oldI0).toBe(N);
    expect(kCA(D, c, oldI0)).toBe(next.totalLength);
    // The correction: lap 1, slot 0, arc 0.
    expect(kLapOf(N, N, q)).toBe(1);
    expect(N - N * kLapOf(N, N, q)).toBe(0);
  });
});

describe("K299 paint on a run at a ring's seam", () => {
  it("control k n is arc 0 on every lap, and the unwrapped arc is k laps", () => {
    const U = uniforms();
    const D = scene([], U);
    const c = kChain(D, 0);
    for (let k = -2; k <= 3; k++) {
      expect(kArcOfCtrl(D, c, k * N)).toBe(0);
      expect(kArcU(D, c, k * N)).toBeCloseTo(k * TOTAL, 9);
      // Continuous across the seam.
      expect(kArcU(D, c, k * N - 1e-7)).toBeCloseTo(k * TOTAL, 5);
      expect(kArcU(D, c, k * N + 1e-7)).toBeCloseTo(k * TOTAL, 5);
    }
  });

  it("a trail span ending on the seam paints only its own run", () => {
    // Levi's span (4, 22..28) after the move down e18.
    const U = uniforms();
    const D = scene([span(22, 28)], U);
    for (const a of arcs(A(22) + PX, TOTAL - PX)) expect(paintAt(D, U, a).p).toBe(1);
    for (const a of arcs(PX, A(22) - PX)) expect(paintAt(D, U, a).p).toBe(0);
    expect(paintAt(D, U, 0).p).toBeCloseTo(0.5, 9);
    // A span starting on the seam, and one lapping it.
    const D2 = scene([span(28, 31)], U);
    for (const a of arcs(PX, A(3) - PX)) expect(paintAt(D2, U, a).p).toBe(1);
    for (const a of arcs(A(3) + PX, TOTAL - PX)) expect(paintAt(D2, U, a).p).toBe(0);
    const D3 = scene([span(26, 30)], U);
    for (const a of [...arcs(A(26) + PX, TOTAL), ...arcs(0, A(2) - PX)]) expect(paintAt(D3, U, a).p).toBe(1);
    for (const a of arcs(A(2) + PX, A(26) - PX)) expect(paintAt(D3, U, a).p).toBe(0);
  });

  it("a choice pulse from a junction on the seam lights its own run, on any lap", () => {
    // Levi's pulse (4, cJ 28 -> cF 22): lit at the junction, along e18.
    const U = uniforms();
    const ref = scene([pulse(28, 22)], U);
    expect(paintAt(ref, U, TOTAL - 0.1).band).toBe(true);
    // Nothing on the far side of the junction (e15 = ctrl 0..4).
    for (const a of arcs(0.05, A(4))) expect(paintAt(ref, U, a).band).toBe(false);
    // The same run written on another lap paints the same.
    for (let k = -1; k <= 2; k++) {
      const D = scene([pulse(28 + k * N, 22 + k * N)], U);
      for (const a of arcs(0, TOTAL, 112)) {
        const x = paintAt(D, U, a);
        const y = paintAt(ref, U, a);
        expect(x.band).toBe(y.band);
        expect(x.v).toBeCloseTo(y.v, 9);
      }
    }
    // The outward pulse up e15 (cJ 0 -> cF 4) and an inward one onto the
    // seam: both lit only on their own runs.
    const up = scene([pulse(0, 4)], U);
    expect(paintAt(up, U, 0.1).band).toBe(true);
    for (const a of arcs(A(22), TOTAL - 0.05)) expect(paintAt(up, U, a).band).toBe(false);
    const inward = scene([pulse(28, 22, ITEM_FLAG.INWARD)], U);
    expect(paintAt(inward, U, TOTAL - 0.1).band).toBe(true);
    for (const a of arcs(0.05, A(4))) expect(paintAt(inward, U, a).band).toBe(false);
  });

  it("a run once around the ring has a full-length pulse (it had none)", () => {
    const U = uniforms();
    const D = scene([pulse(0, 28)], U);
    expect(paintAt(D, U, 0.1).band).toBe(true);
    const back = scene([pulse(28, 0)], U);
    expect(paintAt(back, U, TOTAL - 0.1).band).toBe(true);
  });

  it("the hover rim on a run ending at or crossing the seam", () => {
    const U = uniforms();
    U.uKReach.set([3, 1, 0.5, 25]);
    // The glow's own length and end fade (K298; it read the pulses' reach
    // and a fixed 0.75 before).
    U.uKSect[2] = 3;
    U.uKSect[3] = 0.75;
    const D = scene([{ type: PAINT_ITEM.RIM, c0: 22, c1: 28, a: 0.3 }], U);
    expect(paintAt(D, U, A(25)).rim).toBeGreaterThan(0.4);
    for (const a of arcs(0.05, A(21))) expect(paintAt(D, U, a).rim).toBe(0);
    U.uKReach[3] = 28;
    const X = scene([{ type: PAINT_ITEM.RIM, c0: 26, c1: 30, a: 0.3 }], U);
    expect(paintAt(X, U, TOTAL - 0.1).rim).toBeGreaterThan(0.4);
    expect(paintAt(X, U, 0.1).rim).toBeGreaterThan(0.4);
    for (const a of arcs(A(3), A(25))) expect(paintAt(X, U, a).rim).toBe(0);
  });

  it("a cap on the seam is the same at ctrl 0 and ctrl n", () => {
    const U = uniforms();
    const cap = (c: number): Item => ({ type: PAINT_ITEM.CAP, c0: c, c1: c, a: 1, radius: 0.3 });
    const D0 = scene([cap(0)], U);
    const Dn = scene([cap(N)], U);
    for (const a of arcs(0, TOTAL, 112)) expect(paintAt(Dn, U, a).p).toBe(paintAt(D0, U, a).p);
    expect(paintAt(Dn, U, 0).p).toBe(1);
    expect(paintAt(Dn, U, TOTAL - 0.1).p).toBe(1);
  });
});

// Every rounding of a quotient in the render GLSL. A float division is
// approximate on the GPU (GLSL ES 3.00 allows 2.5 ulp; D3D11 multiplies by
// a reciprocal), so floor(k n / n) can be k - 1: a lap, a slot or a wrap
// taken that way is one step off at exact multiples. Each listed site is
// either one of K299's exact helpers or reviewed as benign there; a new
// site needs the same review (or kLapOf / kWrap). Keyed by file and the
// exact call; the value is how many times it occurs, and why it is safe.
const ROUNDED_QUOTIENTS: Record<string, [number, string]> = {
  "paint_glsl.ts: floor(fl / float(n))": [1, "kLapOf's estimate, corrected by one integer step"],
  "paint_glsl.ts: floor(x / m)": [1, "kWrap's estimate, corrected into [0, m)"],
  "paint_glsl.ts: floor(d / c.total + 0.5)": [2, "kCtrlNear's nearest lap: ambiguous only at the antipode"],
  "paint_glsl.ts: floor(aU / c.total)": [1, "kHeadLeave's lap: one short gives arc = total, the same point"],
  "paint_glsl.ts: floor(ctrl / n)": [1, "kHeadLeave's seed: one short gives ctrl n, the same point"],
  "paint_glsl.ts: floor(x / 12.0)": [1, "a hue wrap: one off is the same color"],
  "paint_glsl.ts: floor(x / 360.0)": [1, "a hue wrap: one off is the same color"],
  "paint_glsl.ts: floor(raw / s)": [1, "kPulseV's crest phase: periodic, either side is the same crest"],
  "gap_mask.ts: floor(da / per + 0.5)": [1, "nearest lap: ambiguous only at the antipode"],
  "gap_mask.ts: floor(off / t1.z + 0.5)": [1, "nearest lap: ambiguous only at the antipode"],
  "explore_glsl.ts: floor((0.5 * (c0 + c1) - x) / nf + 0.5)": [1, "nearest lap: ambiguous only at the antipode"],
  "explore_glsl.ts: floor(s / sp + 0.5)": [1, "a rounded count, clamped to at least 1"],
  "junction_field.ts: floor(ra / TAU)": [1, "an angle wrap for comparisons: TAU instead of 0 is the same direction"],
  // KNOWN RESIDUAL (K299 report): mod divides, so on an affected GPU a
  // fifth contour line can take the 0.55 weight instead of 1.0. The
  // background programs are sha256-pinned; fixing it needs a same-state A/B.
  "background_shaders.ts: mod(floor(v + 0.5), 5.0)": [1, "the contours' every-fifth line (residual)"],
};

const ROUNDERS = ["floor", "ceil", "trunc", "round", "roundEven", "fract", "mod", "int"];

function balanced(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")" && --depth === 0) return i;
  }
  return -1;
}

describe("K299 the render GLSL's rounded quotients", () => {
  it("every floor/mod of a division is an exact helper or a reviewed site", () => {
    const dir = new URL("../../src/render/", import.meta.url);
    const seen = new Map<string, number>();
    const re = new RegExp(`(?<![A-Za-z0-9_.])(${ROUNDERS.join("|")})\\(`, "g");
    for (const f of readdirSync(dir).filter((f) => f.endsWith(".ts"))) {
      const src = readFileSync(new URL(f, dir), "utf8")
        .split(/\r?\n/)
        .map((l) => l.replace(/\/\/.*$/, ""))
        .join("\n");
      for (const m of src.matchAll(re)) {
        const open = (m.index ?? 0) + m[0].length - 1;
        const close = balanced(src, open);
        if (close < 0) continue;
        const arg = src.slice(open + 1, close).replace(/\s+/g, " ").trim();
        // int(floor(...)) and the like: the inner call is checked itself.
        const inner = arg.match(/^([A-Za-z]+)\(/);
        if (inner && ROUNDERS.includes(inner[1]) && balanced(arg, inner[0].length - 1) === arg.length - 1) continue;
        if (m[1] !== "mod" && !arg.includes("/")) continue;
        const key = `${f}: ${m[1]}(${arg})`;
        seen.set(key, (seen.get(key) ?? 0) + 1);
      }
    }
    // A new site, or a reviewed one copied elsewhere in its file, fails
    // here; so does a reviewed site that is gone (the list stays current).
    const found = Object.fromEntries([...seen].sort());
    const listed = Object.fromEntries(Object.entries(ROUNDED_QUOTIENTS).map(([k, v]) => [k, v[0]]).sort());
    expect(found).toEqual(listed);
  });
});
