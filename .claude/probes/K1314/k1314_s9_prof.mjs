// K1314 s9: self time per function from a V8 .cpuprofile, split by script (v_pre / v_mst / outline.ts),
// so two outline.ts versions profiled in one k1314_s9_fbench.ts run compare function by function.
//   node --cpu-prof --cpu-prof-dir=<dir> scripts/run_node.mjs .claude/probes/K1314/k1314_s9_fbench.ts only=pre,mst
//   node .claude/probes/K1314/k1314_s9_prof.mjs <file.cpuprofile> [top=30] [filter=cutFolds]
import { readFileSync } from "node:fs";
const [file, ...rest] = process.argv.slice(2);
const arg = (k, d) => rest.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
const top = +arg("top", "30"); const filter = arg("filter", "");
const P = JSON.parse(readFileSync(file, "utf8"));
const byId = new Map(P.nodes.map((n) => [n.id, n]));
const dt = new Map();
for (let i = 0; i < P.samples.length; i++) dt.set(P.samples[i], (dt.get(P.samples[i]) ?? 0) + (P.timeDeltas[i] ?? 0));
const tag = (url) => (url.includes("v_pre") ? "pre" : url.includes("v_mst") ? "mst" : url.includes("outline.ts") || url.includes("outline/outline") ? "cur" : null);
const self = new Map();
for (const [id, us] of dt) {
  const n = byId.get(id); const t = tag(n.callFrame.url); if (!t) continue;
  const k = n.callFrame.functionName || "(anon)";
  const e = self.get(k) ?? { pre: 0, mst: 0, cur: 0 }; e[t] += us / 1000; self.set(k, e);
}
const rows = [...self.entries()].filter(([k]) => !filter || k.includes(filter));
rows.sort((a, b) => Math.abs(b[1].mst - b[1].pre) - Math.abs(a[1].mst - a[1].pre));
const tot = { pre: 0, mst: 0, cur: 0 }; for (const [, e] of self) { tot.pre += e.pre; tot.mst += e.mst; tot.cur += e.cur; }
console.log(`total self ms  pre ${tot.pre.toFixed(0)}  mst ${tot.mst.toFixed(0)}  cur ${tot.cur.toFixed(0)}`);
for (const [k, e] of rows.slice(0, top)) console.log(`${k.padEnd(28)} pre ${e.pre.toFixed(1).padStart(8)}  mst ${e.mst.toFixed(1).padStart(8)}  cur ${e.cur.toFixed(1).padStart(8)}  d(mst-pre) ${(e.mst - e.pre).toFixed(1)}`);
