// K1218 S5: per cell of a sheet (4 columns of 96 device px windows at zoom 4,
// 6 px gutters; rows 7474d09b t3-t6, master t3-t6, branch t3-t6, then master
// and branch at rest), the largest step between neighbouring device pixels
// (max over r, g, b) inside a window of device px, along x (h) or y (v).
//   node seamscan_s5.mjs <sheet.png> <h|v> <i0,i1> <j0,j1>
import { readFileSync } from "node:fs";
import { decodePNG, toRGB } from "./png.mjs";

const [f, dir, is, js] = process.argv.slice(2);
const [i0, i1] = is.split(",").map(Number), [j0, j1] = js.split(",").map(Number);
const im = toRGB(decodePNG(readFileSync(f)));
const C = 384, G = 6;
const names = ["7474 t3", "7474 t4", "7474 t5", "7474 t6", "master t3", "master t4", "master t5", "master t6",
  "branch t3", "branch t4", "branch t5", "branch t6", "master rest", "branch rest"];
const px = (cell, i, j, ch) => {
  const ox = G + (cell % 4) * (C + G), oy = G + Math.floor(cell / 4) * (C + G);
  return im.data[((oy + 4 * j + 2) * im.W + ox + 4 * i + 2) * 3 + ch];
};
for (let cell = 0; cell < 14; cell++) {
  let best = 0, at = "";
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const i2 = dir === "h" ? i + 1 : i, j2 = dir === "h" ? j : j + 1;
    if (i2 > 95 || j2 > 95) continue;
    let s = 0;
    for (let ch = 0; ch < 3; ch++) s = Math.max(s, Math.abs(px(cell, i2, j2, ch) - px(cell, i, j, ch)));
    if (s > best) { best = s; at = `${i},${j}`; }
  }
  console.log(`${names[cell].padEnd(12)} max step ${String(best).padStart(3)} at ${at}`);
}
