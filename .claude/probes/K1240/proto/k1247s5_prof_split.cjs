// K1247 s5: a .cpuprofile's time under cornersPhaseC, growIntegC, refineC and wOfC split by child,
// and the callers of footWinFast and footNearM.   node .claude/probes/K1240/proto/k1247s5_prof_split.cjs <dir>
const fs = require("fs"); const path = require("path");
const dir = process.argv[2]; const f = fs.readdirSync(dir).filter((x) => x.endsWith(".cpuprofile"))[0];
const P = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
const byId = new Map(P.nodes.map((n) => [n.id, n])); const parent = new Map(); for (const n of P.nodes) for (const c of n.children || []) parent.set(c, n.id);
const dt = P.timeDeltas; let tot = 0; for (const d of dt) tot += d || 0;
const nm = (id) => byId.get(id).callFrame.functionName || "(anon)";
// For a target T: time split by the child of T on the stack (or self), and callers of footWinFast.
const split = (T) => { const m = new Map(); let all = 0; for (let i = 0; i < P.samples.length; i++) { const d = dt[i] || 0; let id = P.samples[i]; let child = "(self)"; let hit = false; while (id !== undefined) { if (nm(id) === T) { hit = true; break; } child = nm(id); id = parent.get(id); } if (hit) { all += d; m.set(child, (m.get(child) || 0) + d); } } console.log(`${T}: ${(100 * all / tot).toFixed(1)}%`); for (const [k, v] of [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`   ${(100 * v / all).toFixed(1).padStart(5)}%  ${k}`); };
split("cornersPhaseC"); split("growIntegC"); split("refineC"); split("wOfC");
const callers = (T) => { const m = new Map(); for (let i = 0; i < P.samples.length; i++) { const d = dt[i] || 0; let id = P.samples[i]; while (id !== undefined && nm(id) !== T) id = parent.get(id); if (id === undefined) continue; let p = parent.get(id); const chain = []; while (p !== undefined && chain.length < 2) { chain.push(nm(p)); p = parent.get(p); } const k = chain.join(" < "); m.set(k, (m.get(k) || 0) + d); } console.log(`callers of ${T}:`); for (const [k, v] of [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`   ${(100 * v / tot).toFixed(2).padStart(5)}%  ${k}`); };
callers("footWinFast"); callers("footNearM");
