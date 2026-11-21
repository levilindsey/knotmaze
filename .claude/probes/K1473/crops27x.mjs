// K1473 (27X) Done 6: 4x crops, today | gf, centred on each feature's mask.
//   node .claude/probes/K1473/crops27x.mjs <capDir> <tagToday> <tagGf> <outDir> <prefix>
// capDir holds <tag>_today|gf_t<clock>_on|nopulse|notele.png (k1414c/k1414h
// output). For each clock and feature the crop centre is today's mask
// centroid (gf's if today's is empty); each tile is half 45 px at 4x, the
// pair side by side. Prints the centres and mask counts it used.
import { decodePng } from "../K1387/k1387_pngdiff.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import zlib from "node:zlib";

const [capDir, tagT, tagG, outDir, prefix] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const CRC = [];
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; }
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(w, h, px) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) { raw[y * (1 + w * 4)] = 0; Buffer.from(px.buffer, y * w * 4, w * 4).copy(raw, y * (1 + w * 4) + 1); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 6 })), chunk("IEND", Buffer.alloc(0))]);
}
const load = (tag, mode, name) => decodePng(join(capDir, `${tag}_${mode}_${name}.png`));
const maskOf = (on, off) => {
  const m = new Uint8Array(on.w * on.h);
  let n = 0, sx = 0, sy = 0;
  for (let i = 0; i < on.w * on.h; i++) {
    let d = 0;
    for (let k = 0; k < 3; k++) d = Math.max(d, Math.abs(on.px[4 * i + k] - off.px[4 * i + k]));
    if (d > 8) { m[i] = 1; n++; sx += i % on.w; sy += Math.floor(i / on.w); }
  }
  return { m, n, cx: n ? sx / n : -1, cy: n ? sy / n : -1 };
};
const HALF = 45, S = 4, GAP = 8;
for (const t of ["100", "100_45", "101_3"]) {
  for (const [feat, off] of [["pulse", "nopulse"], ["tele", "notele"]]) {
    const MT = maskOf(load(tagT, "today", `t${t}_on`), load(tagT, "today", `t${t}_${off}`));
    const MG = maskOf(load(tagG, "gf", `t${t}_on`), load(tagG, "gf", `t${t}_${off}`));
    const cx = Math.round(MT.n ? MT.cx : MG.cx), cy = Math.round(MT.n ? MT.cy : MG.cy);
    const A = load(tagT, "today", `t${t}_on`), B = load(tagG, "gf", `t${t}_on`);
    const tw = 2 * HALF * S, th = 2 * HALF * S, W = tw * 2 + GAP, H = th;
    const px = new Uint8Array(W * H * 4);
    const blit = (img, x0) => {
      for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
        const sx = cx - HALF + Math.floor(x / S), sy = cy - HALF + Math.floor(y / S);
        const o = 4 * (y * W + x0 + x);
        if (sx < 0 || sy < 0 || sx >= img.w || sy >= img.h) { px[o + 3] = 255; continue; }
        const i = 4 * (sy * img.w + sx);
        px[o] = img.px[i]; px[o + 1] = img.px[i + 1]; px[o + 2] = img.px[i + 2]; px[o + 3] = 255;
      }
    };
    blit(A, 0); blit(B, tw + GAP);
    const out = join(outDir, `${prefix}_crop_${feat}_t${t}.png`);
    writeFileSync(out, encodePng(W, H, px));
    console.log(`${prefix} ${feat} t${t}: today ${MT.n} gf ${MG.n} centre ${cx},${cy} -> ${out}`);
  }
}
