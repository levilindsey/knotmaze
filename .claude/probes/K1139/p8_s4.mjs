// K1139 Stage 4 (4.2 task 1): P8 against the max over bands. On each band's
// centreline (dnow <= 0.5 px) inside the fan's foot (d differs from dw),
// debug view 5's G against:
//   own  = 255 cr_b cov_b, the band's own crest (fan.mjs's model, all px);
//   max  = 255 max_j cr_j cov_j, rule (b)'s design (the fan-only twin);
//   comp = cover_lib's composite: per MSAA sample this fan's twin, this
//          record's cover strip's twin (strip = true) or the webs-off frame,
//          as the captured triangles say; pixels with another record's
//          sample are masked (counted).
// Every pixel over 4/255 against max is attributed: the band whose crest
// sets G (rule (b)'s argmax), its rule (a) mode (1 ray hit, 2 end line,
// 0 nearest foot), distJ and tau, the sample kinds (fan / strip / other /
// none), and whether rule (a)'s ray changes segment there (DG_K of the
// argmax band differs from a 4-neighbour's).
//   node p8_s4.mjs <dumpDir> [phases=0-7] [ji,...]   (env P8_LIST=n lists n)
import { readFileSync } from "fs";
import { join } from "path";
import { coverage, composite, loadTwin, pickOrient, twinG, NB, PB, PX } from "./cover_lib.mjs";

const [DIR, PHS, JIS] = process.argv.slice(2);
const PH = (PHS ?? "0-7").split(",").flatMap((t) => {
  const m = /^(\d+)-(\d+)$/.exec(t);
  if (!m) return [Number(t)];
  const a = [];
  for (let k = Number(m[1]); k <= Number(m[2]); k++) a.push(k);
  return a;
});
const ONLY = JIS ? JIS.split(",").map(Number) : null;
const LIST = Number(process.env.P8_LIST ?? 6);
const meta = JSON.parse(readFileSync(join(DIR, "meta.json"), "utf8"));
const PXW = meta.pxW;
for (const rc of meta.recs) {
  if (ONLY && !ONLY.includes(rc.ji)) continue;
  if (!rc.bands.length) continue;
  const kinds = coverage(DIR, rc);
  const po = pickOrient(DIR, meta, rc, kinds, PH);
  const BW = rc.box.w;
  const S = rc.bands.map(() => ({ n: 0, nOther: 0, own: 0, max: 0, maxNO: 0, comp: 0, over: [], cls: {} }));
  for (const k of PH) {
    const T = loadTwin(DIR, rc.ji, k);
    if (!T) continue;
    const C = composite(DIR, meta, rc, kinds, k, po.or, T);
    const crOf = (D, i, b) => {
      const cr = D.fa32[(i * NB + b) * 2];
      if (!(cr >= 0) || D.f32[(i * NB + b) * 2] > 1e8) return 0;
      return 255 * Math.min(1, cr) * (D.u8[i * PX + b * PB + 1] / 255);
    };
    for (let i = 0; i < C.G.length; i++) {
      if (!C.foot[i]) continue;
      const G = C.gpuG[i];
      if (G < 0) continue;
      const M = twinG(T, i);
      let arg = -1, av = -1;
      for (let b = 0; b < rc.bands.length; b++) {
        const v = crOf(T, i, b);
        if (v > av) { av = v; arg = b; }
      }
      const cnt = [0, 1, 2, 3].map((j) => C.cnt[i * 4 + j]);
      for (let b = 0; b < rc.bands.length; b++) {
        if (T.f32[(i * NB + b) * 2] > 0.5 * PXW) continue;
        const s = S[b];
        s.n++;
        const eOwn = Math.abs(G - crOf(T, i, b)), eMax = Math.abs(G - M), eComp = Math.abs(G - C.G[i]);
        s.own = Math.max(s.own, eOwn);
        s.max = Math.max(s.max, eMax);
        if (cnt[3]) s.nOther++;
        else { s.maxNO = Math.max(s.maxNO, eMax); s.comp = Math.max(s.comp, eComp); }
        if (eMax <= 4) continue;
        const X = i % BW, Y = Math.floor(i / BW);
        // Rule (a)'s ray segment at the argmax band, and its 4-neighbours'.
        const kOf = (j) => (T.k32 ? T.k32[(j * NB + arg) * 4] : NaN);
        const k0 = kOf(i);
        const nb = [];
        if (X > 0) nb.push(i - 1);
        if (X < BW - 1) nb.push(i + 1);
        if (Y > 0) nb.push(i - BW);
        if (i + BW < C.G.length) nb.push(i + BW);
        const segChange = nb.some((j) => kOf(j) !== k0);
        const mode = T.c32[(i * NB + arg) * 2 + 1];
        const cls = cnt[3] ? "other record" : eComp <= 4 ? (cnt[2] ? "strip (composite fits)" : "fan coverage (composite fits)") : "unexplained";
        s.cls[cls] = (s.cls[cls] ?? 0) + 1;
        // The pad check: per band, cov in the fan twin and in the strip twin
        // (reach fh + 0.5 pxW against fh + 1.5 pxW), and the strip twin's G.
        const covs = (D) => rc.bands.map((_, j) => (D.f32[(i * NB + j) * 2] > 1e8 ? -1 : D.u8[i * PX + j * PB + 1]));
        const sArg = T.s ? (() => { let a = -1, v = -1; for (let j = 0; j < rc.bands.length; j++) { const x = crOf(T.s, i, j); if (x > v) { v = x; a = j; } } return a; })() : -1;
        if (cnt[2]) {
          s.pad = s.pad ?? { n: 0, sFits: 0, argCovUp: 0, argChanged: 0 };
          s.pad.n++;
          if (T.s && Math.abs(G - twinG(T.s, i)) <= 4) s.pad.sFits++;
          if (T.s && T.s.u8[i * PX + sArg * PB + 1] > T.u8[i * PX + sArg * PB + 1]) s.pad.argCovUp++;
          if (sArg !== arg) s.pad.argChanged++;
        }
        s.over.push({
          k, X, Y, G, own: +crOf(T, i, b).toFixed(1), max: +M.toFixed(1), comp: +C.G[i].toFixed(1), by: arg,
          mode, distJ: +rc.bands[arg].distJ.toFixed(3), tau: +T.f32[(i * NB + arg) * 2 + 1].toFixed(3),
          kinds: `f${cnt[1]} s${cnt[2]} o${cnt[3]} n${cnt[0]}`, rayK: k0, segChange, cls,
          fanCov: covs(T).join("/"), stripCov: T.s ? covs(T.s).join("/") : "-", stripG: T.s ? +twinG(T.s, i).toFixed(1) : null, stripBy: sArg,
          dnow: rc.bands.map((_, j) => +(T.f32[(i * NB + j) * 2] / PXW).toFixed(2)).join("/"),
        });
      }
    }
  }
  console.log(`ji ${rc.ji} (${DIR.split(/[\\/]/).pop()}), orientation ${po.or}, phases ${PH.join(",")}`);
  rc.bands.forEach((bd, b) => {
    const s = S[b];
    const name = `e${bd.aEdge}>e${bd.bEdge}${bd.shared > 0.5 ? " shared" : ""}`;
    console.log(`  band ${b} ${name}: centreline px ${s.n} (another record's sample ${s.nOther}); P8 own ${s.own.toFixed(1)}; P8 max ${s.max.toFixed(1)} (${s.max <= 4 ? "PASS" : "FAIL"}); no other record ${s.maxNO.toFixed(1)}; composite ${s.comp.toFixed(1)} (${s.comp <= 4 ? "PASS" : "FAIL"}); px over 4 vs max ${s.over.length} ${JSON.stringify(s.cls)}`);
    const seg = s.over.filter((o) => o.segChange).length, modes = {};
    for (const o of s.over) modes[`band ${o.by} mode ${o.mode}`] = (modes[`band ${o.by} mode ${o.mode}`] ?? 0) + 1;
    if (s.over.length) console.log(`    over-4 px: set by ${JSON.stringify(modes)}; ray changes segment at ${seg}; strip sample at ${s.over.filter((o) => o.kinds.includes("s") && !o.kinds.includes("s0")).length}`);
    if (s.pad) console.log(`    pad check on the over-4 px with a strip sample (${s.pad.n}): the strip twin's G within 4 of the GPU ${s.pad.sFits}; the strip twin's argmax band has more cov than in the fan twin ${s.pad.argCovUp}; the argmax band differs ${s.pad.argChanged}`);
    for (const o of s.over.sort((a, c) => Math.abs(c.G - c.max) - Math.abs(a.G - a.max)).slice(0, LIST)) console.log(`      ${JSON.stringify(o)}`);
  });
}
