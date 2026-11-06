// K1218 S7: where a build is ROUGHER than master, by junction (the brief's
// item 3). Per pixel, the luma's second difference d2 = max(|Lx+1 - 2Lx +
// Lx-1|, |Ly+1 - 2Ly + Ly-1|) in both shots; the excess is the build's d2
// less master's LARGEST d2 within 1 px (an edge both builds draw, moved by a
// pixel, does not count). Pixels with excess >= T go to the nearest junction
// record of the build's meta.json (sx, sy times dsf) within radiusPx, else to
// "far"; per group: the pixels, the excess's sum and max and where, the box.
// A group is FLAGGED when it holds >= NMIN such pixels or one of >= EMAX.
//   node rough_s7.mjs <masterDir> <buildDir> <png> [radiusPx=70] [T=2] [NMIN=6] [EMAX=6]
// Prints one line per group, flagged first ("*"), then by pixels.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decodePNG, toRGB } from "../s4/png.mjs";

const [, , A, B, PNG, RAD = "70", TS = "2", NS = "6", ES = "6"] = process.argv;
const R = Number(RAD), T = Number(TS), NMIN = Number(NS), EMAX = Number(ES);
const ia = toRGB(decodePNG(readFileSync(join(A, PNG))));
const ib = toRGB(decodePNG(readFileSync(join(B, PNG))));
const W = ia.W, H = ia.H;
const luma = (im) => {
  const L = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) L[i] = 0.2126 * im.data[i * 3] + 0.7152 * im.data[i * 3 + 1] + 0.0722 * im.data[i * 3 + 2];
  return L;
};
const d2of = (L) => {
  const D = new Float32Array(W * H);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    D[i] = Math.max(Math.abs(L[i + 1] - 2 * L[i] + L[i - 1]), Math.abs(L[i + W] - 2 * L[i] + L[i - W]));
  }
  return D;
};
const Da = d2of(luma(ia)), Db = d2of(luma(ib));
const m = JSON.parse(readFileSync(join(B, "meta.json"), "utf8"));
const dsf = m.dsf || 1.5;
const mk = (ji, x, y) => ({ ji, x, y, n: 0, sum: 0, max: 0, mx: 0, my: 0, x0: 1e9, y0: 1e9, x1: -1, y1: -1 });
const recs = m.recs.map((r) => mk(r.ji, r.sx * dsf, r.sy * dsf));
const far = mk("far", 0, 0);
for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
  const i = y * W + x;
  let ma = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) ma = Math.max(ma, Da[i + dy * W + dx]);
  const e = Db[i] - ma;
  if (e < T) continue;
  let best = far, bd = R * R;
  for (const r of recs) { const dd = (r.x - x) ** 2 + (r.y - y) ** 2; if (dd < bd) { bd = dd; best = r; } }
  best.n++; best.sum += e;
  if (e > best.max) { best.max = e; best.mx = x; best.my = y; }
  if (x < best.x0) best.x0 = x; if (y < best.y0) best.y0 = y;
  if (x > best.x1) best.x1 = x; if (y > best.y1) best.y1 = y;
}
const list = [...recs.filter((r) => r.n), ...(far.n ? [far] : [])];
for (const r of list) r.flag = r.n >= NMIN || r.max >= EMAX;
list.sort((a, b) => (b.flag - a.flag) || (b.n - a.n));
const nf = list.filter((r) => r.flag).length;
console.log(`${B.split(/[\\/]/).slice(-2).join("/")} ${PNG}: ${list.reduce((s, r) => s + r.n, 0)} px rougher (excess >= ${T}) in ${list.length} groups, ${nf} flagged (n >= ${NMIN} or max >= ${EMAX})`);
for (const r of list) {
  console.log(`${r.flag ? "*" : " "} ji ${r.ji}: ${r.n} px, sum ${r.sum.toFixed(0)}, max ${r.max.toFixed(1)} @${r.mx},${r.my}, box ${r.x0},${r.y0}-${r.x1},${r.y1}`);
}
