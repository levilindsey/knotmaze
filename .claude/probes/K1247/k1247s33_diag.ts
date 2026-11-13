// K1247 s33 diag: at frame F of a drag under KF_INC overrides, the drawn border point farthest from the true frame's
// borders: its piece, chain, and the snap status of that chain, its crossings' partners and its junctions.
import { OutlineModel } from "../../../src/render/outline/outline_model";
import { KF_INC } from "../../../src/render/outline/outline";
import type { OutlineTable, SceneIn } from "../../../src/render/outline/outline";
import { loadDrag, borderDist } from "./k1247s32_lib";
const arg = (k: string, d: string): string => process.argv.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
const { cap, raw } = loadDrag(process.argv[2], +arg("sub", "10")); const F = +arg("f", "41");
for (const kv of process.argv.slice(3)) { const m = /^kf\.(\w+)=(.*)$/.exec(kv); if (m) (KF_INC as unknown as Record<string, unknown>)[m[1]] = m[2] === "true" ? true : m[2] === "false" ? false : +m[2]; }
KF_INC.snap = true; KF_INC.cache = true;
const px = cap[0].camera.pxPerUnit * cap[0].camera.dpr;
let M = new OutlineModel(cap[0]); let R = new OutlineModel(cap[0]);
type MI = { table: OutlineTable; snap: { dChains: Uint8Array; dCross: Uint8Array; dJunc: Uint8Array; chains: number[][] } };
for (let i = 1; i <= F; i++) { try { M.update(raw[i]); } catch { M = new OutlineModel(raw[i]); } try { R.update(raw[i], true); } catch { R = new OutlineModel(raw[i]); } }
const tb = (M as unknown as MI).table; const tt = (R as unknown as MI).table; const S = (M as unknown as MI).snap;
const u = borderDist(tb, tt, 0.05, true);
const kk = borderDist(tb, tt, 0.05, false); console.log(`f${F}: drawn ${(u.d * px).toFixed(3)} px at (${u.x.toFixed(3)}, ${u.y.toFixed(3)}); keyed ${(kk.d * px).toFixed(3)} px at (${kk.x.toFixed(3)}, ${kk.y.toFixed(3)}) key ${kk.key}`);
const sc = raw[F] as SceneIn; const x = u.x; const y = u.y;
// nearest chain point per chain
const near = sc.chains.map((c, i) => { let b = Infinity; let bk = -1; const p = c.pts as ArrayLike<number>; for (let k = 0; k < p.length; k += 2) { const d = Math.hypot(p[k] - x, p[k + 1] - y); if (d < b) { b = d; bk = k >> 1; } } return { i, id: c.id, d: b, k: bk }; }).sort((a, b) => a.d - b.d).slice(0, 3);
for (const n of near) {
  const c = sc.chains[n.i]; const o = S.chains[n.i]; const p = c.pts as ArrayLike<number>;
  const off = o ? Math.hypot(o[2 * n.k] - p[2 * n.k], o[2 * n.k + 1] - p[2 * n.k + 1]) * px : NaN;
  let mx = 0; if (o) for (let k = 0; k < p.length; k += 2) mx = Math.max(mx, Math.hypot(o[k] - p[k], o[k + 1] - p[k + 1]) * px);
  console.log(`  chain ${n.id} (i ${n.i}) ${(n.d * px).toFixed(1)} px away at pt ${n.k}: dC ${S.dChains[n.i]}, commit off truth there ${off.toFixed(3)} px, max ${mx.toFixed(3)} px`);
  sc.crossings.forEach((X, xi) => { if (X.a.chain !== c.id && X.b.chain !== c.id) return; const me = X.a.chain === c.id ? X.a : X.b; const ot = X.a.chain === c.id ? X.b : X.a; const oi = sc.chains.findIndex((q) => q.id === ot.chain);
    // crossing point on true chain (approx by s along pts)
    const P = c.pts as ArrayLike<number>; let L = 0; let cx = NaN; let cy = NaN; for (let k = 2; k < P.length; k += 2) { const sl = Math.hypot(P[k] - P[k - 2], P[k + 1] - P[k - 1]); if (L + sl >= me.s) { const t = (me.s - L) / sl; cx = P[k - 2] + t * (P[k] - P[k - 2]); cy = P[k - 1] + t * (P[k + 1] - P[k - 1]); break; } L += sl; }
    const d = Math.hypot(cx - x, cy - y) * px; if (d < 60) console.log(`    crossing ${xi} ${d.toFixed(1)} px away: dX ${S.dCross[xi]}, partner chain ${ot.chain} dC ${S.dChains[oi]}`); });
  sc.junctions.forEach((J, ji) => { if (!J.arms.some((a) => a.chain === c.id)) return; const d = Math.hypot(J.c[0] - x, J.c[1] - y) * px; if (d < 120) console.log(`    junction ${J.id} (ji ${ji}) ${d.toFixed(1)} px away: dJ ${S.dJunc[ji]}, arms ${J.arms.map((a) => `${a.chain}:${a.kind}:dC${S.dChains[sc.chains.findIndex((q) => q.id === a.chain)]}`).join(" ")}`); });
}


