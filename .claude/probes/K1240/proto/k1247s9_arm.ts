// K1247 s9: one corner's arms. The structure's corner, its junction's arms
// (chain, s, dir, kind) and each arm chain's points near the root, in h.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s9_arm.ts <scene> <corner> [nPts]
import { structure, frame } from "./outline";
import { load } from "./k1247s5_scenes";
const name = process.argv[2]; const ci = +process.argv[3]; const nP = +(process.argv[4] ?? 6);
const sc = load(name); const st = structure(sc); const t = frame(st, sc); const h = t.h;
const dc = st.corners[ci]; const j = sc.junctions[dc.ji];
console.log(`corner ${ci} j${j.id} c (${j.c[0].toFixed(4)},${j.c[1].toFixed(4)}) h ${h} arms A ${dc.aArm} B ${dc.bArm} r ${t.corners[ci].r.toFixed(4)}`);
for (const ai of [dc.aArm, dc.bArm]) {
  const a = st.arms[ai]; const arm = j.arms[a.ei];
  const ch = sc.chains.find((c) => c.id === arm.chain)!; const p = ch.pts; const n = p.length / 2;
  const cum = [0]; for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(p[2 * i] - p[2 * i - 2], p[2 * i + 1] - p[2 * i - 1]));
  console.log(`  arm ${ai} chain ${arm.chain} closed ${ch.closed} n ${n} len ${cum[n - 1].toFixed(4)} s ${arm.s.toFixed(4)} dir ${arm.dir} kind ${arm.kind}`);
  let i0 = cum.findIndex((s) => s >= arm.s - 1e-12); if (i0 < 0) i0 = n - 1;
  const idx: number[] = []; for (let k = -2; k <= nP; k++) { const i = i0 + arm.dir * k; if (i >= 0 && i < n) idx.push(i); }
  for (const i of idx) {
    const ang = i + 1 < n ? Math.atan2(p[2 * i + 3] - p[2 * i + 1], p[2 * i + 2] - p[2 * i]) : NaN;
    const d = Math.hypot(p[2 * i] - j.c[0], p[2 * i + 1] - j.c[1]);
    console.log(`    pt ${i} s ${cum[i].toFixed(5)} (${p[2 * i].toFixed(5)},${p[2 * i + 1].toFixed(5)}) |p-c|/h ${(d / h).toFixed(4)} segAng ${(ang * 180 / Math.PI).toFixed(3)}`);
  }
}
