// K1314 s13 scratch: form B's fillet corners (form_b_fillet) at junctions: arms (chain/kind), ok, r, theta, V; and its fails.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314s13_fbc.ts <scene> <ji,ji>
import { buildModel, filletOf } from "./k1314_census";
const [nm, js] = process.argv.slice(2); const m: any = buildModel(nm); const f: any = filletOf(m);
for (const ji of js.split(",").map(Number)) {
  const J = m.scene.junctions?.[ji];
  console.log(`j${ji}: ${J ? J.arms.map((a: any, k: number) => `${k}:c${a.chain}/${a.kind}@${(+a.s).toFixed(2)}`).join(" ") : "?"}`);
  f.corners.forEach((c: any, ci: number) => {
    if (c.j !== ji) return; const A = f.arms[c.a]; const B = f.arms[c.b];
    console.log(`  fb corner ${ci}: arms ${A.ei}->${B.ei} ok ${c.ok} r ${(+c.r).toFixed(3)} th ${(+c.theta).toFixed(3)} V (${(+c.Vx).toFixed(3)},${(+c.Vy).toFixed(3)}) thru ${f.thruCi.has(ci)} ${Object.keys(c).join(",")}`);
  });
  (f.vfail ?? []).filter((v: any) => v.ji === ji).forEach((v: any) => console.log(`  vfail a ${v.a} b ${v.b} V (${v.Vx.toFixed(3)},${v.Vy.toFixed(3)})`));
  (f.fails ?? []).filter((v: any) => v.ji === ji).forEach((v: any) => console.log(`  fail ${JSON.stringify(v)}`));
}