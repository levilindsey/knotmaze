// K1220 S6: Done 2 second clause (the tooth): pixels where the baseline
// (base) rest frame has ink but mine is background, within 6 fh of a
// fork, excluding the baseline's bump pixels (its fan ink outside the
// closing of the ribbon union by a 1 fh disc, from paintmask's masks).
//   node tooth.mjs <shotsRoot> <geomDir>
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decodePNG, toRGB } from "./png.mjs";
const [, , ROOT, GEOMD] = process.argv;
const FORKS = [
  ["i_xh3", 0], ["i_xh2", 0], ["ai_xh3", 2], ["ai_xh2", 2],
  ["ia_xh3", 0], ["ia_xh2", 0], ["ii_xh3", 0], ["ii_xh3", 1], ["ii_xh2", 0], ["ii_xh2", 1],
];
function load(p) { return toRGB(decodePNG(readFileSync(p))); }
function bgOf(im) {
  const px = [];
  for (const [x0, y0] of [[0, 0], [im.W - 40, 0], [0, im.H - 40], [im.W - 40, im.H - 40]])
    for (let y = y0; y < y0 + 40; y += 4) for (let x = x0; x < x0 + 40; x += 4) {
      const o = (y * im.W + x) * 3; px.push([im.data[o], im.data[o + 1], im.data[o + 2]]);
    }
  px.sort((a, b) => a[0] - b[0]);
  return px[px.length >> 1];
}
const distPtSeg = (px, py, ax, ay, bx, by) => {
  const ex = bx - ax, ey = by - ay, l2 = ex * ex + ey * ey;
  let u = l2 > 1e-12 ? ((px - ax) * ex + (py - ay) * ey) / l2 : 0;
  u = Math.max(0, Math.min(1, u));
  return [Math.hypot(px - (ax + ex * u), py - (ay + ey * u)), u];
};
for (const [stand, ji] of FORKS) {
  const meta = JSON.parse(readFileSync(join(ROOT, "mine", stand, "meta.json"), "utf8"));
  const geom = JSON.parse(readFileSync(join(GEOMD, `${stand}_ji${ji}_geom.json`), "utf8"));
  const base = load(join(ROOT, "base", stand, "rest.png"));
  const baseNof = load(join(ROOT, "base", stand, "nofans.png"));
  const mine = load(join(ROOT, "mine", stand, "rest.png"));
  const bg = bgOf(baseNof);
  const ink = (im, x, y) => {
    const o = (y * im.W + x) * 3;
    return Math.hypot(im.data[o] - bg[0], im.data[o + 1] - bg[1], im.data[o + 2] - bg[2]) > 40;
  };
  const rec = meta.recs.find((r) => r.ji === ji);
  const dsf = meta.dsf, s = meta.view.s, vx = meta.view.x, vy = meta.view.y;
  const fh = meta.fh, pxW = 1 / (s * dsf);
  const cx = rec.sx * dsf, cy = rec.sy * dsf;
  const R = 6 * fh * s * dsf;
  const x0 = Math.max(0, Math.round(cx - R)), x1 = Math.min(base.W, Math.round(cx + R));
  const y0 = Math.max(0, Math.round(cy - R)), y1 = Math.min(base.H, Math.round(cy + R));
  const W = x1 - x0, H = y1 - y0;
  const chains = geom.chains.map((c) => c.pts);
  const union = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const wx = ((x0 + x) / dsf - vx) / s, wy = ((y0 + y) / dsf - vy) / s;
    let best = 1e9;
    for (let ci = 0; ci < chains.length; ci++) {
      const p = chains[ci];
      for (let k = 0; k + 1 < p.length; k++) {
        const [dd, u] = distPtSeg(wx, wy, p[k][1], p[k][2], p[k + 1][1], p[k + 1][2]);
        const rel = dd - fh * (p[k][3] + (p[k + 1][3] - p[k][3]) * u);
        if (rel < best) best = rel;
      }
    }
    union[y * W + x] = best < pxW ? 1 : 0;
  }
  const rpx = Math.max(1, Math.round(fh * s * dsf));
  const offs = [];
  for (let dy = -rpx; dy <= rpx; dy++) for (let dx = -rpx; dx <= rpx; dx++)
    if (dx * dx + dy * dy <= rpx * rpx) offs.push([dx, dy]);
  const dil = new Uint8Array(W * H), clo = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!union[y * W + x]) continue;
    for (const [dx, dy] of offs) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H) dil[yy * W + xx] = 1;
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let ok = 1;
    for (const [dx, dy] of offs) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H || !dil[yy * W + xx]) { ok = 0; break; }
    }
    clo[y * W + x] = ok;
  }
  let tooth = 0, toothBumpExcl = 0;
  const pts = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const gx = x0 + x, gy = y0 + y, i = y * W + x;
    if (!ink(base, gx, gy) || ink(mine, gx, gy)) continue;
    // baseline bump pixel: baseline fan ink outside the closing.
    const o = (gy * base.W + gx) * 3;
    const bd = Math.max(Math.abs(base.data[o] - baseNof.data[o]), Math.abs(base.data[o + 1] - baseNof.data[o + 1]), Math.abs(base.data[o + 2] - baseNof.data[o + 2]));
    const isBump = bd > 8 && !union[i] && !clo[i];
    if (isBump) { toothBumpExcl++; continue; }
    tooth++;
    if (pts.length < 8) pts.push([gx, gy]);
  }
  console.log(`${stand} ji${ji}: tooth (base ink, mine bg, excl base bump ${toothBumpExcl}) = ${tooth} ${JSON.stringify(pts)}`);
}
