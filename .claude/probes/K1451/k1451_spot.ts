// K1451: a census scene's spot in the mirror (home on, default fade unless FL): a panel of the picture (chain colour
// under ink) and the same with tie-class pixels tinted, plus a dump of chosen pixels (pieces, surfaces).
//   node scripts/run_node.mjs .claude/probes/K1451/k1451_spot.ts <scene:x:y> <outPrefix> [span=6 (in h)] [P=240] [--px=c,r ...]
// env FL = fadeLength, HOME=0 for the flag off.
import { modelOf, makeJudge } from "../K1433/k1433_lib.ts";
import { buildTables } from "../../../src/render/gpu_field/tables.ts";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";
import { writePng } from "../K1314/k1314_crops.ts";
const args = process.argv.slice(2);
const [spec, pre] = args; const span = +(args[2] && !args[2].startsWith("--") ? args[2] : 6); const P = +(args[3] && !args[3].startsWith("--") ? args[3] : 240);
const [nm, xs, ys] = spec.split(":"); const X = +xs, Y = +ys;
const M = modelOf(nm); const sc = M.scene as any; const aa = 0.5 / (sc.camera.pxPerUnit * 2);
const T: any = buildTables(sc, { aa, home: process.env.HOME0 !== "1" });
const { loadEv } = await import("./k1451_sev.ts"); const fac = await loadEv();
const mk = (): any => { const E: any = fac(T); if (process.env.FL) E.fadeLength = +process.env.FL; return E; };
const J = makeJudge(mk()); const E = mk();
const ppu = P / (span * T.h); const c0 = Math.round(X * ppu - P / 2), r0 = Math.round(Y * ppu - P / 2);
const a = new Uint8Array(P * P * 3), b = new Uint8Array(P * P * 3);
let ties = 0;
for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) {
  const x = (c0 + c + 0.5) / ppu, y = (r0 + r + 0.5) / ppu; const j = J(x, y); const i = 3 * (r * P + c);
  const base = j.cov <= 0 ? [235, 230, 215] : [130 + ((j.chain * 53) % 100), 110 + ((j.chain * 97) % 100), 150 + ((j.chain * 31) % 90)];
  const bg = [235, 230, 215];
  for (let k = 0; k < 3; k++) { const f = bg[k] * (1 - j.cov) + base[k] * j.cov; a[i + k] = Math.round(f * (1 - j.ink) + 20 * j.ink); }
  const tint = j.cls === "tie" ? [255, 40, 40] : j.cls === "ramp" ? [40, 160, 255] : j.cls === "thru" ? [40, 220, 80] : null;
  if (j.cls === "tie") ties++;
  for (let k = 0; k < 3; k++) b[i + k] = tint ? Math.round(0.5 * a[i + k] + 0.5 * tint[k]) : a[i + k];
}
writePng(`${pre}.png`, a, P, P); writePng(`${pre}_cls.png`, b, P, P);
console.log(`${spec} ppu ${ppu.toFixed(1)} h ${T.h} zt ${T.zt} amp ${T.amp} win ${T.win} tie px ${ties} -> ${pre}.png`);
for (const s of args.filter((q) => q.startsWith("--px="))) {
  const [pc, pr] = s.slice(5).split(",").map(Number); const x = (c0 + pc + 0.5) / ppu, y = (r0 + pr + 0.5) / ppu; const o = E.eval(x, y);
  console.log(`px ${pc},${pr} world ${x.toFixed(4)},${y.toFixed(4)} ink ${o.ink.toFixed(3)} cov ${o.cov.toFixed(3)} c${o.chain} wk ${o.winKind}`);
  for (let q = 0; q < E.np; q++) console.log(`   piece ${q}: c${E.pc[q]} s${E.ps[q].toFixed(3)} d/h ${(E.pd[q] / T.h).toFixed(3)} z ${E.pz[q].toFixed(4)} key ${E.pkey[q].toFixed(4)} g${E.pg[q]} r${E.pramp[q].toFixed(3)} surf ${E.psurf[q]}`);
  for (let q = 0; q < E.ns; q++) { const e = E.sord[q]; console.log(`   surf#${q} id ${E.sid[e]} key ${E.skey[e].toFixed(4)} a ${E.sa[e].toFixed(3)} v ${E.sv[e].toFixed(3)} wk ${E.swk[e]}`); }
}
