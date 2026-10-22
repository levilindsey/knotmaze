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

  it("K114 walker: Lead's cuts and par, Delay's walk and the walk it wanted", () => {
    const lead = (cuts: number, par: number | null) =>
      title({ ...BASE, cuts, walker: { mode: "lead", par } });
    expect(lead(4, 3).endsWith(" \u00b7 \u2702\ufe0f 4, par 3")).toBe(true);
    expect(lead(0, 0).endsWith(" \u00b7 \u2702\ufe0f 0, par 0")).toBe(true);
    expect(lead(2, null).endsWith(" \u00b7 \u2702\ufe0f 2")).toBe(true);
    const delay = (walk: number) =>
      title({ ...BASE, cuts: 5, walker: { mode: "delay", walk, shortest: 18 } });
    expect(delay(61).endsWith(" \u00b7 \u{1F422} 61 runs (it wanted 18)")).toBe(true);
    expect(delay(1).endsWith(" \u00b7 \u{1F422} 1 run (it wanted 18)")).toBe(true);
    expect(delay(61)).not.toContain("\u2702");
  });

  it("K713: an upper-bound par reads par \u2264 P, only when inexact", () => {
    const lead = (cuts: number, par: number | null, upper?: boolean) =>
      title({ ...BASE, cuts, walker: { mode: "lead", par, upper } });
    expect(lead(4, 3, true).endsWith(" \u00b7 \u2702\ufe0f 4, par \u2264 3")).toBe(true);
    expect(lead(4, 3, false).endsWith(" \u00b7 \u2702\ufe0f 4, par 3")).toBe(true);
    expect(lead(4, 3).endsWith(" \u00b7 \u2702\ufe0f 4, par 3")).toBe(true);
    // K706 call 6: par 0 stays a plain par.
    expect(lead(0, 0, false).endsWith(" \u00b7 \u2702\ufe0f 0, par 0")).toBe(true);
    // No par known: no par part at all.
    expect(lead(2, null, true).endsWith(" \u00b7 \u2702\ufe0f 2")).toBe(true);
  });
});

describe("K137 stage 3a hearts tag", () => {
  it("puts the hearts left after the minotaur's tag, only while lives are on", () => {
    const t = title({ ...BASE, stars: 2, catches: 1, hearts: 2, snapped: 0 });
    expect(t.endsWith(" · \u{1F402} 1 · ❤️ 2 left · snapped 0")).toBe(true);
    for (const none of [title({ ...BASE, catches: 1, hearts: null }), title({ ...BASE, catches: 1 })]) {
      expect(none).not.toContain("❤");
    }
  });
});

describe("K137 stage 3b sword tag", () => {
  it("puts the move the sword was taken on after the hearts, only once taken", () => {
    const t = title({ ...BASE, stars: 2, catches: 0, hearts: 3, swordTaken: 5, snapped: 0 });
    expect(t.endsWith(" · \u{1F402} 0 · ❤️ 3 left · ⚔️ on move 5 · snapped 0")).toBe(true);
    for (const none of [title({ ...BASE, catches: 0, swordTaken: null }), title({ ...BASE, catches: 0 })]) {
      expect(none).not.toContain("⚔");
    }
  });
});

describe("K137 stage 3c sprint tag", () => {
  it("says sprint was used after the sword's tag, only once used", () => {
    const t = title({ ...BASE, catches: 1, hearts: 2, swordTaken: 4, sprintUsed: true, snapped: 0 });
    expect(t.endsWith(" · \u{1F402} 1 · ❤️ 2 left · ⚔️ on move 4 · ⚡ used · snapped 0")).toBe(true);
    for (const none of [
      title({ ...BASE, catches: 0, sprintUsed: false }),
      title({ ...BASE, catches: 0, sprintUsed: null }),
      title({ ...BASE, catches: 0 }),
    ]) {
      expect(none).not.toContain("⚡");
    }
  });
});

describe("K137 stage 3d woken tag", () => {
  it("counts the sleepers woken after sprint's tag, 0 included, only while sleepers are on", () => {
    const t = title({ ...BASE, catches: 1, sprintUsed: true, woken: 2, snapped: 0 });
    expect(t.endsWith(" · \u{1F402} 1 · ⚡ used · \u{1F634} 2 woken · snapped 0")).toBe(true);
    expect(title({ ...BASE, catches: 0, woken: 0 })).toContain(" · \u{1F634} 0 woken");
    for (const none of [title({ ...BASE, catches: 0, woken: null }), title({ ...BASE, catches: 0 })]) {
      expect(none).not.toContain("woken");
    }
  });
});

describe("K137 stage 2 aids tags", () => {
  it("ends the title with the spool's share used and the hints used", () => {
    const t = title({ ...BASE, cuts: 0, spool: { used: 9, cap: 11 }, hintsUsed: 2 });
    expect(t).toBe("Knotmaze \u{1F9F6} · \u{1F9F6} 82% of the spool · \u{1F4A1}2");
  });

  it("leaves them out with the spool off and no hint used", () => {
    for (const info of [BASE, { ...BASE, spool: null, hintsUsed: 0 }, { ...BASE, hintsUsed: null }]) {
      expect(title(info)).toBe("Knotmaze \u{1F9F6}");
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

describe("K138 rule tags", () => {
  it("ends the title with ice, the color rule, the turnstiles and the hidden runs", () => {
    const t = title({
      ...BASE,
      ice: 25,
      colorRule: "cycle",
      turnstiles: 4,
      hidden: { found: 1, of: 2 },
    });
    expect(t).toBe("Knotmaze \u{1F9F6} · \u{1F9CA} 25% · \u{1F3A8} cycle · \u{1F504} 4 · \u{1F47B} 1/2");
  });

  it("ends with the one-way runs laid (K138 stage 3)", () => {
    expect(title({ ...BASE, hidden: { found: 1, of: 2 }, oneWay: 12 })).toBe(
      "Knotmaze \u{1F9F6} · \u{1F47B} 1/2 · \u23E9 12"
    );
    expect(title({ ...BASE, oneWay: null })).toBe("Knotmaze \u{1F9F6}");
  });

  it("ends with the keys held of those laid (K138 stage 4)", () => {
    expect(title({ ...BASE, oneWay: 12, keys: { held: 2, of: 3 } })).toBe(
      "Knotmaze \u{1F9F6} · \u23E9 12 · \u{1F511} 2/3"
    );
    expect(title({ ...BASE, keys: null })).toBe("Knotmaze \u{1F9F6}");
  });

  it("leaves each out while its rule is off", () => {
    for (const info of [
      BASE,
      { ...BASE, ice: null, colorRule: null, turnstiles: null, hidden: null },
      { ...BASE, colorRule: "" },
    ]) {
      expect(title(info)).toBe("Knotmaze \u{1F9F6}");
    }
    expect(title({ ...BASE, turnstiles: 0 })).toBe("Knotmaze \u{1F9F6} · \u{1F504} 0");
  });
});