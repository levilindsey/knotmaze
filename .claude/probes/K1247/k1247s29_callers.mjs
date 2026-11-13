// K1247 s29: who calls a function: its self + child time per caller chain (two levels up).
//   node .claude/probes/K1247/k1247s29_callers.mjs <file.cpuprofile> <fnName> [div=100]
import { readFileSync } from "node:fs";
const [file, fn, ...rest] = process.argv.slice(2);
const div = +(rest.find((a) => a.startsWith("div="))?.slice(4) ?? "100");
const P = JSON.parse(readFileSync(file, "utf8"));
const byId = new Map(P.nodes.map((n) => [n.id, n])); const parent = new Map();
for (const n of P.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
const dt = new Map();
for (let i = 0; i < P.samples.length; i++) dt.set(P.samples[i], (dt.get(P.samples[i]) ?? 0) + (P.timeDeltas[i] ?? 0));
const nm = (n) => `${n.callFrame.functionName || "(anon)"}@${n.callFrame.url.split("/").pop().replace(/\?.*/, "")}`;
const acc = new Map();
for (const [id, us] of dt) {
  let c = id; let hit = null;
  for (; c !== undefined; c = parent.get(c)) if (byId.get(c).callFrame.functionName === fn) hit = c;
  if (hit === null) continue;
  const p1 = parent.get(hit); const p2 = p1 !== undefined ? parent.get(p1) : undefined; const p3 = p2 !== undefined ? parent.get(p2) : undefined;
  const k = [p1, p2, p3].filter((x) => x !== undefined).map((x) => nm(byId.get(x))).join(" < ");
  acc.set(k, (acc.get(k) ?? 0) + us / 1000);
}
for (const [k, v] of [...acc].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`${(v / div).toFixed(3).padStart(8)}  ${k}`);
