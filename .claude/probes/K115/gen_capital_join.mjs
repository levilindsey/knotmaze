// K115 stage 6a offline census: derive CAPITAL_JOIN from the shipped
// Hershey Script data (src/core/hershey_script.ts) and print the table
// literal committed in src/core/text_graph.ts. Re-running must reproduce
// that table byte for byte (the unit test re-derives it the same way).
// Usage: node .claude/probes/K115/gen_capital_join.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const srcFile = path.resolve(here, "..", "..", "..", "src", "core", "hershey_script.ts");
const text = fs.readFileSync(srcFile, "utf8");
const start = text.indexOf("export const HERSHEY_SCRIPT");
const arrStart = text.indexOf("[", start);
const arrEnd = text.lastIndexOf("];");
if (start < 0 || arrStart < 0 || arrEnd < 0) throw new Error("HERSHEY_SCRIPT not found");
const glyphs = new Function(`return ${text.slice(arrStart, arrEnd + 1)};`)();

const band = (y) => (y <= -4 ? "HIGH" : y >= 6 ? "LOW" : "MID");
const lines = [];
for (let c = 65; c <= 90; c++) {
  const g = glyphs[c - 32];
  const entry = g.strokes[0][0];
  const last = g.strokes[g.strokes.length - 1];
  const exit = last[last.length - 1];
  const arrive = band(entry[1]) === "HIGH" ? "HIGH" : "LOW";
  const leave = band(exit[1]);
  lines.push(
    `  { arrive: "${arrive}", leave: "${leave}" }, // ${String.fromCharCode(c)} entry (${entry[0]},${entry[1]}) exit (${exit[0]},${exit[1]})`
  );
}
console.log(lines.join("\n"));
