// K1139 Stage 3 S3.2: the fa >= 0.999 kink (deviation 8), from
// diag_s3b.mjs's fa32 dumps (per pixel per band: the twin's crest cr and
// its quiet value qq; fa = K_BAND qq, unquantized; -1 = band not
// evaluated there). sF = (K_BAND cr - fa) / max(1 - fa, 1e-3): the floor
// engages only where fa > 0.999. Reports, per record over the phases:
// band-pixels evaluated, of them with cov > 0, max fa (all / cov > 0),
// a histogram of fa, the count with fa >= 0.999, and max K_BAND cr.
//
//   node fa_kink.mjs <dumpDir> [phases=0-7]
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const [DIR, PHS] = process.argv.slice(2);
const PH = (PHS ?? "0-7").split(",").flatMap((t) => {
  const m = /^(\d+)-(\d+)$/.exec(t);
  if (!m) return [Number(t)];
  const a = [];
  for (let k = Number(m[1]); k <= Number(m[2]); k++) a.push(k);
  return a;
});
const KB = (0.94 * 110) / 111;
const meta = JSON.parse(readFileSync(join(DIR, "meta.json"), "utf8"));
const NB = 4, PB = 9, PX = NB * PB + 10;
const EDGES = [0.5, 0.8, 0.9, 0.92, 0.93, 0.95, 0.99, 0.999];
let gMax = -1, gMaxCov = -1, gN999 = 0, gCr = -1;
for (const rc of meta.recs) {
  if (!rc.bands || !rc.bands.length) continue;
  const n = rc.box.w * rc.box.h;
  let nEval = 0, nCov = 0, mx = -1, mxCov = -1, n999 = 0, crMax = -1, at = null;
  const hist = new Array(EDGES.length + 1).fill(0);
  for (const k of PH) {
    const ff = join(DIR, `r${rc.ji}_t${k}.fa32`);
    if (!existsSync(ff)) continue;
    const fa32 = new Float32Array(readFileSync(ff).buffer.slice(0));
    const u8 = new Uint8Array(readFileSync(join(DIR, `r${rc.ji}_t${k}.u8`)));
    for (let i = 0; i < n; i++)
      for (let b = 0; b < rc.bands.length; b++) {
        const cr = fa32[(i * NB + b) * 2], qq = fa32[(i * NB + b) * 2 + 1];
        if (cr < -0.5 && qq < -0.5) continue;
        nEval++;
        const fa = KB * qq;
        const cov = u8[i * PX + b * PB + 1];
        let j = 0;
        while (j < EDGES.length && fa >= EDGES[j]) j++;
        hist[j]++;
        if (fa > mx) { mx = fa; at = { k, X: i % rc.box.w, Y: Math.floor(i / rc.box.w), b, cr, qq, cov }; }
        if (cov > 0) { nCov++; mxCov = Math.max(mxCov, fa); }
        if (fa >= 0.999) n999++;
        crMax = Math.max(crMax, KB * cr);
      }
  }
  if (!nEval) { console.log(`ji ${rc.ji}: no fa32 dumps`); continue; }
  gMax = Math.max(gMax, mx); gMaxCov = Math.max(gMaxCov, mxCov); gN999 += n999; gCr = Math.max(gCr, crMax);
  console.log(`ji ${rc.ji}: band-px ${nEval} (cov>0 ${nCov}); max fa ${mx.toFixed(4)} (cov>0 ${mxCov.toFixed(4)}) at t${at.k} (${at.X},${at.Y}) band ${at.b} cr ${at.cr.toFixed(4)} qq ${at.qq.toFixed(4)} cov ${at.cov}; fa>=0.999: ${n999}; max K_BAND cr ${crMax.toFixed(4)}`);
  console.log(`   fa hist ${EDGES.map((e, j) => `<${e}:${hist[j]}`).join(" ")} >=${EDGES[EDGES.length - 1]}:${hist[EDGES.length]}`);
}
console.log(`${meta.stand ?? DIR}: max fa ${gMax.toFixed(4)} (cov>0 ${gMaxCov.toFixed(4)}), fa>=0.999 ${gN999}, max K_BAND cr ${gCr.toFixed(4)}, K_BAND ${KB.toFixed(4)}`);
