// K1435: master vs probe over the scan JSONs: tie- and ramp-class finds per scene, a seeded sample of 20 of the
// probe's remaining tie/ramp finds, and the 10 worst tie-class sites on master (by pixels, one per site, at most
// two per scene).
//   node scripts/run_node.mjs .claude/probes/K1435/k1435_sample.ts [mode=tgm]
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
const mode = process.argv[2] ?? "tgm";
const dir = ".claude/probes/K1435/out/scan";
const scenes = readdirSync(dir).filter((x) => x.endsWith("_master.json")).map((x) => x.replace("_master.json", "")).sort();
let seed = 1435; const rnd = (): number => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const isTR = (q: any): boolean => q.cls === "tie" || q.cls === "ramp";
const lines: string[] = [`scene\tmaster tie+ramp (finds / px)\t${mode} tie+ramp (finds / px)\tmaster all\t${mode} all\tby kind master -> ${mode}`];
const tot = { m: 0, p: 0, mpx: 0, ppx: 0, ma: 0, pa: 0 }; const pool: any[] = []; const worst: any[] = [];
const kinds: Record<string, [number, number]> = {};
for (const s of scenes) {
  let P: any; try { P = JSON.parse(readFileSync(`${dir}/${s}_${mode}.json`, "utf8")); } catch { continue; }
  const M = JSON.parse(readFileSync(`${dir}/${s}_master.json`, "utf8"));
  const mt = M.finds.filter(isTR); const pt = P.finds.filter(isTR);
  const px = (a: any[]): number => a.reduce((t, q) => t + q.px, 0);
  const by: Record<string, [number, number]> = {};
  for (const q of mt) { const k = `${q.kind}:${q.cls}`; (by[k] ??= [0, 0])[0]++; (kinds[k] ??= [0, 0])[0]++; }
  for (const q of pt) { const k = `${q.kind}:${q.cls}`; (by[k] ??= [0, 0])[1]++; (kinds[k] ??= [0, 0])[1]++; }
  lines.push(`${s}\t${mt.length} / ${px(mt)}\t${pt.length} / ${px(pt)}\t${M.finds.length}\t${P.finds.length}\t${Object.keys(by).sort().map((k) => `${k} ${by[k][0]}->${by[k][1]}`).join(", ")}`);
  tot.m += mt.length; tot.p += pt.length; tot.mpx += px(mt); tot.ppx += px(pt); tot.ma += M.finds.length; tot.pa += P.finds.length;
  for (const q of pt) pool.push({ scene: s, ...q });
  const hT = s.startsWith("muse_hash") ? 0.4 : 0.3; const seen: any[] = [];
  for (const q of mt.filter((q: any) => q.cls === "tie").sort((a: any, b: any) => b.px - a.px)) { if (seen.some((z) => Math.hypot(z.x - q.x, z.y - q.y) < 2 * hT)) continue; seen.push(q); if (seen.length <= 2) worst.push({ scene: s, ...q }); }
}
lines.push(`TOTAL\t${tot.m} / ${tot.mpx}\t${tot.p} / ${tot.ppx}\t${tot.ma}\t${tot.pa}\t${Object.keys(kinds).sort().map((k) => `${k} ${kinds[k][0]}->${kinds[k][1]}`).join(", ")}`);
const sample: any[] = []; const p2 = pool.slice(); while (sample.length < 20 && p2.length) sample.push(p2.splice(Math.floor(rnd() * p2.length), 1)[0]);
worst.sort((a, b) => b.px - a.px);
const fmt = (q: any): string => `${q.scene}:${q.x.toFixed(2)}:${q.y.toFixed(2)}`;
lines.push("", `SAMPLE (seed 1435, 20 of the ${pool.length} remaining ${mode} tie/ramp finds):`, ...sample.map((q) => `${fmt(q)}\t${q.kind}:${q.cls}\t${q.px} px`), "SAMPLE_SPOTS " + sample.map(fmt).join(","));
lines.push("", "WORST master tie-class sites:", ...worst.slice(0, 10).map((q) => `${fmt(q)}\t${q.kind}:${q.cls}\t${q.px} px`), "WORST_SPOTS " + worst.slice(0, 10).map(fmt).join(","));
writeFileSync(`.claude/probes/K1435/out/scan_${mode}.txt`, lines.join("\n") + "\n"); console.log(lines.join("\n"));
