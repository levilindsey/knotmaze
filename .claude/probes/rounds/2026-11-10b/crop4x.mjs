// crop4x.mjs <dir> <link> <baseShot> <headShot>: a 4x nearest-neighbour crop (x 190, y 400, 70x70) of one spot, default left, rp=sdf right.
import { readFileSync, writeFileSync } from "node:fs";
import { decodePNG, encodePNG } from "./k268/png.mjs";
const [, , dir, link, a, b] = process.argv;
const X = 190, Y = 400, w = 70, h = 70, S = 4, G = 8;
const A = decodePNG(readFileSync(`${dir}/${a}`)), B = decodePNG(readFileSync(`${dir}/${b}`));
const OW = w * S * 2 + G, OH = h * S;
const od = Buffer.alloc(OW * OH * 3, 255);
[A, B].forEach((im, k) => { for (let y = 0; y < h * S; y++) for (let x = 0; x < w * S; x++) {
  const q = ((Y + ((y / S) | 0)) * im.W + X + ((x / S) | 0)) * im.ch, o = (y * OW + k * (w * S + G) + x) * 3;
  od[o] = im.data[q]; od[o + 1] = im.data[q + 1]; od[o + 2] = im.data[q + 2]; } });
writeFileSync(`${dir}/crop4x_${link}_base_head.png`, encodePNG({ W: OW, H: OH, data: od }));

