// K1191 (Muse batch 19 Run D, task 3): ji 147's unlit arm 1, 276 px.
// From Stage 4's x4 dump (read only): the pixels crotch_fill.mjs counts
// (fan-footprint pixels on the ray of the one arm no pulse band uses,
// arm 1), per phase, against arm 1's strip and the crotch - what the GPU
// draws there, what cover_lib's composite model draws, each band's cov
// and crest there, the fan's base and out, and the crotch fill wW (the
// shader's rule (d) formula, as crotch_fill.mjs computes it).
//   node unlit147.mjs <dumpDir>
import { readFileSync, existsSync } from "fs";
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
const used = new Set();
for (const b of rc.bands) { used.add(b.ia); used.add(b.ib); }
const unlit = rc.arms.map((a, i) => i).filter((i) => !used.has(i));
console.log(`ji 147 centre ${rc.c.join(",")} arms ${rc.arms.length}, bands ${rc.bands.map((b) => `${b.ia}>${b.ib}`).join(" ")}, unlit arms [${unlit.join(",")}]`);
for (const [i, a] of rc.arms.entries()) console.log(`  arm ${i}: chain ${a.chain} slot ${a.slot} dir ${a.dir} d (${a.dx.toFixed(3)},${a.dy.toFixed(3)})${used.has(i) ? "" : "  <- unlit"}`);
const armOf = new Int8Array(n).fill(-1);
const along = new Float32Array(n), perp = new Float32Array(n);
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
    for (const ai of unlit) {
      const a = rc.arms[ai];
      const rx = px - rc.c[0], ry = py - rc.c[1];
      const t = rx * a.dx + ry * a.dy, pp = Math.abs(rx * a.dy - ry * a.dx);
      if (t >= 0.3 && t <= meta.fanR && pp <= 0.8 * meta.fh) { armOf[i] = ai; along[i] = t; perp[i] = pp; }
    }
  }
const kinds = coverage(DIR, rc);
const po = pickOrient(DIR, meta, rc, kinds, [0, 1, 2, 3, 4, 5, 6, 7]);
const stat = (a) => a.length ? `n ${a.length} mean ${(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2)} min ${Math.min(...a).toFixed(2)} max ${Math.max(...a).toFixed(2)}` : "n 0";
let total = 0;
const all = { dGpuModel: [], dGpuTwin: [], fill: [], covMax: [], fMax: [], base: [], out: [], gpu: [], along: [], stripOut: [] };
const kindCount = {};
for (let k = 0; k < 8; k++) {
  const T = loadTwin(DIR, rc.ji, k);
  if (!T) continue;
  const C = composite(DIR, meta, rc, kinds, k, po.or, T);
  const u8 = T.u8, f32 = T.f32;
  let cnt = 0;
  const per = { dGpuModel: [], fill: [] };
  for (let Y = 0; Y < BH; Y++)
    for (let X = 0; X < BW; X++) {
      const i = Y * BW + X;
      if (!C.foot[i] || armOf[i] < 0) continue;
      cnt++; total++;
      const o = i * PX;
      let dShared = 1e20;
      rc.bands.forEach((b, bi) => { if (b.shared > 0.5) dShared = Math.min(dShared, f32[(i * NB + bi) * 2]); });
      let wW = 0, covMax = 0, fMax = 0;
      for (let r = 0; r < rc.bands.length; r++) {
        covMax = Math.max(covMax, u8[o + r * PB + 1]);
        fMax = Math.max(fMax, u8[o + r * PB + 2]);
        const Dr = f32[(i * NB + r) * 2];
        const yr = 1 - ss(0, 3 * meta.pxW, Dr - dShared);
        const fr = rc.bands[r].shared > 0.5 ? 0 : u8[o + r * PB + 2] / 255;
        for (let s = r + 1; s < rc.bands.length; s++) {
          const Ds = f32[(i * NB + s) * 2];
          const R = rc.bands[r], Q = rc.bands[s];
          const fl = Math.abs(R.ia - Q.ia) < 0.5 || Math.abs(R.ib - Q.ib) < 0.5 ? 1 : Math.abs(R.ia - Q.ib) < 0.5 || Math.abs(R.ib - Q.ia) < 0.5 ? -1 : 0;
          const fs = Q.shared > 0.5 ? 0 : u8[o + s * PB + 2] / 255;
          const ys = fs * (1 - ss(0, 3 * meta.pxW, Ds - dShared));
          const sr = sideOf[i * NB + r] * Dr, sq = sideOf[i * NB + s] * Ds;
          wW = Math.max(wW, ss(0, REACH * REACH, -sr * sq * fl) * (1 - ss(0.52, 1.56, Dr + Ds - 2 * REACH)) * Math.min(fr * yr, ys));
        }
      }
      const gpuL = L(C.gpuN[i * 3], C.gpuN[i * 3 + 1], C.gpuN[i * 3 + 2]);
      const modL = L(C.RGB[i * 3], C.RGB[i * 3 + 1], C.RGB[i * 3 + 2]);
      const twinL = L(u8[o + 42], u8[o + 43], u8[o + 44]);
      all.dGpuModel.push(gpuL - modL); all.dGpuTwin.push(gpuL - twinL); all.fill.push(wW);
      all.covMax.push(covMax); all.fMax.push(fMax); all.along.push(along[i]);
      all.base.push(L(u8[o + 36], u8[o + 37], u8[o + 38])); all.out.push(twinL); all.gpu.push(gpuL);
      if (T.s) all.stripOut.push(L(T.s.u8[o + 42], T.s.u8[o + 43], T.s.u8[o + 44]));
      per.dGpuModel.push(gpuL - modL); per.fill.push(wW);
      const c = [0, 1, 2, 3].map((j) => C.cnt[i * 4 + j]);
      const kk = c[3] ? "other" : c[2] === 4 ? "strip x4" : c[1] === 4 ? "fan x4" : `mixed f${c[1]} s${c[2]} n${c[0]}`;
      kindCount[kk] = (kindCount[kk] ?? 0) + 1;
    }
  console.log(`  phase ${k}: arm-${unlit[0]} fan px ${cnt}, luma GPU-model ${stat(per.dGpuModel)}, fill max ${per.fill.length ? Math.max(...per.fill).toFixed(4) : "-"}`);
}
console.log(`total arm-${unlit[0]} fan px (phase-summed) ${total}; sample kinds ${JSON.stringify(kindCount)}`);
console.log(`  along arm (world from centre): ${stat(all.along)} (arm window 0.3..${meta.fanR}, half width ${0.8 * meta.fh})`);
console.log(`  luma GPU - composite model: ${stat(all.dGpuModel)}`);
console.log(`  luma GPU - fan twin out: ${stat(all.dGpuTwin)}`);
console.log(`  crotch fill wW at these px: ${stat(all.fill)}; px with fill > 0.02: ${all.fill.filter((v) => v > 0.02).length}`);
console.log(`  band cov max (0-255): ${stat(all.covMax)}; band f max (0-255): ${stat(all.fMax)}`);
console.log(`  luma fan base: ${stat(all.base)}; fan twin out: ${stat(all.out)}; GPU: ${stat(all.gpu)}; strip-twin out: ${stat(all.stripOut)}`);
