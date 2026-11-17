// K1435: the evaluator's per-pixel state at a point and on a small grid around it.
//   node scripts/run_node.mjs .claude/probes/K1435/k1435_dump.ts <scene> <x> <y> [step=0.08] [n=3] [mode=master]
import { modelOf, tablesOf } from "../K1433/k1433_lib.ts";
import { GfEval } from "./eval_t.ts";
const [nm, xs, ys, stS, nS, mode] = process.argv.slice(2);
const X = +xs, Y = +ys; const st = stS ? +stS : 0.08; const n = nS ? +nS : 3;
modelOf(nm); const T = tablesOf(nm) as any; (GfEval as any).MODE = mode ?? "master";
const E = new GfEval(T) as any;
console.log(`h ${T.h} W ${T.W} aa ${T.aa} zt ${T.zt} amp ${T.amp} win ${T.win} sigma ${T.sigma.toFixed(3)}`);
const f = (v: number, d = 3): string => (v === -Infinity ? "-inf" : v.toFixed(d));
const chains = new Set<number>(); const corners = new Set<number>();
for (let r = -n; r <= n; r++) {
  for (let c = -n; c <= n; c++) {
    const x = X + c * st, y = Y + r * st; const o = E.eval(x, y);
    const ps: string[] = [];
    for (let j = 0; j < E.np; j++) { chains.add(E.pc[j]); ps.push(`c${E.pc[j]}@${f(E.ps[j], 2)} d${f(E.pd[j], 2)} z${f(E.pz[j], 2)} k${f(E.pkey[j], 2)} g${E.pg[j]} r${f(E.pramp[j], 2)}`); }
    const ks: string[] = [];
    for (let i = 0; i < E.nk; i++) { const k = E.kk[i]; corners.add(k); ks.push(`k${k}(g${T.kG[k]} j${T.kJ[k]} c${T.kCa[k]}/c${T.kCb[k]} in${E.kIn[i]}${T.kThru[k] ? " thru" : ""})`); }
    const ss: string[] = [];
    for (let i = 0; i < E.ns; i++) { const e = E.sord[i]; ss.push(`${E.sid[e] >= 0 ? "g" + E.sid[e] : "p" + (-1 - E.sid[e])} key${f(E.skey[e], 3)} a${f(E.sa[e], 2)} v${f(E.sv[e], 2)}`); }
    console.log(`(${c},${r}) ${x.toFixed(2)},${y.toFixed(2)} ink ${f(o.ink, 2)} cov ${f(o.cov, 2)} lab c${o.chain} win${o.winKind}\n   P: ${ps.join(" | ")}\n   K: ${ks.join(" ")}\n   S(last cfg): ${ss.join(" > ")}`);
  }
}
console.log("--- arms of the chains seen");
for (const c of [...chains].sort((a, b) => a - b)) {
  console.log(`c${c} closed ${T.cClosed[c]} s0 ${f(T.cS0[c], 2)} len ${f(T.cLen[c], 2)}`);
  for (let i = T.cArm0[c]; i < T.cArm0[c] + T.cArmN[c]; i++) console.log(`   arm ${i}: sR ${f(T.aSR[i], 2)} dir ${T.aDir[i]} L ${f(T.aL[i], 2)} Lcut ${f(T.aLcut[i], 2)} g${T.aG[i]}`);
  const pins: string[] = []; for (let q = T.cPin0[c]; q < T.cPin0[c] + T.cPinN[c]; q++) pins.push(`${f(T.pinS[q], 2)}:${f(T.pinZ[q], 2)}`);
  console.log(`   pins ${pins.join(" ")}`);
}
console.log("--- corners seen");
for (const k of [...corners].sort((a, b) => a - b)) console.log(`k${k} g${T.kG[k]} j${T.kJ[k]} thru ${T.kThru[k]} C ${f(T.kCx[k], 2)},${f(T.kCy[k], 2)} r ${f(T.kR[k], 3)} rmax ${f(T.kRmax[k], 3)} a c${T.kCa[k]}@${f(T.kSa[k], 2)} z${f(T.kZa[k], 2)} b c${T.kCb[k]}@${f(T.kSb[k], 2)} z${f(T.kZb[k], 2)}`);
