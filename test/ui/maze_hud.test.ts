// The HUD's pure rows (maze_hud.ts): K114's burn race rows join the stats
// only when the race supplies them, in the HUD's x10 units, and gameRows
// keeps the game's rows (K80's catches, K114's fire) with the stats off.
import { describe, expect, it } from "vitest";
import { STATS, explainedStats, efficiencyOf, efficiencyPercent } from "../../src/game/maze_stats";
import { rateRun, walkedOf } from "../../src/game/star_rating";
import {
  gameEntries,
  gameRows,
  lossEntries,
  ruleEntries,
  ruleLossEntries,
  statEntries,
  statRows,
} from "../../src/ui/maze_hud";
import type { StatEntry } from "../../src/ui/maze_hud";

const BASE = {
  timeMs: 61_000,
  path: 12.34,
  optimal: 9.87,
  efficiency: null,
  backtrack: 1.5,
  junctions: 3,
  deadEnds: null,
};

describe("HUD rows", () => {
  it("a design without a fire shows no fire rows", () => {
    const rows = statRows(BASE).map(([k]) => k);
    expect(rows).toEqual(["time", "path / optimal", "backtracked", "junctions"]);
    expect(gameRows(BASE)).toEqual([]);
  });

  it("the fire's lead reads in the HUD's units while the race runs", () => {
    const s = { ...BASE, fireLead: 9.24, closestCall: null };
    expect(statRows(s).at(-1)).toEqual(["fire lead", "92"]);
    expect(gameRows(s)).toEqual([["fire lead", "92"]]);
  });

  it("the closest call replaces it once the race is over", () => {
    const s = { ...BASE, fireLead: null, closestCall: 0.44 };
    expect(statRows(s).at(-1)).toEqual(["closest call", "4"]);
    expect(gameRows(s)).toEqual([["closest call", "4"]]);
  });

  it("the catches stay a game row", () => {
    expect(gameRows({ catches: 2 })).toEqual([["caught", "2"]]);
  });
});

// K274: the win banner's info popover says what each row means. Every row is
// built through an entry keyed by STATS (game/maze_stats.ts), and this
// fixture shows every row the HUD, the win banner and the Burnt banner can,
// so a stage that adds a stat without its line fails here (and one that adds
// a line without a row fails here too, until this fixture grows to show it).
describe("what each figure means (K274)", () => {
  const FULL = {
    timeMs: 61_000,
    path: 12.34,
    optimal: 9.87,
    efficiency: 0.8,
    backtrack: 1.5,
    junctions: 3,
    deadEnds: 2,
    catches: 1,
    closeCalls: 1,
    seen: 3,
    chasedMs: 5_000,
    restarts: 2,
    fireLead: 9.24,
    closestCall: 0.44,
  };
  const LOSS = { timeMs: 61_000, walked: 20, closest: 0.44 };

  // K137's rule rows (kept out of FULL, whose exact rows are pinned).
  const RULES = { snapped: 3, parLeft: { par: 12, left: 4 }, parStrokes: { par: 12, strokes: 9 } };
  const shown = (): StatEntry[] => [
    ...statEntries(FULL),
    ...gameEntries(FULL),
    ...lossEntries(LOSS),
    ...gameEntries(RULES),
  ];

  it("every row that can show has a line, and every line has a row", () => {
    const ids = new Set(shown().map((e) => e.id));
    expect([...ids].sort()).toEqual(Object.keys(STATS).sort());
  });

  it("a row's label is its table label, and each line is a plain sentence", () => {
    for (const e of shown()) expect(e.label).toBe(STATS[e.id].label);
    const labels = Object.values(STATS).map((s) => s.label);
    expect(new Set(labels).size).toBe(labels.length);
    for (const [id, s] of Object.entries(STATS)) {
      expect(s.label.trim(), id).not.toBe("");
      expect(s.line.length, id).toBeGreaterThan(20);
      expect(s.line.trim(), id).toBe(s.line);
      expect(s.line.endsWith("."), id).toBe(true);
    }
  });

  it("the rows keep their labels, order and values", () => {
    expect(statRows(FULL)).toEqual([
      ["time", "1:01"],
      ["path / optimal", "123 / 99"],
      ["efficiency", "80%"],
      ["backtracked", "15"],
      ["junctions", "3"],
      ["dead ends", "2"],
      ["caught", "1"],
      ["close calls", "1"],
      ["seen", "3"],
      ["chased", "0:05"],
      ["restarts", "2"],
      ["fire lead", "92"],
      ["closest call", "4"],
    ]);
    // K80 turns stage 2: no restarts, no row; real time has no close calls
    // or turns seen.
    const rows = statRows({ ...FULL, restarts: 0, closeCalls: null, seen: null });
    expect(rows.map(([l]) => l)).not.toContain("restarts");
    expect(rows.map(([l]) => l)).not.toContain("close calls");
    expect(rows.map(([l]) => l)).not.toContain("seen");
    expect(gameRows(FULL)).toEqual([
      ["caught", "1"],
      ["fire lead", "92"],
      ["closest call", "4"],
    ]);
    expect(lossEntries(LOSS).map((e) => [e.label, e.value])).toEqual([
      ["time", "1:01"],
      ["walked", "200"],
      ["closest call", "4"],
    ]);
  });

  it("the efficiency line's premise holds: a wander walked back reads 100%, the stars count it", () => {
    const optimal = 10;
    const backtrack = 8;
    // The route you ended on is the best one: 100%.
    const eff = efficiencyOf(optimal, optimal);
    expect(eff).not.toBeNull();
    expect(efficiencyPercent(eff as number)).toBe(100);
    // ...but the walk out and back counts twice for the stars.
    const rating = rateRun(walkedOf(optimal, backtrack), optimal);
    expect(rating?.stars).toBe(2);
    expect(rating?.ratio).toBeCloseTo(2.6, 12);
  });

  it("a banner showing the closest call explains the fire's lead too, just before it", () => {
    expect(explainedStats(["time", "walked", "closestCall"])).toEqual([
      "time",
      "walked",
      "fireLead",
      "closestCall",
    ]);
    // Already there (the HUD): not twice.
    expect(explainedStats(["fireLead", "closestCall"])).toEqual(["fireLead", "closestCall"]);
    expect(explainedStats(["time", "path"])).toEqual(["time", "path"]);
    expect(explainedStats([])).toEqual([]);
  });
});

describe("K137 rule rows", () => {
  it("reads snapped N, par P \u00B7 L left and strokes S / par P", () => {
    const rows = ruleEntries({
      snapped: 3,
      parLeft: { par: 12, left: 4 },
      parStrokes: { par: 12, strokes: 9 },
    });
    expect(rows.map((r) => [r.id, r.label, r.value])).toEqual([
      ["snapped", "snapped", "3"],
      ["par", "par", "12 \u00B7 4 left"],
      ["strokes", "strokes", "9 / par 12"],
    ]);
  });

  it("leaves out a rule that is off, and dashes an infinite par", () => {
    expect(ruleEntries({ snapped: null, parLeft: null, parStrokes: null })).toEqual([]);
    expect(ruleEntries({ parLeft: { par: Infinity, left: Infinity } })[0].value).toBe(
      "\u2014 \u00B7 \u2014 left"
    );
    expect(ruleEntries({ parStrokes: { par: Infinity, strokes: 5 } })[0].value).toBe(
      "5 / par \u2014"
    );
  });

  it("puts the rule rows under time and walked on the rule banners", () => {
    const ids = ruleLossEntries({ timeMs: 61000, walked: 12.5, snapped: 2 }).map((r) => r.id);
    expect(ids).toEqual(["time", "walked", "snapped"]);
  });
});
