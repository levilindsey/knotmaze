// K1139 Stage 4 (4.2 task 2): how well the coverage model (cover_lib.mjs)
// reproduces the GPU at each banded record: per record, the sample-pattern
// orientation that fits, then per phase the debug-5 G and normal-look luma
// error of the fan-only twin (every footprint pixel = the twin's fan value)
// and of the composite (per-sample fan / strip / webs-off), on the
// footprint pixels with no other record's sample. Also the strip ring: how
// many footprint pixels a cover strip wins at least one sample of.
//   node cover_s4.mjs <dumpDir> [phases=0-7] [ji,ji,...]
import { readFileSync } from "fs";
import { join } from "path";
import { coverage, composite, loadTwin, pickOrient, twinG, PX } from "./cover_lib.mjs";

const [DIR, PHS, JIS] = process.argv.slice(2);
const PH = (PHS ?? "0-7").split(",").flatMap((t) => {
  const m = /^(\d+)-(\d+)$/.exec(t);
  if (!m) return [Number(t)];
  const a = [];
  for (let k = Number(m[1]); k <= Number(m[2]); k++) a.push(k);
  return a;
});
const ONLY = JIS ? JIS.split(",").map(Number) : null;
const meta = JSON.parse(readFileSync(join(DIR, "meta.json"), "utf8"));
const L = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const q = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : NaN);
for (const rc of meta.recs) {
  if (ONLY && !ONLY.includes(rc.ji)) continue;
  const kinds = coverage(DIR, rc);
  if (!kinds) { console.log(`ji ${rc.ji}: no triangles`); continue; }
  const po = pickOrient(DIR, meta, rc, kinds, PH);
  const acc = { foot: 0, other: 0, strip: 0, stripOnly: 0, fanOnly: 0, fan4: 0, eF: [], eC: [], lF: [], lC: [], over4F: 0, over4C: 0, gk: 0 };
  for (const k of PH) {
    const T = loadTwin(DIR, rc.ji, k);
    if (!T) continue;
    const C = composite(DIR, meta, rc, kinds, k, po.or, T);
    for (let i = 0; i < C.G.length; i++) {
      if (!C.foot[i]) continue;
      acc.foot++;
      const c = (j) => C.cnt[i * 4 + j];
      if (c(3)) { acc.other++; continue; }
      if (c(2)) acc.strip++;
      if (c(2) === 4) acc.stripOnly++;
      if (c(1) === 4) acc.fan4++;
      const gF = twinG(T, i), eF = Math.abs(gF - C.gpuG[i]), eC = Math.abs(C.G[i] - C.gpuG[i]);
      // A fan pixel the model fills that the GPU shows as the webs-off frame:
      // gk's discard (a foreign over thread) is the candidate.
      if (c(0) === 0 && C.gpuG[i] === C.at(C.gDW, i % rc.box.w, Math.floor(i / rc.box.w), 1) && Math.abs(C.G[i] - C.gpuG[i]) > 4) acc.gk++;
      acc.eF.push(eF); acc.eC.push(eC);
      if (eF > 4) acc.over4F++;
      if (eC > 4) acc.over4C++;
      const lg = L(C.gpuN[i * 3], C.gpuN[i * 3 + 1], C.gpuN[i * 3 + 2]);
      const lf = L(T.u8[i * PX + 42], T.u8[i * PX + 43], T.u8[i * PX + 44]);
      const lc = L(C.RGB[i * 3], C.RGB[i * 3 + 1], C.RGB[i * 3 + 2]);
      acc.lF.push(Math.abs(lg - lf)); acc.lC.push(Math.abs(lg - lc));
    }
  }
  for (const key of ["eF", "eC", "lF", "lC"]) acc[key].sort((a, b) => a - b);
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
  const tri = JSON.parse(readFileSync(join(DIR, `r${rc.ji}.tri.json`), "utf8"));
  console.log(`ji ${rc.ji} (rb ${rc.rb}): orientation ${po.or} (mean |G - GPU| ${po.mean.map((x) => x.toFixed(2)).join(" vs ")}), geometry same ${tri.same}`);
  console.log(`  footprint px ${acc.foot} (phases ${PH.join(",")}): another record's sample ${acc.other}; a strip sample ${acc.strip} (all 4 ${acc.stripOnly}); all 4 this fan ${acc.fan4}`);
  console.log(`  debug-5 G |twin - GPU|: fan-only mean ${mean(acc.eF).toFixed(2)} p99 ${q(acc.eF, 0.99).toFixed(1)} max ${q(acc.eF, 1).toFixed(1)} >4: ${acc.over4F}; composite mean ${mean(acc.eC).toFixed(2)} p99 ${q(acc.eC, 0.99).toFixed(1)} max ${q(acc.eC, 1).toFixed(1)} >4: ${acc.over4C}`);
  console.log(`  normal luma |twin - GPU|: fan-only mean ${mean(acc.lF).toFixed(2)} p99 ${q(acc.lF, 0.99).toFixed(1)}; composite mean ${mean(acc.lC).toFixed(2)} p99 ${q(acc.lC, 0.99).toFixed(1)}; GPU = webs-off where the model fills every sample (gk?): ${acc.gk}`);
}
