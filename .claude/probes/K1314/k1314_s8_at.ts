// K1314 s8: which outline pieces ink near a point.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s8_at.ts <scene> <x> <y> [--r=0.05] [--pts]
// Lists every piece with a band triangle within r (world) of (x, y): its index, kind, chain, side, s0..s1,
// corner, region, point count, the nearest band point and the largest alpha it lays inside r. --pts also
// prints the piece's border points (pts) within 3 r of the point, with their index.
import { buildModel } from "./k1314_census";

const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const [nm, xs, ys] = args.filter((a) => !a.startsWith("--"));
const m = buildModel(nm); const x = +xs; const y = +ys; const r = Number(opt("r") ?? 0.05);
const hit = new Map<number, { a: number; d: number }>();
for (let t = 0; t < m.nTri; t++) {
  if (m.tb[4 * t + 2] < x - r || m.tb[4 * t] > x + r || m.tb[4 * t + 3] < y - r || m.tb[4 * t + 1] > y + r) continue;
  let dmin = Infinity; let amax = 0;
  for (let k = 0; k < 3; k++) {
    const d = Math.hypot(m.tri[6 * t + 2 * k] - x, m.tri[6 * t + 2 * k + 1] - y); if (d < dmin) dmin = d;
    if (d < r) amax = Math.max(amax, m.triA[3 * t + k]);
  }
  const pi = m.triP[t]; const o = hit.get(pi) ?? { a: 0, d: Infinity };
  hit.set(pi, { a: Math.max(o.a, amax), d: Math.min(o.d, dmin) });
}
console.log(`${nm} (${x}, ${y}) r ${r} h ${m.scene.look.halfWidth} W ${m.table.W}`);
for (const [pi, v] of [...hit].sort((p, q) => p[1].d - q[1].d)) {
  const p = m.table.pieces[pi];
  console.log(`piece ${pi} ${p.kind} c${p.chain} side ${p.side} s ${p.s0.toFixed(3)}..${p.s1.toFixed(3)} corner ${p.corner} region ${p.region} n ${p.pts.length / 2} dmin ${v.d.toFixed(4)} amax ${v.a.toFixed(2)}${p.alpha ? " alpha" : ""}${p.fpts ? " fpts" : ""}`);
  if (args.includes("--ends")) { const n = p.pts.length / 2; const f = (i: number): string => `${i}:(${p.pts[2 * i].toFixed(3)},${p.pts[2 * i + 1].toFixed(3)})->(${p.cpts[2 * i]?.toFixed(3)},${p.cpts[2 * i + 1]?.toFixed(3)})`; console.log("   " + [0, 1, 2, n - 3, n - 2, n - 1].map(f).join(" ")); }
  const qd = opt("quad"); // --quad=<zoom px>: border -> inner edge per point within 3 r, in a zoom-px crop about (x, y)
  if (qd) { const [zm, P] = qd.split("x").map(Number); const ppu = P / (zm * m.table.h); const q = (wx: number, wy: number): string => `${Math.round(P / 2 + (wx - x) * ppu)},${Math.round(P / 2 + (wy - y) * ppu)}`; const out: string[] = [];
    for (let i = 0; i < p.pts.length / 2; i++) { const bx = p.pts[2 * i]; const by = p.pts[2 * i + 1]; if (Math.hypot(bx - x, by - y) > 3 * r) continue; const dx = p.cpts[2 * i] - bx; const dy = p.cpts[2 * i + 1] - by; const l = Math.hypot(dx, dy) || 1; out.push(`${i}:${q(bx, by)}>${q(bx + m.table.W * dx / l, by + m.table.W * dy / l)}${p.alpha ? "a" + p.alpha[2 * i].toFixed(2) : ""}`); }
    if (out.length) console.log("   " + out.join(" ")); }
  if (args.includes("--pts")) {
    const out: string[] = [];
    for (let i = 0; i < p.pts.length / 2; i++) { const d = Math.hypot(p.pts[2 * i] - x, p.pts[2 * i + 1] - y); if (d < 3 * r) out.push(`${i}:(${p.pts[2 * i].toFixed(3)},${p.pts[2 * i + 1].toFixed(3)})`); }
    if (out.length) console.log("   " + out.join(" "));
  }
}


