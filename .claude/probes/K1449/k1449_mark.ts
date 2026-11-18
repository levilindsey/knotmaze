// K1449: a spot's 4x panel (480 px of 2.5 h, k1438_spots.ts's frame) with K1433's flagged pixels tinted by kind
// (rthin red, rstray green, rbreak orange, dbreak blue, dstray magenta; a ramp/tie pixel's tint is full, a plain one
// half), beside the plain panel. Evaluator: k1449_ev.ts's loadEv (env GF_HOME, K1438_FL, K1438_EV, K1449_MAP).
//   node scripts/run_node.mjs .claude/probes/K1449/k1449_mark.ts <tag> <scene:x:y,...> <outDir>
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { writePng } from "../K1314/k1314_crops.ts";
import { runAt, runColour, type RGB } from "../../../src/render/outline/paint.ts";
import { makeJudge, modelOf, tablesOf, rasterJudge, analyze } from "../K1433/k1433_lib.ts";
import { loadEv } from "./k1449_ev.ts";

const [tag, list, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const P = 480; const mk = await loadEv(); const col: RGB = [0, 0, 0];
const TINT: Record<string, number[]> = { rthin: [230, 30, 30], rstray: [20, 170, 40], rbreak: [255, 140, 0], dbreak: [30, 60, 230], dstray: [210, 0, 210] };
for (const spec of list.split(",")) {
  const [nm, xs, ys] = spec.split(":"); const X = +xs, Y = +ys;
  const m = modelOf(nm); const T = tablesOf(nm); const ppu = P / (2.5 * T.h);
  const c0 = Math.round(X * ppu - P / 2), r0 = Math.round(Y * ppu - P / 2);
  const J = makeJudge(mk(T)); const R = rasterJudge(J, c0, r0, P, P, ppu); const F = analyze(R, T);
  const W2 = 2 * P + 4; const img = new Uint8Array(W2 * P * 3).fill(128);
  const db = (i: number): boolean => R.def[i] > 0.15 && !R.multi[i];
  const cnt: Record<string, number> = {};
  for (let i = 0; i < P * P; i++) {
    let f = [1, 1, 1]; const cv = R.cov[i];
    if (R.chain[i] >= 0) { const k = runAt(m.sp, R.chain[i], R.s[i]); if (k >= 0) { runColour(m.sp.runs[k], R.s[i], col); f = [1 + (col[0] - 1) * cv, 1 + (col[1] - 1) * cv, 1 + (col[2] - 1) * cv]; } }
    const a = Math.min(1, Math.max(0, R.ink[i]));
    const px = f.map((q) => Math.round(255 * q * (1 - a)));
    const r = (i / P) | 0, c = i - r * P;
    for (let q = 0; q < 3; q++) img[3 * (r * W2 + c) + q] = px[q];
    const kind = F.rthin[i] ? "rthin" : F.rstray[i] ? "rstray" : F.rbreak[i] ? "rbreak" : db(i) ? "dbreak" : R.dstray[i] ? "dstray" : "";
    let out = px;
    if (kind) { const t = R.cls[i] === 0 ? 0.5 : 0.9; out = px.map((v, q) => Math.round(v * (1 - t) + TINT[kind][q] * t)); const key = `${kind}:${["plain", "ramp", "tie", "thru"][R.cls[i]]}`; cnt[key] = (cnt[key] ?? 0) + 1; }
    for (let q = 0; q < 3; q++) img[3 * (r * W2 + P + 4 + c) + q] = out[q];
  }
  const file = join(outDir, `mark_${nm}_${X.toFixed(2)}_${Y.toFixed(2)}_${tag}.png`);
  writePng(file, img, W2, P);
  console.log(`${spec}\t${tag}\t${JSON.stringify(cnt)}\t${file}`);
}
