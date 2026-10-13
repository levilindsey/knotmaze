import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DAILY_CORRUPT_KEY,
  DAILY_STORE_KEY,
  DailyStore,
  MAX_REPLAYS,
  browserStorage,
  dailyAggregates,
  parseDailyData,
  validAttempt,
  validPrefs,
  validResult,
} from "../../src/game/daily_store";
import type {
  DailyAttempt,
  DailyData,
  DailyResult,
  StorageLike,
} from "../../src/game/daily_store";

// An in-memory Storage with switchable failure modes.
class FakeStorage implements StorageLike {
  map = new Map<string, string>();
  failGet = false;
  // setItem throws (QuotaExceededError) while the value is longer than this.
  quota = Infinity;
  sets = 0;
  getItem(k: string): string | null {
    if (this.failGet) throw new DOMException("denied", "SecurityError");
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.sets++;
    if (v.length > this.quota) {
      throw new DOMException("full", "QuotaExceededError");
    }
    this.map.set(k, v);
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
}

const result = (over: Partial<DailyResult> = {}): DailyResult => ({
  at: 1_790_000_000_000,
  day: 5,
  timeMs: 83_000,
  path: 52,
  optimal: 45.6,
  efficiency: 45.6 / 52,
  backtrack: 7.8,
  junctions: 9,
  deadEnds: null,
  moves: "gggdbg",
  viz: "gold",
  def: 1,
  ...over,
});

const attempt = (over: Partial<DailyAttempt> = {}): DailyAttempt => ({
  startedAt: 1_790_000_000_000,
  day: 5,
  elapsedMs: 41_500,
  taps: [0, 4, 9, 9, 7],
  path: [0, 4, 7],
  moves: "ggdbg",
  backtrack: 3.2,
  maze: "w1.200.302.0a1b2c3d",
  def: 1,
  savedAt: 1_790_000_041_500,
  ...over,
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const quiet = (): void => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
};

describe("recording", () => {
  it("makes the first finish official and later ones replays", () => {
    const s = new FakeStorage();
    const store = new DailyStore(s);
    expect(store.status).toBe("ok");
    store.markPlayed(5, 1000);
    expect(store.hasOfficial(5)).toBe(false);
    expect(store.recordSolve(5, result({ timeMs: 90_000 }))).toBe("official");
    expect(store.recordSolve(5, result({ timeMs: 40_000 }))).toBe("replay");
    expect(store.recordSolve(5, result({ timeMs: 30_000 }))).toBe("replay");
    const day = store.day(5)!;
    expect(day.played).toBe(1000);
    expect(day.official!.timeMs).toBe(90_000);
    expect(day.replays.map((r) => r.timeMs)).toEqual([40_000, 30_000]);
    // It is all in storage: a new store (a reload) reads the same.
    const again = new DailyStore(s);
    expect(again.data()).toEqual(store.data());
    expect(JSON.parse(s.map.get(DAILY_STORE_KEY)!).v).toBe(2);
  });

  it("keeps the earliest played time", () => {
    const store = new DailyStore(new FakeStorage());
    store.markPlayed(3, 5000);
    store.markPlayed(3, 9000);
    store.markPlayed(3, 4000);
    expect(store.day(3)!.played).toBe(4000);
  });

  it("caps replays at the newest MAX_REPLAYS", () => {
    const store = new DailyStore(new FakeStorage());
    for (let i = 0; i <= MAX_REPLAYS + 5; i++) {
      store.recordSolve(2, result({ timeMs: i }));
    }
    const day = store.day(2)!;
    expect(day.official!.timeMs).toBe(0);
    expect(day.replays.length).toBe(MAX_REPLAYS);
    expect(day.replays[day.replays.length - 1].timeMs).toBe(MAX_REPLAYS + 5);
  });

  it("sees another tab's writes (re-reads before every write)", () => {
    const s = new FakeStorage();
    const a = new DailyStore(s);
    const b = new DailyStore(s);
    a.recordSolve(1, result());
    b.recordSolve(2, result());
    expect(Object.keys(a.data().days).sort()).toEqual(["1", "2"]);
    expect(b.recordSolve(1, result())).toBe("replay");
  });
});

describe("damaged, foreign and missing storage", () => {
  it("sets corrupt text aside and starts fresh", () => {
    quiet();
    for (const raw of ["{not json", "[]", "42", '{"v":1}', '{"v":0,"days":{}}', '{"days":{}}']) {
      const s = new FakeStorage();
      s.map.set(DAILY_STORE_KEY, raw);
      const store = new DailyStore(s);
      expect([raw, store.status]).toEqual([raw, "ok"]);
      expect(store.data().days).toEqual({});
      expect(s.map.get(DAILY_CORRUPT_KEY)).toBe(raw);
      store.recordSolve(1, result());
      expect(new DailyStore(s).hasOfficial(1)).toBe(true);
    }
  });

  it("drops bad entries one by one and keeps the rest", () => {
    const good = result();
    const parsed = parseDailyData(
      JSON.stringify({
        v: 1,
        days: {
          "4": { played: 10, official: good, replays: [good, { at: "x" }] },
          "0": { played: 10, replays: [] }, // not a daily number
          "-3": { played: 10, replays: [] },
          abc: { played: 10, replays: [] },
          "6": { played: 10, official: { ...good, timeMs: -1 }, replays: [] },
          "7": "nope",
          "8": { official: good }, // played inferred from the result
          "9": { replays: [] }, // nothing at all
        },
      })
    );
    expect(parsed.kind).toBe("ok");
    if (parsed.kind !== "ok") return;
    expect(Object.keys(parsed.data.days).sort()).toEqual(["4", "6", "8"]);
    expect(parsed.data.days["4"].replays).toEqual([good]);
    expect(parsed.data.days["6"].official).toBeUndefined();
    expect(parsed.data.days["8"].played).toBe(good.at);
    // The bad replay, keys 0, -3, abc, day 6's official, 7 and 9.
    expect(parsed.dropped).toBe(7);
  });

  it("validates results field by field", () => {
    expect(validResult(result())).toEqual(result());
    expect(validResult(null)).toBeNull();
    expect(validResult({ ...result(), path: 0 })).toBeNull();
    expect(validResult({ ...result(), optimal: Infinity })).toBeNull();
    expect(validResult({ ...result(), junctions: 1.5 })).toBeNull();
    expect(validResult({ ...result(), deadEnds: -1 })).toBeNull();
    expect(validResult({ ...result(), deadEnds: 2 })!.deadEnds).toBe(2);
    // Soft fields fall back instead of failing.
    const { efficiency: _drop, ...noEff } = result();
    void _drop;
    expect(validResult(noEff)!.efficiency).toBeCloseTo(45.6 / 52, 12);
    expect(validResult({ ...result(), efficiency: 7 })!.efficiency).toBeCloseTo(45.6 / 52, 12);
    expect(validResult({ ...result(), moves: "gx" })!.moves).toBe("");
    expect(validResult({ ...result(), viz: "neon" })!.viz).toBe("gold");
    expect(validResult({ ...result(), def: 0 })!.def).toBe(1);
  });

  it("never overwrites records from a newer schema", () => {
    quiet();
    const s = new FakeStorage();
    const newer = JSON.stringify({ v: 3, everything: "else" });
    s.map.set(DAILY_STORE_KEY, newer);
    const store = new DailyStore(s);
    expect(store.status).toBe("newer");
    expect(store.recordSolve(3, result())).toBe("official");
    expect(store.hasOfficial(3)).toBe(true); // this session
    expect(s.map.get(DAILY_STORE_KEY)).toBe(newer); // untouched
    expect(s.sets).toBe(0);
  });

  it("prunes replays when over quota, then keeps going in memory", () => {
    quiet();
    const s = new FakeStorage();
    const store = new DailyStore(s);
    for (let i = 0; i < 12; i++) store.recordSolve(1, result({ timeMs: i }));
    const full = s.map.get(DAILY_STORE_KEY)!.length;
    // Room for less than everything: the next write prunes to 3 replays.
    s.quota = full - 10;
    store.recordSolve(1, result({ timeMs: 99 }));
    expect(store.status).toBe("ok");
    const saved = JSON.parse(s.map.get(DAILY_STORE_KEY)!);
    expect(saved.days["1"].official.timeMs).toBe(0);
    expect(saved.days["1"].replays.map((r: DailyResult) => r.timeMs)).toEqual([10, 11, 99]);
    // No room at all: memory only, results still count this session.
    s.quota = 10;
    expect(store.recordSolve(2, result())).toBe("official");
    expect(store.status).toBe("memory");
    expect(store.hasOfficial(2)).toBe(true);
    expect(store.recordSolve(2, result())).toBe("replay");
  });

  it("works without storage at all", () => {
    const store = new DailyStore(null);
    expect(store.status).toBe("unavailable");
    store.markPlayed(1, 5);
    expect(store.recordSolve(1, result())).toBe("official");
    expect(store.recordSolve(1, result())).toBe("replay");
    expect(dailyAggregates(store.data(), 1).solved).toBe(1);
  });

  it("falls back to memory when storage starts throwing", () => {
    const s = new FakeStorage();
    const store = new DailyStore(s);
    store.recordSolve(1, result());
    s.failGet = true;
    expect(store.hasOfficial(1)).toBe(true); // the session copy
    expect(store.status).toBe("unavailable");
    expect(store.recordSolve(2, result())).toBe("official");
  });

  it("finds no storage where access throws or is missing", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(browserStorage()).toBeNull();
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new DOMException("denied", "SecurityError");
      },
    });
    expect(browserStorage()).toBeNull();
    const s = new FakeStorage();
    vi.stubGlobal("localStorage", s);
    expect(browserStorage()).toBe(s);
  });
});

describe("saved attempts and prefs (K47, K56: schema v2)", () => {
  it("migrates a v1 document: every result kept, no attempts, no prefs", () => {
    quiet();
    const s = new FakeStorage();
    const v1 = {
      v: 1,
      days: {
        "1": { played: 10, official: result({ day: 1 }), replays: [result()] },
        "2": { played: 20, replays: [] },
        // v1 never had attempts: a stray one is not read as one.
        "3": { played: 30, replays: [], attempt: attempt() },
      },
      prefs: { volume: 0 },
    };
    s.map.set(DAILY_STORE_KEY, JSON.stringify(v1));
    const store = new DailyStore(s);
    expect(store.status).toBe("ok");
    const d = store.data();
    expect(d.v).toBe(2);
    expect(Object.keys(d.days).sort()).toEqual(["1", "2", "3"]);
    expect(d.days["1"].official).toEqual(result({ day: 1 }));
    expect(d.days["1"].replays).toEqual([result()]);
    expect(d.days["3"].attempt).toBeUndefined();
    expect(d.prefs).toEqual({});
    // Nothing is written until something changes; then it is v2.
    expect(s.sets).toBe(0);
    store.saveAttempt(2, attempt());
    const raw = JSON.parse(s.map.get(DAILY_STORE_KEY)!);
    expect(raw.v).toBe(2);
    expect(raw.days["1"].official.timeMs).toBe(result().timeMs);
    expect(new DailyStore(s).attempt(2)).toEqual(attempt());
  });

  it("saves, replaces, restores and clears an attempt", () => {
    const s = new FakeStorage();
    const store = new DailyStore(s);
    expect(store.attempt(4)).toBeUndefined();
    store.saveAttempt(4, attempt());
    // The first save marks the day played (an attempt is a move made).
    expect(store.day(4)!.played).toBe(attempt().startedAt);
    store.saveAttempt(4, attempt({ taps: [0, 4], path: [0, 4], moves: "gg", elapsedMs: 9_000 }));
    // A reload reads the latest.
    const again = new DailyStore(s);
    expect(again.attempt(4)).toEqual(
      attempt({ taps: [0, 4], path: [0, 4], moves: "gg", elapsedMs: 9_000 })
    );
    expect(dailyAggregates(again.data(), 4).played).toBe(1);
    again.clearAttempt(4);
    expect(new DailyStore(s).attempt(4)).toBeUndefined();
    expect(new DailyStore(s).day(4)!.played).toBe(attempt().startedAt);
  });

  it("drops the attempt when it finishes, official or replay", () => {
    const store = new DailyStore(new FakeStorage());
    store.saveAttempt(6, attempt());
    expect(store.recordSolve(6, result())).toBe("official");
    expect(store.attempt(6)).toBeUndefined();
    store.saveAttempt(6, attempt({ startedAt: 1_800_000_000_000 }));
    expect(store.recordSolve(6, result())).toBe("replay");
    expect(store.attempt(6)).toBeUndefined();
    // played stays the earliest move.
    expect(store.day(6)!.played).toBe(attempt().startedAt);
  });

  it("drops a damaged attempt alone; the day's results survive", () => {
    const bad = [
      { ...attempt(), taps: [] },
      { ...attempt(), taps: [1, -2] },
      { ...attempt(), taps: [1.5] },
      { ...attempt(), moves: "gg" }, // one letter per tap
      { ...attempt(), moves: "ggdbx" },
      { ...attempt(), path: [0, 1, 2, 3, 4, 5] }, // longer than the taps
      { ...attempt(), elapsedMs: -1 },
      { ...attempt(), maze: "" },
      { ...attempt(), startedAt: "x" },
      "nope",
    ];
    for (const a of bad) {
      expect([a, validAttempt(a)]).toEqual([a, null]);
      const parsed = parseDailyData(
        JSON.stringify({ v: 2, days: { "3": { played: 1, official: result(), replays: [], attempt: a } }, prefs: {} })
      );
      expect(parsed.kind).toBe("ok");
      if (parsed.kind !== "ok") continue;
      expect(parsed.dropped).toBe(1);
      expect(parsed.data.days["3"].official).toEqual(result());
      expect(parsed.data.days["3"].attempt).toBeUndefined();
    }
    // Soft fields fall back.
    const { savedAt: _s, def: _d, ...lean } = attempt();
    void _s;
    void _d;
    expect(validAttempt(lean)).toEqual({ ...attempt(), savedAt: attempt().startedAt, def: 1 });
    // A day with only an attempt is played from its start.
    const p = parseDailyData(JSON.stringify({ v: 2, days: { "8": { attempt: attempt() } } }));
    expect(p.kind === "ok" && p.data.days["8"].played).toBe(attempt().startedAt);
  });

  it("keeps prefs: plain values under param names only", () => {
    expect(
      validPrefs({ volume: 0.2, soundMode: "none", physics: false, x: Infinity, "a-b": 1, big: "y".repeat(41), o: {} })
    ).toEqual({ volume: 0.2, soundMode: "none", physics: false });
    expect(validPrefs([1])).toEqual({});
    const s = new FakeStorage();
    const store = new DailyStore(s);
    expect(store.prefs()).toEqual({});
    store.setPrefs({ volume: 0.2, cameraMode: "follow" });
    expect(new DailyStore(s).prefs()).toEqual({ volume: 0.2, cameraMode: "follow" });
    // An unchanged set is not rewritten.
    const sets = s.sets;
    store.setPrefs({ volume: 0.2, cameraMode: "follow" });
    expect(s.sets).toBe(sets);
    // prefs() is a copy.
    store.prefs().volume = 1;
    expect(store.prefs().volume).toBe(0.2);
  });

  it("over quota: replays go first, then other days' attempts", () => {
    quiet();
    const s = new FakeStorage();
    const store = new DailyStore(s);
    for (let i = 0; i < 10; i++) store.recordSolve(1, result({ timeMs: i }));
    // A long attempt (~6000 characters) on day 2.
    store.saveAttempt(2, attempt({ taps: new Array(2000).fill(1), path: [], moves: "g".repeat(2000) }));
    store.saveAttempt(3, attempt());
    const full = s.map.get(DAILY_STORE_KEY)!.length;
    // Pruning six replays (~1500) is not room enough; day 2's attempt is.
    s.quota = full - 3000;
    store.saveAttempt(3, attempt({ elapsedMs: 50_000 }));
    expect(store.status).toBe("ok");
    const saved = JSON.parse(s.map.get(DAILY_STORE_KEY)!);
    expect(saved.days["1"].replays.length).toBe(3);
    expect(saved.days["2"].attempt).toBeUndefined();
    expect(saved.days["3"].attempt.elapsedMs).toBe(50_000);
  });

  it("works without storage, and leaves a newer schema alone", () => {
    quiet();
    const mem = new DailyStore(null);
    mem.saveAttempt(1, attempt());
    mem.setPrefs({ volume: 0 });
    expect(mem.attempt(1)).toEqual(attempt());
    expect(mem.prefs()).toEqual({ volume: 0 });
    const s = new FakeStorage();
    const newer = JSON.stringify({ v: 3, days: {} });
    s.map.set(DAILY_STORE_KEY, newer);
    const store = new DailyStore(s);
    store.saveAttempt(1, attempt());
    expect(store.status).toBe("newer");
    expect(store.attempt(1)).toEqual(attempt()); // this session
    expect(s.map.get(DAILY_STORE_KEY)).toBe(newer);
  });
});

describe("aggregates", () => {
  const data = (days: Record<number, Partial<{ official: DailyResult; replays: DailyResult[] }>>): DailyData => {
    const out: DailyData = { v: 2, days: {}, prefs: {} };
    for (const [n, d] of Object.entries(days)) {
      out.days[n] = { played: 1, replays: d.replays ?? [], ...(d.official ? { official: d.official } : {}) };
    }
    return out;
  };
  const solvedOn = (day: number, timeMs = 60_000): { official: DailyResult } => ({
    official: result({ day, timeMs }),
  });

  it("counts played, solved and the best official time", () => {
    const a = dailyAggregates(
      data({
        1: solvedOn(1, 70_000),
        2: { replays: [] }, // played, never finished
        3: { ...solvedOn(3, 50_000), replays: [result({ timeMs: 1000 })] },
      }),
      3
    );
    expect(a).toMatchObject({ played: 3, solved: 2, bestTimeMs: 50_000 });
    expect(dailyAggregates(data({}), 3)).toEqual({
      played: 0,
      solved: 0,
      currentStreak: 0,
      maxStreak: 0,
      bestTimeMs: null,
    });
  });

  it("runs streaks over consecutive on-time solves", () => {
    const d = data({
      1: solvedOn(1),
      2: solvedOn(2),
      3: solvedOn(3),
      5: solvedOn(5),
      6: solvedOn(6),
    });
    // Today solved: the run through today.
    expect(dailyAggregates(d, 6)).toMatchObject({ currentStreak: 2, maxStreak: 3 });
    // Today not yet solved: yesterday's run still stands...
    expect(dailyAggregates(d, 7)).toMatchObject({ currentStreak: 2, maxStreak: 3 });
    // ...until a day is missed.
    expect(dailyAggregates(d, 8)).toMatchObject({ currentStreak: 0, maxStreak: 3 });
  });

  it("does not count late solves toward streaks; early ones count", () => {
    const d = data({
      1: solvedOn(1),
      2: solvedOn(4), // caught up two days late
      3: solvedOn(3),
      4: solvedOn(3), // a friend's link from a zone a day ahead
    });
    const a = dailyAggregates(d, 4);
    expect(a.solved).toBe(4);
    expect(a.currentStreak).toBe(2); // 3, 4
    expect(a.maxStreak).toBe(2);
  });
});
