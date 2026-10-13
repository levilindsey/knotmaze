import { describe, expect, it } from "vitest";
import {
  DAILY_EPOCH,
  dayNumber,
  dayOfNumber,
  formatDayDate,
  localDay,
  todayNumber,
} from "../../src/game/daily_calendar";

const H = 3_600_000;

describe("daily numbering", () => {
  it("numbers the epoch #1 and counts calendar days from it", () => {
    expect(DAILY_EPOCH).toEqual({ y: 2026, m: 10, d: 12 });
    expect(dayNumber({ y: 2026, m: 10, d: 12 })).toBe(1);
    expect(dayNumber({ y: 2026, m: 10, d: 13 })).toBe(2);
    expect(dayNumber({ y: 2026, m: 10, d: 11 })).toBe(0);
    expect(dayNumber({ y: 2026, m: 11, d: 1 })).toBe(21);
    expect(dayNumber({ y: 2027, m: 1, d: 1 })).toBe(82);
    // Leap day 2028: Feb 28 -> 29 -> Mar 1 are consecutive.
    const feb28 = dayNumber({ y: 2028, m: 2, d: 28 });
    expect(dayNumber({ y: 2028, m: 2, d: 29 })).toBe(feb28 + 1);
    expect(dayNumber({ y: 2028, m: 3, d: 1 })).toBe(feb28 + 2);
    expect(dayNumber({ y: 2027, m: 10, d: 12 })).toBe(366);
  });

  it("inverts: dayOfNumber(dayNumber(d)) is d", () => {
    for (let n = -5; n <= 2000; n += 7) {
      expect(dayNumber(dayOfNumber(n))).toBe(n);
    }
    expect(dayOfNumber(1)).toEqual({ y: 2026, m: 10, d: 12 });
    expect(dayOfNumber(82)).toEqual({ y: 2027, m: 1, d: 1 });
  });

  it("never goes below #1 (a clock set before the epoch)", () => {
    expect(todayNumber(new Date(Date.UTC(2020, 0, 1, 12)), "UTC")).toBe(1);
    expect(todayNumber(new Date(Date.UTC(2026, 9, 12, 12)), "UTC")).toBe(1);
    expect(todayNumber(new Date(Date.UTC(2026, 9, 13, 12)), "UTC")).toBe(2);
  });
});

describe("local dates across time zones", () => {
  // One instant: 2026-10-12 10:30 UTC.
  const instant = new Date(Date.UTC(2026, 9, 12, 10, 30));

  it("gives each zone its own local date for the same instant", () => {
    expect(localDay(instant, "UTC")).toEqual({ y: 2026, m: 10, d: 12 });
    // UTC+14: already the 13th. UTC-11: still the 11th. Two days apart.
    expect(localDay(instant, "Pacific/Kiritimati")).toEqual({ y: 2026, m: 10, d: 13 });
    expect(localDay(instant, "Pacific/Pago_Pago")).toEqual({ y: 2026, m: 10, d: 11 });
    expect(todayNumber(instant, "Pacific/Kiritimati")).toBe(2);
    expect(todayNumber(instant, "Pacific/Pago_Pago")).toBe(1); // #0 clamps
    // Fractional offsets.
    expect(localDay(new Date(Date.UTC(2026, 9, 12, 18, 14)), "Asia/Kathmandu")).toEqual({
      y: 2026, m: 10, d: 12,
    }); // 23:59 +5:45
    expect(localDay(new Date(Date.UTC(2026, 9, 12, 18, 15)), "Asia/Kathmandu")).toEqual({
      y: 2026, m: 10, d: 13,
    }); // 00:00 +5:45
  });

  it("turns the number exactly at local midnight", () => {
    // Los Angeles is UTC-7 in October: midnight Oct 13 PDT = 07:00 UTC.
    const before = new Date(Date.UTC(2026, 9, 13, 6, 59, 59, 999));
    const at = new Date(Date.UTC(2026, 9, 13, 7));
    expect(todayNumber(before, "America/Los_Angeles")).toBe(1);
    expect(todayNumber(at, "America/Los_Angeles")).toBe(2);
  });

  // Hour by hour across a DST change, the number rises by exactly one at
  // each local midnight - never skipped or repeated, on 23- and 25-hour
  // days alike.
  const sweep = (zone: string, fromUtc: number, hours: number): void => {
    let prev = todayNumber(new Date(fromUtc), zone);
    let changes = 0;
    for (let h = 1; h <= hours; h++) {
      const t = new Date(fromUtc + h * H);
      const n = todayNumber(t, zone);
      expect(n - prev === 0 || n - prev === 1).toBe(true);
      if (n !== prev) {
        changes++;
        // The change lands on a local midnight hour.
        const hour = new Intl.DateTimeFormat("en-US", {
          timeZone: zone,
          hour: "numeric",
          hourCycle: "h23",
        }).format(t);
        expect([zone, Number(hour)]).toEqual([zone, 0]);
      }
      prev = n;
    }
    // One change per calendar day crossed.
    expect(changes).toBeGreaterThanOrEqual(Math.floor(hours / 24) - 1);
    expect(changes).toBeLessThanOrEqual(Math.ceil(hours / 24) + 1);
  };

  it("stays one-per-day through DST changes", () => {
    // US fall back 2026-11-01, spring forward 2027-03-14.
    sweep("America/Los_Angeles", Date.UTC(2026, 9, 29), 24 * 7);
    sweep("America/Los_Angeles", Date.UTC(2027, 2, 11), 24 * 7);
    // Lord Howe's 30-minute DST (2026-10-04, 2027-04-04).
    sweep("Australia/Lord_Howe", Date.UTC(2027, 3, 1), 24 * 6);
    // Europe 2026-10-25 and 2027-03-28.
    sweep("Europe/Berlin", Date.UTC(2026, 9, 22), 24 * 6);
    sweep("Europe/Berlin", Date.UTC(2027, 2, 25), 24 * 6);
  });

  it("reads the runtime's own zone the same way as an explicit one", () => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    for (let h = 0; h < 24 * 400; h += 7) {
      const t = new Date(Date.UTC(2026, 9, 1) + h * H);
      expect(localDay(t)).toEqual(localDay(t, zone));
    }
  });

  it("formats a daily's date", () => {
    expect(formatDayDate(1, "en-US")).toBe("Oct 12");
    expect(formatDayDate(82, "en-US")).toBe("Jan 1");
  });
});
