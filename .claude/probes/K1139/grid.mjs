// K1139 S3b fix: print a diag_s3b.mjs dump's per-pixel values over a box of the record.
//   node grid.mjs <dumpDir> <ji> <phase> <x0> <x1> <y0> <y1> <step>
import { readFileSync } from "fs";
const [dir, ji, k, x0, x1, y0, y1, st] = process.argv.slice(2);
const meta = JSON.parse(readFileSync(dir + "/meta.json", "utf8"));
const rc = meta.recs.find((r) => r.ji == ji);
const BW = rc.box.w, PX = 46;
const u8 = new Uint8Array(readFileSync(`${dir}/r${ji}_t${k}.u8`));
const f32 = new Float32Array(new Uint8Array(readFileSync(`${dir}/r${ji}_t${k}.f32`)).buffer);
const S = Number(st);
let hdr = "  Y\\X ";
for (let X = +x0; X <= +x1; X += S) hdr += String(X).padStart(16);
console.log(hdr);
for (let Y = +y0; Y <= +y1; Y += S) {
  let l = String(Y).padStart(5) + " ";
  for (let X = +x0; X <= +x1; X += S) {
    const i = Y * BW + X, o = i * PX, w = u8[o + 45] - 1;
    if (w < 0) { l += "            ----"; continue; }
    const t0 = f32[(i * 4) * 2 + 1], t1 = f32[(i * 4 + 1) * 2 + 1];
    // winner, its v, f; tau of band 0 and 1; out luma
    const luma = Math.round((u8[o + 42] + u8[o + 43] + u8[o + 44]) / 3);
    l += `${w}:${String(u8[o + w * 9]).padStart(3)}/${String(u8[o + w * 9 + 2]).padStart(3)} ${t0.toFixed(2).padStart(5)}`.padStart(16);
  }
  console.log(l);
}