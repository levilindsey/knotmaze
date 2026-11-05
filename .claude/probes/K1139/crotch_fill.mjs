// K1139 Stage 3 S3.2: (d)'s crotch fill wW over a whole record, offline
// from diag_s3b.mjs's dumps, at far edges E = 1.56 / 2.5 / 3.0 (the dump's
// inputs - ff, dnow, the bands' polylines - do not depend on E). Per pixel,
// over every band pair r < s, as the shader does:
//   max over pairs of smoothstep(0, reach^2, -sd_r sd_s fl)
//     x (1 - smoothstep(0.52, E, d_r + d_s - 2 reach)) x min(f_r y_r, f_s y_s)
// Reports, per phase total: fan pixels with fill > 0.02, of them bare ones
// (every drawing band's cov 0), and for each arm no band uses (an unlit
// arm) the arm pixels (within 0.8 fh of its ray, 0.3 to fanR out) with
// fill > 0.02 and their max fill.
//
//   node crotch_fill.mjs <dumpDir> <ji> [phases=0-7] [outPng]
import { readFileSync, existsSync, writeFileSync } from "fs";
import { join } from "path";
import { decodePNG, toRGB, encodePNG } from "./png.mjs";

const [DIR, JI, PHS, OUTP] = process.argv.slice(2);
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
const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const img = (k, v) => {
  const p = join(DIR, `t${k}_${v}.png`);
  return existsSync(p) ? toRGB(decodePNG(readFileSync(p))) : null;
};
const rc = meta.recs.find((r) => r.ji === Number(JI));
const { w: BW, h: BH } = rc.box;
const ox = rc.box.x - meta.clip.x * meta.dsf, oy = rc.box.y - meta.clip.y * meta.dsf;
const n = BW * BH;
const used = new Set();
for (const b of rc.bands) { used.add(b.ia); used.add(b.ib); }
const unlit = rc.arms.map((a, i) => i).filter((i) => !used.has(i));
const sideOf = new Int8Array(n * NB);
const armOf = new Int8Array(n).fill(-1);
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
      const t = rx * a.dx + ry * a.dy, perp = Math.abs(rx * a.dy - ry * a.dx);
      if (t >= 0.3 && t <= meta.fanR && perp <= 0.8 * meta.fh) armOf[i] = ai;
    }
  }
const ES = [1.56, 2.5, 3.0];
const S = Object.fromEntries(ES.map((E) => [E, { fill: 0, bare: 0, arm: {}, armMax: {} }]));
let footN = 0, armN = 0;
let pngOut = null;
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
  const fill3 = OUTP && k === PH[PH.length - 1] ? new Float32Array(n * 3) : null;
  for (let Y = 0; Y < BH; Y++)
    for (let X = 0; X < BW; X++) {
      const i = Y * BW + X;
      let d = 0;
      for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(at(gD, X, Y, c) - at(gDW, X, Y, c)), Math.abs(at(gN, X, Y, c) - at(gW, X, Y, c)));
      if (!d) continue;
      footN++;
      if (armOf[i] >= 0) armN++;
      const o = i * PX;
      let dShared = 1e20;
      rc.bands.forEach((b, bi) => { if (b.shared > 0.5) dShared = Math.min(dShared, f32[(i * NB + bi) * 2]); });
      let bare = true;
      rc.bands.forEach((b, bi) => { if (b.shared < 0.5 && u8[o + bi * PB + 1] > 0) bare = false; });
      ES.forEach((E, ei) => {
        let wW = 0;
        for (let r = 0; r < rc.bands.length; r++) {
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
            wW = Math.max(wW, ss(0, REACH * REACH, -sr * sq * fl) * (1 - ss(0.52, E, Dr + Ds - 2 * REACH)) * Math.min(fr * yr, ys));
          }
        }
        if (fill3) fill3[i * 3 + ei] = wW;
        if (wW > 0.02) {
          S[E].fill++;
          if (bare) S[E].bare++;
          if (armOf[i] >= 0) {
            S[E].arm[armOf[i]] = (S[E].arm[armOf[i]] ?? 0) + 1;
            S[E].armMax[armOf[i]] = Math.max(S[E].armMax[armOf[i]] ?? 0, wW);
          }
        }
      });
    }
  if (fill3) {
    // Three panels side by side, E = 1.56 | 2.5 | 3.0: grey = the n frame, red = the fill.
    const W3 = BW * 3 + 4, rgb = new Uint8Array(W3 * BH * 3);
    for (let Y = 0; Y < BH; Y++)
      for (let e = 0; e < 3; e++)
        for (let X = 0; X < BW; X++) {
          const i = Y * BW + X, j = (Y * W3 + e * (BW + 2) + X) * 3;
          const l = Math.max(0, at(gN, X, Y, 1)) * 0.5, f = fill3[i * 3 + e];
          rgb[j] = Math.min(255, l + f * 400); rgb[j + 1] = l; rgb[j + 2] = armOf[i] >= 0 ? Math.min(255, l + 60) : l;
        }
    pngOut = { W: W3, H: BH, rgb };
  }
}
console.log(`ji ${rc.ji} phases ${PH.join(",")}: fan px ${footN}, unlit arms [${unlit.join(",")}] px ${armN}`);
for (const E of ES) console.log(`  E=${E}: fill>0.02 px ${S[E].fill} (bare ${S[E].bare}); unlit-arm px with fill>0.02 ${JSON.stringify(S[E].arm)} max ${JSON.stringify(Object.fromEntries(Object.entries(S[E].armMax).map(([a, v]) => [a, +v.toFixed(3)])))}`);
if (pngOut && OUTP) {
  writeFileSync(OUTP, encodePNG({ W: pngOut.W, H: pngOut.H, data: Buffer.from(pngOut.rgb.buffer) }));
  console.log("wrote", OUTP);
}
