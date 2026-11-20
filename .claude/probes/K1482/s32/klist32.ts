import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; } return v; };
const [, , sp, sitesP, cxy, Rs] = process.argv;
const scene = dec(JSON.parse(readFileSync(sp, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const T: any = withHome(buildTables(scene, { aa: 0.011738963274354473, kRetry: true }), true);
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const [cx, cy] = cxy.split(",").map(Number); const R = +Rs; const h = T.h;
console.log("fields: " + Object.keys(T).filter((k) => k.startsWith("k")).join(" "));
for (let k = 0; k < T.kCx.length; k++) {
  const X = T.kCx[k] * a + e, Y = T.kCy[k] * d + f; if (Math.hypot(X - cx, Y - cy) > R) continue;
  console.log(`k${k} at ${X.toFixed(1)},${Y.toFixed(1)} G${T.kG[k]} J${T.kJ[k]} ca${T.kCa[k]} sa ${T.kSa[k].toFixed(3)} za ${T.kZa[k].toFixed(3)} cb${T.kCb[k]} sb ${T.kSb[k].toFixed(3)} zb ${T.kZb[k].toFixed(3)} r/h ${(T.kR[k]/h).toFixed(3)} rmax/h ${(T.kRmax[k]/h).toFixed(3)} rV/h ${(T.kRV[k]/h).toFixed(3)} thru ${T.kThru[k]} ext ${T.kExt?.[k]} TA ${(T.kTax[k]*a+e).toFixed(1)},${(T.kTay[k]*d+f).toFixed(1)} TB ${(T.kTbx[k]*a+e).toFixed(1)},${(T.kTby[k]*d+f).toFixed(1)}`);
}
