// K1283 s4: the tail pieces near a point, before (src at 9963d239: k1283s4_before_outline.ts) and after
// (src's outline.ts): corner, point count, first and last point, alpha range, so a tail change shows up
// before any raster.
//   node scripts/run_node.mjs --config .claude/probes/K1240/proto/k1283_vite.config.mjs \
//     .claude/probes/K1240/proto/k1283s4_tails.ts <scene> <x> <y> [R=0.6]
import { loadScene } from "./k1279_census";
import * as O from "./outline";
import * as B from "./k1283s4_before_outline";

const [name, xs, ys, rs] = process.argv.slice(2);
const scene = loadScene(name) as unknown as O.SceneIn;
const x = Number(xs); const y = Number(ys); const R = Number(rs ?? 0.6);
const show = (tag: string, pieces: { kind: string; chain: number; corner: number; pts: number[]; alpha?: number[]; fpts?: number[] }[]): void => {
  pieces.forEach((p, k) => {
    if (p.kind !== "tail") return;
    let near = false;
    for (let i = 0; i < p.pts.length >> 1 && !near; i++) if (Math.hypot(p.pts[2 * i] - x, p.pts[2 * i + 1] - y) < R) near = true;
    if (!near) return;
    let lo = 1; let hi = 0; for (const a of p.alpha ?? []) { lo = Math.min(lo, a); hi = Math.max(hi, a); }
    const n = p.pts.length >> 1;
    console.log(`${tag} piece ${k} ch ${p.chain} corner ${p.corner} n ${n} first (${p.pts[0].toFixed(3)}, ${p.pts[1].toFixed(3)}) last (${p.pts[2 * n - 2]?.toFixed(3)}, ${p.pts[2 * n - 1]?.toFixed(3)}) alpha ${lo.toFixed(2)}..${hi.toFixed(2)} fill n ${(p.fpts?.length ?? 0) >> 1}`);
  });
};
show("before", B.frame(B.structure(scene as never), scene as never).pieces as never);
show("after ", O.frame(O.structure(scene), scene).pieces as never);
