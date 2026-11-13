// K1314 s12 scratch: a piece's points (border, inner centre/foot, alpha) for the listed indices.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314s12_pcs2.ts <scene> <piece:k0-k1,piece:...> (k range optional; default ends)
import { buildModel } from "./k1314_census";
import * as O from "../../../src/render/outline/outline";
const args = process.argv.slice(2);
if (args.includes("--off")) Object.keys(O.K1314S12).forEach((k) => ((O.K1314S12 as any)[k] = false));
const [nm, list] = args.filter((s) => !s.startsWith("--"));
const m = buildModel(nm);
for (const it of list.split(",")) {
  const [ps, rg] = it.split(":"); const pi = Number(ps);
  const p: any = m.table.pieces[pi]; const n = p.pts.length >> 1;
  console.log(`piece ${pi} ${p.kind} c${p.chain} side ${p.side} corner ${p.corner} n ${n} fadeX ${p.fadeX ?? "-"}`);
  let ks: number[] = [0, 1, n - 2, n - 1];
  if (rg) { const [a, b] = rg.split("-").map((v) => (v.startsWith("e") ? n - 1 - Number(v.slice(1)) : Number(v))); ks = []; for (let k = a; k <= b; k++) ks.push(k); }
  for (const k of ks) if (k >= 0 && k < n) console.log(`   ${k}: (${p.pts[2 * k].toFixed(4)},${p.pts[2 * k + 1].toFixed(4)}) c (${p.cpts[2 * k].toFixed(4)},${p.cpts[2 * k + 1].toFixed(4)}) a ${p.alpha ? p.alpha[2 * k].toFixed(2) + "/" + p.alpha[2 * k + 1].toFixed(2) : "-"}`);
}
