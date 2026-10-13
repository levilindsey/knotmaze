import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DAILY_DEFINITIONS,
  DAILY_MAX_AHEAD,
  DAILY_V1,
  MAZE_PARAM_KEYS,
  dailyDefinition,
  dailyParams,
  dailyQuery,
  dailySeed,
  mazeKey,
  parseLaunch,
  sameMaze,
} from "../../src/ui/daily_link";
import {
  PARAM_DEFAULTS,
  encodeParams,
  paramsFromValues,
  parseParams,
} from "../../src/ui/url_state";
import type { UrlParams } from "../../src/ui/url_state";
import { codecDefaults } from "../../src/ui/param_codec";
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
      overrides: {},
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
      deadEndDensity: 0.9, // inert while deadEnds is off
    };
    expect(sameMaze(a, { ...a, ...look })).toBe(true);
    const maze: Array<Partial<UrlParams>> = [
      { seed: a.seed + 1 },
      { gridSize: 12 },
      { shape: "heart" },
      { startAnchor: "n" },
      { weaveDensity: 0.5 },
      { branchDensity: 0.5 },
      { deadEnds: true },
      { junctionSpacing: 3 },
      { exitClearance: 2 },
      { mazeFabric: false },
    ];
    for (const m of maze) expect([m, sameMaze(a, { ...a, ...m })]).toEqual([m, false]);
    expect(
      sameMaze({ ...a, deadEnds: true }, { ...a, deadEnds: true, deadEndDensity: 0.5 })
    ).toBe(false);
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

describe("daily links", () => {
  const today = 10;

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

  it("leaves ordinary links to parseParams", () => {
    for (const q of ["", "?1471kin.c", "?s=7&gs=9", "?dailyx", "?am=instant&daily=3"]) {
      const l = parseLaunch(q, today);
      expect(l.daily).toBeNull();
    }
    expect(parseLaunch("?1471kin.c", today).params).toEqual(parseParams("?1471kin.c"));
  });

  it("keeps today's daily as published at plain `daily`", () => {
    const p = dailyParams(today);
    expect(dailyQuery(today, p, today)).toBe("daily");
    expect(parseLaunch(`?${dailyQuery(today, p, today)}`, today)).toEqual({
      params: p,
      daily: today,
      floating: true,
    });
    // Any other day, or a changed look, names the day.
    expect(dailyQuery(9, dailyParams(9), today)).toBe("daily=9");
    expect(dailyQuery(today, { ...p, hueShift: 3 }, today)).toMatch(/^daily=10\./);
  });

  it("writes `daily=<n>` for the pinned design and a delta for a changed look", () => {
    const p = dailyParams(7);
    expect(dailyQuery(7, p)).toBe("daily=7");
    const tweaked: UrlParams = {
      ...p,
      hueShift: 40,
      palette: "jewel",
      pathViz: "string",
      fogOfWar: true,
      threadWidth: 0.6,
    };
    const q = dailyQuery(7, tweaked);
    expect(q).toMatch(/^daily=7\.[A-Za-z0-9_-]+$/);
    expect(parseLaunch(`?${q}`, today)).toEqual({ params: tweaked, daily: 7, floating: false });
    // Shorter than the whole design as a token.
    expect(q.length).toBeLessThan(encodeParams(tweaked).length + "daily=".length);
  });

  it("writes an appearance mode's implied values like a token does", () => {
    const p = { ...dailyParams(7), appearMode: "trace-rainbow" as const };
    p.appearSequence = "trace";
    p.appearFx = "rainbow";
    p.appearSpeed = 2;
    const back = parseLaunch(`?${dailyQuery(7, p)}`, today);
    expect(back).toEqual({ params: p, daily: 7, floating: false });
  });

  it("takes legacy overrides after it (probe URLs)", () => {
    const l = parseLaunch("?daily=5&am=instant&fbclid=x", today);
    expect(l.daily).toBe(5);
    expect(l.params.appearSequence).toBe("instant");
    expect(sameMaze(l.params, dailyParams(5))).toBe(true);
    // An override that changes the maze is no longer the daily.
    const off = parseLaunch("?daily=5&gs=8", today);
    expect(off.daily).toBeNull();
    expect(off.params.gridSize).toBe(8);
    expect(off.params.seed).toBe(dailySeed(5));
  });

  it("ignores an unreadable delta, keeping the day", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const pinned = { params: dailyParams(4), daily: 4, floating: false };
    expect(parseLaunch("?daily=4.@@@", today)).toEqual(pinned);
    expect(parseLaunch("?daily=4.Y", today)).toEqual(pinned);
  });

  it("re-reads a URLSearchParams-serialized link", () => {
    const url = new URL("https://levi.dev/knotmaze/?daily=6");
    url.searchParams.append("ref", "x");
    expect(parseLaunch(url.search, today).daily).toBe(6);
  });
});
