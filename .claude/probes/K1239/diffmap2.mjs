// K1239: localize field-only / old-only band pixels in world coords.
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
const [fa, fb, diagFile] = process.argv.slice(2);
const A = decode(fa), B = decode(fb);
const W = A.w, H = A.h, XMAX = 1580;
const band = (I, x, y) => { const o = (y * I.w + x) * I.bpp; const dr = I.px[o] - 20, dg = I.px[o + 1] - 25, db = I.px[o + 2] - 37; return dr * dr + dg * dg + db * db > 144; };
const d = JSON.parse(readFileSync(diagFile, "utf8"));
const ab = JSON.parse(readFileSync(diagFile.replace("diag_def.json", "app_before/app_ab.json"), "utf8"));
const v = ab[0].off.view, dsf = W / 1600, hPx = d.scene.look.halfWidth * v.s * dsf;
const discs = d.scene.junctions.map((j) => [(v.s * j.c[0] + v.x) * dsf, (v.s * j.c[1] + v.y) * dsf]);
const R = 1.5 * 2 * hPx;
const masked = (x, y) => discs.some(([cx, cy]) => (x - cx) ** 2 + (y - cy) ** 2 < R * R);
const CELL = 40;
const cells = new Map();
let fo = 0, oo = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < XMAX; x++) {
  if (masked(x, y)) continue;
  const ia = band(A, x, y), ib = band(B, x, y);
  if (ia === ib) continue;
  const k = `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`;
  const c = cells.get(k) ?? { fo: 0, oo: 0, sx: 0, sy: 0, n: 0 };
  if (ib) { c.fo++; fo++; } else { c.oo++; oo++; }
  c.sx += x; c.sy += y; c.n++;
  cells.set(k, c);
}
console.log(`field-only ${fo} old-only ${oo} (masked r=${R.toFixed(0)}px)`);
const top = [...cells.values()].sort((p, q) => (q.fo + q.oo) - (p.fo + p.oo)).slice(0, 20);
for (const c of top) {
  const cx = c.sx / c.n, cy = c.sy / c.n;
  const wx = ((cx / dsf) - v.x) / v.s, wy = ((cy / dsf) - v.y) / v.s;
  console.log(`cell fo=${c.fo} oo=${c.oo} dev=(${cx.toFixed(0)},${cy.toFixed(0)}) world=(${wx.toFixed(2)},${wy.toFixed(2)})`);
}

