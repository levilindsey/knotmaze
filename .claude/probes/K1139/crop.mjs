// node crop.mjs in.png out.png cx cy w h [scale]   (CSS px at dsf 1.5 -> device px; centre cx,cy)
import { readFileSync, writeFileSync } from "node:fs";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";
const [, , IN, OUTP, cx, cy, w, h, sc = "1", dsf = "1.5"] = process.argv;
const img = toRGB(decodePNG(readFileSync(IN)));
const D = Number(dsf), S = Number(sc);
const x0 = Math.max(0, Math.round((Number(cx) - Number(w) / 2) * D));
const y0 = Math.max(0, Math.round((Number(cy) - Number(h) / 2) * D));
const W = Math.min(img.W - x0, Math.round(Number(w) * D)), H = Math.min(img.H - y0, Math.round(Number(h) * D));
const OW = W * S, OH = H * S;
const out = Buffer.alloc(OW * OH * 3);
for (let y = 0; y < OH; y++) for (let x = 0; x < OW; x++) {
  const sx = x0 + Math.floor(x / S), sy = y0 + Math.floor(y / S);
  img.data.copy(out, (y * OW + x) * 3, (sy * img.W + sx) * 3, (sy * img.W + sx) * 3 + 3);
}
writeFileSync(OUTP, encodePNG({ W: OW, H: OH, data: out }));
console.log(OUTP, OW, OH);
