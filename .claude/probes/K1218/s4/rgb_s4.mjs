// node rgb_s4.mjs <png> x0 y0 x1 y1 : raw RGB rows (hex rrggbb)
import { readFileSync } from "node:fs";
import { decodePNG, toRGB } from "./png.mjs";
const [, , P, X0, Y0, X1, Y1] = process.argv;
const im = toRGB(decodePNG(readFileSync(P)));
for (let y = +Y0; y <= +Y1; y++) {
  let s = String(y).padStart(4) + " ";
  for (let x = +X0; x <= +X1; x++) { const o = (y * im.W + x) * 3; s += [0, 1, 2].map((k) => im.data[o + k].toString(16).padStart(2, "0")).join("") + " "; }
  console.log(s);
}
