// K1040 S4a2: the band shader's rA and burial loop, replicated on the CPU
// tables at one world point, for one candidate A (chain, sA).
//   node scripts/run_node.mjs .claude/probes/K1040/s4a2/diag_bur.ts <scene> <x> <y> <chainA> <sA> [scale]
import { readFileSync } from "node:fs";
import { FormB, ss } from "../../../../src/render/field/form_b";
import { buildLabelB } from "../../../../src/render/field/label_b";
import { buildBandB } from "../../../../src/render/field/band_b";
import { dS } from "../../../../src/render/field/geom";
import type { FieldScene } from "../../../../src/render/field/scene";

const [name, xs, ys, cas, sas, scs] = process.argv.slice(2);
const scale = Number(scs ?? 2);
const scene = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
scene.look.ctrlArc ??= 0.47;
const fb = new FormB(scene, { dpr: scale });
const T = buildLabelB(fb);
const B = buildBandB(fb, T);
const x = Number(xs);
const y = Number(ys);
const ci = Number(cas);
const sA = Number(sas);
const ppd = fb.ppuDev;
console.log(`h ${(fb.h * ppd).toFixed(2)}px sigma ${(fb.sigma * ppd).toFixed(2)}px lambda ${(fb.lambda * ppd).toFixed(2)}px R ${(B.R * ppd).toFixed(2)}px`);
console.log(`formB member(c${ci}, s${sA}):`, fb.member(ci, sA));
// A's foot and outline point f (nearest point on A's chain at sA is its vertex interp: use pieces at (x,y)).
const P: import("../../../../src/render/field/form_b").Piece[] = [];
fb.pieces(x, y, P);
const A = P.find((q) => q.chain === ci && Math.abs(q.s - sA) < 0.05) ?? P.find((q) => q.chain === ci);
if (!A) throw new Error("no piece A");
console.log(`A: c${A.chain} s${A.s.toFixed(4)} d${(A.d * ppd).toFixed(2)}px selfW${A.selfW} g${A.g} ramp${A.ramp.toFixed(4)} alts${A.alts.map((z) => `${z.s.toFixed(3)}/${z.beta.toFixed(3)}`).join(",")}`);
const fx = A.fx + (fb.h * (x - A.fx)) / A.d;
const fy = A.fy + (fb.h * (y - A.fy)) / A.d;
console.log(`f = (${fx.toFixed(4)}, ${fy.toFixed(4)})`);
// formB inkOf burials: winW per other piece.
for (const q of P) {
  if (q === A) continue;
  console.log(`formB piece B c${q.chain} s${q.s.toFixed(4)} d${(q.d * ppd).toFixed(2)}px surf${q.surf} selfW${q.selfW} winW(f)=${fb.winW(q, fx, fy).toFixed(4)}`);
}
// Shader rA.
const armAt = (i: number) => ({ g: B.arm[8 * i], sR: B.arm[8 * i + 1], dir: B.arm[8 * i + 2], L: B.arm[8 * i + 3], lc: B.arm[8 * i + 4] });
const chainAt = (c: number) => ({ off: T.chain[8 * c], n: T.chain[8 * c + 1], nseg: T.chain[8 * c + 2], closed: T.chain[8 * c + 3] > 0.5, s0: T.chain[8 * c + 4], len: T.chain[8 * c + 5] });
const ptAt = (i: number) => ({ x: T.pts[4 * i], y: T.pts[4 * i + 1], s: T.pts[4 * i + 2] });
const armDist = (a0: { sR: number; dir: number }, s: number, closed: boolean, len: number): number => {
  let d = (s - a0.sR) * a0.dir;
  if (closed && d < 0) d += len;
  return d;
};
const ca = { off: B.carm[4 * ci], n: B.carm[4 * ci + 1] };
const pA = fb.polys[ci];
let g = -1;
let rA = 0;
for (let i = 0; i < ca.n; i++) {
  const ai = B.aix[4 * (ca.off + i)];
  const a0 = armAt(ai);
  const lc = a0.lc;
  const d = armDist(a0, sA, pA.closed, pA.len);
  if (d < -1e-12 || d > a0.L + 1e-12) continue;
  const rp = lc >= 1e29 ? 1 : ss(lc, lc - fb.lambda, d);
  console.log(`rA arm ${ai}: g${a0.g} sR${a0.sR.toFixed(3)} dir${a0.dir} L${a0.L.toFixed(3)} Lcut${lc >= 1e29 ? "inf" : lc.toFixed(3)} d${d.toFixed(4)} rp${rp.toFixed(4)}`);
  if (g < 0 || rp > rA) { g = a0.g; rA = rp; }
}
if (g >= 0 && rA > 0) {
  for (let i = 0; i < ca.n; i++) {
    const ai = B.aix[4 * (ca.off + i)];
    const a0 = armAt(ai);
    if (a0.g !== g || a0.lc >= 1e29) continue;
    let d = armDist(a0, sA, pA.closed, pA.len);
    if (pA.closed && d > pA.len / 2) d -= pA.len;
    if (!(d < 1e-12 && d > a0.lc - fb.lambda)) continue;
    const v = ss(a0.lc, a0.lc - fb.lambda, d);
    console.log(`rA twin arm ${ai}: d${d.toFixed(4)} -> min ${v.toFixed(4)}`);
    rA = Math.min(rA, v);
  }
}
if (g < 0) rA = 1;
console.log(`shader rA: g=${g} rA=${rA.toFixed(4)} (piece member g=${A.g}; using it for the burial)`);
g = A.g;
// Shader burial loop.
let bur = 0;
if (g >= 0) {
  const gr = { off: B.grp[4 * g], n: B.grp[4 * g + 1] };
  console.log(`group ${g}: ${gr.n} windows`);
  for (let wi = 0; wi < gr.n; wi++) {
    const w = gr.off + wi;
    const bj = B.gw[8 * w];
    const k0 = B.gw[8 * w + 1];
    const cnt = B.gw[8 * w + 2];
    const ai = B.gw[8 * w + 3];
    const cx = B.gw[8 * w + 4];
    const cy = B.gw[8 * w + 5];
    const rad = B.gw[8 * w + 6];
    if (Math.hypot(x - cx, y - cy) > rad + B.R) continue;
    const bc = chainAt(bj);
    const a0 = armAt(ai);
    let jj = k0;
    let Pa = ptAt(bc.off + jj);
    for (let qq = 0; qq < cnt; qq++) {
      const jb = jj + 1 === bc.n ? 0 : jj + 1;
      const Pb = ptAt(bc.off + jb);
      const ex = Pb.x - Pa.x;
      const ey = Pb.y - Pa.y;
      const l2 = ex * ex + ey * ey;
      const tp = l2 > 0 ? Math.min(1, Math.max(0, ((x - Pa.x) * ex + (y - Pa.y) * ey) / l2)) : 0;
      const dp = Math.hypot(x - (Pa.x + ex * tp), y - (Pa.y + ey * tp));
      if (dp < B.R) {
        const sb = jb === 0 ? bc.s0 + bc.len : Pb.s;
        let sj = Pa.s + tp * (sb - Pa.s);
        if (bc.closed && sj >= bc.s0 + bc.len) sj -= bc.len;
        let fw = 1;
        let ok = true;
        if (bj === ci) {
          const ds = Math.abs(dS(pA, sA, sj));
          if (ds <= fb.sigma) ok = false;
          else if (ds < 2 * fb.sigma && dp > A.d) fw = ss(fb.sigma, 2 * fb.sigma, ds);
        }
        if (ok) {
          const tf = l2 > 0 ? Math.min(1, Math.max(0, ((fx - Pa.x) * ex + (fy - Pa.y) * ey) / l2)) : 0;
          const df = Math.hypot(fx - (Pa.x + ex * tf), fy - (Pa.y + ey * tf));
          const wb = 1 - ss(fb.h - 2 * fb.aa, fb.h, df);
          if (wb > 0) {
            const memB = fb.member(bj, sj);
            const rB = memB.g === g ? memB.ramp : 0;
            const v = Math.min(rA, rB) * fw * wb;
            if (v > 0.01) console.log(`bur win${wi} arm${ai} c${bj} k${jj} sj${sj.toFixed(3)} dp${(dp * ppd).toFixed(1)}px df${(df * ppd).toFixed(2)}px wb${wb.toFixed(3)} rB${rB.toFixed(3)} fw${fw.toFixed(3)} -> ${v.toFixed(4)}`);
            bur = Math.max(bur, v);
          }
        }
      }
      Pa = Pb;
      jj = jb;
    }
  }
}
console.log(`shader bur = ${bur.toFixed(4)} -> v = ${(1 - bur).toFixed(4)} x band2(${(fb.h - A.d) * ppd >= 0 ? ((fb.h - A.d) * ppd).toFixed(2) : "?"}px)`);
