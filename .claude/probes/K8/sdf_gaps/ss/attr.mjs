// attr.mjs (K8 sdf gaps): where a same-state pair's differing pixels sit.
//   node attr.mjs <a.png> <b.png> [thr=24]
// Delta histogram; each differing pixel classed by A's local contrast
// (flat = A's 5x5 max-min channel spread under 12: a ribbon body or the
// backdrop; edge otherwise); the largest visible clusters (delta > thr,
// 8-connected) by size and by bbox, with their max width across (the
// largest run of the cluster in one row or column, taking the smaller).
import { readFileSync } from "node:fs";
import { decodePNG } from "./png.mjs";

const [, , pa, pb, thrArg] = process.argv;
const thr = Number(thrArg ?? 24);
const A = decodePNG(readFileSync(pa)), B = decodePNG(readFileSync(pb));
const W = A.W, H = A.H;
const lum = (img, i) => { const p = i * img.ch; return [img.data[p], img.data[p + 1], img.data[p + 2]]; };
const hist = new Map();
let flat = 0, edge = 0, flatVis = 0, edgeVis = 0;
const vis = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x;
  const a = lum(A, i), b = lum(B, i);
  const d = Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
  if (!d) continue;
  const bucket = d <= 2 ? "1-2" : d <= 8 ? "3-8" : d <= 24 ? "9-24" : d <= 48 ? "25-48" : ">48";
  hist.set(bucket, (hist.get(bucket) ?? 0) + 1);
  let lo = [255, 255, 255], hi = [0, 0, 0];
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const xx = Math.min(W - 1, Math.max(0, x + dx)), yy = Math.min(H - 1, Math.max(0, y + dy));
    const c = lum(A, yy * W + xx);
    for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], c[k]); hi[k] = Math.max(hi[k], c[k]); }
  }
  const spread = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]);
  if (spread < 12) { flat++; if (d > thr) flatVis++; } else { edge++; if (d > thr) edgeVis++; }
  if (d > thr) vis[i] = 1;
}
const seen = new Uint8Array(W * H);
const cl = [];
for (let s = 0; s < W * H; s++) {
  if (!vis[s] || seen[s]) continue;
  const st = [s]; seen[s] = 1;
  const px = [];
  while (st.length) {
    const i = st.pop(); px.push(i);
    const x = i % W, y = (i / W) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const j = yy * W + xx;
      if (vis[j] && !seen[j]) { seen[j] = 1; st.push(j); }
    }
  }
  const xs = px.map((i) => i % W), ys = px.map((i) => (i / W) | 0);
  const rows = new Map(), cols = new Map();
  for (let k = 0; k < px.length; k++) { rows.set(ys[k], (rows.get(ys[k]) ?? 0) + 1); cols.set(xs[k], (cols.get(xs[k]) ?? 0) + 1); }
  const across = Math.min(Math.max(...rows.values()), Math.max(...cols.values()));
  cl.push({ px: px.length, across, x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) });
}
const sizes = cl.map((c) => c.px);
const by = (k) => cl.filter((c) => c.px > k).length;
console.log(JSON.stringify({
  hist: Object.fromEntries([...hist.entries()].sort()), flat, edge, flatVis, edgeVis,
  clusters: cl.length, over2px: by(2), over5px: by(5), over10px: by(10), maxPx: Math.max(0, ...sizes),
  acrossHist: cl.reduce((m, c) => (m[c.across] = (m[c.across] ?? 0) + 1, m), {}),
  biggest: cl.sort((p, q) => q.px - p.px).slice(0, 12),
}, null, 1));
