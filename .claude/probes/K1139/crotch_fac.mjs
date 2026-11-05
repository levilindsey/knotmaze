// K1139 Stage 3 S3.2: which factor of (d)'s crotch fill binds at a
// record's wedge pixels (wedge.mjs's definition), offline from
// diag_s3b.mjs's dumps. Per wedge pixel it recomputes, as the shader does:
//   sign = smoothstep(0, reach^2, -sd_1 sd_2 fl)   (sd: dnow signed by the
//          nearest-foot segment's cross product, first strictly nearer wins)
//   ramp = 1 - smoothstep(0.52, E, d_1 + d_2 - 2 reach)
//   f    = min(f_1 y_1, f_2 y_2)                    (f: the dump's ff byte)
// and prints histograms of x = d_1 + d_2 - 2 reach (world), of the sign
// factor, of f, and the fill at E = 1.56 / 2.5 / 3.0.
//
//   node crotch_fac.mjs <dumpDir> <ji> [phases=0-7]
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
const REACH = meta.fh + 0.5 * meta.pxW;
const L = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const img = (k, v) => {
  const p = join(DIR, `t${k}_${v}.png`);
  return existsSync(p) ? toRGB(decodePNG(readFileSync(p))) : null;
};
const rc = meta.recs.find((r) => r.ji === Number(JI));
const { w: BW, h: BH } = rc.box;
const ox = rc.box.x - meta.clip.x * meta.dsf, oy = rc.box.y - meta.clip.y * meta.dsf;
const n = BW * BH;
const FS = 6;
const feet = new Float32Array(n * NB * FS).fill(1e9);
for (let Y = 0; Y < BH; Y++)
  for (let X = 0; X < BW; X++) {
    const sx = (rc.box.x + X + 0.5) / meta.dsf, sy = (rc.box.y + Y + 0.5) / meta.dsf;
    const px = A.ax + A.bx * sx + A.cx * sy, py = A.ay + A.by * sx + A.cy * sy;
    const i = Y * BW + X;
    rc.bands.forEach((b, bi) => {
      let best = 1e20, fx = 0, fy = 0, tx = 1, ty = 0, side = 0;
      for (let k = 0; k + 1 < b.verts.length; k++) {
        const [x0, y0] = b.verts[k], [x1, y1] = b.verts[k + 1];
        const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy;
        const wx = px - x0, wy = py - y0;
        let u = l2 > 1e-12 ? (wx * dx + wy * dy) / l2 : 0;
        u = Math.max(0, Math.min(1, u));
        const ofx = wx - dx * u, ofy = wy - dy * u, dd = ofx * ofx + ofy * ofy;
        if (dd < best) {
          best = dd; fx = x0 + dx * u; fy = y0 + dy * u;
          const l = Math.sqrt(l2) || 1; tx = dx / l; ty = dy / l;
          side = dx * wy - dy * wx;
        }
      }
      const o = (i * NB + bi) * FS;
      feet[o] = Math.sqrt(best); feet[o + 1] = fx - px; feet[o + 2] = fy - py;
      feet[o + 3] = tx; feet[o + 4] = ty; feet[o + 5] = side < 0 ? -1 : 1;
    });
  }
const bins = (edges) => ({ edges, c: new Array(edges.length + 1).fill(0) });
const put = (h, v) => { let j = 0; while (j < h.edges.length && v >= h.edges[j]) j++; h.c[j]++; };
const show = (name, h) => console.log(name, h.edges.map((e, j) => `<${e}:${h.c[j]}`).join(" "), `>=${h.edges[h.edges.length - 1]}:${h.c[h.edges.length]}`);
const hX = bins([0, 0.26, 0.52, 1.0, 1.56, 2.0, 2.5, 3.0]);
const hS = bins([0.001, 0.25, 0.5, 0.75, 0.999]);
const hF = bins([0.001, 0.25, 0.5, 0.75, 0.999]);
const hW = { 1.56: bins([0.001, 0.25, 0.5, 0.75]), 2.5: bins([0.001, 0.25, 0.5, 0.75]), 3.0: bins([0.001, 0.25, 0.5, 0.75]) };
let nW = 0, sumSign0 = 0, sumF0 = 0;
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
      const F = (b, j) => feet[(i * NB + b) * FS + j];
      const d1 = F(b1, 0), d2 = F(b2, 0);
      if (d1 < 1e-6 || d2 < 1e-6) continue;
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
      if (!(lg < ref - 2)) continue;
      nW++;
      const B1 = rc.bands[b1], B2 = rc.bands[b2];
      const fl = Math.abs(B1.ia - B2.ia) < 0.5 || Math.abs(B1.ib - B2.ib) < 0.5 ? 1 : Math.abs(B1.ia - B2.ib) < 0.5 || Math.abs(B1.ib - B2.ia) < 0.5 ? -1 : 0;
      // The shader's own distances (dump f32), signed by the recomputed side.
      const D1 = f32[(i * NB + b1) * 2], D2 = f32[(i * NB + b2) * 2];
      const sd1 = F(b1, 5) * D1, sd2 = F(b2, 5) * D2;
      const sign = ss(0, REACH * REACH, -sd1 * sd2 * fl);
      const x = D1 + D2 - 2 * REACH;
      const fm = Math.min(u8[o + b1 * PB + 2], u8[o + b2 * PB + 2]) / 255;
      put(hX, x); put(hS, sign); put(hF, fm);
      if (sign < 0.001) sumSign0++;
      if (fm < 0.001) sumF0++;
      for (const E of [1.56, 2.5, 3.0]) put(hW[E], sign * (1 - ss(0.52, E, x)) * fm);
    }
}
console.log(`ji ${rc.ji} phases ${PH.join(",")}: wedge px ${nW}, reach ${REACH.toFixed(4)}, sign 0 at ${sumSign0}, f 0 at ${sumF0}`);
show("x (world)", hX);
show("sign", hS);
show("f=min(ff)", hF);
for (const E of [1.56, 2.5, 3.0]) show(`fill E=${E}`, hW[E]);
