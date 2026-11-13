// K1314 s12 scratch: the pieces of given corners (kind, chain, side, points, first/last point) and the corners' arms.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314s12_corner.ts <scene> <corner,corner>
import { buildModel } from "./k1314_census";
import * as O from "../../../src/render/outline/outline";
const [nm, cs] = process.argv.slice(2);
const m = buildModel(nm); const st = (m as any).st ?? O.structure((m as any).scene);
const ids = cs.split(",").map(Number);
for (const ci of ids) {
  const c = st.corners[ci]; const arm = (a: number) => { const o = st.arms[a]; return `[pi ${o.pi} ${o.kind} dir ${o.dir} s ${o.s.toFixed(2)}]`; };
  console.log(`corner ${ci}: ji ${c.ji} aArm ${c.aArm} ${arm(c.aArm)} bArm ${c.bArm} ${arm(c.bArm)} thru ${c.thru} keys ${Object.keys(c).join(",")}`);
  m.table.pieces.forEach((p, pi) => {
    if (p.corner !== ci) return; const n = p.pts.length >> 1;
    console.log(`  piece ${pi} ${p.kind} c${p.chain} side ${p.side} n ${n} first (${p.pts[0]?.toFixed(3)},${p.pts[1]?.toFixed(3)}) last (${p.pts[2 * n - 2]?.toFixed(3)},${p.pts[2 * n - 1]?.toFixed(3)})`);
  });
}
for (const ci of ids) {
  const ji = st.corners[ci].ji; const ks = st.corners.map((c, k) => (c.ji === ji ? k : -1)).filter((k) => k >= 0);
  console.log(`j${ji} corners: ${ks.map((k) => `${k}(${st.corners[k].aArm}-${st.corners[k].bArm} style ${st.corners[k].style}${st.corners[k].thru ? " thru" : ""})`).join(" ")}`);
  console.log(`  diagram pieces at those corners: ${st.piecesD.map((d: any, i) => (ks.includes(d.corner) ? `${i}:${d.kind}/c${d.chain}${d.interval ? "/iv" : ""}@${d.corner}` : "")).filter(Boolean).join(" ")}`);
}
