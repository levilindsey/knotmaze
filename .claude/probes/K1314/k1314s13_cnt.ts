// K1314 s13: the table's pieces and points by kind, thruGate off vs on (what paintFrame gets more of).
//   node scripts/run_node.mjs .claude/probes/K1314/k1314s13_cnt.ts <scene>
import { buildModel } from "./k1314_census";
import * as O from "../../../src/render/outline/outline";
const nm = process.argv[2];
const count = (): string => {
  const m: any = buildModel(nm); const by: Record<string, [number, number]> = {};
  for (const p of m.table.pieces) { const k = p.kind ?? "?"; by[k] ??= [0, 0]; by[k][0]++; by[k][1] += p.pts.length >> 1; }
  return Object.entries(by).map(([k, [n, v]]) => `${k} ${n}/${v}`).join("  ");
};
O.K1314S13.thruGate = false; console.log(`off: ${count()}`);
O.K1314S13.thruGate = true; console.log(`on : ${count()}`);
