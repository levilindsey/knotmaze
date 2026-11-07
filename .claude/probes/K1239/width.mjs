// K1239: perpendicular profiles (magenta old vs cover) across chain 31 at given s.
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
const M = decode(".claude/probes/K1239/out/app_magenta/app_def_off.png");
const C = decode(".claude/probes/K1239/out/cover_def_zoom.png");
const mag = (x, y) => { if (x < 0 || y < 0 || x >= M.w || y >= M.h) return false; const o = (Math.round(y) * M.w + Math.round(x)) * M.bpp; const r = M.px[o], g = M.px[o + 1], b = M.px[o + 2]; return r > 110 && b > 110 && g < r - 50 && g < b - 50; };
const cov = (x, y) => { if (x < 0 || y < 0 || x >= C.w || y >= C.h) return false; return C.px[(Math.round(y) * C.w + Math.round(x)) * C.bpp] > 127; };
const toDev = (wx, wy) => [(v.s * wx + v.x) * dsf, (v.s * wy + v.y) * dsf];
const chainId = Number(process.argv[2] ?? 31), sAt = Number(process.argv[3] ?? 2.0);
const c = S.chains[chainId], pts = c.pts, n = pts.length / 2;
const cum = [0];
for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(pts[i * 2] - pts[(i - 1) * 2], pts[i * 2 + 1] - pts[(i - 1) * 2 + 1]));
let bi = cum.findIndex((s) => s >= sAt);
if (bi < 1) bi = 1;
const ip = bi - 1, inx = Math.min(n - 1, bi + 1);
let tx = pts[inx * 2] - pts[ip * 2], ty = pts[inx * 2 + 1] - pts[ip * 2 + 1];
const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
const cx = pts[bi * 2], cy = pts[bi * 2 + 1];
console.log(`chain ${chainId} s=${cum[bi].toFixed(2)} centre world (${cx.toFixed(2)},${cy.toFixed(2)}) tangent (${tx.toFixed(2)},${ty.toFixed(2)}) h=${S.look.halfWidth} W=${S.look.band}`);
for (let off = -0.45; off <= 0.451; off += 0.03) {
  const wx = cx - ty * off, wy = cy + tx * off;
  const [dx, dy] = toDev(wx, wy);
  console.log(`off=${off.toFixed(2)} mag=${mag(dx, dy) ? "#" : "."} cov=${cov(dx, dy) ? "#" : "."}`);
}
