import { buildModel, refEval } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/k1314_census.ts";
import { gfTablesOf } from "./k1362s1_census";
import { GfEval } from "../../../src/render/gpu_field/eval";
const [nm, xs, ys] = process.argv.slice(2); const x = +xs; const y = +ys;
const m = buildModel(nm); const T = gfTablesOf(m); const E = new GfEval(T) as any;
E.eval(x, y); const h = T.h;
for (let j = 0; j < E.np; j++) {
  const X = E.pd[j]; const qx = E.pfx[j] + (h * (x - E.pfx[j])) / X; const qy = E.pfy[j] + (h * (y - E.pfy[j])) / X;
  const ds = []; for (let k = 0; k < E.np; k++) ds.push(`${k}:c${E.pc[k]} ${(Math.sqrt(E.pieceD(k, qx, qy)) / h).toFixed(3)}`);
  console.log(`piece ${j} c${E.pc[j]} d/h ${(X / h).toFixed(3)} seg ${E.plo[j]}..${E.phi[j]} surf ${E.psurf[j]} q (${qx.toFixed(4)},${qy.toFixed(4)}) dist/h to pieces: ${ds.join(", ")}`);
}
const f = refEval(m, x, y) as any; console.log(JSON.stringify(f.term));
