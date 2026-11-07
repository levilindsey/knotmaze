// K1040 S4a2: the band fragment for one instance at one device pixel,
// replicated on the CPU tables (float64; the label from label_b's mirror).
//   node scripts/run_node.mjs .claude/probes/K1040/s4a2/diag_frag.ts <scene> <i> <j> <chain> <k> <side> [scale]
import { readFileSync } from "node:fs";
import { FormB, ss } from "../../../../src/render/field/form_b";
import { buildLabelB, labelAt, spanCode } from "../../../../src/render/field/label_b";
import { buildBandB } from "../../../../src/render/field/band_b";
import { dS as dSg, normS, segB } from "../../../../src/render/field/geom";
import type { FieldScene } from "../../../../src/render/field/scene";

const [name, is, js, cas, ks, sds, scs] = process.argv.slice(2);
const scale = Number(scs ?? 2);
const scene = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
scene.look.ctrlArc ??= 0.47;
const fb = new FormB(scene, { dpr: scale });
const T = buildLabelB(fb);
const B = buildBandB(fb, T);
const [a0, b0, c0, d0, e0, f0] = scene.camera.worldToCss;
const M = [a0 * scale, b0 * scale, c0 * scale, d0 * scale, e0 * scale, f0 * scale];
const det = M[0] * M[3] - M[1] * M[2];
const ii = Number(is);
const jj = Number(js);
const u = ii + 0.5 - M[4];
const v = jj + 0.5 - M[5];
const x = (M[3] * u - M[2] * v) / det;
const y = (-M[1] * u + M[0] * v) / det;
const ci = Number(cas);
const k = Number(ks);
const p = fb.polys[ci];
const ppd = fb.ppuDev;
console.log(`pixel (${ii}, ${jj}) world (${x.toFixed(4)}, ${y.toFixed(4)}) h ${(fb.h * ppd).toFixed(2)}px W ${(fb.W * ppd).toFixed(2)}px sigma ${(fb.sigma * ppd).toFixed(1)}px`);

function segT(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  return l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
}
function candOn(j: number): { d: number; s: number; fx: number; fy: number; z: number } | null {
  const jb = segB(p, j);
  const ax = p.x[j], ay = p.y[j], bx = p.x[jb], by = p.y[jb];
  const tr = segT(x, y, ax, ay, bx, by);
  if (tr <= 0) {
    if (p.closed || j > 0) {
      const jp = j > 0 ? j - 1 : p.nseg - 1;
      if (segT(x, y, p.x[jp], p.y[jp], ax, ay) < 1) return null;
    }
  } else if (tr >= 1) {
    if (p.closed || j + 1 < p.nseg) return null;
  }
  const t = Math.min(1, Math.max(0, tr));
  const fx = ax + (bx - ax) * t;
  const fy = ay + (by - ay) * t;
  let s = p.s[j] + t * p.segLen[j];
  if (p.closed) s = normS(p, s);
  return { d: Math.hypot(x - fx, y - fy), s, fx, fy, z: p.z[j] + (p.z[jb] - p.z[j]) * t };
}
const X = candOn(k);
console.log(`candOn(k${k}):`, X ? `d ${(X.d * ppd).toFixed(2)}px s ${X.s.toFixed(4)}` : "null (not owner)");
if (!X) process.exit(0);
const R = B.R;
const cand: { j: number; d: number; s: number }[] = [];
const nbOff = T.ptOff[ci];
const m0 = B.nb2[4 * (nbOff + k)];
const m1 = B.nb2[4 * (nbOff + k) + 1];
let j = k - m0;
if (j < 0) j += p.nseg;
for (let q = 0; q <= m0 + m1; q++) {
  const c = j === k ? X : candOn(j);
  if (c && c.d < R) cand.push({ j, d: c.d, s: c.s });
  j = j + 1 === p.n ? 0 : j + 1;
}
cand.sort((a, b) => a.d - b.d);
const top8 = cand.slice(0, 8);
console.log(`candidates in R: ${cand.length} (m- ${m0} m+ ${m1}):`, top8.map((c) => `k${c.j} d${(c.d * ppd).toFixed(2)} s${c.s.toFixed(3)}`).join(" | "));
const into = top8.map((c, i) => {
  for (let m = 0; m < i; m++) if (Math.abs(dSg(p, top8[m].s, c.s)) <= fb.sigma) return m;
  return -1;
});
const ix = top8.findIndex((c) => c.j === k);
const ia = ix < 0 ? -1 : into[ix] < 0 ? ix : into[ix];
console.log(`ix ${ix} into ${ix >= 0 ? into[ix] : "-"} ia ${ia}`);
const sA = ia < 0 ? X.s : top8[ia].s;
const dA = ia < 0 ? X.d : top8[ia].d;
let selfW = 1;
for (let m = 0; m < ia; m++) {
  if (into[m] !== -1) continue;
  const ds = Math.abs(dSg(p, top8[m].s, sA));
  if (ds < 2 * fb.sigma) selfW = Math.min(selfW, ss(fb.sigma, 2 * fb.sigma, ds));
}
console.log(`sA ${sA.toFixed(4)} dA ${(dA * ppd).toFixed(2)}px selfW ${selfW.toFixed(3)}`);
const mem = fb.member(ci, sA);
const code = spanCode(T.spans[ci], normS(p, sA));
console.log(`member: g ${mem.g} ramp ${mem.ramp.toFixed(4)}; span code ${code}`);
const lb = labelAt(fb, T, x, y);
console.log(`label: chain ${lb.chain} code ${lb.code} fill ${lb.fill} s ${lb.s.toFixed(4)}`);
console.log(`formB eval:`, JSON.stringify(fb.evalPoint(x, y), (kk, vv) => (typeof vv === "number" ? +vv.toFixed(4) : vv)));
