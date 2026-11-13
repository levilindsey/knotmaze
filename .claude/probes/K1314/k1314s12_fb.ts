import { buildModel, filletOf, filletPick, plainOf, refEval } from "./k1314_census";
const m = buildModel("muse_hash"); const f: any = filletOf(m);
for (const [x, y] of [[4.78, 33.38], [4.75, 33.40], [4.72, 33.45], [4.75, 33.52], [4.70, 33.62], [4.80, 33.33]]) {
  const p = filletPick(f, x, y); const pl = plainOf(m).evalPoint(x, y); const r = refEval(m, x, y);
  console.log(`(${x},${y}) pick ci ${p.ci} y ${p.yielded} | plain ink ${pl.ink.toFixed(3)} c${pl.chain} top ${pl.top} | ref ${r.ink.toFixed(3)} c${r.chain}` + (p.ci >= 0 ? ` | fillet ${JSON.stringify(f.evalPoint(x, y)).slice(0, 80)}` : ""));
}
