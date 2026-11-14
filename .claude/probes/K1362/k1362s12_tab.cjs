// K1362 s11: tabulate k1362s12_gpuclk JSON (k1362s12_sum.mjs reads only desktop JSON): sync4 p50 net of the bench's empty, @ MHz,
// per variant (repeats comma-separated) for def, muse_hash and fat.   node .claude/probes/K1362/k1362s12_tab.cjs out/s12/gpuclk_<cfg>.json ...
const fs = require("fs");
for (const f of process.argv.slice(2)) {
  const J = JSON.parse(fs.readFileSync(f, "utf8"));
  const g = {};
  for (const r of J.rows) { if (r.mode !== "sync4") continue; const k = r.bench + "|" + r.scene; (g[k] ??= {})[r.variant] ??= []; g[k][r.variant].push(r); }
  console.log("== " + f.split(/[\\/]/).pop());
  const scenes = {}; for (const k of Object.keys(g)) { const [b, s] = k.split("|"); for (const [v, rs] of Object.entries(g[k])) { const e = g[k].empty?.[0]?.p50 ?? 0; (scenes[v] ??= {})[s] = rs.map((r) => (r.p50 - e).toFixed(2) + "@" + r.mhz).join(","); } }
  for (const [v, ss] of Object.entries(scenes)) if (v !== "empty") console.log("  " + v.padEnd(28) + ["def", "muse_hash", "fat"].map((s) => (ss[s] ?? "-").padEnd(22)).join(""));
}