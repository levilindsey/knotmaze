// K856: the marker clip band's disc-frame conversion and the
// fragment predicate it feeds (mirrored from MARKER_FRAG). Only the
// part of a marker overlapping the over thread (+ gap) is cut.
import { describe, expect, it } from "vitest";
import { clipBandCuts, clipBandUniforms } from "../../src/render/clip_band";
import type { ClipBand } from "../../src/render/clip_band";

const band = (over: Partial<ClipBand> = {}): ClipBand => ({
  x: 10,
  y: 20,
  dx: 1,
  dy: 0,
  halfW: 0.3,
  ...over,
});

describe("clipBandUniforms", () => {
  it("centres the band on the crossing, in disc radii", () => {
    const { a, b } = clipBandUniforms(band(), 10, 20, 0.5);
    expect(a).toEqual([0, 0, 1, 0]);
    expect(b[0]).toBeCloseTo(0.6); // 0.3 world / 0.5 radius
    expect(b[2]).toBe(1);
  });

  it("scales offsets by the placed radius", () => {
    const small = clipBandUniforms(band(), 9, 20, 0.5);
    const big = clipBandUniforms(band(), 9, 20, 1);
    expect(small.a[0]).toBeCloseTo(2);
    expect(big.a[0]).toBeCloseTo(1);
    expect(big.b[0]).toBeCloseTo(small.b[0] / 2);
  });

  it("gives a half length that covers the whole disc from any offset", () => {
    // Band centre 3 radii away along its own line: fragments on the
    // far side of the disc must still pass the along test so the
    // across test alone decides.
    const { a, b } = clipBandUniforms(band({ x: 13 }), 10, 20, 1);
    expect(b[1]).toBeGreaterThan(3 + 1.1);
    expect(a[0]).toBeCloseTo(3);
  });
});

describe("clipBandCuts", () => {
  it("cuts inside the strip and keeps the rest of the disc", () => {
    const { a, b } = clipBandUniforms(band(), 10, 20, 1);
    expect(clipBandCuts(a, b, 0, 0)).toBe(true); // centre, under the thread
    expect(clipBandCuts(a, b, 0, 0.29)).toBe(true); // just inside halfW
    expect(clipBandCuts(a, b, 0, 0.31)).toBe(false); // just outside
    expect(clipBandCuts(a, b, -0.9, 0.9)).toBe(false); // corner of the disc
  });

  it("follows the over pass's direction when rotated", () => {
    const d = Math.SQRT1_2;
    const { a, b } = clipBandUniforms(band({ dx: d, dy: d }), 10, 20, 1);
    expect(clipBandCuts(a, b, 0.5 * d, 0.5 * d)).toBe(true); // on the line
    expect(clipBandCuts(a, b, -0.5 * d, 0.5 * d)).toBe(false); // across it
  });

  it("never cuts while the band is off", () => {
    const { a, b } = clipBandUniforms(band(), 10, 20, 1);
    b[2] = 0;
    expect(clipBandCuts(a, b, 0, 0)).toBe(false);
  });

  it("agrees across marker radii for the same world geometry", () => {
    const w = band({ x: 10.4, y: 19.8 });
    const u1 = clipBandUniforms(w, 10, 20, 0.5);
    const u2 = clipBandUniforms(w, 10, 20, 1);
    // The same world offset from the marker centre is disc point p
    // at radius 0.5 and p / 2 at radius 1.
    for (const [px, py] of [
      [0.8, -0.4],
      [0.2, 0.1],
      [-0.6, 0.55],
      [0, 0],
    ]) {
      expect(clipBandCuts(u2.a, u2.b, px / 2, py / 2)).toBe(
        clipBandCuts(u1.a, u1.b, px, py)
      );
    }
  });
});
