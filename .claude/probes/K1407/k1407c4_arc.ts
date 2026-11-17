// K1407 c4: per arc term at one crop pixel: sector, rho, Dk, the tube burial, fillBur and the term's value (the
// arc loop of eval.ts's layers(), re-run on the eval's own state).
//   node scripts/run_node.mjs .claude/probes/K1407/k1407c4_arc.ts <scene> <x> <y> <c:r,c:r,...>
import { buildModel } from "../K1314/k1314_census.ts";
import { gfTablesOf } from "../K1362/k1362s1_census.ts";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";
const [nm, xs, ys, list] = process.argv.slice(2);
const T = gfTablesOf(buildModel(nm)) as any; const E = new GfEval(T) as any; const P = 480, ppu = P / (2.5 * T.h);
const c0 = Math.round(+xs * ppu - P / 2), r0 = Math.round(+ys * ppu - P / 2);
const ss = (a: number, b: number, v: number): number => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const h = T.h, aa = T.aa, W = T.W; const band = (D: number): number => 1 - ss(W - aa, W + aa, D);
for (const cr of list.split(",")) {
  const [c, r] = cr.split(":").map(Number); const x = (c0 + c + 0.5) / ppu, y = (r0 + r + 0.5) / ppu;
  const e = E.eval(x, y); console.log(`${c}:${r} (${x.toFixed(4)},${y.toFixed(4)}) ink ${e.ink.toFixed(3)} win wk${E.cWk}:${E.cWa}`);
  for (let i = 0; i < E.nk; i++) {
    const k = E.kk[i]; const rho = E.krho[i]; const Dk = rho - T.kR[k];
    if (!(Math.abs(Dk) < W + 3 * aa)) continue;
    const qx = T.kCx[k] + (T.kR[k] * (x - T.kCx[k])) / rho; const qy = T.kCy[k] + (T.kR[k] * (y - T.kCy[k])) / rho;
    let bur = 0; let bm = -1;
    for (let m = 0; m < E.np; m++) {
      if (E.psurf[m] !== T.kG[k] || E.pc[m] === T.kCa[k] || E.pc[m] === T.kCb[k]) continue;
      const wb2 = 1 - ss(h - 2 * aa, h, Math.sqrt(E.pieceD(m, qx, qy))); if (wb2 > bur) { bur = wb2; bm = m; }
    }
    const fb = E.fillBur(k, qx, qy, x, y, T.kG[k]);
    const val = (1 - Math.max(bur, fb)) * band(Dk) * ss(-aa, aa, Dk);
    console.log(`  k${k} G${T.kG[k]} sec ${E.kSec[i]} kIn ${E.kIn[i]} Dk/W ${(Dk / W).toFixed(3)} tubeBur ${bur.toFixed(3)}${bm >= 0 ? ` (c${E.pc[bm]})` : ""} fillBur ${fb.toFixed(3)} val ${val.toFixed(3)}`);
  }
}
