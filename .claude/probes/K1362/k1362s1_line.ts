// K1362 s1: form B against the GPU field's mirror along a segment (ink, label, winning term).
//   node scripts/run_node.mjs .claude/probes/K1362/k1362s1_line.ts <scene> <x0> <y0> <x1> <y1> [n=12]
import { buildModel, refEval } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/k1314_census.ts";
import { gfTablesOf } from "./k1362s1_census";
import { GfEval } from "../../../src/render/gpu_field/eval";

const [nm, a, b, c, d, ns] = process.argv.slice(2); const n = +(ns ?? 12);
const m = buildModel(nm); const T = gfTablesOf(m); const E = new GfEval(T);
for (let i = 0; i <= n; i++) {
  const t = i / n; const x = +a + t * (+c - +a); const y = +b + t * (+d - +b);
  const g = { ...E.eval(x, y) }; const f = refEval(m, x, y) as { ink: number; chain: number; term: unknown; nSurf: number; Dexp: number };
  console.log(`${t.toFixed(2)} (${x.toFixed(3)},${y.toFixed(3)}) me ink ${g.ink.toFixed(2)} ch ${g.chain} wk ${g.winKind}:${g.winA} | B ink ${f.ink.toFixed(2)} ch ${f.chain} term ${JSON.stringify(f.term)} nS ${f.nSurf} Dexp/h ${(f.Dexp / T.h).toFixed(2)}`);
}
