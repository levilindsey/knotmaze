// K1040 S4b: cut a check sheet (s4a.mjs's own PNGs: RGB8, filter 0 rows, one
// IDAT) into view pieces of `rows` crop rows each, for viewing.
// Usage: node split.mjs <sheet.png> <outDir> [rows=2] [first=0] [count=all]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { inflateSync, deflateSync } from "node:zlib";
import { basename, join } from "node:path";

const [, , file, outDir, rowsArg, firstArg, countArg] = process.argv;
const per = Number(rowsArg ?? 2), first = Number(firstArg ?? 0);
mkdirSync(outDir, { recursive: true });
const buf = readFileSync(file);
const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
const idat = [];
for (let o = 8; o < buf.length; ) {
  const len = buf.readUInt32BE(o), type = buf.toString("ascii", o + 4, o + 8);
  if (type === "IDAT") idat.push(buf.subarray(o + 8, o + 8 + len));
  o += 12 + len;
}
const raw = inflateSync(Buffer.concat(idat));
const stride = 1 + 3 * w;
// The sheet's geometry (s4a.mjs sheet()): G = 6 gutters, 3 columns of cw.
const G = 6, cw = (w - 4 * G) / 3, nRows = Math.round((h - G) / (cw + G));
const count = countArg ? Number(countArg) : nRows;
const crc32 = (b) => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t, "ascii"), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); };
for (let p = first; p < Math.min(nRows, first + count); p += per) {
  const r1 = Math.min(nRows, p + per, first + count);
  const y0 = p * (cw + G), y1 = Math.min(h, r1 * (cw + G) + G);
  const out = Buffer.alloc((y1 - y0) * stride);
  for (let y = y0; y < y1; y++) { raw.copy(out, (y - y0) * stride, y * stride, (y + 1) * stride); out[(y - y0) * stride] = 0; }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(y1 - y0, 4); ihdr[8] = 8; ihdr[9] = 2;
  const name = join(outDir, `${basename(file, ".png")}_r${p}-${r1 - 1}.png`);
  writeFileSync(name, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(out)), chunk("IEND", Buffer.alloc(0))]));
  console.log(`${name} ${w}x${y1 - y0}`);
}
console.log(`${basename(file)}: ${w}x${h}, crop ${cw / 4} px at x4, ${nRows} rows`);
