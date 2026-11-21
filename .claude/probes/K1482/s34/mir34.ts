// K1482 s34: the CPU copy's border ink over a box of link A's device frame (or a K868 scene's 2-aa frame), magnified:
// panel 1 = master (GfEval.S34 = "0"), label-tinted (chain A blue, chain B orange, others faint green); panel 2 =
// candidate (the build's own S34 switch); panel 3 = diff (red removed, green added). Chains' centerlines dotted in
// panel 1 when given.
//   npx tsx mir34.ts A <scene.json> <sites.json> <cx> <cy> <r> <Z> <out.ppm> [chainA] [chainB]
//   npx tsx mir34.ts K <k868 scene name> - <cx> <cy> <r> <Z> <out.ppm> [chainA] [chainB]
// env GF_KRETRY=1.
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; } return v; };
const [, , mode, sp, sitesP, cxS, cyS, rS, ZS, outp, caS, cbS] = process.argv;
let T: any; let a: number, d: number, e: number, f: number;
if (mode === "A") {
  const scene = dec(JSON.parse(readFileSync(sp, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
  T = withHome(buildTables(scene, { aa: 0.011738963274354473, kRetry: true }), true);
  const SJ = JSON.parse(readFileSync(sitesP, "utf8")); [a, , , d, e, f] = SJ.toDevA;
} else {
  const { modelOf } = await import(pathToFileURL(join(SRC, ".claude/probes/K1433/k1433_lib.ts")).href);
  const sc = modelOf(sp).scene; const aa = 0.5 / (sc.camera.pxPerUnit * 2);
  T = withHome(buildTables(sc, { aa, kRetry: true }), true);
  a = d = 1 / (2 * aa); let x0 = Infinity, y0 = Infinity;
  for (let i = 0; i < T.vx.length; i++) { const x = T.vx[i], y = T.vy[i]; if (!(x === x) || !(y === y)) continue; x0 = Math.min(x0, x); y0 = Math.min(y0, y); }
  e = -(x0 - 2 * T.h) * a; f = -(y0 - 2 * T.h) * d;
}
const cx = +cxS, cy = +cyS, r = +rS, Z = +ZS; const N = 2 * r; const cA = caS === undefined ? -9 : +caS, cB = cbS === undefined ? -9 : +cbS;
const E: any = new GfEval(T);
const Wd = (3 * N + 4) * Z, Hd = N * Z; const buf = Buffer.alloc(Wd * Hd * 3, 255);
const put = (px: number, py: number, rgb: number[]): void => { for (let yy = 0; yy < Z; yy++) for (let xx = 0; xx < Z; xx++) { const o = ((py * Z + yy) * Wd + px * Z + xx) * 3; buf[o] = rgb[0]; buf[o + 1] = rgb[1]; buf[o + 2] = rgb[2]; } };
let nd = 0, nAdd = 0, nRem = 0;
for (let iy = 0; iy < N; iy++) for (let ix = 0; ix < N; ix++) {
  const X = cx - r + ix, Y = cy - r + iy; const fx = (X + 0.5 - e) / a, fy = (Y + 0.5 - f) / d;
  GfEval.S34 = "0"; const q0 = E.eval(fx, fy); const i0 = q0.ink; const ch = q0.chain;
  GfEval.S34 = ""; const i1 = E.eval(fx, fy).ink;
  const g0 = Math.round(255 * (1 - i0)), g1 = Math.round(255 * (1 - i1));
  let c0 = [g0, g0, g0];
  if (ch === cA) c0 = [Math.round(g0 * 0.75), Math.round(g0 * 0.85), 255]; else if (ch === cB) c0 = [255, Math.round(g0 * 0.8), Math.round(g0 * 0.6)]; else if (ch >= 0) c0 = [Math.round(g0 * 0.9), 255, Math.round(g0 * 0.9)];
  put(ix, iy, c0); put(N + 2 + ix, iy, [g1, g1, g1]);
  const dv = i1 - i0; const gm = Math.round(200 * (1 - Math.max(i0, i1)) + 40);
  if (Math.abs(dv) > 0.02) { nd++; if (dv > 0) nAdd++; else nRem++; }
  put(2 * N + 4 + ix, iy, dv < -0.02 ? [255, 40, 40] : dv > 0.02 ? [40, 200, 40] : [gm, gm, gm]);
}
// centerlines of the named chains, dotted in panel 1
for (const c of [cA, cB]) { if (c < 0) continue; for (let v = T.cV0[c]; v < T.cV0[c] + T.cNV[c]; v++) { const px = Math.round(T.vx[v] * a + e - (cx - r)), py = Math.round(T.vy[v] * d + f - (cy - r)); if (px >= 0 && py >= 0 && px < N && py < N) put(px, py, c === cA ? [0, 0, 200] : [200, 80, 0]); } }
writeFileSync(outp, Buffer.concat([Buffer.from(`P6\n${Wd} ${Hd}\n255\n`), buf]));
console.log(`${outp}: ${nd} px changed (${nRem} lost, ${nAdd} gained) in ${N}x${N} at ${cx},${cy}`);
