import { describe, expect, it } from "vitest";
import {
  SolveClock,
  efficiencyOf,
  efficiencyPercent,
  formatDuration,
  moveGrid,
} from "../../src/game/maze_stats";
import { minotaurTag, shareText } from "../../src/game/share_text";

describe("efficiency", () => {
  it("is optimal / path, defined only for a real route", () => {
    expect(efficiencyOf(45.6, 52)).toBeCloseTo(45.6 / 52, 12);
    expect(efficiencyOf(45.6, 45.6)).toBe(1);
    expect(efficiencyOf(45.6, 0)).toBeNull();
    expect(efficiencyOf(Infinity, 52)).toBeNull();
    expect(efficiencyOf(0, 52)).toBeNull();
    // Float noise can put the path a hair under optimal: still 1.
    expect(efficiencyOf(45.6, 45.6 - 1e-12)).toBe(1);
  });

  it("rounds DOWN to whole percent (100% only for an optimal route)", () => {
    expect(efficiencyPercent(1)).toBe(100);
    expect(efficiencyPercent(0.9999)).toBe(99);
    expect(efficiencyPercent(0.995)).toBe(99);
    expect(efficiencyPercent(0.5)).toBe(50);
    // The same runs summed in another order: noise, not a detour.
    const runs = [3.7, 1.41421356, 2.23606797, 5.1, 0.7];
    const optimal = runs.reduce((s, v) => s + v, 0);
    const path = [...runs].reverse().reduce((s, v) => s + v, 0);
    expect(efficiencyPercent(efficiencyOf(optimal, path)!)).toBe(100);
  });
});

describe("durations", () => {
  it("reads m:ss, then h:mm:ss, seconds rounded down", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(999)).toBe("0:00");
    expect(formatDuration(83_900)).toBe("1:23");
    expect(formatDuration(599_000)).toBe("9:59");
    expect(formatDuration(3_599_999)).toBe("59:59");
    expect(formatDuration(3_600_000)).toBe("1:00:00");
    expect(formatDuration(3_725_000)).toBe("1:02:05");
    expect(formatDuration(NaN)).toBe("—");
    expect(formatDuration(-1)).toBe("—");
  });
});

describe("solve clock", () => {
  it("runs from start to stop, idle before and frozen after", () => {
    const c = new SolveClock();
    expect(c.state).toBe("idle");
    expect(c.elapsed(500)).toBe(0);
    c.start(1000);
    expect(c.started).toBe(true);
    expect(c.elapsed(4000)).toBe(3000);
    c.stop(6000);
    expect(c.state).toBe("stopped");
    expect(c.elapsed(9999)).toBe(5000);
    c.stop(8000); // a second stop changes nothing
    expect(c.elapsed(9999)).toBe(5000);
    c.reset();
    expect(c.state).toBe("idle");
    expect(c.elapsed(9999)).toBe(0);
  });

  it("leaves out time the page spent hidden", () => {
    const c = new SolveClock();
    c.start(0);
    c.setHidden(true, 10_000);
    expect(c.elapsed(50_000)).toBe(10_000); // still hidden
    c.setHidden(true, 20_000); // repeated events change nothing
    c.setHidden(false, 70_000);
    expect(c.elapsed(75_000)).toBe(15_000);
    c.setHidden(true, 80_000);
    c.stop(90_000); // stopped while hidden: up to the hiding counts
    expect(c.elapsed(1e9)).toBe(20_000);
  });

  it("restores a saved time paused, then runs on from it (K47)", () => {
    const c = new SolveClock();
    c.restore(41_500);
    expect([c.state, c.started]).toEqual(["paused", true]);
    expect(c.elapsed(1e9)).toBe(41_500);
    c.setHidden(true, 500); // paused: visibility changes nothing
    c.setHidden(false, 900);
    c.resume(1000);
    expect(c.state).toBe("running");
    expect(c.elapsed(4000)).toBe(44_500);
    c.setHidden(true, 5000);
    c.setHidden(false, 65_000);
    expect(c.elapsed(66_000)).toBe(46_500);
    c.stop(70_000);
    expect(c.elapsed(1e9)).toBe(50_500);
    c.resume(80_000); // only a paused clock resumes
    expect(c.state).toBe("stopped");
    // Resumed while hidden: nothing counts until it shows.
    const h = new SolveClock();
    h.restore(10_000);
    h.resume(0, true);
    h.setHidden(false, 30_000);
    expect(h.elapsed(31_000)).toBe(11_000);
  });

  it("stops a paused clock at its saved time (a restored finish)", () => {
    const c = new SolveClock();
    c.restore(83_250);
    c.stop(999_999);
    expect([c.state, c.elapsed(1e12)]).toEqual(["stopped", 83_250]);
    c.reset();
    expect([c.state, c.elapsed(5)]).toEqual(["idle", 0]);
    c.restore(Number.NaN);
    expect(c.elapsed(5)).toBe(0);
  });

  it("can start hidden, and ignores visibility while idle", () => {
    const c = new SolveClock();
    c.setHidden(true, 0);
    c.start(100, true);
    c.setHidden(false, 1100);
    expect(c.elapsed(2100)).toBe(1000);
    c.reset();
    c.start(5000);
    expect(c.elapsed(6000)).toBe(1000); // no stale hidden time
  });
});

describe("share text", () => {
  it("draws one square per move, ten to a line", () => {
    expect(moveGrid("")).toBe("");
    expect(moveGrid("gdb")).toBe("\u{1F7E9}\u{1F7E8}\u{1F7E5}");
    const g = moveGrid("g".repeat(23));
    expect(g.split("\n").map((l) => [...l].length)).toEqual([10, 10, 3]);
    // Unknown letters are skipped.
    expect(moveGrid("gqg")).toBe("\u{1F7E9}\u{1F7E9}");
    // K80 turns stage 2: x, a move a minotaur caught you on, is the ox.
    expect(moveGrid("gdbx")).toBe("\u{1F7E9}\u{1F7E8}\u{1F7E5}\u{1F402}");
  });

  it("caps a long solve at six lines, counting what it left out", () => {
    const g = moveGrid("d".repeat(75));
    const lines = g.split("\n");
    expect(lines.length).toBe(6);
    expect(lines[5]).toBe("\u{1F7E8}".repeat(9) + " +16");
    expect(moveGrid("g".repeat(60)).split("\n").length).toBe(6);
    expect(moveGrid("g".repeat(60))).not.toContain("+");
  });

  it("writes a daily's result: title, time, efficiency, grid", () => {
    expect(
      shareText({ daily: 12, replay: false, timeMs: 83_000, efficiency: 0.92, moves: "ggdb" })
    ).toBe(
      "Knotmaze Daily #12 \u{1F9F6}\n" +
        "⏱️ 1:23 · \u{1F3AF} 92%\n" +
        "\u{1F7E9}\u{1F7E9}\u{1F7E8}\u{1F7E5}"
    );
    expect(
      shareText({ daily: 12, replay: true, timeMs: 5000, efficiency: null, moves: "" })
    ).toBe("Knotmaze Daily #12 (replay) \u{1F9F6}\n⏱️ 0:05");
    // K146: a past daily played after its day.
    expect(
      shareText({ daily: 2, replay: false, practice: true, timeMs: 5000, efficiency: null, moves: "" })
    ).toBe("Knotmaze Daily #2 (practice) \u{1F9F6}\n⏱️ 0:05");
    expect(
      shareText({ daily: null, replay: false, timeMs: 61_000, efficiency: 1, moves: "g" })
    ).toBe("Knotmaze \u{1F9F6}\n⏱️ 1:01 · \u{1F3AF} 100%\n\u{1F7E9}");
  });

  // K80 turns stage 2 (section 2.9): a minotaur's game wears its tag.
  it("tags a minotaur's game with its catches, or its close calls", () => {
    expect(minotaurTag(2)).toBe("\u{1F402} 2");
    expect(minotaurTag(2, 5)).toBe("\u{1F402} 2");
    expect(minotaurTag(0, 5)).toBe("\u{1F402} 0 · 5 close calls");
    expect(minotaurTag(0, 1)).toBe("\u{1F402} 0 · 1 close call");
    expect(minotaurTag(0, 0)).toBe("\u{1F402} 0");
    expect(minotaurTag(0, null)).toBe("\u{1F402} 0");
    const base = { daily: null, replay: false, timeMs: 61_000, efficiency: 1, moves: "gx" };
    expect(shareText({ ...base, stars: 2, catches: 1, closeCalls: 3 })).toBe(
      "Knotmaze \u{1F9F6} ★★☆ · \u{1F402} 1\n⏱️ 1:01 · \u{1F3AF} 100%\n\u{1F7E9}\u{1F402}"
    );
    expect(shareText({ ...base, catches: 0, closeCalls: 2 }).split("\n")[0]).toBe(
      "Knotmaze \u{1F9F6} · \u{1F402} 0 · 2 close calls"
    );
    // No minotaur ran: no tag.
    expect(shareText({ ...base, catches: null }).split("\n")[0]).toBe("Knotmaze \u{1F9F6}");
  });
});
