// K1214 22M: tail table from tail22m out dirs (one per pair).
//   node table22m.mjs <outDir> [<outDir> ...]
// Per pair and build: means over the 4 ABBA rounds (control pair
// excluded) of p50 / p95 / p99, the max over rounds, frames over 2x
// the median summed over rounds, beside the pair's same-build
// control-pair p95 spread (the two round -1 pairbase loads).
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const f = (x, d = 2) => (x == null || !Number.isFinite(x) ? "-" : x.toFixed(d));
for (const dir of process.argv.slice(2)) {
  const data = JSON.parse(readFileSync(join(resolve(dir), "tail_all.json"), "utf8"));
  const ctrl = data.records.filter((r) => r.round < 0);
  const spread = ctrl.length === 2 ? Math.abs(ctrl[0].tail.p95 - ctrl[1].tail.p95) : NaN;
  console.log(`\n## ${data.pair} (${dir}; ${data.when})`);
  console.log(`| build | p50 | p95 | p99 | max | frames >2x median (sum) |`);
  for (const b of ["pairbase", "pairhead"]) {
    const rs = data.records.filter((r) => r.round >= 0 && r.build === b);
    console.log(`| ${b} | ${f(mean(rs.map((r) => r.tail.p50)))} | ${f(mean(rs.map((r) => r.tail.p95)))} | ${f(mean(rs.map((r) => r.tail.p99)))} | ${f(Math.max(...rs.map((r) => r.tail.max)), 1)} | ${rs.reduce((s, r) => s + r.tail.over2x, 0)} |`);
  }
  const hb = ["p50", "p95", "p99"].map((k) => {
    const bm = mean(data.records.filter((r) => r.round >= 0 && r.build === "pairbase").map((r) => r.tail[k]));
    const hm = mean(data.records.filter((r) => r.round >= 0 && r.build === "pairhead").map((r) => r.tail[k]));
    return `${k} ${f(hm - bm, 2, true)}`;
  });
  console.log(`head-base: ${hb.join(", ")}; control-pair p95 spread ${f(spread)}`);
}
