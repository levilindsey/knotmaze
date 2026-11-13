// K1314 s13 scratch: thru tails (st.piecesD interval >= 2) near a spot, with thruTail on: per point the border, alpha,
// and every chain's nearest centreline distance below 1.2 h (chain: d), so the walk's cover shows.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314s13_thru.ts <scene> <x> <y> [--r=0.5] [--every=2]
import * as O from "../../../src/render/outline/outline";
O.K1314S12.thruTail = true;
const { buildModel } = await import("./k1314_census");
const args = process.argv.slice(2); const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const [nm, xs, ys] = args.filter((a) => !a.startsWith("--")); const X = +xs; const Y = +ys; const R = Number(opt("r") ?? 0.5); const EV = Number(opt("every") ?? 2);
const m: any = buildModel(nm); const h = m.scene.look.halfWidth;
const near = (px: number, py: number): string => {
  const out: string[] = [];
  m.scene.chains.forEach((c: any, ci: number) => {
    let best = Infinity; const p = c.pts; const n = p.length >> 1;
    for (let i = 0; i + 1 < n + (c.closed ? 1 : 0); i++) {
      const a = i % n; const b = (i + 1) % n; const ax = p[2 * a]; const ay = p[2 * a + 1]; const ex = p[2 * b] - ax; const ey = p[2 * b + 1] - ay;
      const l2 = ex * ex + ey * ey; let t = l2 > 0 ? ((px - ax) * ex + (py - ay) * ey) / l2 : 0; t = Math.max(0, Math.min(1, t));
      best = Math.min(best, Math.hypot(ax + ex * t - px, ay + ey * t - py));
    }
    if (best < 1.2 * h) out.push(`${ci}:${(best / h).toFixed(2)}`);
  });
  return out.join(" ");
};
m.table.pieces.forEach((p: any, pi: number) => {
  const d = p.di ?? pi; const pd = m.st.piecesD[d]; if (!pd || pd.kind !== "tail" || pd.interval < 2) return;
  const np = p.pts.length >> 1; let hit = false;
  for (let i = 0; i < np; i++) if (Math.hypot(p.pts[2 * i] - X, p.pts[2 * i + 1] - Y) < R) hit = true;
  if (!hit) return;
  const dc = m.st.corners[pd.corner]; const aa = m.st.arms[dc.aArm]; const bb = m.st.arms[dc.bArm];
  console.log(`piece ${pi} chain ${p.chain} corner ${pd.corner} which ${pd.interval - 2} arms A ${aa.pi}/${aa.kind} B ${bb.pi}/${bb.kind} np ${np} (d in h units)`);
  for (let i = 0; i < np; i += EV) console.log(`  ${i} (${p.pts[2 * i].toFixed(3)},${p.pts[2 * i + 1].toFixed(3)}) a ${p.alpha?.[2 * i]?.toFixed(2)}/${p.alpha?.[2 * i + 1]?.toFixed(2)}  ${near(p.pts[2 * i], p.pts[2 * i + 1])}`);
});