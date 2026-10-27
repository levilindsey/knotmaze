// K868 S1b: a minimal PNG encoder and decoder on node:zlib (no image
// library; the brief adds no dependencies). Encodes 8-bit RGBA; decodes the
// 8-bit, non-interlaced greyscale, RGB and RGBA files Chrome's screenshots
// and the exporter write.

import { deflateSync, inflateSync } from "node:zlib";

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(buf: Uint8Array, start = 0, end = buf.length): number {
  let c = 0xffffffff;
  for (let i = start; i < end; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const b = Buffer.alloc(12 + data.length);
  b.writeUInt32BE(data.length, 0);
  b.write(type, 4, "ascii");
  Buffer.from(data.buffer, data.byteOffset, data.byteLength).copy(b, 8);
  b.writeUInt32BE(crc32(b, 4, 8 + data.length), 8 + data.length);
  return b;
}

export function encodePng(w: number, h: number, rgba: Uint8Array): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (1 + w * 4) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 6 })),
    chunk("IEND", new Uint8Array(0)),
  ]);
}

export interface Image {
  w: number;
  h: number;
  rgba: Uint8Array;
}

export function decodePng(buf: Uint8Array): Image {
  const b = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);
  if (b.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
  let o = 8;
  let w = 0;
  let h = 0;
  let depth = 0;
  let ctype = 0;
  let interlace = 0;
  const idat: Buffer[] = [];
  while (o < b.length) {
    const len = b.readUInt32BE(o);
    const type = b.toString("ascii", o + 4, o + 8);
    const data = b.subarray(o + 8, o + 8 + len);
    if (type === "IHDR") {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      depth = data[8];
      ctype = data[9];
      interlace = data[12];
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    o += 12 + len;
  }
  if (depth !== 8 || interlace !== 0) throw new Error(`unsupported PNG: depth ${depth}, interlace ${interlace}`);
  const ch = ctype === 6 ? 4 : ctype === 2 ? 3 : ctype === 4 ? 2 : ctype === 0 ? 1 : 0;
  if (!ch) throw new Error(`unsupported PNG colour type ${ctype}`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const px = new Uint8Array(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? px[dst + x - ch] : 0;
      const up = y > 0 ? px[dst - stride + x] : 0;
      const c = y > 0 && x >= ch ? px[dst - stride + x - ch] : 0;
      let v = raw[src + x];
      if (f === 1) v += a;
      else if (f === 2) v += up;
      else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) {
        const p = a + up - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c;
      }
      px[dst + x] = v & 0xff;
    }
  }
  const rgba = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    if (ch >= 3) {
      rgba[i * 4] = px[i * ch];
      rgba[i * 4 + 1] = px[i * ch + 1];
      rgba[i * 4 + 2] = px[i * ch + 2];
      rgba[i * 4 + 3] = ch === 4 ? px[i * ch + 3] : 255;
    } else {
      rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = px[i * ch];
      rgba[i * 4 + 3] = ch === 2 ? px[i * ch + 1] : 255;
    }
  }
  return { w, h, rgba };
}

/** Nearest-neighbour crop + upscale (for 6x crops of screenshots). */
export function cropScale(img: Image, x0: number, y0: number, w: number, h: number, k: number): Image {
  const out = new Uint8Array(w * k * h * k * 4);
  for (let y = 0; y < h * k; y++)
    for (let x = 0; x < w * k; x++) {
      const sx = Math.min(img.w - 1, Math.max(0, x0 + Math.floor(x / k)));
      const sy = Math.min(img.h - 1, Math.max(0, y0 + Math.floor(y / k)));
      const si = (sy * img.w + sx) * 4;
      const di = (y * w * k + x) * 4;
      out[di] = img.rgba[si];
      out[di + 1] = img.rgba[si + 1];
      out[di + 2] = img.rgba[si + 2];
      out[di + 3] = 255;
    }
  return { w: w * k, h: h * k, rgba: out };
}
