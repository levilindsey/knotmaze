// K1239: for world points, nearest chain/junction/crossing from the dumped scene.
import { readFileSync } from "node:fs";
const d = JSON.parse(readFileSync(process.argv[2] ?? ".claude/probes/K1239/out/diag_def.json", "utf8"));
const S = d.scene;
const pts = process.argv.slice(3).map((s) => s.split(",").map(Number));
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}
for (const [x, y] of pts) {
  let best = { d: 1e9, chain: -1 };
  S.chains.forEach((c) => {
    const n = c.pts.length / 2, segs = c.closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const j = (i + 1) % n;
      const dd = segDist(x, y, c.pts[i * 2], c.pts[i * 2 + 1], c.pts[j * 2], c.pts[j * 2 + 1]);
      if (dd < best.d) best = { d: dd, chain: c.id };
    }
  });
  let bj = { d: 1e9, id: "" };
  for (const j of S.junctions) { const dd = Math.hypot(j.c[0] - x, j.c[1] - y); if (dd < bj.d) bj = { d: dd, id: j.id, arms: j.arms }; }
  console.log(`(${x},${y}) nearest chain ${best.chain} d=${best.d.toFixed(3)} (h=${S.look.halfWidth}); nearest junction ${bj.id} d=${bj.d.toFixed(3)} arms=${JSON.stringify(bj.arms)}`);
}
