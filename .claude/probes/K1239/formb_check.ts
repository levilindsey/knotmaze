// K1239: per-chain FormB ink coverage along the border band, from a dumped scene.
import { readFileSync } from "node:fs";
import { FormB } from "../../../src/render/field/form_b";
import type { FieldScene } from "../../../src/render/field/scene";

const file = process.argv[2] ?? ".claude/probes/K1239/out/diag_def.json";
const d = JSON.parse(readFileSync(file, "utf8"));
const scene: FieldScene = d.scene;
scene.look.ctrlArc ??= 0.47;
const fb = new FormB(scene, { dpr: 1.5 });
const h = scene.look.halfWidth, W = scene.look.band;
console.log(`h=${h} W=${W} arms=${fb.arms.length} corners=${fb.corners.length} groups=${fb.nGroups} polys=${fb.polys.length}`);
console.log("diagnostics:", fb.diagnostics.slice(0, 20));
type Row = { id: number; n: number; hit: number; closed: boolean; len: number };
const rows: Row[] = [];
for (const c of scene.chains) {
  const pts = c.pts, n = pts.length / 2;
  let hit = 0, tot = 0;
  for (let i = 0; i < n; i += 2) {
    const x = pts[i * 2], y = pts[i * 2 + 1];
    const ip = Math.max(0, i - 1), inx = Math.min(n - 1, i + 1);
    let tx = pts[inx * 2] - pts[ip * 2], ty = pts[inx * 2 + 1] - pts[ip * 2 + 1];
    const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    for (const side of [1, -1]) {
      const px = x - ty * side * (h - W / 2), py = y + tx * side * (h - W / 2);
      const ev = fb.evalPoint(px, py);
      tot++; if (ev.ink > 0.5) hit++;
    }
  }
  let len = 0; for (let i = 1; i < n; i++) len += Math.hypot(pts[i * 2] - pts[(i - 1) * 2], pts[i * 2 + 1] - pts[(i - 1) * 2 + 1]);
  rows.push({ id: c.id, n: tot, hit, closed: c.closed, len });
}
rows.sort((a, b) => a.hit / a.n - b.hit / b.n);
for (const r of rows.slice(0, 25)) console.log(`chain ${r.id} cov=${(r.hit / r.n).toFixed(3)} len=${r.len.toFixed(1)} closed=${r.closed} pts=${r.n / 2}`);
const low = rows.filter((r) => r.hit / r.n < 0.9);
console.log(`chains below 0.9: ${low.length}/${rows.length}; overall cov=${(rows.reduce((a, r) => a + r.hit, 0) / rows.reduce((a, r) => a + r.n, 0)).toFixed(4)}`);
// arms with L=0 or tiny
let zeroL = 0; const zl: string[] = [];
fb.arms.forEach((a, i) => { if (a.L < 1e-9) { zeroL++; if (zl.length < 10) zl.push(`arm${i} j${a.j} chain${scene.chains[a.pi]?.id} kind=${a.kind} Lcut=${a.Lcut}`); } });
console.log(`arms L=0: ${zeroL}/${fb.arms.length}`, zl);
