// K1283 s4: two census runs crossing by crossing (out/k1279/census_<tag>.json): how many got worse or
// better by more than tol px, the worst regressions and the best gains, and named spots.
//   node .claude/probes/K1240/proto/k1283s4_cmp.mjs <tagBefore> <tagAfter> [tol=12] [spot,...]
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const [tb, ta, tols, spots] = process.argv.slice(2);
const tol = Number(tols ?? 12);
const load = (tag) => JSON.parse(readFileSync(join(here, "..", "out", "k1279", `census_${tag}.json`), "utf8"));
const B = load(tb); const A = load(ta);
const rows = (J) => {
  const list = J.rows;
  const m = new Map();
  for (const r of list) m.set(`${r.scene} x${r.xi}`, r);
  return m;
};
const mb = rows(B); const ma = rows(A);
const first = [...mb.values()][0];
console.log("row keys:", Object.keys(first).join(", "));
const tot = (r) => r.total ?? (r.ink ?? 0) + (r.fill ?? 0);
let worse = 0; let better = 0; const d = [];
for (const [k, rb] of mb) { const ra = ma.get(k); if (!ra) continue; const dd = tot(ra) - tot(rb); d.push([k, tot(rb), tot(ra), dd]); if (dd > tol) worse++; if (dd < -tol) better++; }
d.sort((p, q) => q[3] - p[3]);
console.log(`${d.length} crossings compared; worse by > ${tol}: ${worse}, better by > ${tol}: ${better}`);
console.log("most worse:", d.slice(0, 6).map((r) => `${r[0]} ${r[1].toFixed(1)} -> ${r[2].toFixed(1)}`).join("; "));
console.log("most better:", d.slice(-6).reverse().map((r) => `${r[0]} ${r[1].toFixed(1)} -> ${r[2].toFixed(1)}`).join("; "));
for (const s of (spots ?? "").split(",").filter(Boolean)) { const r = d.find((q) => q[0] === s); if (r) console.log(`${s}: ${r[1].toFixed(1)} -> ${r[2].toFixed(1)}`); }
