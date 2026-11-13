import { buildModel } from "../K1314/k1314_census";
const m = buildModel("muse_hash");
for (const pi of [121, 1781]) {
  const p = m.table.pieces[pi] as any; const np = p.pts.length / 2;
  console.log(`p${pi} ${p.kind} ch ${p.chain} s ${p.s0.toFixed(3)}-${p.s1.toFixed(3)} np ${np} alpha ${p.alpha ? "yes" : "no"} keys ${Object.keys(p).join(",")}`);
  const pick = pi === 121 ? [np - 3, np - 2, np - 1] : Array.from({ length: np }, (_, i) => i);
  for (const i of pick) {
    const x = p.pts[2 * i], y = p.pts[2 * i + 1], cx = p.cpts[2 * i], cy = p.cpts[2 * i + 1];
    console.log(`  ${i} pt (${x.toFixed(4)}, ${y.toFixed(4)}) cpt (${cx.toFixed(4)}, ${cy.toFixed(4)}) |d| ${Math.hypot(cx - x, cy - y).toFixed(4)} a ${p.alpha ? p.alpha[2 * i].toFixed(3) + "/" + p.alpha[2 * i + 1].toFixed(3) : "-"}`);
  }
}
console.log(`W ${m.table.W} h ${m.table.h}`);

