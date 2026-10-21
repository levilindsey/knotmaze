// K137 stage 3a, 4.32 lives (game/lives.ts): the hearts a setting gives, what
// a catch does with them, and the toast it shows.
import { describe, expect, it } from "vitest";
import {
  LIVES_MAX,
  LIVES_RECOMMENDED,
  catchHeart,
  heartsToast,
  livesOf,
  loseHeart,
} from "../../src/game/lives";

describe("livesOf", () => {
  it("rounds and holds the setting to 0..LIVES_MAX", () => {
    expect(LIVES_MAX).toBe(5);
    expect(LIVES_RECOMMENDED).toBe(3);
    expect([0, 1, 2.4, 2.6, 3, 5, 7, -2].map(livesOf)).toEqual([0, 1, 2, 3, 3, 5, 5, 0]);
  });

  it("reads a non-finite value as off", () => {
    for (const v of [NaN, Infinity, -Infinity]) expect(livesOf(v)).toBe(0);
  });
});

describe("a catch's heart", () => {
  // Plays `catches` catches from full hearts and lists each one's outcome.
  const play = (lives: number, catches: number): string[] => {
    let hearts = livesOf(lives);
    const out: string[] = [];
    for (let i = 0; i < catches; i++) {
      const r = catchHeart(lives, hearts);
      hearts = r.hearts;
      out.push(`${r.loss}:${r.hearts}`);
    }
    return out;
  };

  it("three lives: two spent, then a restart with every heart back, and again", () => {
    expect(play(3, 6)).toEqual([
      "spent:2", "spent:1", "restart:3",
      "spent:2", "spent:1", "restart:3",
    ]);
  });

  it("one life restarts at every catch", () => {
    expect(play(1, 3)).toEqual(["restart:1", "restart:1", "restart:1"]);
  });

  it("five lives restart on the fifth catch", () => {
    expect(play(5, 5)).toEqual(["spent:4", "spent:3", "spent:2", "spent:1", "restart:5"]);
  });

  it("off never spends or restarts (minoRestart decides)", () => {
    expect(play(0, 3)).toEqual(["off:0", "off:0", "off:0"]);
    expect(loseHeart(0, 3)).toEqual({ hearts: 0, restart: false });
  });

  it("holds a stale hearts count to the setting", () => {
    // More hearts than lives (the setting was lowered): one fewer than the top.
    expect(catchHeart(2, 5)).toEqual({ hearts: 1, loss: "spent" });
    // None left (cannot happen in play): the restart.
    expect(catchHeart(3, 0)).toEqual({ hearts: 3, loss: "restart" });
  });
});

describe("heartsToast", () => {
  it("counts the hearts left, or says the level starts over", () => {
    expect(heartsToast(2, false)).toBe("Caught! 2 hearts left.");
    expect(heartsToast(1, false)).toBe("Caught! 1 heart left.");
    expect(heartsToast(3, true)).toBe("Out of hearts! Starting over.");
  });
});
