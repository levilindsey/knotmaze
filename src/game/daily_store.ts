// DAILY RECORDS (K20): the player's daily results, kept in localStorage as
// ONE versioned JSON document under DAILY_STORE_KEY:
//
//   { v: 1, days: { "<daily number>": {
//       played: <ms of the first move ever made on that daily>,
//       official?: <result>,  // the FIRST completion - the one that counts
//       replays: [<result>, ...] } } }   // later completions, newest last
//
// A result: { at (completion, epoch ms), day (the player's local daily
// number when that attempt began - see onTime), timeMs, path, optimal,
// efficiency (optimal / path, kept for reading the record; recomputed
// when missing), backtrack, junctions, deadEnds (null with deadEnds off),
// moves (the g/d/b move log), viz (the pathViz it ended in), def (the
// daily definition version) }. Aggregates are derived, never stored.
//
// Storage is optional. Every access is wrapped; the page works without it:
// - no storage (blocked, absent): results live for this session only;
// - corrupt or unknown-old data: the raw text is set aside under
//   DAILY_CORRUPT_KEY and the store starts fresh;
// - data from a NEWER schema: never overwritten - this session only;
// - a write over quota: replays are pruned and the write retried once,
//   then this session only.
// Each write re-reads the document first (another tab may have written).

export const DAILY_STORE_KEY = "knotmaze.daily";
export const DAILY_CORRUPT_KEY = "knotmaze.daily.corrupt";
export const DAILY_STORE_VERSION = 1;
// Replays kept per day (the newest); the official result is never pruned.
export const MAX_REPLAYS = 20;
// Replays kept per day when a write ran out of quota.
const PRUNED_REPLAYS = 3;
const MAX_MOVES = 400;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type PathVizName = "gold" | "trail" | "string";

export interface DailyResult {
  at: number;
  day: number;
  timeMs: number;
  path: number;
  optimal: number;
  efficiency: number;
  backtrack: number;
  junctions: number;
  deadEnds: number | null;
  moves: string;
  viz: PathVizName;
  def: number;
}

export interface DailyDay {
  played: number;
  official?: DailyResult;
  replays: DailyResult[];
}

export interface DailyData {
  v: 1;
  days: Record<string, DailyDay>;
}

// ok: localStorage in use. unavailable: no storage. newer: the stored
// document is from a newer schema (left alone). memory: a write failed
// over quota even after pruning. In all but ok, results last this session.
export type StoreStatus = "ok" | "unavailable" | "newer" | "memory";

const emptyData = (): DailyData => ({ v: 1, days: {} });

// An official result counts toward streaks when its attempt began on or
// before the daily's own day: a late catch-up (a past daily via its link)
// does not, an early one (a friend's link from a time zone ahead) does.
export function onTime(n: number, r: DailyResult): boolean {
  return r.day <= n;
}

const isNum = (x: unknown): x is number =>
  typeof x === "number" && Number.isFinite(x);
const isCount = (x: unknown): x is number =>
  isNum(x) && Number.isInteger(x) && x >= 0;

// A stored result, checked field by field (null when unusable).
export function validResult(x: unknown): DailyResult | null {
  if (typeof x !== "object" || x === null) return null;
  const r = x as Record<string, unknown>;
  if (!isNum(r.at) || !isCount(r.day) || !isNum(r.timeMs) || r.timeMs < 0) {
    return null;
  }
  if (!isNum(r.path) || r.path <= 0 || !isNum(r.optimal) || r.optimal <= 0) {
    return null;
  }
  if (!isNum(r.backtrack) || r.backtrack < 0 || !isCount(r.junctions)) {
    return null;
  }
  if (r.deadEnds !== null && !isCount(r.deadEnds)) return null;
  const moves =
    typeof r.moves === "string" && /^[gdb]*$/.test(r.moves)
      ? r.moves.slice(0, MAX_MOVES)
      : "";
  const viz: PathVizName =
    r.viz === "trail" || r.viz === "string" ? r.viz : "gold";
  const efficiency =
    isNum(r.efficiency) && r.efficiency > 0 && r.efficiency <= 1
      ? r.efficiency
      : Math.min(1, r.optimal / r.path);
  return {
    at: r.at,
    day: r.day,
    timeMs: r.timeMs,
    path: r.path,
    optimal: r.optimal,
    efficiency,
    backtrack: r.backtrack,
    junctions: r.junctions,
    deadEnds: r.deadEnds as number | null,
    moves,
    viz,
    def: isCount(r.def) && r.def >= 1 ? r.def : 1,
  };
}

type Parsed =
  | { kind: "ok"; data: DailyData; dropped: number }
  | { kind: "newer" }
  | { kind: "corrupt"; why: string };

// The stored text as data: entries that fail validation are dropped one
// by one (the rest survive); a document that is not a v1 store at all is
// corrupt, and one from a later schema is "newer".
export function parseDailyData(raw: string): Parsed {
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return { kind: "corrupt", why: "not JSON" };
  }
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
    return { kind: "corrupt", why: "not an object" };
  }
  const o = obj as Record<string, unknown>;
  if (isCount(o.v) && o.v > DAILY_STORE_VERSION) return { kind: "newer" };
  if (o.v !== DAILY_STORE_VERSION) {
    return { kind: "corrupt", why: `unknown schema ${String(o.v)}` };
  }
  if (typeof o.days !== "object" || o.days === null || Array.isArray(o.days)) {
    return { kind: "corrupt", why: "no days" };
  }
  const data = emptyData();
  let dropped = 0;
  for (const [key, value] of Object.entries(o.days)) {
    if (!/^[1-9]\d{0,6}$/.test(key) || typeof value !== "object" || !value) {
      dropped++;
      continue;
    }
    const d = value as Record<string, unknown>;
    const official = d.official === undefined ? null : validResult(d.official);
    if (d.official !== undefined && !official) dropped++;
    const replays: DailyResult[] = [];
    if (Array.isArray(d.replays)) {
      for (const r of d.replays) {
        const ok = validResult(r);
        if (ok) replays.push(ok);
        else dropped++;
      }
    }
    const played = isNum(d.played) && d.played >= 0 ? d.played : official?.at;
    if (played === undefined) {
      dropped++;
      continue;
    }
    const day: DailyDay = { played, replays: replays.slice(-MAX_REPLAYS) };
    if (official) day.official = official;
    data.days[key] = day;
  }
  return { kind: "ok", data, dropped };
}

// The data with every day's replays cut to the newest `keep`.
function pruned(data: DailyData, keep: number): DailyData {
  const out = emptyData();
  for (const [k, d] of Object.entries(data.days)) {
    out.days[k] = { ...d, replays: d.replays.slice(-keep) };
  }
  return out;
}

export class DailyStore {
  private readonly storage: StorageLike | null;
  private mem: DailyData = emptyData();
  status: StoreStatus;

  constructor(storage: StorageLike | null) {
    this.storage = storage;
    this.status = storage ? "ok" : "unavailable";
    this.mem = this.read();
  }

  // The current records (re-read from storage while it is in use).
  data(): DailyData {
    if (this.status === "ok") this.mem = this.read();
    return this.mem;
  }

  day(n: number): DailyDay | undefined {
    return this.data().days[String(n)];
  }

  hasOfficial(n: number): boolean {
    return this.day(n)?.official !== undefined;
  }

  // The first move of an attempt on daily n (keeps the earliest).
  markPlayed(n: number, at: number): void {
    const data = this.data();
    const key = String(n);
    const day = data.days[key];
    if (day) {
      if (at >= day.played) return;
      day.played = at;
    } else {
      data.days[key] = { played: at, replays: [] };
    }
    this.write(data);
  }

  // A completed attempt on daily n: the first ever is the official result,
  // every later one a replay.
  recordSolve(n: number, result: DailyResult): "official" | "replay" {
    const data = this.data();
    const key = String(n);
    const day = data.days[key] ?? { played: result.at, replays: [] };
    data.days[key] = day;
    day.played = Math.min(day.played, result.at);
    let kind: "official" | "replay";
    if (day.official === undefined) {
      day.official = result;
      kind = "official";
    } else {
      day.replays.push(result);
      if (day.replays.length > MAX_REPLAYS) {
        day.replays.splice(0, day.replays.length - MAX_REPLAYS);
      }
      kind = "replay";
    }
    this.write(data);
    return kind;
  }

  private read(): DailyData {
    if (!this.storage || this.status !== "ok") return this.mem;
    let raw: string | null;
    try {
      raw = this.storage.getItem(DAILY_STORE_KEY);
    } catch {
      this.status = "unavailable";
      return this.mem;
    }
    if (raw === null) return emptyData();
    const parsed = parseDailyData(raw);
    if (parsed.kind === "ok") return parsed.data;
    if (parsed.kind === "newer") {
      this.status = "newer";
      console.warn(
        "KnotMaze: daily records were saved by a newer version; " +
          "they are left untouched (reload to update)."
      );
      return emptyData();
    }
    // Corrupt: keep the text aside (best effort), start over.
    console.warn(`KnotMaze: daily records unreadable (${parsed.why}); starting fresh.`);
    try {
      this.storage.setItem(DAILY_CORRUPT_KEY, raw);
    } catch {
      // No room for the backup either: the fresh start still stands.
    }
    try {
      this.storage.removeItem(DAILY_STORE_KEY);
    } catch {
      // Removal failed: the next write replaces it anyway.
    }
    return emptyData();
  }

  private write(data: DailyData): void {
    this.mem = data;
    if (this.status !== "ok" || !this.storage) return;
    try {
      this.storage.setItem(DAILY_STORE_KEY, JSON.stringify(data));
      return;
    } catch {
      // Over quota (or storage went away): prune replays, retry once.
    }
    const slim = pruned(data, PRUNED_REPLAYS);
    this.mem = slim;
    try {
      this.storage.setItem(DAILY_STORE_KEY, JSON.stringify(slim));
      return;
    } catch {
      this.status = "memory";
      console.warn("KnotMaze: daily records could not be saved (storage full).");
    }
  }
}

// localStorage, if this page may use it (blocked storage throws on access
// in some browsers, or is missing entirely); null otherwise.
export function browserStorage(): StorageLike | null {
  try {
    const s = globalThis.localStorage;
    if (!s) return null;
    s.getItem(DAILY_STORE_KEY);
    return s;
  } catch {
    return null;
  }
}

export interface DailyAggregates {
  // Dailies with at least one move made.
  played: number;
  // Dailies with an official result.
  solved: number;
  // Consecutive dailies solved on time (onTime) up to today - or up to
  // yesterday while today is still unsolved (a streak stays alive until a
  // day is missed).
  currentStreak: number;
  maxStreak: number;
  // Fastest official solve, ms (null before any).
  bestTimeMs: number | null;
}

export function dailyAggregates(data: DailyData, today: number): DailyAggregates {
  const streakDays = new Set<number>();
  let played = 0;
  let solved = 0;
  let best: number | null = null;
  for (const [key, day] of Object.entries(data.days)) {
    const n = Number(key);
    played++;
    const r = day.official;
    if (!r) continue;
    solved++;
    if (best === null || r.timeMs < best) best = r.timeMs;
    if (onTime(n, r)) streakDays.add(n);
  }
  // The run of consecutive streak days through n (0 if n is not one).
  const runThrough = (n: number): number => {
    if (!streakDays.has(n)) return 0;
    let lo = n;
    while (streakDays.has(lo - 1)) lo--;
    let hi = n;
    while (streakDays.has(hi + 1)) hi++;
    return hi - lo + 1;
  };
  let maxStreak = 0;
  for (const n of streakDays) {
    if (!streakDays.has(n - 1)) maxStreak = Math.max(maxStreak, runThrough(n));
  }
  const currentStreak = streakDays.has(today)
    ? runThrough(today)
    : runThrough(today - 1);
  return { played, solved, currentStreak, maxStreak, bestTimeMs: best };
}
