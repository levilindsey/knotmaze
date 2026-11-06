// K1218 S2: one row of crops around a device-pixel point, from several shots.
//   node crop_s2.mjs <out.png> <cx> <cy> <size> <zoom> <png> <png> ...
// Nearest-neighbour zoom, 6 px gutters; for looking at a diff box near_s2 found.
import { readFileSync, writeFileSync } from "node:fs";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";

const [, , OUT, CX, CY, SIZE, ZOOM, ...pngs] = process.argv;
const S = Number(SIZE), Z = Number(ZOOM), G = 6;
const cx = Number(CX), cy = Number(CY);
const W = pngs.length * (S * Z + G) + G, H = S * Z + 2 * G;
const out = Buffer.alloc(W * H * 3);
out.fill(40);
pngs.forEach((f, k) => {
  const im = toRGB(decodePNG(readFileSync(f)));
  const x0 = Math.round(cx - S / 2), y0 = Math.round(cy - S / 2);
  for (let y = 0; y < S * Z; y++) {
    for (let x = 0; x < S * Z; x++) {
      const sx = x0 + Math.floor(x / Z), sy = y0 + Math.floor(y / Z);
      const o = ((G + y) * W + G + k * (S * Z + G) + x) * 3;
      if (sx < 0 || sy < 0 || sx >= im.W || sy >= im.H) continue;
      const s = (sy * im.W + sx) * 3;
      out[o] = im.data[s]; out[o + 1] = im.data[s + 1]; out[o + 2] = im.data[s + 2];
    }
  }
});
writeFileSync(OUT, encodePNG({ W, H, data: out }));
console.log(`${OUT}: ${W}x${H}`);
