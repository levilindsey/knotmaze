// K1247 s33: how local the span holds are. Feeds a drag to a model with the snap on (as the worker runs it) and,
// per frame, compares the committed chains (SnapState.chains) with the last frame's: chains with any recommitted
// point, recommitted points, and chains the snap marks dirty (dChains). With kf.jlocal=false, s32's closure.
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s33_spread.ts <dragDir> [sub=10] [kf.jlocal=true]
import { OutlineModel } from "../../../src/render/outline/outline_model";
import { KF_INC } from "../../../src/render/outline/outline";
import { loadDrag } from "./k1247s32_lib";

const arg = (k: string, d: string): string => process.argv.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
const dir = process.argv[2]; const sub = +arg("sub", "10");
for (const kv of process.argv.slice(3)) { const m = /^kf\.(\w+)=(.*)$/.exec(kv); if (m) (KF_INC as unknown as Record<string, unknown>)[m[1]] = m[2] === "true" ? true : m[2] === "false" ? false : +m[2]; }
KF_INC.snap = true; KF_INC.cache = true;
const { cap, raw } = loadDrag(dir, sub);
type M = OutlineModel & { snap: { chains: (ArrayLike<number> | undefined)[]; dChains: Uint8Array } };
let m = new OutlineModel(cap[0]) as M; let rebuilt = 0;
let prev: number[][] = [];
const chRel: number[] = []; const ptRel: number[] = []; const dirty: number[] = [];
for (let f = 0; f < raw.length; f++) {
  try { m.update(raw[f]); } catch { rebuilt++; m = new OutlineModel(raw[f]) as M; m.update(raw[f]); }
  const cur = m.snap.chains.map((c) => Array.from(c ?? []));
  if (f > 0 && prev.length === cur.length) {
    let nc = 0; let np = 0; let na = 0;
    cur.forEach((c, i) => { const o = prev[i]; let ch = 0; for (let k = 0; k < c.length; k += 2) { na++; if (!o || o[k] !== c[k] || o[k + 1] !== c[k + 1]) { np++; ch = 1; } } nc += ch; });
    chRel.push(nc / cur.length); ptRel.push(np / Math.max(1, na));
    const d = m.snap.dChains; let n = 0; for (let i = 0; i < d.length; i++) n += d[i]; dirty.push(n / d.length);
  }
  prev = cur;
}
const q = (a: number[], p: number): number => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };
const pc = (a: number[]): string => `p50 ${(100 * q(a, 0.5)).toFixed(1)}% p95 ${(100 * q(a, 0.95)).toFixed(1)}% mean ${(100 * a.reduce((x, y) => x + y, 0) / a.length).toFixed(1)}%`;
console.log(`${dir} sub ${sub}, jlocal ${KF_INC.jlocal} (jR ${KF_INC.jR} jM ${KF_INC.jM} jx ${KF_INC.jx}), ${raw.length} frames, rebuilt ${rebuilt}`);
console.log(`  chains with a recommitted point: ${pc(chRel)}`);
console.log(`  recommitted points:              ${pc(ptRel)}`);
console.log(`  chains marked dirty (dChains):   ${pc(dirty)}`);
console.log(`  border hits ${(100 * KF_INC.hits / Math.max(1, KF_INC.hits + KF_INC.misses)).toFixed(1)}%, corner hits ${(100 * KF_INC.cHits / Math.max(1, KF_INC.cHits + KF_INC.cMisses)).toFixed(1)}%`);
