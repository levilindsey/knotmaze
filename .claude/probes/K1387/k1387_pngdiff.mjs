// K1387 s2: pixel diff of PNG pairs (8-bit RGB/RGBA, non-interlaced: Chrome's screenshots), no dependencies.
//   node .claude/probes/K1387/k1387_pngdiff.mjs <a.png> <b.png> [<a.png> <b.png> ...]
// Prints, per pair: differing px, max channel delta, and the bounding box of the differing px.
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

export function decodePng(file) {
  const buf = readFileSync(file);
  let o = 8, w = 0, h = 0, ct = 0, bd = 0;
  const idat = [];
  while (o < buf.length) {
    const len = buf.readUInt32BE(o);
    const type = buf.toString("ascii", o + 4, o + 8);
    const d = buf.subarray(o + 8, o + 8 + len);
    if (type === "IHDR") { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bd = d[8]; ct = d[9]; if (d[12]) throw new Error("interlaced"); }
    else if (type === "IDAT") idat.push(d);
    else if (type === "IEND") break;
    o += 12 + len;
  }
  if (bd !== 8 || (ct !== 2 && ct !== 6)) throw new Error(`unsupported png ${file}: bit depth ${bd}, color type ${ct}`);
  const bpp = ct === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const px = Buffer.alloc(w * h * 4);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let p;
      if (f === 0) p = 0;
      else if (f === 1) p = a;
      else if (f === 2) p = b;
      else if (f === 3) p = (a + b) >> 1;
      else { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      line[i] = (line[i] + p) & 255;
    }
    for (let x = 0; x < w; x++) {
      const s = x * bpp, t = (y * w + x) * 4;
      px[t] = line[s]; px[t + 1] = line[s + 1]; px[t + 2] = line[s + 2]; px[t + 3] = bpp === 4 ? line[s + 3] : 255;
    }
    prev = line;
  }
  return { w, h, px };
}

export function diffPng(fa, fb) {
  const A = decodePng(fa), B = decodePng(fb);
  if (A.w !== B.w || A.h !== B.h) return { size: `${A.w}x${A.h} vs ${B.w}x${B.h}` };
  let n = 0, max = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let i = 0; i < A.w * A.h; i++) {
    let d = 0;
    for (let k = 0; k < 4; k++) d = Math.max(d, Math.abs(A.px[i * 4 + k] - B.px[i * 4 + k]));
    if (d > 0) {
      n++; max = Math.max(max, d);
      const x = i % A.w, y = (i / A.w) | 0;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
  }
  return { n, max, box: n ? [x0, y0, x1, y1] : null, w: A.w, h: A.h };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  const args = process.argv.slice(2);
  for (let i = 0; i + 1 < args.length; i += 2) {
    const r = diffPng(args[i], args[i + 1]);
    const name = (f) => f.replace(/^.*[\\/]/, "");
    console.log(`${name(args[i])} vs ${name(args[i + 1])}: ${r.size ?? `${r.n} px, max ${r.max}${r.box ? `, box ${r.box.join(",")}` : ""}`}`);
  }
}
