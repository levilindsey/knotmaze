// K1283 s10: top self-time functions of a .cpuprofile (node --cpu-prof), with their file:line.
//   node .claude/probes/K1240/proto/k1283s10_prof.mjs <file.cpuprofile> [top=25] [filter]
import { readFileSync } from "node:fs";
const [file, topS, filter] = process.argv.slice(2);
const top = Number(topS ?? 25);
const p = JSON.parse(readFileSync(file, "utf8"));
const byId = new Map(p.nodes.map((n) => [n.id, n]));
const self = new Map();
const dt = p.timeDeltas; let total = 0;
for (let i = 0; i < p.samples.length; i++) {
  const n = byId.get(p.samples[i]); const d = dt[i] ?? 0; total += d;
  const cf = n.callFrame; const key = `${cf.functionName || "(anon)"} ${cf.url.split("/").pop()}:${cf.lineNumber + 1}`;
  self.set(key, (self.get(key) ?? 0) + d);
}
const rows = [...self.entries()].filter(([k]) => !filter || k.includes(filter)).sort((a, b) => b[1] - a[1]).slice(0, top);
console.log(`total ${(total / 1000).toFixed(0)} ms`);
for (const [k, v] of rows) console.log(`${(v / 1000).toFixed(1).padStart(8)} ms ${(100 * v / total).toFixed(1).padStart(5)}% ${k}`);
// --callers=<fn>: that function's self time by caller (parent call frame).
const cw = process.argv.find((a) => a.startsWith("--callers="))?.slice(10);
if (cw) {
  const parent = new Map(); for (const n of p.nodes) for (const c of n.children ?? []) parent.set(c, n);
  const by = new Map();
  for (let i = 0; i < p.samples.length; i++) {
    const n = byId.get(p.samples[i]); if (n.callFrame.functionName !== cw) continue;
    const q = parent.get(n.id); const cf = q?.callFrame; const key = cf ? `${cf.functionName || "(anon)"} ${cf.url.split("/").pop()}:${cf.lineNumber + 1}` : "?";
    by.set(key, (by.get(key) ?? 0) + (dt[i] ?? 0));
  }
  for (const [k, v] of [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`  ${cw} <- ${k}: ${(v / 1000).toFixed(1)} ms`);
}
