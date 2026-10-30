// K923: pool sync.mjs results across runs. Each run's own floor is
// subtracted first (its table's dMedian / dP95), then runs are averaged
// per (cell, variant), weighted by their rounds.
//   node scripts/k923/pool.mjs sync_phone_fit.json sync_phone_diag.json ...
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const acc = new Map();
for (const f of process.argv.slice(2)) {
  const r = JSON.parse(readFileSync(f, "utf8"));
  for (const t of r.table) {
    if (t.v === "floor") continue;
    const k = `${t.cell}|${t.v}`, n = String(t.rounds).split("/").length;
    if (!acc.has(k)) acc.set(k, { cell: t.cell, v: t.v, n: 0, d50: 0, d95: 0, files: [], lost: 0 });
    const a = acc.get(k);
    a.n += n; a.d50 += t.dMedian * n; a.d95 += t.dP95 * n; a.lost += t.lost; a.files.push(basename(f, ".json").replace(/^sync_phone_?/, "") + ` ${t.dMedian}`);
  }
}
console.log("| cell | variant | median - floor | p95 - floor | rounds | per run (median - floor) | lost |\n|---|---|---|---|---|---|---|");
for (const a of acc.values()) console.log(`| ${a.cell} | ${a.v} | ${(a.d50 / a.n).toFixed(2)} | ${(a.d95 / a.n).toFixed(2)} | ${a.n} | ${a.files.join(", ")} | ${a.lost} |`);
