// K1139 S3b fix: stack PNG strips top to bottom with a 6 px gap.
//   node stack.mjs <out.png> <in1.png> <in2.png> ...
import { readFileSync, writeFileSync } from "fs";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";
const [out, ...ins] = process.argv.slice(2);
const ims = ins.map((p) => toRGB(decodePNG(readFileSync(p))));
const W = Math.max(...ims.map((m) => m.W)), GAP = 6;
const H = ims.reduce((s, m) => s + m.H, 0) + GAP * (ims.length - 1);
const data = Buffer.alloc(W * H * 3, 255);
let y0 = 0;
for (const m of ims) {
  for (let y = 0; y < m.H; y++) m.data.copy(data, ((y0 + y) * W) * 3, y * m.W * 3, (y + 1) * m.W * 3);
  y0 += m.H + GAP;
}
writeFileSync(out, encodePNG({ W, H, data }));
console.log(out, W + "x" + H);
