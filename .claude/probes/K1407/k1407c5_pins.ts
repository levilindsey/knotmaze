// K1407 c5: a chain's pins (s, z, theta, position) and the partner pin at the same point.
//   node scripts/run_node.mjs .claude/probes/K1407/k1407c5_pins.ts <scene> <c> [sLo] [sHi]
import { buildModel } from "../K1314/k1314_census.ts";
import { gfTablesOf } from "../K1362/k1362s1_census.ts";
import { chainAt } from "../../../src/render/gpu_field/tables.ts";
const [nm, cs, lo, hi] = process.argv.slice(2);
const T = gfTablesOf(buildModel(nm)) as any; const c = +cs; const sLo = lo ? +lo : -1e9, sHi = hi ? +hi : 1e9;
const nC = T.cPin0.length;
for (let i = T.cPin0[c]; i < T.cPin0[c] + T.cPinN[c]; i++) {
  const s = T.pinS[i]; if (s < sLo || s > sHi) continue; const p = chainAt(T, c, s);
  let part = "";
  for (let c2 = 0; c2 < nC; c2++) for (let k = T.cPin0[c2]; k < T.cPin0[c2] + T.cPinN[c2]; k++) {
    if (c2 === c && k === i) continue; const q = chainAt(T, c2, T.pinS[k]);
    if (Math.hypot(q.x - p.x, q.y - p.y) < 0.2) part += ` partner(${Math.hypot(q.x - p.x, q.y - p.y).toFixed(3)}) c${c2} s=${T.pinS[k].toFixed(3)} z=${T.pinZ[k]}`;
  }
  console.log(`c${c} pin s=${s.toFixed(3)} z=${T.pinZ[i]} at (${p.x.toFixed(3)},${p.y.toFixed(3)})${part}`);
}


