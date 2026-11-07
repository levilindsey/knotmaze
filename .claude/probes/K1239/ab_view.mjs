// K1040 S4b: view two app screenshots of one camera (app_ab.mjs's) side by
// side with a band overlay: A | B | overlay, at zoom z. A pixel is "band"
// when its red reaches its blue (the knot's navy background has blue > red by
// ~20; master's reddish ink and the field app's dark brown ink both have red >=
// blue), so the overlay's red is A's band, green is B's (yellow: both).
// Usage: node ab_view.mjs <a.png> <b.png> <out.png> <x> <y> <w> <h> [z=1]
import { readFileSync, writeFileSync } from "node:fs";
import { inflateSync, deflateSync } from "node:zlib";

function decode(file) {
  const buf = readFileSync(file);
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20), ct = buf[25];
  const bpp = ct === 6 ? 4 : ct === 2 ? 3 : (() => { throw new Error(`colour type ${ct}`); })();
  const idat = [];
  for (let o = 8; o < buf.length; ) { const len = buf.readUInt32BE(o), t = buf.toString("ascii", o + 4, o + 8); if (t === "IDAT") idat.push(buf.subarray(o + 8, o + 8 + len)); o += 12 + len; }
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
const crc32 = (b) => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t, "ascii"), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); };

const [, , fa, fb, out, xs, ys, ws, hs, zs] = process.argv;
const [x0, y0, w, h, z] = [xs, ys, ws, hs, zs ?? "1"].map(Number);
const A = decode(fa), B = decode(fb), G = 6, W = 3 * w * z + 2 * G, H = h * z;
const img = Buffer.alloc(H * (1 + 3 * W), 60);
const at = (I, x, y) => { const o = (y * I.w + x) * I.bpp; return [I.px[o], I.px[o + 1], I.px[o + 2]]; };
const band = (p) => Math.max(0, Math.min(255, (p[0] - p[2] + 12) * 12));
let nA = 0, nB = 0, both = 0;
for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
  const pa = at(A, x0 + i, y0 + j), pb = at(B, x0 + i, y0 + j), ba = band(pa), bb = band(pb);
  if (ba > 127) nA++; if (bb > 127) nB++; if (ba > 127 && bb > 127) both++;
  const cols = [pa, pb, [ba, bb, 0]];
  cols.forEach((c, k) => {
    for (let dy = 0; dy < z; dy++) for (let dx = 0; dx < z; dx++) {
      const X = k * (w * z + G) + i * z + dx, Y = j * z + dy, o = Y * (1 + 3 * W) + 1 + 3 * X;
      img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2];
    }
  });
}
for (let Y = 0; Y < H; Y++) img[Y * (1 + 3 * W)] = 0;
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(img)), chunk("IEND", Buffer.alloc(0))]));
console.log(JSON.stringify({ out, W, H, bandA: nA, bandB: nB, both, iou: +(both / (nA + nB - both)).toFixed(3) }));
