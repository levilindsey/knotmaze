// K188 (Run F): a solve restart drops the confetti. restartSolve is
// the one restart (Reset path, a clock change, a catch's carry
// restart); it must clear the layer first, so pieces from a win do
// not fall over the fresh solve. A SOURCE SCAN, in the
// panel_rect.test.ts manner: building the app in Node is not worth
// it, and a clear elsewhere in main.ts must not satisfy this.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const MAIN = readFileSync(
  fileURLToPath(new URL("../../src/main.ts", import.meta.url)),
  "utf8"
);

function restartSolveBody(src: string): string {
  const start = src.indexOf("const restartSolve");
  expect(start).toBeGreaterThanOrEqual(0);
  const end = src.indexOf("\n  };", start);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end);
}

describe("K188: restartSolve drops the confetti", () => {
  it("clears the confetti inside restartSolve", () => {
    expect(restartSolveBody(MAIN)).toMatch(/confetti\.clear\(\)/);
  });

  it("clears as restartSolve's first statement", () => {
    const body = restartSolveBody(MAIN);
    const lines = body.split("\n").map((l) => l.trim());
    const open = lines.findIndex((l) => l.includes("=> {"));
    const first = lines.slice(open + 1).find((l) => l.length > 0);
    expect(first).toBe("confetti.clear();");
  });
});
