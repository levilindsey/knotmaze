// K1283 s3: a junction's centre and arms (chain id, s, dir, kind) in a census scene, plus the
// chain's length and closedness, so a spot's end arm can be found by junction id or by position.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1283s3_jx.ts <scene> <jid | x,y> [R=1]
import { loadScene } from "./k1279_census";

const [name, q, rs] = process.argv.slice(2);
const scene = loadScene(name);
const R = Number(rs ?? 1);
const chainLen = (id: number): { L: number; closed: boolean } => {
  const c = scene.chains.find((k) => k.id === id); if (!c) return { L: NaN, closed: false };
  const n = c.pts.length >> 1; let L = 0;
  for (let i = 0; i + 1 < (c.closed ? n + 1 : n); i++) { const a = i % n; const b = (i + 1) % n; L += Math.hypot(c.pts[2 * b] - c.pts[2 * a], c.pts[2 * b + 1] - c.pts[2 * a + 1]); }
  return { L, closed: c.closed };
};
const show = (ji: number): void => {
  const j = scene.junctions[ji];
  console.log(`j${ji} id ${j.id} c (${j.c[0].toFixed(3)}, ${j.c[1].toFixed(3)})`);
  j.arms.forEach((a, k) => { const cl = chainLen(a.chain); console.log(`  arm ${k}: chain ${a.chain} s ${a.s.toFixed(3)} dir ${a.dir} ${a.kind} (L ${cl.L.toFixed(3)}${cl.closed ? " closed" : ""})`); });
};
if (q.includes(",")) {
  const [x, y] = q.split(",").map(Number);
  scene.junctions.forEach((j, ji) => { if (Math.hypot(j.c[0] - x, j.c[1] - y) <= R) show(ji); });
} else show(Number(q.replace(/^j/, "")));
