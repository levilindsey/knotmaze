// K1202 task 3d: junction_field.ts's pulse band loop ported exactly
// (nearest-foot + pivot ray tau, cov, ridge switch), per band, at e210's
// centreline points and across the transect, row 14 (t 100.456). Debug-5's
// G is max over bands of cr*cov (junction_field.ts:523-524,706-708).
//   node band_twin2.mjs
import { readFileSync } from "node:fs";
import { uniforms } from "./kymo.mjs";

const geom = JSON.parse(readFileSync("out/geom.json", "utf8"));
const meta = JSON.parse(readFileSync("out/diag/meta.json", "utf8"));
const rc = meta.recs[0];
const C = { CREST_WIDTH: 0.72, CREST_RAMP: 0.5, PULSE_FLOOR: 0.38, PULSE_CORE_BOOST: 0.62, PULSE_CORE_RADIUS: 0.55, PULSE_FLOOR_REACH: 2.0, PULSE_RIDGE_FADE: 0.5 };
const smooth01 = (x) => { const c = x < 0 ? 0 : x > 1 ? 1 : x; return c * c * (3 - 2 * c); };
const reachWin = (U, d) => 1 - smooth01((d - (U.reach - Math.max(U.f, 1e-4))) / Math.max(U.f, 1e-4));
function crestK(U, dG, inward, bk) {
  const s = U.s, raw = inward ? dG + U.travelIn : dG - U.travelOut;
  const ph = raw - s * Math.floor(raw / s), dist = Math.min(ph, s - ph);
  const dC = Math.max(0, dG - (ph <= s - ph ? ph : ph - s));
  const bump = Math.max(0, 1 - dist / C.CREST_WIDTH) * Math.min(1, dC / C.CREST_RAMP) * bk;
  const floor = (C.PULSE_FLOOR + C.PULSE_CORE_BOOST * Math.max(0, 1 - dG / C.PULSE_CORE_RADIUS)) * Math.max(0, 1 - dG / C.PULSE_FLOOR_REACH);
  return Math.min(1, floor + bump * 0.9) * U.fade * reachWin(U, dG);
}
// One band's (tau, dnow, cr, cov) at world (x, y): junction_field.ts:439-524.
function bandAt(U, b, x, y, pxW) {
  const verts = b.verts, nv = verts.length;
  const code = b.piv ? b.piv.code : 0;
  const kA = code % 64, kB = Math.floor(code / 64) % 64, piv = code >= 4096;
  const [vx, vy] = verts[0];
  const prx = x - vx, pry = y - vy;
  const PX = b.piv ? b.piv.P[0] : 0, PY = b.piv ? b.piv.P[1] : 0, PW = b.piv ? b.piv.P[2] : 0;
  let best = 1e20, tau = 0, side = 0;
  let s0 = PY * prx - PX * pry, hit = false, tauP = 0;
  let eA0 = 0, eA1 = 0, eB0 = 0, eB1 = 0, q0 = 0;
  let a0x = 0, a0y = 0;
  for (let k = 0; k < nv - 1; k++) {
    const q1 = k + 1;
    const dx = verts[q1][0] - verts[q0][0], dy = verts[q1][1] - verts[q0][1];
    const wx = x - verts[q0][0], wy = y - verts[q0][1];
    const l2 = dx * dx + dy * dy, u = l2 > 1e-12 ? Math.min(1, Math.max(0, (wx * dx + wy * dy) / l2)) : 0;
    const dd = (wx - dx * u) ** 2 + (wy - dy * u) ** 2;
    if (dd < best) { best = dd; tau = verts[q0][2] + (verts[q1][2] - verts[q0][2]) * u; side = dx * wy - dy * wx; }
    const a1x = verts[q1][0] - vx, a1y = verts[q1][1] - vy;
    const e1x = a1x - prx, e1y = a1y - pry;
    const s1 = PW * (a1x * pry - a1y * prx) + (PX * e1y - PY * e1x);
    if (k === kA) { eA0 = q0; eA1 = q1; }
    if (k + 1 === kB) { eB0 = q0; eB1 = q1; }
    if (piv && !hit && k >= kA && k < kB && s0 !== s1 && ((s0 <= 0 && s1 >= 0) || (s0 >= 0 && s1 <= 0))) {
      const us = s0 / (s0 - s1);
      const qhx = a0x + (a1x - a0x) * us, qhy = a0y + (a1y - a0y) * us;
      if ((PW * qhx - PX) * (PW * prx - PX) + (PW * qhy - PY) * (PW * pry - PY) > 0) { hit = true; tauP = verts[q0][2] + (verts[q1][2] - verts[q0][2]) * us; }
    }
    q0 = q1; a0x = a1x; a0y = a1y; s0 = s1;
  }
  if (piv) {
    if (hit) tau = tauP;
    else {
      const sd = b.piv.side;
      const end = sd[0] * prx + sd[1] * pry + sd[2] < 0 ? [eA0, eA1] : [eB0, eB1];
      const [i0, i1] = end;
      const tx = verts[i1][0] - verts[i0][0], ty = verts[i1][1] - verts[i0][1], tl = Math.hypot(tx, ty);
      tau = verts[i0][2] + ((x - verts[i0][0]) * tx + (y - verts[i0][1]) * ty) / tl;
    }
  }
  const dnow = Math.sqrt(best);
  const reach = 0.26 + 0.5 * pxW;
  const cov = Math.min(1, Math.max(0, (reach - dnow) / pxW));
  let g = b.distJ + tau, inw = false, bk = 1;
  const gR = b.bEdge === 210 ? 2.066199462890625 : 0;
  if (tau > 0 && gR > 0) { bk = Math.min(1, Math.abs(g - gR) / C.PULSE_RIDGE_FADE); if (g > gR) { g = 2 * gR - g; inw = false; } }
  return { tau, dnow, cov, cr: crestK(U, g, inw, bk), g, piv, hit };
}

const samp = [];
for (let i = 0; i < geom.pts.length - 1; i++) {
  const [ax, ay, awx, awy] = geom.pts[i], [bx, by, bwx, bwy] = geom.pts[i + 1];
  const L = Math.hypot(bx - ax, by - ay) * 1.5, n = Math.max(1, Math.round(L));
  for (let j = 0; j < n; j++) samp.push([awx + ((bwx - awx) * j) / n, awy + ((bwy - awy) * j) / n]);
}
const pxW = 1 / (23.22 * 1.5);
const t = 100 + (14 * 1.5 * (2.5 / 1.6)) / 72;
const U = uniforms(t, 2.5, 3);
const GPU = { 16: 234, 17: 245, 18: 242, 19: 242, 20: 242, 21: 112, 22: 112, 23: 112, 24: 102, 25: 88 };
console.log(`t ${t.toFixed(3)}; band codes: ${rc.bands.map((b) => `e${b.aEdge}->e${b.bEdge} ${b.piv.code}`).join("; ")}`);
for (let c = 16; c <= 25; c++) {
  const [x, y] = samp[c];
  const bs = rc.bands.map((b) => bandAt(U, b, x, y, pxW));
  const mx = Math.max(...bs.map((b) => b.cr * b.cov));
  console.log(`col ${c}: ${bs.map((b, i) => `band${i} tau ${b.tau.toFixed(3)} d ${b.dnow.toFixed(3)} cov ${b.cov.toFixed(2)} cr ${b.cr.toFixed(3)} -> ${(b.cr * b.cov * 255).toFixed(0)}`).join(" | ")} | twin max ${(mx * 255).toFixed(0)} vs GPU ${GPU[c]}`);
}
console.log("transect (world offsets, device px at the sheets view):");
for (const c of [20, 21]) {
  const tx = samp[c + 1][0] - samp[c - 1][0], ty = samp[c + 1][1] - samp[c - 1][1], tl = Math.hypot(tx, ty);
  const nx = -ty / tl, ny = tx / tl, scale = 1 / (23.22 * 1.5);
  for (let o = -4; o <= 4; o++) {
    const x = samp[c][0] + nx * o * scale, y = samp[c][1] + ny * o * scale;
    const bs = rc.bands.map((b) => bandAt(U, b, x, y, pxW));
    const mx = Math.max(...bs.map((b) => b.cr * b.cov));
    console.log(`  col ${c} off ${o}: twin max ${(mx * 255).toFixed(0)} (${bs.map((b) => `${(b.cr * b.cov * 255).toFixed(0)}`).join("/")})`);
  }
}
