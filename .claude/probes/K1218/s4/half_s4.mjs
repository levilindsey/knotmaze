// K1218 S4: a downscaled (box) copy of a frame, for finding spots.
//   node half_s4.mjs <in.png> <out.png> [f=2] [x0,y0,x1,y1]
import { readFileSync, writeFileSync } from "node:fs";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";
const [, , IN, OUT, F = "2", BOX] = process.argv;
const im = toRGB(decodePNG(readFileSync(IN)));
const f = Number(F);
const [x0, y0, x1, y1] = BOX ? BOX.split(",").map(Number) : [0, 0, im.W, im.H];
const W = Math.floor((x1 - x0) / f), H = Math.floor((y1 - y0) / f);
const d = Buffer.alloc(W * H * 3);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let c = 0; c < 3; c++) {
  let s = 0;
  for (let j = 0; j < f; j++) for (let i = 0; i < f; i++) s += im.data[((y0 + y * f + j) * im.W + x0 + x * f + i) * 3 + c];
  d[(y * W + x) * 3 + c] = Math.round(s / (f * f));
}
writeFileSync(OUT, encodePNG({ W, H, data: d }));
console.log(`${OUT}: ${W}x${H}`);
