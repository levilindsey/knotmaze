// A contact sheet: equal-size PNGs on a grid, 6 px dark gutters, no labels
// (the caller documents the layout).
//   node sheet.mjs <out.png> <cols> <a.png> <b.png> ...   (row-major)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";

const [, , OUT, COLS, ...files] = process.argv;
const cols = Number(COLS);
const imgs = files.map((f) => toRGB(decodePNG(readFileSync(f))));
const W = imgs[0].W, H = imgs[0].H, G = 6;
const rows = Math.ceil(imgs.length / cols);
const SW = cols * W + (cols + 1) * G, SH = rows * H + (rows + 1) * G;
const data = Buffer.alloc(SW * SH * 3, 40);
imgs.forEach((im, i) => {
  if (im.W !== W || im.H !== H) throw new Error(`${files[i]}: ${im.W}x${im.H}, want ${W}x${H}`);
  const ox = G + (i % cols) * (W + G), oy = G + Math.floor(i / cols) * (H + G);
  for (let y = 0; y < H; y++) im.data.copy(data, ((oy + y) * SW + ox) * 3, y * W * 3, (y + 1) * W * 3);
});
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, encodePNG({ W: SW, H: SH, data }));
console.log(`${OUT}: ${SW}x${SH}, ${rows}x${cols}`);
