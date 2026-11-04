// @vitest-environment happy-dom
// K201: the daily stats view's Played chip counts what the played tile
// counts, and a practice row shows its count on the row itself. This
// file opts into happy-dom alone (the reanchor_step.test.ts header;
// the rest of the suite keeps its environment), opens the real stats
// view over the crafted store of .claude/probes/K201/before.ts (the
// same five crafted days, today moved to Daily #16 so the History has
// more than HISTORY_CHIPS_AFTER rows and the chips show), and reads
// the chip's label and a practice row's status cell.
import { afterEach, describe, expect, it } from "vitest";
import { DailyStore } from "../../src/game/daily_store";
import type { DailyAttempt, DailyResult } from "../../src/game/daily_store";
import { closeDailyStats, openDailyStats } from "../../src/ui/daily_stats_view";

const result = (over: Partial<DailyResult> = {}): DailyResult => ({
  at: 1_790_000_000_000,
  day: 1,
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
  day: 1,
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
  closeDailyStats();
  document.body.innerHTML = "";
});

// The crafted store, built through the store's own recording paths:
// day 8 official, day 7 played-only, day 6 practice-only with two
// finishes, day 5 a late-begun resume; today (Daily #16) holds nothing.
function craftedStore(): DailyStore {
  const store = new DailyStore(null);
  store.recordSolve(8, result({ day: 8 }));
  store.markPlayed(7, 1000, 7);
  store.recordSolve(6, result({ day: 9, timeMs: 5000 }));
  store.recordSolve(6, result({ day: 9, timeMs: 4000 }));
  store.saveAttempt(5, attempt({ day: 9 }));
  return store;
}

function historyRow(n: number): HTMLButtonElement {
  const rows = [...document.querySelectorAll<HTMLButtonElement>(".km-hist button")];
  const row = rows.find((b) => b.querySelector("span")?.textContent === `#${n}`);
  if (!row) throw new Error(`no history row for #${n}`);
  return row;
}

describe("K201: the stats view's Played chip and practice rows", () => {
  it("names the tile's number on the chip, and the count on the practice row", () => {
    openDailyStats({ store: craftedStore(), today: 16, onPlay: () => {}, onShare: () => {} });
    // The played tile itself.
    expect(document.querySelector(".km-tile b")?.textContent).toBe("2");
    // The Played chip names the same number (before the fix it read 4:
    // the practice day and the late-begun resume counted as played).
    const chips = [...document.querySelectorAll<HTMLButtonElement>(".km-chip")];
    const playedChip = chips.find((c) => c.textContent.startsWith("Played"));
    expect(playedChip?.textContent).toBe("Played 2");
    expect(chips.find((c) => c.textContent.startsWith("Not played"))?.textContent).toBe(
      "Not played 13"
    );
    // The practice row's status cell carries its total (2 finishes);
    // the tooltip keeps its sentence.
    const practice = historyRow(6);
    const cells = [...practice.querySelectorAll("span")];
    expect(cells[cells.length - 1]?.textContent).toBe("practice ×2");
    expect(practice.title).toContain("Practiced 2 times");
    // The Played filter follows the same count: the practice day and
    // the late-begun resume hide, the official day stays.
    playedChip?.click();
    expect(historyRow(6).parentElement?.hidden).toBe(true);
    expect(historyRow(5).parentElement?.hidden).toBe(true);
    expect(historyRow(8).parentElement?.hidden).toBe(false);
    expect(historyRow(7).parentElement?.hidden).toBe(false);
  });
});
