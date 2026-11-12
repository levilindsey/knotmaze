// K1314 s7: a junction's fill item and its arms: chain, end (s), dir, the strip item on that arm and its interval's
// stations and pieces (the L/R border pieces' s ranges), so a strip whose ranges part at the junction end shows.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s7_junc.ts <scene> <j>[,<j>...]
import { buildModel } from "./k1314_census";

const [nm, js] = process.argv.slice(2);
const m = buildModel(nm); const st = m.st as any; const fs = m.fs as any; const table = m.table as any;
const f3 = (v: number): string => (typeof v === "number" ? v.toFixed(3) : String(v));
for (const jid of js.split(",").map(Number)) {
  const ii = fs.items.findIndex((it: any) => it.kind === "junc" && it.ji === jid);
  const J = fs.items[ii];
  if (!J) { console.log(`j${jid}: no junc item`); continue; }
  console.log(`j${jid} item ${ii} owner c${J.owner} arms ${J.arms.length}`);
  for (const a of J.arms) {
    const A = st.arms[a.ai];
    const sit = a.strip >= 0 ? fs.items[a.strip] : null;
    let extra = "";
    if (sit) {
      const I = st.intervalsD[sit.iv];
      const pl = table.pieces[sit.pL]; const pr = table.pieces[sit.pR];
      const rng = (p: any): string => (p && p.pts && p.pts.length >= 4 ? `[${f3(p.s0)},${f3(p.s1)}] n${p.pts.length / 2}` : p ? `short n${p.pts?.length / 2}` : "none");
      extra = ` strip item ${a.strip} iv ${sit.iv} aSt ${I.aSt} bSt ${I.bSt} L ${rng(pl)} R ${rng(pr)}`;
    }
    console.log(`  arm ${a.ai} c${a.pi} ei ${a.ei} dir ${A.dir} s ${f3(A.sR) + " kind " + A.kind + " L " + A.L} atStart ${a.atStart} corner ${a.corner}${extra}`);
  }
}
