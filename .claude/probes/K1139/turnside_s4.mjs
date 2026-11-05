import { readFileSync } from "node:fs";
const meta = JSON.parse(readFileSync("out/s4/d/x4/meta.json", "utf8"));
const rc = meta.recs.find((r) => r.ji === 149), A = meta.aff;
const w = (X, Y) => { const sx = (rc.box.x + X + 0.5) / meta.dsf, sy = (rc.box.y + Y + 0.5) / meta.dsf; return [A.ax + A.bx * sx + A.cx * sy, A.ay + A.by * sx + A.cy * sy]; };
const pxW = Math.hypot(...((a, b) => [b[0] - a[0], b[1] - a[1]])(w(0, 0), w(1, 0)));
for (const [X, Y] of [[170, 129], [170, 118], [170, 140], [166, 128]]) {
  const [px, py] = w(X, Y);
  const v = rc.bands[1].verts;
  let best = 1e20, bk = -1, bu = 0;
  for (let k = 0; k + 1 < v.length; k++) {
    const dx = v[k + 1][0] - v[k][0], dy = v[k + 1][1] - v[k][1], l2 = dx * dx + dy * dy;
    let u = l2 > 1e-12 ? ((px - v[k][0]) * dx + (py - v[k][1]) * dy) / l2 : 0; u = Math.max(0, Math.min(1, u));
    const d = Math.hypot(px - v[k][0] - dx * u, py - v[k][1] - dy * u);
    if (d < best) { best = d; bk = k; bu = u; }
  }
  // turn direction around bk: cross of the segments before and after; side of the pixel vs segment bk
  const seg = (k) => [v[k + 1][0] - v[k][0], v[k + 1][1] - v[k][1]];
  const k0 = Math.max(0, bk - 2), k1 = Math.min(v.length - 2, bk + 2);
  const a = seg(k0), b = seg(k1), turn = a[0] * b[1] - a[1] * b[0];
  const s = seg(bk), side = s[0] * (py - v[bk][1]) - s[1] * (px - v[bk][0]);
  console.log(`(${X},${Y}) nearest b1 seg ${bk}/${v.length - 1} u ${bu.toFixed(2)} dist ${(best / pxW).toFixed(2)} px (reach ${((meta.fh + 0.5 * meta.pxW) / pxW).toFixed(2)} px); turn sign ${Math.sign(turn)} (segs ${k0}..${k1}), pixel side ${Math.sign(side)} -> ${Math.sign(turn) === Math.sign(side) ? "INSIDE" : "OUTSIDE"} of the turn`);
}
console.log(`b1 verts ${rc.bands[1].verts.length}, pxW(world) ${pxW.toExponential(3)} meta.pxW ${meta.pxW}`);