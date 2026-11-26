// K1436: per spot, the v2 bar test's finds within R of the spot and (with an out dir) the 4x panel (.png) of one
// evaluator over k1407_crops' 480 px frame (2.5 h), flagged sites marked (dip blue, wide magenta), with
// K1436_DBG=1 every site's edge too (grey).
//   node scripts/run_node.mjs .claude/probes/K1436/k1436_spots.ts <eval:src|d547|1336> <scene:x:y,...> [outDir|-] [R=0.28]
// Env GF_HOME=1 for the home flag (as the scans). K1436_SFX = the panel suffix. K1436_V1=1 adds v1's finds (rows).
// Rows: spec, sfx, FLAG|clean, {kind:cls: px+px}, then the band's level and least wIn near the spot (x W).
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { writePng } from "./bar_model.ts";
import { runAt, runColour, type RGB } from "./bar_model.ts"; // was src/render/outline/paint.ts + K1314 crops (deleted 2026-11-25)
import { loadEval, makeJudge, modelOf, tablesOf, rasterJudge, allFindsV2, P as PAR } from "./k1436_lib.ts";
import { allFinds } from "../K1433/k1433_lib.ts";

const [which, list, outDir, rArg] = process.argv.slice(2);
const R = rArg ? +rArg : 0.28; const P = 480;
if (outDir && outDir !== "-") mkdirSync(outDir, { recursive: true });
const G = which === "src" ? (await import("../../../src/render/gpu_field/eval.ts")).GfEval : await loadEval(which);
const sfx = process.env.K1436_SFX ?? which;
const judges = new Map<string, ReturnType<typeof makeJudge>>();
const col: RGB = [0, 0, 0];
const rows: string[] = [];
for (const spec of list.split(",")) {
  const [nm, xs, ys] = spec.split(":"); const X = +xs, Y = +ys;
  const m = modelOf(nm); const T = tablesOf(nm); const h = T.h; const ppu = +(process.env.PPU ?? P / (2.5 * h));
  const pad = Math.ceil((T.W * 1.5 + 3 * T.aa) * ppu + 8 + Math.max(PAR.SMOOTH, PAR.NSM * T.aa * ppu));
  const W2 = P + 2 * pad;
  const c0 = Math.round(X * ppu - P / 2) - pad, r0 = Math.round(Y * ppu - P / 2) - pad;
  let J = judges.get(nm); if (!J) { J = makeJudge(new G(T)); judges.set(nm, J); }
  const Rr = rasterJudge(J, c0, r0, W2, W2, ppu);
  const { finds: fs0, S } = allFindsV2(Rr, T, c0, r0, 6, [pad, pad, pad + P, pad + P], m);
  const fs = fs0.filter((f) => Math.hypot(f.x - X, f.y - Y) < R);
  const sum: Record<string, string> = {};
  for (const f of fs) { const k = `${f.kind}:${f.cls}`; sum[k] = (sum[k] ? sum[k] + "+" : "") + f.px; }
  // the band near the spot: least wIn / level over sites within R
  let lo = 9, lv = 0, nn = 0;
  for (let k = 0; k < S.n; k++) { const wx = (c0 + S.x[k]) / ppu, wy = (r0 + S.y[k]) / ppu; if (Math.hypot(wx - X, wy - Y) > R || S.lvl[k] < 0 || S.wIn[k] < 0) continue; const WP = T.W * ppu; const q = S.res[k] / (T.aa * ppu); if (q < lo) lo = q; if (q > lv) lv = q; nn++; }
  let v1 = "";
  if (process.env.K1436_V1) { const f1 = allFinds(Rr, T, c0, r0, 6).filter((f) => Math.hypot(f.x - X, f.y - Y) < R); const s1: Record<string, string> = {}; for (const f of f1) { const k = `${f.kind}:${f.cls}`; s1[k] = (s1[k] ? s1[k] + "+" : "") + f.px; } v1 = `\tv1 ${f1.length ? "FLAG" : "clean"} ${JSON.stringify(s1)}`; }
  rows.push(`${spec}\t${sfx}\t${fs.length ? "FLAG" : "clean"}\t${JSON.stringify(sum)}\tleast res/aa ${lo.toFixed(3)} max ${lv.toFixed(3)} (${nn} sites)${v1}`);
  if (outDir && outDir !== "-") {
    const img = new Uint8Array(P * P * 3).fill(255);
    for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) {
      const i = (r + pad) * W2 + (c + pad), o = r * P + c;
      let f = [1, 1, 1]; const cv = Rr.cov[i];
      if (Rr.chain[i] >= 0) { const k = runAt(m.sp, Rr.chain[i], Rr.s[i]); if (k >= 0) { runColour(m.sp.runs[k], Rr.s[i], col); f = [1 + (col[0] - 1) * cv, 1 + (col[1] - 1) * cv, 1 + (col[2] - 1) * cv]; } }
      const a = Math.min(1, Math.max(0, Rr.ink[i]));
      for (let q = 0; q < 3; q++) img[3 * o + q] = Math.round(255 * f[q] * (1 - a));
    }
    const mark = (k: number, rgb: number[]): void => { const c = Math.round(S.x[k] - pad), r = Math.round(S.y[k] - pad); if (c < 0 || r < 0 || c >= P || r >= P) return; const o = r * P + c; img[3 * o] = rgb[0]; img[3 * o + 1] = rgb[1]; img[3 * o + 2] = rgb[2]; };
    if (process.env.K1436_DBG) for (let k = 0; k < S.n; k++) mark(k, [150, 150, 150]);
    for (let k = 0; k < S.n; k++) if (S.flag[k]) { const rgb = S.why[k] <= 2 ? [0, 80, 255] : [255, 0, 200]; mark(k, rgb);
      // a short tick along the normal so a flagged site is visible at 4x
      for (let t = 1; t <= 6; t++) { const c = Math.round(S.x[k] - pad + S.nx[k] * t), r = Math.round(S.y[k] - pad + S.ny[k] * t); if (c < 0 || r < 0 || c >= P || r >= P) continue; const o = r * P + c; img[3 * o] = rgb[0]; img[3 * o + 1] = rgb[1]; img[3 * o + 2] = rgb[2]; } }
    writePng(join(outDir, `${nm}_${X.toFixed(2)}_${Y.toFixed(2)}_${sfx}.png`), img, P, P);
  }
}
console.log(rows.join("\n"));
