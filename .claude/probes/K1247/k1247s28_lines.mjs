// K1247 s28: a .cpuprofile's hot lines (positionTicks) in one file, with the transformed code's text.
//   node .claude/probes/K1247/k1247s28_lines.mjs <file.cpuprofile> <urlSubstring> <transformed.js> [top=40] [fnFilter]
import { readFileSync } from "node:fs";
const [, , file, sub, codeFile, topS = "40", fnF] = process.argv;
const p = JSON.parse(readFileSync(file, "utf8"));
const code = readFileSync(codeFile, "utf8").split("\n");
const tick = new Map(); let total = 0;
for (const n of p.nodes) {
  if (!n.callFrame.url.includes(sub)) continue;
  if (fnF && !new RegExp(fnF).test(n.callFrame.functionName)) continue;
  for (const t of n.positionTicks ?? []) { tick.set(t.line, (tick.get(t.line) ?? 0) + t.ticks); total += t.ticks; }
}
console.log(`ticks ${total}`);
const rows = [...tick].sort((a, b) => b[1] - a[1]).slice(0, Number(topS));
for (const [ln, t] of rows) console.log(`${String(t).padStart(6)} ${String(ln).padStart(5)}  ${(code[ln - 1] ?? "").trim().slice(0, 150)}`);
