// K1407 c3: print the gf mirror's ink (x100) on a crop-pixel window, to read an edge by eye.
//   node scripts/run_node.mjs .claude/probes/K1407/k1407c3_inkgrid.ts <scene> <x> <y> <c0> <r0> <n> [step=1]
import { buildModel } from "../K1314/k1314_census.ts";
import { gfTablesOf } from "../K1362/k1362s1_census.ts";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";
const [nm, xs, ys, cs, rs, ns, st] = process.argv.slice(2);
const T = gfTablesOf(buildModel(nm)) as any; const E = new GfEval(T) as any; const P = 480, ppu = P / (2.5 * T.h);
const c0 = Math.round(+xs * ppu - P / 2), r0 = Math.round(+ys * ppu - P / 2); const s = st ? +st : 1;
console.log(`ppu ${ppu.toFixed(1)} aa*ppu ${(T.aa * ppu).toFixed(2)} W*ppu ${(T.W * ppu).toFixed(2)}`);
for (let r = +rs; r < +rs + +ns; r += s) {
  let line = `${String(r).padStart(3)}:`;
  for (let c = +cs; c < +cs + +ns; c += s) { const e = E.eval((c0 + c + 0.5) / ppu, (r0 + r + 0.5) / ppu); line += String(Math.round(e.ink * 100)).padStart(4); }
  console.log(line);
}
