// K1290: per-crossing difference of two k1279 census runs (out/k1279/census_<tag>.json).
//   node .claude/probes/K1240/proto/k1290_censusdiff.mjs <tagA> <tagB> [top=10]
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "out", "k1279");
const [a, b, topS] = process.argv.slice(2);
const top = Number(topS ?? 10);
const load = (t) => { const j = JSON.parse(readFileSync(join(dir, `census_${t}.json`), "utf8")); return Array.isArray(j) ? j : j.rows ?? j.crossings ?? Object.values(j).find(Array.isArray); };
const A = load(a); const B = load(b);
const key = (r) => `${r.scene}#${r.xi}`;
const mA = new Map(A.map((r) => [key(r), r]));
const d = B.map((r) => ({ r, a: mA.get(key(r))?.total ?? 0, dt: r.total - (mA.get(key(r))?.total ?? 0) })).filter((x) => Math.abs(x.dt) > 0.05);
d.sort((u, v) => v.dt - u.dt);
const sum = d.reduce((s, x) => s + x.dt, 0);
console.log(`${d.length} crossings changed, net ${sum.toFixed(1)} px; up ${d.filter((x) => x.dt > 0).reduce((s, x) => s + x.dt, 0).toFixed(1)}, down ${d.filter((x) => x.dt < 0).reduce((s, x) => s + x.dt, 0).toFixed(1)}`);
const fmt = (x) => `  ${x.r.scene} x${x.r.xi} (${x.r.x.toFixed(3)}, ${x.r.y.toFixed(3)}) ${x.a.toFixed(1)} -> ${x.r.total.toFixed(1)} (${x.dt > 0 ? "+" : ""}${x.dt.toFixed(1)})`;
console.log("worse:"); d.slice(0, top).forEach((x) => console.log(fmt(x)));
console.log("better:"); d.slice(-top).reverse().forEach((x) => console.log(fmt(x)));
