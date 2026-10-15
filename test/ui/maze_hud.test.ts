// The HUD's pure rows (maze_hud.ts): K114's burn race rows join the stats
// only when the race supplies them, in the HUD's x10 units, and gameRows
// keeps the game's rows (K80's catches, K114's fire) with the stats off.
import { describe, expect, it } from "vitest";
import { gameRows, statRows } from "../../src/ui/maze_hud";

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
