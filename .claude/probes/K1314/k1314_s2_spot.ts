// K1314 s2: which band pieces draw ink at a census find, and their geometry there.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s2_spot.ts <scene> <x> <y> [--r=0.6 (in h)] [--pts]
// Prints each piece with a band triangle within r of (x, y): index, kind, chain, side, corner, s0..s1,
// points, the triangles' alpha there; with --pts, each point of the piece within 2r: border (pts),
// foot (cpts), |pts - cpts| / W and the inner point (pts + W * unit(cpts - pts)).
import { buildModel } from "./k1314_census";

const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const [nm, xs, ys] = args.filter((a) => !a.startsWith("--"));
const m = buildModel(nm); const h = m.table.h; const W = m.table.W;
const R = Number(opt("r") ?? 0.6) * h; const x = Number(xs); const y = Number(ys);
console.log(`h ${h.toFixed(4)} W ${W.toFixed(4)} R ${R.toFixed(4)}`);
const hits = new Map<number, { n: number; amax: number }>();
for (let t = 0; t < m.nTri; t++) {
  if (m.tb[4 * t + 2] < x - R || m.tb[4 * t] > x + R || m.tb[4 * t + 3] < y - R || m.tb[4 * t + 1] > y + R) continue;
  const T = m.tri; let dmin = Infinity;
  for (let k = 0; k < 3; k++) {
    const ax = T[6 * t + 2 * k]; const ay = T[6 * t + 2 * k + 1]; const bx = T[6 * t + 2 * ((k + 1) % 3)]; const by = T[6 * t + 2 * ((k + 1) % 3) + 1];
    const ex = bx - ax; const ey = by - ay; const l2 = ex * ex + ey * ey || 1; const u = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / l2));
    dmin = Math.min(dmin, Math.hypot(ax + ex * u - x, ay + ey * u - y));
  }
  if (dmin > R) continue;
  const p = m.triP[t]; const a = Math.max(m.triA[3 * t], m.triA[3 * t + 1], m.triA[3 * t + 2]);
  const e = hits.get(p) ?? { n: 0, amax: 0 }; e.n++; e.amax = Math.max(e.amax, a); hits.set(p, e);
}
for (const [pi, e] of hits) {
  const p = m.table.pieces[pi];
  console.log(`piece ${pi} ${p.kind} chain ${p.chain} side ${p.side} corner ${p.corner} region ${p.region} s ${p.s0.toFixed(3)}..${p.s1.toFixed(3)} n ${p.pts.length / 2} tris ${e.n} amax ${e.amax.toFixed(2)}${p.alpha ? " alpha" : ""}${(p.kind === "run" || p.kind === "ghost") && p.chain >= 0 && m.zz.passes[p.chain]?.length ? " TIED" : ""}`);
  if (p.corner >= 0) { const c = m.table.corners[p.corner]; console.log(`  corner ${c.junction} a${c.aChain} b${c.bChain} ok ${c.ok} style ${c.style} th ${c.theta.toFixed(3)} r ${c.r.toFixed(4)} V (${c.Vx.toFixed(3)},${c.Vy.toFixed(3)}) q (${c.qx.toFixed(3)},${c.qy.toFixed(3)}) ${c.why ?? ""}`); }
  if (!args.includes("--pts")) continue;
  for (let i = 0; i < p.pts.length / 2; i++) {
    const px = p.pts[2 * i]; const py = p.pts[2 * i + 1]; if (Math.hypot(px - x, py - y) > 2 * R + W) continue;
    const cx = p.cpts[2 * i]; const cy = p.cpts[2 * i + 1]; const l = Math.hypot(cx - px, cy - py);
    const ix = l > 1e-12 ? px + ((cx - px) / l) * W : NaN; const iy = l > 1e-12 ? py + ((cy - py) / l) * W : NaN;
    const ang = (Math.atan2(cy - py, cx - px) * 180) / Math.PI;
    const al = p.alpha ? ` a ${p.alpha[2 * i].toFixed(2)}/${p.alpha[2 * i + 1].toFixed(2)}` : ""; console.log(`  ${String(i).padStart(3)}${al} pt (${px.toFixed(4)},${py.toFixed(4)}) foot (${cx.toFixed(4)},${cy.toFixed(4)}) |d|/W ${(l / W).toFixed(2)} dir ${ang.toFixed(0)} inner (${ix.toFixed(4)},${iy.toFixed(4)})`);
  }
}
