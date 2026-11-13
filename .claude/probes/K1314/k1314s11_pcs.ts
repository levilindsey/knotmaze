// K1314 s11: print pieces' points (pts, cpts, alpha, tie slots) inside a window.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314s11_pcs.ts <scene> <x> <y> <half> <piece,piece,...>
import { buildModel } from "./k1314_census";
const [nm, xs, ys, hs, ps] = process.argv.slice(2);
const m = buildModel(nm); const X = +xs; const Y = +ys; const R = +hs;
for (const pi of ps.split(",").map(Number)) {
  const p = m.table.pieces[pi]; const n = p.pts.length / 2;
  console.log(`piece ${pi} ${p.kind} c${m.scene.chains[p.chain]?.id ?? p.chain} side ${(p as any).side} corner ${p.corner} s ${(p as any).s0?.toFixed?.(3)}..${(p as any).s1?.toFixed?.(3)} n ${n}`);
  for (let i = 0; i < n; i++) {
    const x = p.pts[2 * i]; const y = p.pts[2 * i + 1]; if (Math.abs(x - X) > R || Math.abs(y - Y) > R) continue;
    console.log(`  ${i} (${x.toFixed(3)},${y.toFixed(3)}) c (${p.cpts[2 * i].toFixed(3)},${p.cpts[2 * i + 1].toFixed(3)}) a ${p.alpha ? `${p.alpha[2 * i].toFixed(2)}/${p.alpha[2 * i + 1].toFixed(2)}` : "-"}`);
  }
}
