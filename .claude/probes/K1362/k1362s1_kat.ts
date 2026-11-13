import { buildModel, filletOf } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/k1314_census.ts";
import { gfTablesOf } from "./k1362s1_census";
const [nm, X, Y] = [process.argv[2], +process.argv[3], +process.argv[4]];
const m = buildModel(nm); const T = gfTablesOf(m) as any; const f = filletOf(m) as any; const h = T.h;
for (let k = 0; k < T.nK; k++) { const d = Math.hypot(X - T.kCx[k], Y - T.kCy[k]); if (d > 3 * h) continue;
  console.log(`mine k${k} j${T.kJ[k]} g${T.kG[k]} thru ${T.kThru[k]} r/h ${(T.kR[k]/h).toFixed(3)} rmax/h ${(T.kRmax[k]/h).toFixed(3)} rho/h ${(d/h).toFixed(3)} dTa/h ${(Math.hypot(X-T.kTax[k],Y-T.kTay[k])/h).toFixed(3)} dTb/h ${(Math.hypot(X-T.kTbx[k],Y-T.kTby[k])/h).toFixed(3)} ca ${T.kCa[k]} cb ${T.kCb[k]}`); }
const tc = f.corners[+(process.argv[5] ?? -1)]; if (tc) console.log("B fbf corner " + JSON.stringify(tc, (k, v) => typeof v === "number" ? +v.toFixed(4) : v).slice(0, 400)); f.corners.forEach((c: any, i: number) => { if (!c || !(c.r > 0)) return; const cx = c.qx; const cy = c.qy; const d = Math.hypot(X - cx, Y - cy); if (!(d <= 3 * h)) return;
  console.log(`B c${i} j${c.j} r/h ${(c.r/h).toFixed(3)} rho/h ${(d/h).toFixed(3)} a ${c.a} b ${c.b} ok ${c.ok} dTa/h ${(Math.hypot(X-c.tax,Y-c.tay)/h).toFixed(3)} dTb/h ${(Math.hypot(X-c.tbx,Y-c.tby)/h).toFixed(3)} thru ${f.thruCi?.has(i)}`); });
