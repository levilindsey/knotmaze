// K1239: attribute world points to nearest chain (id, s), junction (dist), crossing (dist).
import { readFileSync } from "node:fs";
const d = JSON.parse(readFileSync(process.argv[2] ?? ".claude/probes/K1239/out/diag_def.json", "utf8"));
const S = d.scene;
function chainPoint(c, s) {
  const pts = c.pts, n = pts.length / 2;
  let acc = 0; const segs = c.closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const j = (i + 1) % n;
    const dx = pts[j * 2] - pts[i * 2], dy = pts[j * 2 + 1] - pts[i * 2 + 1];
    const l = Math.hypot(dx, dy);
    if (acc + l >= s) { const t = l ? (s - acc) / l : 0; return [pts[i * 2] + dx * t, pts[i * 2 + 1] + dy * t]; }
    acc += l;
  }
  return [pts[0], pts[1]];
}
const crossPts = S.crossings.map((x) => chainPoint(S.chains[x.a.chain], x.a.s));
for (const arg of process.argv.slice(3)) {
  const [x, y] = arg.split(",").map(Number);
  let best = { dd: 1e9, id: -1, s: 0 };
  for (const c of S.chains) {
    const pts = c.pts, n = pts.length / 2;
    let acc = 0; const segs = c.closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const j = (i + 1) % n;
      const ax = pts[i * 2], ay = pts[i * 2 + 1], dx = pts[j * 2] - ax, dy = pts[j * 2 + 1] - ay;
      const l2 = dx * dx + dy * dy;
      let t = l2 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
      t = Math.max(0, Math.min(1, t));
      const dd = Math.hypot(x - ax - dx * t, y - ay - dy * t);
      if (dd < best.dd) best = { dd, id: c.id, s: acc + Math.sqrt(l2) * t };
      acc += Math.sqrt(l2);
    }
  }
  let bj = { dd: 1e9, id: "" };
  for (const j of S.junctions) { const dd = Math.hypot(j.c[0] - x, j.c[1] - y); if (dd < bj.dd) bj = { dd, id: j.id }; }
  let bx = 1e9;
  for (const p of crossPts) bx = Math.min(bx, Math.hypot(p[0] - x, p[1] - y));
  // arms on best chain: roots near best.s
  const arms = [];
  for (const j of S.junctions) for (const a of j.arms) if (a.chain === best.id) arms.push(`${j.id}:${a.kind}${a.dir > 0 ? "+" : "-"}@${a.s.toFixed(1)}`);
  console.log(`(${x},${y}) chain${best.id} s=${best.s.toFixed(2)} d=${best.dd.toFixed(2)} jn=${bj.id}@${bj.dd.toFixed(2)} xDist=${bx.toFixed(2)} arms[${arms.join(" ")}]`);
}
