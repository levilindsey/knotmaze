// K1247 s5: a .cpuprofile's self and inclusive time by function. Take one with
//   node --cpu-prof --cpu-prof-dir=<dir> --cpu-prof-interval 100 scripts/run_node.mjs .claude/probes/K1240/proto/<bench>.ts
//   node .claude/probes/K1240/proto/k1247s5_prof_sum.cjs <dir>
const fs = require("fs"); const path = require("path");
const dir = process.argv[2]; const f = fs.readdirSync(dir).filter((x) => x.endsWith(".cpuprofile"))[0];
const P = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
const byId = new Map(P.nodes.map((n) => [n.id, n]));
const self = new Map(); const dt = P.timeDeltas; let tot = 0;
for (let i = 0; i < P.samples.length; i++) { const n = byId.get(P.samples[i]); const d = dt[i] || 0; tot += d; const cf = n.callFrame; const key = `${cf.functionName || "(anon)"} ${path.basename(cf.url || "")}:${cf.lineNumber + 1}`; self.set(key, (self.get(key) || 0) + d); }
// inclusive for a few names
const parent = new Map(); for (const n of P.nodes) for (const c of n.children || []) parent.set(c, n.id);
const incl = new Map(); const want = ["growCornerC", "advanceToC", "wOfC", "marginOfC", "footNearM", "corners", "frame"];
for (let i = 0; i < P.samples.length; i++) { const d = dt[i] || 0; let id = P.samples[i]; const seen = new Set(); while (id !== undefined) { const n = byId.get(id); const nm = n.callFrame.functionName; if (!seen.has(nm)) { seen.add(nm); incl.set(nm, (incl.get(nm) || 0) + d); } id = parent.get(id); } }
const rows = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
console.log(`total ${(tot / 1000).toFixed(0)} ms`);
for (const [k, v] of rows) console.log(`${(100 * v / tot).toFixed(1).padStart(5)}%  ${k}`);
console.log("inclusive:"); for (const [k, v] of [...incl.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log(`${(100 * v / tot).toFixed(1).padStart(5)}%  ${k}`);
