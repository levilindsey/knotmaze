// K1139 Stage 3 S3.3: does (b)'s max over bands explain the P8 rise? On
// each band's centreline (dnow < 0.5 px) inside the fan's foot (the d frame
// differs from dw, webs off), debug view 5's G (kFanPulseV)
// against the band's own crest 255 cr_b cov_b (what fan.mjs's P8 model
// reads: one band's pulse) and against the max over every band,
// 255 max_j cr_j cov_j (the shader's (b) rule). A pixel off its own crest
// by more than 4 that sits within 4 of the max is lit by a sibling's crest.
// From diag_s3b.mjs's e30 dumps (fa32 = [cr, qq] per band, f32 = [dnow, tau]).
//
//   node p8max.mjs <dumpDir> <ji> [phases=0-7]
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { decodePNG, toRGB } from "./png.mjs";

const [DIR, JI, PHS] = process.argv.slice(2);
const PH = (PHS ?? "0-7").split(",").flatMap((t) => {
  const m = /^(\d+)-(\d+)$/.exec(t);
  if (!m) return [Number(t)];
  const a = [];
  for (let k = Number(m[1]); k <= Number(m[2]); k++) a.push(k);
  return a;
});
const meta = JSON.parse(readFileSync(join(DIR, "meta.json"), "utf8"));
const NB = 4, PB = 9, PX = NB * PB + 10;
const PXW = meta.pxW;
const rc = meta.recs.find((r) => r.ji === Number(JI));
const { w: BW, h: BH } = rc.box;
const ox = rc.box.x - meta.clip.x * meta.dsf, oy = rc.box.y - meta.clip.y * meta.dsf;
const S = rc.bands.map(() => ({ n: 0, off: 0, offMax: 0, byMax: 0, mxMax: 0, worst: null, sib: {} }));
for (const k of PH) {
  const fu = join(DIR, `r${rc.ji}_t${k}.u8`);
  if (!existsSync(fu)) continue;
  const u8 = new Uint8Array(readFileSync(fu));
  const f32 = new Float32Array(readFileSync(join(DIR, `r${rc.ji}_t${k}.f32`)).buffer.slice(0));
  const fa32 = new Float32Array(readFileSync(join(DIR, `r${rc.ji}_t${k}.fa32`)).buffer.slice(0));
  const gD = toRGB(decodePNG(readFileSync(join(DIR, `t${k}_d.png`)))), gDW = toRGB(decodePNG(readFileSync(join(DIR, `t${k}_dw.png`))));
  for (let Y = 0; Y < BH; Y++)
    for (let X = 0; X < BW; X++) {
      const i = Y * BW + X, o = i * PX;
      const x = X + ox, y = Y + oy;
      if (x < 0 || y < 0 || x >= gD.W || y >= gD.H) continue;
      const j3 = (y * gD.W + x) * 3;
      if (gD.data[j3] === gDW.data[j3] && gD.data[j3 + 1] === gDW.data[j3 + 1] && gD.data[j3 + 2] === gDW.data[j3 + 2]) continue; // not the fan's foot
      const G = gD.data[j3 + 1];
      let mx = 0, arg = -1;
      const own = [];
      for (let b = 0; b < rc.bands.length; b++) {
        const cr = fa32[(i * NB + b) * 2], cov = u8[o + b * PB + 1] / 255;
        const v = cr > -0.5 ? 255 * cr * cov : 0;
        own.push(v);
        if (v > mx) { mx = v; arg = b; }
      }
      for (let b = 0; b < rc.bands.length; b++) {
        if (f32[(i * NB + b) * 2] > 0.5 * PXW) continue;
        const s = S[b];
        s.n++;
        const dOwn = Math.abs(G - own[b]), dMax = Math.abs(G - mx);
        s.mxMax = Math.max(s.mxMax, dMax);
        if (dOwn > 4) {
          s.off++;
          if (dMax <= 4) { s.byMax++; s.sib[arg] = (s.sib[arg] ?? 0) + 1; }
          if (dOwn > s.offMax) {
            s.offMax = dOwn;
            s.worst = { k, X, Y, G, own: +own[b].toFixed(1), max: +mx.toFixed(1), by: arg, tau: +f32[(i * NB + b) * 2 + 1].toFixed(3) };
          }
        }
      }
    }
}
console.log(`ji ${rc.ji} phases ${PH.join(",")}: centreline px (dnow < 0.5 px) per band`);
rc.bands.forEach((b, bi) => {
  const s = S[bi];
  console.log(`  band ${bi} ${b.ia}>${b.ib}${b.shared > 0.5 ? " shared" : ""}: n ${s.n}, |G - own| > 4: ${s.off} (max ${s.offMax.toFixed(1)}), of them |G - max over bands| <= 4: ${s.byMax} (lit by band ${JSON.stringify(s.sib)}); |G - max| max ${s.mxMax.toFixed(1)}; worst ${JSON.stringify(s.worst)}`);
});
