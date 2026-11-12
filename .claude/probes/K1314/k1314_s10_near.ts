import { buildModel } from "./k1314_census";
const [nm, xs, ys, rs] = process.argv.slice(2); const x = +xs, y = +ys, r = +(rs ?? 1.2);
const m = buildModel(nm); const sc = m.scene as any;
sc.junctions.forEach((j: any, i: number) => { const d = Math.hypot(j.c[0] - x, j.c[1] - y); if (d < r) console.log(`j${i} (${j.c[0].toFixed(3)},${j.c[1].toFixed(3)}) d ${d.toFixed(3)} ${JSON.stringify(j).slice(0, 220)}`); });
(m.xPts as any[]).forEach((p: any, i: number) => { const d = Math.hypot(p.x - x, p.y - y); if (d < r) { const X = sc.crossings[i]; console.log(`x${i} (${p.x.toFixed(3)},${p.y.toFixed(3)}) d ${d.toFixed(3)} ${JSON.stringify(X).slice(0, 200)}`); } });
