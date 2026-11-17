// K1407 c1: the gf winning term at crop pixels (k1407_crops' 480 px frame, WH=2.5h around the spot).
//   node scripts/run_node.mjs .claude/probes/K1407/k1407c1_px.ts <scene> <x> <y> <c:r,c:r,...>
import { buildModel } from "../K1314/k1314_census.ts";
import { gfTablesOf } from "../K1362/k1362s1_census.ts";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";
const [nm, xs, ys, list] = process.argv.slice(2);
const X = +xs, Y = +ys; const m = buildModel(nm); const T = gfTablesOf(m) as any; const E = new GfEval(T);
const h = T.h, P = 480, S = 2.5 * h, ppu = P / S; const c0 = Math.round(X * ppu - P / 2), r0 = Math.round(Y * ppu - P / 2);
for (const cr of list.split(",")) {
  const [c, r] = cr.split(":").map(Number); const x = (c0 + c + 0.5) / ppu, y = (r0 + r + 0.5) / ppu;
  const e = E.eval(x, y);
  let extra = "";
  if (e.winKind === 2 || e.winKind === 4) { const k = e.winA; extra = ` k${k} j${T.kJ[k]} r=${T.kR[k].toFixed(3)} A c${T.kCa[k]} B c${T.kCb[k]}`; }
  console.log(`px ${c}:${r} -> (${x.toFixed(4)},${y.toFixed(4)}) ink=${e.ink.toFixed(3)} chain=${e.chain} win=${e.winKind}/${e.winA}/${e.winB}${extra}`);
}
