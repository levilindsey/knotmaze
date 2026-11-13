// K1247 s32: where check (b)'s error lies. A drag fed to a snapped model (as k1247s32_check.ts: the worker's
// rebuilds) and a true one (update exact); at each chosen frame, every DRAWN point (pieces of 2+ points) of either
// table farther than lim device px from the other table's drawn borders, grouped by piece (table, kind, chain,
// side): the worst point, the piece's chain held or released this frame (the snap's dirty set), its nearest
// crossing on that chain (the partner chain held or not, the crossing angle, the distance along s) and junction.
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s32_where.ts <dragDir> frames=20,15 [sub=10] [lim=0.5] [T=0.5]
import { OutlineModel } from "../../../src/render/outline/outline_model";
import { KF_INC, type OutlineTable, type SceneIn, type SnapState } from "../../../src/render/outline/outline";
import { loadDrag, nearJ } from "./k1247s32_lib";

const arg = (k: string, d: string): string => process.argv.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
const dir = process.argv[2]; const sub = +arg("sub", "10"); const lim = +arg("lim", "0.5");
const frames = arg("frames", "20").split(",").map(Number);
const { cap, raw } = loadDrag(dir, sub);
const px = cap[0].camera.pxPerUnit * cap[0].camera.dpr;
KF_INC.snap = true; KF_INC.cache = true; KF_INC.T = +arg("T", "0.5");
type P = { kind: string; chain: number; side: number; s0: number; s1: number; pts: number[] };
const drawn = (t: OutlineTable): P[] => (t.pieces as unknown as P[]).filter((p) => p.pts.length >= 4);
function segDist(Q: P[], x: number, y: number): number {
  let m = Infinity;
  for (const q of Q) {
    const a = q.pts;
    for (let i = 0; i + 3 < a.length; i += 2) {
      const ax = a[i], ay = a[i + 1], bx = a[i + 2], by = a[i + 3];
      const dx = bx - ax, dy = by - ay; const l2 = dx * dx + dy * dy;
      const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
      const ex = ax + t * dx - x, ey = ay + t * dy - y; const d = ex * ex + ey * ey; if (d < m) m = d;
    }
  }
  return Math.sqrt(m);
}
// a coarse bucket of pieces by bbox, so each point looks only at pieces near it
function index(Q: P[]): (x: number, y: number) => P[] {
  const c = 0.5; const m = new Map<string, P[]>();
  for (const q of Q) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < q.pts.length; i += 2) { x0 = Math.min(x0, q.pts[i]); x1 = Math.max(x1, q.pts[i]); y0 = Math.min(y0, q.pts[i + 1]); y1 = Math.max(y1, q.pts[i + 1]); }
    for (let i = Math.floor(x0 / c) - 1; i <= Math.floor(x1 / c) + 1; i++) for (let j = Math.floor(y0 / c) - 1; j <= Math.floor(y1 / c) + 1; j++) { const k = `${i},${j}`; (m.get(k) ?? m.set(k, []).get(k) as P[]).push(q); }
  }
  return (x, y) => m.get(`${Math.floor(x / c)},${Math.floor(y / c)}`) ?? [];
}
const chainPt = (s: SceneIn, ci: number, sv: number): [number, number] => {
  const p = s.chains[ci].pts; const n = p.length >> 1; const i = Math.max(0, Math.min(n - 1, Math.round(sv)));
  return [p[2 * i], p[2 * i + 1]];
};
let M = new OutlineModel(cap[0]); let R = new OutlineModel(cap[0]); let mR = 0, rR = 0;
for (let i = 1; i <= Math.max(...frames); i++) {
  try { M.update(raw[i]); } catch { M = new OutlineModel(raw[i]); mR = i; }
  try { R.update(raw[i], true); } catch { R = new OutlineModel(raw[i]); rR = i; }
  if (!frames.includes(i)) continue;
  const tm = (M as unknown as { table: OutlineTable }).table; const tr = (R as unknown as { table: OutlineTable }).table;
  const S = (M as unknown as { snap: SnapState }).snap; const sc = raw[i];
  const idx = new Map<number, number>(); sc.chains.forEach((c, k) => idx.set(c.id, k));
  const ci = (ch: number): number => (idx.has(ch) ? (idx.get(ch) as number) : ch);
  const held = (ch: number): string => (S.dChains[ci(ch)] ? "released" : "held");
  console.log(`f${i} (snapped model last rebuilt f${mR}, true f${rR}): chains held ${S.dChains.reduce((a, d) => a + (d ? 0 : 1), 0)} of ${sc.chains.length}`);
  const out: { d: number; line: string }[] = [];
  for (const [nm, A, B] of [["snapped", tm, tr], ["true", tr, tm]] as const) {
    const Bq = index(drawn(B));
    for (const p of drawn(A)) {
      let w = 0, wx = 0, wy = 0, wk = 0;
      for (let k = 0; k < p.pts.length; k += 2) { const d = segDist(Bq(p.pts[k], p.pts[k + 1]), p.pts[k], p.pts[k + 1]) * px; if (d > w) { w = d; wx = p.pts[k]; wy = p.pts[k + 1]; wk = k >> 1; } }
      if (w <= lim) continue;
      const c = ci(p.chain); let xs = "no crossing";
      let best = Infinity;
      sc.crossings.forEach((x, xi) => {
        for (const [me, ot] of [[x.a, x.b], [x.b, x.a]] as const) {
          if (ci(me.chain) !== c) continue;
          const [qx, qy] = chainPt(sc, c, me.s); const dd = Math.hypot(qx - wx, qy - wy);
          if (dd < best) { best = dd; xs = `x${xi} ${(dd * px).toFixed(1)} px off, partner c${ot.chain} ${held(ot.chain)}${S.dCross[xi] ? ", crossing released" : ", crossing held"}`; }
        }
      });
      const nj = nearJ(sc, wx, wy);
      out.push({ d: w, line: `  ${nm} ${p.kind} c${p.chain} side ${p.side} (${held(p.chain)}): ${w.toFixed(3)} px at (${wx.toFixed(3)}, ${wy.toFixed(3)}) pt ${wk}/${p.pts.length >> 1}; ${xs}; j${nj.id} ${(nj.d * px).toFixed(1)} px` });
    }
  }
  out.sort((a, b) => b.d - a.d); for (const o of out.slice(0, 10)) console.log(o.line);
  console.log(`  (${out.length} pieces over ${lim} px)`);
}
