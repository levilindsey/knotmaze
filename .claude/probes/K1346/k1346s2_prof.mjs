// K1346 s2: self time per function from a V8 .cpuprofile (node --cpu-prof), master's outline_m2.ts against
// the branch's outline.ts side by side, matched by function name: where the branch's extra frame() time is.
//   node --cpu-prof --cpu-prof-dir=<dir> scripts/run_node.mjs .claude/probes/K1346/k1346s2_ab.ts <dragDir> rounds=8
//   node .claude/probes/K1346/k1346s2_prof.mjs <file.cpuprofile> [top=25]
import { readFileSync } from "node:fs";

const P = JSON.parse(readFileSync(process.argv[2], "utf8"));
const top = +(process.argv.find((a) => a.startsWith("top="))?.slice(4) ?? 25);
const self = new Map(); // node id -> us
for (let i = 0; i < P.samples.length; i++) self.set(P.samples[i], (self.get(P.samples[i]) ?? 0) + (P.timeDeltas[i] ?? 0));
const file = (u) => (/outline_m2\.ts/.test(u) ? "M" : /outline\/outline\.ts/.test(u) ? "B" : "");
const by = { M: new Map(), B: new Map() };
let other = 0;
for (const n of P.nodes) {
  const us = self.get(n.id) ?? 0; if (!us) continue;
  const f = file(n.callFrame.url);
  if (!f) { other += us; continue; }
  const k = n.callFrame.functionName || `(anon:${n.callFrame.lineNumber + 1})`;
  by[f].set(k, (by[f].get(k) ?? 0) + us);
}
const sum = (m) => [...m.values()].reduce((s, v) => s + v, 0);
console.log(`self ms: M ${(sum(by.M) / 1e3).toFixed(0)}  B ${(sum(by.B) / 1e3).toFixed(0)}  other ${(other / 1e3).toFixed(0)}`);
const keys = new Set([...by.M.keys(), ...by.B.keys()]);
const rows = [...keys].map((k) => [k, (by.M.get(k) ?? 0) / 1e3, (by.B.get(k) ?? 0) / 1e3]);
rows.sort((a, b) => Math.abs(b[2] - b[1]) - Math.abs(a[2] - a[1]));
console.log("function                         M ms     B ms    B-M");
for (const [k, m, b] of rows.slice(0, top)) console.log(`${k.slice(0, 30).padEnd(30)} ${m.toFixed(1).padStart(8)} ${b.toFixed(1).padStart(8)} ${(b - m >= 0 ? "+" : "") + (b - m).toFixed(1)}`);
