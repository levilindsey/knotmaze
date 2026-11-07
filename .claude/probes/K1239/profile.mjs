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
const [fa, fb, xs, ys, xe] = process.argv.slice(2);
const y = Number(ys), x0 = Number(xs), x1 = Number(xe);
for (const [name, f] of [["off", fa], ["on", fb]]) {
  const I = decode(f);
  const runs = [];
  let prev = null, start = 0;
  for (let x = x0; x <= x1; x++) {
    const o = (y * I.w + x) * I.bpp;
    const dr = I.px[o] - 20, dg = I.px[o + 1] - 25, db = I.px[o + 2] - 37;
    const m = dr * dr + dg * dg + db * db > 144 ? "#" : ".";
    if (prev === null) { prev = m; start = x; }
    else if (m !== prev) { runs.push(`${start}-${x - 1}:${prev}`); prev = m; start = x; }
  }
  runs.push(`${start}-${x1}:${prev}`);
  console.log(name, runs.join(" "));
  // RGB every 8px
  const rgbs = [];
  for (let x = x0; x <= x1; x += 8) { const o = (y * I.w + x) * I.bpp; rgbs.push(`${x}=${I.px[o]},${I.px[o + 1]},${I.px[o + 2]}`); }
  console.log("  ", rgbs.join(" "));
}
