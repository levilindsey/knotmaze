// K1218 S4 (a copy of S2's sheets_s2.mjs; <ji> may be <ji>@<dx>,<dy>: the crop centre sits that many frame px off the matched record's centre in every build, for a spot beside a junction). K1218 S2 (a copy of K1211 S6's sheets6.mjs). One junction's sheet - rows of crops from several builds' shots, the
// junction matched across builds by its world centre (a build's ji may differ).
//   node sheets6.mjs <out.png> <size> <zoom> <refMeta.json> <ji> <row> <row> ...
// A row is <dir>|<png>,<png>,... (files inside <dir>, which holds meta.json; "-" =
// a blank cell; a cell holding a "/" is a path of its own, <otherDir>/<png>, cropped
// by <otherDir>'s meta - the at-rest row mixes builds that way). The ref meta's
// record ji gives the world centre c; each cell's crop is centred on the nearest
// record of its own meta (sx/sy times its dsf). Crops are nearest-neighbour
// zoomed, 6 px gutters, one row per <row>.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";

const [, , OUT, SIZE, ZOOM, REF, JI, ...rowSpecs] = process.argv;
const S = Number(SIZE), Z = Number(ZOOM), G = 6;
const ref = JSON.parse(readFileSync(REF, "utf8"));
const [JIN, OFF] = JI.split("@");
const [DX, DY] = OFF ? OFF.split(",").map(Number) : [0, 0];
const r0 = ref.recs.find((x) => x.ji === Number(JIN));
if (!r0) throw new Error(`${REF}: no ji ${JI}`);
const centres = new Map();
const centreOf = (dir) => {
  if (centres.has(dir)) return centres.get(dir);
  const m = JSON.parse(readFileSync(join(dir, "meta.json"), "utf8"));
  let best = null, bd = Infinity;
  for (const r of m.recs) {
    const d = Math.hypot(r.c[0] - r0.c[0], r.c[1] - r0.c[1]);
    if (d < bd) { bd = d; best = r; }
  }
  const dsf = m.dsf || 1.5;
  const c = { cx: best.sx * dsf + DX, cy: best.sy * dsf + DY, ji: best.ji, d: bd };
  centres.set(dir, c);
  return c;
};
const rows = rowSpecs.map((spec) => {
  const [dir, list] = spec.split("|");
  return list.split(",").map((f) => {
    if (f === "-") return null;
    const d = f.includes("/") ? dirname(f) : dir;
    const file = f.includes("/") ? basename(f) : f;
    return { dir: d, file, ...centreOf(d) };
  });
});
const cols = Math.max(...rows.map((r) => r.length));
const CW = S * Z;
const SW = cols * CW + (cols + 1) * G, SH = rows.length * CW + (rows.length + 1) * G;
const data = Buffer.alloc(SW * SH * 3, 40);
rows.forEach((row, ri) => {
  row.forEach((cell, ci) => {
    if (!cell) return;
    const im = toRGB(decodePNG(readFileSync(join(cell.dir, cell.file))));
    const x0 = Math.round(cell.cx - S / 2), y0 = Math.round(cell.cy - S / 2);
    const ox = G + ci * (CW + G), oy = G + ri * (CW + G);
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
});
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, encodePNG({ W: SW, H: SH, data }));
console.log(`${OUT}: ${SW}x${SH} | ` + [...centres].map(([d, c]) => `${d.split(/[\\/]/).slice(-2).join("/")} ji ${c.ji} (d ${c.d.toFixed(3)})`).join(" | "));
