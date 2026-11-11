// K1283: what src's outline has at one spot: the corners within R (ok, why, V,
// the arm chains) and the pieces with a point within R (kind, chain, side,
// corner, s range, point count, how many points within R).
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1283_spot.ts <scene> <x> <y> [R=1.2]
import * as O from "../../../../src/render/outline/outline";
import { loadScene } from "./k1279_census";

const [name, xs, ys, rs] = process.argv.slice(2);
const X = Number(xs); const Y = Number(ys); const R = Number(rs ?? 1.2);
const scene = loadScene(name);
const t = O.frame(O.structure(scene), scene);
const f = (v: number): string => v.toFixed(3);
console.log(`${name} (${f(X)}, ${f(Y)}) R ${R}: h ${f(t.h)} W ${f(t.W)}`);
t.corners.forEach((k, ci) => {
  const d = Math.hypot(k.Vx - X, k.Vy - Y);
  if (d > R) return;
  const kk = k as unknown as Record<string, unknown>;
  const extra = Object.keys(kk).filter((q) => typeof kk[q] !== "object").map((q) => `${q}=${typeof kk[q] === "number" ? f(kk[q] as number) : String(kk[q])}`).join(" ");
  console.log(`corner ${ci} d ${f(d)}: ${extra}`);
});
t.pieces.forEach((p, pi) => {
  let n = 0;
  for (let i = 0; i < p.pts.length; i += 2) if (Math.hypot(p.pts[i] - X, p.pts[i + 1] - Y) < R) n++;
  if (n === 0) return;
  const np = p.pts.length / 2;
  const ends = `(${f(p.pts[0])}, ${f(p.pts[1])}) -> (${f(p.pts[p.pts.length - 2])}, ${f(p.pts[p.pts.length - 1])})`;
  console.log(`piece ${pi} ${p.kind} chain ${p.chain} side ${p.side} corner ${p.corner} region ${p.region} s ${f(p.s0)}..${f(p.s1)} pts ${np} in ${n} ${ends}`);
});
for (const c of scene.chains.map((c, i) => ({ c, i }))) {
  const pts = c.c.pts; const np = pts.length / 2;
  const e0 = Math.hypot(pts[0] - X, pts[1] - Y); const e1 = Math.hypot(pts[pts.length - 2] - X, pts[pts.length - 1] - Y);
  const closed = (c.c as unknown as { closed?: boolean }).closed;
  if (!closed && (e0 < R || e1 < R)) console.log(`chain ${c.i} open, ${np} pts, end0 d ${f(e0)}, end1 d ${f(e1)}`);
}
