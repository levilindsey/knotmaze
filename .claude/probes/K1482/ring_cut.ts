// K1482 s2: the K1436 bar's ring (1.77, 15.26) find: GfEval with and without tipSink, cov / chain / winKind maps.
//   GF_HOME=1 node scripts/run_node.mjs .claude/probes/K1482/ring_cut.ts [x] [y] [half=0.4] [ppu=40]
import { tablesOf } from "../K1436/k1436_lib.ts";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";
const [xs = "1.77", ys = "15.26", hs = "0.4", ps = "40"] = process.argv.slice(2);
const X = +xs, Y = +ys, H = +hs, P = +ps; const T: any = tablesOf("ring");
const E1: any = new GfEval(T), E0: any = new GfEval(T); E0.tipSink = () => 0;
console.log(`h ${T.h} zt ${T.zt} W ${T.W}`);
const n = Math.round(2 * H * P); const rows: string[] = []; const diff = new Map<string, number>();
for (let j = 0; j < n; j++) { let r0 = "", r1 = "", rk = "";
  for (let i = 0; i < n; i++) { const x = X - H + (i + 0.5) / P, y = Y - H + (j + 0.5) / P;
    const a = { ...E0.eval(x, y) }, b = { ...E1.eval(x, y) };
    const ch = (q: any) => (q.cov < 0.5 ? "." : q.ink >= 0.5 ? "#" : String.fromCharCode(97 + (q.chain % 26)));
    r0 += ch(a); r1 += ch(b); rk += a.chain === b.chain && Math.abs(a.cov - b.cov) < 0.25 ? " " : "X";
    if (rk.endsWith("X")) { const k = `c${a.chain}k${a.winKind}cov${a.cov.toFixed(1)} -> c${b.chain}k${b.winKind}cov${b.cov.toFixed(1)}`; diff.set(k, (diff.get(k) ?? 0) + 1); } }
  rows.push(`${r0}  ${r1}  ${rk}`); }
console.log("master (no sink) | tip | changed"); console.log(rows.join("\n"));
console.log([...diff].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${v}\t${k}`).join("\n"));
