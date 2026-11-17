// K1407 c1: geometry overlay at one spot: the gf panel (ink only, fill tinted by label chain) with each
// chain's centreline (coloured by chain), ribbon edges at +-h (gray), corners (centre dot, r circle, tangent
// points as squares) and arm roots / L / Lcut ticks; prints chains, arms and corners near the spot.
//   node scripts/run_node.mjs .claude/probes/K1407/k1407c1_geo.ts <scene> <x> <y> [whH=4] [outPng]
import { buildModel } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/k1314_census.ts";
import { writePng } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/k1314_crops.ts";
import { gfTablesOf } from "../K1362/k1362s1_census.ts";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";
import { chainAt } from "../../../src/render/gpu_field/tables.ts";

const [nm, xs, ys, whs, outArg] = process.argv.slice(2);
const X = +xs, Y = +ys, WHh = whs ? +whs : 4;
const m = buildModel(nm);
const T = gfTablesOf(m) as any;
const h = T.h; const P = 640; const S = WHh * h; const ppu = P / S;
const x0 = X - S / 2, y0 = Y - S / 2;
const img = new Uint8Array(P * P * 3);
const E = new GfEval(T);
const hue = (c: number): number[] => { const a = (c * 0.61803) % 1; const f = (t: number) => Math.round(255 * (0.5 + 0.45 * Math.cos(6.283 * (a + t)))); return [f(0), f(0.33), f(0.67)]; };
for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) {
  const ev = E.eval(x0 + (c + 0.5) / ppu, y0 + (r + 0.5) / ppu);
  const base = ev.chain < 0 ? [255, 255, 255] : hue(ev.chain).map((v) => Math.round(0.35 * v + 0.65 * 230));
  const a = Math.min(1, Math.max(0, ev.ink));
  const o = 3 * (r * P + c); for (let k = 0; k < 3; k++) img[o + k] = Math.round(base[k] * (1 - 0.8 * a));
}
const put = (px: number, py: number, rgb: number[]): void => { const c = Math.round((px - x0) * ppu), r = Math.round((py - y0) * ppu); if (c >= 0 && c < P && r >= 0 && r < P) { const o = 3 * (r * P + c); img[o] = rgb[0]; img[o + 1] = rgb[1]; img[o + 2] = rgb[2]; } };
const near = (px: number, py: number, R: number): boolean => Math.abs(px - X) < R && Math.abs(py - Y) < R;
const chains = new Set<number>();
for (let c = 0; c < T.nC; c++) {
  const v0 = T.cV0[c], n = T.cNV[c];
  for (let i = 0; i + 1 < n; i++) {
    const ax = T.vx[v0 + i], ay = T.vy[v0 + i], bx = T.vx[v0 + i + 1], by = T.vy[v0 + i + 1];
    if (!near(ax, ay, S) && !near(bx, by, S)) continue;
    chains.add(c);
    const L = Math.hypot(bx - ax, by - ay); const nx = -(by - ay) / (L || 1), ny = (bx - ax) / (L || 1);
    const steps = Math.max(2, Math.ceil(L * ppu * 2));
    for (let t = 0; t <= steps; t++) {
      const px = ax + ((bx - ax) * t) / steps, py = ay + ((by - ay) * t) / steps;
      put(px, py, hue(c)); put(px + nx * h, py + ny * h, [120, 120, 120]); put(px - nx * h, py - ny * h, [120, 120, 120]);
    }
  }
}
const ring = (cx: number, cy: number, R: number, rgb: number[]): void => { const n = Math.max(16, Math.ceil(R * ppu * 7)); for (let t = 0; t < n; t++) put(cx + R * Math.cos((6.283 * t) / n), cy + R * Math.sin((6.283 * t) / n), rgb); };
const sq = (cx: number, cy: number, rgb: number[]): void => { for (let d = -3; d <= 3; d++) { put(cx + d / ppu, cy - 3 / ppu, rgb); put(cx + d / ppu, cy + 3 / ppu, rgb); put(cx - 3 / ppu, cy + d / ppu, rgb); put(cx + 3 / ppu, cy + d / ppu, rgb); } };
console.log(`h=${h.toFixed(4)} W=${T.W.toFixed(4)} spot ${X},${Y}`);
console.log(`chains near: ${[...chains].join(",")}`);
for (const c of chains) {
  const a0 = T.cArm0[c], an = T.cArmN[c];
  for (let i = a0; i < a0 + an; i++) {
    const sR = T.aSR[i], dir = T.aDir[i], L = T.aL[i], Lc = T.aLcut[i];
    const p0 = chainAt(T, c, sR), pL = chainAt(T, c, sR + dir * L);
    if (!near(p0.x, p0.y, S) && !near(pL.x, pL.y, S)) continue;
    console.log(`  arm a${i} c${c} g${T.aG[i]} sR=${sR.toFixed(3)} dir=${dir} L=${L.toFixed(3)} Lcut=${Lc.toFixed(3)} root=(${p0.x.toFixed(3)},${p0.y.toFixed(3)}) end=(${pL.x.toFixed(3)},${pL.y.toFixed(3)}) closed=${T.cClosed[c]} len=${T.cLen[c].toFixed(2)}`);
    sq(p0.x, p0.y, [0, 160, 0]); sq(pL.x, pL.y, [0, 90, 255]);
    if (Lc !== Infinity && Lc > -50) { const pc = chainAt(T, c, sR + dir * Lc); sq(pc.x, pc.y, [255, 140, 0]); }
  }
  // pins
  for (let i = T.cPin0[c]; i < T.cPin0[c] + T.cPinN[c]; i++) { const p = chainAt(T, c, T.pinS[i]); if (near(p.x, p.y, S)) { console.log(`  pin c${c} s=${T.pinS[i].toFixed(3)} z=${T.pinZ[i]} at (${p.x.toFixed(3)},${p.y.toFixed(3)})`); ring(p.x, p.y, 2.5 / ppu, [200, 0, 200]); } }
}
for (let k = 0; k < T.nK; k++) {
  if (!near(T.kCx[k], T.kCy[k], S)) continue;
  console.log(`  k${k} j${T.kJ[k]} g${T.kG[k]} arms ${T.kA[k]}/${T.kB[k]} thru=${T.kThru[k]} q=(${T.kCx[k].toFixed(3)},${T.kCy[k].toFixed(3)}) r=${T.kR[k].toFixed(3)} rmax=${T.kRmax[k].toFixed(3)} rV=${T.kRV[k].toFixed(3)} th=${T.kTheta[k].toFixed(3)} A c${T.kCa[k]} s${T.kSa[k].toFixed(3)} z${T.kZa[k].toFixed(2)} T(${T.kTax[k].toFixed(3)},${T.kTay[k].toFixed(3)}) B c${T.kCb[k]} s${T.kSb[k].toFixed(3)} z${T.kZb[k].toFixed(2)} T(${T.kTbx[k].toFixed(3)},${T.kTby[k].toFixed(3)})`);
  ring(T.kCx[k], T.kCy[k], 2 / ppu, [255, 0, 0]); if (T.kR[k] > 0) ring(T.kCx[k], T.kCy[k], T.kR[k], [255, 0, 0]);
  sq(T.kTax[k], T.kTay[k], [255, 0, 0]); sq(T.kTbx[k], T.kTby[k], [160, 0, 0]);
}
const out = outArg ?? `.claude/probes/K1407/out/c1/geo_${nm}_${X.toFixed(2)}_${Y.toFixed(2)}.png`;
writePng(out, img, P, P); console.log(`-> ${out}`);
