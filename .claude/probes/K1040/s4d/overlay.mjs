// K1239: overlay (old magenta border = red, field ON ink = green, both = yellow), half scale.
// Usage: node overlay.mjs <fam> <lookDir> <out.png>
import { readFileSync, writeFileSync } from "node:fs";
import { inflateSync, deflateSync } from "node:zlib";
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
const crcT = new Int32Array(256);
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c; }
const crc32 = (b) => { let c = -1; for (let i = 0; i < b.length; i++) c = crcT[(c ^ b[i]) & 255] ^ (c >>> 8); return (-1 ^ c) >>> 0; };
function chunk(t, d) { const out = Buffer.alloc(12 + d.length); out.writeUInt32BE(d.length, 0); out.write(t, 4, "ascii"); d.copy(out, 8); out.writeUInt32BE(crc32(out.subarray(4, 8 + d.length)), 8 + d.length); return out; }
function encode(w, h, rgba) {
  const stride = w * 4, raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride); }
  const head = Buffer.alloc(13);
  head.writeUInt32BE(w, 0); head.writeUInt32BE(h, 4); head[8] = 8; head[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", head), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
const [fam, dir, out] = process.argv.slice(2);
const off = decode(`${dir}/app_${fam}_off.png`);
const on = decode(`${dir}/app_${fam}_on.png`);
const W = off.w, H = off.h, XMAX = 1580;
const W2 = Math.floor(XMAX / 2), H2 = Math.floor(H / 2);
const rgba = Buffer.alloc(W2 * H2 * 4);
for (let y2 = 0; y2 < H2; y2++) for (let x2 = 0; x2 < W2; x2++) {
  let mo = 0, mf = 0;
  for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
    const x = x2 * 2 + dx, y = y2 * 2 + dy;
    const oo = (y * W + x) * off.bpp;
    const r = off.px[oo], g = off.px[oo + 1], b = off.px[oo + 2];
    if (r > 110 && b > 110 && g < r - 50 && g < b - 50) mo = 1;
    const no = (y * W + x) * on.bpp;
    const r2 = on.px[no], g2 = on.px[no + 1], b2 = on.px[no + 2];
    const lum = 0.299 * r2 + 0.587 * g2 + 0.114 * b2;
    if (r2 - b2 > -2 && lum < 60 && lum > 8) mf = 1;
  }
  const o = (y2 * W2 + x2) * 4;
  rgba[o] = mo ? 255 : 0; rgba[o + 1] = mf ? 255 : 0; rgba[o + 2] = 0; rgba[o + 3] = 255;
}
writeFileSync(out, encode(W2, H2, rgba));
console.log("wrote", out, W2, H2);
