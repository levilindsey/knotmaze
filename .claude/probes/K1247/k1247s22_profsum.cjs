// K1247 s22: self time by function (and file) from a .cpuprofile, top N, optionally filtered by file substring.
//   node .claude/probes/K1247/k1247s22_profsum.cjs <file.cpuprofile> [N=25] [fileFilter]
const fs = require("fs");
const [, , f, nArg, filt] = process.argv;
const P = JSON.parse(fs.readFileSync(f, "utf8"));
const self = new Map(); const byId = new Map();
for (const n of P.nodes) byId.set(n.id, n);
const dt = new Map();
for (let i = 0; i < P.samples.length; i++) dt.set(P.samples[i], (dt.get(P.samples[i]) || 0) + (P.timeDeltas[i] || 0));
let total = 0;
for (const n of P.nodes) {
  const t = (dt.get(n.id) || 0) / 1000; total += t;
  const cf = n.callFrame; const file = (cf.url || "").split("/").pop();
  if (filt && !file.includes(filt)) continue;
  const k = `${cf.functionName || "(anon)"} ${file}:${cf.lineNumber + 1}`;
  self.set(k, (self.get(k) || 0) + t);
}
const rows = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, Number(nArg || 25));
console.log(`total ${total.toFixed(0)} ms`);
for (const [k, t] of rows) console.log(`${t.toFixed(1).padStart(8)} ${k}`);
