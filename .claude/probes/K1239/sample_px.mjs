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
for (const f of process.argv.slice(2)) {
  const I = decode(f);
  console.log(f, I.w, I.h);
  for (const y of [300, 600, 900]) {
    const runs = [];
    let prev = "";
    for (let x = 0; x < 1600; x += 10) {
      const o = (y * I.w + x) * I.bpp;
      const s = `${I.px[o]},${I.px[o + 1]},${I.px[o + 2]}`;
      if (s !== prev) { runs.push(`${x}:${s}`); prev = s; }
    }
    console.log(` y=${y}`, runs.slice(0, 40).join(" "));
  }
}
