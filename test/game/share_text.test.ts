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
