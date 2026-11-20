// K1436 s3: the census table, mirror v2 beside screen v2, per kind:class, both home flags.
//   node k1436_s3_table.mjs <mirrorDir> <screenDir> <out.md>
//   mirrorDir: <scene>_h<0|1>.mirror.json (k1436_scan.ts bar); screenDir: <scene>_h<0|1>.screen.json (k1436_screen_scan.ts)
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
const [mDir, sDir, out] = process.argv.slice(2);
const scenes = [...new Set(readdirSync(mDir).filter((f) => f.endsWith(".mirror.json")).map((f) => f.replace(/_h[01]\.mirror\.json$/, "")))].sort();
const rd = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);
// K1479: g41_user_tw42 and user_tw42.lightpaper are one physics state by design (same seed and
// params; only the background paint differs), exported one substep apart. The totals count the
// pair once; the lightpaper per-scene row still shows its own finds, marked as the duplicate.
const DEDUP_OF = { "user_tw42.lightpaper": "g41_user_tw42" };
const L = [];
for (const h of ["1", "0"]) {
  const tot = {}; const per = []; let mMs = 0, sMs = 0, miss = [];
  for (const s of scenes) {
    const M = rd(join(mDir, `${s}_h${h}.mirror.json`)), S = rd(join(sDir, `${s}_h${h}.screen.json`));
    if (!S) miss.push(s);
    const mc = M?.cnt ?? {}, sc = S?.cnt ?? {};
    const dup = !!(DEDUP_OF[s] && scenes.includes(DEDUP_OF[s]));
    if (!dup) { for (const [k, v] of Object.entries(mc)) (tot[k] ??= [0, 0])[0] += v; for (const [k, v] of Object.entries(sc)) (tot[k] ??= [0, 0])[1] += v; }
    const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
    mMs += M?.ms?.v2 ?? 0; sMs += S?.ms?.all ?? 0;
    per.push(`| ${s}${dup ? " (dup of " + DEDUP_OF[s] + ", K1479)" : ""} | ${M ? sum(mc) : "-"} | ${S ? sum(sc) : "-"} | ${M ? ((M.ms.raster + M.ms.v2) / 1000).toFixed(1) : "-"} | ${S ? (S.ms.all / 1000).toFixed(1) : "-"} |`);
  }
  L.push(`### gfh=${h} (${scenes.length} scenes${miss.length ? `; no screen scan: ${miss.join(", ")}` : ""})`, "", "| kind:class | mirror v2 | screen v2 |", "|---|---:|---:|");
  for (const k of Object.keys(tot).sort()) L.push(`| ${k} | ${tot[k][0]} | ${tot[k][1]} |`);
  const T = Object.values(tot).reduce((a, b) => [a[0] + b[0], a[1] + b[1]], [0, 0]);
  L.push(`| **all** | **${T[0]}** | **${T[1]}** |`, "", "| scene | mirror finds | screen finds | mirror s (raster+v2) | screen scan s |", "|---|---:|---:|---:|---:|", ...per, "");
}
if (scenes.includes("user_tw42.lightpaper") && scenes.includes("g41_user_tw42")) L.push("", "K1479: user_tw42.lightpaper duplicates g41_user_tw42's physics state by design; the totals above count the pair once (its per-scene row still shows its own finds).");
writeFileSync(out, L.join("\n"));
console.log(L.join("\n"));
