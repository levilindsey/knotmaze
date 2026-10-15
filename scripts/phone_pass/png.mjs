// Minimal PNG decode/encode (8-bit RGB/RGBA) on node:zlib - probe helper.
import { inflateSync, deflateSync } from "node:zlib";

export function decodePNG(buf) {
  let p = 8, W = 0, H = 0, ct = 0; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString("ascii", p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === "IHDR") { W = data.readUInt32BE(0); H = data.readUInt32BE(4); ct = data[9]; }
    else if (type === "IDAT") idat.push(data); else if (type === "IEND") break;
    p += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat)), ch = ct === 6 ? 4 : 3, stride = W * ch;
  const out = Buffer.alloc(H * stride); let rp = 0;
  const paeth = (a, b, c) => { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
  for (let y = 0; y < H; y++) {
    const f = raw[rp++];
    for (let x = 0; x < stride; x++) {
      const v = raw[rp++], a = x >= ch ? out[y * stride + x - ch] : 0, b = y > 0 ? out[(y - 1) * stride + x] : 0, c = y > 0 && x >= ch ? out[(y - 1) * stride + x - ch] : 0;
      out[y * stride + x] = (f === 0 ? v : f === 1 ? v + a : f === 2 ? v + b : f === 3 ? v + ((a + b) >> 1) : v + paeth(a, b, c)) & 255;
    }
  }
  return { W, H, ch, data: out };
}

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, "ascii"), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };

// img = { W, H, data: RGB Buffer (3 ch) }
export function encodePNG(img) {
  const { W, H, data } = img;
  const raw = Buffer.alloc(H * (W * 3 + 1));
  for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0; data.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

export function toRGB(img) {
  if (img.ch === 3) return { W: img.W, H: img.H, data: img.data };
  const out = Buffer.alloc(img.W * img.H * 3);
  for (let i = 0; i < img.W * img.H; i++) { out[i * 3] = img.data[i * 4]; out[i * 3 + 1] = img.data[i * 4 + 1]; out[i * 3 + 2] = img.data[i * 4 + 2]; }
  return { W: img.W, H: img.H, data: out };
}

// A PNG's pixel size from its IHDR, without decoding it.
export const pngSize = (buf) => ({ W: buf.readUInt32BE(16), H: buf.readUInt32BE(20) });

// K193: the top `h` rows of a decoded image, as an RGB image.
export function cropRows(img, h) {
  const rgb = toRGB(img);
  return { W: rgb.W, H: h, data: rgb.data.subarray(0, h * rgb.W * 3) };
}

// K193: the rows at the bottom of a decoded image that are one flat color (every pixel within `tol` of the last
// row's first pixel): the blank strip a capture surface taller than the viewport leaves (K195: 55.7 CSS px in
// landscape; 148 device rows of 250/250/248 under a 411x753 portrait viewport). A DIAGNOSTIC for a page whose
// bottom is textured (the knot page): a page with a flat bottom edge (a solid panel) reads as a strip too.
export function flatBottom(img, tol = 2) {
  const { W, H, ch, data } = img;
  const o = (H - 1) * W * ch;
  const c0 = [data[o], data[o + 1], data[o + 2]];
  let rows = 0;
  for (let y = H - 1; y >= 0; y--) {
    const r = y * W * ch;
    let flat = true;
    for (let x = 0; x < W && flat; x++) {
      const i = r + x * ch;
      if (Math.abs(data[i] - c0[0]) > tol || Math.abs(data[i + 1] - c0[1]) > tol || Math.abs(data[i + 2] - c0[2]) > tol) flat = false;
    }
    if (!flat) break;
    rows++;
  }
  return { rows, color: c0 };
}
