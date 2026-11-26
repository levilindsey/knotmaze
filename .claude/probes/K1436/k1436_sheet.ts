// K1436: precision sheet - a 4x crop per scan find (240 px at 4x the scan's px/unit, centred on the find), the v2 test
// rerun on a padded scan-resolution window there and its flagged pixels outlined at 4x (vdip blue, vwide magenta,
// dstray / rstray orange); the sampled find's own pixels are filled. Tiles go in rows of 4, numbered row-major.
//   node scripts/run_node.mjs .claude/probes/K1436/k1436_sheet.ts <list.tsv> <out.png> [ppu=100]
//   list rows: scene<TAB>x<TAB>y<TAB>kind<TAB>cls (GF_HOME as the scan that found them)
import { readFileSync } from "node:fs";
import { writePng } from "./bar_model.ts";
import { runAt, runColour, type RGB } from "./bar_model.ts"; // was src/render/outline/paint.ts + K1314 crops (deleted 2026-11-25)
import { makeJudge, modelOf, tablesOf, rasterJudge, allFindsV2, P as PAR } from "./k1436_lib.ts";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";
const [list, out, ppuS] = process.argv.slice(2);
const ppu = ppuS ? +ppuS : 100; const Z = 4; const TS = 240; const COLS = 4;
if (process.env.K1436_DWPX === undefined) PAR.DWPX = 0.6;
if (process.env.K1436_WIDE === undefined) PAR.WIDE = 0;
if (process.env.K1436_MINPX === undefined) PAR.MINPX = 9;
const rows = readFileSync(list, "utf8").split(/\r?\n/).filter((l) => l.trim()).map((l) => l.split("\t"));
const NR = Math.ceil(rows.length / COLS); const IW = COLS * (TS + 4), IH = NR * (TS + 4);
const img = new Uint8Array(IW * IH * 3).fill(60);
const judges = new Map<string, any>(); const col: RGB = [0, 0, 0];
rows.forEach(([nm, xs, ys, kind], n) => {
  const X = +xs, Y = +ys; const m = modelOf(nm); const T = tablesOf(nm);
  let J = judges.get(nm); if (!J) { J = makeJudge(new GfEval(T)); judges.set(nm, J); }
  // the test at scan resolution: a window of TS/Z px plus a pad wide enough for the rays and the level fit
  const half = TS / Z / 2; const pad = Math.ceil((T.W * 1.5 + 3 * T.aa) * ppu + 4 * Math.max(PAR.UPX, T.aa * ppu) + 12);
  const c0 = Math.round(X * ppu - half) - pad, r0 = Math.round(Y * ppu - half) - pad; const W2 = Math.round(2 * half) + 2 * pad;
  const R = rasterJudge(J, c0, r0, W2, W2, ppu);
  const { finds: fs, S } = allFindsV2(R, T, c0, r0, 3, undefined, m);
  // flag maps at scan resolution: band sites by why, strays from the raster / the v1 analysis kept in v2
  const fl = new Uint8Array(W2 * W2);
  for (let k = 0; k < S.n; k++) if (S.flag[k]) fl[S.pix[k]] = S.why[k] <= 2 ? 1 : 2;
  for (let i = 0; i < W2 * W2; i++) if (R.dstray[i]) fl[i] = 3;
  const tx = (n % COLS) * (TS + 4) + 2, ty = Math.floor(n / COLS) * (TS + 4) + 2; const P4 = ppu * Z;
  for (let r = 0; r < TS; r++) for (let c = 0; c < TS; c++) {
    const wx = X + (c + 0.5 - TS / 2) / P4, wy = Y + (r + 0.5 - TS / 2) / P4; const j = J(wx, wy);
    let f = [1, 1, 1]; if (j.chain >= 0) { const k = runAt(m.sp, j.chain, j.s); if (k >= 0) { runColour(m.sp.runs[k], j.s, col); f = [1 + (col[0] - 1) * j.cov, 1 + (col[1] - 1) * j.cov, 1 + (col[2] - 1) * j.cov]; } }
    const a = Math.min(1, Math.max(0, j.ink)); const o = ((ty + r) * IW + tx + c) * 3;
    for (let q = 0; q < 3; q++) img[o + q] = Math.round(255 * f[q] * (1 - a));
    // the scan pixel under this crop pixel; outline flagged scan pixels (their 4x4 block's border)
    const sc = Math.floor(wx * ppu) - c0, sr = Math.floor(wy * ppu) - r0; if (sc < 0 || sr < 0 || sc >= W2 || sr >= W2) continue;
    const v = fl[sr * W2 + sc]; if (!v) continue;
    const fx = wx * ppu - Math.floor(wx * ppu), fy = wy * ppu - Math.floor(wy * ppu); const edge = fx < 1 / Z || fy < 1 / Z || fx > 1 - 1 / Z || fy > 1 - 1 / Z;
    if (!edge) continue; const rgb = v === 1 ? [0, 80, 255] : v === 2 ? [255, 0, 200] : [255, 140, 0];
    img[o] = rgb[0]; img[o + 1] = rgb[1]; img[o + 2] = rgb[2];
  }
  // a small cross at the sampled find's centroid
  for (let d = -6; d <= 6; d++) for (const [c, r] of [[TS / 2 + d, TS / 2], [TS / 2, TS / 2 + d]]) { if (Math.abs(d) < 3) continue; const o = ((ty + r) * IW + tx + c) * 3; img[o] = 255; img[o + 1] = 0; img[o + 2] = 0; }
  const near = fs.filter((f) => Math.hypot(f.x - X, f.y - Y) < 0.05).map((f) => `${f.kind}:${f.cls}:${f.px}`).join(" ");
  console.log(`${n + 1}\t${nm}\t${X.toFixed(3)}\t${Y.toFixed(3)}\t${kind}\tlocal: ${near || "-"}`);
});
writePng(out, img, IW, IH);
