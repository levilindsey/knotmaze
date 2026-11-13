// K1325 s2: plain form B, the self plateau and the gated reference rule at single points.
//   node scripts/run_node.mjs .claude/probes/K1325/k1325_s2_px.ts <scene> <x:y;x:y;...>
import { buildModel, plainOf, plateauOf, plateauEval, selfTie } from "../K1314/k1314_census";

const a = process.argv.slice(2);
const m = buildModel(a[0]); const pl = plainOf(m); const pz = plateauOf(m, "self");
type E = { ink: number; top: number; chain: number; s: number; fade?: number; key?: number; dkey?: number; nSurf?: number };
const f = (e: E): string => `ink ${e.ink.toFixed(2)} top ${e.top} ch ${e.chain} s ${e.s.toFixed(2)} fade ${e.fade} dkey ${e.dkey?.toFixed(3)} n ${e.nSurf}`;
for (const p of a[1].split(";")) {
  const [x, y] = p.split(":").map(Number);
  console.log(`(${x}, ${y}) selfTie ${selfTie(pz, x, y)}\n  plain ${f(pl.evalPoint(x, y) as E)}\n  pz    ${f(pz.F.evalPoint(x, y) as E)}\n  gated ${f(plateauEval(m, pz, x, y) as E)}`);
}
