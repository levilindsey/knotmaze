// K580 s5: the stadium cap cover's geometry (src/render/ribbon/tip_stadium.ts).
// A glyph's fused spur tip records its untucked stroke from J to T; the cover
// is a band at +-side of it, round around J (radius side) and flat at T,
// where the 1.06h disc overlaps it. These pin the ends, the radius and the
// lateral clamp (every rim point within side of the stroke, so the cover
// stays inside the untucked ideal), and the stroke buffer's growth.
import { describe, expect, it } from "vitest";
import { stadiumRim, tipStrokeWrite, STADIUM_CAP_SEGS, TIP_STROKE_STRIDE } from "../../src/render/ribbon/tip_stadium";

const stroke = (pts: Array<[number, number, number, number]>) => {
  let buf: Float32Array | null = null;
  pts.forEach(([x, y, tx, ty], i) => (buf = tipStrokeWrite(buf, i, x, y, tx, ty)));
  return buf!;
};

// Distance from (px, py) to the polyline through the stroke's points.
const distToStroke = (st: Float32Array, px: number, py: number) => {
  const n = st[0];
  let best = Infinity;
  for (let i = 0; i < n; i++) {
    const o = 1 + i * TIP_STROKE_STRIDE;
    const ax = st[o];
    const ay = st[o + 1];
    if (i === n - 1) {
      best = Math.min(best, Math.sqrt((px - ax) ** 2 + (py - ay) ** 2));
      break;
    }
    const bx = st[o + TIP_STROKE_STRIDE];
    const by = st[o + TIP_STROKE_STRIDE + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const L2 = dx * dx + dy * dy;
    const t = L2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L2)) : 0;
    best = Math.min(best, Math.sqrt((px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2));
  }
  return best;
};

const pairs = (rim: number[]) => {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < rim.length; i += 2) out.push([rim[i], rim[i + 1]]);
  return out;
};

describe("K580 s5: tipStrokeWrite", () => {
  it("allocates, grows keeping earlier points, normalizes tangents and sets the count", () => {
    let buf = tipStrokeWrite(null, 0, 1, 2, 3, 4);
    expect(buf.length).toBeGreaterThanOrEqual(1 + 6 * TIP_STROKE_STRIDE);
    expect(buf[0]).toBe(1);
    expect(Array.from(buf.subarray(1, 5))).toEqual([1, 2, Math.fround(0.6), Math.fround(0.8)]);
    const first = buf;
    buf = tipStrokeWrite(buf, 1, 5, 6, 0, -2);
    expect(buf).toBe(first); // room left: no new buffer
    expect(buf[0]).toBe(2);
    expect(Array.from(buf.subarray(5, 9))).toEqual([5, 6, 0, -1]);
    buf = tipStrokeWrite(buf, 10, 7, 8, 1, 0);
    expect(buf.length).toBeGreaterThanOrEqual(1 + 11 * TIP_STROKE_STRIDE);
    expect(buf[0]).toBe(11);
    expect(Array.from(buf.subarray(1, 9))).toEqual([1, 2, Math.fround(0.6), Math.fround(0.8), 5, 6, 0, -1]);
    // A shorter rewrite reuses the buffer and lowers the count.
    expect(tipStrokeWrite(buf, 2, 0, 0, 1, 0)[0]).toBe(3);
  });

  it("a zero tangent stays finite", () => {
    const buf = tipStrokeWrite(null, 0, 0, 0, 0, 0);
    expect(Number.isFinite(buf[3]) && Number.isFinite(buf[4])).toBe(true);
  });
});

describe("K580 s5: stadiumRim", () => {
  const side = 0.995 * 0.26;

  it("is null for a stroke under two points", () => {
    expect(stadiumRim(stroke([[0, 0, 1, 0]]), side, [0, 0])).toBeNull();
  });

  it("a straight stroke: T's corners, the band, the round end around J, closed", () => {
    // J (0, 0) -> T (0.2, 0), three samples.
    const st = stroke([
      [0, 0, 1, 0],
      [0.1, 0, 1, 0],
      [0.2, 0, 1, 0],
    ]);
    const apex = [NaN, NaN];
    const rim = stadiumRim(st, side, apex)!;
    const P = pairs(rim);
    // n left + (SEGS - 1) cap + n right + the closing repeat.
    expect(P.length).toBe(3 + (STADIUM_CAP_SEGS - 1) + 3 + 1);
    expect(P[P.length - 1]).toEqual(P[0]);
    // Starts at T's left corner, ends (before the repeat) at T's right one.
    expect(P[0][0]).toBeCloseTo(0.2, 6);
    expect(P[0][1]).toBeCloseTo(side, 6);
    expect(P[P.length - 2][0]).toBeCloseTo(0.2, 6);
    expect(P[P.length - 2][1]).toBeCloseTo(-side, 6);
    // J's left and right offsets bracket the cap.
    expect(P[2][0]).toBeCloseTo(0, 6);
    expect(P[2][1]).toBeCloseTo(side, 6);
    expect(P[3 + STADIUM_CAP_SEGS - 1][0]).toBeCloseTo(0, 6);
    expect(P[3 + STADIUM_CAP_SEGS - 1][1]).toBeCloseTo(-side, 6);
    // The cap: radius side about J, behind J (away from T), its middle
    // point straight back along -tangent.
    const cap = P.slice(3, 3 + STADIUM_CAP_SEGS - 1);
    for (const [x, y] of cap) {
      expect(Math.sqrt(x * x + y * y)).toBeCloseTo(side, 6);
      expect(x).toBeLessThan(0);
    }
    expect(cap[(STADIUM_CAP_SEGS >> 1) - 1][0]).toBeCloseTo(-side, 6);
    expect(cap[(STADIUM_CAP_SEGS >> 1) - 1][1]).toBeCloseTo(0, 6);
    // The apex is the J-T midpoint.
    expect(apex[0]).toBeCloseTo(0.1, 6);
    expect(apex[1]).toBeCloseTo(0, 6);
  });

  it("a bent stroke: every rim point within side of the stroke (the lateral clamp)", () => {
    // A gentle arc from J, radius 0.6, turning 20 deg over its length.
    const pts: Array<[number, number, number, number]> = [];
    const R = 0.6;
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = ((20 * Math.PI) / 180) * (i / (n - 1));
      pts.push([R * Math.sin(a), R - R * Math.cos(a), Math.cos(a), Math.sin(a)]);
    }
    const st = stroke(pts);
    const apex = [0, 0];
    const rim = stadiumRim(st, side, apex)!;
    let farthest = 0;
    for (const [x, y] of pairs(rim)) farthest = Math.max(farthest, distToStroke(st, x, y));
    expect(farthest).toBeLessThanOrEqual(side + 1e-6);
    // ...and the band reaches it on both sides at every stroke point.
    for (let i = 0; i < n; i++) {
      const o = 1 + i * TIP_STROKE_STRIDE;
      const [x, y, tx, ty] = [st[o], st[o + 1], st[o + 2], st[o + 3]];
      const near = (px: number, py: number) =>
        pairs(rim).some(([rx, ry]) => Math.abs(rx - px) < 1e-6 && Math.abs(ry - py) < 1e-6);
      expect(near(x - ty * side, y + tx * side), `left ${i}`).toBe(true);
      expect(near(x + ty * side, y - tx * side), `right ${i}`).toBe(true);
    }
  });
});
