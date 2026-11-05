// K292 (Run F, K1189 batch 18): the corner marks show for everyone
// since Levi's yes (2026-11-04) - no gate - and the Seed row is marked
// too. A SOURCE SCAN of src/ui/tweakpane_panel.ts, in the manner of
// test/ui/panel_rows.test.ts (building Tweakpane in Node is not worth
// it): the live behaviour is censused by .claude/probes/K292/dogear.mjs.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const PANEL = readFileSync(
  fileURLToPath(new URL("../../src/ui/tweakpane_panel.ts", import.meta.url)),
  "utf8"
);

describe("K292: the corner marks are ungated", () => {
  it("has no gate attribute anywhere", () => {
    expect(PANEL).not.toContain("data-dogear");
  });

  it("never hides the key line", () => {
    expect(PANEL).not.toMatch(/\.kp-dogear-key\{[^}]*display\s*:\s*none/);
    expect(PANEL).toContain('".kp-dogear-key{display:flex;');
  });

  it("draws the triangle with an ungated rule", () => {
    expect(PANEL).toContain('".kp-row.kp-design::after{');
  });
});

describe("K292: the Seed row is marked, the Daily button is not", () => {
  // Slice each hand build, so a match elsewhere in the file (row()'s
  // own marking, say) cannot satisfy either half.
  const seedStart = PANEL.indexOf("fDesign.addBinding(seedView");
  const seedEnd = PANEL.indexOf("// DAILY ROW", seedStart);
  const seedBuild = PANEL.slice(seedStart, seedEnd);
  const dailyStart = PANEL.indexOf("const dailyApi = fDesign.addButton");
  const dailyEnd = PANEL.indexOf("// --- Game", dailyStart);
  const dailyBuild = PANEL.slice(dailyStart, dailyEnd);

  it("finds both hand builds", () => {
    expect(seedStart).toBeGreaterThan(-1);
    expect(seedEnd).toBeGreaterThan(seedStart);
    expect(dailyStart).toBeGreaterThan(-1);
    expect(dailyEnd).toBeGreaterThan(dailyStart);
  });

  it("marks the Seed row with key seed", () => {
    expect(seedBuild).toContain('"kp-design"');
    expect(seedBuild).toContain('dataset.kpKey = "seed"');
  });

  it("leaves the Daily button unmarked", () => {
    expect(dailyBuild).not.toContain("kp-design");
    expect(dailyBuild).not.toContain("kpKey");
  });
});
