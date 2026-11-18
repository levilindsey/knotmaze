// K1451: ink along a panel row of k1451_spot.ts's panel (same spec/span/P), with the sorted surfaces' keys and the
// composite's two orderings, to find where the tie blend jumps.
//   node scripts/run_node.mjs .claude/probes/K1451/k1451_line.ts <scene:x:y> <span> <P> <row> <c0> <c1> [step=2]
import { modelOf } from "../K1433/k1433_lib.ts";
import { buildTables } from "../../../src/render/gpu_field/tables.ts";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";
const [spec, spanS, PS, rowS, a0, a1, stS] = process.argv.slice(2);
const [nm, xs, ys] = spec.split(":"); const X = +xs, Y = +ys; const span = +spanS, P = +PS;
const M = modelOf(nm); const sc = M.scene as any; const aa = 0.5 / (sc.camera.pxPerUnit * 2);
const T: any = buildTables(sc, { aa, home: true });
const E: any = new GfEval(T); if (process.env.FL) E.fadeLength = +process.env.FL;
const ppu = P / (span * T.h); const c0 = Math.round(X * ppu - P / 2), r0 = Math.round(Y * ppu - P / 2);
const oC = E.composite.bind(E); let last = "";
E.composite = (): number => { const r = oC(); const s: string[] = []; for (let i = 0; i < E.ns; i++) { const e = E.sord[i]; s.push(`${E.sid[e]}:k${E.skey[e].toFixed(4)}a${E.sa[e].toFixed(2)}v${E.sv[e].toFixed(2)}`); } last = `r ${r.toFixed(3)} [${s.join(" ")}]`; return r; };
for (let c = +a0; c <= +a1; c += +(stS ?? 2)) {
  const x = (c0 + c + 0.5) / ppu, y = (r0 + +rowS + 0.5) / ppu; last = ""; const o = E.eval(x, y);
  const pcs: string[] = []; for (let j = 0; j < E.np; j++) pcs.push(`c${E.pc[j]} d/h${(E.pd[j] / T.h).toFixed(2)} z${E.pz[j].toFixed(3)}`);
  console.log(`${c}: ink ${o.ink.toFixed(3)} | ${last} | ${pcs.join("; ")}`);
}
