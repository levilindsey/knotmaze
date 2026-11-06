// K1218 S4: stack PNGs vertically (6 px gutters, grey 40), for viewing several crops at once.
//   node stack_s4.mjs <out.png> <png> <png> ...
import { readFileSync, writeFileSync } from "node:fs";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";

const [, , OUT, ...pngs] = process.argv;
const imgs = pngs.map((p) => toRGB(decodePNG(readFileSync(p))));
const G = 6;
const W = Math.max(...imgs.map((i) => i.W));
const H = imgs.reduce((s, i) => s + i.H + G, 0) - G;
const out = Buffer.alloc(W * H * 3);
out.fill(40);
let y0 = 0;
for (const im of imgs) {
  for (let y = 0; y < im.H; y++) {
    im.data.copy(out, ((y0 + y) * W) * 3, y * im.W * 3, (y + 1) * im.W * 3);
  }
  y0 += im.H + G;
}
writeFileSync(OUT, encodePNG({ W, H, data: out }));
console.log(`${OUT}: ${W}x${H}`);
