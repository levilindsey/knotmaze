// K1436: the v2 bar test over one whole scene (k1451_scan.ts's arguments and JSON, `finds` = v2's), with v1's
// tally (K1433's allFinds on the same raster) beside it in `cnt1` / `px1`.
//
// HOW TO RUN
//   node scripts/run_node.mjs .claude/probes/K1436/k1436_scan.ts <sfx> <scene> <ppu> <out.json>
//   pwsh -NoProfile -File .claude/probes/K1436/k1436_scanall.ps1 [-HomeOn 1|""] [-Ppu 100] [-Tag scan_h1]
//     (all 12 census scenes in parallel; prints v1 beside v2 per kind:class and the wall time)
//   Spots (480 px crops, 2.5 h, finds within R and a marked 4x panel):
//   node scripts/run_node.mjs .claude/probes/K1436/k1436_spots.ts <src|u|d547|1336> <scene:x:y,...> [outDir|-] [R]
// Env: GF_HOME=1 the home flag; K1436_EV = src (default, the working tree's GfEval) | u | d547 | 1336 (K1433's
// snapshots); K1436_PH = a sub-pixel phase (px) added to the raster origin (the two-load noise measurement);
// K1436_NOISE=1 adds the residual quantiles (|res| / aa over every measured band site) to the JSON and the row.
// k1451_cls.ts reads the JSON unchanged: `finds` holds {kind, cls, x, y, px, peak}; v2's kinds are dstray, rstray
// (v1's, kept), vdip and vwide (the band profile; replace v1's dbreak, rbreak, rthin).
//
// THE TEST (k1436_lib.ts has the mechanics): every exposed edge gives a site per pixel pair; a ray from it along the
// edge normal (averaged over 1 aa) measures the band's width wIn (outer to inner 0.5 crossing). The level is a
// quadratic fit of wIn over the same boundary's sites within 4 aa; the residual (wIn - level, median over 0.5 aa)
// flags vdip below -DW and vwide above +DW; a band whose core (ink between the two edges, 1 aa in) falls under 0.75
// flags vdip too. Sites within 1 aa of a corner (the smoothed normal turns more than 30 deg within 1 aa) are exempt
// from the width test; a ray that crosses onto another surface before the inner edge has no width (a crossing's
// band runs into the other thread: the GEOMETRIC CROSSING EXEMPTION - the ray stops at the crossing, so a clean
// crossing never flags, while a smear ON the band, before the crossing, still changes wIn or the core).
//
// THRESHOLDS (aa = the scene's aa in px; measured 2026-11-17, K1436 brief's validations):
//   DW 0.08 aa: src at 480 px crops, the 25 clean K1433 spots' largest |residual| is 0.088 aa at one corner-adjacent
//     site and <= 0.045 aa elsewhere; the def seam notches on d547dab6 reach 0.14-0.32 aa (src 0.016-0.021 at the
//     same spots). At the scan's 100 px/unit the noise floor is larger in aa units: see NOISE below.
//   MINLEN 0.5 aa (>= 2 px): one find = a connected run of flagged sites at least this long; the notches are 4-8 px
//     at the crops' 8.3 px aa.
//   RSM 0.5 aa: the residual's median radius. 0.75 aa removed the notch with the noise, raw residuals kept isolated
//     0.17-0.19 aa staircase outliers.
//   CORNER cos 0.87 (30 deg) within NSM 1 aa: the eye's cusps on muse_hash:5.53 (0.167 aa, clean in every evaluator
//     that has no eye) flag without it; 0.96 loses two of the three def notches.
//   CORE 0.75, PAST 0.5 aa: a band with a hole in it, ink past the inner edge.
//   SEAM 0.08 (max RGB, 0..1): a label change with NO band flags as a dip only when the fills either side differ by
//     more than this: g41_ring_tw64:19.78:20.37 (purple against cyan, no band; one of K1451's twelve) flags, the
//     invisible same-colour seams (fat:2.425:1.472, 359 px of "vdip" in v2 s1) do not. NOBAND=1 flags every one.
// AT THE SCAN'S 100 px/unit (aa ~1.1 px) the crop thresholds sit under a pixel, so the scan raises them (the spots
// tool, at the crops' 5.6-8.3 px aa, keeps the defaults above):
//   UPX 3 px: every aa-based radius (normal smoothing, corners, the median) is at least 3 px. Without it def flagged
//     2484 band finds.
//   DWPX 0.6 px: the width floor. Two loads at sub-pixel phases 0 and 0.37 px repeat 84% (def) and 94% (muse_hash) of
//     their finds at 0.6 px with 4 px finds; 52% at 0.3 px with 2 px finds (k1436_agree.ts, out/noise/).
//   MINPX 9: band finds under 9 px dropped (precision sheet 1: every sampled vdip under 9 px was a clean corner).
//   WIDE 0: no vwide (sheet 1: 10 of 11 sampled vwide were clean band edges or corners; the notches vwide exists for
//     are 0.14-0.32 aa = 0.15-0.35 px here, under the noise). The crops keep vwide (validation 2b needs it).
// MEASURED PRECISION (by eye, 4x tiles, out/prec/sheet2_*, sheet3_*; 50 finds): 88% real; tie 16/16, plain 14/15,
// ramp 14/19 (vdip:ramp 3 of 6 false: clean band edges by white). Run time: 12 scenes in parallel, ~65-85 s wall.
import { writeFileSync } from "node:fs";
import { makeJudge, modelOf, tablesOf, rasterJudge, allFindsV2, loadEval, P as PAR } from "./k1436_lib.ts";
import { allFinds } from "../K1433/k1433_lib.ts";
const [sfx, nm, ppuS, out] = process.argv.slice(2);
// the scan's width floor: 0.6 px (two loads at phases 0 and 0.37 px on def and muse_hash at 100 px/unit repeat 84% and
// 94% of their finds with DWPX 0.6 and MINPX 4; 52% with 0.3 px and 2 px finds, where 2-3 px vwide:plain finds repeat 1 in 4)
if (process.env.K1436_DWPX === undefined) PAR.DWPX = 0.6;
// and at that resolution: no vwide (10 of 11 sampled vwide finds were clean band edges or corners; the notches it
// exists for are 0.15 px there) and band finds of 9 px or more (5 of 5 sampled vdip finds under 9 px were clean corners)
if (process.env.K1436_WIDE === undefined) PAR.WIDE = 0;
if (process.env.K1436_MINPX === undefined) PAR.MINPX = 9;
const ppu = +ppuS; const ev = process.env.K1436_EV ?? "src"; const ph = +(process.env.K1436_PH ?? 0);
const G = ev === "src" ? (await import("../../../src/render/gpu_field/eval.ts")).GfEval : await loadEval(ev);
if (ev === "u") G.MODE = "master";
const T = tablesOf(nm); const M = modelOf(nm);
let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
for (let i = 0; i < T.vx.length; i++) { const x = T.vx[i], y = T.vy[i]; if (!(x === x) || !(y === y)) continue; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
const pad = T.h * 2; const c0 = Math.floor((x0 - pad) * ppu) + ph, r0 = Math.floor((y0 - pad) * ppu) + ph;
const w = Math.ceil((x1 + pad) * ppu) - Math.floor((x0 - pad) * ppu), h = Math.ceil((y1 + pad) * ppu) - Math.floor((y0 - pad) * ppu);
const J = makeJudge(new G(T));
const t0 = Date.now(); const R = rasterJudge(J, c0, r0, w, h, ppu); const msR = Date.now() - t0;
const t1 = Date.now(); const f1 = allFinds(R, T, c0, r0, 3); const ms1 = Date.now() - t1;
const t2 = Date.now(); const { finds: fs, S } = allFindsV2(R, T, c0, r0, 3, undefined, M); const ms2 = Date.now() - t2;
const tally = (a: { kind: string; cls: string; px: number }[]): [Record<string, number>, Record<string, number>] => { const c: Record<string, number> = {}, p: Record<string, number> = {}; for (const f of a) { const k = `${f.kind}:${f.cls}`; c[k] = (c[k] ?? 0) + 1; p[k] = (p[k] ?? 0) + f.px; } return [c, p]; };
const [cnt, px] = tally(fs); const [cnt1, px1] = tally(f1);
let noise: Record<string, number> | undefined;
if (process.env.K1436_NOISE) {
  const aaP = T.aa * ppu; const v: number[] = [];
  for (let k = 0; k < S.n; k++) if (S.lvl[k] >= 2 * aaP && S.wIn[k] >= 0) v.push(Math.abs(S.res[k]) / aaP);
  v.sort((a, b) => a - b); const q = (p: number): number => +(v[Math.min(v.length - 1, Math.floor(p * v.length))] ?? 0).toFixed(4);
  noise = { n: v.length, q50: q(0.5), q90: q(0.9), q99: q(0.99), q999: q(0.999), q9999: q(0.9999), max: q(1) };
}
const ms = { raster: msR, v1: ms1, v2: ms2 };
writeFileSync(out, JSON.stringify({ scene: nm, sfx, ev, home: process.env.GF_HOME ?? "", ppu, ph, w, h, params: PAR, cnt, px, cnt1, px1, ms, noise, finds: fs }));
console.log(`${nm}\t${sfx}\tv2 ${fs.length}\t${JSON.stringify(cnt)}\tv1 ${f1.length}\t${JSON.stringify(cnt1)}\t${JSON.stringify(ms)}${noise ? "\t" + JSON.stringify(noise) : ""}`);
