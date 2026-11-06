// node sub_s4.mjs <in> <out> x0 y0 w h [zoom=1] : a plain sub-image (nearest zoom)
import { readFileSync, writeFileSync } from "node:fs";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";
const [, , IN, OUT, X0, Y0, W0, H0, Z0 = "1"] = process.argv;
const im = toRGB(decodePNG(readFileSync(IN)));
const x0 = +X0, y0 = +Y0, w = +W0, h = +H0, z = +Z0, W = w * z, H = h * z;
const data = Buffer.alloc(W * H * 3, 40);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const sx = x0 + Math.floor(x / z), sy = y0 + Math.floor(y / z);
  if (sx < 0 || sy < 0 || sx >= im.W || sy >= im.H) continue;
  const i = (sy * im.W + sx) * 3, o = (y * W + x) * 3;
  data[o] = im.data[i]; data[o + 1] = im.data[i + 1]; data[o + 2] = im.data[i + 2];
}
writeFileSync(OUT, encodePNG({ W, H, data }));
console.log(OUT, W + "x" + H);
