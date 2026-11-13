// K1325 s1: a junction's arms (angle, chain, kind, s, L) and form B's diagnostics for it.
//   node scripts/run_node.mjs .claude/probes/K1325/k1325_junc.ts <scene> <ji>
import { buildModel, plainOf } from "../K1314/k1314_census";
const [nm, js] = process.argv.slice(2); const ji = +js;
const m = buildModel(nm); const fb = plainOf(m) as unknown as { arms: { ji?: number; j?: number; ei: number; ang: number; pi: number; L: number; ux: number; uy: number }[]; diagnostics: string[] };
const j = m.scene.junctions[ji];
console.log(`j${ji} id ${j.id} c (${j.c[0].toFixed(3)}, ${j.c[1].toFixed(3)}) arms ${j.arms.length}`);
j.arms.forEach((a, ei) => console.log(`  arm e${ei} chain ${a.chain} kind ${a.kind} s ${a.s.toFixed(3)}`));
fb.arms.forEach((a, i) => { if ((a.ji ?? a.j) === ji) console.log(`  fb arm ${i} e${a.ei} ang ${a.ang.toFixed(3)} L ${a.L.toFixed(3)} u (${a.ux.toFixed(3)}, ${a.uy.toFixed(3)})`); });
for (const d of fb.diagnostics) if (d.includes(`j${j.id} `)) console.log("  diag " + d);
