// K1362 s1: what the GPU field's mirror sees at one point: pieces, corners, the pixel record.
//   node scripts/run_node.mjs .claude/probes/K1362/k1362s1_pt.ts <scene> <x> <y>
import { buildModel, refEval } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/k1314_census.ts";
import { gfTablesOf } from "./k1362s1_census";
import { GfEval } from "../../../src/render/gpu_field/eval";

const [nm, xs, ys] = process.argv.slice(2); const x = +xs; const y = +ys;
const m = buildModel(nm); const T = gfTablesOf(m); const E = new GfEval(T);
const ev = { ...E.eval(x, y) };
const P = E as unknown as Record<string, ArrayLike<number> & { [k: number]: number }> & { np: number; nk: number };
console.log(`h=${T.h.toFixed(4)} pixel`, JSON.stringify(ev));
console.log("formB", JSON.stringify(refEval(m, x, y)));
for (let j = 0; j < P.np; j++) console.log(`piece ${j}: chain ${P.pc[j]} (id ${m.scene.chains[P.pc[j]].id}) s ${P.ps[j].toFixed(3)} d/h ${(P.pd[j] / T.h).toFixed(3)} key ${P.pkey[j].toFixed(4)} g ${P.pg[j]} ramp ${P.pramp[j].toFixed(3)} seg ${P.plo[j]}..${P.phi[j]} end ${P.pend[j]}`);
for (let i = 0; i < P.nk; i++) { const k = P.kk[i]; console.log(`corner ${k}: j${T.kJ[k]} arms ${T.kA[k]},${T.kB[k]} r/h ${(T.kR[k] / T.h).toFixed(3)} rho/h ${(P.krho[i] / T.h).toFixed(3)} Rmax/h ${(T.kRmax[k] / T.h).toFixed(3)} C (${T.kCx[k].toFixed(3)},${T.kCy[k].toFixed(3)}) th ${T.kTheta[k].toFixed(3)} g ${T.kG[k]}`); }
