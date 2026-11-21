// K1482 s25: per device point of link A, the mirror's pieces (chain, s, d/h, group, key, surface) and corners.
//   npx tsx pix25.ts <scene.json> <sites.json> <x,y;x,y;...> [kr=0|1]
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => {
  if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN;
  if (Array.isArray(v)) return v.map(dec);
  if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; }
  return v;
};
const [, , sp, sitesP, pts, krS] = process.argv;
const scene = dec(JSON.parse(readFileSync(sp, "utf8")));
scene.look.ctrlArc ??= CTRL_ARC;
const aa = 0.011738963274354473;
const T0 = buildTables(scene, { aa, kRetry: krS === "1" ? true : undefined });
const T: any = withHome ? withHome(T0, true) : { ...T0, homeOn: true };
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const E: any = new GfEval(T);
const h = T.h ?? 0.4;
for (const p of pts.split(";")) {
  const [x, y] = p.split(",").map(Number);
  const fx = (x + 0.5 - e) / a; const fy = (y + 0.5 - f) / d;
  const P = E.eval(fx, fy);
  const pcs: string[] = [];
  for (let i = 0; i < E.np; i++) pcs.push(`c${E.pc[i]} s${E.ps[i].toFixed(2)} d${(E.pd[i] / h).toFixed(2)}h g${E.pg[i]} k${E.pkey[i].toFixed(2)} sf${E.psurf[i]} r${E.pramp[i].toFixed(2)}`);
  const ks: string[] = [];
  for (let i = 0; i < E.nk; i++) { const k = E.kk[i]; ks.push(`K${k} g${T.kG[k]} j${T.kJ[k]} r${(T.kR[k] / h).toFixed(2)}h rho${(E.krho[i] / h).toFixed(2)} in${E.kIn[i]} ca${T.kCa[k]} cb${T.kCb[k]}`); }
  console.log(`(${x},${y}) f(${fx.toFixed(3)},${fy.toFixed(3)}) ink${P.ink.toFixed(2)} cov${P.cov.toFixed(2)} ch${P.chain} win${P.winKind}/${P.winA}/${P.winB}`);
  console.log("   P: " + pcs.join(" | "));
  if (ks.length) console.log("   K: " + ks.join(" | "));
}
