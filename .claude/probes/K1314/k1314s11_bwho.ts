// K1314 s11 scratch: form B's ink, top chain and its s at points, and the app pieces of that chain covering s.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314s11_bwho.ts <scene> "x,y;x,y"
import { buildModel, refEval } from "./k1314_census";
const [nm, pts] = process.argv.slice(2);
const m = buildModel(nm);
for (const q of pts.split(";")) {
  const [x, y] = q.split(",").map(Number);
  const r = refEval(m, x, y);
  const ps = m.table.pieces.map((p, i) => ({ p, i })).filter(({ p }) => p.chain === r.chain && Math.min(p.s0, p.s1) - 0.3 <= r.s && Math.max(p.s0, p.s1) + 0.3 >= r.s);
  console.log(`(${x},${y}) B ink ${r.ink.toFixed(3)} top c${r.chain} s ${r.s.toFixed(3)} | ${ps.map(({ p, i }) => `${i} ${p.kind} side${p.side} ${p.s0.toFixed(2)}..${p.s1.toFixed(2)}${p.fadeX !== undefined ? ` fX${p.fadeX}` : ""}`).join("; ")}`);
}
