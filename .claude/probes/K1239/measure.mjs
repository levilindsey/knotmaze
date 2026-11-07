// K1239: band-mask IoU between two app screenshots, whole frame and with
// junction discs masked. Usage: node measure.mjs <off.png> <on.png> [diag.json]
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
function decode(file) {
  const buf = readFileSync(file);
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20), ct = buf[25];
  const bpp = ct === 6 ? 4 : ct === 2 ? 3 : (() => { throw new Error(`colour type ${ct}`); })();
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
const [fa, fb, diagFile] = process.argv.slice(2);
const A = decode(fa), B = decode(fb);
const W = A.w, H = A.h;
const band = (I, x, y) => { const o = (y * I.w + x) * I.bpp; return Math.max(0, Math.min(255, (I.px[o] - I.px[o + 2] + 12) * 12)) > 127; };
// K1239 ink: border/ink pixels are dark and not blue (fill is warmer+brighter, bg is blue).
const ink = (I, x, y) => { const o = (y * I.w + x) * I.bpp; const r = I.px[o], g = I.px[o + 1], b = I.px[o + 2]; return (0.299 * r + 0.587 * g + 0.114 * b) < 30 && (r - b) > -8; };
const XMAX = 1580; // crop out the panel (device px)
let discs = [];
if (diagFile) {
  const d = JSON.parse(readFileSync(diagFile, "utf8"));
  const ab = JSON.parse(readFileSync(diagFile.replace("diag_def.json", "app_before/app_ab.json"), "utf8"));
  const v = ab[0].off.view; // {x,y,s} CSS root transform; screenshot device = CSS*1.5
  const dsf = W / 1600;
  discs = d.scene.junctions.map((j) => [(v.s * j.c[0] + v.x) * dsf, (v.s * j.c[1] + v.y) * dsf]);
  var hPx = d.scene.look.halfWidth * v.s * dsf;
}
function iou(rDisc, fn = band, xmax = W) {
  let a = 0, b = 0, both = 0, masked = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < xmax; x++) {
    if (rDisc > 0) { let m = false; for (const [cx, cy] of discs) { const dx = x - cx, dy = y - cy; if (dx * dx + dy * dy < rDisc * rDisc) { m = true; break; } } if (m) { masked++; continue; } }
    const ia = fn(A, x, y), ib = fn(B, x, y);
    if (ia) a++; if (ib) b++; if (ia && ib) both++;
  }
  return { iou: +(both / (a + b - both)).toFixed(4), a, b, both, masked };
}
console.log("band-fn whole:", JSON.stringify(iou(0)));
console.log("ink-fn cropped whole:", JSON.stringify(iou(0, ink, XMAX)));
if (discs.length) {
  for (const f of [0.75, 1.5, 3]) console.log(`band disc ${f}*2h:`, JSON.stringify(iou(f * 2 * hPx)));
  for (const f of [0.75, 1.5, 3]) console.log(`ink disc ${f}*2h cropped:`, JSON.stringify(iou(f * 2 * hPx, ink, XMAX)));
}
