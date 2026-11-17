// K1407 c2: why a crop pixel is inked. Per pixel (k1407_crops' 480 px frame, WH = 2.5h): the pieces (chain,
// d - h, key, group, ramp), the corners near it (rho - r, sector, kIn), the winning term, and for a corner face
// the face point q's distance to every nearby chain's tube (d - h; < 0 = inside) and to each corner's ball.
//   node scripts/run_node.mjs .claude/probes/K1407/k1407c2_why.ts <scene> <x> <y> <c:r,c:r,...>
import { buildModel } from "../K1314/k1314_census.ts";
import { gfTablesOf } from "../K1362/k1362s1_census.ts";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";

const [nm, xs, ys, list] = process.argv.slice(2);
const X = +xs, Y = +ys; const m = buildModel(nm); const T = gfTablesOf(m) as any; const E = new GfEval(T) as any;
const h = T.h, P = 480, S = 2.5 * h, ppu = P / S; const c0 = Math.round(X * ppu - P / 2), r0 = Math.round(Y * ppu - P / 2);
const segD = (c: number, x: number, y: number): { d: number; s: number } => {
  const v0 = T.cV0[c]; const n = T.cNV[c]; let best = Infinity; let bs = 0;
  for (let i = 0; i + 1 < n; i++) {
    const ax = T.vx[v0 + i], ay = T.vy[v0 + i], dx = T.vx[v0 + i + 1] - ax, dy = T.vy[v0 + i + 1] - ay;
    const l2 = dx * dx + dy * dy; const u = l2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
    const d = Math.hypot(x - ax - dx * u, y - ay - dy * u); if (d < best) { best = d; bs = T.vs[v0 + i] + u * (T.vs[v0 + i + 1] - T.vs[v0 + i]); }
  }
  return { d: best, s: bs };
};
const nearChains = (x: number, y: number): number[] => { const out: number[] = []; for (let c = 0; c < T.nC; c++) if (segD(c, x, y).d < 3 * h) out.push(c); return out; };
const f = (v: number): string => v.toFixed(3);
for (const cr of list.split(",")) {
  const [c, r] = cr.split(":").map(Number); const x = (c0 + c + 0.5) / ppu, y = (r0 + r + 0.5) / ppu;
  const e = E.eval(x, y);
  console.log(`\npx ${c}:${r} (${f(x)},${f(y)}) ink=${f(e.ink)} cov=${f(e.cov)} chain=${e.chain} win=${e.winKind}/${e.winA}/${e.winB}`);
  for (let j = 0; j < E.np; j++) console.log(`  piece c${E.pc[j]} s=${f(E.ps[j])} d-h=${f(E.pd[j] - h)} key=${f(E.pkey[j])} g=${E.pg[j]} ramp=${f(E.pramp[j])} lo..hi=${E.plo[j]}..${E.phi[j]} end=${E.pend[j]}`);
  for (let i = 0; i < E.nk; i++) { const k = E.kk[i]; console.log(`  corner k${k} j${T.kJ[k]} g${T.kG[k]} A c${T.kCa[k]} B c${T.kCb[k]} rho-r=${f(E.krho[i] - T.kR[k])} r=${f(T.kR[k])} rmax-rho=${f(T.kRmax[k] - E.krho[i])} sec=${E.kSec[i]} kIn=${E.kIn[i]}`); }
  if (e.winKind === 2 || e.winKind === 4) {
    const k = e.winA; let qx: number, qy: number;
    if (e.winKind === 2) { const rho = Math.hypot(x - T.kCx[k], y - T.kCy[k]); qx = T.kCx[k] + (T.kR[k] * (x - T.kCx[k])) / rho; qy = T.kCy[k] + (T.kR[k] * (y - T.kCy[k])) / rho; }
    else { qx = e.winB ? T.kTbx[k] : T.kTax[k]; qy = e.winB ? T.kTby[k] : T.kTay[k]; }
    console.log(`  face of k${k}: q=(${f(qx)},${f(qy)}) ang=${f(Math.atan2(qy - T.kCy[k], qx - T.kCx[k]))} TA ang=${f(Math.atan2(T.kTay[k] - T.kCy[k], T.kTax[k] - T.kCx[k]))} TB ang=${f(Math.atan2(T.kTby[k] - T.kCy[k], T.kTbx[k] - T.kCx[k]))}`);
    for (const ch of nearChains(qx, qy)) { const sd = segD(ch, qx, qy); console.log(`    q to c${ch}: d-h=${f(sd.d - h)} at s=${f(sd.s)} (len ${f(T.cLen[ch])})`); }
    for (let i = 0; i < E.nk; i++) { const k2 = E.kk[i]; if (k2 === k) continue; const rq = Math.hypot(qx - T.kCx[k2], qy - T.kCy[k2]); console.log(`    q to k${k2}: rho-r=${f(rq - T.kR[k2])} rmax-rho=${f(T.kRmax[k2] - rq)} sec=${E.inSector(k2, qx, qy) ? 1 : 0}`); }
  }
}
