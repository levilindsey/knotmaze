// K782: the "Snared!" toast waits for the monster on the turn clock.
// toolTick in main.ts used to toast the frame a snare's phase flipped,
// while TurnMinotaur.progress was still walking the monster along the
// cut lastPath. Now it toasts only at rest (progress >= 1) or once a
// later turn has begun (turns past the growth turn, kept beside the
// baseline). A SOURCE SCAN, in the panel_rect.test.ts manner: building
// the app in Node is not worth it. The slice runs from toolTick's start
// to its first baseline assignment, so a gate elsewhere in the file
// cannot satisfy it.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const MAIN = readFileSync(
  fileURLToPath(new URL("../../src/main.ts", import.meta.url)),
  "utf8"
);

const start = MAIN.indexOf("const toolTick");
const end = MAIN.indexOf("snaresSprung = sprung", start);
const slice = MAIN.slice(start, end);

describe("K782: the Snared toast waits for the monster", () => {
  it("slices toolTick up to its baseline assignment", () => {
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    expect(slice).toContain("showToast");
    expect(slice).toContain("Snared!");
  });

  it("gates the toast on the turn's rest and on a later turn", () => {
    expect(slice).toContain("tm.progress >= 1");
    expect(slice).toMatch(/tm\.turns > snareSprungTurn/);
  });

  it("keeps the growth turn beside the sprung baseline", () => {
    const base = MAIN.indexOf("let snaresSprung = 0;");
    const kept = MAIN.indexOf("let snareSprungTurn = -1;");
    expect(base).toBeGreaterThanOrEqual(0);
    expect(kept).toBeGreaterThan(base);
    expect(kept).toBeLessThan(start);
  });
});
