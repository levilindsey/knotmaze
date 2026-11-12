// K1314 s3: a thru corner the outline rounds where form_b_fillet has none (census k1049 "extra"):
// form_b_fillet's diagnostics and arms at the junction, against the outline's corner.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s3_extra.ts <scene> <j>[,<j>...]
import { buildModel, filletOf } from "./k1314_census";

const [nm, jl] = process.argv.slice(2);
const js = (jl ?? "13").split(",").map(Number);
const m = buildModel(nm ?? "g41_ring_tw42"); const st = m.st; const tb = m.table;
const fbf = filletOf(m) as unknown as { diagnostics: string[]; arms: { j: number; ei: number; L: number; Lcut: number; ang: number; ux: number; uy: number }[]; corners: { j: number; a: number; b: number; ok: boolean; r: number }[] };
const sc = m.scene as unknown as { junctions: { id: number; c: number[]; arms: { chain: number; kind: string; s: number }[] }[] };
for (const J of js) {
  const jid = sc.junctions[J].id;
  console.log(`== ${nm} j${J} (id ${jid}) h ${tb.h.toFixed(4)}`);
  for (const d of fbf.diagnostics) if (d.includes(`j${jid} `)) console.log(`  fbf diag: ${d}`);
  fbf.arms.forEach((a, i) => { if (a.j === J) { const x = sc.junctions[J].arms[a.ei]; console.log(`  fbf arm ${i} ei ${a.ei} ${x.kind} chain ${x.chain} ang ${((a.ang * 180) / Math.PI).toFixed(1)} L ${(a.L / tb.h).toFixed(3)} h Lcut ${(a.Lcut / tb.h).toFixed(3)} h`); } });
  fbf.corners.forEach((c, k) => { if (c.j === J) console.log(`  fbf corner ${k} arms ${c.a},${c.b} ok ${c.ok} r ${(c.r / tb.h).toFixed(3)} h`); });
  st.corners.forEach((dc, ci) => {
    if (dc.ji !== J) return; const c = tb.corners[ci];
    console.log(`  outline corner ${ci} arms ${dc.aArm},${dc.bArm}${dc.thru ? " THRU" : ""} ok ${c.ok} ${c.ok ? `th ${((c.theta * 180) / Math.PI).toFixed(1)} r ${(c.r / tb.h).toFixed(3)} h` : c.why}`);
  });
}
