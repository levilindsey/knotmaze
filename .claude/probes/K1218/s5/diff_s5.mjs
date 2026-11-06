import { readFileSync } from "node:fs";
import { decodePNG, toRGB } from "./png.mjs";
const [a, b] = process.argv.slice(2);
const A = toRGB(decodePNG(readFileSync(a))), B = toRGB(decodePNG(readFileSync(b)));
let n = 0, mx = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
for (let y = 0; y < A.H; y++) for (let x = 0; x < A.W; x++) {
  const o = (y * A.W + x) * 3;
  const d = Math.max(Math.abs(A.data[o] - B.data[o]), Math.abs(A.data[o + 1] - B.data[o + 1]), Math.abs(A.data[o + 2] - B.data[o + 2]));
  if (d > 0) { n++; if (d > mx) mx = d; if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
}
console.log(`${A.W}x${A.H} differ ${n} px, max ${mx}, bbox ${x0},${y0}-${x1},${y1}`);