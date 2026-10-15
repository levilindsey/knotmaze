// DAILY RECORDS (K20, K47, K56, K146): the player's daily results, saved
// attempts and daily preferences, kept in localStorage as ONE versioned
// JSON document under DAILY_STORE_KEY:
//
//   { v: 3,
//     days: { "<daily number>": {
//       played?: <ms of the first move of an attempt that counts>,
//       official?: <result>,  // the FIRST completion that counts
//       replays: [<result>, ...],  // later completions, newest last
//       practice?: [<result>, ...],  // K146: practice finishes, newest last
//       attempt?: <attempt> } },   // K47: the unfinished attempt
//     prefs: { <param>: <value> } } // K56: daily playback preferences
//
// A result: { at (completion, epoch ms), day (the player's local daily
// number when that attempt began - see begunLate), timeMs, path, optimal,
// efficiency (optimal / path, kept for reading the record; recomputed
// when missing), backtrack, junctions, deadEnds (null with deadEnds off),
// moves (the g/d/b move log), viz (the pathViz it ended in), def (which
// daily rule built the maze: ui/daily_link.ts DAILY_DEF) }. Aggregates are
// derived, never stored.
//
// PRACTICE (K146): an attempt BEGUN after its daily's day (a past daily,
// opened from the stats view's History or by its link) is practice. Its
// finish goes to `practice`, never to `official`, and practice stays out
// of every aggregate (played, solved, best time, streaks) and out of any
// stats shared beyond this browser (K144); a day only ever practiced has
// no `played`. Once a day has its official result, every later finish is
// a replay, whenever it began. An attempt begun on its day and finished
// later still counts (K47: a reload resumes it).
//
// An attempt (K47) is the solve in progress on that day - the one that
// will be official, or a replay or practice run: see DailyAttempt. It is
// written after every move (and when the page hides), restored whenever
// the day's daily opens, and dropped when it finishes.
//
// prefs (K56) are the exempt params (ui/daily_link.ts DAILY_EXEMPT_KEYS -
// sound, camera, feel) the player set differently from the daily's own
// design while playing one; every daily opens with them. Stored as plain
// values; the ui layer checks them against the params when applying.
//
// SCHEMA: v1 (K20) had no attempts and no prefs, v2 (K47, K56) no
// practice. Both read as v3 as they are (the migration): a v2 late
// official result - a past daily's first finish, official before K146 -
// stays official. The next write stores v3; an older build then sees a
// newer schema and leaves the document alone (this session only), as
// every build does with a schema it does not know.
//
// Storage is optional. Every access is wrapped; the page works without it:
// - no storage (blocked, absent): everything lives for this session only;
// - corrupt or unknown-old data: the raw text is set aside under
//   DAILY_CORRUPT_KEY and the store starts fresh (a damaged entry - one
//   result, one attempt - is dropped alone, the rest survive);
// - data from a NEWER schema: never overwritten - this session only;
// - a write over quota: replays and practice finishes are pruned and the
//   write retried, then every other day's saved attempt is dropped and it
//   is retried again, then this session only.
// Each write re-reads the document first (another tab may have written).

export const DAILY_STORE_KEY = "knotmaze.daily";
export const DAILY_CORRUPT_KEY = "knotmaze.daily.corrupt";
export const DAILY_STORE_VERSION = 3;
// Replays kept per day (the newest); the official result is never pruned.
export const MAX_REPLAYS = 20;
// K146: practice finishes kept per day (the newest).
export const MAX_PRACTICE = 20;
// Replays and practice finishes kept per day when a write ran out of quota.
const PRUNED_REPLAYS = 3;
const MAX_MOVES = 400;
// An attempt's tap list beyond this is not a real solve (a damaged record).
export const MAX_ATTEMPT_TAPS = 20000;
const MAX_PREFS = 64;

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

// K47: an attempt in progress. The taps ARE the attempt (the solve state is
// a pure function of them and the maze - FabricMazeController.replay); the
// rest is what a restore must arrive at, and a summary for the stats view.
export interface DailyAttempt {
  // Its first move (epoch ms), and the player's local daily number then
  // (the finished result's `day`: practice and streaks go by when attempts
  // BEGAN).
  startedAt: number;
  day: number;
  // Active solve time so far, ms (time the page spent hidden left out).
  elapsedMs: number;
  // Every accepted tap's walk run, in order.
  taps: number[];
  // The path stack (walk runs), the g/d/b move log and the backtrack meter
  // when saved.
  path: number[];
  moves: string;
  backtrack: number;
  // The maze the taps belong to (game/daily_attempt.ts walkFingerprint): a
  // replay on any other walk graph is refused.
  maze: string;
  // Which daily rule built the maze (ui/daily_link.ts DAILY_DEF).
  def: number;
  // When this record was written (epoch ms).
  savedAt: number;
}

export type PrefValue = number | boolean | string;

export interface DailyDay {
  // The first move of an attempt that counts (begun on or before the day);
  // absent on a day only ever practiced (K146).
  played?: number;
  official?: DailyResult;
  replays: DailyResult[];
  // K146: finishes of attempts begun after the day while it had no
  // official result, newest last.
  practice?: DailyResult[];
  attempt?: DailyAttempt;
}

// What a finish recorded (DailyStore.recordSolve).
export type SolveRecord = "official" | "replay" | "practice";

export interface DailyData {
  v: 3;
  days: Record<string, DailyDay>;
  prefs: Record<string, PrefValue>;
}

// ok: localStorage in use. unavailable: no storage. newer: the stored
// document is from a newer schema (left alone). memory: a write failed
// over quota even after pruning. In all but ok, results last this session.
export type StoreStatus = "ok" | "unavailable" | "newer" | "memory";

const emptyData = (): DailyData => ({ v: 3, days: {}, prefs: {} });

// K146: an attempt on daily n begun on local daily `day` began LATE when
// that is after n's own day - practice, never scored. Early is on time (a
// friend's link from a time zone ahead).
export function begunLate(n: number, day: number): boolean {
  return day > n;
}

// A result whose attempt began on or before its daily's own day. Every
// official result recorded since K146 is; an older one may not be (a past
// daily's first finish was official then), and it counts toward solved and
// best time but not toward streaks.
export function onTime(n: number, r: DailyResult): boolean {
  return !begunLate(n, r.day);
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

const isRunList = (x: unknown, max: number): x is number[] =>
  Array.isArray(x) && x.length <= max && x.every((e) => isCount(e));

// A stored attempt, checked field by field (null when unusable). The tap
// list and the move log must agree (one letter per tap); the path is a
// subset of the taps' runs by construction, so it can be no longer.
export function validAttempt(x: unknown): DailyAttempt | null {
  if (typeof x !== "object" || x === null) return null;
  const a = x as Record<string, unknown>;
  if (!isNum(a.startedAt) || a.startedAt < 0 || !isCount(a.day)) return null;
  if (!isNum(a.elapsedMs) || a.elapsedMs < 0) return null;
  if (!isRunList(a.taps, MAX_ATTEMPT_TAPS) || a.taps.length === 0) return null;
  if (!isRunList(a.path, a.taps.length)) return null;
  if (typeof a.moves !== "string" || !/^[gdb]*$/.test(a.moves)) return null;
  if (a.moves.length !== a.taps.length) return null;
  if (!isNum(a.backtrack) || a.backtrack < 0) return null;
  if (typeof a.maze !== "string" || a.maze.length === 0 || a.maze.length > 200) {
    return null;
  }
  return {
    startedAt: a.startedAt,
    day: a.day,
    elapsedMs: a.elapsedMs,
    taps: [...a.taps],
    path: [...a.path],
    moves: a.moves,
    backtrack: a.backtrack,
    maze: a.maze,
    def: isCount(a.def) && a.def >= 1 ? a.def : 1,
    savedAt: isNum(a.savedAt) ? a.savedAt : a.startedAt,
  };
}

// Stored preferences: plain values under param-like names (anything else
// is dropped). What they mean is the ui layer's business.
export function validPrefs(x: unknown): Record<string, PrefValue> {
  const out: Record<string, PrefValue> = {};
  if (typeof x !== "object" || x === null || Array.isArray(x)) return out;
  let n = 0;
  for (const [k, v] of Object.entries(x)) {
    if (n >= MAX_PREFS || !/^[A-Za-z][A-Za-z0-9]{0,39}$/.test(k)) continue;
    const ok =
      typeof v === "boolean" ||
      isNum(v) ||
      (typeof v === "string" && v.length <= 40);
    if (!ok) continue;
    out[k] = v as PrefValue;
    n++;
  }
  return out;
}

type Parsed =
  | { kind: "ok"; data: DailyData; dropped: number }
  | { kind: "newer" }
  | { kind: "corrupt"; why: string };

// The stored text as data: entries that fail validation are dropped one
// by one (the rest survive); a v1 document reads with no attempts and no
// prefs, a v1 or v2 one with no practice (the migration); a document that
// is none of these is corrupt, and one from a later schema is "newer".
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
  if (o.v !== 1 && o.v !== 2 && o.v !== 3) {
    return { kind: "corrupt", why: `unknown schema ${String(o.v)}` };
  }
  const v1 = o.v === 1;
  const v3 = o.v === 3;
  if (typeof o.days !== "object" || o.days === null || Array.isArray(o.days)) {
    return { kind: "corrupt", why: "no days" };
  }
  const data = emptyData();
  let dropped = 0;
  const results = (list: unknown): DailyResult[] => {
    const out: DailyResult[] = [];
    if (!Array.isArray(list)) return out;
    for (const r of list) {
      const ok = validResult(r);
      if (ok) out.push(ok);
      else dropped++;
    }
    return out;
  };
  for (const [key, value] of Object.entries(o.days)) {
    if (!/^[1-9]\d{0,6}$/.test(key) || typeof value !== "object" || !value) {
      dropped++;
      continue;
    }
    const n = Number(key);
    const d = value as Record<string, unknown>;
    const official = d.official === undefined ? null : validResult(d.official);
    if (d.official !== undefined && !official) dropped++;
    const replays = results(d.replays);
    // Older schemas had no practice (and v1 no attempts): whatever such a
    // document says, there is none.
    const practice = v3 ? results(d.practice) : [];
    const attempt =
      v1 || d.attempt === undefined ? null : validAttempt(d.attempt);
    if (!v1 && d.attempt !== undefined && !attempt) dropped++;
    const countingAttempt =
      attempt && !begunLate(n, attempt.day) ? attempt : null;
    const played =
      isNum(d.played) && d.played >= 0
        ? d.played
        : (official?.at ?? countingAttempt?.startedAt);
    if (played === undefined && practice.length === 0 && !attempt) {
      dropped++;
      continue;
    }
    const day: DailyDay = { replays: replays.slice(-MAX_REPLAYS) };
    if (played !== undefined) day.played = played;
    if (official) day.official = official;
    if (practice.length > 0) day.practice = practice.slice(-MAX_PRACTICE);
    if (attempt) day.attempt = attempt;
    data.days[key] = day;
  }
  if (!v1) data.prefs = validPrefs(o.prefs);
  return { kind: "ok", data, dropped };
}

// The data with every day's replays and practice finishes cut to the
// newest `keep`, and - with `attemptsOf` - every saved attempt but that
// day's dropped.
function pruned(data: DailyData, keep: number, attemptsOf?: string): DailyData {
  const out: DailyData = { v: 3, days: {}, prefs: { ...data.prefs } };
  for (const [k, d] of Object.entries(data.days)) {
    const day: DailyDay = { ...d, replays: d.replays.slice(-keep) };
    if (d.practice) day.practice = d.practice.slice(-keep);
    if (attemptsOf !== undefined && k !== attemptsOf) delete day.attempt;
    out.days[k] = day;
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

  // The first move of an attempt on daily n, begun on local daily `day`
  // (keeps the earliest). A practice attempt (begunLate) marks nothing.
  markPlayed(n: number, at: number, day: number): void {
    if (begunLate(n, day)) return;
    const data = this.data();
    const key = String(n);
    const d = data.days[key];
    if (d) {
      if (d.played !== undefined && at >= d.played) return;
      d.played = at;
    } else {
      data.days[key] = { played: at, replays: [] };
    }
    this.write(data);
  }

  // A completed attempt on daily n. With the official result recorded it
  // is a replay; otherwise an attempt begun after the day (result.day,
  // begunLate) is practice (K146), any other the official result. The
  // saved attempt it was is done with.
  recordSolve(n: number, result: DailyResult): SolveRecord {
    const data = this.data();
    const key = String(n);
    const day: DailyDay = data.days[key] ?? { replays: [] };
    data.days[key] = day;
    delete day.attempt;
    const late = begunLate(n, result.day);
    if (!late) day.played = Math.min(day.played ?? result.at, result.at);
    let kind: SolveRecord;
    if (day.official !== undefined) {
      day.replays.push(result);
      if (day.replays.length > MAX_REPLAYS) {
        day.replays.splice(0, day.replays.length - MAX_REPLAYS);
      }
      kind = "replay";
    } else if (late) {
      const practice = day.practice ?? [];
      practice.push(result);
      if (practice.length > MAX_PRACTICE) {
        practice.splice(0, practice.length - MAX_PRACTICE);
      }
      day.practice = practice;
      kind = "practice";
    } else {
      day.official = result;
      kind = "official";
    }
    this.write(data);
    return kind;
  }

  // K47: daily n's attempt in progress, if one is saved.
  attempt(n: number): DailyAttempt | undefined {
    return this.day(n)?.attempt;
  }

  // Save daily n's attempt in progress (replacing any saved before). One
  // begun on time marks the day played; a practice one does not.
  saveAttempt(n: number, a: DailyAttempt): void {
    const data = this.data();
    const key = String(n);
    const day: DailyDay = data.days[key] ?? { replays: [] };
    data.days[key] = day;
    if (!begunLate(n, a.day)) {
      day.played = Math.min(day.played ?? a.startedAt, a.startedAt);
    }
    day.attempt = a;
    this.write(data, key);
  }

  // Drop daily n's saved attempt (a replay or practice run started over).
  // A day left with no record at all goes with it.
  clearAttempt(n: number): void {
    const data = this.data();
    const key = String(n);
    const day = data.days[key];
    if (!day?.attempt) return;
    delete day.attempt;
    if (
      day.played === undefined &&
      day.official === undefined &&
      day.replays.length === 0 &&
      !day.practice?.length
    ) {
      delete data.days[key];
    }
    this.write(data);
  }

  // K56: the daily playback preferences (a copy).
  prefs(): Record<string, PrefValue> {
    return { ...this.data().prefs };
  }

  setPrefs(p: Record<string, PrefValue>): void {
    const data = this.data();
    const next = validPrefs(p);
    if (JSON.stringify(next) === JSON.stringify(data.prefs)) return;
    data.prefs = next;
    this.write(data);
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

  // `keepAttempt`: the day whose saved attempt this write is about - the
  // last one a quota squeeze gives up.
  private write(data: DailyData, keepAttempt?: string): void {
    this.mem = data;
    if (this.status !== "ok" || !this.storage) return;
    // Over quota (or storage went away): prune replays and practice and
    // retry, then drop the other days' saved attempts and retry once more.
    const tries = [
      () => data,
      () => pruned(data, PRUNED_REPLAYS),
      () => pruned(data, PRUNED_REPLAYS, keepAttempt ?? ""),
    ];
    for (const next of tries) {
      const d = next();
      this.mem = d;
      try {
        this.storage.setItem(DAILY_STORE_KEY, JSON.stringify(d));
        return;
      } catch {
        // Try the next, slimmer document.
      }
    }
    this.status = "memory";
    console.warn("KnotMaze: daily records could not be saved (storage full).");
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

// Every aggregate counts official results and attempts begun on time;
// practice (K146) is in none of them.
export interface DailyAggregates {
  // Dailies with at least one move made in an attempt that counts.
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
    if (day.played !== undefined || day.official) played++;
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

// K146: the stats view's History, newest first: every past daily from #1
// to yesterday, unplayed days included (a tap plays one, as practice), and
// any day ahead of today with a record (a friend's link from a time zone
// ahead). Today has the view's own row.
export type HistoryStatus =
  | "official" // an official result
  | "practice" // practice finishes, no official result
  | "resume" // a saved attempt, nothing finished
  | "played" // moves made, nothing finished or saved
  | "unplayed";

export interface HistoryEntry {
  n: number;
  status: HistoryStatus;
  // The result the row shows: the official one, or the first practice
  // finish (null for the other statuses).
  result: DailyResult | null;
  // The official result began after its day (official before K146).
  late: boolean;
  // Finishes besides the one shown: replays, or further practice runs.
  more: number;
  // The saved attempt (a tap resumes it).
  attempt: DailyAttempt | null;
  // Playing the day now is practice: a past day with no official result
  // and no saved attempt begun on its day.
  practice: boolean;
}

export function dailyHistory(data: DailyData, today: number): HistoryEntry[] {
  const days = new Set<number>();
  for (let n = today - 1; n >= 1; n--) days.add(n);
  for (const key of Object.keys(data.days)) {
    const n = Number(key);
    if (n > today) days.add(n);
  }
  return [...days]
    .sort((a, b) => b - a)
    .map((n) => historyEntry(n, data.days[String(n)], today));
}

function historyEntry(
  n: number,
  d: DailyDay | undefined,
  today: number
): HistoryEntry {
  const attempt = d?.attempt ?? null;
  const counts = attempt !== null && !begunLate(n, attempt.day);
  const entry: HistoryEntry = {
    n,
    status: "unplayed",
    result: null,
    late: false,
    more: 0,
    attempt,
    practice: d?.official === undefined && !counts && n < today,
  };
  const practice = d?.practice ?? [];
  if (d?.official) {
    entry.status = "official";
    entry.result = d.official;
    entry.late = !onTime(n, d.official);
    entry.more = d.replays.length;
  } else if (practice.length > 0) {
    entry.status = "practice";
    entry.result = practice[0];
    entry.more = practice.length - 1;
  } else if (attempt) {
    entry.status = "resume";
  } else if (d) {
    entry.status = "played";
  }
  return entry;
}
