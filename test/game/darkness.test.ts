import { describe, it, expect } from "vitest";
import { darknessAlpha, pruneDarkStamps } from "../../src/game/darkness";

// K137 darkness (4.17): the refill timing.

describe("darknessAlpha", () => {
  it("never closes with darkness off", () => {
    expect(darknessAlpha(0, 0)).toBe(1);
    expect(darknessAlpha(99, 0)).toBe(1);
  });
  it("fades linearly over the span and is gone at it", () => {
    expect(darknessAlpha(0, 10)).toBe(1);
    expect(darknessAlpha(5, 10)).toBe(0.5);
    expect(darknessAlpha(10, 10)).toBe(0);
    expect(darknessAlpha(30, 10)).toBe(0);
  });
});

describe("pruneDarkStamps", () => {
  it("drops closed stamps and compacts both lists", () => {
    const stamps = [0, 0, 1, 1, 2, 2, 3, 3];
    const moves = [0, 4, 8, 9];
    // At move 10 with a span of 6: ages 10, 6 are closed; 2, 1 live.
    expect(pruneDarkStamps(stamps, moves, 10, 6)).toBe(2);
    expect(stamps).toEqual([2, 2, 3, 3]);
    expect(moves).toEqual([8, 9]);
  });
  it("is a no-op with darkness off", () => {
    const stamps = [0, 0, 1, 1];
    const moves = [0, 1];
    expect(pruneDarkStamps(stamps, moves, 100, 0)).toBe(2);
    expect(stamps).toEqual([0, 0, 1, 1]);
    expect(moves).toEqual([0, 1]);
  });
});
