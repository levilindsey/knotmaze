// K1344 s1: one piece's band geometry: per point the outer point, its foot (cpts), the inner point (pt + W unit(cpt
// - pt), the untied rule all three builders share), its own alpha, and per quad its signed areas (outer edge
// against inner edge: a quad whose two triangles have opposite signs, or whose sign differs from the piece's
// majority, is folded).
//   node scripts/run_node.mjs .claude/probes/K1344/k1344_piece.ts <scene> <piece index> [--from=i] [--to=j]
import { buildModel } from "../K1314/k1314_census";
import { protoModel } from "./k1344_model";

const a = process.argv.slice(2);
const opt = (k: string): string | undefined => a.find((x) => x.startsWith(`--${k}=`))?.slice(k.length + 3);
const m = a.includes("--proto") ? protoModel(a[0]) : buildModel(a[0]); const p = m.table.pieces[Number(a[1])]; const W = m.table.W;
const np = p.pts.length / 2;
console.log(`piece ${a[1]}: ${p.kind} ch${p.chain} side${p.side} s ${p.s0}..${p.s1} corner ${p.corner} region ${p.region} np ${np} W ${W} h ${m.table.h} alpha ${p.alpha ? p.alpha.length : "-"} fpts ${p.fpts ? p.fpts.length / 2 : "-"}`);
const inner: number[][] = [];
for (let i = 0; i < np; i++) {
  const x = p.pts[2 * i]; const y = p.pts[2 * i + 1]; let dx = p.cpts[2 * i] - x; let dy = p.cpts[2 * i + 1] - y; const l = Math.hypot(dx, dy);
  if (l < 1e-12) { const j = Math.min(i + 1, np - 1); const ex = p.pts[2 * j] - x; const ey = p.pts[2 * j + 1] - y; const el = Math.hypot(ex, ey) || 1; dx = -ey / el; dy = ex / el; } else { dx /= l; dy /= l; }
  inner.push([x + dx * W, y + dy * W, l]);
}
const ar = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number => ((bx - ax) * (cy - ay) - (by - ay) * (cx - ax)) / 2;
const f = Number(opt("from") ?? 0); const t = Number(opt("to") ?? np - 1);
for (let i = f; i <= t && i < np; i++) {
  const al = p.alpha ? `a ${p.alpha[2 * i].toFixed(3)}/${p.alpha[2 * i + 1].toFixed(3)}` : "";
  let q = "";
  if (i + 1 < np) {
    const A1 = ar(p.pts[2 * i], p.pts[2 * i + 1], p.pts[2 * i + 2], p.pts[2 * i + 3], inner[i][0], inner[i][1]);
    const A2 = ar(p.pts[2 * i + 2], p.pts[2 * i + 3], inner[i + 1][0], inner[i + 1][1], inner[i][0], inner[i][1]);
    const so = Math.hypot(p.pts[2 * i + 2] - p.pts[2 * i], p.pts[2 * i + 3] - p.pts[2 * i + 1]);
    const si = Math.hypot(inner[i + 1][0] - inner[i][0], inner[i + 1][1] - inner[i][1]);
    // the outer step against the inner step: a negative dot is a quad whose two edges run opposite ways
    const dot = (p.pts[2 * i + 2] - p.pts[2 * i]) * (inner[i + 1][0] - inner[i][0]) + (p.pts[2 * i + 3] - p.pts[2 * i + 1]) * (inner[i + 1][1] - inner[i][1]);
    q = `| q${i} A ${(A1 * 1e6).toFixed(1)} ${(A2 * 1e6).toFixed(1)} e-6 out ${so.toFixed(5)} in ${si.toFixed(5)} dot ${(dot * 1e6).toFixed(2)}`;
  }
  console.log(`${String(i).padStart(3)} o (${p.pts[2 * i].toFixed(4)}, ${p.pts[2 * i + 1].toFixed(4)}) c (${p.cpts[2 * i].toFixed(4)}, ${p.cpts[2 * i + 1].toFixed(4)}) |oc| ${inner[i][2].toFixed(4)} i (${inner[i][0].toFixed(4)}, ${inner[i][1].toFixed(4)}) ${al} ${q}`);
}
