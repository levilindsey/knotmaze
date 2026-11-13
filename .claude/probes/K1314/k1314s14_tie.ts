// K1314 s14: draw.ts's tieAlpha for chain c at points, with own s and dC from the true foot (form B's) and,
// optionally, a given s; also the depth keys against each pass partner within h.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314s14_tie.ts <scene> <chain> <sGuess> "x,y;x,y"
import { buildModel } from "./k1314_census";
import * as D from "../../../src/render/outline/draw";
const [nm, cs, sg, pts] = process.argv.slice(2);
const m = buildModel(nm); const c = +cs; const h = m.table.h; const W = m.table.W; const zt = 0.1 * m.scene.look.depthAmp;
const ta = D.tieAlpha(m.zz, h, W, zt);
const C = m.zz.zc[c];
for (const xy of pts.split(";")) {
  const [x, y] = xy.split(",").map(Number);
  const f = D.footNear(C, x, y, +sg, 2 * h, 0, 0);
  const keyC = D.zAtC(C, f.s) - (f.d * zt) / h;
  const parts: string[] = [];
  for (const P of m.zz.passes[c]) {
    const O = m.zz.zc[P.o]; const fo = D.footNear(O, x, y, P.so, P.rO, f.s, P.o === c ? 3 * h : 0);
    if (!(fo.d < h)) continue;
    const keyO = D.zAtC(O, fo.s) - (fo.d * zt) / h;
    parts.push(`c${P.o} d${fo.d.toFixed(3)} s${fo.s.toFixed(3)} zO${D.zAtC(O, fo.s).toFixed(3)} kO-kC ${(keyO - keyC).toFixed(3)}`);
  }
  console.log(`(${x},${y}) own s${f.s.toFixed(3)} dC${f.d.toFixed(3)} zC${D.zAtC(C, f.s).toFixed(3)} zt${zt.toFixed(3)} tie ${ta(c, x, y, f.s, f.d).toFixed(3)} | ${parts.join("; ")}`);
}
