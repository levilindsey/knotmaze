// K1407 c3: today's look (a K868 scene screenshot + its diag.json camera) resampled to k1407_crops' frame
// (480 px, 2.5h world wide, centred on the spot), written as <out>.png and <out>.bin (RGB, 480x480).
//   node scripts/run_node.mjs .claude/probes/K1407/k1407c3_today.ts <png> <diag.json> <x> <y> <h> <out>
import { readFileSync, writeFileSync } from "node:fs";
import { writePng, readPng } from "../K1314/k1314_crops.ts";
const [png, diag, xs, ys, hs, out] = process.argv.slice(2);
const rp = readPng(png); const img = { width: rp.W, height: rp.H, data: rp.px }; const NC = rp.px.length / (rp.W * rp.H); const cam = JSON.parse(readFileSync(diag, "utf8")).camera.worldToCss;
const X = +xs, Y = +ys, P = 480, ppu = P / (2.5 * +hs); const c0 = Math.round(X * ppu - P / 2), r0 = Math.round(Y * ppu - P / 2);
const o = new Uint8Array(P * P * 3);
for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) {
  const wx = (c0 + c + 0.5) / ppu, wy = (r0 + r + 0.5) / ppu;
  const ix = cam[0] * wx + cam[2] * wy + cam[4] - 0.5, iy = cam[1] * wx + cam[3] * wy + cam[5] - 0.5;
  const x0 = Math.floor(ix), y0 = Math.floor(iy), fx = ix - x0, fy = iy - y0;
  for (let ch = 0; ch < 3; ch++) {
    const g = (xx: number, yy: number): number => { const a = Math.min(img.width - 1, Math.max(0, xx)), b = Math.min(img.height - 1, Math.max(0, yy)); return img.data[(b * img.width + a) * NC + ch]; };
    const v = (1 - fy) * ((1 - fx) * g(x0, y0) + fx * g(x0 + 1, y0)) + fy * ((1 - fx) * g(x0, y0 + 1) + fx * g(x0 + 1, y0 + 1));
    o[(r * P + c) * 3 + ch] = Math.round(v);
  }
}
writePng(`${out}.png`, o, P, P); writeFileSync(`${out}.bin`, o);
console.log(`${out} at ${(cam[0]).toFixed(1)} px/unit`);

