import { describe, expect, it } from "vitest";
import { modeBadgeFor, modeBadgeText } from "../../src/ui/mode_badge";
import type { ModeBadgeState } from "../../src/ui/mode_badge";

// K73: the badge says when the solve on screen does not count toward the
// daily stats - and says nothing during the one attempt that does.
describe("mode badge state", () => {
  const records: ModeBadgeState["record"][] = [null, "official", "replay"];

  it("shows free play on any ordinary design", () => {
    for (const official of [false, true]) {
      for (const record of records) {
        expect(modeBadgeFor({ daily: null, official, record })).toBe("free");
      }
    }
  });

  it("shows nothing during the official attempt", () => {
    // Unfinished, no official result yet: this run will be the score.
    expect(modeBadgeFor({ daily: 3, official: false, record: null })).toBeNull();
  });

  it("shows nothing once this attempt set the official result", () => {
    // The finish just recorded IS the official result (the store now has
    // it too).
    expect(modeBadgeFor({ daily: 3, official: true, record: "official" })).toBeNull();
  });

  it("shows replay for every later run of that daily", () => {
    // Started after the official finish (this session, a reload, a reset,
    // another tab): not scored.
    expect(modeBadgeFor({ daily: 3, official: true, record: null })).toBe("replay");
    // A replay that finished.
    expect(modeBadgeFor({ daily: 3, official: true, record: "replay" })).toBe("replay");
    // (A replay record always means an official result exists.)
    expect(modeBadgeFor({ daily: 3, official: false, record: "replay" })).toBe("replay");
  });

  it("follows a reset after the official finish (main.ts clears the record)", () => {
    // The official finish, then Reset path: a fresh attempt on a day with
    // an official result is a replay.
    const solved: ModeBadgeState = { daily: 7, official: true, record: "official" };
    expect(modeBadgeFor(solved)).toBeNull();
    expect(modeBadgeFor({ ...solved, record: null })).toBe("replay");
  });
});

describe("mode badge text", () => {
  it("names today's daily on free play (a tap goes there)", () => {
    const t = modeBadgeText("free", null, 12);
    expect(t.long).toBe("Free play");
    expect(t.tip).toMatch(/isn't today's daily/);
    expect(t.tip).toMatch(/won't count toward your daily stats/);
    expect(t.tip).toMatch(/#12\.$/);
  });

  it("explains a replay: the first finish is the official result", () => {
    const t = modeBadgeText("replay", 9, 12);
    expect(t.long).toBe("Replay · not scored");
    expect(t.short).toBe("Replay");
    expect(t.tip).toMatch(/first finish of Daily #9 is its official result/);
    expect(t.tip).toMatch(/won't change it/);
  });

  it("keeps the short label no longer than the long one", () => {
    for (const kind of ["free", "replay"] as const) {
      const t = modeBadgeText(kind, 4, 4);
      expect(t.short.length).toBeLessThanOrEqual(t.long.length);
    }
  });
});
