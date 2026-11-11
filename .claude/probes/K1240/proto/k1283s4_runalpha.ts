// K1283 s4: run pieces that carry an alpha (the end-arm fade, runEndFade) in a census scene: how many,
// and those near a point with their alpha range.
//   node scripts/run_node.mjs --config .claude/probes/K1240/proto/k1283_vite.config.mjs \
//     .claude/probes/K1240/proto/k1283s4_runalpha.ts <scene> [x y R]
import { loadScene } from "./k1279_census";
import * as O from "./outline";

const [name, xs, ys, rs] = process.argv.slice(2);
const scene = loadScene(name) as unknown as O.SceneIn;
const t = O.frame(O.structure(scene), scene);
const x = Number(xs); const y = Number(ys); const R = Number(rs ?? 0.6);
let n = 0; let nRun = 0;
t.pieces.forEach((p, k) => {
  if (p.kind !== (process.env.K ?? "run")) return;
  nRun++;
  if (!p.alpha) return;
  n++;
  let lo = 1; for (const a of p.alpha) lo = Math.min(lo, a);
  let near = !Number.isFinite(x);
  for (let i = 0; i < p.pts.length >> 1 && !near; i++) if (Math.hypot(p.pts[2 * i] - x, p.pts[2 * i + 1] - y) < R) near = true;
  if (near) console.log(`piece ${k} run ch ${p.chain} side ${p.side} s ${p.s0.toFixed(3)}..${p.s1.toFixed(3)} min alpha ${lo.toFixed(3)} first (${p.pts[0].toFixed(3)}, ${p.pts[1].toFixed(3)}) last (${p.pts[p.pts.length - 2].toFixed(3)}, ${p.pts[p.pts.length - 1].toFixed(3)}) n ${p.pts.length >> 1} corner ${(p as { corner?: number }).corner} a0 ${p.alpha.slice(0, 12).map((v) => v.toFixed(2)).join(" ")}`);
});
console.log(`${name}: ${n} of ${nRun} runs carry an alpha`);
