// K1139 S3b fix, the offline half of diag_s3b.mjs: reads its dumps and
// reports, per banded record and phase, the band switches (the seams),
// the fan pixels no band covers, and the GPU seams count of the brief's
// section 5 (dbg 5's G: a fan pixel whose step to a 4-neighbour exceeds
// the crest's steepest step along an arm at this zoom, plus 2/255, with
// the band union's AA rim excluded).
//
//   node diag_an.mjs <dumpDir> [outDir] [phases=0-7] [ji,ji,...]
//
// With outDir it also writes, per record and phase, a panel strip at 2x:
// GPU normal | GPU webs off | CPU out | winner map | GPU G (dbg 5) | seams.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";

const DIR = process.argv[2];
const OUT = process.argv[3] && process.argv[3] !== "-" ? process.argv[3] : null;
const PH = (process.argv[4] ?? "0-7").split(",").flatMap((t) => {
  const m = /^(\d+)-(\d+)$/.exec(t);
  if (!m) return [Number(t)];
  const a = [];
  for (let k = Number(m[1]); k <= Number(m[2]); k++) a.push(k);
  return a;
});
const ONLY = process.argv[5] ? process.argv[5].split(",").map(Number) : null;
const meta = JSON.parse(readFileSync(join(DIR, "meta.json"), "utf8"));
if (OUT) mkdirSync(OUT, { recursive: true });

const NB = 4, PB = 9, PX = NB * PB + 10;
// The crest's steepest slope: the bump rises 0.9 over CREST_WIDTH 0.72
// (paint_math kPulseCrest; the floor is 0 past PULSE_FLOOR_REACH 2, and
// every banded record here has distJ > 2). One device px of arc is pxW.
const SLOPE = 0.9 / 0.72;
const T = SLOPE * meta.pxW * 255 + 2;
const img = (k, v) => {
  const p = join(DIR, `t${k}_${v}.png`);
  return existsSync(p) ? toRGB(decodePNG(readFileSync(p))) : null;
};

const summary = [];
for (const rc of meta.recs) {
  if (!rc.bands || !rc.bands.length) continue;
  if (ONLY && !ONLY.includes(rc.ji)) continue;
  const { w: BW, h: BH } = rc.box;
  const ox = rc.box.x - meta.clip.x * meta.dsf, oy = rc.box.y - meta.clip.y * meta.dsf;
  const nb = rc.bands.length;
  const cls = (a, b) => {
    const sa = rc.bands[a].shared > 0.5, sb = rc.bands[b].shared > 0.5;
    const ia = rc.bands[a].flags % 2, ib = rc.bands[b].flags % 2;
    const pairA = rc.bands[a].ia === rc.bands[b].ia;
    if (ia !== ib) return "in/out";
    if (sa !== sb) return "shared/drawing";
    if (sa && sb) return "shared/shared";
    return pairA ? "fork-siblings" : "other-pairs";
  };
  for (const k of PH) {
    const fu = join(DIR, `r${rc.ji}_t${k}.u8`);
    if (!existsSync(fu)) continue;
    const u8 = new Uint8Array(readFileSync(fu));
    const f32 = new Float32Array(new Uint8Array(readFileSync(join(DIR, `r${rc.ji}_t${k}.f32`))).buffer);
    // Stage 3 (S3.1): per pixel per band, the twin's compression c (from the
    // header's P; 1 off the pivot, -1 where the band is absent) and mode.
    const fc = join(DIR, `r${rc.ji}_t${k}.c32`);
    const C32 = existsSync(fc) ? new Float32Array(new Uint8Array(readFileSync(fc)).buffer) : null;
    const cAt = (i, b) => {
      if (!C32 || b < 0) return 1;
      const c = C32[(i * NB + b) * 2];
      return c > 0 ? c : 1;
    };
    const n = BW * BH;
    const win = new Int8Array(n), mc = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const o = i * PX;
      win[i] = u8[o + 45] - 1;
      let m = 0;
      for (let b = 0; b < nb; b++) m = Math.max(m, u8[o + b * PB + 1]);
      mc[i] = m;
    }
    const inner = new Uint8Array(n);
    for (let Y = 1; Y < BH - 1; Y++)
      for (let X = 1; X < BW - 1; X++) {
        let ok = 1;
        for (let dy = -1; dy <= 1 && ok; dy++)
          for (let dx = -1; dx <= 1; dx++) if (mc[(Y + dy) * BW + X + dx] < 255) { ok = 0; break; }
        inner[Y * BW + X] = ok;
      }
    // GPU frames, cropped to the box.
    const gN = img(k, "n"), gW = img(k, "w"), gD = img(k, "d"), gDW = img(k, "dw");
    const at = (im, X, Y, c) => {
      const x = X + ox, y = Y + oy;
      if (!im || x < 0 || y < 0 || x >= im.W || y >= im.H) return -1;
      return im.data[(y * im.W + x) * 3 + c];
    };
    const foot = new Uint8Array(n);
    let nFoot = 0;
    for (let Y = 0; Y < BH; Y++)
      for (let X = 0; X < BW; X++) {
        let d = 0;
        for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(at(gD, X, Y, c) - at(gDW, X, Y, c)), Math.abs(at(gN, X, Y, c) - at(gW, X, Y, c)));
        if (d > 0) { foot[Y * BW + X] = 1; nFoot++; }
      }
    // The web mesh's own AA rim is not a seam: keep footprint pixels whose
    // 8 neighbours are footprint too.
    const footIn = new Uint8Array(n);
    for (let Y = 1; Y < BH - 1; Y++)
      for (let X = 1; X < BW - 1; X++) {
        let ok = 1;
        for (let dy = -1; dy <= 1 && ok; dy++)
          for (let dx = -1; dx <= 1; dx++) if (!foot[(Y + dy) * BW + X + dx]) { ok = 0; break; }
        footIn[Y * BW + X] = ok;
      }
    // Seams: GPU G and the CPU twin's G (winner v * cov) in the same mask.
    const seamG = new Uint8Array(n), seamC = new Uint8Array(n);
    let nSeamG = 0, nSeamC = 0, maxStepG = 0, maxStepC = 0, maxSame = 0;
    const byCls = {};
    // S3.1: same-band steps in (T, T x c] are compression ramps (c the
    // band's compression, the larger of the two pixels', clamped at 1 so the
    // outer side keeps T); everything else above T is a seam, as before.
    // seamOld is Stage 2's count (every step above T).
    const rampG = new Uint8Array(n), seamOld = new Uint8Array(n);
    const ramp = { maxC: 0, atMaxC: null, worst: 0, atWorst: null, outerStrict: 0 };
    const m0 = new Set(rc.bands.map((b, bi) => (!b.piv || b.piv.code < 4096 ? bi : -1)).filter((bi) => bi >= 0));
    let m0Seams = 0;
    const sameSub = {}, sameG = { max: 0, gOverC: 0, jumps: [] };
    const sw = { n: 0, dv: 0, dOut: 0 };
    // Stage 2 (b): kFanPulseV is the max over bands of v * cov (win is its argmax).
    const cpuG = (i) => {
      let g = 0;
      for (let b = 0; b < nb; b++) g = Math.max(g, (u8[i * PX + b * PB] * u8[i * PX + b * PB + 1]) / 255);
      return g;
    };
    for (let Y = 1; Y < BH - 1; Y++)
      for (let X = 1; X < BW - 1; X++) {
        const i = Y * BW + X;
        if (!inner[i]) continue;
        for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
          const j = (Y + dy) * BW + X + dx;
          if (!inner[j]) continue;
          if (win[i] !== win[j] && win[i] >= 0 && win[j] >= 0 && dx + dy > 0) {
            sw.n++;
            const dvv = Math.abs(u8[i * PX + win[i] * PB] - u8[i * PX + win[j] * PB]);
            sw.dv = Math.max(sw.dv, dvv);
            let dO = 0;
            for (let c = 0; c < 3; c++) dO = Math.max(dO, Math.abs(u8[i * PX + 42 + c] - u8[j * PX + 42 + c]));
            sw.dOut = Math.max(sw.dOut, dO);
          }
          const sc = Math.abs(cpuG(i) - cpuG(j));
          if (win[i] === win[j]) maxSame = Math.max(maxSame, sc);
          maxStepC = Math.max(maxStepC, sc);
          if (sc > T) seamC[i] = 1;
          if (footIn[i] && footIn[j]) {
            const sg = Math.abs(at(gD, X, Y, 1) - at(gD, X + dx, Y + dy, 1));
            maxStepG = Math.max(maxStepG, sg);
            const same = win[i] === win[j] && win[i] >= 0;
            const cS = same ? Math.max(cAt(i, win[i]), cAt(j, win[i])) : 1;
            // A literal T x c on the outer side (c < 1) would flag these too.
            if (same && cS < 1 && sg > T * cS && sg <= T) ramp.outerStrict++;
            if (sg > T) {
              seamOld[i] = 1;
              if (same && sg <= T * Math.max(1, cS)) {
                rampG[i] = 1;
                if (cS > ramp.maxC) { ramp.maxC = cS; ramp.atMaxC = [X, Y, dx, dy, sg, win[i]]; }
                const rr = sg / T;
                if (rr > ramp.worst) { ramp.worst = rr; ramp.atWorst = [X, Y, dx, dy, sg, +cS.toFixed(3), win[i]]; }
              } else {
                if (!seamG[i]) {
                  const key = win[i] >= 0 && win[j] >= 0 && win[i] !== win[j] ? cls(win[i], win[j]) : win[i] === win[j] ? "same-band" : "edge";
                  byCls[key] = (byCls[key] ?? 0) + 1;
                  if (m0.has(win[i]) || m0.has(win[j])) m0Seams++;
                  // Diagnosis only (not the ruling's count): what a same-band
                  // seam above T x c is. "steep" = the twin's own tau step along
                  // this pixel step explains it (SLOPE x |dtau| x 255 + 2, both
                  // covers full); "cover" = the band's AA edge over another band;
                  // "jump" = neither.
                  if (same) {
                    const b = win[i];
                    const ci = u8[i * PX + b * PB + 1], cj = u8[j * PX + b * PB + 1];
                    const dt = Math.abs(f32[(i * NB + b) * 2 + 1] - f32[(j * NB + b) * 2 + 1]);
                    const g = dt / meta.pxW;
                    let sub = ci < 255 || cj < 255 ? "cover" : sg <= SLOPE * dt * 255 + 2 ? "steep" : "jump";
                    // A jump the twin cannot see: one side's GPU pulse is 0 (a web
                    // piece with no band pulse), or equals the webs-off frame's
                    // (the arm's own ribbon shows there, not the fan).
                    if (sub === "jump") {
                      const gi = at(gD, X, Y, 1), gj = at(gD, X + dx, Y + dy, 1);
                      const wi = at(gDW, X, Y, 1), wj = at(gDW, X + dx, Y + dy, 1);
                      sub = gi === 0 || gj === 0 ? "jump:zero" : gi === wi || gj === wj ? "jump:arm" : "jump:other";
                    }
                    sameSub[sub] = (sameSub[sub] ?? 0) + 1;
                    if (sub === "steep") { sameG.max = Math.max(sameG.max, g); sameG.gOverC = Math.max(sameG.gOverC, g / Math.max(1, cS)); }
                    if (sub === "jump:other" && sameG.jumps.length < 6) sameG.jumps.push([X, Y, dx, dy, sg, +g.toFixed(2), +cS.toFixed(2), b]);
                  }
                }
                seamG[i] = 1;
              }
            }
          }
        }
      }
    for (let i = 0; i < n; i++) { nSeamG += seamG[i]; nSeamC += seamC[i]; }
    let nRamp = 0, nOld = 0;
    for (let i = 0; i < n; i++) { if (rampG[i] && !seamG[i]) nRamp++; nOld += seamOld[i]; }
    // Fan pixels outside every band (the quiet base shows).
    let nBare = 0;
    for (let i = 0; i < n; i++) if (foot[i] && mc[i] === 0) nBare++;
    const row = {
      ji: rc.ji, k, foot: nFoot, inner: inner.reduce((a, b) => a + b, 0), bare: nBare,
      switches: sw.n, swDv: sw.dv, swDout: sw.dOut, seamG: nSeamG, seamC: nSeamC,
      maxStepG, maxStepC: +maxStepC.toFixed(1), maxSame: +maxSame.toFixed(1), byCls,
      seamOld: nOld, ramps: nRamp, rampMaxC: +ramp.maxC.toFixed(3), rampAtMaxC: ramp.atMaxC,
      rampWorst: +ramp.worst.toFixed(3), rampAtWorst: ramp.atWorst, outerStrict: ramp.outerStrict,
      m0: m0.size, m0Seams, hasC: !!C32,
      sameSub, steepGmax: +sameG.max.toFixed(3), steepGoverC: +sameG.gOverC.toFixed(3), jumps: sameG.jumps,
    };
    summary.push(row);
    console.log(JSON.stringify(row));
    if (!OUT) continue;
    // Panels at 2x around the record's centre (the box is centred on it).
    const S = Number(process.env.AN_SCALE ?? 2), CWp = Math.min(BW, 200), CHp = Math.min(BH, 200);
    let x0 = Math.floor((BW - CWp) / 2), y0 = Math.floor((BH - CHp) / 2), cw = CWp, ch = CHp;
    if (process.env.AN_CROP) [x0, y0, cw, ch] = process.env.AN_CROP.split(",").map(Number);
    const NP = 6, G = 4;
    const PW = cw * S, PH2 = ch * S, W = NP * PW + (NP - 1) * G;
    const data = Buffer.alloc(W * PH2 * 3, 40);
    const COL = [[255, 60, 60], [60, 220, 60], [80, 120, 255], [240, 220, 40]];
    const put = (p, X, Y, rgb) => {
      for (let sy = 0; sy < S; sy++)
        for (let sx = 0; sx < S; sx++) {
          const o = ((Y * S + sy) * W + p * (PW + G) + X * S + sx) * 3;
          data[o] = rgb[0]; data[o + 1] = rgb[1]; data[o + 2] = rgb[2];
        }
    };
    for (let Y = 0; Y < ch; Y++)
      for (let X = 0; X < cw; X++) {
        const bx = X + x0, by = Y + y0, i = by * BW + bx, o = i * PX;
        put(0, X, Y, [0, 1, 2].map((c) => Math.max(0, at(gN, bx, by, c))));
        put(1, X, Y, [0, 1, 2].map((c) => Math.max(0, at(gW, bx, by, c))));
        put(2, X, Y, [u8[o + 42], u8[o + 43], u8[o + 44]]);
        if (win[i] >= 0) {
          const cv = u8[o + win[i] * PB + 1] / 255, sh = rc.bands[win[i]].shared > 0.5 ? 0.5 : 1;
          put(3, X, Y, COL[win[i]].map((c) => Math.round(c * cv * sh)));
        } else put(3, X, Y, foot[i] ? [90, 90, 90] : [0, 0, 0]);
        const g = Math.max(0, at(gD, bx, by, 1));
        put(4, X, Y, [g, g, g]);
        put(5, X, Y, seamG[i] ? [255, 255, 255] : rampG[i] ? [255, 150, 40] : foot[i] ? (inner[i] ? [60, 60, 110] : [40, 40, 60]) : [0, 0, 0]);
      }
    writeFileSync(join(OUT, `an_r${rc.ji}_t${k}.png`), encodePNG({ W, H: PH2, data }));
  }
}
const tot = {};
for (const r of summary) {
  const t = (tot[r.ji] ??= { seamG: 0, seamC: 0, bare: 0, switches: 0, swDv: 0, maxStepG: 0, seamOld: 0, ramps: 0, rampMaxC: 0, rampWorst: 0, rampAtWorst: null, outerStrict: 0, m0: r.m0, m0Seams: 0, byCls: {} });
  t.seamG += r.seamG; t.seamC += r.seamC; t.bare += r.bare; t.switches += r.switches;
  t.swDv = Math.max(t.swDv, r.swDv); t.maxStepG = Math.max(t.maxStepG, r.maxStepG);
  t.seamOld += r.seamOld; t.ramps += r.ramps; t.rampMaxC = Math.max(t.rampMaxC, r.rampMaxC);
  if (r.rampWorst > t.rampWorst) { t.rampWorst = r.rampWorst; t.rampAtWorst = [r.k, ...r.rampAtWorst]; }
  t.outerStrict += r.outerStrict; t.m0Seams += r.m0Seams;
  for (const [kk, v] of Object.entries(r.byCls)) t.byCls[kk] = (t.byCls[kk] ?? 0) + v;
  t.sameSub ??= {};
  for (const [kk, v] of Object.entries(r.sameSub)) t.sameSub[kk] = (t.sameSub[kk] ?? 0) + v;
  t.steepGmax = Math.max(t.steepGmax ?? 0, r.steepGmax); t.steepGoverC = Math.max(t.steepGoverC ?? 0, r.steepGoverC);
}
const all = { seamG: 0, seamOld: 0, ramps: 0, rampMaxC: 0, m0: 0, m0Seams: 0, outerStrict: 0 };
for (const t of Object.values(tot)) {
  all.seamG += t.seamG; all.seamOld += t.seamOld; all.ramps += t.ramps; all.m0 += t.m0;
  all.m0Seams += t.m0Seams; all.outerStrict += t.outerStrict; all.rampMaxC = Math.max(all.rampMaxC, t.rampMaxC);
}
console.log("stand " + JSON.stringify(all));
console.log(`T = ${T.toFixed(2)}/255 (slope ${SLOPE.toFixed(3)}/world, pxW ${meta.pxW.toFixed(5)})`);
console.log("totals " + JSON.stringify(tot));
if (OUT) writeFileSync(join(OUT, "an_summary.json"), JSON.stringify({ T, summary, tot, all }, null, 1));
