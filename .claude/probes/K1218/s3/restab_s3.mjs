// K1218 S3: an at-rest A/B sheet of every junction near_s2.mjs lists.
//   node restab_s3.mjs <dirA> <dirB> <png> <out.png> [size=80] [zoom=2] [from=0] [count=24] [perRow=3]
// Groups differing pixels by the nearest junction record of dirB's meta.json
// within 70 px (near_s2's rule); "far" pixels are grouped by 96-px tiles. Per
// group, three cells centred on its diff box: A, B, and B dimmed with the
// differing pixels marked (red = B lighter, blue = B darker, by delta). Prints
// the cell order (group, px, max, box) so a cell can be named.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";

const [, , A, B, PNG, OUT, SIZE = "80", ZOOM = "2", FROM = "0", COUNT = "24", PER = "3"] = process.argv;
const S = Number(SIZE), Z = Number(ZOOM), PR = Number(PER), G = 6, R = 70, T = 96;
const ia = toRGB(decodePNG(readFileSync(join(A, PNG))));
const ib = toRGB(decodePNG(readFileSync(join(B, PNG))));
const m = JSON.parse(readFileSync(join(B, "meta.json"), "utf8"));
const dsf = m.dsf || 1.5;
const recs = m.recs.map((r) => ({ ji: r.ji, x: r.sx * dsf, y: r.sy * dsf, n: 0, max: 0, x0: 1e9, y0: 1e9, x1: -1, y1: -1 }));
const tiles = new Map();
const W = ia.W, H = ia.H;
const delta = new Int16Array(W * H);
const lum = (im, o) => 0.299 * im.data[o] + 0.587 * im.data[o + 1] + 0.114 * im.data[o + 2];
const grow = (g, x, y, d) => {
  g.n++; if (d > g.max) g.max = d;
  if (x < g.x0) g.x0 = x; if (y < g.y0) g.y0 = y; if (x > g.x1) g.x1 = x; if (y > g.y1) g.y1 = y;
};
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const o = (y * W + x) * 3;
  const d = Math.max(Math.abs(ia.data[o] - ib.data[o]), Math.abs(ia.data[o + 1] - ib.data[o + 1]), Math.abs(ia.data[o + 2] - ib.data[o + 2]));
  if (d === 0) continue;
  delta[y * W + x] = Math.round(lum(ib, o) - lum(ia, o)) || (lum(ib, o) >= lum(ia, o) ? 1 : -1);
  let best = null, bd = R * R;
  for (const r of recs) { const dd = (r.x - x) ** 2 + (r.y - y) ** 2; if (dd < bd) { bd = dd; best = r; } }
  if (!best) {
    const k = `${Math.floor(x / T)},${Math.floor(y / T)}`;
    if (!tiles.has(k)) tiles.set(k, { ji: `far@${k}`, n: 0, max: 0, x0: 1e9, y0: 1e9, x1: -1, y1: -1 });
    best = tiles.get(k);
  }
  grow(best, x, y, d);
}
const list0 = [...recs.filter((r) => r.n), ...tiles.values()].sort((a, b) => b.n - a.n);
console.log(`${list0.length} groups, ${list0.reduce((s, g) => s + g.n, 0)} px`);
const list = list0.slice(Number(FROM), Number(FROM) + Number(COUNT));
const CW = S * Z, cols = PR * 3;
const rowsN = Math.ceil(list.length / PR);
const SW = cols * CW + (cols + 1) * G + (PR - 1) * G * 2, SH = rowsN * CW + (rowsN + 1) * G;
const data = Buffer.alloc(SW * SH * 3, 40);
list.forEach((g, i) => {
  const cx = Math.round((g.x0 + g.x1) / 2), cy = Math.round((g.y0 + g.y1) / 2);
  const x0 = cx - S / 2, y0 = cy - S / 2;
  const ri = Math.floor(i / PR), gi = i % PR;
  for (let c = 0; c < 3; c++) {
    const ox = G + (gi * 3 + c) * (CW + G) + gi * G * 2, oy = G + ri * (CW + G);
    for (let y = 0; y < CW; y++) {
      const sy = y0 + Math.floor(y / Z);
      for (let x = 0; x < CW; x++) {
        const sx = x0 + Math.floor(x / Z);
        const o = ((oy + y) * SW + ox + x) * 3;
        if (sx < 0 || sy < 0 || sx >= W || sy >= H) { data[o] = 255; data[o + 2] = 255; continue; }
        const s = (sy * W + sx) * 3;
        const im = c === 0 ? ia : ib;
        if (c < 2) { data[o] = im.data[s]; data[o + 1] = im.data[s + 1]; data[o + 2] = im.data[s + 2]; continue; }
        const dl = delta[sy * W + sx];
        const base = lum(ib, s) * 0.35;
        if (dl === 0) { data[o] = data[o + 1] = data[o + 2] = base; continue; }
        const k = Math.min(255, 90 + Math.abs(dl) * 2);
        if (dl > 0) { data[o] = k; data[o + 1] = base * 0.5; data[o + 2] = base * 0.5; }
        else { data[o] = base * 0.5; data[o + 1] = base * 0.7; data[o + 2] = k; }
      }
    }
  }
  console.log(`cell ${i} (row ${ri}, slot ${gi}): ji ${g.ji} ${g.n} px max ${g.max} box ${g.x0},${g.y0}-${g.x1},${g.y1}`);
});
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, encodePNG({ W: SW, H: SH, data }));
console.log(`${OUT}: ${SW}x${SH}`);
