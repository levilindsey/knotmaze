// K1202: re-measure the kymograph column steps from a sheets_cyc kymograph
// (same arithmetic as S4b's crops/kymo_steps.txt: per column, the max over
// the 72 rows of |L(c+1) - L(c)|, luma 0.2126/0.7152/0.0722 on the top half).
//   node kymo_steps.mjs <kymo.png>
import { readFileSync } from "node:fs";
import { decodePNG, toRGB } from "./png.mjs";
const img = toRGB(decodePNG(readFileSync(process.argv[2])));
const G = 6, KR = (img.H - 3 * G) / 4;
const lum = (x, y) => { const k = (y * img.W + x) * 3; return 0.2126 * img.data[k] + 0.7152 * img.data[k + 1] + 0.0722 * img.data[k + 2]; };
const W = img.W - 2 * G, y0 = G;
const maxD = [], cnt10 = [];
for (let c = 0; c < W - 1; c++) {
  let m = 0, n = 0;
  for (let r = 0; r < 72; r++) {
    const d = Math.abs(lum(G + c + 1, y0 + 2 * r) - lum(G + c, y0 + 2 * r));
    if (d > m) m = d;
    if (d > 10) n++;
  }
  maxD.push(m); cnt10.push(n);
}
console.log(`kymo ${img.W}x${img.H}: ${W} columns, 72 rows (top half)`);
console.log("cols 15..60 max|dL|: " + maxD.slice(15, 61).map((v) => v.toFixed(0)).join(" "));
let bi = 0;
for (let c = 0; c < maxD.length; c++) if (maxD[c] > maxD[bi]) bi = c;
console.log(`largest step overall: col ${bi}->${bi + 1} max|dL| ${maxD[bi].toFixed(1)}, rows>10: ${cnt10[bi]}/72`);
for (let c = 17; c <= 24; c++) console.log(`  col ${c}->${c + 1}: max|dL| ${maxD[c].toFixed(1)}, rows>10: ${cnt10[c]}/72`);
for (let c = 50; c <= 57; c++) console.log(`  col ${c}->${c + 1}: max|dL| ${maxD[c].toFixed(1)}, rows>10: ${cnt10[c]}/72`);
