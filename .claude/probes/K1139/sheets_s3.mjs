// K1139 Stage 3 S3.3: section 6's sheets and the 2x crops, into
// out/s3/sheets/. Rows: before S3b and S3b are Run B's strips (the main
// checkout's out/s3b/today and out/s3b/s3b, read only), the fix is this
// branch's out/s3/after strips. Every crop is placed in PAGE CSS px and
// mapped through each strip's own clip (Run B's clips sit 1 CSS px off the
// fix's), so the rows line up. The crops from the dumps (ramps, ghost,
// crotch) read out/s3/d (edge 1.56), out/s3/e25 and out/s3/e30.
//
//   node sheets_s3.mjs [full|seams|crops|all=all]
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";

const MODE = process.argv[2] ?? "all";
const MAIN = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1139/out/s3b";
const OUT = "out/s3/sheets";
mkdirSync(OUT, { recursive: true });
const DSF = 1.5, G = 6;
const load = (f) => toRGB(decodePNG(readFileSync(f)));
const ROWS = (stand, p) => [
  { name: "before S3b", dir: `${MAIN}/today/${stand}`, p },
  { name: "S3b", dir: `${MAIN}/s3b/${stand}`, p },
  { name: "fix", dir: `out/s3/after/${stand}`, p },
];
const clipOf = (dir, p) => JSON.parse(readFileSync(join(dir, `${p}.json`), "utf8")).clip;
// crop a CSS-px window centred on page CSS (cx, cy) from an image whose
// clip origin is (clip.x, clip.y) CSS; scale by integer S (nearest)
function crop(img, clip, cx, cy, w, h, S) {
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
  const W = imgs[0].W, H = imgs[0].H;
  const rows = Math.ceil(imgs.length / cols);
  const SW = cols * W + (cols + 1) * G, SH = rows * H + (rows + 1) * G;
  const data = Buffer.alloc(SW * SH * 3, 40);
  imgs.forEach((im, i) => {
    if (!im) return;
    const ox = G + (i % cols) * (W + G), oy = G + Math.floor(i / cols) * (H + G);
    for (let y = 0; y < Math.min(H, im.H); y++) im.data.copy(data, ((oy + y) * SW + ox) * 3, y * im.W * 3, y * im.W * 3 + Math.min(W, im.W) * 3);
  });
  writeFileSync(join(OUT, file), encodePNG({ W: SW, H: SH, data }));
  console.log(`${file}: ${SW}x${SH}, ${rows}x${cols}`);
}
// page CSS centre of a dump record's box (device px, box centred on the junction)
const boxC = (b) => [(b.x + b.w / 2) / DSF, (b.y + b.h / 2) / DSF];
const metaOf = (dir) => JSON.parse(readFileSync(join(dir, "meta.json"), "utf8"));

if (MODE === "all" || MODE === "full") {
  for (const [stand, p] of [["cross", "cross"], ["src", "src"], ["x4", "pre4"]]) {
    const imgs = [];
    for (const r of ROWS(stand, p)) for (let k = 0; k < 8; k++) {
      const f = join(r.dir, `${p}_t${k}_n.png`);
      imgs.push(existsSync(f) ? load(f) : null);
      if (!existsSync(f)) console.log(`missing ${f}`);
    }
    sheet(`s3b_fix_${stand}.png`, 8, imgs);
  }
}

if (MODE === "all" || MODE === "seams") {
  // each fan at 4x, centred on its junction, phases t0 t2 t4 t6
  const PH = [0, 2, 4, 6];
  for (const [stand, p, jis] of [["cross", "cross", [33]], ["x4", "pre4", [28, 147, 149]]]) {
    const meta = metaOf(`out/s3/d/${stand}`);
    const imgs = [];
    for (const ji of jis) {
      const [cx, cy] = boxC(meta.recs.find((r) => r.ji === ji).box);
      for (const r of ROWS(stand, p)) {
        const clip = clipOf(r.dir, p);
        for (const k of PH) {
          const f = join(r.dir, `${p}_t${k}_n.png`);
          imgs.push(existsSync(f) ? crop(load(f), clip, cx, cy, 48, 48, 4) : null);
        }
      }
    }
    sheet(`s3b_fix_seams_${stand}.png`, PH.length, imgs);
  }
  // a fork's shared arrival front: cross ji 33 (bands 1>0 and 1>2 share
  // arrival arm 1), S3b and fix, all eight phases, 2x
  const meta = metaOf("out/s3/d/cross");
  const [cx, cy] = boxC(meta.recs.find((r) => r.ji === 33).box);
  const imgs = [];
  for (const r of ROWS("cross", "cross").slice(1)) {
    const clip = clipOf(r.dir, "cross");
    for (let k = 0; k < 8; k++) {
      const f = join(r.dir, `cross_t${k}_n.png`);
      imgs.push(existsSync(f) ? crop(load(f), clip, cx, cy, 64, 64, 2) : null);
    }
  }
  sheet("crop2x_fork_front_cross_ji33.png", 8, imgs);
}

if (MODE === "all" || MODE === "crops") {
  // the worst compression ramp per record (S3.1's diag_an), the fix's
  // n and d (debug view 5) frames side by side, 2x
  const dump = (stand) => ({ dir: `out/s3/d/${stand}`, meta: metaOf(`out/s3/d/${stand}`) });
  const at = (D, ji, X, Y) => {
    const rc = D.meta.recs.find((r) => r.ji === ji);
    return [(rc.box.x + X + 0.5) / DSF, (rc.box.y + Y + 0.5) / DSF];
  };
  const clipD = (D) => D.meta.clip;
  for (const [stand, ji, k, X, Y, c] of [["cross", 33, 0, 138, 110, 1.286], ["x4", 28, 3, 180, 117, 1.286], ["x4", 147, 0, 78, 179, 1.905], ["x4", 149, 2, 89, 84, 1.536]]) {
    const D = dump(stand);
    const [cx, cy] = at(D, ji, X, Y);
    const n = crop(load(join(D.dir, `t${k}_n.png`)), clipD(D), cx, cy, 48, 48, 2);
    const d = crop(load(join(D.dir, `t${k}_d.png`)), clipD(D), cx, cy, 48, 48, 2);
    sheet(`crop2x_ramp_${stand}_ji${ji}_t${k}_c${c}.png`, 2, [n, d]);
  }
  // the cross t5 ghost at box (122, 121) and band 1's cover-strip edge at
  // (123, 121) / (122, 122): n and d at 2x, then d at 8x
  {
    const D = dump("cross");
    const [cx, cy] = at(D, 33, 122, 121);
    sheet("crop2x_ghost_cross_t5.png", 2, [crop(load(join(D.dir, "t5_n.png")), clipD(D), cx, cy, 48, 48, 2), crop(load(join(D.dir, "t5_d.png")), clipD(D), cx, cy, 48, 48, 2)]);
    sheet("crop8x_ghost_cross_t5.png", 2, [crop(load(join(D.dir, "t5_n.png")), clipD(D), cx, cy, 12, 12, 8), crop(load(join(D.dir, "t5_d.png")), clipD(D), cx, cy, 12, 12, 8)]);
  }
  // ji 28's crotch: the kept far edge 1.56 (out/s3/d) against the tried
  // 2.5 (e25) and 3.0 (e30), phases t2 t4 t6, 2x
  {
    const imgs = [];
    for (const k of [2, 4, 6])
      for (const dir of ["out/s3/d/x4", "out/s3/e25/x4", "out/s3/e30/x4"]) {
        const meta = metaOf(dir);
        const [cx, cy] = boxC(meta.recs.find((r) => r.ji === 28).box);
        imgs.push(crop(load(join(dir, `t${k}_n.png`)), meta.clip, cx, cy, 64, 64, 2));
      }
    sheet("crop2x_crotch_x4_ji28_e156_e25_e30.png", 3, imgs);
  }
}
