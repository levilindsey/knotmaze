// K1407 c3: per configuration, the surfaces at crop pixels (id, key, v, a, winner) and the composite with and without the swap.
//   node scripts/run_node.mjs .claude/probes/K1407/k1407c3_surf.ts <scene> <x> <y> <c:r,...>
import { buildModel } from "../K1314/k1314_census.ts";
import { gfTablesOf } from "../K1362/k1362s1_census.ts";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";
const [nm, xs, ys, list] = process.argv.slice(2);
const X = +xs, Y = +ys; const T = gfTablesOf(buildModel(nm)) as any; const E = new GfEval(T) as any;
const h = T.h, P = 480, ppu = P / (2.5 * h); const c0 = Math.round(X * ppu - P / 2), r0 = Math.round(Y * ppu - P / 2);
const f = (v: number): string => v.toFixed(3);
console.log(`zt ${f(T.zt)} h ${f(h)} W ${f(T.W)} aa ${T.aa.toFixed(4)}`);
const L0 = E.layers.bind(E); const C0 = E.composite.bind(E);
E.layers = (x: number, y: number): void => {
  L0(x, y);
  const s: string[] = [];
  for (let i = 0; i < E.ns; i++) { const e = E.sord[i]; s.push(`[${E.sid[e]} key ${f(E.skey[e])} v ${f(E.sv[e])} a ${f(E.sa[e])} wk ${E.swk[e]}/${E.swa[e]}/${E.swb[e]} cov ${E.scov[e]}]`); }
  console.log(`  layers: ${s.join(" ")}  psurf ${Array.from({ length: E.np }, (_, j) => `c${E.pc[j]}:${E.psurf[j]}`).join(" ")}`);
};
E.composite = (): number => { const r = C0(); console.log(`  composite ${f(r)} wk ${E.cWk}`); return r; };
for (const cr of list.split(",")) {
  const [c, r] = cr.split(":").map(Number); const x = (c0 + c + 0.5) / ppu, y = (r0 + r + 0.5) / ppu;
  console.log(`px ${c}:${r} (${x.toFixed(3)},${y.toFixed(3)})`);
  const e = E.eval(x, y); console.log(`  => ink ${f(e.ink)} win ${e.winKind}/${e.winA}/${e.winB} chain ${e.chain}`);
}
