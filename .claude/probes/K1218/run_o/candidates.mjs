// K1218 Run O: candidate slots near a junction, from shoot_o's dump.
//   node candidates.mjs <standDir> <ji...>
import { readFileSync } from "node:fs";
import { join } from "node:path";

const [dir, ...jiArgs] = process.argv.slice(2);
const M = JSON.parse(readFileSync(join(dir, "meta_o.json"), "utf8"));
const recs = new Map(M.recs.map((r) => [r.ji, r]));
function overPts(s) {
  const ch = M.dump.chains[String(s.overChain)];
  const pts = [];
  for (let j = 0; j < s.range.n; j++) {
    const raw = s.range.kStart + j * s.range.stride;
    const idx = ch.closed ? ((raw % ch.count) + ch.count) % ch.count : Math.max(0, Math.min(ch.count - 1, raw));
    pts.push({ x: ch.pos[idx * 2], y: ch.pos[idx * 2 + 1], idx, j });
  }
  return pts;
}
for (const jiS of jiArgs) {
  const ji = Number(jiS), r = recs.get(ji);
  const [cx, cy] = r.c;
  console.log(`ji ${ji} center ${cx.toFixed(3)},${cy.toFixed(3)} arms ${r.arms.map((a) => `ch${a.chain}:s${a.slot}:d${a.dir}`).join(" ")} routes ${JSON.stringify(r.routes)} full ${r.full}`);
  const rows = [];
  for (const s of M.dump.slots) {
    const pts = overPts(s);
    let dmin = Infinity, jmin = -1;
    for (const p of pts) { const d = Math.hypot(p.x - cx, p.y - cy); if (d < dmin) { dmin = d; jmin = p.j; } }
    const dc = s.desc.center, dcen = Math.hypot(dc[0] - cx, dc[1] - cy);
    if (dmin < 1.2 || dcen < 1.2) rows.push({ dmin, dcen, s, jmin });
  }
  rows.sort((a, b) => a.dmin - b.dmin);
  for (const { dmin, dcen, s } of rows.slice(0, 14)) {
    const d = s.desc;
    const cr = s.cross ? `over ch${s.cross.over.chain}@${s.cross.over.ctrl.toFixed(2)} under ch${s.cross.under.chain}@${s.cross.under.ctrl.toFixed(2)}` : "emergent/marker";
    console.log(` slot ${s.slot} dmin ${dmin.toFixed(3)} dcen ${dcen.toFixed(3)} overCh ${s.overChain} underCh ${s.underChain} hOver ${d.hOver.toFixed(3)} margin ${d.margin.toFixed(3)} fade ${d.fade.toFixed(3)} win -${d.winNeg.toFixed(3)}/+${d.winPos.toFixed(3)} n ${s.n} stride ${s.range.stride} scales ${d.scales.map((v) => v.toFixed(2)).join("/")} ${cr}`);
  }
}
