// K1436 s2: a crop sheet of screen-scan finds (fill | border capture, 4x, ring = the find), for judging by eye.
//   node k1436_sheet.mjs <out.png> <pick> <scan.json>...   pick: top<N>[:kind] (largest by px) | rand<N>[:kind][@seed]
//   each scan.json's `cap` names its capture dir; writes <out>.txt (row: scene kind:cls x:y site px)
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync, deflateSync } from "node:zlib";
const [outPng, pick, ...scans] = process.argv.slice(2);
function png(p) {
  const b = readFileSync(p); let o = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (o < b.length) { const len = b.readUInt32BE(o); const ty = b.toString("ascii", o + 4, o + 8); const dat = b.subarray(o + 8, o + 8 + len);
    if (ty === "IHDR") { w = dat.readUInt32BE(0); h = dat.readUInt32BE(4); ct = dat[9]; } else if (ty === "IDAT") idat.push(dat); else if (ty === "IEND") break; o += 12 + len; }
  const ch = ct === 6 ? 4 : 3; const raw = inflateSync(Buffer.concat(idat)); const st = w * ch; const d = new Uint8Array(w * h * ch);
  for (let y = 0; y < h; y++) { const f = raw[y * (st + 1)]; const s = y * (st + 1) + 1;
    for (let x = 0; x < st; x++) { const a = x >= ch ? d[y * st + x - ch] : 0, up = y ? d[(y - 1) * st + x] : 0, ul = y && x >= ch ? d[(y - 1) * st + x - ch] : 0; let v = raw[s + x];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1; else if (f === 4) { const pp = a + up - ul, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - ul); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : ul; }
      d[y * st + x] = v & 255; } }
  return { w, h, ch, d };
}
function writePng(p, w, h, rgb) {
  const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = (buf) => { let c = -1; for (const x of buf) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (ty, dat) => { const l = Buffer.alloc(4); l.writeUInt32BE(dat.length); const td = Buffer.concat([Buffer.from(ty), dat]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const raw = Buffer.alloc(h * (w * 3 + 1)); for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; Buffer.from(rgb.buffer, rgb.byteOffset + y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1); }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  writeFileSync(p, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
}
const m = /^(top|rand)(\d+)(?::([a-z]+(?::[a-z]+)?))?(?:@(\d+))?$/.exec(pick); if (!m) throw new Error("pick: top<N>[:kind] | rand<N>[:kind][@seed]");
const [, how, nS, kind, seedS] = m; const N = +nS;
let rows = [];
for (const s of scans) { const J = JSON.parse(readFileSync(s, "utf8")); for (const f of J.finds) if (!kind || f.kind === kind || `${f.kind}:${f.cls}` === kind) rows.push({ J, f }); }
if (how === "top") rows.sort((a, b) => b.f.px - a.f.px);
else { let z = +(seedS ?? 1); const rnd = () => ((z = (z * 1103515245 + 12345) >>> 0) / 4294967296); for (let i = rows.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [rows[i], rows[j]] = [rows[j], rows[i]]; } }
rows = rows.slice(0, N);
const CR = 30, Z = 4, T = 2 * CR * Z, GAP = 6, PER = 2; const COLS = 2 * PER; // two finds per row, fill | border each
const W = COLS * T + (COLS + 1) * GAP + GAP * 2, NR = Math.ceil(rows.length / PER), H = NR * (T + GAP) + GAP;
const img = new Uint8Array(W * H * 3).fill(40); const cache = new Map();
const get = (p) => { if (!cache.has(p)) cache.set(p, png(p)); return cache.get(p); };
rows.forEach((r, k) => {
  const M = JSON.parse(readFileSync(join(r.J.cap, "meta.json"), "utf8")); const s = M.view.s * M.dpr;
  const cx = Math.round(r.f.x * s + M.view.x * M.dpr), cy = Math.round(r.f.y * s + M.view.y * M.dpr);
  const oy = GAP + Math.floor(k / PER) * (T + GAP);
  ["fill", "border"].forEach((nm, q) => {
    const I = get(join(r.J.cap, `${nm}.png`)); const ox = GAP + (k % PER) * (2 * T + 3 * GAP) + q * (T + GAP);
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const sx = cx - CR + Math.floor(x / Z), sy = cy - CR + Math.floor(y / Z); const o = ((oy + y) * W + ox + x) * 3;
      if (sx < 0 || sy < 0 || sx >= I.w || sy >= I.h) continue; const i = (sy * I.w + sx) * I.ch; img[o] = I.d[i]; img[o + 1] = I.d[i + 1]; img[o + 2] = I.d[i + 2];
      const rr = Math.hypot(x - T / 2, y - T / 2); if (Math.abs(rr - CR * Z * 0.6) < 1.2) { img[o] = 0; img[o + 1] = 255; img[o + 2] = 80; } }
  });
});
writePng(outPng, W, H, img);
writeFileSync(outPng.replace(/\.png$/, ".txt"), `rows left to right, top to bottom; per find: fill | border, ${2 * CR} device px at ${Z}x\n` + rows.map((r, k) => `${k + 1}. ${r.J.job?.name ?? ""} ${r.f.kind}:${r.f.cls} ${r.f.x.toFixed(3)}:${r.f.y.toFixed(3)} ${r.f.site ?? ""} ${r.f.px}px`).join("\n") + "\n");
console.log(`${rows.length} rows -> ${outPng}`);
