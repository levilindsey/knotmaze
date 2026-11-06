// K1211 S6: whole-frame pixel diffs between two shot folders.
//   node diff6.mjs <dirA> <dirB> <a.png=b.png> ...
// Prints, per pair, the pixels that differ (any channel), the largest channel
// delta and the bounding box of the differing pixels.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decodePNG, toRGB } from "./png.mjs";

const [, , A, B, ...pairs] = process.argv;
for (const p of pairs) {
  const [fa, fb] = p.includes("=") ? p.split("=") : [p, p];
  const ia = toRGB(decodePNG(readFileSync(join(A, fa))));
  const ib = toRGB(decodePNG(readFileSync(join(B, fb))));
  if (ia.W !== ib.W || ia.H !== ib.H) {
    console.log(`${fa} vs ${fb}: size ${ia.W}x${ia.H} vs ${ib.W}x${ib.H}`);
    continue;
  }
  let n = 0, max = 0, x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < ia.H; y++) {
    for (let x = 0; x < ia.W; x++) {
      const o = (y * ia.W + x) * 3;
      const d = Math.max(
        Math.abs(ia.data[o] - ib.data[o]),
        Math.abs(ia.data[o + 1] - ib.data[o + 1]),
        Math.abs(ia.data[o + 2] - ib.data[o + 2]),
      );
      if (d > 0) {
        n++;
        if (d > max) max = d;
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  }
  console.log(`${fa} vs ${fb}: ${n} px differ, max ${max}` + (n ? `, box ${x0},${y0}-${x1},${y1}` : ""));
}
