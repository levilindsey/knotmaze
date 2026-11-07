// K1239: each exported crossing's point vs the other chain's polyline distance.
import { readFileSync } from "node:fs";
const d = JSON.parse(readFileSync(process.argv[2] ?? ".claude/probes/K1239/out/diag_def.json", "utf8"));
const S = d.scene;
function ptAt(c, s) {
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
function distTo(c, x, y) {
  const pts = c.pts, n = pts.length / 2;
  let best = 1e9; const segs = c.closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const j = (i + 1) % n;
    const ax = pts[i * 2], ay = pts[i * 2 + 1], dx = pts[j * 2] - ax, dy = pts[j * 2 + 1] - ay;
    const l2 = dx * dx + dy * dy;
    let t = l2 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    best = Math.min(best, Math.hypot(x - ax - dx * t, y - ay - dy * t));
  }
  return best;
}
let bad = 0;
const rows = [];
S.crossings.forEach((x, i) => {
  const pa = ptAt(S.chains[x.a.chain], x.a.s);
  const pb = ptAt(S.chains[x.b.chain], x.b.s);
  const sep = Math.hypot(pa[0] - pb[0], pa[1] - pb[1]);
  const da = distTo(S.chains[x.b.chain], pa[0], pa[1]);
  const db = distTo(S.chains[x.a.chain], pb[0], pb[1]);
  rows.push({ i, sep, da, db });
  if (sep > 0.05 || da > 0.05 || db > 0.05) bad++;
});
rows.sort((a, b) => Math.max(b.sep, b.da, b.db) - Math.max(a.sep, a.da, a.db));
console.log(`crossings ${rows.length} bad(>0.05) ${bad}`);
for (const r of rows.slice(0, 12)) console.log(`x${r.i} sep=${r.sep.toFixed(3)} dAtoB=${r.da.toFixed(3)} dBtoA=${r.db.toFixed(3)}`, JSON.stringify(S.crossings[r.i]));
// junction arms: arm root point (point at s on chain) vs junction centre distance
let badArm = 0;
for (const j of S.junctions) for (const a of j.arms) {
  const p = ptAt(S.chains[a.chain], a.s);
  const dd = Math.hypot(p[0] - j.c[0], p[1] - j.c[1]);
  if (dd > 0.3) { badArm++; if (badArm <= 10) console.log(`arm ${j.id} chain${a.chain} kind=${a.kind} dir=${a.dir} s=${a.s.toFixed(2)} rootDist=${dd.toFixed(3)}`); }
}
console.log("arms with root >0.3 from centre:", badArm, "of", S.junctions.reduce((n, j) => n + j.arms.length, 0));
