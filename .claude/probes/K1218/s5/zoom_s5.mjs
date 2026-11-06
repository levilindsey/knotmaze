// K1218 S5: one device window from several shots, side by side, scaled up
// (nearest), 4 px gutters; rows of `perRow` crops.
//   node zoom_s5.mjs <out.png> <scale> <x0,y0,w,h> <perRow> <in.png>...
import { readFileSync, writeFileSync } from "node:fs";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";

const [out, sc, win, per, ...ins] = process.argv.slice(2);
const S = Number(sc), P = Number(per);
const [x0, y0, w, h] = win.split(",").map(Number);
const G = 4, cols = Math.min(P, ins.length), rows = Math.ceil(ins.length / P);
const W = cols * w * S + (cols + 1) * G, H = rows * h * S + (rows + 1) * G;
const data = Buffer.alloc(W * H * 3, 40);
ins.forEach((f, i) => {
  const im = toRGB(decodePNG(readFileSync(f)));
  const ox = G + (i % P) * (w * S + G), oy = G + Math.floor(i / P) * (h * S + G);
  for (let y = 0; y < h * S; y++) for (let x = 0; x < w * S; x++) {
    const sx = x0 + Math.floor(x / S), sy = y0 + Math.floor(y / S);
    if (sx < 0 || sy < 0 || sx >= im.W || sy >= im.H) continue;
    const s = (sy * im.W + sx) * 3, d = ((oy + y) * W + ox + x) * 3;
    data[d] = im.data[s]; data[d + 1] = im.data[s + 1]; data[d + 2] = im.data[s + 2];
  }
});
writeFileSync(out, encodePNG({ W, H, data }));
console.log(`${out} ${W}x${H}`);
