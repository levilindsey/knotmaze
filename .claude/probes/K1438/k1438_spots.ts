// K1438: per spot, K1433's bar test within R of the spot and (with an out dir) the 4x panel (.bin + .png), 480 px of 2.5 h.
//   node scripts/run_node.mjs .claude/probes/K1438/k1438_spots.ts <sfx> <scene:x:y,...> [outDir|-] [R=0.28]
// sfx "ol" = rp=outline's panel (no test). Otherwise the evaluator is env K1438_EV: src (default: src eval.ts; the
// switch from env GF_HOME=1 through the tables), m (master's copy) or tgr (K1435's mode on master). K1438_FL = fadeLength.
import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { rasterOutline } from "../K1314/k1314_census.ts";
import { writePng } from "../K1314/k1314_crops.ts";
import { runAt, runColour, type RGB } from "../../../src/render/outline/paint.ts";
import { makeJudge, modelOf, tablesOf, rasterJudge, allFinds } from "../K1433/k1433_lib.ts";
import { loadEv } from "./k1438_ev.ts";

const [sfx, list, outDir, rArg] = process.argv.slice(2);
const R = rArg ? +rArg : 0.28; const P = 480;
if (outDir && outDir !== "-") mkdirSync(outDir, { recursive: true });
const mk = sfx === "ol" ? null : await loadEv();
const judges = new Map<string, ReturnType<typeof makeJudge>>();
const col: RGB = [0, 0, 0];
const rows: string[] = [];
for (const spec of list.split(",")) {
  const [nm, xs, ys] = spec.split(":"); const X = +xs, Y = +ys;
  const m = modelOf(nm); const T = tablesOf(nm); const h = T.h; const ppu = P / (2.5 * h);
  const c0 = Math.round(X * ppu - P / 2), r0 = Math.round(Y * ppu - P / 2);
  const img = new Uint8Array(P * P * 3).fill(255);
  const base = `${nm}_${X.toFixed(2)}_${Y.toFixed(2)}`;
  if (!mk) {
    const Rs = rasterOutline(m, c0, r0, P, P, ppu);
    for (let i = 0; i < P * P; i++) {
      const a = Math.min(1, Math.max(0, Rs.ink[i]));
      const f = Rs.own[i] > 0 && Rs.rgb[3 * i] >= 0 ? [Rs.rgb[3 * i], Rs.rgb[3 * i + 1], Rs.rgb[3 * i + 2]] : [1, 1, 1];
      for (let q = 0; q < 3; q++) img[3 * i + q] = Math.round(255 * f[q] * (1 - a));
    }
  } else {
    let J = judges.get(nm); if (!J) { J = makeJudge(mk(T)); judges.set(nm, J); }
    const Rr = rasterJudge(J, c0, r0, P, P, ppu);
    for (let i = 0; i < P * P; i++) {
      let f = [1, 1, 1]; const cv = Rr.cov[i];
      if (Rr.chain[i] >= 0) { const k = runAt(m.sp, Rr.chain[i], Rr.s[i]); if (k >= 0) { runColour(m.sp.runs[k], Rr.s[i], col); f = [1 + (col[0] - 1) * cv, 1 + (col[1] - 1) * cv, 1 + (col[2] - 1) * cv]; } }
      const a = Math.min(1, Math.max(0, Rr.ink[i]));
      for (let q = 0; q < 3; q++) img[3 * i + q] = Math.round(255 * f[q] * (1 - a));
    }
    const fs = allFinds(Rr, T, c0, r0, 6).filter((f) => Math.hypot(f.x - X, f.y - Y) < R);
    const sum: Record<string, string> = {};
    for (const f of fs) { const k = `${f.kind}:${f.cls}`; sum[k] = (sum[k] ? sum[k] + "+" : "") + f.px; }
    rows.push(`${spec}\t${sfx}\t${fs.length ? "FLAG" : "clean"}\t${JSON.stringify(sum)}`);
  }
  if (outDir && outDir !== "-") { writeFileSync(join(outDir, `${base}_${sfx}.bin`), img); writePng(join(outDir, `${base}_${sfx}.png`), img, P, P); }
}
console.log(rows.join("\n"));
