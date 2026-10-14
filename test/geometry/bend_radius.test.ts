import { describe, it, expect } from "vitest";
import {
  BEND_FLOOR_RATIO,
  OVER_TIGHT_RATIO,
  isOverTight,
  legTurnRadius,
  minTurnRatio,
  overTightWindows,
  turnRadii,
} from "../../src/geometry/bend_radius";

// A ring of `count` samples on a circle of radius r (flat xy).
function ring(r: number, count: number, cx = 0, cy = 0): Float64Array {
  const p = new Float64Array(count * 2);
  for (let i = 0; i < count; i++) {
    const a = (2 * Math.PI * i) / count;
    p[i * 2] = cx + r * Math.cos(a);
    p[i * 2 + 1] = cy + r * Math.sin(a);
  }
  return p;
}

// An open run along +x with a circular bump of radius r between x0 and the
// point where it has turned `turn` radians (then straight again).
function hook(r: number, turn: number, spacing: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < 20; i++) out.push(-2 + i * 0.1, 0);
  const steps = Math.ceil((r * turn) / spacing);
  for (let k = 0; k <= steps; k++) {
    const a = (turn * k) / steps;
    out.push(r * Math.sin(a), r - r * Math.cos(a));
  }
  const ex = r * Math.sin(turn);
  const ey = r - r * Math.cos(turn);
  for (let i = 1; i <= 20; i++) {
    out.push(ex + Math.cos(turn) * i * 0.1, ey + Math.sin(turn) * i * 0.1);
  }
  return out;
}

describe("legTurnRadius", () => {
  it("is the circle tangent to both legs at their midpoints", () => {
    // A right-angle corner with unit legs: the tangent circle touches the
    // legs 0.5 from the corner, radius 0.5.
    expect(legTurnRadius(1, 0, 0, 1)).toBeCloseTo(0.5, 12);
    // Legs of 1 and 3: mean half-leg (1 + 3) / 4 = 1.
    expect(legTurnRadius(1, 0, 0, 3)).toBeCloseTo(1, 12);
  });

  it("reads straight legs as Infinity, either direction of turn alike", () => {
    expect(legTurnRadius(1, 0, 2, 0)).toBe(Infinity);
    expect(legTurnRadius(0.3, 0.4, 0, 1)).toBeCloseTo(
      legTurnRadius(0.4, 0.3, 1, 0),
      12
    );
  });

  it("borrows the other leg across a zero leg, like the ribbon", () => {
    expect(legTurnRadius(0, 0, 1, 0)).toBe(Infinity);
    expect(legTurnRadius(1, 1, 0, 0)).toBe(Infinity);
    expect(legTurnRadius(0, 0, 0, 0)).toBe(Infinity);
  });
});

describe("turnRadii", () => {
  it("reads a sampled circle as r cos(s / 2r)", () => {
    for (const r of [0.15, 0.21, 0.5, 2]) {
      const count = Math.max(12, Math.round((2 * Math.PI * r) / 0.09));
      const radii = turnRadii(ring(r, count), count, true);
      const theta = (2 * Math.PI) / count;
      for (let i = 0; i < count; i++) {
        expect(radii[i]).toBeCloseTo(r * Math.cos(theta / 2), 5);
      }
    }
  });

  it("gives an open run's tips no turn", () => {
    const pts = [0, 0, 1, 0, 1, 1, 0, 1];
    const radii = turnRadii(pts, 4, false);
    expect(radii[0]).toBe(Infinity);
    expect(radii[3]).toBe(Infinity);
    expect(radii[1]).toBeCloseTo(0.5, 12);
    expect(radii[2]).toBeCloseTo(0.5, 12);
    // The same points as a ring wrap: every corner turns.
    const ringRadii = turnRadii(pts, 4, true);
    for (let i = 0; i < 4; i++) expect(ringRadii[i]).toBeCloseTo(0.5, 12);
  });

  it("reuses the output buffer when it is long enough", () => {
    const out = new Float64Array(8);
    expect(turnRadii([0, 0, 1, 0, 2, 0], 3, false, out)).toBe(out);
  });
});

describe("overTightWindows", () => {
  it("finds one window per tight bend of an open run", () => {
    const h = 0.21;
    const pts = [...hook(0.12, Math.PI, 0.05)];
    const n = pts.length / 2;
    const wins = overTightWindows(pts, n, false, h);
    expect(wins.length).toBe(1);
    const w = wins[0];
    expect(w.minRatio).toBeLessThan(0.12 / h + 1e-9);
    expect(w.minRatio).toBeGreaterThan(0.12 / h - 0.05);
    expect(w.minIndex).toBeGreaterThanOrEqual(w.start);
    expect(w.minIndex).toBeLessThan(w.start + w.length);
    // A gentle bend of the same shape is not over-tight.
    const loose = hook(0.4, Math.PI, 0.05);
    expect(overTightWindows(loose, loose.length / 2, false, h)).toEqual([]);
  });

  it("reports a ring's window across sample 0 once", () => {
    // A big ring with a tight wiggle straddling sample 0.
    const count = 120;
    const p = ring(3, count);
    for (const [i, s] of [[118, 1], [119, -1], [0, 1], [1, -1], [2, 1]]) {
      p[i * 2] += 0.12 * s;
    }
    const wins = overTightWindows(p, count, true, 0.21);
    expect(wins.length).toBe(1);
    const w = wins[0];
    const covered = new Set<number>();
    for (let k = 0; k < w.length; k++) covered.add((w.start + k) % count);
    for (const i of [119, 0, 1]) expect(covered.has(i)).toBe(true);
    expect(w.start).toBeGreaterThan(100);
  });

  it("returns the whole ring when every sample is tight", () => {
    const count = 40;
    const wins = overTightWindows(ring(0.1, count), count, true, 0.21);
    expect(wins).toEqual([
      expect.objectContaining({ start: 0, length: count }),
    ]);
    expect(wins[0].minRatio).toBeLessThan(0.1 / 0.21);
  });

  it("takes the ratio as the threshold", () => {
    const count = 60;
    const r = 0.23; // 1.095 half-widths: tight against the floor only.
    const p = ring(r, count);
    expect(overTightWindows(p, count, true, 0.21)).toEqual([]);
    expect(
      overTightWindows(p, count, true, 0.21, BEND_FLOOR_RATIO).length
    ).toBe(1);
  });
});

describe("thresholds", () => {
  it("puts the physics floor above the over-tight line", () => {
    expect(BEND_FLOOR_RATIO).toBeGreaterThan(OVER_TIGHT_RATIO);
    expect(isOverTight(0.2, 0.21)).toBe(true);
    expect(isOverTight(0.22, 0.21)).toBe(false);
    expect(isOverTight(0.22, 0.21, BEND_FLOOR_RATIO)).toBe(true);
  });

  it("reports the tightest sample", () => {
    const pts = hook(0.15, Math.PI / 2, 0.04);
    const m = minTurnRatio(pts, pts.length / 2, false, 0.21);
    expect(m.ratio).toBeLessThan(0.15 / 0.21);
    expect(m.index).toBeGreaterThan(19);
    const straight = [0, 0, 1, 0, 2, 0];
    expect(minTurnRatio(straight, 3, false, 0.21)).toEqual({
      ratio: Infinity,
      index: -1,
    });
  });
});
