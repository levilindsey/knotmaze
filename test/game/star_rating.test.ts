import { describe, it, expect } from "vitest";
import {
  THREE_STAR_RATIO,
  TWO_STAR_RATIO,
  fmtRatio,
  rateRun,
  ratingForResult,
  ratioShown,
  starExplanation,
  starGlyphs,
  starLabel,
  starRules,
  walkedOf,
} from "../../src/game/star_rating";
import { validResult } from "../../src/game/daily_store";
import { shareText } from "../../src/game/share_text";

describe("star rating (K155)", () => {
  it("pins the thresholds the simulation chose", () => {
    expect([THREE_STAR_RATIO, TWO_STAR_RATIO]).toEqual([1.5, 4]);
  });

  it("gives three stars up to 1.5x, two up to 4x, one beyond", () => {
    const at = (walked: number, optimal = 100): number | undefined =>
      rateRun(walked, optimal)?.stars;
    expect(at(100)).toBe(3); // a perfect solve
    expect(at(150)).toBe(3); // the edge itself
    expect(at(150.0001)).toBe(2);
    expect(at(400)).toBe(2);
    expect(at(400.0001)).toBe(1);
    expect(at(1e6)).toBe(1);
    // Float edges: an exact 1.5x / 4x walk of an awkward length.
    expect(at(1.5 * 19.6, 19.6)).toBe(3);
    expect(at(4 * 19.6, 19.6)).toBe(2);
    const r = rateRun(294, 196)!;
    expect(r).toEqual({ stars: 3, ratio: 1.5, walked: 294, optimal: 196, catches: null });
  });

  it("rates nothing without a finite optimal or a walk", () => {
    for (const optimal of [Infinity, NaN, 0, -1]) {
      expect(rateRun(10, optimal)).toBeNull();
    }
    for (const walked of [0, -5, NaN, Infinity]) {
      expect(rateRun(walked, 10)).toBeNull();
    }
  });

  it("keeps three stars for an uncaught real-time run", () => {
    expect(rateRun(120, 100, 0)?.stars).toBe(3);
    expect(rateRun(120, 100, 1)?.stars).toBe(2); // a catch caps it at two
    expect(rateRun(150, 100, 3)?.stars).toBe(2);
    expect(rateRun(380, 100, 2)?.stars).toBe(2);
    expect(rateRun(500, 100, 1)?.stars).toBe(1);
    expect(rateRun(120, 100, 2)?.catches).toBe(2);
  });

  it("counts every run walked: the path plus each backtrack twice", () => {
    expect(walkedOf(19.6, 0)).toBe(19.6);
    expect(walkedOf(19.6, 3)).toBe(25.6);
  });

  it("shows the ratio rounded up, agreeing with the star edges", () => {
    expect(ratioShown(1)).toBe(1);
    expect(ratioShown(1 + 1e-12)).toBe(1);
    expect(ratioShown(1.41)).toBe(1.5);
    expect(ratioShown(1.5)).toBe(1.5);
    expect(ratioShown(1.5 + 1e-6)).toBe(1.6);
    expect(ratioShown(4)).toBe(4);
    expect(ratioShown(4.01)).toBe(4.1);
    expect(ratioShown(0.9)).toBe(1); // never below a perfect solve
    expect(fmtRatio(2.04)).toBe("2.1×");
    expect(fmtRatio(17.94)).toBe("18.0×");
    // Wherever a ratio lands, its shown value sits on the same side of
    // each edge as the ratio itself.
    for (let i = 0; i < 4000; i++) {
      const ratio = 1 + i * 0.00137;
      const r = rateRun(ratio * 77.3, 77.3)!;
      const shown = ratioShown(r.ratio);
      expect(shown <= THREE_STAR_RATIO).toBe(r.stars === 3);
      expect(shown <= TWO_STAR_RATIO).toBe(r.stars >= 2);
    }
  });

  it("draws the stars earned, then the ones not", () => {
    expect([1, 2, 3].map(starGlyphs)).toEqual(["★☆☆", "★★☆", "★★★"]);
    expect(starGlyphs(0)).toBe("☆☆☆");
    expect(starGlyphs(9)).toBe("★★★");
    expect(starLabel(2)).toBe("2 of 3 stars");
    expect(starLabel(1)).toBe("1 of 3 stars");
  });

  it("explains what each star needs and where the run landed", () => {
    expect(starExplanation(rateRun(41.2, 19.6)!)).toEqual([
      "★★★ within 1.5× the shortest route",
      "★★ within 4×",
      "★ any finish",
      "You walked 2.2× the shortest route: 412 against 196, backtracks counted both ways.",
    ]);
    // Real time adds the catch rule, and the catches.
    expect(starExplanation(rateRun(25, 19.6, 0)!)).toEqual([
      "★★★ within 1.5× the shortest route, never caught",
      "★★ within 4×",
      "★ any finish",
      "You walked 1.3× the shortest route: 250 against 196, backtracks counted both ways.",
    ]);
    const caught = (n: number): string => starExplanation(rateRun(25, 19.6, n)!)[3];
    expect(caught(1)).toMatch(/ Caught once\.$/);
    expect(caught(2)).toMatch(/ Caught twice\.$/);
    expect(caught(5)).toMatch(/ Caught 5 times\.$/);
    expect(starRules(false)).toEqual(starExplanation(rateRun(30, 20)!).slice(0, 3));
  });
});

describe("daily records' stars (K155)", () => {
  const record = {
    at: 1_760_000_000_000,
    day: 3,
    timeMs: 83_000,
    path: 24.5,
    optimal: 19.6,
    efficiency: 0.8,
    backtrack: 6,
    junctions: 7,
    deadEnds: null,
    moves: "ggdbbg",
    viz: "gold",
    def: 1,
  };

  it("derives the stars from the stored meters", () => {
    const r = ratingForResult(record)!;
    expect(r.walked).toBeCloseTo(24.5 + 12, 9);
    expect(r.ratio).toBeCloseTo(36.5 / 19.6, 9);
    expect(r.stars).toBe(2);
    expect(r.catches).toBeNull();
    // What the store reads back rates the same.
    expect(ratingForResult(validResult(record))).toEqual(r);
    // A K20 record from before K47 and K56 (no def) still has its stars.
    const old: Record<string, unknown> = { ...record };
    delete old.def;
    expect(ratingForResult(validResult(old))?.stars).toBe(2);
  });

  it("returns null for a record it cannot read, never throws", () => {
    for (const bad of [
      null,
      undefined,
      7,
      "x",
      {},
      { ...record, path: undefined },
      { ...record, path: 0 },
      { ...record, optimal: "19.6" },
      { ...record, optimal: Infinity },
      { ...record, backtrack: -1 },
      { ...record, backtrack: null },
    ]) {
      expect(ratingForResult(bad)).toBeNull();
    }
  });
});

describe("share text stars (K155)", () => {
  it("puts the stars on the title line, as Wordle puts its score", () => {
    expect(
      shareText({ daily: 12, replay: false, timeMs: 83_000, efficiency: 0.92, moves: "ggdb", stars: 2 })
    ).toBe(
      "Knotmaze Daily #12 \u{1F9F6} ★★☆\n" +
        "⏱️ 1:23 · \u{1F3AF} 92%\n" +
        "\u{1F7E9}\u{1F7E9}\u{1F7E8}\u{1F7E5}"
    );
    expect(
      shareText({ daily: null, replay: false, timeMs: 61_000, efficiency: 1, moves: "g", stars: 3 })
    ).toBe("Knotmaze \u{1F9F6} ★★★\n⏱️ 1:01 · \u{1F3AF} 100%\n\u{1F7E9}");
    // No rating: no stars.
    expect(
      shareText({ daily: 12, replay: true, timeMs: 5000, efficiency: null, moves: "", stars: null })
    ).toBe("Knotmaze Daily #12 (replay) \u{1F9F6}\n⏱️ 0:05");
  });
});
