// K1218 S3: print a pixel window of a PNG (R,G,B as 3-digit hex-ish).
//   node px_s3.mjs <png> <x0> <y0> <w> <h> [ch=all|r|g|b|lum]
import { readFileSync } from "node:fs";
import { decodePNG, toRGB } from "./png.mjs";
const [, , F, X0, Y0, W, H, CH = "lum"] = process.argv;
const im = toRGB(decodePNG(readFileSync(F)));
const x0 = +X0, y0 = +Y0;
let hdr = "     ";
for (let x = x0; x < x0 + +W; x++) hdr += String(x % 1000).padStart(4);
console.log(hdr);
for (let y = y0; y < y0 + +H; y++) {
  let s = String(y).padStart(4) + " ";
  for (let x = x0; x < x0 + +W; x++) {
    const o = (y * im.W + x) * 3;
    const r = im.data[o], g = im.data[o + 1], b = im.data[o + 2];
    const v = CH === "r" ? r : CH === "g" ? g : CH === "b" ? b : Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    s += String(v).padStart(4);
  }
  console.log(s);
}
