// K1482 s3: the ring (1.77, 15.26) fill-look block. Per pixel, with and without tipSink: the label (top covering
// surface's max-key covering member, its key = lkGap's `key`) and whether any piece sits above that key by more
// than zt within h + 2W of the pixel (the look form's lkGap cut candidate: the under thread's crossing gap).
//   GF_HOME=1 node scripts/run_node.mjs .claude/probes/K1482/ring_gap.ts [x] [y] [half=0.3] [ppu=40] [mode]
import { tablesOf } from "../K1436/k1436_lib.ts";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";
const [xs = "1.77", ys = "15.26", hs = "0.3", ps = "40"] = process.argv.slice(2);
const X = +xs, Y = +ys, H = +hs, P = +ps; const T: any = tablesOf("ring");
const E1: any = new GfEval(T), E0: any = new GfEval(T); E0.tipSink = () => 0;
const zt = T.zt, h = T.h, W = T.W;
const look = (E: any, x: number, y: number) => {
  const q = E.eval(x, y); let top = -1;
  for (let i = 0; i < E.ns; i++) if (E.scov[i] && (top < 0 || E.sckey[i] > E.sckey[top])) top = i;
  if (top < 0) return { ch: ".", q };
  const key = E.sckey[top]; let over = -1, od = 9;
  for (let j = 0; j < E.np; j++) if (E.pkey[j] > key + zt && E.pd[j] < h + 2 * W && E.pd[j] < od) { od = E.pd[j]; over = j; }
  return { ch: over >= 0 ? "X" : String.fromCharCode(97 + (q.chain % 26)), q, key, over: over >= 0 ? `c${E.pc[over]} d${E.pd[over].toFixed(3)} k${E.pkey[over].toFixed(3)}` : "" };
};
const n = Math.round(2 * H * P); const rows: string[] = [];
let n0 = 0, n1 = 0;
for (let j = 0; j < n; j++) { let r0 = "", r1 = "";
  for (let i = 0; i < n; i++) { const x = X - H + (i + 0.5) / P, y = Y - H + (j + 0.5) / P;
    const a = look(E0, x, y), b = look(E1, x, y); r0 += a.ch; r1 += b.ch; if (a.ch === "X") n0++; if (b.ch === "X") n1++; }
  rows.push(`${r0}  ${r1}`); }
console.log(`h ${h} zt ${zt} W ${W}; X = a piece above the label's key by > zt within h + 2W (lkGap candidate)`);
console.log("no sink | sink"); console.log(rows.join("\n")); console.log(`gap-cut candidates: no sink ${n0}, sink ${n1}`);
const c = look(E1, X, Y); console.log(`centre (sink): label c${c.q.chain} key ${c.key?.toFixed(3)} over ${c.over}`);
for (let j = 0; j < E1.np; j++) console.log(`  piece c${E1.pc[j]} s${E1.ps[j].toFixed(3)} d${E1.pd[j].toFixed(3)} key${E1.pkey[j].toFixed(3)} g${E1.pg[j]} r${E1.pramp[j].toFixed(2)} end${E1.pend[j]}`);
