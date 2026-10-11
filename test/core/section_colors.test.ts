// Section color field (P4 Stage 26): RGB-valued piecewise-linear
// segments. Guards the scheme contracts the renderer's per-vertex color
// path relies on: segments = fully random unrelated run colors with
// junctions converging to the channel-wise RGB MEAN of incident runs;
// depth = a continuous field (no seams at junctions); mono = one constant
// gamut-midpoint color.

import { describe, expect, it } from "vitest";
import {
  buildSectionField,
  gamutRgb,
  type RGB,
  type VSegment,
} from "../../src/core/section_colors";
import type { WalkGraph, WalkVertex, WalkEdge } from "../../src/core/walk_graph";

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
  // S --e0-- J1 ==e1/e2== J2 --e3-- X   (e1/e2 parallel branches)
  const edges: WalkEdge[] = [
    { id: 0, va: "S", vb: "J1", chain: 0, ctrlA: 0, ctrlB: 10, length: 10 },
    { id: 1, va: "J1", vb: "J2", chain: 0, ctrlA: 10, ctrlB: 30, length: 20 },
    { id: 2, va: "J1", vb: "J2", chain: 1, ctrlA: 0, ctrlB: 24, length: 24 },
    { id: 3, va: "J2", vb: "X", chain: 2, ctrlA: 0, ctrlB: 12, length: 12 },
  ];
  const vertices = new Map<string, WalkVertex>([
    vert("S", 0, [0], true),
    vert("J1", 0, [0, 1, 2]),
    vert("J2", 0, [1, 2, 3]),
    vert("X", 2, [3], true),
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

// Chain lengths: chains 0..2 carry walk runs; chain 3 is decorative.
const CHAIN_LENS = [40, 30, 20, 16];

function segAtStart(segs: VSegment[], c0: number): VSegment {
  const s = segs.find((g) => Math.abs(g.c0 - c0) < 1e-9);
  expect(s, `segment starting at ${c0}`).toBeDefined();
  return s!;
}

function segAtEnd(segs: VSegment[], c1: number): VSegment {
  const s = segs.find((g) => Math.abs(g.c1 - c1) < 1e-9);
  expect(s, `segment ending at ${c1}`).toBeDefined();
  return s!;
}

function expectRgbClose(a: ArrayLike<number>, b: ArrayLike<number>): void {
  for (let i = 0; i < 3; i++) expect(a[i]).toBeCloseTo(b[i], 10);
}

// The constant mid-run color of a run emitted with end ramps.
function midRgb(segs: VSegment[], e: WalkEdge): RGB {
  const mids = segs.filter(
    (g) => g.c0 > e.ctrlA + 1e-9 && g.c1 < e.ctrlB - 1e-9
  );
  expect(mids.length).toBeGreaterThan(0);
  expectRgbClose(mids[0].rgb0, mids[0].rgb1);
  return mids[0].rgb0;
}

describe("section color field (RGB)", () => {
  it("mono: one constant gamut-midpoint color everywhere", () => {
    const field = buildSectionField(
      "mono",
      makeWalk(),
      CHAIN_LENS,
      undefined,
      SEED,
      HUE
    );
    const base = gamutRgb(HUE, 0.5);
    for (let c = 0; c < CHAIN_LENS.length; c++) {
      expect(field[c].length).toBe(1);
      expect(field[c][0].c0).toBe(0);
      expect(field[c][0].c1).toBe(CHAIN_LENS[c]);
      expectRgbClose(field[c][0].rgb0, base);
      expectRgbClose(field[c][0].rgb1, base);
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
    const field = buildSectionField(
      "segments",
      walk,
      CHAIN_LENS,
      undefined,
      SEED,
      HUE
    );
    // Every run wears its own constant mid color, and runs SHARING A
    // JUNCTION always wear distinct swatches (the collision walk).
    // Non-adjacent runs may legitimately repeat: colors come from a
    // finite stride-spread swatch set - global uniqueness is neither
    // guaranteed nor wanted (uniform hue draws read as clumped; see
    // the swatch comment in section_colors.ts).
    const runColors = walk.edges.map((e) => midRgb(field[e.chain], e));
    const adjacent = (a: WalkEdge, b: WalkEdge): boolean =>
      a.va === b.va || a.va === b.vb || a.vb === b.va || a.vb === b.vb;
    for (let i = 0; i < runColors.length; i++) {
      for (let j = i + 1; j < runColors.length; j++) {
        if (!adjacent(walk.edges[i], walk.edges[j])) continue;
        const d =
          Math.abs(runColors[i][0] - runColors[j][0]) +
          Math.abs(runColors[i][1] - runColors[j][1]) +
          Math.abs(runColors[i][2] - runColors[j][2]);
        expect(d).toBeGreaterThan(1e-3);
      }
    }
    // J1 converges to the channel-wise mean of e0/e1/e2's colors, and
    // every incident ramp END equals it exactly (the shared color).
    const mean: RGB = [0, 0, 0];
    for (const eid of [0, 1, 2]) {
      for (let ch = 0; ch < 3; ch++) mean[ch] += runColors[eid][ch] / 3;
    }
    // e0 arrives at J1 at its ctrlB end; e1/e2 leave at their ctrlA ends.
    expectRgbClose(segAtEnd(field[0], 10).rgb1, mean);
    expectRgbClose(segAtStart(field[0], 10).rgb0, mean);
    expectRgbClose(segAtStart(field[1], 0).rgb0, mean);
    // Decorative chain 3: constant fallback color.
    expect(field[3].length).toBe(1);
    expectRgbClose(field[3][0].rgb0, field[3][0].rgb1);
  });

  it("segments: a self-loop counts twice in the junction mean", () => {
    const edges: WalkEdge[] = [
      { id: 0, va: "S", vb: "J", chain: 0, ctrlA: 0, ctrlB: 10, length: 10 },
      { id: 1, va: "J", vb: "J", chain: 1, ctrlA: 0, ctrlB: 20, length: 20 },
    ];
    const walk: WalkGraph = {
      vertices: new Map([
        vert("S", 0, [0], true),
        vert("J", 0, [0, 1]),
      ]),
      edges,
      start: "S",
      exit: "J",
      optimalLength: 10,
      distToExit: new Map(),
    };
    const field = buildSectionField(
      "segments",
      walk,
      [40, 30],
      undefined,
      SEED,
      HUE
    );
    const c0 = midRgb(field[0], edges[0]);
    const c1 = midRgb(field[1], edges[1]);
    const mean: RGB = [0, 0, 0];
    for (let ch = 0; ch < 3; ch++) mean[ch] = (c0[ch] + 2 * c1[ch]) / 3;
    expectRgbClose(segAtEnd(field[0], 10).rgb1, mean);
    expectRgbClose(segAtStart(field[1], 0).rgb0, mean);
  });

  it("depth: continuous across junctions, contiguous within runs", () => {
    const walk = makeWalk();
    const field = buildSectionField(
      "depth",
      walk,
      CHAIN_LENS,
      undefined,
      SEED,
      HUE
    );
    // Within each chain the sorted segments tile their span with matching
    // colors at every interior boundary (the gamut-sweep subdivision).
    for (let c = 0; c < 3; c++) {
      const segs = field[c];
      for (let i = 1; i < segs.length; i++) {
        expect(segs[i].c0).toBeCloseTo(segs[i - 1].c1, 9);
        expectRgbClose(segs[i].rgb0, segs[i - 1].rgb1);
      }
    }
    // Both parallel J1->J2 branches start and end in the SAME colors.
    const e1a = segAtStart(field[0], 10).rgb0;
    const e2a = segAtStart(field[1], 0).rgb0;
    expectRgbClose(e1a, e2a);
    const e1b = segAtEnd(field[0], 30).rgb1;
    const e2b = segAtEnd(field[1], 24).rgb1;
    expectRgbClose(e1b, e2b);
  });

  it("noise: empty lists (renderer evaluates spatially)", () => {
    const field = buildSectionField(
      "noise",
      makeWalk(),
      CHAIN_LENS,
      undefined,
      SEED,
      HUE
    );
    for (const segs of field) expect(segs.length).toBe(0);
  });
});

describe("junctionBlend (junction ramp reach)", () => {
  const build = (reach?: number): VSegment[][] =>
    buildSectionField(
      "segments",
      makeWalk(),
      CHAIN_LENS,
      undefined,
      SEED,
      HUE,
      reach
    );
  // A chain's color at ctrl c (first containing segment, as the renderer).
  const at = (segs: VSegment[], c: number): RGB => {
    const s = segs.find((g) => c >= g.c0 - 1e-9 && c <= g.c1 + 1e-9)!;
    const t = s.c1 > s.c0 ? (c - s.c0) / (s.c1 - s.c0) : 0;
    return [0, 1, 2].map(
      (k) => s.rgb0[k] + (s.rgb1[k] - s.rgb0[k]) * t
    ) as RGB;
  };
  const expectRgb = (a: RGB, b: RGB): void => {
    for (let k = 0; k < 3; k++) expect(a[k]).toBeCloseTo(b[k], 9);
  };

  it("0 reproduces the historic field exactly", () => {
    expect(build(0)).toEqual(build());
  });

  it("1 makes a run one gradient through its own color at its midpoint", () => {
    // e1 = chain 0, ctrl 10..30 (J1 -> J2): own color at 20, junction
    // colors at the ends, and no flat stretch anywhere inside it.
    const base = build(0)[0];
    const full = build(1)[0];
    expectRgb(at(full, 20), at(base, 20));
    expectRgb(at(full, 10), at(base, 10));
    expectRgb(at(full, 30), at(base, 30));
    const inside = full.filter((s) => s.c0 >= 10 - 1e-9 && s.c1 <= 30 + 1e-9);
    for (const s of inside) {
      const flat = s.rgb0.every((v, k) => Math.abs(v - s.rgb1[k]) < 1e-12);
      expect(flat && s.c1 - s.c0 > 1e-9).toBe(false);
    }
  });

  it("stays continuous between consecutive segments at every reach", () => {
    for (const reach of [0.05, 0.3, 0.7, 1]) {
      for (const segs of build(reach)) {
        for (let i = 0; i + 1 < segs.length; i++) {
          if (Math.abs(segs[i].c1 - segs[i + 1].c0) > 1e-9) continue;
          expectRgb(segs[i].rgb1, segs[i + 1].rgb0);
        }
      }
    }
  });
});
