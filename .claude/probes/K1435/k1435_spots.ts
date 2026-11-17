// K1433: per spot, the bar test's finds within R of the spot and (with an out dir) the 4x panel (.bin + .png)
// of one evaluator / mode over k1407_crops' 480 px frame (2.5 h).
//   node scripts/run_node.mjs .claude/probes/K1433/k1433_spots.ts <eval:u|d547|1336> <mode:master|fill|tubes|smooth|ol> <scene:x:y,...> [outDir] [R=0.28]
// Mode "ol" writes rp=outline's panel only (no test). Env K1433_SK = the smooth union's k / h; K1433_SFX = the panel suffix.
import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { rasterOutline } from "../K1314/k1314_census.ts";
import { writePng } from "../K1314/k1314_crops.ts";
import { runAt, runColour, type RGB } from "../../../src/render/outline/paint.ts";
import { makeJudge, modelOf, tablesOf, rasterJudge, allFinds, analyze } from "../K1433/k1433_lib.ts";

const [which, mode, list, outDir, rArg] = process.argv.slice(2);
const R = rArg ? +rArg : 0.28; const P = 480;
if (outDir && outDir !== "-") mkdirSync(outDir, { recursive: true });
const G = mode === "ol" ? null : (await import("./eval_t.ts")).GfEval;
if (G && which === "t") G.MODE = mode;
if (process.env.K1433_SK && G) G.SK = +process.env.K1433_SK;
if (process.env.K1433_NT && G) G.NT = +process.env.K1433_NT;
const sfx = process.env.K1433_SFX ?? (which === "t" ? mode : which);
const judges = new Map<string, ReturnType<typeof makeJudge>>();
const col: RGB = [0, 0, 0];
const rows: string[] = [];
for (const spec of list.split(",")) {
  const [nm, xs, ys] = spec.split(":"); const X = +xs, Y = +ys;
  const m = modelOf(nm); const T = tablesOf(nm); const h = T.h; const ppu = P / (2.5 * h);
  const c0 = Math.round(X * ppu - P / 2), r0 = Math.round(Y * ppu - P / 2);
  const img = new Uint8Array(P * P * 3).fill(255);
  const base = `${nm}_${X.toFixed(2)}_${Y.toFixed(2)}`;
  if (mode === "ol") {
    const Rs = rasterOutline(m, c0, r0, P, P, ppu);
    for (let i = 0; i < P * P; i++) {
      const a = Math.min(1, Math.max(0, Rs.ink[i]));
      const f = Rs.own[i] > 0 && Rs.rgb[3 * i] >= 0 ? [Rs.rgb[3 * i], Rs.rgb[3 * i + 1], Rs.rgb[3 * i + 2]] : [1, 1, 1];
      for (let q = 0; q < 3; q++) img[3 * i + q] = Math.round(255 * f[q] * (1 - a));
    }
  } else {
    let J = judges.get(nm); if (!J) { J = makeJudge(new G(T)); judges.set(nm, J); }
    const Rr = rasterJudge(J, c0, r0, P, P, ppu);
    for (let i = 0; i < P * P; i++) {
      let f = [1, 1, 1]; const cv = Rr.cov[i];
      if (Rr.chain[i] >= 0) { const k = runAt(m.sp, Rr.chain[i], Rr.s[i]); if (k >= 0) { runColour(m.sp.runs[k], Rr.s[i], col); f = [1 + (col[0] - 1) * cv, 1 + (col[1] - 1) * cv, 1 + (col[2] - 1) * cv]; } }
      const a = Math.min(1, Math.max(0, Rr.ink[i]));
      for (let q = 0; q < 3; q++) img[3 * i + q] = Math.round(255 * f[q] * (1 - a));
    }
    if (process.env.K1433_DBG) { const F = analyze(Rr, T); for (let i = 0; i < P * P; i++) { if (F.edge[i]) { img[3 * i] = 255; img[3 * i + 1] = 0; img[3 * i + 2] = 0; } if (F.rstray[i] || F.rthin[i] || F.rbreak[i]) { img[3 * i] = 0; img[3 * i + 1] = 0; img[3 * i + 2] = 255; } } }
    const fs = allFinds(Rr, T, c0, r0, 6).filter((f) => Math.hypot(f.x - X, f.y - Y) < R);
    const sum: Record<string, string> = {};
    for (const f of fs) { const k = `${f.kind}:${f.cls}`; sum[k] = (sum[k] ? sum[k] + "+" : "") + f.px; }
    rows.push(`${spec}\t${sfx}\t${fs.length ? "FLAG" : "clean"}\t${JSON.stringify(sum)}`);
  }
  if (outDir && outDir !== "-") { writeFileSync(join(outDir, `${base}_${sfx}.bin`), img); writePng(join(outDir, `${base}_${sfx}.png`), img, P, P); }
}
console.log(rows.join("\n"));
