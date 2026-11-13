import { buildModel, filletOf } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/k1314_census.ts";
import { gfTablesOf } from "./k1362s1_census";
const [nm, js] = process.argv.slice(2); const J = +js;
const m = buildModel(nm); const f = filletOf(m) as any; const T = gfTablesOf(m) as any; const h = T.h;
f.corners.forEach((c: any, i: number) => { if (c.j === J) console.log(`fbf ${i} thru ${f.thruCi.has(i)} a${c.a} b${c.b} ok ${c.ok} r/h ${(c.r / h).toFixed(3)} om ${c.omega?.toFixed(2)} rV/h ${(c.rV / h).toFixed(3)} q (${c.qx?.toFixed(3)},${c.qy?.toFixed(3)}) th ${c.theta.toFixed(3)}`); });
for (let k = 0; k < T.nK; k++) if (T.kJ[k] === J) console.log(`me ${k} thru ${T.kThru[k]} a${T.kA[k]} b${T.kB[k]} r/h ${(T.kR[k] / h).toFixed(3)} rV/h ${(T.kRV[k] / h).toFixed(3)} q (${T.kCx[k].toFixed(3)},${T.kCy[k].toFixed(3)}) ca ${T.kCa[k]} cb ${T.kCb[k]}`);
