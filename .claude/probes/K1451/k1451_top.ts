// K1451 s3: which chain is on top around a spot, form B (refEval) | master gf (windows = win) | this gf, as three
// character maps (a letter per chain, '.' = paper, upper case where ink > 0.5), plus the crossings near the spot
// (the over chain by the diagram) and their pins' windows. Home on unless HOME0=1.
//   node scripts/run_node.mjs .claude/probes/K1451/k1451_top.ts <scene:x:y> [span=3 (h)] [N=25]
import { buildModel, refEval } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/k1314_census.ts";
import { buildTables, chainAt } from "../../../src/render/gpu_field/tables.ts";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";
const [spec, sps = "3", ns = "25"] = process.argv.slice(2);
const [nm, xs, ys] = spec.split(":"); const X = +xs, Y = +ys; const span = +sps; const N = +ns;
const m = buildModel(nm); const sc = m.scene as any; const aa = 0.5 / (sc.camera.pxPerUnit * 2);
const home = process.env.HOME0 !== "1";
const T: any = buildTables(sc, { aa, home });
const Tm: any = { ...T, pinWL: new Float64Array(T.pinWL.length).fill(T.win), pinWR: new Float64Array(T.pinWR.length).fill(T.win) };
const Em = new GfEval(Tm); const E = new GfEval(T); const h = T.h;
const L = "abcdefghijklmnopqrstuvwxyz0123456789";
const ch = (c: number, ink: number): string => { const s = c < 0 ? "." : L[c % L.length]; return ink > 0.5 ? (c < 0 ? "#" : s.toUpperCase()) : s; };
const rows: string[] = [];
for (let r = 0; r < N; r++) {
  let a = "", b = "", d = "";
  for (let c = 0; c < N; c++) {
    const x = X + ((c + 0.5) / N - 0.5) * span * h, y = Y + ((r + 0.5) / N - 0.5) * span * h;
    const f = refEval(m, x, y); a += ch(f.chain, f.ink);
    const g = Em.eval(x, y); b += ch(g.chain, g.ink);
    const k = E.eval(x, y); d += ch(k.chain, k.ink);
  }
  rows.push(`${a}   ${b}   ${d}`);
}
console.log(`${spec} h ${h.toFixed(4)} win ${T.win.toFixed(4)} (in h ${(T.win / h).toFixed(3)}); form B | master gf | this gf`);
console.log(rows.join("\n"));
// pins within 2.5 h of the spot: chain, s, z, windows and gaps in h, and the partner pass
{
  const idx = new Map<string, number>(); (T.chainIds ?? sc.chains.map((c: any, i: number) => c.id ?? i)).forEach((id: any, i: number) => idx.set(String(id), i)); console.log(`nC ${T.nC} chains ${sc.chains.length} crossings ${sc.crossings.length} x0 ${JSON.stringify(sc.crossings[0]).slice(0, 160)} ids ${[...idx.keys()].slice(0, 5)}`);
  for (const x of sc.crossings) {
    const ia = idx.get(String(x.a.chain)), ib = idx.get(String(x.b.chain)); if (ia === undefined || ib === undefined) continue;
    const p = chainAt(T, ia, x.a.s); if (Math.hypot(p.x - X, p.y - Y) > (+(process.env.R ?? 2.5)) * h) continue;
    console.log(`crossing ${L[ia % L.length]}@${x.a.s.toFixed(3)} x ${L[ib % L.length]}@${x.b.s.toFixed(3)} at ${p.x.toFixed(3)},${p.y.toFixed(3)} over ${x.over === "a" ? L[ia % L.length] : L[ib % L.length]}`);
  }
  let best = 1e9, bs = ""; for (let c = 0; c < T.nC; c++) for (let i = T.cPin0[c]; i < T.cPin0[c] + T.cPinN[c]; i++) { const p = chainAt(T, c, T.pinS[i]); const d = Math.hypot(p.x - X, p.y - Y); if (d < best) { best = d; bs = `${c} ${T.pinS[i]} ${p.x},${p.y}`; } } console.log(`nearest pin ${best} ${bs} cS0 ${T.cS0[0]} pins ${T.pinS.length}`);
  for (let c = 0; c < T.nC; c++) for (let i = T.cPin0[c]; i < T.cPin0[c] + T.cPinN[c]; i++) {
    const p = chainAt(T, c, T.pinS[i]); if (Math.hypot(p.x - X, p.y - Y) > (+(process.env.R ?? 2.5)) * h) continue;
    const i0 = T.cPin0[c], n = T.cPinN[c];
    console.log(`pin ${L[c % L.length]} #${i - i0} s ${T.pinS[i].toFixed(3)} z ${T.pinZ[i] > 0 ? "+" : "-"} at ${p.x.toFixed(2)},${p.y.toFixed(2)} wL ${(T.pinWL[i] / h).toFixed(2)}h wR ${(T.pinWR[i] / h).toFixed(2)}h gapL ${(i > i0 ? (T.pinS[i] - T.pinS[i - 1]) / h : NaN).toFixed(2)}h gapR ${(i + 1 < i0 + n ? (T.pinS[i + 1] - T.pinS[i]) / h : NaN).toFixed(2)}h`);
  }
}