// K1362 s1: the through-pass (K1049) corners, the census reference's (form_b_fillet thruCi) against mine, per junction.
//   node scripts/run_node.mjs .claude/probes/K1362/k1362s1_thru.ts <scene>
import { buildModel, filletOf } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/k1314_census.ts";
import { gfTablesOf } from "./k1362s1_census";
const nm = process.argv[2] ?? "def";
const m = buildModel(nm); const f = filletOf(m) as any; const T = gfTablesOf(m) as any; const h = T.h;
const ref = new Map<number, any>(); f.corners.forEach((c: any, i: number) => { if (f.thruCi.has(i)) ref.set(c.j, c); });
const mine = new Map<number, number>(); for (let k = 0; k < T.nK; k++) if (T.kThru[k]) mine.set(T.kJ[k], k);
let both = 0; let sd = 0; let big = 0; const rows: string[] = [];
for (const j of new Set([...ref.keys(), ...mine.keys()])) {
  const c = ref.get(j); const k = mine.get(j);
  const rr = c ? c.r / h : NaN; const rm = k !== undefined ? T.kR[k] / h : NaN;
  if (c && k !== undefined) { both++; sd += Math.abs(rr - rm); if (Math.abs(rr - rm) > 0.05) big++; }
  rows.push(`j${j} ref ${c ? `r/h ${rr.toFixed(3)} rV/h ${(c.rV / h).toFixed(3)} ok ${c.ok}` : "-"} | mine ${k !== undefined ? `r/h ${rm.toFixed(3)} rV/h ${(T.kRV[k] / h).toFixed(3)}` : "-"}`);
}
console.log(rows.slice(0, 14).join("\n"));
console.log(`${nm}: ref thru ${ref.size}, mine ${mine.size}, both ${both}, mean |dr|/h ${(sd / Math.max(1, both)).toFixed(3)}, |dr|/h > 0.05: ${big}`);
