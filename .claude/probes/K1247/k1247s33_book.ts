// K1247 s33: what the flags cost, part by part, in OutlineModel.update itself (as the worker runs it). Two models of
// one drag, one with KF_INC.snap + .cache off and one with them on, fed the same frames interleaved (the flags are
// toggled around each call; the snap state and the caches are per model). Per part p50/p95 ms (snap, frame, zChains,
// fill, paint, band, total), the held chains per frame, and the cache counters. rep=N repeats the drag.
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s33_book.ts <dragDir> [sub=10] [rep=2] [T=0.25] [local=..]
import { OutlineModel } from "../../../src/render/outline/outline_model";
import { KF_INC } from "../../../src/render/outline/outline";
import { loadDrag } from "./k1247s32_lib";

const arg = (k: string, d: string): string => process.argv.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
const dir = process.argv[2]; const sub = +arg("sub", "10"); const rep = +arg("rep", "2");
const { cap, raw } = loadDrag(dir, sub);
KF_INC.T = +arg("T", String(KF_INC.T));
for (const kv of process.argv.slice(3)) { const m = /^kf\.(\w+)=(.*)$/.exec(kv); if (m) (KF_INC as unknown as Record<string, unknown>)[m[1]] = m[2] === "true" ? true : m[2] === "false" ? false : +m[2]; }
type M = OutlineModel & { parts: Record<string, number>; frameMs: number; snap: { dChains: Uint8Array } };
const onF = arg("on", "snap,cache").split(","); // which flags the "on" model gets
const set = (on: boolean): void => { KF_INC.snap = on && onF.includes("snap"); KF_INC.cache = on && onF.includes("cache"); };
set(false); let A = new OutlineModel(cap[0]) as M; set(true); let B = new OutlineModel(cap[0]) as M; let rebuilt = 0;
// The drag can outgrow the first frame's structure (paintFrame: run count changed): rebuild there, as the worker would.
const upd = (m: M, s: typeof raw[number], on: boolean): M => { set(on); try { m.update(s); return m; } catch { rebuilt++; const n = new OutlineModel(s) as M; n.update(s); return n; } };
const keys = ["snap", "frame", "zChains", "fill", "paint", "band", "total"];
const ra: Record<string, number[]> = {}; const rb: Record<string, number[]> = {}; const held: number[] = [];
const push = (r: Record<string, number[]>, m: M): void => { for (const k of keys) (r[k] ??= []).push(k === "total" ? m.frameMs : m.parts[k] ?? 0); };
let h0 = 0; let m0 = 0; let ch0 = 0; let cm0 = 0;
for (let r = 0; r < rep; r++) {
  for (let f = 0; f < raw.length; f++) {
    const order = (f + r) & 1;
    for (let o = 0; o < 2; o++) {
      if ((o ^ order) === 0) { A = upd(A, raw[f], false); if (r > 0 || f > 20) push(ra, A); }
      else { B = upd(B, raw[f], true); if (r > 0 || f > 20) { push(rb, B); const d = B.snap.dChains; let n = 0; for (let i = 0; i < d.length; i++) n += 1 - d[i]; held.push(n / d.length); } }
    }
  }
  if (r === 0) { h0 = KF_INC.hits; m0 = KF_INC.misses; ch0 = KF_INC.cHits; cm0 = KF_INC.cMisses; }
}
const q = (a: number[], p: number): number => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };
const f2 = (a: number[]): string => `${q(a, 0.5).toFixed(2)}/${q(a, 0.95).toFixed(2)}`;
console.log(`${dir} sub ${sub} rep ${rep} T ${KF_INC.T}: ${raw.length} frames; held chains p50 ${(100 * q(held, 0.5)).toFixed(1)}% p95 ${(100 * q(held, 0.95)).toFixed(1)}%`);
const bh = KF_INC.hits - h0; const bm = KF_INC.misses - m0; const chh = KF_INC.cHits - ch0; const cmm = KF_INC.cMisses - cm0;
console.log(`rebuilt ${rebuilt}; border hits ${(100 * bh / Math.max(1, bh + bm)).toFixed(1)}%, corner hits ${(100 * chh / Math.max(1, chh + cmm)).toFixed(1)}% (later reps)`);
for (const k of keys) console.log(`  ${k.padEnd(8)} off ${f2(ra[k])}  on ${f2(rb[k])}  d p50 ${(q(rb[k], 0.5) - q(ra[k], 0.5)).toFixed(2)}`);
