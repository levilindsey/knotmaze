import { describe, expect, it } from "vitest";
import {
  SHEET_QUERY,
  SHEET_STATE,
  SheetHistory,
  SHEET_FONT_PX,
  helpEnabled,
  panelStartsOpen,
  sheetLayout,
} from "../../src/ui/panel_sheet";

// K468: the settings sheet on phones.
describe("the layout rule", () => {
  it("a narrow window gets the sheet, touch or not", () => {
    expect(sheetLayout(411, 753, true)).toBe(true);
    expect(sheetLayout(700, 900, false)).toBe(true);
    expect(sheetLayout(320, 200, false)).toBe(true);
  });

  it("701 px wide is the side panel", () => {
    expect(sheetLayout(701, 900, false)).toBe(false);
    expect(sheetLayout(701, 900, true)).toBe(false);
  });

  it("a short touch screen (a phone in landscape) gets the sheet", () => {
    expect(sheetLayout(753, 411, true)).toBe(true);
    expect(sheetLayout(1000, 500, true)).toBe(true);
  });

  it("a short window with a mouse keeps the side panel", () => {
    expect(sheetLayout(753, 411, false)).toBe(false);
    expect(sheetLayout(1400, 400, false)).toBe(false);
  });

  it("tablets and desktops keep the side panel", () => {
    expect(sheetLayout(768, 1024, true)).toBe(false);
    expect(sheetLayout(1024, 768, true)).toBe(false);
    expect(sheetLayout(1400, 900, false)).toBe(false);
  });

  it("the media query says the same: width OR (coarse AND short)", () => {
    expect(SHEET_QUERY).toBe(
      "(max-width: 700px), (pointer: coarse) and (max-height: 500px)"
    );
  });
});

describe("row help gating (K482)", () => {
  it("help is on for a coarse pointer, sheet or not", () => {
    expect(helpEnabled(true, false)).toBe(true);
  });

  it("help is on in the sheet, fine pointer or not", () => {
    expect(helpEnabled(false, true)).toBe(true);
    expect(helpEnabled(true, true)).toBe(true);
  });

  it("help is off on a fine-pointer side panel (desktop keeps the title tooltip)", () => {
    expect(helpEnabled(false, false)).toBe(false);
  });
});

describe("the sheet font (K483)", () => {
  it("the sheet font is 13 px (the side panel stays at Tweakpane's 11)", () => {
    expect(SHEET_FONT_PX).toBe(13);
  });
});
describe("whether the panel starts open", () => {
  it("a sheet starts closed, whatever was stored", () => {
    expect(panelStartsOpen(true, "1", true)).toBe(false);
    expect(panelStartsOpen(true, null, true)).toBe(false);
    expect(panelStartsOpen(true, "0", false)).toBe(false);
  });

  it("the side panel follows the stored choice, else the screen", () => {
    expect(panelStartsOpen(false, "1", false)).toBe(true);
    expect(panelStartsOpen(false, "0", true)).toBe(false);
    expect(panelStartsOpen(false, null, true)).toBe(true);
    expect(panelStartsOpen(false, null, false)).toBe(false);
  });
});

// A fake history: records the pushes and backs, and lets a test deliver the
// popstate the browser would send.
function rig() {
  const log: string[] = [];
  const hist = new SheetHistory(
    {
      push: (s) => log.push(`push:${JSON.stringify(s)}`),
      back: () => log.push("back"),
    },
    {
      close: () => log.push("close"),
      rewriteLink: () => log.push("rewrite"),
    }
  );
  return { hist, log };
}

describe("the sheet's history entry", () => {
  it("opening pushes one entry, once", () => {
    const { hist, log } = rig();
    hist.open();
    hist.open();
    expect(log).toEqual([`push:${JSON.stringify(SHEET_STATE)}`]);
    expect(hist.owned).toBe(true);
  });

  it("Back closes the sheet and writes the link again", () => {
    const { hist, log } = rig();
    hist.open();
    log.length = 0;
    hist.onPop();
    expect(log).toEqual(["close", "rewrite"]);
    expect(hist.owned).toBe(false);
  });

  it("a close by the button pops the entry and writes the link on the pop", () => {
    const { hist, log } = rig();
    hist.open();
    log.length = 0;
    hist.release();
    expect(log).toEqual(["back"]);
    expect(hist.owned).toBe(false);
    // The pop's event: the sheet is already closed; only the link is written.
    hist.onPop();
    expect(log).toEqual(["back", "rewrite"]);
  });

  it("releasing with no entry does nothing", () => {
    const { hist, log } = rig();
    hist.release();
    expect(log).toEqual([]);
  });

  it("a reopen before the button's pop arrives is not closed by it", () => {
    const { hist, log } = rig();
    hist.open();
    hist.release();
    hist.open();
    log.length = 0;
    // The first pop (ours) arrives while the sheet is open again.
    hist.onPop();
    expect(log).toEqual(["rewrite"]);
    expect(hist.owned).toBe(true);
    // The next one is the player's Back.
    log.length = 0;
    hist.onPop();
    expect(log).toEqual(["close", "rewrite"]);
  });

  it("a pop with no sheet open (Forward onto a stale entry, Back after a reload) only writes the link", () => {
    const { hist, log } = rig();
    hist.onPop();
    expect(log).toEqual(["rewrite"]);
    expect(hist.owned).toBe(false);
  });

  it("every pop of ours writes the link once, and a second Back closes nothing", () => {
    const { hist, log } = rig();
    hist.open();
    hist.onPop();
    hist.onPop();
    expect(log).toEqual([
      `push:${JSON.stringify(SHEET_STATE)}`,
      "close",
      "rewrite",
      "rewrite",
    ]);
  });
});
