// K1247 s2: self/total time per function from a .cpuprofile (node --cpu-prof).
//   node .claude/probes/K1240/proto/k1247s2_cpuagg.mjs <file.cpuprofile> [top=40]
import { readFileSync } from "node:fs";
const prof = JSON.parse(readFileSync(process.argv[2], "utf8"));
const top = +(process.argv[3] ?? 40);
const byId = new Map(prof.nodes.map((n) => [n.id, n]));
const self = new Map();
const dt = prof.timeDeltas;
const counts = new Map();
for (let i = 0; i < prof.samples.length; i++) counts.set(prof.samples[i], (counts.get(prof.samples[i]) ?? 0) + (dt[i] ?? 0));
const key = (n) => `${n.callFrame.functionName || "(anon)"}:${n.callFrame.lineNumber + 1}`;
const parent = new Map();
for (const n of prof.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
const total = new Map();
let all = 0;
for (const [id, us] of counts) {
  const n = byId.get(id);
  const k = key(n);
  self.set(k, (self.get(k) ?? 0) + us);
  all += us;
  const seen = new Set();
  let cur = id;
  while (cur !== undefined) {
    const kk = key(byId.get(cur));
    if (!seen.has(kk)) { seen.add(kk); total.set(kk, (total.get(kk) ?? 0) + us); }
    cur = parent.get(cur);
  }
}
const rows = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, top);
console.log(`all ${(all / 1000).toFixed(0)} ms`);
for (const [k, us] of rows) console.log(`${(us / 1000).toFixed(1).padStart(8)} self ${((total.get(k) ?? 0) / 1000).toFixed(1).padStart(8)} total  ${k}`);
