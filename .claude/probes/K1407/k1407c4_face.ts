// K1407 c4: per face term (a piece's side outline) of one surface at crop pixels: the piece, X, the tube burial and
// which corner's fill test buries its foot q (rq vs kR / kRmax, inSector, outsideArms), re-run on the eval's state.
//   node scripts/run_node.mjs .claude/probes/K1407/k1407c4_face.ts <scene> <x> <y> <surf> <c:r,c:r,...>
import { buildModel } from "../K1314/k1314_census.ts";
import { gfTablesOf } from "../K1362/k1362s1_census.ts";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";
const [nm, xs, ys, ss0, list] = process.argv.slice(2);
const T = gfTablesOf(buildModel(nm)) as any; const E = new GfEval(T) as any; const P = 480, ppu = P / (2.5 * T.h);
const c0 = Math.round(+xs * ppu - P / 2), r0 = Math.round(+ys * ppu - P / 2); const S = +ss0;
const ss = (a: number, b: number, v: number): number => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const h = T.h, aa = T.aa;
for (const cr of list.split(",")) {
  const [c, r] = cr.split(":").map(Number); const x = (c0 + c + 0.5) / ppu, y = (r0 + r + 0.5) / ppu;
  const e = E.eval(x, y); console.log(`${c}:${r} ink ${e.ink.toFixed(3)} win wk${E.cWk}:${E.cWa}:${E.cWb}`);
  for (let j = 0; j < E.np; j++) {
    if (E.psurf[j] !== S || !(E.pd[j] < h + aa)) continue;
    const X = E.pd[j]; const qx = E.pfx[j] + (h * (x - E.pfx[j])) / X; const qy = E.pfy[j] + (h * (y - E.pfy[j])) / X;
    let bur = 0; let bm = -1;
    for (let m = 0; m < E.np; m++) { if (m === j || E.psurf[m] !== S) continue; const w = 1 - ss(h - 2 * aa, h, Math.sqrt(E.pieceD(m, qx, qy))); if (w > bur) { bur = w; bm = m; } }
    const ks: string[] = [];
    for (let i = 0; i < E.nk; i++) {
      const k = E.kk[i]; if (T.kG[k] !== S) continue; const rq = Math.hypot(qx - T.kCx[k], qy - T.kCy[k]);
      ks.push(`k${k}(c${T.kCa[k]}/${T.kCb[k]} rq-R ${((rq - T.kR[k]) / aa).toFixed(2)}aa Rmax-rq ${((T.kRmax[k] - rq) / aa).toFixed(2)}aa sec ${E.inSector(k, qx, qy) ? 1 : 0} out ${E.outsideArms(k, E.pc[j], qx, qy) ? 1 : 0})`);
    }
    console.log(`  p${j} c${E.pc[j]} s${E.ps[j].toFixed(3)} (h-X)/aa ${((h - X) / aa).toFixed(2)} tube ${bur.toFixed(3)}${bm >= 0 ? `(c${E.pc[bm]})` : ""} ${ks.join(" ")}`);
  }
}
