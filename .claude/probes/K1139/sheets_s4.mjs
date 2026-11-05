// K1139 Stage 4 (4.3): the 2x crops for tasks 3-6, three rows in Stage 3's
// layout (sheets_s3.mjs): before S3b (the main checkout's out/s3b/today,
// build 7474d09b, read only), S3b (out/s3b/s3b; master c4a9dd60 carries
// S3b since df30a7f3) and the fix (this branch's out/s3/after). Crops are
// placed in PAGE CSS px and mapped through each strip's own clip.
//   node sheets_s4.mjs [locate|sheets=sheets]
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";

const MODE = process.argv[2] ?? "sheets";
const MAIN = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1139/out/s3b";
const OUT = MODE === "locate" ? "out/s4/look" : "out/s4/sheets";
mkdirSync(OUT, { recursive: true });
const DSF = 1.5, G = 6;
const load = (f) => toRGB(decodePNG(readFileSync(f)));
const ROWS = (stand) => [
  { name: "before S3b", dir: `${MAIN}/today/${stand}` },
  { name: "S3b", dir: `${MAIN}/s3b/${stand}` },
  { name: "fix", dir: `out/s3/after/${stand}` },
];
const P = (stand) => (stand === "x4" ? "pre4" : stand);
const clipOf = (dir, p) => JSON.parse(readFileSync(join(dir, `${p}.json`), "utf8")).clip;
export function crop(img, clip, cx, cy, w, h, S) {
  const x0 = Math.round((cx - clip.x - w / 2) * DSF), y0 = Math.round((cy - clip.y - h / 2) * DSF);
  const W = Math.round(w * DSF), H = Math.round(h * DSF);
  const out = { W: W * S, H: H * S, data: Buffer.alloc(W * S * H * S * 3, 0) };
  for (let y = 0; y < H * S; y++)
    for (let x = 0; x < W * S; x++) {
      const sx = x0 + Math.floor(x / S), sy = y0 + Math.floor(y / S);
      if (sx < 0 || sy < 0 || sx >= img.W || sy >= img.H) continue;
      img.data.copy(out.data, (y * out.W + x) * 3, (sy * img.W + sx) * 3, (sy * img.W + sx) * 3 + 3);
    }
  return out;
}
function sheet(file, cols, imgs) {
  const W = imgs.find(Boolean).W, H = imgs.find(Boolean).H;
  const rows = Math.ceil(imgs.length / cols);
  const SW = cols * W + (cols + 1) * G, SH = rows * H + (rows + 1) * G;
  const data = Buffer.alloc(SW * SH * 3, 40);
  imgs.forEach((im, i) => {
    if (!im) return;
    const ox = G + (i % cols) * (W + G), oy = G + Math.floor(i / cols) * (H + G);
    for (let y = 0; y < Math.min(H, im.H); y++) im.data.copy(data, ((oy + y) * SW + ox) * 3, y * im.W * 3, y * im.W * 3 + Math.min(W, im.W) * 3);
  });
  writeFileSync(join(OUT, file), encodePNG({ W: SW, H: SH, data }));
  console.log(`${join(OUT, file)}: ${SW}x${SH}, ${rows}x${cols}`);
}
const metaOf = (dir) => JSON.parse(readFileSync(join(dir, "meta.json"), "utf8"));
// page CSS of a box pixel (X, Y) of record ji in a Stage 4 dump
const boxPt = (stand, ji, X, Y) => {
  const rc = metaOf(`out/s4/d/${stand}`).recs.find((r) => r.ji === ji);
  return [(rc.box.x + X + 0.5) / DSF, (rc.box.y + Y + 0.5) / DSF];
};
// three rows x the given phases, view v (n = normal look, d = debug view 5)
function rowsSheet(file, stand, [cx, cy], w, S, phases, v = "n") {
  const imgs = [];
  for (const r of ROWS(stand)) {
    const clip = clipOf(r.dir, P(stand));
    for (const k of phases) {
      const f = join(r.dir, `${P(stand)}_t${k}_${v}.png`);
      if (!existsSync(f)) console.log(`missing ${f}`);
      imgs.push(existsSync(f) ? crop(load(f), clip, cx, cy, w, w, S) : null);
    }
  }
  sheet(file, phases.length, imgs);
}

if (MODE === "locate") {
  const c = boxPt("cross", 33, 120, 118);
  rowsSheet("loc_cross33_n.png", "cross", c, 40, 4, [3, 4, 5, 6], "n");
  rowsSheet("loc_cross33_d.png", "cross", c, 40, 4, [3, 4, 5, 6], "d");
}
if (MODE === "sheets") {
  const args = JSON.parse(process.env.K1139_SHEETS ?? "[]");
  for (const [file, stand, ji, X, Y, w, phases, v] of args) rowsSheet(file, stand, boxPt(stand, ji, X, Y), w, 2, phases, v);
}
