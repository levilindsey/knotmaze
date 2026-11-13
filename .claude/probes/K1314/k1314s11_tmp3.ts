// K1314 s11 scratch: pieces' fadeX / passes of their chain near a spot.
import { buildModel } from "./k1314_census";
const [nm, ps, xs, ys] = process.argv.slice(2);
const m = buildModel(nm); const X = +xs; const Y = +ys;
const id = (c: number): number => m.scene.chains[c]?.id ?? c;
for (const pi of ps.split(",").map(Number)) {
  const p = m.table.pieces[pi];
  console.log(`piece ${pi} ${p.kind} c${id(p.chain)} s ${p.s0.toFixed(3)}..${p.s1.toFixed(3)} fadeX ${p.fadeX === undefined ? "-" : "c" + id(p.fadeX)} alpha ${p.alpha ? "y" : "-"} corner ${p.corner}`);
  const P = (m.zz as any).passes[p.chain] as any[];
  for (const q of P) {
    const C = (m.zz as any).zc[q.o];
    // partner's point at so
    let k = 0; while (k + 1 < C.n && C.s[k + 1] <= q.so) k++;
    const px = C.xs[k]; const py = C.ys[k];
    if (Math.hypot(px - X, py - Y) > 1.2) continue;
    console.log(`  pass o c${id(q.o)} s ${q.s.toFixed(3)} lo ${q.lo.toFixed(2)} hi ${q.hi.toFixed(2)} so ${q.so.toFixed(3)} rO ${q.rO.toFixed(2)} at (${px.toFixed(2)},${py.toFixed(2)})`);
  }
}
