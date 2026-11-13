// K1314 s14: which run pieces K1314S13's lift flags change (alpha / fadeA), per point, near a box.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314s14_lift.ts <scene> [<x0,y0> <x1,y1>] [--on=liftEnd,liftOwn,ownEdge]
// Lists every piece whose alpha or fadeA moves (A = all S13 flags off, B = --on's set); with a box, prints the
// points of the pieces that reach it: i, pt, cpt, alpha A -> B, fadeA A -> B.
import { loadScene } from "./k1314_census";
import * as O from "../../../src/render/outline/outline";
const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const [nm, a, b] = args.filter((s) => !s.startsWith("--"));
const box = a && b ? [...a.split(",").map(Number), ...b.split(",").map(Number)] : null;
const ks = Object.keys(O.K1314S13) as (keyof typeof O.K1314S13)[];
const scene = loadScene(nm);
const build = (on: string[]): O.OutlinePiece[] => {
  ks.forEach((k) => (O.K1314S13[k] = on.includes(k)));
  const st = O.structure(scene); return O.frame(st, scene).pieces;
};
const on = (opt("on") ?? "liftEnd,liftOwn,ownEdge").split(",").filter(Boolean);
const PA = build([]); const PB = build(on);
const f = (v: number | undefined): string => (v === undefined ? "  -  " : v.toFixed(3));
const same = (x?: number[], y?: number[]): boolean => (!x && !y) || (!!x && !!y && x.length === y.length && x.every((v, i) => Math.abs(v - y[i]) < 1e-9));
let n = 0;
PA.forEach((p, pi) => {
  const q = PB[pi];
  if (same(p.alpha, q.alpha) && same(p.fadeA, q.fadeA)) return;
  n++;
  const np = p.pts.length / 2;
  let near = !box;
  if (box) for (let i = 0; i < np; i++) { const x = p.pts[2 * i]; const y = p.pts[2 * i + 1]; if (x >= box[0] - 0.05 && x <= box[2] + 0.05 && y >= box[1] - 0.05 && y <= box[3] + 0.05) near = true; }
  console.log(`piece ${pi} ${p.kind} chain ${p.chain} side ${p.side} corner ${p.corner} np ${np} fadeX ${p.fadeX} s ${p.s0.toFixed(3)}..${p.s1.toFixed(3)} (${p.pts[0].toFixed(3)},${p.pts[1].toFixed(3)})${near && box ? " NEAR" : ""}`);
  if (!near || !box) return;
  for (let i = 0; i < np; i++) {
    const r = (arr: number[] | undefined, e: number): number | undefined => arr?.[2 * i + e];
    console.log(`  ${i} (${p.pts[2 * i].toFixed(3)},${p.pts[2 * i + 1].toFixed(3)}) c(${p.cpts[2 * i].toFixed(3)},${p.cpts[2 * i + 1].toFixed(3)}) al ${f(r(p.alpha, 0))}/${f(r(p.alpha, 1))} -> ${f(r(q.alpha, 0))}/${f(r(q.alpha, 1))}  fa ${f(r(p.fadeA, 0))}/${f(r(p.fadeA, 1))} -> ${f(r(q.fadeA, 0))}/${f(r(q.fadeA, 1))}`);
  }
});
console.log(`${n} pieces move`);
