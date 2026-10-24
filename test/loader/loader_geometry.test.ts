// K313: the loader trefoil's geometry (src/loader/loader_geometry.ts).
import { describe, expect, it } from "vitest";
import {
  arcSpan,
  GAP_SAMPLES,
  headingDelta,
  nearestUnderCrossing,
  pointAtArc,
  rotationForCentroidAbove,
  rotationForHeadBelowCentroid,
  shapeCentroid,
  trefoilShape,
  trefoilSvgPaths,
  underGapAt,
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

  it("K841: the followed rotation never jumps or reverses", () => {
    // The worker's camera follows half the (continuous) heading. Walk
    // two laps the way it does: the followed angle must turn smoothly
    // one way, one full turn per lap, with no frame's step reversing.
    const STEPS = 1440;
    let prev = pointAtArc(shape, 0).heading;
    let cont = prev;
    let lastTarget = -cont / 2;
    let maxStep = 0;
    for (let k = 1; k <= STEPS; k++) {
      const h = pointAtArc(shape, (2 * shape.total * k) / STEPS).heading;
      cont += headingDelta(prev, h);
      prev = h;
      const target = -cont / 2;
      const step = target - lastTarget;
      maxStep = Math.max(maxStep, Math.abs(step));
      lastTarget = target;
    }
    expect(maxStep).toBeLessThan(0.05);
    expect(Math.abs(lastTarget - -pointAtArc(shape, 0).heading / 2)).toBeCloseTo(Math.PI * 4, 0);
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

  it("K851: the head's dive window is the strand's gap, widened by its radius", () => {
    // Arc position of the first under crossing.
    const u = shape.under[0];
    const i = Math.floor(u);
    const base = shape.cum[i] + (shape.cum[i + 1] - shape.cum[i]) * (u - i);
    // At the crossing and anywhere inside the strand's own gap: hidden.
    expect(underGapAt(shape, base, 0)).toBe(true);
    expect(underGapAt(shape, base - GAP_SAMPLES / 2, 0)).toBe(true);
    // Just past the gap: visible again with no margin...
    expect(underGapAt(shape, base + GAP_SAMPLES + 0.1, 0)).toBe(false);
    // ...but the glyph's radius pulls the dive earlier (it clips
    // before its edge reaches the over thread).
    expect(underGapAt(shape, base + GAP_SAMPLES + 0.1, 0.5)).toBe(true);
    // Halfway between crossings the head rides on top.
    const mid = base + shape.total / 6;
    expect(underGapAt(shape, mid, 0.5)).toBe(false);
    // The window wraps the lap seam like the strand does.
    expect(underGapAt(shape, base + shape.total, 0)).toBe(true);
    expect(underGapAt(shape, base - shape.total, 0)).toBe(true);
  });

  it("K852: the centroid is the strand's balance point", () => {
    const [cx, cy] = shapeCentroid(shape);
    // The trefoil is 3-fold symmetric about the origin, so its
    // centroid sits at the origin (up to sampling).
    expect(Math.abs(cx)).toBeLessThan(0.05);
    expect(Math.abs(cy)).toBeLessThan(0.05);
  });

  it("K852: the above rotation puts the centroid directly over the head", () => {
    const [cx, cy] = shapeCentroid(shape);
    for (const s of [0, shape.total / 7, shape.total / 3, shape.total * 0.9]) {
      const head = pointAtArc(shape, s).p;
      const rot = rotationForCentroidAbove(shape, head);
      expect(rot).not.toBeNull();
      // Apply the canvas rotation to (centroid - head): x ~ 0, y < 0.
      const vx = cx - head[0];
      const vy = cy - head[1];
      const rx = vx * Math.cos(rot!) - vy * Math.sin(rot!);
      const ry = vx * Math.sin(rot!) + vy * Math.cos(rot!);
      expect(Math.abs(rx)).toBeLessThan(1e-9);
      expect(ry).toBeLessThan(0);
      // The rotation is continuous frame to frame (no wrong-way spin):
      const next = rotationForCentroidAbove(shape, pointAtArc(shape, s + 0.05).p)!;
      expect(Math.abs(headingDelta(rot!, next))).toBeLessThan(0.2);
    }
  });

  it("K853: the spin rotation puts the head directly below the centroid", () => {
    const centroid = shapeCentroid(shape);
    for (const s of [0, shape.total / 7, shape.total / 3, shape.total * 0.9]) {
      const head = pointAtArc(shape, s).p;
      const rot = rotationForHeadBelowCentroid(shape, head);
      expect(rot).not.toBeNull();
      // Apply the canvas rotation to (head - centroid): x ~ 0, y > 0.
      const vx = head[0] - centroid[0];
      const vy = head[1] - centroid[1];
      const rx = vx * Math.cos(rot!) - vy * Math.sin(rot!);
      const ry = vx * Math.sin(rot!) + vy * Math.cos(rot!);
      expect(Math.abs(rx)).toBeLessThan(1e-9);
      expect(ry).toBeGreaterThan(0);
      // One lap of the head winds the spin exactly once (no backspin):
      const next = rotationForHeadBelowCentroid(shape, pointAtArc(shape, s + 0.05).p)!;
      expect(Math.abs(headingDelta(rot!, next))).toBeLessThan(0.2);
    }
    // The two centroid rotations solve the same equation (centroid
    // over head <=> head under centroid): identical angles, the modes
    // differ only in which point is pinned to the screen.
    const head = pointAtArc(shape, shape.total / 5).p;
    const a = rotationForCentroidAbove(shape, head)!;
    const b = rotationForHeadBelowCentroid(shape, head)!;
    expect(Math.abs(headingDelta(a, b))).toBeLessThan(1e-9);
  });

  it("K855: crossings carry the over pass's line for the partial clip", () => {
    expect(shape.crossings).toHaveLength(3);
    for (const cr of shape.crossings) {
      // The crossing point is the strand point at its arc position.
      const onStrand = pointAtArc(shape, cr.s).p;
      expect(Math.abs(onStrand[0] - cr.point[0])).toBeLessThan(1e-9);
      expect(Math.abs(onStrand[1] - cr.point[1])).toBeLessThan(1e-9);
      // The two passes really cross (not parallel): the clip band is
      // meaningless otherwise.
      expect(Math.abs(Math.sin(cr.overHeading - cr.underHeading))).toBeGreaterThan(0.3);
      // Inside the strand's own gap window at the crossing itself.
      expect(underGapAt(shape, cr.s, 0)).toBe(true);
    }
    // Crossing arc positions increase along the strand.
    const ss = shape.crossings.map((cr) => cr.s);
    expect([...ss].sort((x, y) => x - y)).toEqual(ss);
  });

  it("K855: nearestUnderCrossing measures signed wrap-aware distance", () => {
    const c0 = shape.crossings[0];
    const at = nearestUnderCrossing(shape, c0.s)!;
    expect(at.crossing).toBe(c0);
    expect(Math.abs(at.dist)).toBeLessThan(1e-9);
    expect(nearestUnderCrossing(shape, c0.s + 0.3)!.dist).toBeCloseTo(0.3, 9);
    expect(nearestUnderCrossing(shape, c0.s - 0.3)!.dist).toBeCloseTo(-0.3, 9);
    // Across the lap seam the distance still measures the short way.
    expect(Math.abs(nearestUnderCrossing(shape, c0.s + shape.total)!.dist)).toBeLessThan(1e-9);
    expect(Math.abs(nearestUnderCrossing(shape, c0.s - shape.total)!.dist)).toBeLessThan(1e-9);
    // Halfway to the next crossing it is the nearer of the two.
    const c1 = shape.crossings[1];
    const mid = (c0.s + c1.s) / 2;
    const nm = nearestUnderCrossing(shape, mid)!;
    expect(Math.abs(nm.dist)).toBeCloseTo((c1.s - c0.s) / 2, 6);
  });

  it("the boot script's storage key is motion.ts's", () => {
    // loader_boot.ts reads the viewer's Motion preference before the
    // bundle exists; it must read the same key (K313 open point 5).
    expect(MOTION_KEY).toBe("knotmaze.motion");
  });
});
