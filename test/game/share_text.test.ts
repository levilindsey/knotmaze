import { describe, expect, it } from "vitest";
import { shareText } from "../../src/game/share_text";

const BASE = { daily: null, replay: false, timeMs: 61000, efficiency: 0.8, moves: "ggb" };
const title = (info: Parameters<typeof shareText>[0]): string => shareText(info).split("\n")[0];

describe("K137 share tags", () => {
  it("puts snapped N and the par score after the minotaur's tag", () => {
    const t = title({ ...BASE, stars: 2, catches: 1, snapped: 3, parScore: "+2" });
    expect(t.endsWith(" · \u{1F402} 1 · snapped 3 · ⛳ +2")).toBe(true);
  });

  it("shows each tag alone, and E or an under-par score as given", () => {
    expect(title({ ...BASE, snapped: 0 }).endsWith(" · snapped 0")).toBe(true);
    expect(title({ ...BASE, parScore: "E" }).endsWith(" · ⛳ E")).toBe(true);
    expect(title({ ...BASE, parScore: "−1" }).endsWith(" · ⛳ −1")).toBe(true);
  });

  it("leaves both out when the rules are off (null, absent, or an empty score)", () => {
    for (const t of [
      title(BASE),
      title({ ...BASE, snapped: null, parScore: null }),
      title({ ...BASE, parScore: "" }),
    ]) {
      expect(t).not.toContain("snapped");
      expect(t).not.toContain("⛳");
    }
  });
});

describe("K114 cut tag", () => {
  it("adds the scissors and the cut count last, only for a cut made", () => {
    const t = title({ ...BASE, stars: 3, snapped: 1, cuts: 2 });
    expect(t.endsWith(" · snapped 1 · \u2702\uFE0F 2")).toBe(true);
    for (const none of [title({ ...BASE, cuts: 0 }), title({ ...BASE, cuts: null }), title(BASE)]) {
      expect(none).not.toContain("\u2702");
    }
  });
});

describe("K139 collapse line", () => {
  it("puts the mode, the score and par on a line under the time, before the grid", () => {
    const fin = shareText({ ...BASE, efficiency: null, collapse: { mode: "finish", pct: 58, par: "≥62%" } });
    expect(fin.split("\n")).toEqual([
      "Knotmaze \u{1F9F6}",
      "⏱️ 1:01",
      "\u{1F9F1} Collapse to the finish: 58% · par ≥62%",
      expect.any(String),
    ]);
    const free = shareText({ ...BASE, collapse: { mode: "free", pct: 75, par: "75%" } });
    expect(free.split("\n")[2]).toBe("\u{1F9F1} Free collapse: 75% · par 75%");
  });

  it("leaves the line out when collapse is off", () => {
    for (const info of [BASE, { ...BASE, collapse: null }]) {
      expect(shareText(info)).not.toContain("collapse");
    }
  });
});
