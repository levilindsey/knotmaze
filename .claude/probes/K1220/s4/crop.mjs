// K1220 S4: a nearest-scaled crop of a PNG, for looking at a few pixels.
//   node crop.mjs <in.png> <x> <y> <w> <h> <zoom> <out.png> [<in2.png> ...]
// With more inputs after <out.png>, the same crop of each sits side by side.
import { readFileSync, writeFileSync } from "node:fs";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";

const [, , IN, X, Y, W, H, Z, OUT, ...more] = process.argv;
const x0 = Number(X), y0 = Number(Y), w = Number(W), h = Number(H), z = Number(Z), G = 6;
const ins = [IN, ...more].map((p) => toRGB(decodePNG(readFileSync(p))));
const SW = ins.length * w * z + (ins.length - 1) * G, SH = h * z;
const data = Buffer.alloc(SW * SH * 3, 40);
ins.forEach((im, k) => {
  const ox = k * (w * z + G);
  for (let y = 0; y < SH; y++) {
    const sy = y0 + Math.floor(y / z);
    for (let x = 0; x < w * z; x++) {
      const sx = x0 + Math.floor(x / z);
      const o = (y * SW + ox + x) * 3;
      if (sx < 0 || sy < 0 || sx >= im.W || sy >= im.H) { data[o] = 255; data[o + 1] = 0; data[o + 2] = 255; continue; }
      const s = (sy * im.W + sx) * 3;
      data[o] = im.data[s]; data[o + 1] = im.data[s + 1]; data[o + 2] = im.data[s + 2];
    }
  }
});
writeFileSync(OUT, encodePNG({ W: SW, H: SH, data }));
console.log(`${OUT}: ${SW}x${SH}`);
