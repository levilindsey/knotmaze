// K1247 s2: the hottest lines of a .cpuprofile (positionTicks), with their
// text from the module as Vite's SSR transform served it (k1247s2_xf.mjs).
//   node .claude/probes/K1240/proto/k1247s2_lines.mjs <file.cpuprofile> <xf.js> [top=40] [fnA,fnB,...]
import { readFileSync } from "node:fs";
const prof = JSON.parse(readFileSync(process.argv[2], "utf8"));
const src = readFileSync(process.argv[3], "utf8").split(/\r?\n/);
const top = +(process.argv[4] ?? 40);
const only = process.argv[5] ? new Set(process.argv[5].split(",")) : null;
const iv = (prof.endTime - prof.startTime) / Math.max(1, prof.samples.length);
const lines = new Map();
for (const n of prof.nodes) {
  if (!n.callFrame.url.includes("outline")) continue;
  if (only && !only.has(n.callFrame.functionName)) continue;
  for (const pt of n.positionTicks ?? []) {
    const k = `${n.callFrame.functionName}:${pt.line}`;
    lines.set(k, (lines.get(k) ?? 0) + pt.ticks);
  }
}
for (const [k, v] of [...lines].sort((a, b) => b[1] - a[1]).slice(0, top)) {
  const ln = +k.split(":")[1];
  console.log(`${((v * iv) / 1000).toFixed(1).padStart(7)} ms  ${k.padEnd(24)} ${(src[ln - 1] ?? "").trim().slice(0, 110)}`);
}
