// K1218 S3: a zoomed crop with fans_s3.mjs's rim polygons drawn over it.
//   node overlay_s3.mjs <png> <fans result.json> <out.png> <x0> <y0> <size> <zoom> [fan #...]
// Each listed fan (all when none) draws its rim edges in its own colour and its
// vertices as 3x3 squares (white = the first vertex); the crop is dimmed 0.6.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";

const [, , PNG, RES, OUT, X0, Y0, SIZE, ZOOM, ...WANT] = process.argv;
const x0 = Number(X0), y0 = Number(Y0), S = Number(SIZE), Z = Number(ZOOM);
const im = toRGB(decodePNG(readFileSync(PNG)));
const res = JSON.parse(readFileSync(RES, "utf8"));
const fans = res.calls.filter((c) => !WANT.length || WANT.includes(String(c.i)));
const W = S * Z;
const data = Buffer.alloc(W * W * 3);
for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
  const sx = x0 + Math.floor(x / Z), sy = y0 + Math.floor(y / Z);
  const s = (sy * im.W + sx) * 3, o = (y * W + x) * 3;
  for (let c = 0; c < 3; c++) data[o + c] = im.data[s + c] * 0.6;
}
const put = (x, y, col) => {
  if (x < 0 || y < 0 || x >= W || y >= W) return;
  const o = (y * W + x) * 3;
  data[o] = col[0]; data[o + 1] = col[1]; data[o + 2] = col[2];
};
const cols = [[255, 60, 60], [60, 255, 60], [80, 160, 255], [255, 255, 60], [255, 60, 255], [60, 255, 255]];
// Device px (pixel centres at +0.5) -> crop px.
const tx = (v) => (v - x0) * Z, ty = (v) => (v - y0) * Z;
fans.forEach((f, fi) => {
  const col = cols[fi % cols.length];
  const d = f.dev;
  const n = d.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const ax = tx(d[2 * i]), ay = ty(d[2 * i + 1]), bx = tx(d[2 * j]), by = ty(d[2 * j + 1]);
    const steps = Math.ceil(Math.hypot(bx - ax, by - ay)) + 1;
    for (let k = 0; k <= steps; k++) put(Math.round(ax + ((bx - ax) * k) / steps), Math.round(ay + ((by - ay) * k) / steps), col);
  }
  for (let i = 0; i < n; i++) {
    const vx = Math.round(tx(d[2 * i])), vy = Math.round(ty(d[2 * i + 1]));
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) put(vx + a, vy + b, i === 0 ? [255, 255, 255] : col);
  }
  console.log(`fan #${f.i} colour ${col}: ${n} vertices`);
});
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, encodePNG({ W, H: W, data }));
console.log(`${OUT}: ${W}x${W}`);
