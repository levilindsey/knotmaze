// K1218 S3: side-by-side zoomed crops of one point across shot dirs.
//   node pair_s3.mjs <out.png> <x,y> <size> <zoom> <dir> [<dir> ...]   (np.png in each)
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";
const [, , OUT, PT, SIZE, ZOOM, ...DIRS] = process.argv;
const [cx, cy] = PT.split(",").map(Number), S = Number(SIZE), Z = Number(ZOOM), G = 6;
const ims = DIRS.map((d) => toRGB(decodePNG(readFileSync(d.endsWith(".png") ? d : join(d, "np.png")))));
const CW = S * Z, W = ims.length * CW + (ims.length + 1) * G, H = CW + 2 * G;
const data = Buffer.alloc(W * H * 3, 40);
const x0 = cx - (S >> 1), y0 = cy - (S >> 1);
ims.forEach((im, i) => {
  const ox = G + i * (CW + G);
  for (let y = 0; y < CW; y++) for (let x = 0; x < CW; x++) {
    const sx = x0 + Math.floor(x / Z), sy = y0 + Math.floor(y / Z), o = ((G + y) * W + ox + x) * 3;
    if (sx < 0 || sy < 0 || sx >= im.W || sy >= im.H) { data[o] = 255; data[o + 2] = 255; continue; }
    const s = (sy * im.W + sx) * 3;
    data[o] = im.data[s]; data[o + 1] = im.data[s + 1]; data[o + 2] = im.data[s + 2];
  }
});
writeFileSync(OUT, encodePNG({ W, H, data }));
console.log(`${OUT}: ${DIRS.length} crops of ${S}px at ${PT}, zoom ${Z}`);
