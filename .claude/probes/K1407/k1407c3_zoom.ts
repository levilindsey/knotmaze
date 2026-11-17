// K1407 c3: magnify a region of k1407_crops' 480 px panels, side by side (nearest neighbour), to look at a seam.
//   node scripts/run_node.mjs .claude/probes/K1407/k1407c3_zoom.ts <outPng> <c0> <r0> <size> <mag> <bin1,bin2,...>
import { readFileSync } from "node:fs";
import { writePng } from "../K1314/k1314_crops.ts";

const [outPng, c0s, r0s, ns, ms, list] = process.argv.slice(2);
const c0 = +c0s, r0 = +r0s, n = +ns, mag = +ms, P = 480, GAP = 4;
const bins = list.split(",").map((f) => readFileSync(f));
const w = bins.length * n * mag + (bins.length - 1) * GAP, hgt = n * mag;
const out = new Uint8Array(w * hgt * 3).fill(255);
bins.forEach((b, bi) => {
  for (let y = 0; y < hgt; y++) for (let x = 0; x < n * mag; x++) {
    const sc = c0 + Math.floor(x / mag), sr = r0 + Math.floor(y / mag);
    if (sc < 0 || sr < 0 || sc >= P || sr >= P) continue;
    const si = (sr * P + sc) * 3, di = (y * w + bi * (n * mag + GAP) + x) * 3;
    out[di] = b[si]; out[di + 1] = b[si + 1]; out[di + 2] = b[si + 2];
  }
});
writePng(outPng, out, w, hgt);
console.log(`${outPng} ${w}x${hgt}`);
