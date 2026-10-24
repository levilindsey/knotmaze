// K860: Farin-style fairness metrics (glyph_fairness.ts) on
// synthetic paths with known curvature structure.
import { describe, expect, it } from "vitest";
import { pathFairness } from "../../src/core/glyphs/glyph_fairness";
import type { CubicPath } from "../../src/core/glyphs/glyph_types";

const straight: CubicPath = [
  [0, 0],
  [10, 0],
  [20, 0],
  [30, 0],
];

// Quarter circle R=50 (standard 0.5523 cubic), clockwise: one sign.
const arc: CubicPath = [
  [0, 50],
  [27.6, 50],
  [50, 27.6],
  [50, 0],
];

// Two arcs of opposite sign joined G1: one sign flip.
const ess: CubicPath = [
  [0, 0],
  [15, 0],
  [30, 5],
  [30, 20],
  [30, 35],
  [45, 40],
  [60, 40],
];

// A wiggly line: alternating small turns.
function wiggly(): CubicPath {
  const pts: [number, number][] = [[0, 0]];
  let x = 0;
  let y = 0;
  for (let i = 0; i < 8; i++) {
    const dir = i % 2 === 0 ? 6 : -6;
    pts.push([x + 4, y + dir * 0.4], [x + 8, y + dir], [x + 12, y]);
    x += 12;
  }
  return pts as CubicPath;
}

describe("pathFairness", () => {
  it("reads a straight path as perfectly fair", () => {
    const f = pathFairness(straight);
    expect(f.signFlips).toBe(0);
    expect(f.kappaPieces).toBe(1);
    expect(f.kappaExcess).toBe(0);
    expect(f.minRadiusGU).toBe(Infinity);
    expect(f.lengthGU).toBeCloseTo(30, 5);
  });

  it("reads a one-sign arc as one piece with the right radius", () => {
    const f = pathFairness(arc);
    expect(f.signFlips).toBe(0);
    expect(f.kappaPieces).toBe(1);
    expect(f.minRadiusGU).toBeGreaterThan(40);
    expect(f.minRadiusGU).toBeLessThan(60);
    expect(f.kappaExcess).toBeLessThan(0.004);
  });

  it("counts one sign flip on an S", () => {
    const f = pathFairness(ess);
    expect(f.signFlips).toBe(1);
  });

  it("flags big wiggles as flips and pieces", () => {
    const f = pathFairness(wiggly());
    expect(f.signFlips).toBeGreaterThan(2);
    expect(f.kappaPieces).toBeGreaterThan(3);
  });

  it("flags sub-swing ripple as excess variation", () => {
    // A gentle arc (kappa ~ 0.013, one sign) whose controls jitter
    // by 0.06 GU: kappa wiggles below the piece-swing threshold, so
    // the monotone skeleton explains almost none of the variation.
    const y = (x: number): number => (x * x) / 154;
    const pts: [number, number][] = [[0, 0]];
    for (let i = 0; i < 10; i++) {
      const x0 = i * 10;
      const j = i % 2 === 0 ? 0.06 : -0.06;
      pts.push([x0 + 3.3, y(x0 + 3.3) + j], [x0 + 6.7, y(x0 + 6.7) - j], [x0 + 10, y(x0 + 10)]);
    }
    const f = pathFairness(pts as CubicPath);
    expect(f.signFlips).toBe(0);
    expect(f.kappaExcess).toBeGreaterThan(0.004);
  });
});
