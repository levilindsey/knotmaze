// K1211 S2: crops around junctions, zoomed (nearest), on a grid with 6 px gutters.
//   node crops2.mjs <out.png> <cols> <size> <zoom> <cell> <cell> ...
// A cell is <png>@<meta.json>@<ji> (the crop centred on that record's screen
// centre, sx/sy times the meta's dsf) or <png>@<cx>,<cy> (device px), or "-"
// for a blank cell. size = the crop's side in device px; zoom = the scale.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";

const [, , OUT, COLS, SIZE, ZOOM, ...cells] = process.argv;
const cols = Number(COLS), S = Number(SIZE), Z = Number(ZOOM), G = 6;
const metaCache = new Map();
function centre(spec) {
  const [png, a, b] = spec.split("@");
  if (b !== undefined) {
    if (!metaCache.has(a)) metaCache.set(a, JSON.parse(readFileSync(a, "utf8")));
    const m = metaCache.get(a);
    const r = m.recs.find((x) => x.ji === Number(b));
    if (!r) throw new Error(`${a}: no ji ${b}`);
    const dsf = m.dsf || 1.5;
    return { png, cx: r.sx * dsf, cy: r.sy * dsf };
  }
  const [cx, cy] = a.split(",").map(Number);
  return { png, cx, cy };
}
const CW = S * Z;
const rows = Math.ceil(cells.length / cols);
const SW = cols * CW + (cols + 1) * G, SH = rows * CW + (rows + 1) * G;
const data = Buffer.alloc(SW * SH * 3, 40);
cells.forEach((spec, i) => {
  if (spec === "-") return;
  const { png, cx, cy } = centre(spec);
  const im = toRGB(decodePNG(readFileSync(png)));
  const x0 = Math.round(cx - S / 2), y0 = Math.round(cy - S / 2);
  const ox = G + (i % cols) * (CW + G), oy = G + Math.floor(i / cols) * (CW + G);
  for (let y = 0; y < CW; y++) {
    const sy = y0 + Math.floor(y / Z);
    for (let x = 0; x < CW; x++) {
      const sx = x0 + Math.floor(x / Z);
      const o = ((oy + y) * SW + ox + x) * 3;
      if (sx < 0 || sy < 0 || sx >= im.W || sy >= im.H) { data[o] = 255; data[o + 1] = 0; data[o + 2] = 255; continue; }
      const s = (sy * im.W + sx) * 3;
      data[o] = im.data[s]; data[o + 1] = im.data[s + 1]; data[o + 2] = im.data[s + 2];
    }
  }
});
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, encodePNG({ W: SW, H: SH, data }));
console.log(`${OUT}: ${SW}x${SH}, ${rows}x${cols}`);
