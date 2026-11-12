// K1321: the census reference's pieces at single points: the through corner it reads (filletCorner), plain
// form B, the fillet copy, and refEval (ink, top, chain); plus every corner near the point whose wedge holds it.
//   node scripts/run_node.mjs .claude/probes/K1321/k1321_px.ts <scene> <x,y> [<x,y>...]
import { buildModel, filletOf, filletCorner, plainOf, refEval, type FBF } from "../K1314/k1314_census";

const [nm, ...pts] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const m = buildModel(nm); const f = filletOf(m);
const fmt = (e: { ink: number; top: number; chain: number }): string => `ink ${e.ink.toFixed(3)} top ${e.top} ch ${e.chain}`;
for (const p of pts) {
  const [x, y] = p.split(",").map(Number);
  const ci = filletCorner(f, x, y);
  const near = f.cornersNear(x, y).filter((k) => f.inWedge(f.corners[k], x, y)).map((k) => `c${k}j${f.corners[k].j}${f.thruCi.has(k) ? "T" : ""}${f.corners[k].ok ? "" : "!"}`);
  console.log(`(${x},${y}) ci ${ci} | plain ${fmt(plainOf(m).evalPoint(x, y))} | fillet ${fmt(f.evalPoint(x, y))} | ref ${fmt(refEval(m, x, y))} | inWedge ${near.join(" ")}`);
}
export type { FBF };
