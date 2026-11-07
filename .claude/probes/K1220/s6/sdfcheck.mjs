// K1220 S6: capsule distance at given device points, from geom.mjs chains.
//   node sdfcheck.mjs <shotsRoot> <label> <stand> <ji> <geomDir> <x,y>...
import { readFileSync } from "node:fs";
import { join } from "node:path";
const [, , ROOT, LABEL, STAND, JI, GEOMD, ...pts] = process.argv;
const ji = Number(JI);
const meta = JSON.parse(readFileSync(join(ROOT, LABEL, STAND, "meta.json"), "utf8"));
const geom = JSON.parse(readFileSync(join(GEOMD, `${STAND}_ji${ji}_geom.json`), "utf8"));
const dsf = meta.dsf, s = meta.view.s, vx = meta.view.x, vy = meta.view.y, fh = meta.fh;
console.log(`j=${geom.j} fh=${fh} chains=${geom.chains.map((c) => `c?(${c.pts.length}pts,k${c.pts[0]?.[0]}..${c.pts[c.pts.length - 1]?.[0]})`).join(" ")}`);
const dseg = (px, py, ax, ay, bx, by) => {
  const ex = bx - ax, ey = by - ay, l2 = ex * ex + ey * ey;
  let u = l2 > 1e-12 ? ((px - ax) * ex + (py - ay) * ey) / l2 : 0;
  u = Math.max(0, Math.min(1, u));
  return [Math.hypot(px - (ax + ex * u), py - (ay + ey * u)), u];
};
for (const p of pts) {
  const [gx, gy] = p.split(",").map(Number);
  const wx = (gx / dsf - vx) / s, wy = (gy / dsf - vy) / s;
  const out = [];
  geom.chains.forEach((c, ci) => {
    let best = 1e9, bk = -1, bwm = 0;
    const P = c.pts;
    for (let k = 0; k + 1 < P.length; k++) {
      const [d, u] = dseg(wx, wy, P[k][1], P[k][2], P[k + 1][1], P[k + 1][2]);
      const wm = P[k][3] + (P[k + 1][3] - P[k][3]) * u;
      if (d - fh * wm < best) { best = d - fh * wm; bk = P[k][0]; bwm = wm; }
    }
    out.push(`c${ci}: rel=${best.toFixed(4)} (k${bk},wm${bwm.toFixed(2)})`);
  });
  console.log(`(${gx},${gy}) world(${wx.toFixed(3)},${wy.toFixed(3)}): ${out.join(" | ")}`);
}
