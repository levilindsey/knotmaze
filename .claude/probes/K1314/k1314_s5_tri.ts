// K1314 s5: a piece's points and feet, and its band triangles (draw.bandData) with their alphas; with
// --at=x,y also the band triangles (any piece) that cover that point and the alpha each gives there.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s5_tri.ts <scene> <piece,...> [--at=x,y] [--tris]
import { buildModel } from "./k1314_census";
import * as D from "../../../src/render/outline/draw";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const opt = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const [nm, ps] = args;
const m = buildModel(nm); const tb = m.table;
const f3 = (v: number): string => v.toFixed(3);
for (const pi of (ps ?? "").split(",").filter((v) => v !== "").map(Number)) {
  const p = tb.pieces[pi];
  console.log(`piece ${pi} ${p.kind} c${p.chain} side ${p.side} corner ${p.corner} s ${f3(p.s0)}..${f3(p.s1)} n ${p.pts.length / 2}${p.alpha ? " alpha" : ""}`);
  for (let i = 0; i < p.pts.length / 2; i++) {
    const dx = p.cpts[2 * i] - p.pts[2 * i]; const dy = p.cpts[2 * i + 1] - p.pts[2 * i + 1];
    const al = p.alpha ? ` a ${p.alpha[2 * i].toFixed(2)}/${p.alpha[2 * i + 1].toFixed(2)}` : "";
    console.log(`  ${i}: (${f3(p.pts[2 * i])},${f3(p.pts[2 * i + 1])}) foot (${f3(p.cpts[2 * i])},${f3(p.cpts[2 * i + 1])}) dir ${(Math.atan2(dy, dx) * 180 / Math.PI).toFixed(1)} |${f3(Math.hypot(dx, dy))}|${al}`);
  }
  if (process.argv.includes("--tris")) {
    const bd = D.bandData({ ...tb, pieces: [p] }, m.scene, m.zz);
    for (let t = 0; t < bd.bandCount / 3; t++) {
      const q = (k: number): string => `(${f3(bd.bandPos[2 * (3 * t + k)])},${f3(bd.bandPos[2 * (3 * t + k) + 1])})${bd.bandAlpha[3 * t + k].toFixed(2)}`;
      console.log(`   tri ${t}: ${q(0)} ${q(1)} ${q(2)}`);
    }
  }
}
const at = opt("at");
if (at) {
  const [x, y] = at.split(",").map(Number); const T = m.tri; const A = m.triA;
  console.log(`at (${x},${y}):`);
  for (let t = 0; t < m.nTri; t++) {
    const ax = T[6 * t], ay = T[6 * t + 1], bx = T[6 * t + 2], by = T[6 * t + 3], cx = T[6 * t + 4], cy = T[6 * t + 5];
    const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (!(Math.abs(den) > 1e-18)) continue;
    const l1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / den; const l2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / den; const l3 = 1 - l1 - l2;
    if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
    const a = l1 * A[3 * t] + l2 * A[3 * t + 1] + l3 * A[3 * t + 2];
    console.log(`  tri ${t} piece ${m.triP[t]} (${tb.pieces[m.triP[t]].kind}) alpha ${a.toFixed(3)}`);
  }
}
