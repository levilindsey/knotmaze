import { describe, expect, it } from "vitest";
import { modeBadgeFor, modeBadgeText } from "../../src/ui/mode_badge";
import type { ModeBadgeKind, ModeBadgeState } from "../../src/ui/mode_badge";
import { formatDayDate } from "../../src/game/daily_calendar";

// K73 + K151: the badge names the solve on screen - free play, the daily
// attempt that counts, a replay, or (K146) practice on a past daily.
describe("mode badge state", () => {
  const records: ModeBadgeState["record"][] = [
    null,
    "official",
    "replay",
    "practice",
  ];

  it("shows free play on any ordinary design", () => {
    for (const official of [false, true]) {
      for (const record of records) {
        for (const late of [false, true]) {
          expect(modeBadgeFor({ daily: null, official, record, late })).toBe(
            "free"
          );
        }
      }
    }
  });

  it("names the daily during the attempt that counts", () => {
    // Unfinished, no official result yet, begun on (or before) its day:
    // this run will be the score.
    expect(
      modeBadgeFor({ daily: 3, official: false, record: null, late: false })
    ).toBe("daily");
  });

  it("keeps the daily badge once this attempt set the official result", () => {
    // The finish just recorded IS the official result (the store now has
    // it too) - even when it finished after its day (begun on time).
    for (const late of [false, true]) {
      expect(
        modeBadgeFor({ daily: 3, official: true, record: "official", late })
      ).toBe("daily");
    }
  });

  it("shows replay for every later run of that daily", () => {
    // Started after the official finish (this session, a reload, a reset,
    // another tab): not scored.
    expect(
      modeBadgeFor({ daily: 3, official: true, record: null, late: false })
    ).toBe("replay");
    // A replay that finished.
    expect(
      modeBadgeFor({ daily: 3, official: true, record: "replay", late: false })
    ).toBe("replay");
    // (A replay record always means an official result exists.)
    expect(
      modeBadgeFor({ daily: 3, official: false, record: "replay", late: false })
    ).toBe("replay");
  });

  it("calls a run on a solved past day a replay, not practice", () => {
    // The store records a finish on a day with an official result as a
    // replay, late or not (DailyStore.recordSolve) - the badge agrees.
    expect(
      modeBadgeFor({ daily: 1, official: true, record: null, late: true })
    ).toBe("replay");
  });

  it("shows practice for an attempt begun after its day (K146)", () => {
    expect(
      modeBadgeFor({ daily: 1, official: false, record: null, late: true })
    ).toBe("practice");
    // ... and after it finished.
    expect(
      modeBadgeFor({ daily: 1, official: false, record: "practice", late: true })
    ).toBe("practice");
  });

  it("follows a reset after the official finish (main.ts clears the record)", () => {
    // The official finish, then Reset path: a fresh attempt on a day with
    // an official result is a replay.
    const solved: ModeBadgeState = {
      daily: 7,
      official: true,
      record: "official",
      late: false,
    };
    expect(modeBadgeFor(solved)).toBe("daily");
    expect(modeBadgeFor({ ...solved, record: null })).toBe("replay");
  });
});

describe("mode badge text", () => {
  it("names today's daily on free play (a tap goes there)", () => {
    const t = modeBadgeText("free", null, 12);
    expect(t.long).toBe("Free play");
    expect(t.tip).toMatch(/isn't today's daily/);
    expect(t.tip).toMatch(/won't count toward your daily stats/);
    expect(t.tip).toMatch(/Tap to leave it for today's daily, #12\.$/);
  });

  it("names the daily, with its date when it is not today's", () => {
    const today = modeBadgeText("daily", 12, 12);
    expect(today.long).toBe("Daily #12");
    expect(today.short).toBe("Daily #12");
    expect(today.tip).toMatch(/first finish is its official result/);
    expect(today.tip).toMatch(/Tap for your daily stats\.$/);
    // Yesterday's, resumed today (begun on its day: it still counts).
    const past = modeBadgeText("daily", 11, 12);
    expect(past.long).toBe(`Daily #11 · ${formatDayDate(11)}`);
    expect(past.short).toBe("Daily #11");
    expect(past.tip).toContain(`the maze for ${formatDayDate(11)}`);
  });

  it("says solved once this attempt set the official result", () => {
    const t = modeBadgeText("daily", 12, 12, true);
    expect(t.long).toBe("Daily #12 · solved");
    expect(t.short).toBe("Daily #12");
    expect(t.tip).toMatch(/this run is its official result/);
    expect(modeBadgeText("daily", 11, 12, true).long).toBe(
      `Daily #11 · ${formatDayDate(11)} · solved`
    );
  });

  it("explains a replay: the first finish is the official result", () => {
    const t = modeBadgeText("replay", 9, 12);
    expect(t.long).toBe("Daily #9 replay · not scored");
    expect(t.short).toBe("Daily #9 replay");
    expect(t.tip).toMatch(/first finish of Daily #9 is its official result/);
    expect(t.tip).toMatch(/won't change it/);
  });

  it("explains practice: begun after its day, never scored", () => {
    const t = modeBadgeText("practice", 1, 3);
    expect(t.long).toBe("Daily #1 practice · not scored");
    expect(t.short).toBe("Daily #1 practice");
    expect(t.tip).toMatch(/^Practice, not scored/);
    expect(t.tip).toContain(`the maze for ${formatDayDate(1)}`);
    expect(t.tip).toMatch(/stays out of your daily stats/);
  });

  it("keeps the short label no longer than the long one", () => {
    const kinds: ModeBadgeKind[] = ["free", "daily", "replay", "practice"];
    for (const kind of kinds) {
      for (const [daily, today, solved] of [
        [4, 4, false],
        [4, 4, true],
        [2, 4, false],
        [2, 4, true],
      ] as const) {
        const t = modeBadgeText(kind, kind === "free" ? null : daily, today, solved);
        expect(t.short.length).toBeLessThanOrEqual(t.long.length);
        expect(t.tip.length).toBeGreaterThan(0);
      }
    }
  });
});
