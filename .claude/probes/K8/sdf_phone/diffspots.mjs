// K8 sdf phone: where two same-state shots differ. Prints the delta histogram
// (max channel delta) and the N largest-delta pixels, each with its 3x3
// neighbourhood's count of differing pixels, so a crop can be aimed at one.
//   node diffspots.mjs <a.png> <b.png> [n=12]
import { readFileSync } from "node:fs";
import { decodePNG, toRGB } from "../../../../scripts/phone_pass/png.mjs";

const [, , fa, fb, ns] = process.argv;
const n = Number(ns) || 12;
const A = toRGB(decodePNG(readFileSync(fa)));
const B = toRGB(decodePNG(readFileSync(fb)));
if (A.W !== B.W || A.H !== B.H) throw new Error("size mismatch");
const W = A.W, H = A.H;
const d = new Uint8Array(W * H);
const hist = { "1-4": 0, "5-12": 0, "13-24": 0, "25-48": 0, ">48": 0 };
for (let i = 0; i < W * H; i++) {
  const k = i * 3;
  const m = Math.max(Math.abs(A.data[k] - B.data[k]), Math.abs(A.data[k + 1] - B.data[k + 1]), Math.abs(A.data[k + 2] - B.data[k + 2]));
  d[i] = m;
  if (!m) continue;
  hist[m <= 4 ? "1-4" : m <= 12 ? "5-12" : m <= 24 ? "13-24" : m <= 48 ? "25-48" : ">48"]++;
}
const top = [];
for (let i = 0; i < W * H; i++) if (d[i] > 24) top.push(i);
top.sort((p, q) => d[q] - d[p]);
const spots = top.slice(0, n).map((i) => {
  const x = i % W, y = (i / W) | 0;
  let nb = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const j = (y + dy) * W + x + dx; if (j >= 0 && j < W * H && d[j]) nb++; }
  const k = i * 3;
  return { x, y, delta: d[i], a: [A.data[k], A.data[k + 1], A.data[k + 2]], b: [B.data[k], B.data[k + 1], B.data[k + 2]], nb };
});
console.log(JSON.stringify({ hist, visible: top.length, spots }));
