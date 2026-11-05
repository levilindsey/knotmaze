import { readFileSync } from "fs";
import { decodePNG, toRGB } from "./png.mjs";
const [a, b] = process.argv.slice(2);
for (const n of ["t5_d", "t5_n", "t4_d", "t0_d"]) {
  const A = toRGB(decodePNG(readFileSync(`${a}/${n}.png`))), B = toRGB(decodePNG(readFileSync(`${b}/${n}.png`)));
  let nd = 0, mx = [0, 0, 0], x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
  for (let i = 0; i < A.W * A.H; i++) {
    let d = 0;
    for (let c = 0; c < 3; c++) { const e = Math.abs(A.data[i * 3 + c] - B.data[i * 3 + c]); mx[c] = Math.max(mx[c], e); d = Math.max(d, e); }
    if (d > 0) { nd++; const x = i % A.W, y = (i / A.W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  }
  console.log(n, A.W + "x" + A.H, "diff px", nd, "max rgb", mx.join(","), "box", x0, y0, x1, y1);
}
