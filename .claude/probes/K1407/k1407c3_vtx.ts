// K1407 c3: the vertex term at crop pixels: per pair of same-surface pieces, the first vertex (lines through p's
// feet), the refined one (lines through V0's feet), dV, both residuals |d - h| and the burial.
//   node scripts/run_node.mjs .claude/probes/K1407/k1407c3_vtx.ts <scene> <x> <y> <c:r,c:r,...>
import { buildModel } from "../K1314/k1314_census.ts";
import { gfTablesOf } from "../K1362/k1362s1_census.ts";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";

const [nm, xs, ys, list] = process.argv.slice(2);
const X = +xs, Y = +ys; const m0 = buildModel(nm); const T = gfTablesOf(m0) as any; const E = new GfEval(T) as any;
const h = T.h, aa = T.aa, W = T.W, P = 480, ppu = P / (2.5 * h); const c0 = Math.round(X * ppu - P / 2), r0 = Math.round(Y * ppu - P / 2);
const f = (v: number): string => v.toFixed(4);
console.log(`h ${f(h)} W ${f(W)} aa ${f(aa)} ppu ${f(ppu)}`);
for (const cr of list.split(",")) {
  const [c, r] = cr.split(":").map(Number); const x = (c0 + c + 0.5) / ppu, y = (r0 + r + 0.5) / ppu;
  const e = E.eval(x, y);
  console.log(`px ${c}:${r} ink=${f(e.ink)} win=${e.winKind}/${e.winA}/${e.winB}`);
  for (let j = 0; j < E.np; j++) for (let m = j + 1; m < E.np; m++) {
    if (E.psurf[j] !== E.psurf[m]) continue;
    const Xj = E.pd[j], Xm = E.pd[m];
    const njx = (x - E.pfx[j]) / Xj, njy = (y - E.pfy[j]) / Xj, cj = h + njx * E.pfx[j] + njy * E.pfy[j];
    const nmx = (x - E.pfx[m]) / Xm, nmy = (y - E.pfy[m]) / Xm, cm = h + nmx * E.pfx[m] + nmy * E.pfy[m];
    const det = njx * nmy - njy * nmx; const V0x = (cj * nmy - cm * njy) / det, V0y = (njx * cm - nmx * cj) / det;
    const ej = E.pieceF(j, V0x, V0y), gjx = E.fX, gjy = E.fY; const em = E.pieceF(m, V0x, V0y), gmx = E.fX, gmy = E.fY;
    const rj = Math.sqrt(ej), rm = Math.sqrt(em);
    const ujx = (V0x - gjx) / rj, ujy = (V0y - gjy) / rj, kj = h + ujx * gjx + ujy * gjy;
    const umx = (V0x - gmx) / rm, umy = (V0y - gmy) / rm, km = h + umx * gmx + umy * gmy;
    const det2 = ujx * umy - ujy * umx; const Vx = (kj * umy - km * ujy) / det2, Vy = (ujx * km - umx * kj) / det2;
    const dV0 = Math.hypot(x - V0x, y - V0y), dV = Math.hypot(x - Vx, y - Vy);
    const resJ = Math.sqrt(E.pieceD(j, Vx, Vy)) - h, resM = Math.sqrt(E.pieceD(m, Vx, Vy)) - h;
    console.log(`  c${E.pc[j]}(d-h ${f(Xj - h)}) x c${E.pc[m]}(d-h ${f(Xm - h)}) det ${f(det)} V0 (${f(V0x)},${f(V0y)}) dV0 ${f(dV0)} V0res ${f(rj - h)},${f(rm - h)} V (${f(Vx)},${f(Vy)}) dV ${f(dV)} res ${f(resJ)},${f(resM)} vtx ${f(E.vtx(E.psurf[j], x, y))}`);
  }
}
