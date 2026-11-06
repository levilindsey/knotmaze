// K1218 S4: a whole-frame difference image of two shots, for crop_s2.mjs's third panel.
//   node absdiff_s4.mjs <a.png> <b.png> <out.png> [gain=4]
// Each pixel is the largest channel |a - b| times gain (clamped), grey; 0 stays black.
import { readFileSync, writeFileSync } from "node:fs";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";

const [, , A, B, OUT, GAIN = "4"] = process.argv;
const g = Number(GAIN);
const ia = toRGB(decodePNG(readFileSync(A)));
const ib = toRGB(decodePNG(readFileSync(B)));
const out = Buffer.alloc(ia.W * ia.H * 3);
for (let i = 0; i < ia.W * ia.H; i++) {
  const o = i * 3;
  const d = Math.max(
    Math.abs(ia.data[o] - ib.data[o]),
    Math.abs(ia.data[o + 1] - ib.data[o + 1]),
    Math.abs(ia.data[o + 2] - ib.data[o + 2]),
  );
  const v = Math.min(255, d * g);
  out[o] = v; out[o + 1] = v; out[o + 2] = v;
}
writeFileSync(OUT, encodePNG({ W: ia.W, H: ia.H, data: out }));
