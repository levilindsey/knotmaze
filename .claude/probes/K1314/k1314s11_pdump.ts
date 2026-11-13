// K1314 s11 scratch: a piece's points (outer), alpha and fadeA per point, and ownAlpha's result.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314s11_pdump.ts <scene> <piece> [from=0] [to=end]
import { buildModel } from "./k1314_census";
import { ownAlpha } from "../../../src/render/outline/band_gpu";
const [nm, pis, a0, a1] = process.argv.slice(2);
const m = buildModel(nm);
const p = m.table.pieces[+pis];
const np = p.pts.length / 2;
const own = ownAlpha(p, m.zz as never, m.table.h, m.table.W);
console.log(`piece ${pis} ${p.kind} c${p.chain} side${p.side} s ${p.s0.toFixed(3)}..${p.s1.toFixed(3)} np ${np} fadeX ${p.fadeX}`);
for (let i = Math.max(0, +(a0 ?? 0)); i < Math.min(np, a1 ? +a1 : np); i++) {
  const f = (v: number[] | null | undefined, k: number): string => (v ? v[k].toFixed(3) : "-");
  console.log(`${i} (${p.pts[2 * i].toFixed(3)},${p.pts[2 * i + 1].toFixed(3)}) al ${f(p.alpha, 2 * i)}/${f(p.alpha, 2 * i + 1)} fa ${f(p.fadeA, 2 * i)}/${f(p.fadeA, 2 * i + 1)} own ${f(own, 2 * i)}/${f(own, 2 * i + 1)}`);
}
