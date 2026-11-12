// K1247 s18: top self-time functions of a .cpuprofile (node --cpu-prof), with total (inclusive) time.
//   node .claude/probes/K1247/k1247s18_prof.mjs <file.cpuprofile> [top=25] [filter]
import { readFileSync } from "node:fs";
const [, , file, topS, filter] = process.argv;
const p = JSON.parse(readFileSync(file, "utf8"));
const byId = new Map(p.nodes.map((n) => [n.id, n]));
const self = new Map(); const dt = new Map();
for (let i = 0; i < p.samples.length; i++) dt.set(p.samples[i], (dt.get(p.samples[i]) ?? 0) + (p.timeDeltas[i] ?? 0));
const parent = new Map(); for (const n of p.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
const name = (n) => `${n.callFrame.functionName || "(anon)"} ${(n.callFrame.url.split("/").pop() || "").split("?")[0]}:${n.callFrame.lineNumber + 1}`;
const total = new Map();
for (const [id, t] of dt) {
  const n = byId.get(id); const k = name(n); self.set(k, (self.get(k) ?? 0) + t);
  const seen = new Set(); let q = id;
  while (q !== undefined) { const kk = name(byId.get(q)); if (!seen.has(kk)) { seen.add(kk); total.set(kk, (total.get(kk) ?? 0) + t); } q = parent.get(q); }
}
const all = [...self.values()].reduce((a, b) => a + b, 0);
const rows = [...self].filter(([k]) => !filter || k.includes(filter)).sort((a, b) => b[1] - a[1]).slice(0, Number(topS ?? 25));
console.log(`total ${(all / 1000).toFixed(0)} ms`);
for (const [k, t] of rows) console.log(`${(t / 1000).toFixed(0).padStart(6)} self ${((total.get(k) ?? 0) / 1000).toFixed(0).padStart(6)} incl  ${k}`);
