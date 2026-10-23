// K313: the loader trefoil's geometry (src/loader/loader_geometry.ts).
import { describe, expect, it } from "vitest";
import {
  arcSpan,
  pointAtArc,
  trefoilShape,
  trefoilSvgPaths,
} from "../../src/loader/loader_geometry";
import { MOTION_KEY } from "../../src/ui/motion";

describe("K313 loader geometry", () => {
  const shape = trefoilShape();

  it("has the trefoil's three crossings, each passed over and under", () => {
    // Three crossings x two passes = six events; every other one dives.
    expect(shape.under.length).toBe(3);
  });

  it("cuts the strand into pieces at the under crossings", () => {
    expect(shape.pieces.length).toBeGreaterThanOrEqual(3);
    for (const piece of shape.pieces) expect(piece.length).toBeGreaterThan(1);
    expect(trefoilSvgPaths(shape)).toHaveLength(shape.pieces.length);
  });

  it("arc-length parameterization is monotone and wraps", () => {
    for (let i = 1; i < shape.cum.length; i++) {
      expect(shape.cum[i]).toBeGreaterThan(shape.cum[i - 1]);
    }
    const a = pointAtArc(shape, 0);
    const b = pointAtArc(shape, shape.total);
    expect(Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1])).toBeLessThan(1e-9);
    const c = pointAtArc(shape, -0.5);
    const d = pointAtArc(shape, shape.total - 0.5);
    expect(Math.hypot(c.p[0] - d.p[0], c.p[1] - d.p[1])).toBeLessThan(1e-9);
  });

  it("the heading winds twice per lap (720 degrees)", () => {
    let wind = 0;
    let prev = pointAtArc(shape, 0).heading;
    const STEPS = 720;
    for (let k = 1; k <= STEPS; k++) {
      const h = pointAtArc(shape, (shape.total * k) / STEPS).heading;
      let d = h - prev;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      wind += d;
      prev = h;
    }
    expect(Math.abs(wind)).toBeCloseTo(Math.PI * 4, 0);
  });

  it("a trail span has the asked length at a fixed step", () => {
    const pts = arcSpan(shape, 1, 3.6, 0.06);
    let len = 0;
    for (let i = 1; i < pts.length; i++) {
      len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    }
    expect(len).toBeGreaterThan(2.3);
    expect(len).toBeLessThan(2.7);
  });

  it("K828: the gap is a parameter; the default is today's shape", () => {
    const drawn = (s: ReturnType<typeof trefoilShape>): number =>
      s.pieces.reduce((n, piece) => n + piece.length, 0);
    // The default call and the explicit default agree point for point.
    expect(trefoilShape(240, 0.6).pieces).toEqual(shape.pieces);
    // A wider gap cuts more strand away; no gap keeps every sample.
    expect(drawn(trefoilShape(240, 1.8))).toBeLessThan(drawn(shape));
    expect(drawn(trefoilShape(240, 0))).toBe(241);
    // The crossings do not move with the gap.
    expect(trefoilShape(240, 1.8).under).toEqual(shape.under);
  });

  it("the boot script's storage key is motion.ts's", () => {
    // loader_boot.ts reads the viewer's Motion preference before the
    // bundle exists; it must read the same key (K313 open point 5).
    expect(MOTION_KEY).toBe("knotmaze.motion");
  });
});
