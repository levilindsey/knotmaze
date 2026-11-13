// K1325 s1: what the census reference draws at a spot, and which of its parts draws it.
//
//   node scripts/run_node.mjs .claude/probes/K1325/k1325_diag.ts <scene> <x> <y> <out.png> [--zoom=8] [--px=360]
//
// Panels: plain form B | the census reference (refEval) | rp=outline | the branch map (grey plain form B, blue the
// fillet at its bend, red yielded, green a vround-raised pixel, yellow fillet and vround). Prints the junctions,
// through corners and dropped corners (vfail) near the spot.
import { buildModel, refEval, plainOf, filletOf, filletPick, rasterOutline, vfailGrid, vroundInk, type FBF } from "../K1314/k1314_census";
import { runAt, runColour, type RGB } from "../../../src/render/outline/paint";
import { writePng } from "../K1314/k1314_crops";

const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith("--"));
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const [nm, xs, ys, out] = pos; const X = +xs; const Y = +ys;
const m = buildModel(nm); const h = m.scene.look.halfWidth;
const P = Number(opt("px") ?? 360); const S = Number(opt("zoom") ?? 8) * h; const ppu = P / S;
const c0 = Math.round(X * ppu - P / 2); const r0 = Math.round(Y * ppu - P / 2);
const Wt = 4 * P + 12; const img = new Uint8Array(Wt * P * 3).fill(255);
const put = (col: number, c: number, r: number, rgb: number[]): void => { const o = 3 * (r * Wt + col * (P + 4) + c); img[o] = rgb[0]; img[o + 1] = rgb[1]; img[o + 2] = rgb[2]; };
const col: RGB = [0, 0, 0];
const comp = (ev: { ink: number; top: number; chain: number; s: number }): number[] => {
  let f = [1, 1, 1];
  if (ev.top >= 0 && ev.chain >= 0) { const k = runAt(m.sp, ev.chain, ev.s); if (k >= 0) { runColour(m.sp.runs[k], ev.s, col); f = [col[0], col[1], col[2]]; } }
  const a = Math.min(1, Math.max(0, ev.ink)); return f.map((v) => Math.round(255 * v * (1 - a)));
};
const fbf = filletOf(m); const P0 = plainOf(m);
for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) {
  const x = (c0 + c + 0.5) / ppu; const y = (r0 + r + 0.5) / ppu;
  const pl = P0.evalPoint(x, y); put(0, c, r, comp(pl));
  const ev = refEval(m, x, y); put(1, c, r, comp(ev));
  const p = fbf.thruCi.size ? filletPick(fbf, x, y) : { ci: -1, yielded: false };
  const vr = vroundInk(m, x, y, 0, ev.top < 0 ? -1 : ev.chain) > 0.01;
  const g = Math.round(255 * (1 - 0.6 * Math.min(1, Math.max(0, ev.ink))));
  let rgb = [g, g, g];
  if (p.yielded) rgb = [255, g >> 1, g >> 1]; else if (p.ci >= 0) rgb = vr ? [255, 230, g >> 1] : [g >> 1, g >> 1, 255]; else if (vr) rgb = [g >> 1, 255, g >> 1];
  put(3, c, r, rgb);
}
const R = rasterOutline(m, c0, r0, P, P, ppu);
for (let i = 0; i < P * P; i++) {
  const c = i % P; const r = (i - c) / P; const a = Math.min(1, Math.max(0, R.ink[i]));
  const f = R.own[i] > 0 && R.rgb[3 * i] >= 0 ? [R.rgb[3 * i], R.rgb[3 * i + 1], R.rgb[3 * i + 2]] : [1, 1, 1];
  put(2, c, r, f.map((v) => Math.round(255 * v * (1 - a))));
}
writePng(out, img, Wt, P);
const R0 = S * 0.6;
console.log(`${nm} (${X}, ${Y}) h ${h} W ${(fbf as FBF & { W: number }).W} aa ${(fbf as FBF & { aa: number }).aa} ppu ${ppu.toFixed(1)}`);
m.scene.junctions.forEach((j, ji) => { const d = Math.hypot(j.c[0] - X, j.c[1] - Y); if (d < R0) console.log(`  j${ji} at (${j.c[0].toFixed(3)}, ${j.c[1].toFixed(3)}) d ${d.toFixed(2)}`); });
m.xPts.forEach((p, xi) => { const d = Math.hypot(p.x - X, p.y - Y); if (d < R0) console.log(`  x${xi} at (${p.x.toFixed(3)}, ${p.y.toFixed(3)}) d ${d.toFixed(2)}`); });
fbf.corners.forEach((c, ci) => {
  const cc = c as typeof c & { qx: number; qy: number; rV: number };
  const d = Math.hypot(c.Vx - X, c.Vy - Y); if (!(d < R0)) return;
  console.log(`  corner c${ci} j${c.j} arms ${c.a},${c.b} ok ${c.ok} r ${c.r.toFixed(3)} th ${c.theta.toFixed(2)} V (${c.Vx.toFixed(3)}, ${c.Vy.toFixed(3)}) q (${cc.qx?.toFixed(3)}, ${cc.qy?.toFixed(3)}) rV ${cc.rV?.toFixed(3)}${fbf.thruCi.has(ci) ? " THRU" : ""}`);
});
const G = vfailGrid(m);
const seen = new Set<unknown>();
for (const l of G.g.values()) for (const v of l) { if (seen.has(v)) continue; seen.add(v); const d = Math.hypot(v.Vx - X, v.Vy - Y); if (d < R0) console.log(`  vfail j${v.ji} arms ${v.a},${v.b} V (${v.Vx.toFixed(3)}, ${v.Vy.toFixed(3)}) chains ${v.ca},${v.cb}`); }
