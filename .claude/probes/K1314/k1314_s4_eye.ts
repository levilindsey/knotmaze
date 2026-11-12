// K1314 s4: what the outline builds around a point (an eye between two close junctions, or a through bend):
// the junctions near it (arms), their corners, the regions and faces that contain it, the pieces near it.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s4_eye.ts <scene> <x> <y> [--r=1.2 (world)]
import { buildModel } from "./k1314_census";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const opt = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const [nm, xs, ys] = args; const X = +xs; const Y = +ys; const R = +(opt("r") ?? "1.2");
const m = buildModel(nm); const tb = m.table; const st = m.st;
const sc = m.scene as unknown as { junctions: { id: string; c: number[]; arms: { chain: number; kind: string; s: number; dir: number }[] }[] };
const h = tb.h; const f3 = (v: number): string => v.toFixed(3);
const inPoly = (pts: number[], x: number, y: number): boolean => {
  let c = false; const n = pts.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = pts[2 * i], yi = pts[2 * i + 1], xj = pts[2 * j], yj = pts[2 * j + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
console.log(`${nm} at (${X},${Y}) h ${f3(h)} W ${f3(tb.W)}`);
sc.junctions.forEach((j, ji) => {
  const d = Math.hypot(j.c[0] - X, j.c[1] - Y); if (d > R) return;
  console.log(`j${ji} (${f3(j.c[0])},${f3(j.c[1])}) d ${f3(d)} arms ${j.arms.map((a) => `c${a.chain}${a.kind[0]}${a.dir > 0 ? "+" : "-"}@${a.s.toFixed(2)}`).join(" ")}`);
  st.corners.forEach((dc, ci) => {
    if (dc.ji !== ji) return; const c = tb.corners[ci];
    console.log(`  corner ${ci} arms ${dc.aArm},${dc.bArm} c${c.aChain}/c${c.bChain}${dc.thru ? " THRU" : ""} ok ${c.ok} th ${((c.theta * 180) / Math.PI).toFixed(1)} r ${f3(c.r / h)}h V (${f3(c.Vx)},${f3(c.Vy)}) q (${f3(c.qx)},${f3(c.qy)}) ta (${f3(c.tax)},${f3(c.tay)}) tb (${f3(c.tbx)},${f3(c.tby)}) ${c.why ?? ""}`);
  });
});
tb.regions.forEach((r, i) => { if (inPoly(r.pts, X, Y)) console.log(`region ${i} owner ${r.ownerChain} group ${r.group} hole ${r.hole} npts ${r.pts.length / 2} pieces ${r.pieces.length}`); });
tb.faces.forEach((f, i) => { if (inPoly(f.pts, X, Y)) console.log(`face ${i} owner ${f.ownerChain} group ${f.group} hole ${f.hole} npts ${f.pts.length / 2}`); });
tb.pieces.forEach((p, i) => {
  let dm = Infinity; for (let k = 0; k < p.pts.length; k += 2) dm = Math.min(dm, Math.hypot(p.pts[k] - X, p.pts[k + 1] - Y));
  if (dm > 0.5 * R) return;
  console.log(`piece ${i} ${p.kind} c${p.chain} side ${p.side} s ${f3(p.s0)}..${f3(p.s1)} reg ${p.region} corner ${p.corner} n ${p.pts.length / 2} dmin ${f3(dm)} ends (${f3(p.pts[0])},${f3(p.pts[1])})-(${f3(p.pts[p.pts.length - 2])},${f3(p.pts[p.pts.length - 1])})`);
});
for (const d of tb.diagnostics) if (/eye|hole/i.test(d)) console.log(`diag ${d}`);
