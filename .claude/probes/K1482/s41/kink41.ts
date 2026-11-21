// K1482 s41: the crease round join's inputs at device px: per piece j with X < h + aa, its chain, X / h, the outline
// point q (device px), cornerS's s1 (px) and the band distance before (h - X) and after (length(h - X, s1)), in px.
//   $env:GF_KRETRY='1'; node scripts/run_node.mjs .claude/probes/K1482/s41/kink41.ts <scene.json> <sites.json> <x:y>[,x:y...]
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const k of Object.keys(v)) o[k] = dec(v[k]); return o; } return v; };
const [, , sceneP, sitesP, xys] = process.argv;
const scene = dec(JSON.parse(readFileSync(sceneP, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const T: any = withHome(buildTables(scene, { aa: 0.5 / a, kRetry: true }), true); const h = T.h;
const E: any = new GfEval(T); GfEval.S41 = process.env.MODE ?? "";
for (const xy of xys.split(",")) {
  const [X, Y] = xy.split(":").map(Number); const x = (X + 0.5 - e) / a, y = (Y + 0.5 - f) / d;
  const q = E.eval(x, y); const out: string[] = [];
  for (let j = 0; j < E.np; j++) {
    const Xj = E.pd[j]; if (!(Xj < h + T.aa)) continue; const fx = E.pfx[j], fy = E.pfy[j]; const qx = fx + (h * (x - fx)) / Xj, qy = fy + (h * (y - fy)) / Xj; const s1 = E.cornerS(j, x, y, qx, qy, Xj);
    out.push(`p${j} c${E.pc[j]} X ${(Xj / h).toFixed(3)} q ${(qx * a + e).toFixed(1)},${(qy * d + f).toFixed(1)} s1 ${(s1 * a).toFixed(2)} D ${((h - Xj) * a).toFixed(2)}->${(Math.hypot(h - Xj, s1) * a).toFixed(2)}px`);
  }
  console.log(`${X},${Y} ink ${q.ink.toFixed(3)}: ${out.join(" | ")}`);
}
