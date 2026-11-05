// K1139 Stage 4 (4.2 task 4): how crisp a front is. For a frame (the strips
// of a row, page device px = ceil(clip.x * 1.5) + image px: a strip at clip 181 CSS = a dump at 180 + (2, 2) px, 0 px differing), in a window of page
// device px, every edge pixel of the luma (or debug-5 G): a Sobel local
// maximum along its gradient, with both sides pale (not the background or
// a ribbon's dark edge). Along the gradient direction n, the profile
// f(s) = bilinear value at p + s n, s in [-W, W]; lo = f(-W), hi = f(W);
// the 10-90% rise is s90 - s10, scanned outward from s = 0, in image px at
// 1x (the capture's px, DSF 1.5; CSS px = px / 1.5).
//   node front_s4.mjs <png> <x0,y0,x1,y1 page device px> <clipX,clipY CSS> [L|G] [W=3] [minContrast=12]
//   node front_s4.mjs --at <png> <clipX,clipY> <L|G> <W> <x,y,nx,ny;...>   (profiles at given page points + normals)
import { readFileSync } from "node:fs";
import { decodePNG, toRGB } from "./png.mjs";

const DSF = 1.5;
const load = (f) => toRGB(decodePNG(readFileSync(f)));
export function field(img, ch) {
  const F = new Float32Array(img.W * img.H);
  for (let i = 0; i < F.length; i++) {
    const r = img.data[i * 3], g = img.data[i * 3 + 1], b = img.data[i * 3 + 2];
    F[i] = ch === "G" ? g : 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return { F, W: img.W, H: img.H, L: (() => { const L = new Float32Array(img.W * img.H); for (let i = 0; i < L.length; i++) L[i] = 0.299 * img.data[i * 3] + 0.587 * img.data[i * 3 + 1] + 0.114 * img.data[i * 3 + 2]; return L; })() };
}
const bil = (A, W, H, x, y) => {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const g = (xx, yy) => A[Math.max(0, Math.min(H - 1, yy)) * W + Math.max(0, Math.min(W - 1, xx))];
  return (g(x0, y0) * (1 - fx) + g(x0 + 1, y0) * fx) * (1 - fy) + (g(x0, y0 + 1) * (1 - fx) + g(x0 + 1, y0 + 1) * fx) * fy;
};
// x, y in image px (pixel centres at integer + 0 here: image px i covers [i, i+1), centre i + 0.5;
// we sample on the centre lattice, so pass centre coordinates minus 0.5)
export function profile(fd, x, y, nx, ny, Wd) {
  const f = (s) => bil(fd.F, fd.W, fd.H, x + s * nx, y + s * ny);
  const lo = f(-Wd), hi = f(Wd), d = hi - lo;
  if (Math.abs(d) < 1e-6) return { lo, hi, d, w: NaN };
  const sg = Math.sign(d);
  let s10 = -Wd, s90 = Wd;
  for (let s = 0; s >= -Wd; s -= 0.02) if (sg * (f(s) - lo) <= 0.1 * Math.abs(d)) { s10 = s; break; }
  for (let s = 0; s <= Wd; s += 0.02) if (sg * (f(s) - lo) >= 0.9 * Math.abs(d)) { s90 = s; break; }
  let slope = 0;
  for (let s = -Wd; s < Wd; s += 0.05) slope = Math.max(slope, sg * (f(s + 0.05) - f(s)) / 0.05);
  return { lo, hi, d, w: s90 - s10, s10, s90, slope };
}
export function edges(fd, box, minC, Wd) {
  const { F, W, H, L } = fd;
  const out = [];
  for (let y = Math.max(2, box[1]); y <= Math.min(H - 3, box[3]); y++)
    for (let x = Math.max(2, box[0]); x <= Math.min(W - 3, box[2]); x++) {
      const v = (xx, yy) => F[yy * W + xx];
      const gx = (v(x + 1, y - 1) + 2 * v(x + 1, y) + v(x + 1, y + 1) - v(x - 1, y - 1) - 2 * v(x - 1, y) - v(x - 1, y + 1)) / 8;
      const gy = (v(x - 1, y + 1) + 2 * v(x, y + 1) + v(x + 1, y + 1) - v(x - 1, y - 1) - 2 * v(x, y - 1) - v(x + 1, y - 1)) / 8;
      const m = Math.hypot(gx, gy);
      if (m < 2) continue;
      const nx = gx / m, ny = gy / m;
      const mAt = (xx, yy) => {
        const vv = (a, b) => bil(F, W, H, a, b);
        const ggx = (vv(xx + 1, yy - 1) + 2 * vv(xx + 1, yy) + vv(xx + 1, yy + 1) - vv(xx - 1, yy - 1) - 2 * vv(xx - 1, yy) - vv(xx - 1, yy + 1)) / 8;
        const ggy = (vv(xx - 1, yy + 1) + 2 * vv(xx, yy + 1) + vv(xx + 1, yy + 1) - vv(xx - 1, yy - 1) - 2 * vv(xx, yy - 1) - vv(xx + 1, yy - 1)) / 8;
        return Math.hypot(ggx, ggy);
      };
      if (mAt(x + nx, y + ny) > m || mAt(x - nx, y - ny) > m) continue;
      // both sides pale in luma (not background or a ribbon edge)
      const la = bil(L, W, H, x - 3 * nx, y - 3 * ny), lb = bil(L, W, H, x + 3 * nx, y + 3 * ny);
      if (Math.min(la, lb) < 90) continue;
      const p = profile(fd, x, y, nx, ny, Wd);
      if (!(Math.abs(p.d) >= minC)) continue;
      out.push({ x, y, nx: +nx.toFixed(3), ny: +ny.toFixed(3), m: +m.toFixed(1), ...p });
    }
  return out;
}
const fmt = (e, ox, oy) => `(${e.x + ox},${e.y + oy}) n(${e.nx},${e.ny}) lo ${e.lo.toFixed(0)} hi ${e.hi.toFixed(0)} w10-90 ${e.w.toFixed(2)} px slope ${e.slope.toFixed(1)}/px`;
if (process.argv[1] && process.argv[1].endsWith("front_s4.mjs")) {
  if (process.argv[2] === "--at") {
    const [, , , png, clipS, ch, Ws, pts] = process.argv;
    const [cX, cY] = clipS.split(",").map(Number);
    const ox = Math.ceil(cX * DSF - 1e-9), oy = Math.ceil(cY * DSF - 1e-9);
    const fd = field(load(png), ch);
    for (const t of pts.split(";")) {
      const [x, y, nx, ny] = t.split(",").map(Number);
      const p = profile(fd, x - ox, y - oy, nx, ny, Number(Ws));
      console.log(`  (${x},${y}) n(${nx},${ny}): lo ${p.lo.toFixed(1)} hi ${p.hi.toFixed(1)} d ${p.d.toFixed(1)} w10-90 ${Number.isFinite(p.w) ? p.w.toFixed(2) : "-"} px slope ${p.slope?.toFixed(1) ?? "-"}/px`);
    }
  } else {
    const [, , png, boxS, clipS, ch = "L", Ws = "3", mC = "12"] = process.argv;
    const [cX, cY] = clipS.split(",").map(Number);
    const ox = Math.ceil(cX * DSF - 1e-9), oy = Math.ceil(cY * DSF - 1e-9);
    const b = boxS.split(",").map(Number);
    const fd = field(load(png), ch);
    const E = edges(fd, [Math.round(b[0] - ox), Math.round(b[1] - oy), Math.round(b[2] - ox), Math.round(b[3] - oy)], Number(mC), Number(Ws));
    E.sort((a, c) => c.slope - a.slope);
    const ws = E.map((e) => e.w).sort((a, c) => a - c);
    console.log(`${png.split(/[\\/]/).slice(-2).join("/")} ${ch}: ${E.length} edge px (contrast >= ${mC}); w10-90 min ${ws[0]?.toFixed(2)} p10 ${ws[Math.floor(0.1 * ws.length)]?.toFixed(2)} med ${ws[Math.floor(0.5 * ws.length)]?.toFixed(2)}; the 8 steepest:`);
    for (const e of E.slice(0, 8)) console.log(`  ${fmt(e, ox, oy)}`);
  }
}
