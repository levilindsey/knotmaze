// K1346 s1: per-quad opposed area (bandQuadOpp) of one built piece: <scene> <piece> [from] [to]
import { buildModel } from "../K1314/k1314_census";
import * as O from "../../../src/render/outline/outline";
const a = process.argv.slice(2);
const m = buildModel(a[0]); const p = m.table.pieces[Number(a[1])] as any; const W = m.table.W;
const np = p.pts.length >> 1; let tot = 0; for (let i = 0; i < np - 1; i++) tot += O.bandQuadArea(p.pts, p.cpts, W, i);
const lo = Number(a[2] ?? 0); const hi = Math.min(np - 2, Number(a[3] ?? np - 2));
console.log(`piece ${a[1]} ${p.kind} np ${np} W ${W} tot ${tot.toExponential(2)}`);
const out: string[] = [];
for (let i = lo; i <= hi; i++) { const o = O.bandQuadOpp(p.pts, p.cpts, W, i, tot); if (o > 1e-9) out.push(`${i}:${o.toExponential(1)}`); }
console.log(out.join(" ") || "none");
