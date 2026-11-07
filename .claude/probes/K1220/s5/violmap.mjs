// K1220 S5: coarse map of rest-vs-nofans differences around one fork.
//   node violmap.mjs <shotsRoot> <label> <stand> <ji> <geomDir> [cellPx]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decodePNG, toRGB } from "./png.mjs";
const [, , ROOT, LABEL, STAND, JI, GEOMD, CELL = "6"] = process.argv;
const ji = Number(JI), cell = Number(CELL);
const dir = join(ROOT, LABEL, STAND);
const meta = JSON.parse(readFileSync(join(dir, "meta.json"), "utf8"));
const geom = JSON.parse(readFileSync(join(GEOMD, `${STAND}_ji${ji}_geom.json`), "utf8"));
const load = (p) => toRGB(decodePNG(readFileSync(p)));
const rest = load(join(dir, "rest.png")), nof = load(join(dir, "nofans.png"));
const rec = meta.recs.find((r) => r.ji === ji);
const dsf = meta.dsf, s = meta.view.s, vx = meta.view.x, vy = meta.view.y, fh = meta.fh, pxW = 1 / (s * dsf);
const cx = rec.sx * dsf, cy = rec.sy * dsf, R = 5 * fh * s * dsf;
const x0 = Math.round(cx - R), y0 = Math.round(cy - R), W = Math.round(2 * R), H = W;
const chains = geom.chains.map((c) => c.pts);
const kJ = chains.map((p) => { let bi = 0, bd = 1e9; p.forEach((q) => { const d = Math.hypot(q[1] - geom.j[0], q[2] - geom.j[1]); if (d < bd) { bd = d; bi = q[0]; } }); return bi; });
const dseg = (px, py, ax, ay, bx, by) => { const ex = bx - ax, ey = by - ay, l2 = ex * ex + ey * ey; let u = l2 > 1e-12 ? ((px - ax) * ex + (py - ay) * ey) / l2 : 0; u = Math.max(0, Math.min(1, u)); return [Math.hypot(px - (ax + ex * u), py - (ay + ey * u)), u]; };
const rows = [];
for (let gy = 0; gy < H; gy += cell) {
  let row = "";
  for (let gx = 0; gx < W; gx += cell) {
    let ch = " ";
    for (let y = gy; y < Math.min(gy + cell, H) && ch !== "B"; y++) for (let x = gx; x < Math.min(gx + cell, W); x++) {
      const X = x0 + x, Y = y0 + y, o = (Y * rest.W + X) * 3;
      const d = Math.max(Math.abs(rest.data[o] - nof.data[o]), Math.abs(rest.data[o + 1] - nof.data[o + 1]), Math.abs(rest.data[o + 2] - nof.data[o + 2]));
      if (d <= 4) continue;
      const wx = (X / dsf - vx) / s, wy = (Y / dsf - vy) / s;
      let best = 1e9, bch = -1, bk = -1;
      for (let ci = 0; ci < chains.length; ci++) { const p = chains[ci]; for (let k = 0; k + 1 < p.length; k++) { const [dd, u] = dseg(wx, wy, p[k][1], p[k][2], p[k + 1][1], p[k + 1][2]); const rel = dd - fh * (p[k][3] + (p[k + 1][3] - p[k][3]) * u); if (rel < best) { best = rel; bch = ci; bk = p[k][0]; } } }
      const c2 = best < -pxW ? (bk <= kJ[bch] ? "R" : "S") : d > 8 ? "F" : ".";
      if (ch === " " || (ch === "." && c2 !== ".") || (ch === "F" && (c2 === "R" || c2 === "S"))) ch = c2;
    }
    row += ch;
  }
  rows.push(row);
}
console.log(`${STAND} ji${ji} centre device ${cx.toFixed(0)},${cy.toFixed(0)} fhPx ${(fh * s * dsf).toFixed(1)} (R=root-side, S=stem/other-side, F=fan off ribbon, .=diff<=8 off ribbon)`);
console.log(rows.join("\n"));
