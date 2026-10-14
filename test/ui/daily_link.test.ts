import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DAILY_DEFINITIONS,
  DAILY_EXEMPT_KEYS,
  DAILY_MAX_AHEAD,
  DAILY_V1,
  MAZE_PARAM_KEYS,
  applyDailyPrefs,
  dailyDefinition,
  dailyParams,
  dailyQuery,
  dailySeed,
  isDailyDesign,
  matchesDesign,
  mazeKey,
  mergeDailyPrefs,
  parseLaunch,
  sameMaze,
} from "../../src/ui/daily_link";
import {
  ENUM_OPTIONS,
  PARAM_DEFAULTS,
  impliedParams,
  paramsFromValues,
  parseParams,
} from "../../src/ui/url_state";
import type { UrlParams } from "../../src/ui/url_state";
import { codecDefaults, encodeDelta } from "../../src/ui/param_codec";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { planAnchors } from "../../src/core/shapes";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph } from "../../src/core/walk_graph";

afterEach(() => {
  vi.restoreAllMocks();
});

// The walk graph main.ts builds for a design (its rebuild() path).
function walkOf(p: UrlParams) {
  const graph = generateLatticeKnotwork({
    gridSize: p.gridSize,
    weaveDensity: p.weaveDensity,
    turnBias: p.turnBias,
    randSeed: p.seed,
    shape: p.shape,
  });
  const plan = buildMazePlan(graph, {
    ...DEFAULT_MAZE_PARAMS,
    branchDensity: p.branchDensity,
    fourWayFraction: p.fourWayFraction,
    deadEndDensity: p.deadEnds ? p.deadEndDensity : 0,
    deadEndLength: p.deadEndLength,
    entranceClearance: p.entranceClearance,
    exitClearance: p.exitClearance,
    junctionSpacing: p.junctionSpacing,
    ...planAnchors(p.shape, p.gridSize, p.startAnchor, p.exitAnchor),
  });
  const hueGroup = applyMazePlan(graph, plan);
  applyMazeCuts(graph, plan, hueGroup);
  return buildWalkGraph(graph)!;
}

describe("the daily definition (frozen)", () => {
  it("pins DAILY_V1 literally", () => {
    expect(DAILY_V1).toEqual({
      version: 1,
      fromDay: 1,
      codecVersion: 3,
      // K74 (2026-10-13), edited in place before launch: long dead ends
      // and the far exit.
      overrides: { exitClearance: 12, deadEnds: true, deadEndDensity: 0.5, deadEndLength: 20 },
      salt: 0x6b6e6f74,
    });
    expect(DAILY_DEFINITIONS[0]).toBe(DAILY_V1);
    // Definitions only ever append, in fromDay order, with rising versions.
    DAILY_DEFINITIONS.forEach((d, i) => {
      expect(d.version).toBe(i + 1);
      if (i > 0) expect(d.fromDay).toBeGreaterThan(DAILY_DEFINITIONS[i - 1].fromDay);
    });
    expect(dailyDefinition(1)).toBe(DAILY_V1);
  });

  it("pins the daily seeds", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map((n) => dailySeed(n))).toEqual([
      1470545611, 485302668, 1613290376, 148971763, 229430507, 147565272,
      813041015, 3303307049,
    ]);
    // Distinct for years of dailies.
    const seen = new Set<number>();
    for (let n = 1; n <= 5000; n++) seen.add(dailySeed(n));
    expect(seen.size).toBe(5000);
  });

  it("is its codec version's defaults on the day's seed", () => {
    for (const n of [1, 2, 77]) {
      const def = dailyDefinition(n);
      expect(dailyParams(n)).toEqual(
        paramsFromValues(dailySeed(n), {
          ...codecDefaults(def.codecVersion),
          ...def.overrides,
        })
      );
      expect(dailyParams(n).mazeFabric).toBe(true);
    }
  });

  it("does not follow today's defaults (a mid-day default edit)", () => {
    const before = dailyParams(4);
    const D = PARAM_DEFAULTS as unknown as Record<string, unknown>;
    const saved = { ...D };
    try {
      // Simulate Levi editing defaults while players are mid-daily.
      D.gridSize = 9;
      D.branchDensity = 0.9;
      D.hueShift = 12;
      D.junctionSpacing = 6;
      expect(dailyParams(4)).toEqual(before);
    } finally {
      Object.assign(D, saved);
    }
  });

  // GOLDEN: dailies #1-#3 as built today. A failure here means the
  // generation code (or the definition) changed and EVERY daily moved -
  // publish a new definition for future days instead (daily_link.ts).
  it("builds the same mazes it always has (golden)", () => {
    const golden = [
      { n: 1, optimal: 85.64700062285216, vertices: 200, edges: 302 },
      { n: 2, optimal: 75.35894361088211, vertices: 194, edges: 294 },
      { n: 3, optimal: 85.43304600279566, vertices: 194, edges: 295 },
    ];
    for (const g of golden) {
      const w = walkOf(dailyParams(g.n));
      expect({
        n: g.n,
        optimal: w.optimalLength,
        vertices: w.vertices.size,
        edges: w.edges.length,
      }).toEqual(g);
    }
  });
});

describe("maze identity", () => {
  it("ignores look, sound, physics and display; not the maze knobs", () => {
    const a = dailyParams(3);
    const look: Partial<UrlParams> = {
      hueShift: 10,
      palette: "ink",
      threadWidth: 0.3,
      soundMode: "none",
      physics: false,
      pathViz: "trail",
      fogOfWar: true,
      appearMode: "instant",
    };
    expect(sameMaze(a, { ...a, ...look })).toBe(true);
    // The dead-end knobs are inert while dead ends are off.
    const off = { ...a, deadEnds: false };
    expect(sameMaze(off, { ...off, deadEndDensity: 0.9, deadEndLength: 33 })).toBe(true);
    const maze: Array<Partial<UrlParams>> = [
      { seed: a.seed + 1 },
      { gridSize: 12 },
      { shape: "heart" },
      { startAnchor: "n" },
      { weaveDensity: 0.5 },
      { branchDensity: 0.5 },
      { deadEnds: false },
      { deadEndDensity: 0.9 },
      { deadEndLength: 30 },
      { junctionSpacing: 3 },
      { exitClearance: 2 },
      { mazeFabric: false },
    ];
    for (const m of maze) expect([m, sameMaze(a, { ...a, ...m })]).toEqual([m, false]);
    expect(MAZE_PARAM_KEYS).toContain("seed");
    expect(mazeKey(a)).toBe(mazeKey({ ...a, gridSize: 18.0000000001 }));
  });

  // A new maze-plan knob must join the maze identity too, or changing it
  // would keep calling a different maze "the daily".
  it("covers every maze-plan knob", () => {
    for (const k of Object.keys(DEFAULT_MAZE_PARAMS)) {
      expect(MAZE_PARAM_KEYS as readonly string[]).toContain(k);
    }
  });
});


// A different valid value for any param (the design's own value changed).
function otherValue(key: string, v: unknown): unknown {
  const options = (ENUM_OPTIONS as Record<string, readonly string[] | undefined>)[key];
  if (options) return options.find((o) => o !== v);
  if (typeof v === "boolean") return !v;
  if (typeof v === "number") return v + 0.25;
  if (key === "pathColor") return v === "#123456" ? "#654321" : "#123456";
  throw new Error(`no other value for ${key}`);
}

describe("the front door (K56)", () => {
  const today = 10;

  it("opens today's daily at a bare address", () => {
    for (const q of ["", "?"]) {
      expect([q, parseLaunch(q, today)]).toEqual([
        q,
        { params: dailyParams(10), daily: 10, floating: true },
      ]);
    }
  });

  it("reads ?daily as today's, ?daily=<n> as daily n", () => {
    // `?daily` asks for TODAY's daily (floating); a number names a day.
    for (const q of ["?daily", "?daily=", "daily"]) {
      expect([q, parseLaunch(q, today)]).toEqual([
        q,
        { params: dailyParams(10), daily: 10, floating: true },
      ]);
    }
    for (const q of ["?daily=10", "?daily=10."]) {
      expect([q, parseLaunch(q, today)]).toEqual([
        q,
        { params: dailyParams(10), daily: 10, floating: false },
      ]);
    }
    expect(parseLaunch("?daily=3", today)).toEqual({
      params: dailyParams(3),
      daily: 3,
      floating: false,
    });
    // A friend's link from a time zone ahead.
    expect(parseLaunch(`?daily=${today + DAILY_MAX_AHEAD}`, today).daily).toBe(12);
  });

  it("loads today's for a daily number out of range", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const q of ["?daily=0", "?daily=13", "?daily=-2", "?daily=abc", "?daily=1e3", "?daily=%zz"]) {
      const l = parseLaunch(q, today);
      expect([q, l.daily, l.floating]).toEqual([q, today, true]);
    }
  });

  it("treats any other query as an ordinary design", () => {
    for (const q of ["?1471kin.c", "?s=7&gs=9", "?dailyx", "?am=instant", "?am=instant&daily=3", "?&daily", "?mf=1"]) {
      const l = parseLaunch(q, today, { volume: 0 });
      expect([q, l.daily]).toEqual([q, null]);
      expect([q, l.params.volume]).toEqual([q, parseParams(q).volume]);
    }
    expect(parseLaunch("?1471kin.c", today).params).toEqual(parseParams("?1471kin.c"));
  });

  it("writes the bare address for today's, `daily=<n>` otherwise", () => {
    expect(dailyQuery(today, today)).toBe("");
    expect(dailyQuery(9, today)).toBe("daily=9");
    // A numbered daily (not floating) keeps its number even on its day.
    expect(dailyQuery(today)).toBe(`daily=${today}`);
    expect(parseLaunch(`?${dailyQuery(9, today)}`, today)).toEqual({
      params: dailyParams(9),
      daily: 9,
      floating: false,
    });
  });

  it("opens K20's `?daily=<n>.<delta>` links as the design they describe", () => {
    const p = dailyParams(7);
    const tweaked: UrlParams = {
      ...p,
      hueShift: 40,
      palette: "jewel",
      pathViz: "string",
      fogOfWar: true,
      threadWidth: 0.6,
    };
    const delta = encodeDelta(
      tweaked as unknown as Record<string, unknown>,
      p as unknown as Record<string, unknown>,
      impliedParams(tweaked)
    );
    expect(delta).not.toBe("");
    expect(parseLaunch(`?daily=7.${delta}`, today, { volume: 0 })).toEqual({
      params: tweaked,
      daily: null,
      floating: false,
    });
    // Even a delta of preferences only: no daily is written that way now.
    const quiet = { ...p, volume: 0.1 };
    const d2 = encodeDelta(
      quiet as unknown as Record<string, unknown>,
      p as unknown as Record<string, unknown>,
      impliedParams(quiet)
    );
    expect(parseLaunch(`?daily=7.${d2}`, today).daily).toBeNull();
  });

  it("ignores an unreadable delta, keeping the day", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const pinned = { params: dailyParams(4), daily: 4, floating: false };
    expect(parseLaunch("?daily=4.@@@", today)).toEqual(pinned);
    expect(parseLaunch("?daily=4.Y", today)).toEqual(pinned);
  });

  it("keeps the daily for preference overrides, leaves it for any other", () => {
    const quiet = parseLaunch("?daily=5&vol=0&cam=follow&fbclid=x", today);
    expect(quiet.daily).toBe(5);
    expect([quiet.params.volume, quiet.params.cameraMode]).toEqual([0, "follow"]);
    // A look or a maze override is an ordinary design: the day's design with
    // that change (probe URLs `?daily&am=instant` included).
    for (const q of ["?daily=5&am=instant", "?daily=5&hs=40", "?daily=5&gs=8", "?daily&fow=1"]) {
      expect([q, parseLaunch(q, today).daily]).toEqual([q, null]);
    }
    const off = parseLaunch("?daily=5&gs=8", today);
    expect(off.params.gridSize).toBe(8);
    expect(off.params.seed).toBe(dailySeed(5));
    expect(sameMaze(parseLaunch("?daily=5&am=instant", today).params, dailyParams(5))).toBe(true);
  });

  it("opens a daily with the stored prefs, which link overrides beat", () => {
    const prefs = { volume: 0.05, soundMode: "none", cameraMode: "follow" };
    for (const q of ["", "?daily", "?daily=6"]) {
      const l = parseLaunch(q, today, prefs);
      expect([q, l.daily !== null, l.params.volume, l.params.soundMode, l.params.cameraMode]).toEqual(
        [q, true, 0.05, "none", "follow"]
      );
    }
    const l = parseLaunch("?daily=6&vol=0.9", today, prefs);
    expect([l.daily, l.params.volume, l.params.soundMode]).toEqual([6, 0.9, "none"]);
  });

  it("re-reads a URLSearchParams-serialized link", () => {
    const url = new URL("https://levi.dev/knotmaze/?daily=6");
    url.searchParams.append("ref", "x");
    expect(parseLaunch(url.search, today).daily).toBe(6);
  });
});

describe("the daily design and its exempt preferences (K56)", () => {
  it("pins the exempt set (Levi confirms changes to it)", () => {
    expect([...DAILY_EXEMPT_KEYS]).toEqual([
      "soundMode",
      "pitchSpace",
      "octaves",
      "rootNote",
      "tonicEmphasis",
      "soundSpeed",
      "volume",
      "reverb",
      "brightness",
      "sustain",
      "shimmer",
      "pickPosition",
      "cameraMode",
      "pluckSize",
      "pluckGhost",
      "pluckReach",
      "pluckStyle",
      "tugLimit",
      "snapBack",
      "physics",
    ]);
    for (const k of DAILY_EXEMPT_KEYS) {
      expect(Object.keys(PARAM_DEFAULTS)).toContain(k);
      // A preference can never change the maze.
      expect(MAZE_PARAM_KEYS as readonly string[]).not.toContain(k);
    }
  });

  it("stays the daily across every preference, and only those", () => {
    const n = 4;
    const base = dailyParams(n);
    expect(isDailyDesign(base, n)).toBe(true);
    const b = base as unknown as Record<string, unknown>;
    const exempt = new Set<string>(DAILY_EXEMPT_KEYS);
    for (const key of ["seed", ...Object.keys(PARAM_DEFAULTS)]) {
      const changed = { ...b, [key]: key === "seed" ? base.seed + 1 : otherValue(key, b[key]) };
      expect([key, isDailyDesign(changed as unknown as UrlParams, n)]).toEqual([key, exempt.has(key)]);
    }
    // Every preference at once still is.
    const all = { ...b };
    for (const k of DAILY_EXEMPT_KEYS) all[k] = otherValue(k, b[k]);
    expect(isDailyDesign(all as unknown as UrlParams, n)).toBe(true);
    // Slider float noise is no change.
    expect(isDailyDesign({ ...base, hueShift: base.hueShift + 1e-9 }, n)).toBe(true);
    // Another day's design is not this day's.
    expect(isDailyDesign(dailyParams(n + 1), n)).toBe(false);
  });

  it("compares an appearance mode, not the values it implies", () => {
    // A future daily on `random`: each load rolls its own three values.
    const roll = (): UrlParams => paramsFromValues(77, { appearMode: "random" });
    const a = roll();
    for (let i = 0; i < 20; i++) expect(matchesDesign(roll(), a)).toBe(true);
    expect(matchesDesign({ ...a, appearMode: "custom" }, a)).toBe(false);
    // A preset: its values are implied.
    const preset = paramsFromValues(77, { appearMode: "trace-rainbow" });
    expect(matchesDesign({ ...preset, appearSpeed: 9 }, preset)).toBe(true);
    // The V1 daily is custom: all three values count.
    expect(isDailyDesign({ ...dailyParams(2), appearSpeed: 3 }, 2)).toBe(false);
  });

  it("applies stored prefs: preferences only, valid values only", () => {
    const base = dailyParams(3);
    const p = applyDailyPrefs(base, {
      volume: 0.2,
      soundMode: "random",
      cameraMode: "sideways", // not an option
      reverb: "loud", // wrong type
      octaves: Number.NaN,
      physics: false,
      hueShift: 12, // not a preference
      seed: 7,
    });
    expect(p).toEqual({ ...base, volume: 0.2, soundMode: "random", physics: false });
    expect(base.volume).toBe(dailyParams(3).volume); // a copy
  });

  it("stores only the preferences the player changes on the daily", () => {
    const n = 3;
    const base = dailyParams(n);
    // Opened with a link's one-off `&vol=0` and stored prefs {snd: none}.
    const opened = { ...base, volume: 0, soundMode: "none" as const };
    const stored = { soundMode: "none", shimmer: 0.9 };
    // The player changes the camera: only that is stored on top.
    const after = { ...opened, cameraMode: "follow" as const };
    expect(mergeDailyPrefs(stored, opened, after, n)).toEqual({
      soundMode: "none",
      shimmer: 0.9,
      cameraMode: "follow",
    });
    // Sound back to the daily's own: dropped (it follows the daily again).
    const back = { ...after, soundMode: base.soundMode };
    expect(mergeDailyPrefs(stored, after, back, n)).toEqual({ shimmer: 0.9 });
    // Non-preferences never land in the prefs.
    expect(mergeDailyPrefs({}, base, { ...base, hueShift: 5 }, n)).toEqual({});
    // Slider float noise is stored at link precision.
    expect(mergeDailyPrefs({}, base, { ...base, volume: 0.1 + 2e-17 + 0.00000000001 }, n)).toEqual({ volume: 0.1 });
  });
});
