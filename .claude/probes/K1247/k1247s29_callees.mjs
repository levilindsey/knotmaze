// K1247 s29: a function's callees: time under it by the first function below it (self = the function itself).
//   node .claude/probes/K1247/k1247s29_callees.mjs <file.cpuprofile> <fnName> [div=100]
import { readFileSync } from "node:fs";
const [file, fn, ...rest] = process.argv.slice(2);
const div = +(rest.find((a) => a.startsWith("div="))?.slice(4) ?? "100");
const P = JSON.parse(readFileSync(file, "utf8"));
const byId = new Map(P.nodes.map((n) => [n.id, n])); const parent = new Map();
for (const n of P.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
const dt = new Map();
for (let i = 0; i < P.samples.length; i++) dt.set(P.samples[i], (dt.get(P.samples[i]) ?? 0) + (P.timeDeltas[i] ?? 0));
const acc = new Map(); let tot = 0;
for (const [id, us] of dt) {
  let below = null; let hit = false;
  for (let c = id; c !== undefined; c = parent.get(c)) { if (byId.get(c).callFrame.functionName === fn) { hit = true; break; } below = c; }
  if (!hit) continue;
  const k = below === null ? "(self)" : byId.get(below).callFrame.functionName || "(anon)";
  acc.set(k, (acc.get(k) ?? 0) + us / 1000); tot += us / 1000;
}
console.log(`${fn}: ${(tot / div).toFixed(3)} ms per rep`);
for (const [k, v] of [...acc].sort((a, b) => b[1] - a[1]).slice(0, 10)) console.log(`${(v / div).toFixed(3).padStart(8)}  ${k}`);
