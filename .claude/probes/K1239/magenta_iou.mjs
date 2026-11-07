// K1239: IoU of old border (magenta shot) vs field cover, junction-masked.
// Usage: node magenta_iou.mjs <magentaOff.png> <cover.png> <diag.json> <appDirJson>
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
const [fm, fc, diagFile, abFile] = process.argv.slice(2);
const M = decode(fm), C = decode(fc);
const W = M.w, H = M.h, XMAX = 1580;
const mag = (x, y) => { const o = (y * W + x) * M.bpp; const r = M.px[o], g = M.px[o + 1], b = M.px[o + 2]; return r > 110 && b > 110 && g < r - 50 && g < b - 50; };
const d = JSON.parse(readFileSync(diagFile, "utf8"));
const ab = JSON.parse(readFileSync(abFile, "utf8"));
const v = ab[0].off.view, dsf = W / 1600, hPx = d.scene.look.halfWidth * v.s * dsf;
const discs = d.scene.junctions.map((j) => [(v.s * j.c[0] + v.x) * dsf, (v.s * j.c[1] + v.y) * dsf]);
function run(rDisc) {
  let a = 0, b = 0, both = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < XMAX; x++) {
    if (rDisc > 0) { let m = false; for (const [cx, cy] of discs) { const dx = x - cx, dy = y - cy; if (dx * dx + dy * dy < rDisc * rDisc) { m = true; break; } } if (m) continue; }
    const ia = mag(x, y), ib = C.px[(y * W + x) * C.bpp] > 127;
    if (ia) a++; if (ib) b++; if (ia && ib) both++;
  }
  return { r: Math.round(rDisc), iou: +(both / (a + b - both)).toFixed(4), old: a, field: b, both, oldOnly: a - both, fieldOnly: b - both };
}
console.log(JSON.stringify(run(0)));
console.log(JSON.stringify(run(1.5 * hPx)));
console.log(JSON.stringify(run(1.5 * 2 * hPx)));
console.log(JSON.stringify(run(3 * 2 * hPx)));
