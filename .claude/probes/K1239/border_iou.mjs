// K1239: IoU of field cover vs old border (tube-body edge band), junction-masked.
// Usage: node border_iou.mjs <off.png> <cover.png> [diag.json]
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
function decode(file) {
  const buf = readFileSync(file);
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20), ct = buf[25];
  const bpp = ct === 6 ? 4 : 3;
  const idat = [];
  for (let o = 8; o < buf.length;) { const len = buf.readUInt32BE(o), t = buf.toString("ascii", o + 4, o + 8); if (t === "IDAT") idat.push(buf.subarray(o + 8, o + 8 + len)); o += 12 + len; }
  const raw = inflateSync(Buffer.concat(idat)), stride = w * bpp, px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride;
    for (let i = 0; i < stride; i++) {
      const x = raw[src + i], a = i >= bpp ? px[dst + i - bpp] : 0, b = y > 0 ? px[dst - stride + i] : 0, c = i >= bpp && y > 0 ? px[dst - stride + i - bpp] : 0;
      let v;
      if (f === 0) v = x; else if (f === 1) v = x + a; else if (f === 2) v = x + b; else if (f === 3) v = x + ((a + b) >> 1);
      else { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      px[dst + i] = v & 255;
    }
  }
  return { w, h, bpp, px };
}
const [fa, fc, diagFile] = process.argv.slice(2);
const A = decode(fa), C = decode(fc);
const W = A.w, H = A.h, XMAX = 1580;
const body = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < XMAX; x++) {
  const o = (y * W + x) * A.bpp;
  const dr = A.px[o] - 20, dg = A.px[o + 1] - 25, db = A.px[o + 2] - 37;
  body[y * W + x] = dr * dr + dg * dg + db * db > 144 ? 1 : 0;
}
// chamfer distance to non-body (two-pass, 3-4 weights scaled x3)
const dist = new Float32Array(W * H).fill(1e6);
for (let y = 0; y < H; y++) for (let x = 0; x < XMAX; x++) if (!body[y * W + x]) dist[y * W + x] = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < XMAX; x++) {
  const i = y * W + x; if (!body[i]) continue;
  let m = dist[i];
  if (x > 0) m = Math.min(m, dist[i - 1] + 3);
  if (y > 0) m = Math.min(m, dist[i - W] + 3);
  if (x > 0 && y > 0) m = Math.min(m, dist[i - W - 1] + 4);
  if (x < XMAX - 1 && y > 0) m = Math.min(m, dist[i - W + 1] + 4);
  dist[i] = m;
}
for (let y = H - 1; y >= 0; y--) for (let x = XMAX - 1; x >= 0; x--) {
  const i = y * W + x; if (!body[i]) continue;
  let m = dist[i];
  if (x < XMAX - 1) m = Math.min(m, dist[i + 1] + 3);
  if (y < H - 1) m = Math.min(m, dist[i + W] + 3);
  if (x < XMAX - 1 && y < H - 1) m = Math.min(m, dist[i + W + 1] + 4);
  if (x > 0 && y < H - 1) m = Math.min(m, dist[i + W - 1] + 4);
  dist[i] = m;
}
let discs = [], hPx = 70;
if (diagFile) {
  const d = JSON.parse(readFileSync(diagFile, "utf8"));
  const ab = JSON.parse(readFileSync(diagFile.replace("diag_def.json", "app_before/app_ab.json"), "utf8"));
  const v = ab[0].off.view, dsf = W / 1600;
  hPx = d.scene.look.halfWidth * v.s * dsf;
  discs = d.scene.junctions.map((j) => [(v.s * j.c[0] + v.x) * dsf, (v.s * j.c[1] + v.y) * dsf]);
}
console.log("dist at strand centre (1135,1094):", dist[1094 * W + 1135], "at edge (1102,1094):", dist[1094 * W + 1102]); function run(Wpx, rDisc) {
  let a = 0, b = 0, both = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < XMAX; x++) {
    if (rDisc > 0) { let m = false; for (const [cx, cy] of discs) { const dx = x - cx, dy = y - cy; if (dx * dx + dy * dy < rDisc * rDisc) { m = true; break; } } if (m) continue; }
    const i = y * W + x;
    const ia = body[i] === 1 && dist[i] <= Wpx * 3;
    const ib = C.px[i * C.bpp] > 127;
    if (ia) a++; if (ib) b++; if (ia && ib) both++;
  }
  return { Wpx, rDisc, iou: +(both / (a + b - both)).toFixed(4), oldBorder: a, field: b, both, oldOnly: a - both, fieldOnly: b - both };
}
const wpx = Math.round(0.38 * hPx) + 2;
console.log(JSON.stringify(run(wpx, 0)));
console.log(JSON.stringify(run(wpx, 1.5 * hPx)));
console.log(JSON.stringify(run(wpx, 1.5 * 2 * hPx)));
console.log(JSON.stringify(run(wpx, 3 * 2 * hPx)));


