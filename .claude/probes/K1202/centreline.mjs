// K1202 tasks 2+3: e210's drawn centreline through node_218's fan at the
// kymograph's own columns. CPU: kPulseV2 (ribbon) and kPulseBandV (the
// e39->e210 band) ported from table_cyc.mjs, over the kymograph's 72 clocks.
// GPU: diag's capture (out/diag) sampled at the same world points - debug-5
// G, the fan/strip twins, the composite, and the covering record per sample
// (cover_lib, px_s4.mjs's manner).
//   node centreline.mjs
import { readFileSync } from "node:fs";
import { uniforms } from "./kymo.mjs";
import { coverage, composite, loadTwin, pickOrient, twinG, owners } from "./cover_lib.mjs";

const geom = JSON.parse(readFileSync("out/geom.json", "utf8"));
const dump = JSON.parse(readFileSync("out/dump/cyc.json", "utf8"));
const meta = JSON.parse(readFileSync("out/diag/meta.json", "utf8"));
const rc = meta.recs[0];
const W = 2.746, DA = 0, DB = 1.386, GR = 2.066199462890625, DISTJ = 1.386;
const reach = dump.decl.reach, sp = dump.decl.spacing, period = sp / 1.6;
const FAN_REACH = 1.47200608253479 - 0.26; // ext tauHi - fillHalf

// --- sheets_cyc.mjs's samp, replicated on geom's runPoint polyline --------
const DSF = 1.5;
const samp = []; // {wx, wy} per kymograph column
for (let i = 0; i < geom.pts.length - 1; i++) {
  const [ax, ay, awx, awy] = geom.pts[i], [bx, by, bwx, bwy] = geom.pts[i + 1];
  const L = Math.hypot(bx - ax, by - ay) * DSF, n = Math.max(1, Math.round(L));
  for (let j = 0; j < n; j++) samp.push({ wx: awx + ((bwx - awx) * j) / n, wy: awy + ((bwy - awy) * j) / n });
}
// arc from node_218 (column 0) by world chord, scaled to the paint span W
let total = 0;
const cum = [0];
for (let i = 1; i < geom.pts.length; i++) { total += Math.hypot(geom.pts[i][2] - geom.pts[i - 1][2], geom.pts[i][3] - geom.pts[i - 1][3]); cum.push(total); }
const tauOf = (c) => {
  // walk samp's segments again to find column c's chord position
  let idx = 0;
  for (let i = 0; i < geom.pts.length - 1; i++) {
    const [ax, ay] = geom.pts[i], [bx, by] = geom.pts[i + 1];
    const L = Math.hypot(bx - ax, by - ay) * DSF, n = Math.max(1, Math.round(L));
    for (let j = 0; j < n; j++, idx++) if (idx === c) return ((cum[i] + (cum[i + 1] - cum[i]) * (j / n)) / total) * W;
  }
  return W;
};

// --- CPU twins (table_cyc.mjs, line for line) ------------------------------
const C = { PULSE_END_WINDOW: 0.45, CREST_WIDTH: 0.72, CREST_RAMP: 0.5, PULSE_FLOOR: 0.38, PULSE_CORE_BOOST: 0.62, PULSE_CORE_RADIUS: 0.55, PULSE_FLOOR_REACH: 2.0, PULSE_SPEED: 1.6, PULSE_RIDGE_FADE: 0.5 };
const smooth01 = (x) => { const c = x < 0 ? 0 : x > 1 ? 1 : x; return c * c * (3 - 2 * c); };
const reachWin = (U, d) => 1 - smooth01((d - (U.reach - Math.max(U.f, 1e-4))) / Math.max(U.f, 1e-4));
function crest(U, dG, inward, endWin, bumpScale = 1, bumpOnly = false) {
  const s = U.s;
  const raw = inward ? dG + U.travelIn : dG - U.travelOut;
  const ph = raw - s * Math.floor(raw / s);
  const dist = Math.min(ph, s - ph);
  const dC = Math.max(0, dG - (ph <= s - ph ? ph : ph - s));
  const bump = Math.max(0, 1 - dist / C.CREST_WIDTH) * Math.min(1, dC / C.CREST_RAMP) * bumpScale;
  if (bumpOnly) return bump * reachWin(U, dG);
  const floor = (C.PULSE_FLOOR + C.PULSE_CORE_BOOST * Math.max(0, 1 - dG / C.PULSE_CORE_RADIUS)) * Math.max(0, 1 - dG / C.PULSE_FLOOR_REACH);
  return Math.min(1, (floor + bump * 0.9) * endWin) * U.fade * reachWin(U, dG);
}
function v2(U, d, Ww, dA, dB, inwA, inwB, bumpOnly = false) {
  if (d < 0 || d > Ww) return 0;
  const gA = dA + d, gB = dB + Ww - d;
  const rK = Math.min(1, (Math.abs(gA - gB) * 0.5) / C.PULSE_RIDGE_FADE);
  return gA <= gB ? crest(U, gA, inwA, 1, rK, bumpOnly) : crest(U, gB, inwB, 1, rK, bumpOnly);
}
function bandV(U, distJ, tau, inward, gR, inwR) {
  let g = distJ + tau, inw = inward, bk = 1;
  if (tau > 0 && gR > 0) { bk = Math.min(1, Math.abs(g - gR) / C.PULSE_RIDGE_FADE); if (g > gR) { g = 2 * gR - g; inw = inwR; } }
  return crest(U, g, inw, 1, bk);
}
const ribAt = (U, tau) => v2(U, W - tau, W, DA, DB, false, false);
const bandAt = (U, tau) => bandV(U, DISTJ, tau, false, GR, false);
const combAt = (U, tau) => (tau <= FAN_REACH ? bandAt(U, tau) : ribAt(U, tau));

console.log(`samp ${samp.length} columns; fan reach (tauHi-fillHalf) ${FAN_REACH.toFixed(3)} world`);
for (let c = 15; c <= 30; c++) console.log(`  col ${c}: tau from node_218 ${tauOf(c).toFixed(4)} world, d from head ${(W - tauOf(c)).toFixed(4)}`);
console.log("\nCPU field along the centreline (max |step| between neighbour columns over the 72 kymograph clocks, in v; x255 = luma upper bound):");
for (const [name, f] of [["ribbon kPulseV2", ribAt], ["band e39->e210 kPulseBandV", bandAt], ["combined (band in fan, ribbon past it)", combAt]]) {
  const rows = [];
  for (let c = 17; c <= 24; c++) {
    let m = 0;
    for (let r = 0; r < 72; r++) { const U = uniforms(100 + (r * 1.5 * period) / 72, sp, reach); m = Math.max(m, Math.abs(f(U, tauOf(c + 1)) - f(U, tauOf(c)))); }
    rows.push(`col ${c}->${c + 1}: ${m.toFixed(4)} (x255 ${(m * 255).toFixed(1)})`);
  }
  console.log(`  ${name}: ${rows.join("; ")}`);
}
// Term decomposition at col 20->21 for the band: ridge factor vs train switch.
{
  let full = 0, noRidge = 0, gAt = [0, 0];
  for (let r = 0; r < 72; r++) {
    const U = uniforms(100 + (r * 1.5 * period) / 72, sp, reach);
    full = Math.max(full, Math.abs(bandAt(U, tauOf(21)) - bandAt(U, tauOf(20))));
    const nb = (tau) => crest(U, DISTJ + tau, false, 1, 1); // bk forced 1, no switch (tau << ridge here)
    noRidge = Math.max(noRidge, Math.abs(nb(tauOf(21)) - nb(tauOf(20))));
  }
  gAt = [DISTJ + tauOf(20), DISTJ + tauOf(21)];
  console.log(`  band term check at col 20->21: full ${full.toFixed(4)}; with ridge factor forced 1: ${noRidge.toFixed(4)}; band g ${gAt[0].toFixed(3)}->${gAt[1].toFixed(3)} vs ridge gR ${GR.toFixed(3)} (no train switch this side of the ridge)`);
  console.log(`  ribbon gA/gB at col 20: gA ${(DA + W - tauOf(20)).toFixed(3)}, gB ${(DB + tauOf(20)).toFixed(3)} (B side reads; the switch is at tau ${(W - (DB + W - DA) / 2 + 0).toFixed(3)}... ridge tau ${(W - GR + DA).toFixed(3)})`);
}

// --- GPU covering at the same world points (diag box pixels) ---------------
const A = meta.aff, det = A.bx * A.cy - A.cx * A.by;
const toCss = (wx, wy) => { const dx = wx - A.ax, dy = wy - A.ay; return [(A.cy * dx - A.cx * dy) / det, (-A.by * dx + A.bx * dy) / det]; };
const kinds = coverage("out/diag", rc);
const po = pickOrient("out/diag", meta, rc, kinds, [0, 1, 2, 3, 4, 5, 6, 7]);
console.log(`\nGPU covering (record ji ${rc.ji} rb ${rc.rb}; MSAA orientation ${po.or}, twin fit mean |err| ${po.mean.map((v) => v.toFixed(1)).join("/")})`);
const ownAll = owners("out/diag", rc, po.or);
console.log("per phase: col tau | owners (4 samples, rec[.25=strip]) | kinds n/fan/strip/other | GPU G | fan twin G | composite G | GPU normal luma");
import("./cover_lib.mjs").then(() => {});
for (let k = 0; k < 8; k++) {
  const T = loadTwin("out/diag", rc.ji, k);
  const Cc = composite("out/diag", meta, rc, kinds, k, po.or, T);
  const { w: BW } = rc.box;

  for (let c = 18; c <= 23; c++) {
    const [cx, cy] = toCss(samp[c].wx, samp[c].wy);
    const X = Math.floor(cx * DSF - rc.box.x), Y = Math.floor(cy * DSF - rc.box.y);
    const i = Y * BW + X;
    const o = [0, 1, 2, 3].map((s) => ownAll[i * 4 + s]);
    const kd = [0, 1, 2, 3].map((j) => Cc.cnt[i * 4 + j]);
    const lumN = 0.2126 * Cc.gpuN[i * 3] + 0.7152 * Cc.gpuN[i * 3 + 1] + 0.0722 * Cc.gpuN[i * 3 + 2];
    console.log(`  t${k} col ${c} tau ${tauOf(c).toFixed(3)} | ${o.map((v) => (Number.isNaN(v) ? "-" : v)).join(",")} | ${kd.join("/")} | ${Cc.gpuG[i].toFixed(0)} | ${twinG(T, i).toFixed(0)} | ${Cc.G[i].toFixed(0)} | ${lumN.toFixed(0)}`);
  }
}
