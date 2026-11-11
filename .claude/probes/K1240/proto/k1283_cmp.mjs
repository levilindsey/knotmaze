// K1283 s2: compare two census runs (out/k1279/census_<tag>.json) crossing by crossing.
// Usage: node .claude/probes/K1240/proto/k1283_cmp.mjs <tagBefore> <tagAfter> [--worse=12] [--top=12]
import { readFileSync } from "node:fs";
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? Number(a.split("=")[1]) : d; };
const [b, a] = args.filter((x) => !x.startsWith("--"));
const dir = new URL("../out/k1279/", import.meta.url);
const load = (t) => JSON.parse(readFileSync(new URL(`census_${t}.json`, dir), "utf8")).rows;
const B = load(b); const A = load(a);
const key = (r) => `${r.scene}:x${r.xi}`;
const mb = new Map(B.map((r) => [key(r), r]));
const worse = opt("worse", 12); const top = opt("top", 12);
const d = A.map((r) => ({ k: key(r), a: r.total, b: mb.get(key(r))?.total ?? NaN, ink: r.ink - (mb.get(key(r))?.ink ?? 0), fill: r.fill - (mb.get(key(r))?.fill ?? 0) })).filter((x) => Number.isFinite(x.b));
d.forEach((x) => { x.d = x.a - x.b; });
const sum = (f) => d.reduce((s, x) => s + f(x), 0);
console.log(`${b} -> ${a}: total ${sum((x) => x.b).toFixed(0)} -> ${sum((x) => x.a).toFixed(0)}; worse by > ${worse} px: ${d.filter((x) => x.d > worse).length}; better by > ${worse}: ${d.filter((x) => x.d < -worse).length}`);
const show = (xs) => xs.map((x) => `${x.k} ${x.b.toFixed(0)}->${x.a.toFixed(0)} (ink ${x.ink >= 0 ? "+" : ""}${x.ink.toFixed(0)}, fill ${x.fill >= 0 ? "+" : ""}${x.fill.toFixed(0)})`).join("\n  ");
console.log(`worst changes:\n  ${show([...d].sort((p, q) => q.d - p.d).slice(0, top))}`);
console.log(`best changes:\n  ${show([...d].sort((p, q) => p.d - q.d).slice(0, top))}`);
