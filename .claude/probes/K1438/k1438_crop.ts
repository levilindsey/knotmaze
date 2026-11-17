// K1438: crops of 480 px panels (.bin), side by side, scaled up (nearest), plus an amplified |a-b| of the first two.
//   node scripts/run_node.mjs .claude/probes/K1438/k1438_crop.ts <panelDir> <out.png> <sfx,sfx,...> <scene:x:y> <x0> <y0> <w> <h> [scale=2] [amp=8]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { writePng } from "../K1314/k1314_crops.ts";
const [dir, out, sfxS, spec, x0s, y0s, ws, hs, scS, ampS] = process.argv.slice(2);
const sfx = sfxS.split(","); const [nm, xs, ys] = spec.split(":"); const base = `${nm}_${(+xs).toFixed(2)}_${(+ys).toFixed(2)}`;
const x0 = +x0s, y0 = +y0s, w = +ws, h = +hs, sc = scS ? +scS : 2, amp = ampS ? +ampS : 8, P = 480, Gt = 4;
const bins = sfx.map((s) => readFileSync(join(dir, `${base}_${s}.bin`)));
const cols = bins.length + 1; const W = cols * (w * sc + Gt) + Gt; const H = h * sc + 2 * Gt;
const img = new Uint8Array(W * H * 3).fill(128);
for (let c = 0; c < cols; c++) for (let y = 0; y < h * sc; y++) for (let x = 0; x < w * sc; x++) {
  const sx = x0 + Math.floor(x / sc), sy = y0 + Math.floor(y / sc); const si = 3 * (sy * P + sx);
  const di = 3 * ((Gt + y) * W + Gt + c * (w * sc + Gt) + x);
  for (let k = 0; k < 3; k++) img[di + k] = c < bins.length ? bins[c][si + k] : Math.min(255, amp * Math.abs(bins[0][si + k] - bins[1][si + k]));
}
writePng(out, img, W, H);
console.log(`${out} ${W}x${H}`);

