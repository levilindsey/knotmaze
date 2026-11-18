// K1451 s4: which pin sides make a rule differ from the clip at a spot: each differing (pin, side) alone on top of the clip.
//   $env:GF_NOCLIP='1'; node scripts/run_node.mjs .claude/probes/K1451/k1451_s4_attr.ts <rule> [span=4] [N=48] <scene:x:y>...
import { buildModel } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/k1314_census.ts";
import { buildTables, chainAt } from "../../../src/render/gpu_field/tables.ts";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";
import { rule, type Rule } from "./k1451_s4_rules.ts";
const args = process.argv.slice(2); const R = args[0] as Rule; const span = +args[1]; const N = +args[2]; const specs = args.slice(3);
for (const spec of specs) {
  const [nm, xs, ys] = spec.split(":"); const X = +xs, Y = +ys;
  const sc = buildModel(nm).scene as any; const aa = 0.5 / (sc.camera.pxPerUnit * 2); const T: any = buildTables(sc, { aa, home: true }); const h = T.h;
  const [cL, cR] = rule(T, "clip"); const [rL, rR] = rule(T, R);
  const keys = (wl: Float64Array, wr: Float64Array): string[] => { const E = new GfEval({ ...T, pinWL: wl, pinWR: wr }); const o: string[] = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const v = E.eval(X + ((c + 0.5) / N - 0.5) * span * h, Y + ((r + 0.5) / N - 0.5) * span * h); o.push(`${v.chain}:${Math.round(v.ink * 8)}`); } return o; };
  const base = keys(cL, cR); const full = keys(rL, rR); const df = (a: string[]): number => a.reduce((n, k, i) => n + (k !== base[i] ? 1 : 0), 0);
  console.log(`== ${spec} ${R} vs clip ${df(full)}`);
  for (let q = 0; q < cL.length; q++) for (const side of ["L", "R"]) {
    const a = side === "L" ? cL : cR; const b = side === "L" ? rL : rR; if (a[q] === b[q]) continue;
    let c = 0; while (!(q >= T.cPin0[c] && q < T.cPin0[c] + T.cPinN[c])) c++;
    const P = chainAt(T, c, T.pinS[q]); if (Math.hypot(P.x - X, P.y - Y) > 6 * h) continue;
    const wl = Float64Array.from(cL); const wr = Float64Array.from(cR); (side === "L" ? wl : wr)[q] = b[q];
    console.log(`  pin ${q} c${c} ${side} z ${T.pinZ[q] > 0 ? "+" : "-"} clip ${a[q].toFixed(3)} -> ${b[q].toFixed(3)} (s2 ${(side === "L" ? T.pinWL : T.pinWR)[q].toFixed(3)}): ${df(keys(wl, wr))} px`);
  }
}
