// K1220 S6 debug: ink/closing pixel counts in one fork box.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decodePNG, toRGB } from "./png.mjs";
const [, , ROOT, LABEL, STAND, JI] = process.argv;
const ji = Number(JI);
const meta = JSON.parse(readFileSync(join(ROOT, LABEL, STAND, "meta.json"), "utf8"));
const load = (p) => toRGB(decodePNG(readFileSync(p)));
const img = load(join(ROOT, LABEL, STAND, "rest.png"));
const nof = load(join(ROOT, LABEL, STAND, "nofans.png"));
function bgOf(im) {
  const px = [];
  for (const [x0, y0] of [[0, 0], [im.W - 40, 0], [0, im.H - 40], [im.W - 40, im.H - 40]])
    for (let y = y0; y < y0 + 40; y += 4) for (let x = x0; x < x0 + 40; x += 4) {
      const o = (y * im.W + x) * 3; px.push([im.data[o], im.data[o + 1], im.data[o + 2]]);
    }
  px.sort((a, b) => a[0] - b[0]);
  return px[px.length >> 1];
}
const bg = bgOf(nof);
const rec = meta.recs.find((r) => r.ji === ji);
const dsf = meta.dsf, s = meta.view.s, fh = meta.fh;
const cx = rec.sx * dsf, cy = rec.sy * dsf, R = 6 * fh * s * dsf;
const x0 = Math.max(0, Math.round(cx - R)), x1 = Math.min(img.W, Math.round(cx + R));
const y0 = Math.max(0, Math.round(cy - R)), y1 = Math.min(img.H, Math.round(cy + R));
const W = x1 - x0, H = y1 - y0;
const inkOf = (im) => {
  const m = new Uint8Array(W * H);
  let n = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = ((y0 + y) * im.W + x0 + x) * 3;
    const v = Math.hypot(im.data[o] - bg[0], im.data[o + 1] - bg[1], im.data[o + 2] - bg[2]) > 40 ? 1 : 0;
    m[y * W + x] = v; n += v;
  }
  return [m, n];
};
const [ink, nInk] = inkOf(img);
const [inkN, nInkN] = inkOf(nof);
const rpx = Math.max(1, Math.round(fh * s * dsf));
console.log(`box ${W}x${H} bg=${bg} rpx=${rpx} ink=${nInk} inkN=${nInkN}`);
const offs = [];
for (let dy = -rpx; dy <= rpx; dy++) for (let dx = -rpx; dx <= rpx; dx++)
  if (dx * dx + dy * dy <= rpx * rpx) offs.push([dx, dy]);
const dil = new Uint8Array(W * H), clo = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (!inkN[y * W + x]) continue;
  for (const [dx, dy] of offs) {
    const xx = x + dx, yy = y + dy;
    if (xx >= 0 && yy >= 0 && xx < W && yy < H) dil[yy * W + xx] = 1;
  }
}
let nClo = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  let ok = 1;
  for (const [dx, dy] of offs) {
    const xx = x + dx, yy = y + dy;
    if (xx < 0 || yy < 0 || xx >= W || yy >= H || !dil[yy * W + xx]) { ok = 0; break; }
  }
  clo[y * W + x] = ok; nClo += ok;
}
console.log(`closing=${nClo} inkOutsideClosing=${ink.reduce((a, v, i) => a + (v && !clo[i] ? 1 : 0), 0)}`);
