// K1314 s4: form B's own corners at given junctions (V, r, q, theta), next to the outline's, to compare
// where each puts a corner (the eye tips: which meet form B takes, and whether it rounds it).
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s4_fbc.ts <scene> <j> [<j> ...]
import { buildModel } from "./k1314_census";
import { FormB } from "../../../src/render/field/form_b";

const [nm, ...js] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const m = buildModel(nm); const h = m.table.h; const f3 = (v: number): string => v.toFixed(3);
const fb = new FormB(JSON.parse(JSON.stringify(m.scene)) as never, { dpr: 2 }) as unknown as { corners: { j: number; a: number; b: number; ok: boolean; theta: number; r: number; r0: number; room: number; Vx: number; Vy: number; qx: number; qy: number }[] };
for (const js1 of js) {
  const ji = +js1.replace(/^j/, "");
  for (const c of fb.corners) if (c.j === ji) console.log(`formB j${ji} arms ${c.a},${c.b} ok ${c.ok} th ${((c.theta * 180) / Math.PI).toFixed(1)} r ${f3(c.r / h)}h r0 ${f3(c.r0 / h)}h room ${f3(c.room / h)}h V (${f3(c.Vx)},${f3(c.Vy)}) q (${f3(c.qx)},${f3(c.qy)})`);
  m.st.corners.forEach((dc, ci) => { if (dc.ji !== ji) return; const c = m.table.corners[ci]; console.log(`outline j${ji} corner ${ci} arms ${dc.aArm},${dc.bArm} ok ${c.ok} th ${((c.theta * 180) / Math.PI).toFixed(1)} r ${f3(c.r / h)}h V (${f3(c.Vx)},${f3(c.Vy)}) q (${f3(c.qx)},${f3(c.qy)})`); });
}
