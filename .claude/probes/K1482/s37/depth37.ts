// K1482 s37: per tangent point, how deep it lies inside each own arm's tube (px and W), from the mirror's gathered
// pieces at T's pixel. "all" lists every point more than 0.3 px inside an own arm.
//   $env:GF_KRETRY='1'; node scripts/run_node.mjs .claude/probes/K1482/s37/depth37.ts <scene.json> <sites.json> <k.a|k.b,...|all>
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
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const T: any = withHome(buildTables(scene, { aa: 0.5 / a, kRetry: true }), true); const h = T.h; const W = T.W;
const E: any = new GfEval(T);
const items: [number, number][] = [];
if (list === "all") { for (let k = 0; k < T.kR.length; k++) if (!T.kThru[k]) { items.push([k, 0]); items.push([k, 1]); } }
else for (const it of list.split(",")) { const [ks, ts] = it.replace(/^k/, "").split("."); items.push([+ks, ts === "b" ? 1 : 0]); }
let n = 0; const rows: string[] = [];
for (const [k, t] of items) {
  const tx = t ? T.kTbx[k] : T.kTax[k], ty = t ? T.kTby[k] : T.kTay[k]; if (!Number.isFinite(tx)) continue;
  E.eval(tx, ty); const S = T.kG[k]; const cA = T.kCa[k], cB = T.kCb[k]; const cT = t ? cB : cA, cO = t ? cA : cB;
  let dOwn = Infinity, dOth = Infinity, dCown = Infinity;
  for (let m = 0; m < E.np; m++) {
    if (E.psurf[m] !== S) continue; const dd = Math.sqrt(E.pieceD(m, tx, ty));
    if (E.pc[m] === cT && dd < dOwn) dOwn = dd; if (E.pc[m] === cO && cO !== cT && dd < dOth) dOth = dd;
    if (E.pc[m] === cA || E.pc[m] === cB) { const dc = Math.sqrt(E.pieceD(m, T.kCx[k], T.kCy[k])); if (dc < dCown) dCown = dc; }
  }
  n++; const inOwn = (h - dOwn) * a, inOth = (h - dOth) * a;
  if (list !== "all" || inOwn > 0.3 || inOth > 0.3) rows.push(`k${k}.${t ? "b" : "a"} j${T.kJ[k]} arms ${cA}/${cB} R ${(T.kR[k] / h).toFixed(3)} h @${Math.floor(tx * a + e)},${Math.floor(ty * d + f)}: inside its own arm ${inOwn.toFixed(2)} px (${(inOwn / (W * a)).toFixed(2)} W), inside the other arm ${Number.isFinite(inOth) ? inOth.toFixed(2) + " px (" + (inOth / (W * a)).toFixed(2) + " W)" : "not gathered"}; centre ${((dCown - h) / T.kR[k]).toFixed(2)} R past the nearest own arm's edge`);
}
console.log(`${n} tangent points, h ${(h * a).toFixed(2)} px, W ${(W * a).toFixed(2)} px; listed ${rows.length}`); for (const r of rows) console.log(r);
