// K1346 s1: dump one piece's points (pts, cpts, alpha) and each band quad's signed area. Usage: <scene> <piece> [--off=flag,...]
import { buildModel } from "../K1314/k1314_census";
import * as O from "../../../src/render/outline/outline";
const a = process.argv.slice(2); const off = a.find((x) => x.startsWith("--off="))?.slice(6).split(",") ?? [];
for (const f of off) (O.K1346 as Record<string, boolean>)[f] = false;
const m = buildModel(a[0]); const p = m.table.pieces[Number(a[1])] as any; const W = (m.table as any).W ?? 0;
console.log(`piece ${a[1]} kind ${p.kind} chain ${p.chain} corner ${p.corner} side ${p.side} np ${p.pts.length / 2} W ${W}`);
const f = (v: number) => v.toFixed(4);
for (let i = 0; i < p.pts.length / 2; i++) {
  const al = p.alpha ? ` a ${p.alpha[2 * i].toFixed(2)} ${p.alpha[2 * i + 1].toFixed(2)}` : "";
  console.log(`${i} p (${f(p.pts[2 * i])}, ${f(p.pts[2 * i + 1])}) c (${f(p.cpts[2 * i])}, ${f(p.cpts[2 * i + 1])})${al}`);
}
