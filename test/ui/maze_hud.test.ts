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
import type { SwordPhase } from "../../src/game/sword";

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
  // K139's collapse row too, K114's cuts and Delay's walker row, and K137 stage 3a's hearts
  // and stage 3b's sword.
  const RULES = {
    snapped: 3,
    parLeft: { par: 12, left: 4 },
    parStrokes: { par: 12, strokes: 9 },
    collapse: { pct: 58, par: "\u226562%" },
    cuts: 2,
    hearts: { left: 2, of: 3 },
    walker: { mode: "delay" as const, walk: 5, shortest: 3 },
    sword: { phase: "fleeing" as const, left: 3, slainAt: -1 },
    // K137 stage 3c: sprint's row.
    sprint: "armed",
    // K137 stage 3d: the sleepers woken.
    woken: 1,
    // K137 stage 2: the aids' rows.
    spool: { used: 3, cap: 12 },
    hints: { left: 1, of: 3 },
    spoolUsed: 62,
    hintsUsed: 2,
    // K138: the rules row, the turnstiles and the hidden runs.
    rules: "ice 25% \u00B7 cycle",
    turnstiles: 4,
    hidden: { found: 1, of: 2, fewest: 16, withAll: 14 },
  };
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

describe("K139 collapse row", () => {
  it("reads the score against par, and par as found when the search gave up", () => {
    const rows = ruleEntries({ collapse: { pct: 58, par: "\u226562%" } });
    expect(rows.map((r) => [r.id, r.label, r.value])).toEqual([
      ["collapsed", "collapsed", "58% \u00B7 par \u226562%"],
    ]);
    expect(ruleEntries({ collapse: null })).toEqual([]);
  });

  it("shows on the win banner's rows and the Stranded banner's", () => {
    const win = statEntries({
      timeMs: 61_000, path: 12, optimal: 9, efficiency: null, backtrack: null,
      junctions: 3, deadEnds: null, collapse: { pct: 75, par: "75%" },
    });
    expect(win.at(-1)?.value).toBe("75% \u00B7 par 75%");
    const loss = ruleLossEntries({ timeMs: 61000, walked: 12.5, collapse: { pct: 40, par: "\u226562%" } });
    expect(loss.map((r) => r.id)).toEqual(["time", "walked", "collapsed"]);
  });
});

describe("K114 cuts row", () => {
  it("counts the cuts, zero included, while the cut is on", () => {
    expect(ruleEntries({ cuts: 2 }).map((r) => [r.id, r.label, r.value])).toEqual([
      ["cuts", "cuts", "2"],
    ]);
    expect(ruleEntries({ cuts: 0 }).map((r) => r.value)).toEqual(["0"]);
    expect(ruleEntries({ cuts: null })).toEqual([]);
    expect(ruleEntries({})).toEqual([]);
  });

  it("shows on the win banner's rows", () => {
    const win = statEntries({
      timeMs: 61_000, path: 12, optimal: 9, efficiency: null, backtrack: null,
      junctions: 3, deadEnds: null, cuts: 1,
    });
    expect(win.at(-1)?.id).toBe("cuts");
    expect(win.at(-1)?.value).toBe("1");
  });

  it("K114 walker: Lead's cuts against par, Delay's walk against its shortest", () => {
    const lead = (par: number | null) =>
      ruleEntries({ cuts: 4, walker: { mode: "lead", par } }).map((r) => [r.id, r.value]);
    expect(lead(3)).toEqual([["cuts", "4 · par 3"]]);
    expect(lead(0)).toEqual([["cuts", "4 · par 0"]]);
    expect(lead(null)).toEqual([["cuts", "4 · par —"]]);
    const delay = ruleEntries({ cuts: 2, walker: { mode: "delay", walk: 61, shortest: 18 } });
    expect(delay.map((r) => [r.id, r.label, r.value])).toEqual([
      ["cuts", "cuts", "2"],
      ["walker", "walker", "61 · shortest 18"],
    ]);
  });

  it("K713: an upper-bound par reads par ≤ P, only when inexact", () => {
    const lead = (par: number | null, upper?: boolean) =>
      ruleEntries({ cuts: 4, walker: { mode: "lead", par, upper } }).map((r) => [r.id, r.value]);
    expect(lead(3, true)).toEqual([["cuts", "4 · par ≤ 3"]]);
    expect(lead(3, false)).toEqual([["cuts", "4 · par 3"]]);
    expect(lead(3)).toEqual([["cuts", "4 · par 3"]]);
    // K706 call 6: par 0 stays a plain par.
    expect(lead(0, false)).toEqual([["cuts", "4 · par 0"]]);
    // No par known: the dash, never "≤ —".
    expect(lead(null, true)).toEqual([["cuts", "4 · par —"]]);
    // Delay has no par to mark.
    const delay = ruleEntries({ cuts: 2, walker: { mode: "delay", walk: 61, shortest: 18 } });
    expect(delay.map((r) => r.value).join(" ")).not.toContain("≤");
  });
});

describe("K137 stage 3a hearts row", () => {
  it("follows the catches as left / of, only while lives are on", () => {
    const rows = gameEntries({ catches: 1, hearts: { left: 2, of: 3 } });
    expect(rows.map((r) => [r.id, r.label, r.value])).toEqual([
      ["caught", "caught", "1"],
      ["hearts", "hearts", "2 / 3"],
    ]);
    expect(gameEntries({ catches: 1, hearts: null }).map((r) => r.id)).toEqual(["caught"]);
    expect(gameEntries({ catches: 1 }).map((r) => r.id)).toEqual(["caught"]);
  });

  it("shows on the win banner's rows after the catches", () => {
    const win = statEntries({
      timeMs: 61_000, path: 12, optimal: 9, efficiency: null, backtrack: null,
      junctions: 3, deadEnds: null, catches: 2, hearts: { left: 1, of: 3 },
    });
    const ids = win.map((r) => r.id);
    expect(ids.indexOf("hearts")).toBe(ids.indexOf("caught") + 1);
    expect(win.find((r) => r.id === "hearts")?.value).toBe("1 / 3");
  });
});

describe("K137 stage 3b sword row", () => {
  it("reads ready, N left, used or slain on move N, after the hearts, only while laid", () => {
    const row = (phase: SwordPhase, left = 0, slainAt = -1) =>
      gameEntries({ catches: 0, hearts: { left: 3, of: 3 }, sword: { phase, left, slainAt } })
        .map((r) => [r.id, r.label, r.value]);
    expect(row("ready")).toEqual([
      ["caught", "caught", "0"],
      ["hearts", "hearts", "3 / 3"],
      ["sword", "sword", "ready"],
    ]);
    expect(row("fleeing", 3)[2]).toEqual(["sword", "sword", "3 left"]);
    expect(row("used")[2]).toEqual(["sword", "sword", "used"]);
    expect(row("slain", 0, 9)[2]).toEqual(["sword", "sword", "slain on move 9"]);
    expect(gameEntries({ catches: 1, sword: null }).map((r) => r.id)).toEqual(["caught"]);
    expect(gameEntries({ catches: 1 }).map((r) => r.id)).toEqual(["caught"]);
  });

  it("shows on the win banner's rows after the catches", () => {
    const win = statEntries({
      timeMs: 61_000, path: 12, optimal: 9, efficiency: null, backtrack: null,
      junctions: 3, deadEnds: null, catches: 0, sword: { phase: "slain", left: 0, slainAt: 7 },
    });
    const ids = win.map((r) => r.id);
    expect(ids.indexOf("sword")).toBe(ids.indexOf("caught") + 1);
    expect(win.find((r) => r.id === "sword")?.value).toBe("slain on move 7");
  });
});

describe("K137 stage 3c sprint row", () => {
  it("shows its state after the sword, in the HUD and on the win banner, only while on", () => {
    const hud = gameEntries({ catches: 0, sword: { phase: "ready", left: 0, slainAt: -1 }, sprint: "1 more move" });
    expect(hud.map((r) => [r.id, r.label, r.value]).slice(1)).toEqual([
      ["sword", "sword", "ready"],
      ["sprint", "sprint", "1 more move"],
    ]);
    expect(gameEntries({ catches: 0, sprint: null }).map((r) => r.id)).toEqual(["caught"]);
    const win = statEntries({
      timeMs: 61_000, path: 12, optimal: 9, efficiency: null, backtrack: null,
      junctions: 3, deadEnds: null, catches: 0, sprint: "used",
    });
    const ids = win.map((r) => r.id);
    expect(ids.indexOf("sprint")).toBe(ids.indexOf("caught") + 1);
    expect(win.find((r) => r.id === "sprint")?.value).toBe("used");
  });
});

describe("K137 stage 3d woken row", () => {
  it("shows the sleepers woken after sprint, in the HUD and on the win banner, only while sleepers are on", () => {
    const hud = gameEntries({ catches: 0, sprint: "ready", woken: 0 });
    expect(hud.map((r) => [r.id, r.label, r.value]).slice(1)).toEqual([
      ["sprint", "sprint", "ready"],
      ["woken", "woken", "0"],
    ]);
    expect(gameEntries({ catches: 0, woken: null }).map((r) => r.id)).toEqual(["caught"]);
    const win = statEntries({
      timeMs: 61_000, path: 12, optimal: 9, efficiency: null, backtrack: null,
      junctions: 3, deadEnds: null, catches: 1, woken: 2,
    });
    const ids = win.map((r) => r.id);
    expect(ids.indexOf("woken")).toBe(ids.indexOf("caught") + 1);
    expect(win.find((r) => r.id === "woken")?.value).toBe("2");
  });
});

describe("K137 stage 2 aids rows", () => {
  it("shows the spool gauge and the hints left in play, the shares at the finish", () => {
    const rows = (s: Parameters<typeof ruleEntries>[0]): Array<[string, string]> =>
      ruleEntries(s).map((r) => [r.label, r.value]);
    expect(rows({ spool: { used: 3, cap: 12 }, hints: { left: 1, of: 3 } })).toEqual([
      ["spool", "\u2588\u2588\u2588\u2588\u2588\u2588\u2591\u2591 75%"],
      ["hints", "1 / 3"],
    ]);
    expect(rows({ spool: { used: 12, cap: 12 } })).toEqual([
      ["spool", "\u2591".repeat(8) + " 0%"],
    ]);
    expect(rows({ spoolUsed: 62, hintsUsed: 0 })).toEqual([
      ["spool used", "62%"],
      ["hints used", "0"],
    ]);
    expect(rows({ spool: null, hints: null, spoolUsed: null, hintsUsed: null })).toEqual([]);
  });
});

describe("K138 rule rows", () => {
  it("reads the rules, the turnstiles and the hidden runs with both fewests", () => {
    const rows = ruleEntries({
      rules: "ice 25% \u00B7 cycle",
      turnstiles: 4,
      hidden: { found: 1, of: 2, fewest: 16, withAll: 14 },
    });
    expect(rows.map((r) => [r.id, r.label, r.value])).toEqual([
      ["rules", "rules", "ice 25% \u00B7 cycle"],
      ["turnstiles", "turnstiles", "4"],
      ["hidden", "hidden", "1 / 2 found \u00B7 fewest 16, 14 with them"],
    ]);
  });

  it("leaves them out while off, and dashes a fewest with no way", () => {
    expect(ruleEntries({ rules: null, turnstiles: null, hidden: null })).toEqual([]);
    expect(
      ruleEntries({ hidden: { found: 0, of: 0, fewest: 9, withAll: Infinity } })[0].value
    ).toBe("0 / 0 found \u00B7 fewest 9, \u2014 with them");
  });
});