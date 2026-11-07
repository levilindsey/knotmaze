// K1239: old vs field tube-mask along chain 31 (band-centre points, both sides).
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
const d = JSON.parse(readFileSync(".claude/probes/K1239/out/diag_def.json", "utf8"));
const S = d.scene;
const ab = JSON.parse(readFileSync(".claude/probes/K1239/out/app_before/app_ab.json", "utf8"));
const v = ab[0].off.view, dsf = 2400 / 1600;
const A = decode(".claude/probes/K1239/out/app_magenta/app_def_off.png"); const B = decode(".claude/probes/K1239/out/cover_def_zoom.png");
const mask = (I, x, y) => false; const mag = (x, y) => { if (x < 0 || y < 0 || x >= A.w || y >= A.h) return false; const o = (Math.round(y) * A.w + Math.round(x)) * A.bpp; const r = A.px[o], g = A.px[o + 1], b = A.px[o + 2]; return r > 110 && b > 110 && g < r - 50 && g < b - 50; }; const cov = (x, y) => { if (x < 0 || y < 0 || x >= B.w || y >= B.h) return false; return B.px[(Math.round(y) * B.w + Math.round(x)) * B.bpp] > 127; };
const toDev = (wx, wy) => [(v.s * wx + v.x) * dsf, (v.s * wy + v.y) * dsf];
const c = S.chains[Number(process.argv[2] ?? 31)];
const h = S.look.halfWidth, W = S.look.band;
const pts = c.pts, n = pts.length / 2;
// cumulative s
const cum = [0];
for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(pts[i * 2] - pts[(i - 1) * 2], pts[i * 2 + 1] - pts[(i - 1) * 2 + 1]));
const sMax = Number(process.argv[3] ?? 3.5);
for (let i = 0; i < n; i++) {
  if (cum[i] > sMax) break;
  if (i % 2) continue;
  const ip = Math.max(0, i - 1), inx = Math.min(n - 1, i + 1);
  let tx = pts[inx * 2] - pts[ip * 2], ty = pts[inx * 2 + 1] - pts[ip * 2 + 1];
  const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
  const row = [];
  for (const [lbl, off] of [["L", -(h - W / 2)], ["C", 0], ["R", h - W / 2]]) {
    const wx = pts[i * 2] - ty * off, wy = pts[i * 2 + 1] + tx * off;
    const [dx, dy] = toDev(wx, wy);
    row.push(`${lbl}:${mag(dx, dy) ? "O" : "."}${cov(dx, dy) ? "F" : "."}`);
  }
  console.log(`s=${cum[i].toFixed(2)} ${row.join(" ")}`);
}

