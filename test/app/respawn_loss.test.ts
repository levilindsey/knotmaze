// K685: a respawn into stranded (fragile) or out of strokes (strict
// par) queues its loss banner with collapse off. Both catch sites in
// main.ts (tickChase's endCaught and the turn catch) respawn, then
// queue pendingLoss from ruleLoss.over() — the collapseOn gate that
// hid the banner until the next tap is gone. A SOURCE SCAN, in the
// panel_rect.test.ts manner: building the app in Node is not worth it.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const MAIN = readFileSync(
  fileURLToPath(new URL("../../src/main.ts", import.meta.url)),
  "utf8"
);

describe("K685: a respawn queues its rule loss, collapse off or on", () => {
  it("both catch sites respawn and queue the loss with no collapseOn gate", () => {
    expect(MAIN.match(/fc\.respawn\(params\.minoRefog\);/g)).toHaveLength(2);
    const lossLines = MAIN.split("\n").filter(
      (l) => l.includes("ruleLoss.over()") && l.includes("pendingLoss = true")
    );
    expect(lossLines).toHaveLength(2);
    for (const line of lossLines) {
      expect(line).toContain("ruleLoss.over()");
      expect(line).not.toContain("collapseOn");
    }
    expect(MAIN).not.toContain("collapseOn && ruleLoss.over()");
  });

  it("keeps the solved -> pendingWin order above the loss queue", () => {
    expect(MAIN.match(/if \(fc\.solved\) pendingWin = true;/g)).toHaveLength(2);
  });
});
