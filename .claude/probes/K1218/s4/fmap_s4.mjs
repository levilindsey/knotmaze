// K1218 S4: a gold-fraction map. node fmap_s4.mjs <png> x0 y0 x1 y1 [gold r,g,b] [arm r,g,b]
// Each pixel's colour is projected on the arm->gold line: 0 = arm, 9 = gold ('.' = far from the line).
import { readFileSync } from "node:fs";
import { decodePNG, toRGB } from "./png.mjs";
const [, , P, X0, Y0, X1, Y1, G = "236,205,65", A = "120,195,181"] = process.argv;
const img = toRGB(decodePNG(readFileSync(P)));
const g = G.split(",").map(Number), a = A.split(",").map(Number);
const d = [g[0] - a[0], g[1] - a[1], g[2] - a[2]];
const dd = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
let hdr = "     ";
for (let x = +X0; x <= +X1; x++) hdr += String(x % 10);
console.log(hdr);
for (let y = +Y0; y <= +Y1; y++) {
  let s = String(y).padStart(4) + " ";
  for (let x = +X0; x <= +X1; x++) {
    const i = (y * img.W + x) * 3;
    const c = [img.data[i], img.data[i + 1], img.data[i + 2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const f = (v[0] * d[0] + v[1] * d[1] + v[2] * d[2]) / dd;
    const p = [a[0] + f * d[0] - c[0], a[1] + f * d[1] - c[1], a[2] + f * d[2] - c[2]];
    const off = Math.hypot(...p);
    s += off > 30 ? "." : f <= 0.02 ? " " : f >= 0.98 ? "#" : String(Math.min(9, Math.floor(f * 10)));
  }
  console.log(s);
}
