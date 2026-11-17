// K1407 c4: which term wins each crop pixel (composite's cWk:cWa), as a letter map with a legend, to find the
// term switch behind a seam. node scripts/run_node.mjs .claude/probes/K1407/k1407c4_win.ts <scene> <x> <y> <c0> <r0> <n> [step=1]
import { buildModel } from "../K1314/k1314_census.ts";
import { gfTablesOf } from "../K1362/k1362s1_census.ts";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";
const [nm, xs, ys, cs, rs, ns, st] = process.argv.slice(2);
const T = gfTablesOf(buildModel(nm)) as any; const E = new GfEval(T) as any; const P = 480, ppu = P / (2.5 * T.h);
const c0 = Math.round(+xs * ppu - P / 2), r0 = Math.round(+ys * ppu - P / 2); const s = st ? +st : 1;
const ids = new Map<string, string>(); const L = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
for (let r = +rs; r < +rs + +ns; r += s) {
  let line = `${String(r).padStart(3)}:`;
  for (let c = +cs; c < +cs + +ns; c += s) {
    const e = E.eval((c0 + c + 0.5) / ppu, (r0 + r + 0.5) / ppu);
    if (!(e.ink > 0.005)) { line += " ."; continue; }
    const key = `wk${E.cWk}:${E.cWa}:${E.cWb}`; if (!ids.has(key)) ids.set(key, L[ids.size % L.length]);
    line += " " + ids.get(key);
  }
  console.log(line);
}
for (const [k, v] of ids) console.log(`${v} = ${k}`);
