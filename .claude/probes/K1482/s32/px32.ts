// K1482 s32: at each device pixel, the pieces (chain, d/h, s, seg range, group, ramp, home, surface, key, end), the
// corners in reach and the surfaces (key, v, a, winner) of the last configuration (mirror, home on, retry on).
//   npx tsx px32.ts <scene.json> <sites.json> "x,y;x,y"
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; } return v; };
const [, , sp, sitesP, pts] = process.argv;
const scene = dec(JSON.parse(readFileSync(sp, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const T: any = withHome(buildTables(scene, { aa: 0.011738963274354473, kRetry: true }), true);
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const E: any = new GfEval(T); const h = T.h;
console.log(`h ${h} W ${T.W} aa ${T.aa} zt ${T.zt} px/unit ${a}`);
for (const pt of pts.split(";")) {
  const [X0, Y0] = pt.split(",").map(Number); const x = (X0 + 0.5 - e) / a; const y = (Y0 + 0.5 - f) / d;
  const P = { ...E.eval(x, y) };
  console.log(`px ${X0},${Y0} (${x.toFixed(4)},${y.toFixed(4)}) ink ${P.ink.toFixed(3)} cov ${P.cov.toFixed(3)} chain ${P.chain} win ${P.winKind}:${P.winA}:${P.winB}`);
  for (let j = 0; j < E.np; j++) {
    if (!(E.pd[j] < h * 1.6)) continue;
    console.log(`  j${j} c${E.pc[j]} d/h ${(E.pd[j] / h).toFixed(3)} s ${E.ps[j].toFixed(3)} seg ${E.plo[j]}..${E.phi[j]} pg ${E.pg[j]} ramp ${E.pramp[j].toFixed(3)} phb ${E.phb[j]} surf ${E.psurf[j]} z ${E.pz[j].toFixed(3)} key ${E.pkey[j].toFixed(4)} end ${E.pend[j]}`);
  }
  for (let i = 0; i < E.nk; i++) {
    const k = E.kk[i];
    console.log(`  k${k} G${T.kG[k]} ca${T.kCa[k]} cb${T.kCb[k]} r/h ${(T.kR[k] / h).toFixed(3)} rmax/h ${(T.kRmax[k] / h).toFixed(3)} rho/h ${(E.krho[i] / h).toFixed(3)} kIn ${E.kIn[i]} sec ${E.kSec[i]} ext ${T.kExt?.[k]} thru ${T.kThru[k]} J ${T.kJ[k]}`);
  }
  for (let i = 0; i < E.ns; i++) {
    const s = E.sord[i];
    console.log(`  S${E.sid[s]} key ${E.skey[s].toFixed(4)} v ${E.sv[s].toFixed(3)} a ${E.sa[s].toFixed(3)} win ${E.swk[s]}:${E.swa[s]}:${E.swb[s]} cov ${E.scov[s]}`);
  }
}
