// K1314 s14: form B's parts at points: refEval, the plain evaluator, the fillet pick (and its evaluator when it
// picks), and the app's ink there.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314s14_fb.ts <scene> "x,y;x,y"
import { buildModel, refEval, filletOf, plainOf, filletPick } from "./k1314_census";
import { appInk } from "./k1314s11_view";
const [nm, pts] = process.argv.slice(2);
const m = buildModel(nm);
const f = (e: { ink: number; top: number; chain: number; s: number }): string => `${e.ink.toFixed(3)} top${e.top} c${e.chain} s${e.s.toFixed(3)}`;
for (const xy of pts.split(";")) {
  const [x, y] = xy.split(",").map(Number);
  const pk = filletPick(filletOf(m), x, y);
  const fe = pk.ci >= 0 ? f(filletOf(m).evalPoint(x, y)) : "-";
  console.log(`(${x},${y}) ref ${f(refEval(m, x, y))} | plain ${f(plainOf(m).evalPoint(x, y))} | pick ${pk.ci}${pk.yielded ? "y" : ""} fillet ${fe} | app ${appInk(m, Math.floor(x * 4000), Math.floor(y * 4000), 1, 1, 4000)[0].toFixed(3)}`);
}
