// K1139 Stage 4 (4.2 task 4): which twin term steps across a front. At box
// pixels of record ji (diag_s4.mjs's dumps), stepping along a normal, per
// band: cov and f (u8, /255), v, the crest cr and qq (fa32), e = (reach -
// dnow) / pxW (px inside the band's reach; reach = fh + 0.5 pxW, the fan's
// own, strip = false), tau, the compression c and tau's mode (c32: 1 ray
// hit, 2 end line, 0 nearest foot), k32's four values; then the winner band
// (u8 o+45 - 1), the twin's out luma and the GPU's n-frame luma there.
//   node rule_s4.mjs <dumpDir> <ji> <phase> <X,Y,nx,ny> [from=-3] [to=3] [step=1]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadTwin, img, NB, PB, PX } from "./cover_lib.mjs";

const [DIR, JI, K, P, A = "-3", B = "3", ST = "1"] = process.argv.slice(2);
const meta = JSON.parse(readFileSync(join(DIR, "meta.json"), "utf8"));
const rc = meta.recs.find((r) => r.ji === Number(JI));
const T = loadTwin(DIR, rc.ji, Number(K));
const gN = img(DIR, Number(K), "n");
const ox = rc.box.x - meta.clip.x * meta.dsf, oy = rc.box.y - meta.clip.y * meta.dsf;
const REACH = meta.fh + 0.5 * meta.pxW;
const L = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const [X0, Y0, nx, ny] = P.split(",").map(Number);
const f2 = (v) => (Math.abs(v) > 1e8 ? "-" : v.toFixed(2));
console.log(`ji ${rc.ji} t${K} (${DIR.split(/[\\/]/).pop()}), from box (${X0},${Y0}) along (${nx},${ny}); bands ${rc.bands.map((b, i) => `${i}: ia ${b.ia} ib ${b.ib}${b.shared > 0.5 ? " shared" : ""}`).join(", ")}`);
for (let s = Number(A); s <= Number(B) + 1e-9; s += Number(ST)) {
  const X = Math.round(X0 + s * nx), Y = Math.round(Y0 + s * ny);
  const i = Y * rc.box.w + X, o = i * PX;
  const parts = [];
  for (let b = 0; b < rc.bands.length; b++) {
    const dn = T.f32[(i * NB + b) * 2], tau = T.f32[(i * NB + b) * 2 + 1];
    const cr = T.fa32[(i * NB + b) * 2], qq = T.fa32[(i * NB + b) * 2 + 1];
    const c = T.c32[(i * NB + b) * 2], mode = T.c32[(i * NB + b) * 2 + 1];
    const k = T.k32 ? [0, 1, 2, 3].map((j) => f2(T.k32[(i * NB + b) * 4 + j])).join("/") : "";
    parts.push(`b${b} cov ${T.u8[o + b * PB + 1]} f ${T.u8[o + b * PB + 2]} v ${T.u8[o + b * PB]} cr ${f2(cr)} qq ${f2(qq)} e ${f2((REACH - dn) / meta.pxW)} tau ${f2(tau)} c ${f2(c)} m ${mode} k ${k}`);
  }
  const win = T.u8[o + 45] - 1;
  const lo = L(T.u8[o + 42], T.u8[o + 43], T.u8[o + 44]);
  const gx = X + ox, gy = Y + oy;
  const lg = gN ? L(gN.data[(gy * gN.W + gx) * 3], gN.data[(gy * gN.W + gx) * 3 + 1], gN.data[(gy * gN.W + gx) * 3 + 2]) : NaN;
  console.log(`s ${s.toFixed(1)} (${X},${Y}) win b${win} twin L ${lo.toFixed(1)} GPU L ${lg.toFixed(1)}`);
  for (const p of parts) console.log(`    ${p}`);
}
