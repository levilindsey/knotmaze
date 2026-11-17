// K1433: totals over the scan JSONs and a seeded stratified sample of master finds.
import { readFileSync, readdirSync } from "node:fs";
const dir = ".claude/probes/K1433/out/scan"; const want: Record<string, number> = { "rthin:plain": 5, "rbreak:plain": 3, "dstray:tie": 3, "rstray:tie": 2, "dbreak:tie": 2, "rbreak:tie": 1, "rthin:tie": 2, "rstray:ramp": 1, "rstray:plain": 1 };
let seed = 1433; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const tot: Record<string, Record<string, number>> = {}; const sites: Record<string, number> = {}; const pool: Record<string, any[]> = {};
for (const f of readdirSync(dir).filter((x) => /_(master|tubes|smooth)\.json$/.test(x)).sort()) {
  const j = JSON.parse(readFileSync(`${dir}/${f}`, "utf8")); const m = j.mode; tot[m] ??= {}; const hT = j.scene.startsWith("muse_hash") ? 0.4 : 0.3; const seen: number[][] = [];
  for (const q of j.finds) { const k = `${q.kind}:${q.cls}`; tot[m][k] = (tot[m][k] ?? 0) + 1; tot[m].all = (tot[m].all ?? 0) + 1;
    if (!seen.some((s) => Math.hypot(s[0] - q.x, s[1] - q.y) < hT)) { seen.push([q.x, q.y]); sites[m] = (sites[m] ?? 0) + 1; }
    if (m === "master") (pool[k] ??= []).push({ scene: j.scene, ...q }); }
}
console.log(JSON.stringify(tot)); console.log("sites", JSON.stringify(sites));
const out: string[] = []; for (const k of Object.keys(want)) { const p = pool[k] ?? []; for (let i = 0; i < want[k] && p.length; i++) { const q = p.splice(Math.floor(rnd() * p.length), 1)[0]; out.push(`${q.scene}:${q.x.toFixed(2)}:${q.y.toFixed(2)}`); console.log(k, q.scene, q.x.toFixed(2), q.y.toFixed(2), q.px); } }
console.log("SPOTS " + out.join(","));
