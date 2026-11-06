// K1211 S2: put PNGs side by side (top-aligned, 6 px gutters, dark fill).
//   node hcat.mjs <out.png> <a.png> <b.png> ...
import { readFileSync, writeFileSync } from "node:fs";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";

const [, , OUT, ...ins] = process.argv;
const ims = ins.map((f) => toRGB(decodePNG(readFileSync(f))));
const G = 6, W = ims.reduce((s, m) => s + m.W + G, G), H = Math.max(...ims.map((m) => m.H)) + 2 * G;
const data = Buffer.alloc(W * H * 3, 40);
let ox = G;
for (const m of ims) {
  for (let y = 0; y < m.H; y++) m.data.copy(data, ((G + y) * W + ox) * 3, y * m.W * 3, (y + 1) * m.W * 3);
  ox += m.W + G;
}
writeFileSync(OUT, encodePNG({ W, H, data }));
console.log(`${OUT}: ${W}x${H}`);
