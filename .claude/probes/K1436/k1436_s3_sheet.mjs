// K1436 s3: the WORK LIST's crop sheets. One row per screen find, four 4x crops of one device-pixel window:
//   today fill | gf fill | today border | gf border
// (today = the same frozen K868 state drawn by today's renderer, captured with k1436_screen.mjs job.today; gf = the
// capture the screen scan read). Edge ticks (green) mark the find's centre; no ring over the pixels.
//   node k1436_s3_sheet.mjs <outPrefix> <pick> <scan.json>...
//     pick: top<N>[:kind[:cls]] (largest by px) | rand<N>[:kind[:cls]][@seed] | list:<file> (lines "scene x y", world)
//   writes <outPrefix>_<k>.png (ROWS finds a sheet) and <outPrefix>.tsv (n, sheet, row, scene, kind:cls, x, y, site, px)
//   env CR=36 (device px half-width), Z=4, ROWS=5; the today capture dir is the gf one with _h1 / _h0 -> _today
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { inflateSync, deflateSync } from "node:zlib";
const [outPrefix, pick, ...scans] = process.argv.slice(2);
const CR = +(process.env.CR ?? 36), Z = +(process.env.Z ?? 4), ROWS = +(process.env.ROWS ?? 5);
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
let rows = [];
const Js = scans.map((s) => JSON.parse(readFileSync(s, "utf8")));
const lm = /^list:(.+)$/.exec(pick);
if (lm) {
  for (const line of readFileSync(lm[1], "utf8").split(/\r?\n/)) { const [sc, xs, ys] = line.trim().split(/\s+/); if (!sc) continue;
    const J = Js.find((j) => (j.job?.name ?? "") === sc); if (!J) { console.log(`no scan for ${sc}`); continue; }
    let best = null, bd = 1e9; for (const f of J.finds) { const d = Math.hypot(f.x - +xs, f.y - +ys); if (d < bd) { bd = d; best = f; } }
    rows.push({ J, f: best && bd < 0.05 ? best : { kind: "pt", cls: "-", x: +xs, y: +ys, px: 0, site: "" } }); }
} else {
  const m = /^(top|rand)(\d+)(?::([a-z]+)(?::([a-z]+))?)?(?:@(\d+))?$/.exec(pick); if (!m) throw new Error("pick: top<N>[:kind[:cls]] | rand<N>[:kind[:cls]][@seed] | list:<file>");
  const [, how, nS, kind, cls, seedS] = m;
  for (const J of Js) for (const f of J.finds) if ((!kind || f.kind === kind) && (!cls || f.cls === cls)) rows.push({ J, f });
  if (how === "top") rows.sort((a, b) => b.f.px - a.f.px);
  else { let z = +(seedS ?? 1); const rnd = () => ((z = (z * 1103515245 + 12345) >>> 0) / 4294967296); for (let i = rows.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [rows[i], rows[j]] = [rows[j], rows[i]]; } }
  rows = rows.slice(0, +nS);
}
const T = 2 * CR * Z, GAP = 8, COLS = 4;
const cache = new Map(); const get = (p) => { if (!cache.has(p)) cache.set(p, existsSync(p) ? png(p) : null); return cache.get(p); };
const tsv = ["n\tsheet\trow\tscene\tkind:cls\tx\ty\tsite\tpx"];
for (let s0 = 0, sh = 1; s0 < rows.length; s0 += ROWS, sh++) {
  const part = rows.slice(s0, s0 + ROWS);
  const W = COLS * T + (COLS + 1) * GAP + GAP, H = part.length * (T + GAP) + GAP;
  const img = new Uint8Array(W * H * 3).fill(40);
  part.forEach((r, k) => {
    const cap = r.J.cap, today = cap.replace(/_h[01]([\\/]?)$/, "_today$1");
    const M = JSON.parse(readFileSync(join(cap, "meta.json"), "utf8")); const s = M.view.s * M.dpr;
    const cx = Math.round(r.f.x * s + M.view.x * M.dpr), cy = Math.round(r.f.y * s + M.view.y * M.dpr);
    // today's capture has its own view (the same frozen state, so it should match; it is read from its meta)
    let tcx = cx, tcy = cy; if (existsSync(join(today, "meta.json"))) { const Mt = JSON.parse(readFileSync(join(today, "meta.json"), "utf8")); const st = Mt.view.s * Mt.dpr; tcx = Math.round(r.f.x * st + Mt.view.x * Mt.dpr); tcy = Math.round(r.f.y * st + Mt.view.y * Mt.dpr); }
    const oy = GAP + k * (T + GAP);
    [[today, "fill", tcx, tcy], [cap, "fill", cx, cy], [today, "border", tcx, tcy], [cap, "border", cx, cy]].forEach(([dir, nm, ccx, ccy], q) => {
      const I = get(join(dir, `${nm}.png`)); const ox = GAP + q * (T + GAP) + (q >= 2 ? GAP : 0);
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const o = ((oy + y) * W + ox + x) * 3;
        const edge = (y < 6 || y >= T - 6) && Math.abs(x - T / 2) < 2 || (x < 6 || x >= T - 6) && Math.abs(y - T / 2) < 2;
        if (edge) { img[o] = 0; img[o + 1] = 255; img[o + 2] = 80; continue; }
        if (!I) { img[o] = 90; img[o + 1] = 0; img[o + 2] = 0; continue; }
        const sx = ccx - CR + Math.floor(x / Z), sy = ccy - CR + Math.floor(y / Z);
        if (sx < 0 || sy < 0 || sx >= I.w || sy >= I.h) continue; const i = (sy * I.w + sx) * I.ch; img[o] = I.d[i]; img[o + 1] = I.d[i + 1]; img[o + 2] = I.d[i + 2]; }
    });
    tsv.push(`${s0 + k + 1}\t${sh}\t${k + 1}\t${r.J.job?.name ?? ""}\t${r.f.kind}:${r.f.cls}\t${r.f.x.toFixed(3)}\t${r.f.y.toFixed(3)}\t${r.f.site ?? ""}\t${r.f.px}`);
  });
  writePng(`${outPrefix}_${sh}.png`, W, H, img);
}
writeFileSync(`${outPrefix}.tsv`, tsv.join("\n") + "\n");
console.log(`${rows.length} rows -> ${outPrefix}_*.png (${ROWS} a sheet; today fill | gf fill || today border | gf border, ${2 * CR} device px at ${Z}x)`);
