// K1407 c2: an ASCII map of the gf mirror's ink over a window of a crop (k1407_crops' 480 px frame, WH = 2.5h):
// per sampled pixel the ink as a digit (0-9, '.' = none) and, in a second map, the winning term's kind
// (p piece side, a corner arc, e end cap, t tangent, '.' none).
//   node scripts/run_node.mjs .claude/probes/K1407/k1407c2_grid.ts <scene> <x> <y> <c0> <r0> <c1> <r1> [step=4]
import { buildModel } from "../K1314/k1314_census.ts";
import { gfTablesOf } from "../K1362/k1362s1_census.ts";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";

const [nm, xs, ys, a, b, c, d, st] = process.argv.slice(2);
const X = +xs, Y = +ys; const m = buildModel(nm); const T = gfTablesOf(m) as any; const E = new GfEval(T);
const h = T.h, P = 480, S = 2.5 * h, ppu = P / S; const c0 = Math.round(X * ppu - P / 2), r0 = Math.round(Y * ppu - P / 2);
const step = st ? +st : 4; const K = ".paet";
const inkRows: string[] = []; const winRows: string[] = [];
for (let r = +b; r <= +d; r += step) {
  let li = `${String(r).padStart(4)} `; let lw = `${String(r).padStart(4)} `;
  for (let cc = +a; cc <= +c; cc += step) {
    const e = E.eval((c0 + cc + 0.5) / ppu, (r0 + r + 0.5) / ppu);
    li += e.ink > 0.005 ? String(Math.min(9, Math.floor(e.ink * 10))) : ".";
    lw += e.ink > 0.005 ? (K[e.winKind] ?? "?") : ".";
  }
  inkRows.push(li); winRows.push(lw);
}
console.log(`cols ${a}..${c} step ${step}`);
console.log(inkRows.join("\n")); console.log(""); console.log(winRows.join("\n"));
