// K1191 (Muse batch 19 Run D, task 4): ji 147's 52 GPU-only wedges,
// pixel by pixel. wedge_s4.mjs's selection verbatim (its fan-pixel,
// between-two-drawing-bands census with the composite cover model), but
// every GPU-only pixel is listed: phase, box px, e bin, sample kinds,
// the GPU's luma, the composite model's luma, the fan twin's luma, the
// census reference (the nearer band's own paint pc) and both margins.
// Then the threshold test: at census lines T = 2, 1.5, 1, 0.5, 0 (a
// pixel is a wedge when its luma < ref - T), how many of the 52 stay
// GPU-only - the handoff's inference is that the GPU sits under 1 luma
// darker than the model, across the 2/255 line.
//   node wedges52.mjs <dumpDir>
import { readFileSync } from "fs";
import { join } from "path";
import { coverage, composite, loadTwin, pickOrient, NB, PB, PX } from "./cover_lib.mjs";

const DIR = process.argv[2];
const meta = JSON.parse(readFileSync(join(DIR, "meta.json"), "utf8"));
const A = meta.aff;
const REACH = meta.fh + 0.5 * meta.pxW;
const L = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const rc = meta.recs.find((r) => r.ji === 147);
const { w: BW, h: BH } = rc.box;
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
const kinds = coverage(DIR, rc);
const po = pickOrient(DIR, meta, rc, kinds, [0, 1, 2, 3, 4, 5, 6, 7]);
const rows = [];
for (let k = 0; k < 8; k++) {
  const T = loadTwin(DIR, rc.ji, k);
  if (!T) continue;
  const C = composite(DIR, meta, rc, kinds, k, po.or, T);
  const { u8, f32 } = T;
  for (let Y = 1; Y < BH - 1; Y++)
    for (let X = 1; X < BW - 1; X++) {
      const i = Y * BW + X;
      let ok = 1;
      for (let dy = -1; dy <= 1 && ok; dy++)
        for (let dx = -1; dx <= 1; dx++) if (!C.foot[(Y + dy) * BW + X + dx]) { ok = 0; break; }
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
      const lg = L(C.gpuN[i * 3], C.gpuN[i * 3 + 1], C.gpuN[i * 3 + 2]);
      const lm = L(C.RGB[i * 3], C.RGB[i * 3 + 1], C.RGB[i * 3 + 2]);
      const lf = L(u8[o + 42], u8[o + 43], u8[o + 44]);
      if (!(lg < ref - 2 && !(lm < ref - 2))) continue;
      const c = [0, 1, 2, 3].map((j) => C.cnt[i * 4 + j]);
      if (c[3]) continue; // wedge_s4 scores the composite only on unmasked px
      let e = -1e9;
      rc.bands.forEach((b, bi) => { if (b.shared < 0.5) e = Math.max(e, (REACH - f32[(i * NB + bi) * 2]) / meta.pxW); });
      const kk = c[1] === 4 ? "fan x4" : c[2] === 4 ? "strip x4" : `mixed f${c[1]} s${c[2]} n${c[0]}`;
      rows.push({ k, X, Y, e, kk, lg, lm, lf, ref });
    }
}
console.log(`ji 147 GPU-only wedges (composite): ${rows.length}`);
for (const r of rows) console.log(`  t${r.k} (${r.X},${r.Y}) e ${r.e.toFixed(2)} ${r.kk} GPU ${r.lg.toFixed(2)} model ${r.lm.toFixed(2)} fan ${r.lf.toFixed(2)} ref ${r.ref.toFixed(2)} ref-GPU ${(r.ref - r.lg).toFixed(2)} ref-model ${(r.ref - r.lm).toFixed(2)} GPU-model ${(r.lg - r.lm).toFixed(2)}`);
const byPhase = {}, byKind = {};
for (const r of rows) { byPhase[r.k] = (byPhase[r.k] ?? 0) + 1; byKind[r.kk] = (byKind[r.kk] ?? 0) + 1; }
console.log(`by phase ${JSON.stringify(byPhase)}; by kind ${JSON.stringify(byKind)}`);
const d = rows.map((r) => r.lg - r.lm).sort((a, b) => a - b);
console.log(`GPU-model: min ${d[0].toFixed(2)} p10 ${d[Math.floor(0.1 * d.length)].toFixed(2)} med ${d[Math.floor(0.5 * d.length)].toFixed(2)} p90 ${d[Math.floor(0.9 * d.length)].toFixed(2)} max ${d[d.length - 1].toFixed(2)}`);
const rm = rows.map((r) => r.ref - r.lm).sort((a, b) => a - b);
console.log(`ref-model: min ${rm[0].toFixed(2)} med ${rm[Math.floor(0.5 * rm.length)].toFixed(2)} max ${rm[rm.length - 1].toFixed(2)}`);
for (const T of [2, 1.5, 1, 0.5, 0]) {
  const stay = rows.filter((r) => r.lg < r.ref - T && !(r.lm < r.ref - T)).length;
  console.log(`census line T=${T}: ${stay} of ${rows.length} stay GPU-only`);
}
