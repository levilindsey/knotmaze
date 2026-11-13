// K1314 s14: form B's ink and the app's across a run piece's band between points i and j (both edges and the
// middle, at fractions along), with the piece's alpha and ownAlpha per point.
//   [K1314S13_SET=...] node scripts/run_node.mjs .claude/probes/K1314/k1314s13_set.ts .claude/probes/K1314/k1314s14_quad.ts <scene> <piece> <i> <j> [--n=6]
import { buildModel, refEval } from "./k1314_census";
import { appInk } from "./k1314s11_view";
import { ownAlpha } from "../../../src/render/outline/band_gpu";
const args = process.argv.slice(2);
const [nm, pis, is, js] = args.filter((s) => !s.startsWith("--"));
const N = Number(args.find((s) => s.startsWith("--n="))?.slice(4) ?? 6);
const m = buildModel(nm); const t = m.table; const p = t.pieces[+pis]; const W = t.W; const h = t.h;
const oa = ownAlpha(p, m.zz, h, W);
console.log(`h ${h} W ${W} piece ${pis} ${p.kind} ch${p.chain} side${p.side} fadeX ${p.fadeX}`);
const at = (i: number): number[] => {
  const x = p.pts[2 * i]; const y = p.pts[2 * i + 1]; let dx = p.cpts[2 * i] - x; let dy = p.cpts[2 * i + 1] - y; const l = Math.sqrt(dx * dx + dy * dy) || 1; dx /= l; dy /= l;
  return [x, y, x + dx * W, y + dy * W];
};
for (let i = Math.min(+is, +js); i <= Math.max(+is, +js); i++) {
  const [x, y, u, v] = at(i);
  console.log(`pt ${i} out (${x.toFixed(3)},${y.toFixed(3)}) in (${u.toFixed(3)},${v.toFixed(3)}) alpha ${p.alpha?.[2 * i]?.toFixed(3)}/${p.alpha?.[2 * i + 1]?.toFixed(3)} fadeA ${p.fadeA?.[2 * i]?.toFixed(3)}/${p.fadeA?.[2 * i + 1]?.toFixed(3)} own ${oa?.[2 * i]?.toFixed(3)}/${oa?.[2 * i + 1]?.toFixed(3)}`);
}
const A = at(+is); const B = at(+js); const ppu = 4000;
console.log("frac: form B out/mid/in | app out/mid/in");
for (let k = 0; k <= N; k++) {
  const f = k / N; const row: string[] = []; const rowA: string[] = [];
  for (const e of [0.03, 0.5, 0.97]) {
    const x = (1 - f) * ((1 - e) * A[0] + e * A[2]) + f * ((1 - e) * B[0] + e * B[2]); const y = (1 - f) * ((1 - e) * A[1] + e * A[3]) + f * ((1 - e) * B[1] + e * B[3]);
    const ev = refEval(m, x, y); row.push(`${ev.ink.toFixed(2)}c${ev.chain}`);
    rowA.push(appInk(m, Math.floor(x * ppu), Math.floor(y * ppu), 1, 1, ppu)[0].toFixed(2));
  }
  console.log(`${f.toFixed(2)}: ${row.join(" ")} | ${rowA.join(" ")}`);
}
