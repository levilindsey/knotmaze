// K1191 copy (Muse batch 19 Run D, 2026-11-04): verbatim copy from .claude/probes/K1139/wedge_s4.mjs - stand links, ports and outputs unchanged in the copy; Run D reads Stage 4's dumps with it and changes nothing under K1139. (png.mjs/lib.mjs copied as these tools' imports.)
// K1139 Stage 4 (4.2 tasks 2-3): the wedge census with the cover strips.
// wedge_strip.mjs's selection verbatim (fan pixels, 3x3 in the foot,
// between the two nearest drawing bands, darker in luma than both bands'
// pc by more than 2/255), scored twice:
//   fan-only  - the twin's out (strip = false) at every pixel, as Stage 3;
//   composite - cover_lib's per-sample model (this fan's twin, this
//               record's cover strip's twin, or the webs-off frame); pixels
//               with another record's sample are masked and counted.
// Each GPU-only wedge is binned by e (px inside the nearest band edge as
// the fan draws it, wedge_strip's bins) and by its sample kinds, with the
// luma GPU - model there, and whether the GPU equals the webs-off frame.
//   node wedge_s4.mjs <dumpDir> <ji> [phases=0-7]
import { readFileSync } from "fs";
import { join } from "path";
import { coverage, composite, loadTwin, pickOrient, owners, NB, PB, PX } from "./cover_lib.mjs";

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
const REACH = meta.fh + 0.5 * meta.pxW, PXW = meta.pxW;
const L = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const rc = meta.recs.find((r) => r.ji === Number(JI));
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
const po = pickOrient(DIR, meta, rc, kinds, PH);
// Which record's primitive wins the other-record samples of the
// beyond-reach GPU-only wedges (the fan-only scoring), by aRec.
const own = owners(DIR, rc, po.or);
const farOwners = {};
const mk = () => ({ gpu: 0, mod: 0, both: 0, gOnly: 0, mOnly: 0, bins: { "e<-1.5": 0, "-1.5..-0.5": 0, "-0.5..0": 0, "e>=0": 0 }, kinds: {}, dL: [], dLfar: [], gpuIsDW: 0, gpuIsDWfar: 0, bare: 0, far: 0 });
const R = { fan: mk(), comp: mk() };
let masked = 0, cand = 0;
const kindKey = (c) => (c[3] ? "other record" : c[1] === 4 ? "fan x4" : c[2] === 4 ? "strip x4" : c[0] === 4 ? "none x4 (webs-off)" : `mixed f${c[1]} s${c[2]} n${c[0]}`);
for (const k of PH) {
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
      cand++;
      const o = i * PX;
      const pc = (b) => L(u8[o + b * PB + 6], u8[o + b * PB + 7], u8[o + b * PB + 8]);
      const ref = Math.min(pc(b1), pc(b2));
      const lg = L(C.gpuN[i * 3], C.gpuN[i * 3 + 1], C.gpuN[i * 3 + 2]);
      const lw = L(C.at(C.gW, X, Y, 0), C.at(C.gW, X, Y, 1), C.at(C.gW, X, Y, 2));
      const c = [0, 1, 2, 3].map((j) => C.cnt[i * 4 + j]);
      let e = -1e9;
      rc.bands.forEach((b, bi) => { if (b.shared < 0.5) e = Math.max(e, (REACH - f32[(i * NB + bi) * 2]) / PXW); });
      const bin = e < -1.5 ? "e<-1.5" : e < -0.5 ? "-1.5..-0.5" : e < 0 ? "-0.5..0" : "e>=0";
      const gpuIsDW = Math.abs(lg - lw) < 0.5;
      const score = (S, lm) => {
        const wg = lg < ref - 2, wm = lm < ref - 2;
        if (wg) S.gpu++;
        if (wm) S.mod++;
        if (wg && wm) S.both++;
        if (!wg && wm) S.mOnly++;
        if (wg && !wm) {
          S.gOnly++;
          S.bins[bin]++;
          const kk = kindKey(c);
          S.kinds[kk] = (S.kinds[kk] ?? 0) + 1;
          S.dL.push(lg - lm);
          if (gpuIsDW) S.gpuIsDW++;
          if (u8[o + b1 * PB + 1] === 0 && u8[o + b2 * PB + 1] === 0) S.bare++;
          if (bin === "e<-1.5") {
            S.far++; S.dLfar.push(lg - lm); if (gpuIsDW) S.gpuIsDWfar++; S.farKinds = S.farKinds ?? {}; S.farKinds[kk] = (S.farKinds[kk] ?? 0) + 1;
            if (S === R.fan) for (let s = 0; s < 4; s++) { const r = own[i * 4 + s]; if (r === r && Math.floor(r + 0.5) !== rc.rb) farOwners[r] = (farOwners[r] ?? 0) + 1; }
          }
        }
      };
      score(R.fan, L(u8[o + 42], u8[o + 43], u8[o + 44]));
      if (c[3]) { masked++; continue; }
      score(R.comp, L(C.RGB[i * 3], C.RGB[i * 3 + 1], C.RGB[i * 3 + 2]));
    }
}
const st = (a) => {
  if (!a.length) return "-";
  const s = [...a].sort((x, y) => x - y);
  return `n ${a.length} mean ${(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1)} p10 ${s[Math.floor(0.1 * s.length)].toFixed(1)} med ${s[Math.floor(0.5 * s.length)].toFixed(1)} p90 ${s[Math.floor(0.9 * s.length)].toFixed(1)}`;
};
console.log(`ji ${rc.ji} (${DIR.split(/[\\/]/).pop()}), orientation ${po.or}, phases ${PH.join(",")}: candidate px ${cand}, masked in the composite (another record's sample) ${masked}`);
for (const [name, S] of Object.entries(R)) {
  console.log(`  ${name}: wedges GPU ${S.gpu}, model ${S.mod}, both ${S.both}, GPU only ${S.gOnly}, model only ${S.mOnly}`);
  console.log(`    GPU-only by e: ${JSON.stringify(S.bins)}; bare (both bands cov 0 in the fan twin) ${S.bare}; GPU = webs-off ${S.gpuIsDW}`);
  console.log(`    GPU-only by sample kinds: ${JSON.stringify(S.kinds)}`);
  console.log(`    luma GPU - model on GPU-only: ${st(S.dL)}`);
  if (S.far) console.log(`    beyond strip reach (e < -1.5): ${S.far}, GPU = webs-off ${S.gpuIsDWfar}, kinds ${JSON.stringify(S.farKinds)}, luma GPU - model ${st(S.dLfar)}`);
}
const recName = (r) => { const m = meta.recs.find((x) => x.rb === Math.floor(r + 0.5)); return `${r}${m ? ` (ji ${m.ji})` : ""}`; };
console.log(`  fan-only beyond-reach GPU-only wedges: other-record samples by aRec ${JSON.stringify(Object.fromEntries(Object.entries(farOwners).map(([r, v]) => [recName(Number(r)), v])))}`);
