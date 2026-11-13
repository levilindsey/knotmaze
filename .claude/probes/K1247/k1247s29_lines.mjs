// K1247 s29: line-level self time inside one function, from a V8 .cpuprofile's positionTicks. Lines are
// of the transformed module (vite's oxc TS output, which run_node's vite SSR keeps line for line, give or
// take a few), so the tool prints the oxc-transformed line text next to each count.
//   node .claude/probes/K1247/k1247s29_lines.mjs <file.cpuprofile> <src.ts> <fnName> [top=25] [div=100] [shift=0]
import { readFileSync } from "node:fs";
import * as vite from "vite";
const [file, srcPath, fn, ...rest] = process.argv.slice(2);
const arg = (k, d) => rest.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
const top = +arg("top", "25"); const div = +arg("div", "100"); const shift = +arg("shift", "0");
const P = JSON.parse(readFileSync(file, "utf8"));
const base = srcPath.replace(/\\/g, "/").split("/").pop();
const per = P.timeDeltas.reduce((a, b) => a + b, 0) / P.samples.length / 1000; // ms per tick
const lines = new Map(); let tot = 0;
for (const n of P.nodes) {
  if (n.callFrame.functionName !== fn || !n.callFrame.url.includes(base)) continue;
  for (const t of n.positionTicks ?? []) { lines.set(t.line, (lines.get(t.line) ?? 0) + t.ticks); tot += t.ticks; }
}
const js = (await vite.transformWithOxc(readFileSync(srcPath, "utf8"), srcPath, { lang: "ts" })).code.split("\n");
console.log(`${fn}: ${((tot * per) / div).toFixed(3)} ms self per rep`);
for (const [l, t] of [...lines].sort((a, b) => b[1] - a[1]).slice(0, top))
  console.log(`${((t * per) / div).toFixed(3).padStart(7)} L${String(l).padStart(5)}  ${(js[l - 1 + shift] ?? "").trim().slice(0, 150)}`);

