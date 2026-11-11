// K1283: which census crossings that still differ from form B sit next to a
// failed corner (ok false), by the corner's reason. src's table (import from src).
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1283_failed.ts [census_<tag>.json] [--tol=12]
// The census json is out/k1279/census_<tag>.json (default k1283s1). A row
// "differs" when its total > tol; it is "near" a failed corner when the
// corner's V is within the row's R (the census disk) of the crossing.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as O from "../../../../src/render/outline/outline";
import { loadScene } from "./k1279_census";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const tol = Number(args.find((a) => a.startsWith("--tol="))?.slice(6) ?? 12);
const file = args.find((a) => !a.startsWith("--")) ?? "census_k1283s1.json";
type Row = { scene: string; xi: number; x: number; y: number; R: number; ink: number; fill: number; total: number; jn: boolean };
const cen = JSON.parse(readFileSync(join(here, "../out/k1279", file), "utf8")) as { rows: Row[] };
const scenes = [...new Set(cen.rows.map((r) => r.scene))];
const tally = new Map<string, { n: number; px: number; worst: string[] }>();
const add = (k: string, r: Row): void => {
  const t = tally.get(k) ?? { n: 0, px: 0, worst: [] };
  t.n++; t.px += r.total; t.worst.push(`${r.scene}:x${r.xi} ${r.total.toFixed(0)}`);
  tally.set(k, t);
};
let nFailed = 0; const failedWhy = new Map<string, number>();
for (const name of scenes) {
  const scene = loadScene(name);
  const t = O.frame(O.structure(scene), scene);
  const bad = t.corners.map((k, ci) => ({ k, ci })).filter((e) => !e.k.ok);
  nFailed += bad.length;
  for (const e of bad) { const w = (e.k as { why?: string }).why ?? "?"; failedWhy.set(w, (failedWhy.get(w) ?? 0) + 1); }
  for (const r of cen.rows.filter((q) => q.scene === name && q.total > tol)) {
    const near = bad.filter((e) => Math.hypot(e.k.Vx - r.x, e.k.Vy - r.y) < r.R);
    if (near.length === 0) { add(r.jn ? "junction, no failed corner" : "no junction", r); continue; }
    const whys = [...new Set(near.map((e) => (e.k as { why?: string }).why ?? "?"))].sort().join(" + ");
    add(`failed: ${whys}`, r);
  }
}
console.log(`${file}: failed corners ${nFailed} (${[...failedWhy].map(([w, n]) => `${w} ${n}`).join(", ")})`);
console.log(`crossings over ${tol} px, by the failed corners within R:`);
for (const [k, t] of [...tally].sort((a, b) => b[1].px - a[1].px)) {
  const w = t.worst.sort((a, b) => Number(b.split(" ")[1]) - Number(a.split(" ")[1])).slice(0, 6).join(", ");
  console.log(`  ${k}: ${t.n} crossings, ${t.px.toFixed(0)} px; worst ${w}`);
}
