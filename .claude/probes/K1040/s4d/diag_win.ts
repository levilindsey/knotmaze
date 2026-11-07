import { readFileSync } from "node:fs";
import { FormB } from "../../../../src/render/field/form_b";
import { buildLabelB } from "../../../../src/render/field/label_b";
import { buildBandB } from "../../../../src/render/field/band_b";
const scene = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/def.json`, "utf8"));
scene.look.ctrlArc ??= 0.47;
const fb = new FormB(scene, { dpr: 2 });
const T = buildLabelB(fb); const B = buildBandB(fb, T);
const x = 16.5790, y = 5.3972, ppd = fb.ppuDev;
const g = 1; const off = B.grp[4*g], n = B.grp[4*g+1];
for (let wi = 0; wi < n; wi++) { const w = off + wi; console.log(`win${wi}: chain ${B.gw[8*w]} k0 ${B.gw[8*w+1]} cnt ${B.gw[8*w+2]} arm ${B.gw[8*w+3]} c (${B.gw[8*w+4].toFixed(3)}, ${B.gw[8*w+5].toFixed(3)}) rad ${B.gw[8*w+6].toFixed(3)}`); }
const c = 9; const co = T.chain[8*c], cn = T.chain[8*c+1];
console.log(`chain 9 n ${cn} closed ${T.chain[8*c+3]}`);
for (let k = 33; k < 44; k++) { const a = co + k, b = co + k + 1; const ax = T.pts[4*a], ay = T.pts[4*a+1], bx = T.pts[4*b], by = T.pts[4*b+1];
  const ex = bx-ax, ey = by-ay, l2 = ex*ex+ey*ey; const t = Math.min(1, Math.max(0, ((x-ax)*ex+(y-ay)*ey)/l2)); const d = Math.hypot(x-(ax+ex*t), y-(ay+ey*t));
  console.log(`seg ${k}: s ${T.pts[4*a+2].toFixed(4)}..${T.pts[4*b+2].toFixed(4)} t ${t.toFixed(3)} d ${(d*ppd).toFixed(3)}px`); }
const arms = (fb as any).arms; for (const ai of [19]) { const A = arms[ai]; console.log(`arm ${ai}:`, JSON.stringify({pi: A.pi, sR: A.sR, dir: A.dir, L: A.L, g: A.g})); }
