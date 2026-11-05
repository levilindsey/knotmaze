// K1191 (Run D, task 3, detail): the arm-1 pixels where the GPU departs
// most from ji 147's fan twin, and why the crotch fill is exactly 0 at
// every arm-1 pixel (which of its three factors zeroes it).
//   node unlit147_detail.mjs <dumpDir>
import { readFileSync } from "fs";
import { join } from "path";
import { coverage, composite, loadTwin, pickOrient } from "./cover_lib.mjs";

const DIR = process.argv[2];
const meta = JSON.parse(readFileSync(join(DIR, "meta.json"), "utf8"));
const A = meta.aff;
const NB = 4, PB = 9, PX = NB * PB + 10;
const REACH = meta.fh + 0.5 * meta.pxW;
const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const L = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const rc = meta.recs.find((r) => r.ji === 147);
const { w: BW, h: BH } = rc.box;
const n = BW * BH;
const a1 = rc.arms[1];
const armOf = new Int8Array(n).fill(-1);
const sideOf = new Int8Array(n * NB);
for (let Y = 0; Y < BH; Y++)
  for (let X = 0; X < BW; X++) {
    const sx = (rc.box.x + X + 0.5) / meta.dsf, sy = (rc.box.y + Y + 0.5) / meta.dsf;
    const px = A.ax + A.bx * sx + A.cx * sy, py = A.ay + A.by * sx + A.cy * sy;
    const i = Y * BW + X;
    rc.bands.forEach((b, bi) => {
      let best = 1e20, side = 0;
      for (let k = 0; k + 1 < b.verts.length; k++) {
        const [x0, y0] = b.verts[k], [x1, y1] = b.verts[k + 1];
        const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy;
        const wx = px - x0, wy = py - y0;
        let u = l2 > 1e-12 ? (wx * dx + wy * dy) / l2 : 0;
        u = Math.max(0, Math.min(1, u));
        const ofx = wx - dx * u, ofy = wy - dy * u, dd = ofx * ofx + ofy * ofy;
        if (dd < best) { best = dd; side = dx * wy - dy * wx; }
      }
      sideOf[i * NB + bi] = side < 0 ? -1 : 1;
    });
    const rx = px - rc.c[0], ry = py - rc.c[1];
    const t = rx * a1.dx + ry * a1.dy, pp = Math.abs(rx * a1.dy - ry * a1.dx);
    if (t >= 0.3 && t <= meta.fanR && pp <= 0.8 * meta.fh) armOf[i] = 1;
  }
const kinds = coverage(DIR, rc);
const po = pickOrient(DIR, meta, rc, kinds, [0, 1, 2, 3, 4, 5, 6, 7]);
const worst = [];
let fSide = 0, fDist = 0, fMin = 0, nPx = 0;
const gapStats = [];
for (let k = 0; k < 8; k++) {
  const T = loadTwin(DIR, rc.ji, k);
  if (!T) continue;
  const C = composite(DIR, meta, rc, kinds, k, po.or, T);
  const u8 = T.u8, f32 = T.f32;
  for (let Y = 0; Y < BH; Y++)
    for (let X = 0; X < BW; X++) {
      const i = Y * BW + X;
      if (!C.foot[i] || armOf[i] < 0) continue;
      nPx++;
      const o = i * PX;
      let dShared = 1e20;
      rc.bands.forEach((b, bi) => { if (b.shared > 0.5) dShared = Math.min(dShared, f32[(i * NB + bi) * 2]); });
      const Dr = f32[(i * NB + 0) * 2], Ds = f32[(i * NB + 1) * 2];
      const sideTerm = ss(0, REACH * REACH, -sideOf[i * NB] * Dr * sideOf[i * NB + 1] * Ds * 1);
      const distTerm = 1 - ss(0.52, 1.56, Dr + Ds - 2 * REACH);
      const fr = u8[o + 2] / 255, fs = u8[o + PB + 2] / 255;
      const yr = 1 - ss(0, 3 * meta.pxW, Dr - dShared), ys = 1 - ss(0, 3 * meta.pxW, Ds - dShared);
      const minTerm = Math.min(fr * yr, fs * ys);
      if (sideTerm === 0) fSide++;
      if (distTerm === 0) fDist++;
      if (minTerm === 0) fMin++;
      gapStats.push(Dr + Ds - 2 * REACH);
      const gpuL = L(C.gpuN[i * 3], C.gpuN[i * 3 + 1], C.gpuN[i * 3 + 2]);
      const twinL = L(u8[o + 42], u8[o + 43], u8[o + 44]);
      const wL = L(C.at(C.gW, X, Y, 0), C.at(C.gW, X, Y, 1), C.at(C.gW, X, Y, 2));
      const c = [0, 1, 2, 3].map((j) => C.cnt[i * 4 + j]);
      worst.push({ k, X, Y, d: gpuL - twinL, gpuL, twinL, wL, kinds: `n${c[0]} f${c[1]} s${c[2]} o${c[3]}`, sideTerm, distTerm, minTerm });
    }
}
worst.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
console.log(`arm-1 px (phase-summed) ${nPx}; fill factors zero: side ${fSide}, distance ${fDist}, min(f*y) ${fMin}`);
gapStats.sort((a, b) => a - b);
console.log(`  Dr+Ds-2*reach (world): min ${gapStats[0].toFixed(3)} med ${gapStats[Math.floor(gapStats.length / 2)].toFixed(3)} max ${gapStats[gapStats.length - 1].toFixed(3)} (dist term dies at 1.56)`);
console.log("worst |GPU - fan twin| arm-1 px:");
for (const w of worst.slice(0, 12)) console.log(`  t${w.k} (${w.X},${w.Y}) GPU ${w.gpuL.toFixed(1)} twin ${w.twinL.toFixed(1)} webs-off ${w.wL.toFixed(1)} d ${w.d.toFixed(1)} samples ${w.kinds} fillFactors side ${w.sideTerm.toFixed(3)} dist ${w.distTerm.toFixed(3)} min ${w.minTerm.toFixed(3)}`);
const near = worst.filter((w) => Math.abs(w.d) <= 2).length;
console.log(`arm-1 px with |GPU - fan twin| <= 2: ${near} of ${nPx}`);
