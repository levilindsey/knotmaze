// K1407 c3: a chain's arms (root s, dir, L, Lcut, group) and its pins near an s range, plus a corner's sides.
//   node scripts/run_node.mjs .claude/probes/K1407/k1407c3_arms.ts <scene> <chains c,c> <sLo> <sHi> [corner k]
import { buildModel } from "../K1314/k1314_census.ts";
import { gfTablesOf } from "../K1362/k1362s1_census.ts";
const [nm, cs, lo, hi, ks] = process.argv.slice(2);
const T = gfTablesOf(buildModel(nm)) as any; const f = (v: number): string => (v === Infinity ? "inf" : v.toFixed(3));
for (const c of cs.split(",").map(Number)) {
  console.log(`c${c} len ${f(T.cLen[c])} closed ${T.cClosed[c]} s0 ${f(T.cS0[c])}`);
  for (let i = T.cArm0[c]; i < T.cArm0[c] + T.cArmN[c]; i++) console.log(`  arm ${i} sR ${f(T.aSR[i])} dir ${T.aDir[i]} L ${f(T.aL[i])} Lcut ${f(T.aLcut[i])} g ${T.aG[i]}`);
  for (let q = T.cPin0[c]; q < T.cPin0[c] + T.cPinN[c]; q++) if (T.pinS[q] >= +lo && T.pinS[q] <= +hi) console.log(`  pin s ${f(T.pinS[q])} z ${f(T.pinZ[q])}${T.pinTheta ? ` theta ${f(T.pinTheta[q])}` : ""}`);
}
if (ks) for (const k of ks.split(",").map(Number)) console.log(`k${k} C (${f(T.kCx[k])},${f(T.kCy[k])}) R ${f(T.kR[k])} Rmax ${f(T.kRmax[k])} A c${T.kCa[k]} sA ${f(T.kSa[k])} zA ${f(T.kZa[k])} B c${T.kCb[k]} sB ${f(T.kSb[k])} zB ${f(T.kZb[k])} G ${T.kG[k]} Ta (${f(T.kTax[k])},${f(T.kTay[k])}) Tb (${f(T.kTbx[k])},${f(T.kTby[k])})`);
