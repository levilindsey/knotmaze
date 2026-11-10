// K1247 s5: the pieces study's runner (k1247s5_pieces.mjs writes the
// instrumented outline_pieces.ts first). One frame per scene and mult.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s5_pieces.ts [--scene=def]
import * as O from "./outline_pieces";
import { ALL, multsOf, sceneOf } from "./k1247s5_scenes";

const only = process.argv.find((a) => a.startsWith("--scene="))?.slice(8);
const P = O.pcStats;
const tot = { corners: 0, nodes: 0, changes: 0, span: 0, mCalls: 0, mNonZero: 0, mBand: 0, walkSegs: 0, wCalls: 0, wToMargin: 0 };
const histT = [0, 0, 0, 0, 0, 0]; const fracT = [0, 0, 0, 0, 0];
for (const name of ALL) {
  if (only && name !== only) continue;
  for (const mult of multsOf(name)) {
    const sc = sceneOf(name, mult);
    const st = O.structure(sc);
    O.resetPc();
    O.frame(st, sc);
    const c = Math.max(1, P.corners); const m = Math.max(1, P.mCalls);
    console.log(`${name} ${mult}: corners ${P.corners}, nodes/corner ${(P.nodes / c).toFixed(1)}, state changes/corner ${(P.changes / c).toFixed(2)} (max ${P.changesMax}), segments crossed/corner ${(P.span / c).toFixed(2)} (max ${P.spanMax}; 0/1/2/3-4/5-8/9+: ${P.hist.join("/")}), nodes on a vertex ${(100 * P.vtxNodes / Math.max(1, P.nodes)).toFixed(0)}%; w calls ${P.wCalls}, to the margin ${(100 * P.wToMargin / Math.max(1, P.wCalls)).toFixed(0)}%; margin calls ${P.mCalls}: nonzero ${(100 * P.mNonZero / m).toFixed(1)}%, in band ${(100 * P.mBand / m).toFixed(1)}%, walk segments/call ${(P.walkSegs / m).toFixed(1)}; integral/r0 =1/>=0.9/>=0.5/>0/0: ${P.frac.join("/")}`);
    for (const k of Object.keys(tot) as (keyof typeof tot)[]) tot[k] += P[k] as number;
    for (let i = 0; i < 6; i++) histT[i] += P.hist[i];
    for (let i = 0; i < 5; i++) fracT[i] += P.frac[i];
  }
}
const c = Math.max(1, tot.corners); const m = Math.max(1, tot.mCalls);
console.log(`ALL: corners ${tot.corners}, nodes/corner ${(tot.nodes / c).toFixed(1)}, state changes/corner ${(tot.changes / c).toFixed(2)}, segments crossed/corner ${(tot.span / c).toFixed(2)} (0/1/2/3-4/5-8/9+: ${histT.join("/")}); to the margin ${(100 * tot.wToMargin / Math.max(1, tot.wCalls)).toFixed(0)}% of w calls; margin nonzero ${(100 * tot.mNonZero / m).toFixed(1)}%, in band ${(100 * tot.mBand / m).toFixed(1)}%, walk segments/call ${(tot.walkSegs / m).toFixed(1)}; integral/r0 =1/>=0.9/>=0.5/>0/0: ${fracT.join("/")}`);
