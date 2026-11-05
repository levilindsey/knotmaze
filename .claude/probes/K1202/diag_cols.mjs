// K1202: GPU debug-5 G at e210's centreline world points in the diag
// capture's frames (60 css px/world), cols 8..27, all 8 phases - does the
// bright/dark boundary stay at col 20/21 or move with pxW?
//   node diag_cols.mjs
import { readFileSync } from "node:fs";
import { decodePNG, toRGB } from "./png.mjs";

const geom = JSON.parse(readFileSync("out/geom.json", "utf8"));
const meta = JSON.parse(readFileSync("out/diag/meta.json", "utf8"));
const A = meta.aff, det = A.bx * A.cy - A.cx * A.by;
const toDev = (wx, wy) => {
  const dx = wx - A.ax, dy = wy - A.ay;
  return [(A.cy * dx - A.cx * dy) / det * 1.5, (-A.by * dx + A.bx * dy) / det * 1.5];
};
const samp = [];
for (let i = 0; i < geom.pts.length - 1; i++) {
  const [ax, ay, awx, awy] = geom.pts[i], [bx, by, bwx, bwy] = geom.pts[i + 1];
  const L = Math.hypot(bx - ax, by - ay) * 1.5, n = Math.max(1, Math.round(L));
  for (let j = 0; j < n; j++) samp.push([awx + ((bwx - awx) * j) / n, awy + ((bwy - awy) * j) / n]);
}
for (let k = 0; k < 8; k++) {
  const im = toRGB(decodePNG(readFileSync(`out/diag/t${k}_d.png`)));
  const vals = [];
  for (let c = 8; c <= 27; c++) {
    const [dx, dy] = toDev(samp[c][0], samp[c][1]);
    const x = Math.round(dx - meta.clip.x * 1.5), y = Math.round(dy - meta.clip.y * 1.5);
    vals.push(im.data[(y * im.W + x) * 3 + 1]);
  }
  console.log(`t${k}: cols8..27 G: ${vals.join(" ")}`);
}
