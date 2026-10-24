// K859: the wedge rim curve (ribbon/rim_curve.ts). Both branches
// are pinned to their pre-K859 curves: the corner-projection cubic
// and the quadratic through the corner (the de-facto rim - the
// cubic fires only at narrow wedges, measured 392/392 wedges with
// a negative projection on the frozen seed-3 maze).
import { describe, expect, it } from "vitest";
import { rimCurvePoints } from "../../src/render/ribbon/rim_curve";

const N = 8;

// The pre-K859 corner-projection cubic, as a reference pin.
function oldCubic(
  ax: number, ay: number, tax: number, tay: number,
  bx: number, by: number, tbx: number, tby: number,
  cx: number, cy: number
): number[] {
  const dA = (cx - ax) * tax + (cy - ay) * tay > 0 ? ((cx - ax) * tax + (cy - ay) * tay) * 0.62 : 0;
  const dB = (cx - bx) * tbx + (cy - by) * tby > 0 ? ((cx - bx) * tbx + (cy - by) * tby) * 0.62 : 0;
  const c1x = ax + tax * dA, c1y = ay + tay * dA;
  const c2x = bx + tbx * dB, c2y = by + tby * dB;
  const pts: number[] = [];
  for (let i = 1; i < N; i++) {
    const q = i / N, u = 1 - q;
    pts.push(
      u * u * u * ax + 3 * u * u * q * c1x + 3 * u * q * q * c2x + q * q * q * bx,
      u * u * u * ay + 3 * u * u * q * c1y + 3 * u * q * q * c2y + q * q * q * by
    );
  }
  return pts;
}

// The pre-K859 fallback: a quadratic through the corner.
function oldQuadratic(
  ax: number, ay: number, bx: number, by: number, cx: number, cy: number
): number[] {
  const pts: number[] = [];
  for (let i = 1; i < N; i++) {
    const q = i / N, u = 1 - q;
    pts.push(u * u * ax + 2 * u * q * cx + q * q * bx, u * u * ay + 2 * u * q * cy + q * q * by);
  }
  return pts;
}

// End tangent directions by 3-point differences (exact for
// quadratics, O(h^2) for cubics).
function startTangent(ax: number, ay: number, pts: number[]): [number, number] {
  return [-3 * ax + 4 * pts[0] - pts[2], -3 * ay + 4 * pts[1] - pts[3]];
}
function sinBetween(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 * y2 - y1 * x2) / (Math.hypot(x1, y1) * Math.hypot(x2, y2));
}

describe("rimCurvePoints", () => {
  it("reproduces the corner-projection cubic when both projections are positive", () => {
    const rc = rimCurvePoints(1, 0, 0, 1, 0, 1, -1, 0, -0.5, 0.5, N);
    expect(rc.fellBack).toBe(false);
    const ref = oldCubic(1, 0, 0, 1, 0, 1, -1, 0, -0.5, 0.5);
    expect(rc.pts.length).toBe(ref.length);
    for (let i = 0; i < ref.length; i++) expect(rc.pts[i]).toBeCloseTo(ref[i], 12);
  });

  it("falls back to the corner quadratic, kink and all, when the corner is behind a tip", () => {
    const ax = 1, ay = 0, tax = 0, tay = 1;
    const bx = 0, by = 1, tbx = -1, tby = 0;
    const rc = rimCurvePoints(ax, ay, tax, tay, bx, by, tbx, tby, 0.2, 0.1, N);
    expect(rc.fellBack).toBe(true);
    const ref = oldQuadratic(ax, ay, bx, by, 0.2, 0.1);
    expect(rc.pts.length).toBe(ref.length);
    for (let i = 0; i < ref.length; i++) expect(rc.pts[i]).toBeCloseTo(ref[i], 12);
    // Documented cost of this branch (K859): its start tangent
    // points at the corner, not along the flank tangent. A G1
    // replacement must beat this number without the measured
    // overshoot of the arc-fit Hermite.
    const [sx, sy] = startTangent(ax, ay, rc.pts);
    expect(sinBetween(sx, sy, tax, tay)).toBeGreaterThan(0.3);
    for (const v of rc.pts) expect(Number.isFinite(v)).toBe(true);
  });

  it("sweeps wedge angles without wandering from the tip segment", () => {
    for (let deg = 5; deg <= 175; deg += 5) {
      const th = (deg * Math.PI) / 180;
      const ax = 1, ay = 0, tax = 1, tay = 0;
      const bx = Math.cos(th), by = Math.sin(th), tbx = Math.cos(th), tby = Math.sin(th);
      const chord0 = Math.hypot(bx - ax, by - ay);
      const cx = (ax + bx) / 2 + chord0 * 0.3, cy = (ay + by) / 2 + chord0 * 0.3;
      const rc = rimCurvePoints(ax, ay, tax, tay, bx, by, tbx, tby, cx, cy, N);
      expect(rc.pts.length).toBe((N - 1) * 2);
      const chord = chord0;
      const dx = bx - ax, dy = by - ay;
      for (let i = 0; i < rc.pts.length; i += 2) {
        const px = rc.pts[i], py = rc.pts[i + 1];
        expect(Number.isFinite(px)).toBe(true);
        // Distance to the tip segment stays within a chord.
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (chord * chord)));
        const dSeg = Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
        expect(dSeg).toBeLessThan(chord * 1.35);
      }
    }
  });

  it("handles near-parallel tangents (theta near 0 or PI)", () => {
    const flat = rimCurvePoints(0, 0, 1, 0, 2, 0.01, 1, 0, 1, -1, N);
    for (const v of flat.pts) expect(Number.isFinite(v)).toBe(true);
    const back = rimCurvePoints(0, 0, 1, 0, 2, 0, -1, 0, 1, 0.5, N);
    for (const v of back.pts) expect(Number.isFinite(v)).toBe(true);
  });
});
