// K1202 task 2 (final): the CPU field along e210's drawn centreline at the
// kymograph's own columns (0.01 world each from node_218) and its 72 clocks
// (t = 100 + r * 1.5P/72, P = spacing/1.6): kPulseV2 on e210, kPulseBandV on
// each of node_218's two bands at the tau the fan itself reads (band
// e39->e209: pivot-ray tau; band e39->e210: nearest-foot tau), each band's
// cover at the strip reach (the centreline fragments are cover-strip
// fragments of record 5363), and the field debug view 5 draws (max of
// cr*cov). Band loop ported from junction_field.ts:428-524 / paint_math.ts.
//   node attrib.mjs
import { readFileSync } from "node:fs";
import { uniforms } from "./kymo.mjs";

const geom = JSON.parse(readFileSync("out/geom.json", "utf8"));
const meta = JSON.parse(readFileSync("out/diag/meta.json", "utf8"));
const dump = JSON.parse(readFileSync("out/dump/cyc.json", "utf8"));
const rc = meta.recs[0];
const W = 2.746, DA = 0, DB = 1.386, GR = 2.066199462890625;
const C = { CREST_WIDTH: 0.72, CREST_RAMP: 0.5, PULSE_FLOOR: 0.38, PULSE_CORE_BOOST: 0.62, PULSE_CORE_RADIUS: 0.55, PULSE_FLOOR_REACH: 2.0, PULSE_RIDGE_FADE: 0.5 };
const s01 = (x) => { const c = x < 0 ? 0 : x > 1 ? 1 : x; return c * c * (3 - 2 * c); };
const reachWin = (U, d) => 1 - s01((d - (U.reach - Math.max(U.f, 1e-4))) / Math.max(U.f, 1e-4));
function crestK(U, dG, inward, bk) {
  const s = U.s, raw = inward ? dG + U.travelIn : dG - U.travelOut;
  const ph = raw - s * Math.floor(raw / s), dist = Math.min(ph, s - ph);
  const dC = Math.max(0, dG - (ph <= s - ph ? ph : ph - s));
  const bump = Math.max(0, 1 - dist / C.CREST_WIDTH) * Math.min(1, dC / C.CREST_RAMP) * bk;
  const floor = (C.PULSE_FLOOR + C.PULSE_CORE_BOOST * Math.max(0, 1 - dG / C.PULSE_CORE_RADIUS)) * Math.max(0, 1 - dG / C.PULSE_FLOOR_REACH);
  return Math.min(1, floor + bump * 0.9) * U.fade * reachWin(U, dG);
}
function bandAt(b, x, y, pxW) {
  const verts = b.verts, nv = verts.length, code = b.piv ? b.piv.code : 0;
  const kA = code % 64, kB = Math.floor(code / 64) % 64, piv = code >= 4096;
  const [vx, vy] = verts[0], prx = x - vx, pry = y - vy;
  const PX = b.piv ? b.piv.P[0] : 0, PY = b.piv ? b.piv.P[1] : 0, PW = b.piv ? b.piv.P[2] : 0;
  let best = 1e20, tau = 0, s0 = PY * prx - PX * pry, hit = false, tauP = 0, eA0 = 0, eA1 = 0, eB0 = 0, eB1 = 0, q0 = 0, a0x = 0, a0y = 0;
  for (let k = 0; k < nv - 1; k++) {
    const q1 = k + 1;
    const dx = verts[q1][0] - verts[q0][0], dy = verts[q1][1] - verts[q0][1];
    const wx = x - verts[q0][0], wy = y - verts[q0][1];
    const l2 = dx * dx + dy * dy, u = l2 > 1e-12 ? Math.min(1, Math.max(0, (wx * dx + wy * dy) / l2)) : 0;
    const dd = (wx - dx * u) ** 2 + (wy - dy * u) ** 2;
    if (dd < best) { best = dd; tau = verts[q0][2] + (verts[q1][2] - verts[q0][2]) * u; }
    const a1x = verts[q1][0] - vx, a1y = verts[q1][1] - vy, e1x = a1x - prx, e1y = a1y - pry;
    const s1 = PW * (a1x * pry - a1y * prx) + (PX * e1y - PY * e1x);
    if (k === kA) { eA0 = q0; eA1 = q1; }
    if (k + 1 === kB) { eB0 = q0; eB1 = q1; }
    if (piv && !hit && k >= kA && k < kB && s0 !== s1 && ((s0 <= 0 && s1 >= 0) || (s0 >= 0 && s1 <= 0))) {
      const us = s0 / (s0 - s1), qhx = a0x + (a1x - a0x) * us, qhy = a0y + (a1y - a0y) * us;
      if ((PW * qhx - PX) * (PW * prx - PX) + (PW * qhy - PY) * (PW * pry - PY) > 0) { hit = true; tauP = verts[q0][2] + (verts[q1][2] - verts[q0][2]) * us; }
    }
    q0 = q1; a0x = a1x; a0y = a1y; s0 = s1;
  }
  if (piv) {
    if (hit) tau = tauP;
    else { const sd = b.piv.side, end = sd[0] * prx + sd[1] * pry + sd[2] < 0 ? [eA0, eA1] : [eB0, eB1]; const [i0, i1] = end; const tx = verts[i1][0] - verts[i0][0], ty = verts[i1][1] - verts[i0][1], tl = Math.hypot(tx, ty); tau = verts[i0][2] + ((x - verts[i0][0]) * tx + (y - verts[i0][1]) * ty) / tl; }
  }
  const dnow = Math.sqrt(best);
  const cov = Math.min(1, Math.max(0, (0.26 + 1.5 * pxW - dnow) / pxW));
  return { tau, dnow, cov };
}
const samp = [];
for (let i = 0; i < geom.pts.length - 1; i++) {
  const [ax, ay, awx, awy] = geom.pts[i], [bx, by, bwx, bwy] = geom.pts[i + 1];
  const L = Math.hypot(bx - ax, by - ay) * 1.5, n = Math.max(1, Math.round(L));
  for (let j = 0; j < n; j++) samp.push([awx + ((bwx - awx) * j) / n, awy + ((bwy - awy) * j) / n]);
}
let total = 0; const cum = [0];
for (let i = 1; i < geom.pts.length; i++) { total += Math.hypot(geom.pts[i][2] - geom.pts[i - 1][2], geom.pts[i][3] - geom.pts[i - 1][3]); cum.push(total); }
const tauArm = (c) => { let idx = 0; for (let i = 0; i < geom.pts.length - 1; i++) { const L = Math.hypot(geom.pts[i + 1][0] - geom.pts[i][0], geom.pts[i + 1][1] - geom.pts[i][1]) * 1.5, n = Math.max(1, Math.round(L)); for (let j = 0; j < n; j++, idx++) if (idx === c) return ((cum[i] + (cum[i + 1] - cum[i]) * (j / n)) / total) * W; } return W; };
const pxW = 1 / (23.22 * 1.5), sp = dump.decl.spacing, reach = dump.decl.reach, period = sp / 1.6;
const [b0, b1] = rc.bands; // e39->e209 (pivot), e39->e210 (nearest foot)
const geoC = [];
for (let c = 0; c <= 40; c++) {
  const [x, y] = samp[c];
  geoC.push({ c, tauArm: tauArm(c), b0: bandAt(b0, x, y, pxW), b1: bandAt(b1, x, y, pxW) });
}
const crOf = (U, b, tau) => {
  let g = b.distJ + tau, bk = 1, inw = !!b.inward;
  const gR = b.bEdge === 210 ? GR : 0;
  if (tau > 0 && gR > 0) { bk = Math.min(1, Math.abs(g - gR) / C.PULSE_RIDGE_FADE); if (g > gR) { g = 2 * gR - g; inw = false; } }
  return crestK(U, g, inw, bk);
};
const ribOf = (U, tau) => { const d = W - tau, gA = DA + d, gB = DB + tau, rK = Math.min(1, (Math.abs(gA - gB) * 0.5) / C.PULSE_RIDGE_FADE); return gA <= gB ? crestK(U, gA, false, rK) : crestK(U, gB, false, rK); };
console.log("geometry per column (time-independent): col armTau | e39->e209 band: rayTau dnow cov(strip) | e39->e210 band: tau dnow cov");
for (const g of geoC.slice(14, 31)) console.log(`  col ${g.c} ${g.tauArm.toFixed(3)} | ${g.b0.tau.toFixed(3)} ${g.b0.dnow.toFixed(3)} ${g.b0.cov.toFixed(2)} | ${g.b1.tau.toFixed(3)} ${g.b1.dnow.toFixed(3)} ${g.b1.cov.toFixed(2)}`);
console.log("\nmax |step| between neighbour columns over the 72 kymograph clocks (v; x255 in parens):");
for (let c = 17; c <= 24; c++) {
  const parts = { rib: 0, b1: 0, b0: 0, max: 0 };
  for (let r = 0; r < 72; r++) {
    const U = uniforms(100 + (r * 1.5 * period) / 72, sp, reach);
    const f = (g) => ({ rib: ribOf(U, g.tauArm), b1: crOf(U, b1, g.b1.tau) * g.b1.cov, b0: crOf(U, b0, g.b0.tau) * g.b0.cov });
    const A = f(geoC[c]), B = f(geoC[c + 1]);
    parts.rib = Math.max(parts.rib, Math.abs(B.rib - A.rib));
    parts.b1 = Math.max(parts.b1, Math.abs(B.b1 - A.b1));
    parts.b0 = Math.max(parts.b0, Math.abs(B.b0 - A.b0));
    parts.max = Math.max(parts.max, Math.abs(Math.max(B.rib, B.b1, B.b0) - Math.max(A.rib, A.b1, A.b0)));
  }
  console.log(`  col ${c}->${c + 1}: ribbon ${parts.rib.toFixed(4)} (${(parts.rib * 255).toFixed(0)}) | band e39->e210 ${parts.b1.toFixed(4)} (${(parts.b1 * 255).toFixed(0)}) | band e39->e209 (cr*cov) ${parts.b0.toFixed(4)} (${(parts.b0 * 255).toFixed(0)}) | fan max ${parts.max.toFixed(4)} (${(parts.max * 255).toFixed(0)})`);
}
