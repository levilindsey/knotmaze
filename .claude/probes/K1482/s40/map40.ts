// K1482 s40: a character map of the mirror's border winners around a device px (S37 = env AFTER, default "0" = the
// start): per px, '.' paper / no ink (< 0.5), else a letter per winner (legend printed), '@' marks the centre.
//   $env:GF_KRETRY='1'; node scripts/run_node.mjs .claude/probes/K1482/s40/map40.ts <scene.json> <sites.json> <x:y> [R=12]
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const k of Object.keys(v)) o[k] = dec(v[k]); return o; } return v; };
const [, , sceneP, sitesP, xy, Rs] = process.argv; const R = +(Rs ?? 12);
const scene = dec(JSON.parse(readFileSync(sceneP, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const T: any = withHome(buildTables(scene, { aa: 0.5 / a, kRetry: true }), true);
const E: any = new GfEval(T); GfEval.S37 = process.env.AFTER ?? "0";
const KN: Record<number, string> = { 1: "side", 2: "arc", 3: "end", 4: "tan", 5: "thru", 6: "vtx" };
const name = (q: any): string => q.winKind === 2 ? `arc k${q.winA}` : q.winKind === 4 ? `tan k${q.winA}.${q.winB ? "b" : "a"}` : q.winKind === 1 || q.winKind === 3 ? `${KN[q.winKind]} c${q.winA}` : `${KN[q.winKind] ?? q.winKind} ${q.winA}/${q.winB}`;
const [cx, cy] = xy.split(":").map(Number); const leg = new Map<string, string>(); const L = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const rows: string[] = [];
for (let Y = cy - R; Y <= cy + R; Y++) {
  let s = "";
  for (let X = cx - R; X <= cx + R; X++) {
    const q = E.eval((X + 0.5 - e) / a, (Y + 0.5 - f) / d);
    if (!(q.ink >= 0.5)) { s += X === cx && Y === cy ? "@" : "."; continue; }
    const n = name(q); if (!leg.has(n)) leg.set(n, L[leg.size % L.length]);
    s += X === cx && Y === cy ? "@" : leg.get(n);
  }
  rows.push(`${String(Y).padStart(5)} ${s}`);
}
console.log(`S37 "${GfEval.S37}" around ${cx},${cy} (x ${cx - R}..${cx + R}); ` + [...leg].map(([n, c]) => `${c}=${n}`).join(" "));
for (const r of rows) console.log(r);
