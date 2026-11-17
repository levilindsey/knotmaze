// K1407 c4: composite()'s surfaces at crop pixels: id, key, value, cover, the ordered composite, the swapped one and
// the blend weight, to see what the equal-depth tie blend mixes.
//   node scripts/run_node.mjs .claude/probes/K1407/k1407c4_tie.ts <scene> <x> <y> <c:r,c:r,...>
import { buildModel } from "../K1314/k1314_census.ts";
import { gfTablesOf } from "../K1362/k1362s1_census.ts";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";
const [nm, xs, ys, list] = process.argv.slice(2);
const T = gfTablesOf(buildModel(nm)) as any; const E = new GfEval(T) as any; const P = 480, ppu = P / (2.5 * T.h);
const c0 = Math.round(+xs * ppu - P / 2), r0 = Math.round(+ys * ppu - P / 2);
const C0 = E.composite.bind(E); let info = "";
E.composite = (): number => {
  const r = C0(); const ns = E.ns; const s: string[] = [];
  for (let i = 0; i < ns; i++) { const e = E.sord[i]; s.push(`${E.sid[e]}[k${E.skey[e].toFixed(3)} v${E.sv[e].toFixed(2)} a${E.sa[e].toFixed(2)}]`); }
  info = `${s.join(" > ")} => ${r.toFixed(3)} (zt ${T.zt})`;
  return r;
};
for (const cr of list.split(",")) {
  const [c, r] = cr.split(":").map(Number); const x = (c0 + c + 0.5) / ppu, y = (r0 + r + 0.5) / ppu;
  const e = E.eval(x, y); console.log(`${c}:${r} ink ${e.ink.toFixed(3)} cov ${e.cov.toFixed(2)} ch ${e.chain} | ${info}`);
}
