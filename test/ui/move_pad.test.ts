import { describe, expect, it } from "vitest";
import { movePadPref, PAD_DEAD, PAD_SIZE, PAD_WAIT, padDirAt } from "../../src/ui/move_pad";

// K120 Part B: the move pad's pure parts. The pad itself (DOM, pointer
// capture, holds) is covered by the page probe (.claude/probes/K120/pad.mjs).

describe("movePadPref", () => {
  it("follows the stored choice", () => {
    expect(movePadPref("1", false)).toBe(true);
    expect(movePadPref("0", true)).toBe(false);
  });

  it("defaults to on for coarse pointers, off for mice", () => {
    expect(movePadPref(null, true)).toBe(true);
    expect(movePadPref(null, false)).toBe(false);
    // Anything unreadable is no choice at all.
    expect(movePadPref("yes", true)).toBe(true);
    expect(movePadPref("", false)).toBe(false);
  });
});

describe("padDirAt", () => {
  it("picks the arm of the 90-degree sector the point is in", () => {
    expect(padDirAt(0, -40)).toBe("up");
    expect(padDirAt(40, 0)).toBe("right");
    expect(padDirAt(0, 40)).toBe("down");
    expect(padDirAt(-40, 0)).toBe("left");
    // Off-axis but inside a sector.
    expect(padDirAt(30, -40)).toBe("up");
    expect(padDirAt(40, 30)).toBe("right");
    expect(padDirAt(-30, 40)).toBe("down");
    expect(padDirAt(-40, -30)).toBe("left");
  });

  it("sends an exact diagonal to the vertical arm", () => {
    expect(padDirAt(30, 30)).toBe("down");
    expect(padDirAt(-30, -30)).toBe("up");
  });

  it("picks nothing inside the dead radius", () => {
    expect(padDirAt(0, 0)).toBe(null);
    expect(padDirAt(PAD_DEAD - 1, 0)).toBe(null);
    expect(padDirAt(0, -(PAD_DEAD - 1))).toBe(null);
    expect(padDirAt(PAD_DEAD, 0)).toBe("right");
    expect(padDirAt(5, 5, 4)).toBe("down");
  });
});

describe("K80 turns 3a the pad's wait", () => {
  it("grows the center to PAD_WAIT while it waits; the arms keep the rest", () => {
    expect(PAD_WAIT).toBeGreaterThan(PAD_DEAD);
    // The wait button stays inside the middle third (the arms' cells).
    expect(2 * PAD_WAIT).toBeLessThanOrEqual(PAD_SIZE / 3);
    // Inside PAD_WAIT: the center (the wait), even past the dead radius.
    expect(padDirAt(PAD_DEAD + 2, 0, PAD_WAIT)).toBe(null);
    expect(padDirAt(0, -(PAD_WAIT - 1), PAD_WAIT)).toBe(null);
    expect(padDirAt(15, 15, PAD_WAIT)).toBe(null);
    // At and past it, the arms as before.
    expect(padDirAt(PAD_WAIT, 0, PAD_WAIT)).toBe("right");
    expect(padDirAt(0, PAD_WAIT, PAD_WAIT)).toBe("down");
    expect(padDirAt(-30, 10, PAD_WAIT)).toBe("left");
    expect(padDirAt(10, -40, PAD_WAIT)).toBe("up");
    // The same points are arms while the center does not wait.
    expect(padDirAt(PAD_DEAD + 2, 0)).toBe("right");
    expect(padDirAt(0, -(PAD_WAIT - 1))).toBe("up");
  });
});