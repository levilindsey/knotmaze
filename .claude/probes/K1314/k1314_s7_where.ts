// K1314 s7: where a census label sits (x<n> = a crossing, j<n> = a junction centre).
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s7_where.ts <scene> <id>[,<id>...]
import { buildModel } from "./k1314_census";
const [nm, ids] = process.argv.slice(2);
const m = buildModel(nm);
for (const id of ids.split(",")) {
  const k = Number(id.slice(1));
  if (id[0] === "x") { const p = m.xPts[k]; console.log(`${id} ${p.x.toFixed(3)} ${p.y.toFixed(3)}`); }
  else { const J = m.scene.junctions[k]; console.log(`${id} ${J.c[0].toFixed(3)} ${J.c[1].toFixed(3)}`); }
}
