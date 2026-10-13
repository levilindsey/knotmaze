// Section colors in RUN form (G2.2; the vertex shader's knotSection,
// mirrored by evalRunSection). Guards the scheme contracts the renderer
// relies on - segments = fully random unrelated run colors with junctions
// converging to the channel-wise RGB MEAN of incident runs; depth = a
// continuous field (no seams at junctions); mono = one constant gamut-
// midpoint color; junctionBlend = a fixed lattice distance - and pins the
// run form against the frozen pre-G2.2 segment field
// (fixtures/section_field_v1.ts) it replaced.

import { describe, expect, it } from "vitest";
import {
  buildSectionRuns,
  evalRunSection,
  gamutRgb,
  type ColorScheme,
  type RGB,
  type RunChain,
  type SectionRuns,
} from "../../src/core/section_colors";
import { RUN_FLAG } from "../../src/render/paint_const";
import type { WalkGraph, WalkVertex, WalkEdge } from "../../src/core/walk_graph";
import {
  buildSectionFieldV1,
  sectionRgbAtV1,
} from "./fixtures/section_field_v1";

const SEED = 477972011;
const HUE = SEED % 360;

function vert(
  id: string,
  chain: number,
  edges: number[],
  isEnd = false
): [string, WalkVertex] {
  return [id, { id, isEnd, chain, ctrl: 0, edges }];
}

function makeWalk(): WalkGraph {
  // S --e0-- J1 ==e1/e2== J2 --e3-- X   (e1/e2 parallel branches), plus a
  // closed chain 4 with two junctions K1 (ctrl 5) and K2 (ctrl 17): e4 runs
  // 5..17, e5 runs 17..29 ACROSS the ring seam (unwrapped).
  const edges: WalkEdge[] = [
    { id: 0, va: "S", vb: "J1", chain: 0, ctrlA: 0, ctrlB: 10, length: 10 },
    { id: 1, va: "J1", vb: "J2", chain: 0, ctrlA: 10, ctrlB: 30, length: 20 },
    { id: 2, va: "J1", vb: "J2", chain: 1, ctrlA: 0, ctrlB: 24, length: 24 },
    { id: 3, va: "J2", vb: "X", chain: 2, ctrlA: 0, ctrlB: 12, length: 12 },
    { id: 4, va: "K1", vb: "K2", chain: 4, ctrlA: 5, ctrlB: 17, length: 9 },
    { id: 5, va: "K2", vb: "K1", chain: 4, ctrlA: 17, ctrlB: 29, length: 15 },
  ];
  const vertices = new Map<string, WalkVertex>([
    vert("S", 0, [0], true),
    vert("J1", 0, [0, 1, 2]),
    vert("J2", 0, [1, 2, 3]),
    vert("X", 2, [3], true),
    vert("K1", 4, [4, 5]),
    vert("K2", 4, [4, 5]),
  ]);
  return {
    vertices,
    edges,
    start: "S",
    exit: "X",
    optimalLength: 42,
    distToExit: new Map(),
  };
}

// Chains 0..2 carry open walk runs end to end (as real fabrics do: every
// open chain ends at a walk vertex); chain 3 is decorative; chain 4 closed.
const CHAINS: RunChain[] = [
  { len: 31, closed: false },
  { len: 25, closed: false },
  { len: 13, closed: false },
  { len: 16, closed: true },
  { len: 24, closed: true },
];
const LENS = CHAINS.map((c) => c.len);

// The section color at a chain ctrl, as the shader resolves it: the slot's
// run, evaluated (noise scheme excluded - it needs per-control coordinates).
function at(sr: SectionRuns, chain: number, ctrl: number, dist = 0): RGB {
  const g = CHAINS[chain];
  const slot = Math.max(0, Math.min(g.len - 1, Math.floor(ctrl)));
  const run = sr.runs[sr.slotRun[chain][slot]];
  return evalRunSection(run, ctrl, g.len, g.closed, dist, HUE);
}

function runOf(sr: SectionRuns, e: WalkEdge) {
  const r = sr.runs.find(
    (q) => q.chain === e.chain && q.ctrlA === e.ctrlA && q.ctrlB === e.ctrlB
  );
  expect(r, `run for edge ${e.id}`).toBeDefined();
  return r!;
}

function expectRgbClose(a: ArrayLike<number>, b: ArrayLike<number>, digits = 10): void {
  for (let i = 0; i < 3; i++) expect(a[i]).toBeCloseTo(b[i], digits);
}

const maxDiff = (a: ArrayLike<number>, b: ArrayLike<number>): number =>
  Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));

describe("section runs (G2.2)", () => {
  it("mono: one constant gamut-midpoint color everywhere", () => {
    const sr = buildSectionRuns("mono", makeWalk(), CHAINS, undefined, SEED, HUE);
    const base = gamutRgb(HUE, 0.5);
    for (let c = 0; c < CHAINS.length; c++) {
      for (let x = 0; x < CHAINS[c].len - 1; x += 0.37) {
        expectRgbClose(at(sr, c, x), base);
      }
    }
  });

  it("gamutRgb stays in [0, 1] and is deterministic", () => {
    for (let i = 0; i <= 20; i++) {
      const rgb = gamutRgb(HUE, i / 20);
      for (const ch of rgb) {
        expect(ch).toBeGreaterThanOrEqual(0);
        expect(ch).toBeLessThanOrEqual(1);
      }
      expectRgbClose(rgb, gamutRgb(HUE, i / 20));
    }
  });

  it("segments: unrelated per-run colors, junctions = RGB mean", () => {
    const walk = makeWalk();
    const sr = buildSectionRuns("segments", walk, CHAINS, undefined, SEED, HUE);
    const own = walk.edges.map((e) => runOf(sr, e).colMid);
    // Runs SHARING A JUNCTION always wear distinct swatches.
    const adjacent = (a: WalkEdge, b: WalkEdge): boolean =>
      a.va === b.va || a.va === b.vb || a.vb === b.va || a.vb === b.vb;
    for (let i = 0; i < own.length; i++) {
      for (let j = i + 1; j < own.length; j++) {
        if (!adjacent(walk.edges[i], walk.edges[j])) continue;
        expect(maxDiff(own[i], own[j])).toBeGreaterThan(1e-3);
      }
    }
    // Every run wears its own color mid-run.
    expectRgbClose(at(sr, 0, 20), own[1]);
    // J1 converges to the channel-wise mean of e0/e1/e2, at every
    // incident run end (the shared color).
    const mean: RGB = [0, 0, 0];
    for (const eid of [0, 1, 2]) {
      for (let ch = 0; ch < 3; ch++) mean[ch] += own[eid][ch] / 3;
    }
    const e0 = runOf(sr, walk.edges[0]);
    expectRgbClose(evalRunSection(e0, 10, 31, false, 0, HUE), mean);
    expectRgbClose(at(sr, 0, 10), mean); // Slot 10 = e1's A end.
    expectRgbClose(at(sr, 1, 0), mean);
    // Decorative chain 3: one constant color.
    expectRgbClose(at(sr, 3, 0.5), at(sr, 3, 11.25));
  });

  it("segments: a self-loop counts twice in the junction mean", () => {
    const edges: WalkEdge[] = [
      { id: 0, va: "S", vb: "J", chain: 0, ctrlA: 0, ctrlB: 10, length: 10 },
      { id: 1, va: "J", vb: "J", chain: 1, ctrlA: 0, ctrlB: 20, length: 20 },
    ];
    const walk: WalkGraph = {
      vertices: new Map([vert("S", 0, [0], true), vert("J", 0, [0, 1])]),
      edges,
      start: "S",
      exit: "J",
      optimalLength: 10,
      distToExit: new Map(),
    };
    const chains: RunChain[] = [
      { len: 40, closed: false },
      { len: 30, closed: false },
    ];
    const sr = buildSectionRuns("segments", walk, chains, undefined, SEED, HUE);
    const c0 = runOf(sr, edges[0]).colMid;
    const c1 = runOf(sr, edges[1]).colMid;
    const mean: RGB = [0, 0, 0];
    for (let ch = 0; ch < 3; ch++) mean[ch] = (c0[ch] + 2 * c1[ch]) / 3;
    expectRgbClose(runOf(sr, edges[0]).colB, mean);
    expectRgbClose(runOf(sr, edges[1]).colA, mean);
    expectRgbClose(runOf(sr, edges[1]).colB, mean);
  });

  it("depth: continuous across junctions and along runs", () => {
    const walk = makeWalk();
    const sr = buildSectionRuns("depth", walk, CHAINS, undefined, SEED, HUE);
    // Both parallel J1 -> J2 branches start and end in the SAME colors.
    expectRgbClose(at(sr, 0, 10), at(sr, 1, 0));
    expectRgbClose(at(sr, 0, 30), at(sr, 1, 24));
    // No jumps along a chain's covered stretch (a gamut sweep).
    for (const [c, lo, hi] of [[0, 0, 30], [1, 0, 24], [2, 0, 12]] as const) {
      let prev = at(sr, c, lo);
      for (let x = lo + 0.01; x <= hi - 1e-6; x += 0.01) {
        const cur = at(sr, c, x);
        expect(maxDiff(cur, prev)).toBeLessThan(0.01);
        prev = cur;
      }
    }
  });

  it("noise: one NOISE run per chain, every slot", () => {
    const sr = buildSectionRuns("noise", makeWalk(), CHAINS, undefined, SEED, HUE);
    expect(sr.noise).toBe(true);
    expect(sr.runs.length).toBe(CHAINS.length);
    for (let c = 0; c < CHAINS.length; c++) {
      expect(sr.runs[c].flags & RUN_FLAG.NOISE).toBeTruthy();
      for (const r of sr.slotRun[c]) expect(r).toBe(c);
    }
  });

  it("uncovered stretches wear the first run's A-end color (pseudo run)", () => {
    // Chain 0 of a 40-slot chain carries runs only up to ctrl 30.
    const walk = makeWalk();
    const chains = CHAINS.map((c, i) => (i === 0 ? { len: 40, closed: false } : c));
    const sr = buildSectionRuns("segments", walk, chains, undefined, SEED, HUE);
    const first = runOf(sr, walk.edges[0]);
    const tail = sr.runs[sr.slotRun[0][35]];
    expect(tail).not.toBe(runOf(sr, walk.edges[1]));
    expectRgbClose(evalRunSection(tail, 35.5, 40, false, 0, HUE), first.colA);
    expectRgbClose(evalRunSection(tail, 39, 40, false, 0, HUE), first.colA);
  });

  it("closed chains: a run across the ring seam evaluates unwrapped", () => {
    const walk = makeWalk();
    const sr = buildSectionRuns("segments", walk, CHAINS, undefined, SEED, HUE);
    // e5 covers slots 17..23 and 0..4 of chain 4 (ctrl 17..29 unwrapped).
    const e5 = runOf(sr, walk.edges[5]);
    for (const s of [17, 20, 23, 0, 2, 4]) expect(sr.runs[sr.slotRun[4][s]]).toBe(e5);
    // Continuous across the seam (ctrl 23.99 -> 0.01) and at K1 (ctrl 5).
    expect(maxDiff(at(sr, 4, 23.999), at(sr, 4, 0.001))).toBeLessThan(1e-3);
    expectRgbClose(at(sr, 4, 4.9999999), at(sr, 4, 5), 5);
  });
});

describe("junctionBlend (fixed blend distance)", () => {
  const sr = buildSectionRuns("segments", makeWalk(), CHAINS, undefined, SEED, HUE);
  const e1 = { chain: 0, lo: 10, hi: 30 };
  // First ctrl of a run's flat own-color stretch (scanning from its A end).
  const flatStart = (c: number, lo: number, hi: number, dist: number): number => {
    const own = at(sr, c, (lo + hi) / 2, 0);
    for (let x = lo; x <= hi; x += 0.001) {
      if (maxDiff(at(sr, c, x, dist), own) < 1e-12) return x;
    }
    return NaN;
  };

  it("extends every junction ramp by the same lattice distance", () => {
    // The fixture's runs are 1 lattice unit per ctrl and their base ramps 1
    // ctrl, so distance 3 makes both ramps below 4 ctrl long whatever the
    // run's span (a ratio would scale with span).
    expect(flatStart(e1.chain, e1.lo, e1.hi, 3) - 10).toBeCloseTo(4, 2); // span 20
    expect(flatStart(2, 0, 12, 3) - 0).toBeCloseTo(4, 2); // span 12
    expect(flatStart(e1.chain, e1.lo, e1.hi, 0) - 10).toBeCloseTo(1, 2);
  });

  it("makes a run shorter than twice the distance one gradient", () => {
    // e1: own color only at its midpoint, junction colors at the ends.
    expectRgbClose(at(sr, 0, 20, 100), at(sr, 0, 20, 0));
    expectRgbClose(at(sr, 0, 10, 100), at(sr, 0, 10, 0));
    expect(Number.isNaN(flatStart(0, 10, 19.9, 100))).toBe(true);
  });

  it("stays continuous along every run at every distance", () => {
    for (const dist of [0, 0.05, 0.5, 0.88, 3, 100]) {
      for (const [c, lo, hi] of [[0, 0, 30], [1, 0, 24], [2, 0, 12]] as const) {
        let prev = at(sr, c, lo, dist);
        for (let x = lo + 0.005; x <= hi - 1e-6; x += 0.005) {
          const cur = at(sr, c, x, dist);
          expect(maxDiff(cur, prev)).toBeLessThan(0.02);
          prev = cur;
        }
      }
    }
  });
});

describe("run form vs the frozen segment field (pre-G2.2)", () => {
  // Max per-channel difference over dense ctrls of every chain.
  const compare = (scheme: ColorScheme, dist: number): number => {
    const walk = makeWalk();
    const sr = buildSectionRuns(scheme, walk, CHAINS, undefined, SEED, HUE);
    const v1 = buildSectionFieldV1(scheme, walk, LENS, undefined, SEED, HUE, dist);
    const base = gamutRgb(HUE, 0.5);
    let worst = 0;
    for (let c = 0; c < CHAINS.length; c++) {
      const top = CHAINS[c].closed ? CHAINS[c].len : CHAINS[c].len - 1;
      for (let x = 0; x < top; x += 0.0625) {
        worst = Math.max(worst, maxDiff(at(sr, c, x, dist), sectionRgbAtV1(v1[c], x, CHAINS[c].len, base)));
      }
    }
    return worst;
  };

  it("mono and segments at junctionBlend 0 are identical", () => {
    expect(compare("mono", 0)).toBeLessThan(1e-9);
    expect(compare("segments", 0)).toBeLessThan(1e-9);
  });

  it("eased segment ramps differ only by the old 6-piece linearization", () => {
    // |linear interpolation error| <= h^2 max|f''| / 8 = (1/6)^2 * 6 / 8 of
    // the color step (0.021); the fixture's steps keep it near 1/255.
    for (const dist of [0.05, 0.5, 0.88, 3, 100]) {
      const d = compare("segments", dist);
      expect(d).toBeLessThan(2.5 / 255);
    }
  });

  it("gamut sweeps (strands, depth) differ only by the old RGB chords", () => {
    // The segment field chained straight RGB pieces every 0.06 of the gamut
    // coordinate (about 17 degrees of hue; eased ramps spread their 6+
    // pieces unevenly, so mid-ramp chords grow); the run form follows the
    // hue arc exactly. The old chords' sagitta: measured up to 6.7/255.
    for (const dist of [0, 0.88, 3]) {
      expect(compare("strands", dist)).toBeLessThan(8 / 255);
    }
    expect(compare("depth", 0)).toBeLessThan(8 / 255);
    if (process.env.SECDBG) {
      for (const [sc, d] of [["segments", 0.88], ["segments", 3], ["strands", 0], ["strands", 0.88], ["strands", 3], ["depth", 0]] as const) {
        console.log("parity", sc, d, (compare(sc, d) * 255).toFixed(2), "/255");
      }
    }
  });
});
