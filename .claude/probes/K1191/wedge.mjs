// K1191 copy (Muse batch 19 Run D, 2026-11-04): verbatim copy from .claude/probes/K1139/wedge.mjs - stand links, ports and outputs unchanged in the copy; Run D reads Stage 4's dumps with it and changes nothing under K1139. (png.mjs/lib.mjs copied as these tools' imports.)
// K1139 S3b fix: the wedge count of the brief's section 5, offline from
// diag_s3b.mjs's dumps. A WEDGE pixel is a fan pixel (the webs' footprint,
// its AA rim excluded) whose two nearest DRAWING bands have their feet on
// opposite sides of it (cos of the angle foot1-p-foot2 < -0.5: between
// two bands) and that reads darker, in luma, than both bands' own paint
// at their projections (pc: the arms' composed A->B blend at the foot's
// tau, what the arms' ribbons show there) by more than 2/255.
//
//   node wedge.mjs <dumpDir> [phases=0-7] [ji,ji,...]
//
// Prints per record and phase: between px, wedge px (GPU), wedge px (CPU
// twin), and the wedge pixels' mean luma: GPU, CPU out, min pc, min pq.
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { decodePNG, toRGB } from "./png.mjs";

const DIR = process.argv[2];
const PH = (process.argv[3] ?? "0-7").split(",").flatMap((t) => {
  const m = /^(\d+)-(\d+)$/.exec(t);
  if (!m) return [Number(t)];
  const a = [];
  for (let k = Number(m[1]); k <= Number(m[2]); k++) a.push(k);
  return a;
});
const ONLY = process.argv[4] ? process.argv[4].split(",").map(Number) : null;
const meta = JSON.parse(readFileSync(join(DIR, "meta.json"), "utf8"));
const A = meta.aff;
const NB = 4, PB = 9, PX = NB * PB + 10;
const L = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const img = (k, v) => {
  const p = join(DIR, `t${k}_${v}.png`);
  return existsSync(p) ? toRGB(decodePNG(readFileSync(p))) : null;
};
const tot = {};
for (const rc of meta.recs) {
  if (!rc.bands || rc.bands.filter((b) => b.shared < 0.5).length < 2) continue;
  if (ONLY && !ONLY.includes(rc.ji)) continue;
  const { w: BW, h: BH } = rc.box;
  const ox = rc.box.x - meta.clip.x * meta.dsf, oy = rc.box.y - meta.clip.y * meta.dsf;
  const n = BW * BH;
  // Each pixel's foot on every band (world), once per record.
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
  for (const k of PH) {
    const fu = join(DIR, `r${rc.ji}_t${k}.u8`);
    if (!existsSync(fu)) continue;
    const u8 = new Uint8Array(readFileSync(fu));
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
    let nBetween = 0, nG = 0, nC = 0, sG = 0, sC = 0, sPc = 0, sPq = 0, nBare = 0;
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
        // Between: p lies on b2's side of b1 and on b1's side of b2 (feet
        // relative to p: q - p), the two feet well apart.
        const F = (b, j) => feet[(i * NB + b) * FS + j];
        const q1x = F(b1, 1), q1y = F(b1, 2), q2x = F(b2, 1), q2y = F(b2, 2);
        const sep = Math.hypot(q2x - q1x, q2y - q1y);
        if (sep < 0.5 * (d1 + d2) || sep < 1e-4) continue;
        const s1p = F(b1, 3) * -q1y - F(b1, 4) * -q1x, s1q = F(b1, 3) * (q2y - q1y) - F(b1, 4) * (q2x - q1x);
        const s2p = F(b2, 3) * -q2y - F(b2, 4) * -q2x, s2q = F(b2, 3) * (q1y - q2y) - F(b2, 4) * (q1x - q2x);
        if (s1p * s1q <= 0 || s2p * s2q <= 0) continue;
        nBetween++;
        const o = i * PX;
        const pc = (b) => L(u8[o + b * PB + 6], u8[o + b * PB + 7], u8[o + b * PB + 8]);
        const pq = (b) => L(u8[o + b * PB + 3], u8[o + b * PB + 4], u8[o + b * PB + 5]);
        const ref = Math.min(pc(b1), pc(b2));
        const lg = L(at(gN, X, Y, 0), at(gN, X, Y, 1), at(gN, X, Y, 2));
        const lc = L(u8[o + 42], u8[o + 43], u8[o + 44]);
        if (lc < ref - 2) nC++;
        if (lg < ref - 2) {
          nG++; sG += lg; sC += lc; sPc += ref; sPq += Math.min(pq(b1), pq(b2));
          if (u8[o + b1 * PB + 1] === 0 && u8[o + b2 * PB + 1] === 0) nBare++;
        }
      }
    const row = { ji: rc.ji, k, between: nBetween, wedgeG: nG, wedgeC: nC, bare: nBare,
      Lgpu: nG ? +(sG / nG).toFixed(1) : null, Lcpu: nG ? +(sC / nG).toFixed(1) : null,
      Lpc: nG ? +(sPc / nG).toFixed(1) : null, Lpq: nG ? +(sPq / nG).toFixed(1) : null };
    console.log(JSON.stringify(row));
    const t = (tot[rc.ji] ??= { wedgeG: 0, wedgeC: 0 });
    t.wedgeG += nG; t.wedgeC += nC;
  }
}
console.log("totals " + JSON.stringify(tot));
