// K1139 Stage 3 S3.3: do the cover strips' pad explain the GPU's extra
// wedges? wedge.mjs's rule verbatim (fan pixels between the two nearest
// drawing bands, darker in luma than both bands' pc by more than 2/255),
// then each GPU-only wedge pixel (the twin's out is not a wedge there) is
// binned by e = max over drawing bands of (fh + 0.5 pxW - dnow) / pxW, the
// pixel's depth inside the nearest band edge in device px as the twin
// draws it (e > 0 inside the fan reach; a cover strip reaches 1 px further,
// e > -1). A GPU-only wedge with e < -1.5 lies beyond any strip's reach,
// so the strip pad cannot explain it. Also: the luma GPU - twin there.
//
//   node wedge_strip.mjs <dumpDir> <ji> [phases=0-7]
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { decodePNG, toRGB } from "./png.mjs";

const [DIR, JI, PHS] = process.argv.slice(2);
const PH = (PHS ?? "0-7").split(",").flatMap((t) => {
  const m = /^(\d+)-(\d+)$/.exec(t);
  if (!m) return [Number(t)];
  const a = [];
  for (let k = Number(m[1]); k <= Number(m[2]); k++) a.push(k);
  return a;
});
const meta = JSON.parse(readFileSync(join(DIR, "meta.json"), "utf8"));
const A = meta.aff;
const NB = 4, PB = 9, PX = NB * PB + 10;
const REACH = meta.fh + 0.5 * meta.pxW, PXW = meta.pxW;
const L = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const img = (k, v) => {
  const p = join(DIR, `t${k}_${v}.png`);
  return existsSync(p) ? toRGB(decodePNG(readFileSync(p))) : null;
};
const rc = meta.recs.find((r) => r.ji === Number(JI));
const { w: BW, h: BH } = rc.box;
const ox = rc.box.x - meta.clip.x * meta.dsf, oy = rc.box.y - meta.clip.y * meta.dsf;
const n = BW * BH;
const FS = 5;
const feet = new Float32Array(n * NB * FS).fill(1e9);
for (let Y = 0; Y < BH; Y++)
  for (let X = 0; X < BW; X++) {
    const sx = (rc.box.x + X + 0.5) / meta.dsf, sy = (rc.box.y + Y + 0.5) / meta.dsf;
    const px = A.ax + A.bx * sx + A.cx * sy, py = A.ay + A.by * sx + A.cy * sy;
    const i = Y * BW + X;
    rc.bands.forEach((b, bi) => {
      if (b.shared > 0.5) return;
      let best = 1e20, fx = 0, fy = 0, tx = 1, ty = 0;
      for (let k = 0; k + 1 < b.verts.length; k++) {
        const [x0, y0] = b.verts[k], [x1, y1] = b.verts[k + 1];
        const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy;
        let u = l2 > 1e-12 ? ((px - x0) * dx + (py - y0) * dy) / l2 : 0;
        u = Math.max(0, Math.min(1, u));
        const qx = x0 + dx * u, qy = y0 + dy * u, dd = (px - qx) ** 2 + (py - qy) ** 2;
        if (dd < best) { best = dd; fx = qx; fy = qy; const l = Math.sqrt(l2) || 1; tx = dx / l; ty = dy / l; }
      }
      feet[(i * NB + bi) * FS] = Math.sqrt(best);
      feet[(i * NB + bi) * FS + 1] = fx - px;
      feet[(i * NB + bi) * FS + 2] = fy - py;
      feet[(i * NB + bi) * FS + 3] = tx;
      feet[(i * NB + bi) * FS + 4] = ty;
    });
  }
const T = { gpu: 0, twin: 0, both: 0, gOnly: 0, cOnly: 0, bins: { "e<-1.5": 0, "-1.5..-0.5": 0, "-0.5..0": 0, "e>=0": 0 }, dL: [], dLc: [], bare: 0 };
for (const k of PH) {
  const fu = join(DIR, `r${rc.ji}_t${k}.u8`);
  if (!existsSync(fu)) continue;
  const u8 = new Uint8Array(readFileSync(fu));
  const f32 = new Float32Array(readFileSync(join(DIR, `r${rc.ji}_t${k}.f32`)).buffer.slice(0));
  const gN = img(k, "n"), gW = img(k, "w"), gD = img(k, "d"), gDW = img(k, "dw");
  const at = (im, X, Y, c) => {
    const x = X + ox, y = Y + oy;
    if (!im || x < 0 || y < 0 || x >= im.W || y >= im.H) return -1;
    return im.data[(y * im.W + x) * 3 + c];
  };
  const foot = new Uint8Array(n);
  for (let Y = 0; Y < BH; Y++)
    for (let X = 0; X < BW; X++) {
      let d = 0;
      for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(at(gD, X, Y, c) - at(gDW, X, Y, c)), Math.abs(at(gN, X, Y, c) - at(gW, X, Y, c)));
      if (d > 0) foot[Y * BW + X] = 1;
    }
  for (let Y = 1; Y < BH - 1; Y++)
    for (let X = 1; X < BW - 1; X++) {
      const i = Y * BW + X;
      let ok = 1;
      for (let dy = -1; dy <= 1 && ok; dy++)
        for (let dx = -1; dx <= 1; dx++) if (!foot[(Y + dy) * BW + X + dx]) { ok = 0; break; }
      if (!ok) continue;
      let b1 = -1, b2 = -1;
      for (let b = 0; b < rc.bands.length; b++) {
        if (rc.bands[b].shared > 0.5) continue;
        const d = feet[(i * NB + b) * FS];
        if (b1 < 0 || d < feet[(i * NB + b1) * FS]) { b2 = b1; b1 = b; }
        else if (b2 < 0 || d < feet[(i * NB + b2) * FS]) b2 = b;
      }
      if (b2 < 0) continue;
      const d1 = feet[(i * NB + b1) * FS], d2 = feet[(i * NB + b2) * FS];
      if (d1 < 1e-6 || d2 < 1e-6) continue;
      const F = (b, j) => feet[(i * NB + b) * FS + j];
      const q1x = F(b1, 1), q1y = F(b1, 2), q2x = F(b2, 1), q2y = F(b2, 2);
      const sep = Math.hypot(q2x - q1x, q2y - q1y);
      if (sep < 0.5 * (d1 + d2) || sep < 1e-4) continue;
      const s1p = F(b1, 3) * -q1y - F(b1, 4) * -q1x, s1q = F(b1, 3) * (q2y - q1y) - F(b1, 4) * (q2x - q1x);
      const s2p = F(b2, 3) * -q2y - F(b2, 4) * -q2x, s2q = F(b2, 3) * (q1y - q2y) - F(b2, 4) * (q1x - q2x);
      if (s1p * s1q <= 0 || s2p * s2q <= 0) continue;
      const o = i * PX;
      const pc = (b) => L(u8[o + b * PB + 6], u8[o + b * PB + 7], u8[o + b * PB + 8]);
      const ref = Math.min(pc(b1), pc(b2));
      const lg = L(at(gN, X, Y, 0), at(gN, X, Y, 1), at(gN, X, Y, 2));
      const lc = L(u8[o + 42], u8[o + 43], u8[o + 44]);
      const wg = lg < ref - 2, wc = lc < ref - 2;
      if (wg) T.gpu++;
      if (wc) T.twin++;
      if (wg && wc) T.both++;
      if (!wg && wc) T.cOnly++;
      if (wg && !wc) {
        T.gOnly++;
        let e = -1e9;
        rc.bands.forEach((b, bi) => { if (b.shared < 0.5) e = Math.max(e, (REACH - f32[(i * NB + bi) * 2]) / PXW); });
        T.bins[e < -1.5 ? "e<-1.5" : e < -0.5 ? "-1.5..-0.5" : e < 0 ? "-0.5..0" : "e>=0"]++;
        T.dL.push(lg - lc);
        if (u8[o + b1 * PB + 1] === 0 && u8[o + b2 * PB + 1] === 0) T.bare++;
      }
      if (wg && wc) T.dLc.push(lg - lc);
    }
}
const st = (a) => {
  if (!a.length) return "-";
  const s = [...a].sort((x, y) => x - y);
  return `mean ${(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1)} p10 ${s[Math.floor(0.1 * s.length)].toFixed(1)} med ${s[Math.floor(0.5 * s.length)].toFixed(1)} p90 ${s[Math.floor(0.9 * s.length)].toFixed(1)}`;
};
console.log(`ji ${rc.ji} phases ${PH.join(",")}: wedges GPU ${T.gpu}, twin ${T.twin}, both ${T.both}, GPU only ${T.gOnly}, twin only ${T.cOnly}`);
console.log(`  GPU-only by e (px inside the nearest band edge as the twin draws it): ${JSON.stringify(T.bins)}; of them bare (both bands cov 0 in the twin) ${T.bare}`);
console.log(`  luma GPU - twin on GPU-only wedges: ${st(T.dL)}; on shared wedges: ${st(T.dLc)}`);
