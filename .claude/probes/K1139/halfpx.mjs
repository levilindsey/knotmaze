// K1139 Stage 3 S3.3, the half-pixel suspicion: is the GPU's band edge
// offset from the twin's, sub-pixel? From diag_s3b.mjs's dumps (fa32 for
// the unquantized crest where present). A fan pixel (d != dw) with
// exactly one band in its AA ramp (0.05 < cov < 0.95, the twin's cov from
// dnow) and every other band at cov 0 reads debug 5's G = 255 cr cov on
// the GPU, so cov_gpu = G / (255 cr). If the GPU evaluates the field at
// p + s (world) and its distance carries a bias b, then
//   (cov_twin - cov_gpu) pxW = n.s + b,
// n the unit outward normal from the band's nearest foot. Least squares
// over the pixels gives s (reported in world, CSS and device px) and b
// (device px); the residual says whether a shift explains the ramp.
// Also: the interior ratio G / (255 cr) at cov 1 (a scale check), and
// mean cov_gpu - cov_twin by normal direction (8 screen-space octants).
// THE STRIP TEST: the twin evaluates every pixel as a fan fragment
// (fieldProbe.at(..., strip = false)), but a cover strip's fragment uses
// reach = fh + (ROUTE_BAND_PAD + 1) pxW = fh + 1.5 pxW (junction_field.ts
// junctionField), its band edge 1 px further out by design. Each pixel
// near exactly one band's edge (e = (fh + 0.5 pxW - d) / pxW in
// (-0.94, 0.94), every other band's e < -1.5) is classed by which of
// clamp(e) (fan) and clamp(e + 1) (strip) its cov_gpu matches within
// 0.06; the fit above is then repeated on the fan class alone.
//
//   node halfpx.mjs <dumpDir> <ji> [phases=0-7] [crMin=0.3] [px=k:X:Y,...]
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { decodePNG, toRGB } from "./png.mjs";

const [DIR, JI, PHS, CRMIN, PXS] = process.argv.slice(2);
const SHOW = (PXS ?? "").split(",").filter(Boolean).map((t) => t.split(":").map(Number));
const PH = (PHS ?? "0-7").split(",").flatMap((t) => {
  const m = /^(\d+)-(\d+)$/.exec(t);
  if (!m) return [Number(t)];
  const a = [];
  for (let k = Number(m[1]); k <= Number(m[2]); k++) a.push(k);
  return a;
});
const CR_MIN = Number(CRMIN ?? 0.3);
const meta = JSON.parse(readFileSync(join(DIR, "meta.json"), "utf8"));
const A = meta.aff;
const NB = 4, PB = 9, PX = NB * PB + 10;
const PXW = meta.pxW, REACH = meta.fh + 0.5 * PXW;
const rc = meta.recs.find((r) => r.ji === Number(JI));
const { w: BW, h: BH } = rc.box;
const ox = rc.box.x - meta.clip.x * meta.dsf, oy = rc.box.y - meta.clip.y * meta.dsf;
const img = (k, v) => {
  const p = join(DIR, `t${k}_${v}.png`);
  return existsSync(p) ? toRGB(decodePNG(readFileSync(p))) : null;
};
// world <- CSS Jacobian and its inverse (for s in CSS / device px)
const J = [[A.bx, A.cx], [A.by, A.cy]];
const det = J[0][0] * J[1][1] - J[0][1] * J[1][0];
const Ji = [[J[1][1] / det, -J[0][1] / det], [-J[1][0] / det, J[0][0] / det]];
const toCss = (wx, wy) => [Ji[0][0] * wx + Ji[0][1] * wy, Ji[1][0] * wx + Ji[1][1] * wy];
const M = [0, 0, 0, 0, 0, 0, 0, 0, 0], V = [0, 0, 0];
let n = 0, sumY = 0, sumY2 = 0, footMax = 0, fromFa = 0;
const rows = [];
let intN = 0, intR = 0, intR2 = 0;
const oct = Array.from({ length: 8 }, () => ({ n: 0, s: 0 }));
// the strip test
const cls = { fan: [], strip: [], neither: [] };
const MF = [0, 0, 0, 0, 0, 0, 0, 0, 0], VF = [0, 0, 0];
let nF = 0;
const shown = [];
for (const k of PH) {
  const fu = join(DIR, `r${rc.ji}_t${k}.u8`);
  if (!existsSync(fu)) continue;
  const u8 = new Uint8Array(readFileSync(fu));
  const f32 = new Float32Array(readFileSync(join(DIR, `r${rc.ji}_t${k}.f32`)).buffer.slice(0));
  const ffa = join(DIR, `r${rc.ji}_t${k}.fa32`);
  const fa32 = existsSync(ffa) ? new Float32Array(readFileSync(ffa).buffer.slice(0)) : null;
  const gD = img(k, "d"), gDW = img(k, "dw");
  const at = (im, X, Y, c) => {
    const x = X + ox, y = Y + oy;
    if (!im || x < 0 || y < 0 || x >= im.W || y >= im.H) return -1;
    return im.data[(y * im.W + x) * 3 + c];
  };
  for (let Y = 0; Y < BH; Y++)
    for (let X = 0; X < BW; X++) {
      let dd = 0;
      for (let c = 0; c < 3; c++) dd = Math.max(dd, Math.abs(at(gD, X, Y, c) - at(gDW, X, Y, c)));
      if (!dd) continue;
      const i = Y * BW + X;
      {
        const es = rc.bands.map((b, bi) => {
          const d = f32[(i * NB + bi) * 2];
          return d > 1e8 ? -1e9 : (REACH - d) / PXW;
        });
        const crOf = (bi) => (fa32 && fa32[(i * NB + bi) * 2] > -0.5 ? fa32[(i * NB + bi) * 2] : u8[i * PX + bi * PB] / 255);
        const G = at(gD, X, Y, 1);
        if (SHOW.some(([sk, sx, sy]) => sk === k && sx === X && sy === Y))
          shown.push(`  px t${k} (${X}, ${Y}): G ${G}, dd(d,dw) ${dd}; ` + rc.bands.map((b, bi) => `band ${bi} (${b.ia}>${b.ib}${b.shared > 0.5 ? " shared" : ""}) e ${es[bi].toFixed(3)} cr ${crOf(bi).toFixed(4)} fan ${(255 * crOf(bi) * Math.max(0, Math.min(1, es[bi]))).toFixed(1)} strip ${(255 * crOf(bi) * Math.max(0, Math.min(1, es[bi] + 1))).toFixed(1)}`).join("; "));
        const near = es.map((e, bi) => [e, bi]).filter(([e]) => e > -1.5);
        if (near.length === 1 && Math.abs(near[0][0]) < 0.94) {
          const [e, bi] = near[0];
          const cr = crOf(bi);
          if (cr >= CR_MIN) {
            const covG = G / (255 * cr);
            const r0 = covG - Math.max(0, Math.min(1, e)), r1 = covG - Math.max(0, Math.min(1, e + 1));
            const sx = (rc.box.x + X + 0.5) / meta.dsf, sy = (rc.box.y + Y + 0.5) / meta.dsf;
            const px = A.ax + A.bx * sx + A.cx * sy, py = A.ay + A.by * sx + A.cy * sy;
            const rr = Math.hypot(px - rc.c[0], py - rc.c[1]) / meta.fanR;
            const row = { k, X, Y, bi, e, covG, r0, r1, rr };
            if (Math.abs(r0) < 0.06 && Math.abs(r0) < Math.abs(r1)) cls.fan.push(row);
            else if (Math.abs(r1) < 0.06 && Math.abs(r1) < Math.abs(r0)) cls.strip.push(row);
            else cls.neither.push(row);
            if (Math.abs(r0) < 0.06 && Math.abs(r0) < Math.abs(r1) && e > 0.05) {
              // fan-class ramp pixel: the bias fit on its own
              const vs = rc.bands[bi].verts;
              let best = 1e20, fx = 0, fy = 0;
              for (let q = 0; q + 1 < vs.length; q++) {
                const [x0, y0] = vs[q], [x1, y1] = vs[q + 1];
                const ddx = x1 - x0, ddy = y1 - y0, l2 = ddx * ddx + ddy * ddy;
                let u = l2 > 1e-12 ? ((px - x0) * ddx + (py - y0) * ddy) / l2 : 0;
                u = Math.max(0, Math.min(1, u));
                const qx = x0 + ddx * u, qy = y0 + ddy * u, d2 = (px - qx) ** 2 + (py - qy) ** 2;
                if (d2 < best) { best = d2; fx = qx; fy = qy; }
              }
              const dist = Math.sqrt(best);
              if (dist > 1e-6) {
                const a = [(px - fx) / dist, (py - fy) / dist, 1], y = -r0 * PXW;
                for (let r = 0; r < 3; r++) { VF[r] += a[r] * y; for (let c = 0; c < 3; c++) MF[r * 3 + c] += a[r] * a[c]; }
                nF++;
              }
            }
          }
        }
      }
      const covs = rc.bands.map((b, bi) => {
        const d = f32[(i * NB + bi) * 2];
        return d > 1e8 ? 0 : Math.max(0, Math.min(1, (REACH - d) / PXW));
      });
      const on = covs.map((c, bi) => [c, bi]).filter(([c]) => c > 0);
      if (on.length !== 1) continue;
      const [cov, b] = on[0];
      const o = i * PX;
      let cr = u8[o + b * PB] / 255;
      if (fa32 && fa32[(i * NB + b) * 2] > -0.5) { cr = fa32[(i * NB + b) * 2]; fromFa++; }
      if (cr < CR_MIN) continue;
      const G = at(gD, X, Y, 1);
      if (cov >= 0.999) { const r = G / (255 * cr); intN++; intR += r; intR2 += r * r; continue; }
      if (cov < 0.05 || cov > 0.95) continue;
      const covG = G / (255 * cr);
      // the band's nearest foot, for the outward normal
      const sx = (rc.box.x + X + 0.5) / meta.dsf, sy = (rc.box.y + Y + 0.5) / meta.dsf;
      const px = A.ax + A.bx * sx + A.cx * sy, py = A.ay + A.by * sx + A.cy * sy;
      const vs = rc.bands[b].verts;
      let best = 1e20, fx = 0, fy = 0;
      for (let q = 0; q + 1 < vs.length; q++) {
        const [x0, y0] = vs[q], [x1, y1] = vs[q + 1];
        const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy;
        let u = l2 > 1e-12 ? ((px - x0) * dx + (py - y0) * dy) / l2 : 0;
        u = Math.max(0, Math.min(1, u));
        const qx = x0 + dx * u, qy = y0 + dy * u, d2 = (px - qx) ** 2 + (py - qy) ** 2;
        if (d2 < best) { best = d2; fx = qx; fy = qy; }
      }
      const dist = Math.sqrt(best);
      footMax = Math.max(footMax, Math.abs(dist - f32[(i * NB + b) * 2]));
      if (dist < 1e-6) continue;
      const nx = (px - fx) / dist, ny = (py - fy) / dist;
      const y = (cov - covG) * PXW;
      const a = [nx, ny, 1];
      for (let r = 0; r < 3; r++) { V[r] += a[r] * y; for (let c = 0; c < 3; c++) M[r * 3 + c] += a[r] * a[c]; }
      n++; sumY += y; sumY2 += y * y;
      // octant of the normal in screen space
      const [cxs, cys] = toCss(nx, ny);
      const ang = Math.atan2(cys, cxs);
      const oi = ((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8;
      oct[oi].n++; oct[oi].s += covG - cov;
      rows.push({ k, X, Y, b, nx, ny, y });
    }
}
const solve3 = (m, v) => {
  const a = [m.slice(0, 3).concat(v[0]), m.slice(3, 6).concat(v[1]), m.slice(6, 9).concat(v[2])];
  for (let c = 0; c < 3; c++) {
    let p = c;
    for (let r = c + 1; r < 3; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    [a[c], a[p]] = [a[p], a[c]];
    for (let r = 0; r < 3; r++) if (r !== c) { const f = a[r][c] / a[c][c]; for (let q = c; q < 4; q++) a[r][q] -= f * a[c][q]; }
  }
  return [a[0][3] / a[0][0], a[1][3] / a[1][1], a[2][3] / a[2][2]];
};
console.log(`ji ${rc.ji} phases ${PH.join(",")}: ramp px ${n} (crest from fa32 ${fromFa ? "yes" : "no"}), |dist - dnow| max ${footMax.toExponential(2)}`);
{
  const q = (a, f) => { if (!a.length) return "-"; const s = a.map(f).sort((x, y) => x - y); return `${s[0].toFixed(2)} / ${s[s.length >> 1].toFixed(2)} / ${s[s.length - 1].toFixed(2)}`; };
  const mean = (a, f) => (a.length ? a.reduce((s, r) => s + f(r), 0) / a.length : NaN);
  console.log(`  STRIP TEST (one band near its edge, e in (-0.94, 0.94)): fan-class ${cls.fan.length}, strip-class ${cls.strip.length}, neither ${cls.neither.length}`);
  console.log(`    fan:   mean residual vs fan ${mean(cls.fan, (r) => r.r0).toFixed(3)}, r/fanR min/med/max ${q(cls.fan, (r) => r.rr)}`);
  console.log(`    strip: mean residual vs strip ${mean(cls.strip, (r) => r.r1).toFixed(3)}, r/fanR min/med/max ${q(cls.strip, (r) => r.rr)}`);
  if (cls.neither.length) console.log(`    neither: mean r0 ${mean(cls.neither, (r) => r.r0).toFixed(3)} r1 ${mean(cls.neither, (r) => r.r1).toFixed(3)}, r/fanR ${q(cls.neither, (r) => r.rr)}; first ${cls.neither.slice(0, 6).map((r) => `t${r.k}(${r.X},${r.Y}) e ${r.e.toFixed(2)} covG ${r.covG.toFixed(2)}`).join(", ")}`);
  const byK = {};
  for (const r of cls.strip) byK[r.k] = (byK[r.k] ?? 0) + 1;
  console.log(`    strip-class by phase ${JSON.stringify(byK)}; first ${cls.strip.slice(0, 6).map((r) => `t${r.k}(${r.X},${r.Y})`).join(" ")}`);
  if (nF >= 10) {
    const [fx, fy, fb] = (() => {
      const a = [MF.slice(0, 3).concat(VF[0]), MF.slice(3, 6).concat(VF[1]), MF.slice(6, 9).concat(VF[2])];
      for (let c = 0; c < 3; c++) {
        let p = c;
        for (let r = c + 1; r < 3; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
        [a[c], a[p]] = [a[p], a[c]];
        for (let r = 0; r < 3; r++) if (r !== c) { const f = a[r][c] / a[c][c]; for (let qq = c; qq < 4; qq++) a[r][qq] -= f * a[c][qq]; }
      }
      return [a[0][3] / a[0][0], a[1][3] / a[1][1], a[2][3] / a[2][2]];
    })();
    const [cfx, cfy] = toCss(fx, fy);
    console.log(`    fan class alone (${nF} ramp px, e > 0.05): shift device px (${(cfx * meta.dsf).toFixed(3)}, ${(cfy * meta.dsf).toFixed(3)}), bias ${(fb / PXW).toFixed(3)} px`);
  }
  for (const s of shown) console.log(s);
}
if (intN) {
  const m = intR / intN;
  console.log(`  interior (cov 1, one band): ${intN} px, G/(255 cr) mean ${m.toFixed(4)} sd ${Math.sqrt(Math.max(0, intR2 / intN - m * m)).toFixed(4)}`);
}
if (n < 10) { console.log("  too few ramp px"); process.exit(0); }
const [sx, sy, b] = solve3(M, V);
let res2 = 0;
for (const r of rows) res2 += (r.y - (r.nx * sx + r.ny * sy + b)) ** 2;
const [csx, csy] = toCss(sx, sy);
const meanY = sumY / n;
console.log(`  bias only: mean (cov_gpu - cov_twin) ${(-meanY / PXW).toFixed(3)} px, rms ${(Math.sqrt(sumY2 / n) / PXW).toFixed(3)} px`);
console.log(`  shift + bias: s world (${sx.toExponential(3)}, ${sy.toExponential(3)}) = CSS (${csx.toFixed(4)}, ${csy.toFixed(4)}) = device px (${(csx * meta.dsf).toFixed(3)}, ${(csy * meta.dsf).toFixed(3)}); b ${(b / PXW).toFixed(3)} px; residual rms ${(Math.sqrt(res2 / n) / PXW).toFixed(3)} px`);
console.log(`  mean cov_gpu - cov_twin by the normal's screen direction (octant: E SE S SW W NW N NE, y down):`);
console.log("   " + oct.map((o, i) => `${["E", "SE", "S", "SW", "W", "NW", "N", "NE"][i]} ${o.n ? (o.s / o.n).toFixed(3) : "-"} (${o.n})`).join("  "));
