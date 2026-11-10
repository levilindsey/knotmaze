// crop.mjs: the same rect from N shots, each scaled up (nearest), side by side
// with a 6 px gutter (K8 sdf gaps).
//   node .claude/probes/K8/sdf_gaps/crop.mjs <out.png> <x> <y> <w> <h> <scale> <a.png> [b.png ...]
// Also prints, per pair (a vs each later shot), the count of differing pixels
// in the rect (sum of |dR|+|dG|+|dB| > 24).
import { readFileSync, writeFileSync } from "node:fs";
import { decodePNG, encodePNG, toRGB } from "../../../../scripts/phone_pass/png.mjs";

const [, , out, xs, ys, ws, hs, ss, ...ins] = process.argv;
const [x0, y0, w, h, sc] = [xs, ys, ws, hs, ss].map(Number);
const imgs = ins.map((f) => toRGB(decodePNG(readFileSync(f))));
const G = 6;
const W = imgs.length * w * sc + (imgs.length - 1) * G;
const H = h * sc;
const data = Buffer.alloc(W * H * 3, 255);
imgs.forEach((im, k) => {
  const ox = k * (w * sc + G);
  for (let y = 0; y < H; y++) {
    const sy = y0 + Math.floor(y / sc);
    for (let x = 0; x < w * sc; x++) {
      const sx = x0 + Math.floor(x / sc);
      const si = (sy * im.W + sx) * 3;
      const di = (y * W + ox + x) * 3;
      if (sx < 0 || sy < 0 || sx >= im.W || sy >= im.H) continue;
      data[di] = im.data[si];
      data[di + 1] = im.data[si + 1];
      data[di + 2] = im.data[si + 2];
    }
  }
});
writeFileSync(out, encodePNG({ W, H, data }));
for (let k = 1; k < imgs.length; k++) {
  let n = 0;
  const a = imgs[0], b = imgs[k];
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const i = (y * a.W + x) * 3, j = (y * b.W + x) * 3;
    if (Math.abs(a.data[i] - b.data[j]) + Math.abs(a.data[i + 1] - b.data[j + 1]) + Math.abs(a.data[i + 2] - b.data[j + 2]) > 24) n++;
  }
  console.log(`${ins[0]} vs ${ins[k]}: ${n} px differ in the rect`);
}
console.log(`wrote ${out} (${W}x${H})`);
