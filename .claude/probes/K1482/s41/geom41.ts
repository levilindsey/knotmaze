// K1482 s41: the geometry near a device px: each chain's polyline vertices within R (device px, s, the chain's
// open ends marked), its arms, and the corners whose circle or tangent points come within R (centre, R / h, arms).
//   $env:GF_KRETRY='1'; node scripts/run_node.mjs .claude/probes/K1482/s41/geom41.ts <scene.json> <sites.json> <x:y> [R=40]
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const k of Object.keys(v)) o[k] = dec(v[k]); return o; } return v; };
const [, , sceneP, sitesP, xy, Rs] = process.argv; const R = +(Rs ?? 40);
const scene = dec(JSON.parse(readFileSync(sceneP, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const T: any = withHome(buildTables(scene, { aa: 0.5 / a, kRetry: true }), true);
const [cx, cy] = xy.split(":").map(Number);
const X = (wx: number): number => wx * a + e, Y = (wy: number): number => wy * d + f;
console.log(`h ${(T.h * a).toFixed(2)} px, W ${(T.W * a).toFixed(2)} px, aa ${(T.aa * a).toFixed(2)} px`);
for (let c = 0; c < T.nC; c++) {
  const v0 = T.cV0[c], nv = T.cNV[c]; const pts: string[] = []; let last = -9;
  for (let i = 0; i < nv; i++) { const px = X(T.vx[v0 + i]), py = Y(T.vy[v0 + i]); if (Math.hypot(px - cx, py - cy) > R) continue;
    pts.push(`${i === 0 ? "[S]" : i === nv - 1 ? "[E]" : last === i - 1 ? "" : `#${i} `}${px.toFixed(0)},${py.toFixed(0)}@${T.vs[v0 + i].toFixed(2)}`); last = i; }
  if (pts.length) console.log(`c${c}${T.cClosed[c] ? " closed" : " open"} len ${T.cLen[c].toFixed(2)}: ${pts.slice(0, 14).join(" ")}${pts.length > 14 ? " ..." : ""}`);
}
for (let k = 0; k < T.nK; k++) {
  const ccx = X(T.kCx[k]), ccy = Y(T.kCy[k]), r = T.kR[k] * a;
  const ta = [X(T.kTax[k]), Y(T.kTay[k])], tb = [X(T.kTbx[k]), Y(T.kTby[k])];
  const near = Math.min(Math.abs(Math.hypot(ccx - cx, ccy - cy) - r), Math.hypot(ta[0] - cx, ta[1] - cy), Math.hypot(tb[0] - cx, tb[1] - cy));
  if (near > R) continue;
  console.log(`k${k} j${T.kJ[k]} thru ${T.kThru[k]} ext ${T.kExt?.[k] ?? "-"} c ${ccx.toFixed(1)},${ccy.toFixed(1)} R ${(T.kR[k] / T.h).toFixed(3)} h (${r.toFixed(1)} px) Rmax ${(T.kRmax[k] / T.h).toFixed(2)} h; a c${T.kCa[k]}@${T.kSa[k].toFixed(2)} T ${ta[0].toFixed(1)},${ta[1].toFixed(1)}; b c${T.kCb[k]}@${T.kSb[k].toFixed(2)} T ${tb[0].toFixed(1)},${tb[1].toFixed(1)}; theta ${(T.kTheta[k] * 180 / Math.PI).toFixed(1)}`);
}
