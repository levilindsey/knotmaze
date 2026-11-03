// K1081: one panel-rect read a frame. The button ticks in main.ts used
// to read the panel wrapper's rect themselves (a forced layout per
// tick); now the camera's readPanel is the only reader and the ticks
// take its cached box (panelCssRect). A SOURCE SCAN, in the
// panel_rows.test.ts manner: building the app in Node is not worth it.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const MAIN = readFileSync(
  fileURLToPath(new URL("../../src/main.ts", import.meta.url)),
  "utf8"
);
const CAMERA = readFileSync(
  fileURLToPath(new URL("../../src/app/camera.ts", import.meta.url)),
  "utf8"
);

describe("K1081: one panel-rect read a frame", () => {
  it("reads the panel rect only in the camera", () => {
    expect(MAIN.includes("getBoundingClientRect")).toBe(false);
    expect([...CAMERA.matchAll(/getBoundingClientRect/g)]).toHaveLength(1);
  });

  it("serves the ticks the camera's cached box", () => {
    expect(CAMERA).toContain("panelCssRect");
    expect(MAIN).toContain("camera.panelCssRect()");
  });
});
