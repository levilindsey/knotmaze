// K1362 s12: per bench and mode, net ms @ MHz per variant for def, muse_hash, fat.  node k1362s13_tab2.cjs <gpuclk json>
const J = JSON.parse(require("fs").readFileSync(process.argv[2], "utf8"));
const g = {};
for (const r of J.rows) { const k = r.bench + " " + r.mode; ((g[k] ??= {})[r.variant] ??= {})[r.scene] ??= []; g[k][r.variant][r.scene].push(r); }
for (const [k, vs] of Object.entries(g)) {
  console.log("== " + k);
  for (const [v, ss] of Object.entries(vs)) { if (v === "empty") continue; console.log("  " + v.padEnd(18) + ["def", "muse_hash", "fat"].map((s) => (ss[s] ?? []).map((r) => r.net.toFixed(2) + "@" + r.mhz).join(",").padEnd(16)).join("")); }
}

