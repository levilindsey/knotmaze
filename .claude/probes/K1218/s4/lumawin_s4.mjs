// K1218 S4: print a luma grid (0.299 R + 0.587 G + 0.114 B, rounded) of one device window
// for several shots, one block per shot, and the count of pixels that differ between
// the first shot and each other one inside the window.
//   node lumawin_s4.mjs <x0> <y0> <w> <h> <png> <png> ...
import { readFileSync } from "node:fs";
import { decodePNG, toRGB } from "./png.mjs";

const [, , X0, Y0, W0, H0, ...pngs] = process.argv;
const x0 = Number(X0), y0 = Number(Y0), w = Number(W0), h = Number(H0);
const imgs = pngs.map((p) => toRGB(decodePNG(readFileSync(p))));
const lumaAt = (im, x, y) => {
  const o = (y * im.W + x) * 3;
  return Math.round(0.299 * im.data[o] + 0.587 * im.data[o + 1] + 0.114 * im.data[o + 2]);
};
imgs.forEach((im, k) => {
  let diff = 0, maxd = 0;
  const rows = [];
  for (let y = y0; y < y0 + h; y++) {
    const cells = [];
    for (let x = x0; x < x0 + w; x++) {
      const v = lumaAt(im, x, y);
      cells.push(String(v).padStart(4));
      if (k > 0) {
        const d = Math.abs(v - lumaAt(imgs[0], x, y));
        if (d > 0) diff++;
        if (d > maxd) maxd = d;
      }
    }
    rows.push(`${String(y).padStart(5)} ${cells.join("")}`);
  }
  console.log(`${pngs[k]}${k > 0 ? `  (vs first: ${diff} px differ, max ${maxd})` : ""}`);
  console.log(`      ${Array.from({ length: w }, (_, i) => String(x0 + i).padStart(4)).join("")}`);
  console.log(rows.join("\n"));
});
