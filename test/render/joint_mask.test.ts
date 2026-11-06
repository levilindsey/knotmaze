// K1218 S2: inside a junction's footprint the fan draws alone. jointMask
// (ribbon/joinery.ts) leaves a crossing's slot out of a joint's fan mask
// when the slot's over TUBE (its SAMP stretch, polyRange) reaches into the
// joint on one of the joint's own arms (overTubeReachesArm): the fan is
// that thread's own material there, and a cut of it showed the ribbon's
// straight gold edge inside the fan (loop ji 89, 12, 88). The rule is
// local: a slot whose tube ends short of the fan keeps its listing.
// K1219: inside a route band's turn (the web pixel bracketed by the band's
// own two arms, under pi apart) the web wears the band out to its fillet
// edge (FIELD_GLSL junctionField, the CPU twin through innerTurn).
import { describe, expect, it } from "vitest";
import { innerTurn, overTubeReachesArm } from "../../src/render/ribbon/joinery";

// The census's units: fillHalf 0.26 world, fanReach = max(fillHalf * 1.25
// * cusp 3, fillHalf) + fillHalf.
const FH = 0.26;
const FAN = Math.max(FH * 1.25 * 3, FH) + FH;

const open = (arc0: number, dir: number) => ({ arc0, dir, closed: false, total: 40 });

describe("overTubeReachesArm (K1218)", () => {
  it("lists a tube that runs through the joint", () => {
    expect(overTubeReachesArm(10.5, 0.8, 0.8, open(10, 1), FAN, FH)).toBe(true);
  });

  it("lists a pass out on the arm whose tube reaches back into the fan", () => {
    // dir -1: the arm runs toward lower arc, so the tube's reach back
    // toward the joint is its positive side.
    expect(overTubeReachesArm(8.5, 0.1, 0.8, open(10, -1), FAN, FH)).toBe(true);
    expect(overTubeReachesArm(11.5, 0.8, 0.1, open(10, 1), FAN, FH)).toBe(true);
  });

  it("keeps a crossing whose tube ends short of the fan", () => {
    expect(overTubeReachesArm(13, 0.8, 0.8, open(10, 1), FAN, FH)).toBe(false);
    expect(overTubeReachesArm(7, 0.8, 0.8, open(10, -1), FAN, FH)).toBe(false);
    // The reach that counts is toward the joint, not away from it.
    expect(overTubeReachesArm(12, 0.1, 5, open(10, 1), FAN, FH)).toBe(false);
  });

  it("keeps a pass behind the joint (off this arm)", () => {
    expect(overTubeReachesArm(8.5, 0.8, 0.8, open(10, 1), FAN, FH)).toBe(false);
  });

  it("wraps a closed chain's arc", () => {
    const arm = { arc0: 19.5, dir: 1, closed: true, total: 20 };
    expect(overTubeReachesArm(0.5, 0.3, 0.3, arm, FAN, FH)).toBe(true);
    expect(overTubeReachesArm(18.0, 0.3, 0.3, arm, FAN, FH)).toBe(false);
    // Unwrapped, the first pass would read 19 behind the joint.
    expect(overTubeReachesArm(0.5, 0.3, 0.3, { ...arm, closed: false }, FAN, FH)).toBe(false);
  });

  it("is local: no tube that ends beyond fanReach + fillHalf is listed", () => {
    for (let along = -6; along <= 6; along += 0.05) {
      for (const tube of [0, 0.3, 0.8, 1.6]) {
        const got = overTubeReachesArm(10 + along, tube, tube, open(10, 1), FAN, FH);
        const near = along + tube > -FH && along - tube < FAN + FH;
        expect(got).toBe(near);
      }
    }
  });
});

describe("innerTurn (K1219)", () => {
  it("is the band's own arm pair, either way round, under pi apart", () => {
    expect(innerTurn(2, 5, Math.PI / 2, 2, 5)).toBe(true);
    expect(innerTurn(5, 2, Math.PI / 2, 2, 5)).toBe(true);
    expect(innerTurn(0, 1, Math.PI - 1e-3, 1, 0)).toBe(true);
  });

  it("is never the outer side of a turn (pi or more)", () => {
    expect(innerTurn(2, 5, Math.PI, 2, 5)).toBe(false);
    expect(innerTurn(2, 5, 1.5 * Math.PI, 5, 2)).toBe(false);
  });

  it("is never a wedge with another arm", () => {
    expect(innerTurn(2, 3, Math.PI / 2, 2, 5)).toBe(false);
    expect(innerTurn(3, 5, Math.PI / 2, 2, 5)).toBe(false);
    expect(innerTurn(1, 4, Math.PI / 3, 2, 5)).toBe(false);
  });

  it("is never a one-arm band (the head's, out-arm -1)", () => {
    expect(innerTurn(2, -1, Math.PI / 2, 2, -1)).toBe(false);
    expect(innerTurn(2, 3, Math.PI / 2, 2, -1)).toBe(false);
  });
});
