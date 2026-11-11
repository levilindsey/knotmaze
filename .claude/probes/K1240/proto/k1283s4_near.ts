// K1283 s4: every outline piece with a point near (x, y): kind, chain, side, corner, s range, point count,
// first and last point, alpha range (src's outline.ts).
//   node scripts/run_node.mjs --config .claude/probes/K1240/proto/k1283_vite.config.mjs \
//     .claude/probes/K1240/proto/k1283s4_near.ts <scene> <x> <y> [R=0.15]
import { loadScene } from "./k1279_census";
import * as O from "./outline";

const [name, xs, ys, rs] = process.argv.slice(2);
const scene = loadScene(name) as unknown as O.SceneIn;
const st = O.structure(scene); const t = O.frame(st, scene);
const x = Number(xs); const y = Number(ys); const R = Number(rs ?? 0.15);
t.pieces.forEach((p, k) => {
  let dmin = Infinity; let imin = -1;
  for (let i = 0; i < p.pts.length >> 1; i++) { const d = Math.hypot(p.pts[2 * i] - x, p.pts[2 * i + 1] - y); if (d < dmin) { dmin = d; imin = i; } }
  if (dmin > R) return;
  const n = p.pts.length >> 1;
  let lo = 1; let hi = 0; for (const a of p.alpha ?? []) { lo = Math.min(lo, a); hi = Math.max(hi, a); }
  const c = st.corners[p.corner];
  if (process.env.PTS && Number(process.env.PTS) === k) for (let i = 0; i < n; i++) console.log(`  #${i} (${p.pts[2 * i].toFixed(3)}, ${p.pts[2 * i + 1].toFixed(3)}) c (${p.cpts[2 * i].toFixed(3)}, ${p.cpts[2 * i + 1].toFixed(3)})${p.alpha ? ` a ${p.alpha[2 * i].toFixed(2)}/${p.alpha[2 * i + 1].toFixed(2)}` : ""}`);
  console.log(`piece ${k} ${p.kind} ch ${p.chain} side ${p.side} corner ${p.corner}${c ? ` (j${c.ji} arms ${c.aArm}/${st.arms[c.aArm].kind}:${st.arms[c.aArm].pi} ${c.bArm}/${st.arms[c.bArm].kind}:${st.arms[c.bArm].pi})` : ""} s ${p.s0.toFixed(3)}..${p.s1.toFixed(3)} n ${n} near #${imin} d ${dmin.toFixed(3)} first (${p.pts[0].toFixed(3)}, ${p.pts[1].toFixed(3)}) last (${p.pts[2 * n - 2].toFixed(3)}, ${p.pts[2 * n - 1].toFixed(3)})${p.alpha ? ` alpha ${lo.toFixed(2)}..${hi.toFixed(2)}` : ""}`);
});
