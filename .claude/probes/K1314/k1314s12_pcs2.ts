import { buildModel } from "./k1314_census";
const m = buildModel("muse_hash");
for (const pi of [797, 1302, 121]) {
  const p: any = m.table.pieces[pi]; const n = p.pts.length >> 1;
  console.log(`piece ${pi} ${p.kind} c${p.chain} side ${p.side} corner ${p.corner} s0 ${p.s0?.toFixed(3)} s1 ${p.s1?.toFixed(3)} n ${n} alpha ${p.alpha ? "yes" : "no"} fadeX ${p.fadeX ?? "-"} keys ${Object.keys(p).join(",")}`);
  for (const k of [0, 1, n - 2, n - 1]) console.log(`   ${k}: (${p.pts[2 * k].toFixed(3)},${p.pts[2 * k + 1].toFixed(3)}) c (${p.cpts[2 * k].toFixed(3)},${p.cpts[2 * k + 1].toFixed(3)}) a ${p.alpha ? p.alpha[2 * k].toFixed(2) + "/" + p.alpha[2 * k + 1].toFixed(2) : "-"}`);
}
