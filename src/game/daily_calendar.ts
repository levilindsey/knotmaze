// DAILY CALENDAR (K20): Knotmaze dailies are numbered by the player's LOCAL
// calendar date, like Wordle - the day turns at local midnight, so at any
// instant players in different time zones can be up to two numbers apart.
// Daily #1 is 2026-10-12 (the day the daily launched).
//
// The arithmetic runs on UTC calendar dates: read the local year-month-day
// first, then Date.UTC(y, m, d). Every UTC day is exactly 86 400 000 ms
// (no DST, and JS time has no leap seconds), so consecutive local dates
// are consecutive numbers whatever DST does to the local clock - a 23- or
// 25-hour local day is still one day.

export interface CalendarDay {
  y: number;
  m: number; // 1-12
  d: number; // 1-31
}

export const DAILY_EPOCH: Readonly<CalendarDay> = Object.freeze({
  y: 2026,
  m: 10,
  d: 12,
});

const DAY_MS = 86_400_000;
const EPOCH_UTC = Date.UTC(DAILY_EPOCH.y, DAILY_EPOCH.m - 1, DAILY_EPOCH.d);

// One formatter per time zone (constructing them is the slow part).
const formatters = new Map<string, Intl.DateTimeFormat>();

// The calendar date of an instant in a time zone: the runtime's local zone
// when `timeZone` is omitted (what the app uses), else an IANA zone name
// (what the tests use, so they do not depend on the machine's zone).
export function localDay(date: Date, timeZone?: string): CalendarDay {
  if (timeZone === undefined) {
    return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
  }
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
    formatters.set(timeZone, f);
  }
  const out: CalendarDay = { y: 0, m: 0, d: 0 };
  for (const part of f.formatToParts(date)) {
    if (part.type === "year") out.y = Number(part.value);
    else if (part.type === "month") out.m = Number(part.value);
    else if (part.type === "day") out.d = Number(part.value);
  }
  return out;
}

// The daily number of a calendar date: 1 on the epoch, counting up one per
// day (0 and below before it).
export function dayNumber(day: CalendarDay): number {
  return Math.round((Date.UTC(day.y, day.m - 1, day.d) - EPOCH_UTC) / DAY_MS) + 1;
}

// The calendar date of a daily number (the inverse of dayNumber).
export function dayOfNumber(n: number): CalendarDay {
  const t = new Date(EPOCH_UTC + (Math.round(n) - 1) * DAY_MS);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

// Today's daily number for this player (the local date; never below #1 -
// a clock set before the epoch plays the first daily).
export function todayNumber(now: Date = new Date(), timeZone?: string): number {
  return Math.max(1, dayNumber(localDay(now, timeZone)));
}

// One date formatter per locale (K373: constructing one per call was
// ~8 ms of the boot trace; the stats view formats a row per daily).
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

// "Oct 12" (the player's locale unless one is given) for a daily number.
export function formatDayDate(n: number, locale?: string): string {
  const day = dayOfNumber(n);
  try {
    const key = locale ?? "";
    let f = dateFormatters.get(key);
    if (!f) {
      f = new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
      dateFormatters.set(key, f);
    }
    return f.format(new Date(Date.UTC(day.y, day.m - 1, day.d)));
  } catch {
    return `${day.y}-${String(day.m).padStart(2, "0")}-${String(day.d).padStart(2, "0")}`;
  }
}

// "October 2026" (the player's locale unless one is given): the month a
// daily number falls in (K146: the stats History's month headers).
export function formatDayMonth(n: number, locale?: string): string {
  const day = dayOfNumber(n);
  try {
    return new Date(Date.UTC(day.y, day.m - 1, 1)).toLocaleDateString(locale, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return `${day.y}-${String(day.m).padStart(2, "0")}`;
  }
}
