// K1482 s36: what covers a named tangent point: every chain piece the mirror gathers at the point, nearest first
// (chain, surface, distance from the centre line in h; "arm" = one of the corner's own two chains), and the
// corner's surface. A point of the outline is exactly 1 h from its own arm and inside no tube.
//   $env:GF_KRETRY='1'; node scripts/run_node.mjs .claude/probes/K1482/s36/tancover36.ts <scene.json> <sites.json> <k.a|k.b,...>
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const k of Object.keys(v)) o[k] = dec(v[k]); return o; } return v; };
const [, , sceneP, sitesP, list] = process.argv;
const scene = dec(JSON.parse(readFileSync(sceneP, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a] = SJ.toDevA;
const T: any = withHome(buildTables(scene, { aa: 0.5 / a, kRetry: true }), true); const h = T.h;
const E: any = new GfEval(T);
for (const it of (list ?? "").split(",").filter(Boolean)) {
  const [ks, ts] = it.split("."); const k = Number(ks); const t = ts === "b" ? 1 : 0;
  const tx = t ? T.kTbx[k] : T.kTax[k]; const ty = t ? T.kTby[k] : T.kTay[k];
  const o = E.eval(tx, ty); const best = new Map<string, number>();
  for (let m = 0; m < E.np; m++) { const key = `${E.pc[m]}/s${E.psurf[m]}`; const q = Math.sqrt(E.pieceD(m, tx, ty)) / h; if (!(best.get(key)! <= q)) best.set(key, q); }
  const rows = [...best.entries()].sort((p, q) => p[1] - q[1]).filter(([, q]) => q < 2.5).map(([key, q]) => { const c = Number(key.split("/")[0]); return `${c === T.kCa[k] ? "armA " : c === T.kCb[k] ? "armB " : ""}c${key} ${q.toFixed(2)} h`; });
  console.log(`k${k}.${ts} surface s${T.kG[k]} arms ${T.kCa[k]}/${T.kCb[k]} (point is T${ts}); at the point: cov ${o.cov.toFixed(2)} ink ${o.ink.toFixed(2)} winKind ${o.winKind} label chain ${o.chain}; pieces: ${rows.join("; ")}`);
}