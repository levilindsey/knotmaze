// K1040 S4b: form B's corner burials at one device pixel, beside the band
// shader's replica over the CRN table (band_b.ts) - which corner, which test.
//   node scripts/run_node.mjs .claude/probes/K1040/s4b/diag_corner.ts <scene> <i> <j> [scale]
import { readFileSync } from "node:fs";
import { FormB, OWN, ss } from "../../../../src/render/field/form_b";
import type { Piece } from "../../../../src/render/field/form_b";
import { buildLabelB } from "../../../../src/render/field/label_b";
import { buildBandB, CRN_TEXELS } from "../../../../src/render/field/band_b";
import type { FieldScene } from "../../../../src/render/field/scene";

const [name, is, js, scs] = process.argv.slice(2);
const scale = Number(scs ?? 2);
const scene = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
scene.look.ctrlArc ??= 0.47;
const fb = new FormB(scene, { dpr: scale });
const T = buildLabelB(fb);
const B = buildBandB(fb, T);
const [a0, b0, c0, d0, e0, f0] = scene.camera.worldToCss;
const [a, b, c, d, e, f] = [a0 * scale, b0 * scale, c0 * scale, d0 * scale, e0 * scale, f0 * scale];
const det = a * d - b * c;
const ppd = Math.sqrt(Math.abs(det));
const u = Number(is) + 0.5;
const v = Number(js) + 0.5;
const x = (d * (u - e) - c * (v - f)) / det;
const y = (-b * (u - e) + a * (v - f)) / det;
const F = fb as unknown as Record<string, any>;
const h = fb.h;
const aa = fb.aa;
const px = (t: number) => (t * ppd).toFixed(2);
console.log(`pixel (${is}, ${js}) world (${x.toFixed(4)}, ${y.toFixed(4)}); h ${px(h)} W ${px(fb.W)} aa ${px(aa)} px; cell ${F.cell}`);
const r = fb.evalPoint(x, y);
console.log(`evalPoint ink ${r.ink.toFixed(4)} top ${r.top} term ${r.term ? JSON.stringify({ kind: r.term.kind, surf: r.term.surf, chain: r.term.chain, D: px(r.term.D), v: r.term.v.toFixed(3) }) : null}`);
const P: Piece[] = [];
fb.pieces(x, y, P);
const near: number[] = fb.cornersNear(x, y);
console.log(`cornersNear: ${near.join(",")}`);
for (const A of P) {
  console.log(`piece c${A.chain} k${A.k} s${A.s.toFixed(4)} d${px(A.d)} surf ${A.surf >= OWN ? "OWN" + (A.surf - OWN) : A.surf} g${A.g} ramp${A.ramp.toFixed(3)} selfW${A.selfW.toFixed(3)} alts ${A.alts.map((z) => `c${z.chain}s${z.s.toFixed(3)}d${px(z.d)}b${z.beta.toFixed(2)}`).join(",")}`);
  if (A.surf >= OWN) continue;
  for (const X of [A, ...A.alts]) {
    if (!(X.d < h + aa && X.d > h - fb.W - aa)) continue;
    const fx = X.fx + (h * (x - X.fx)) / X.d;
    const fy = X.fy + (h * (y - X.fy)) / X.d;
    let bur = 0;
    for (const Bq of P) if (Bq !== A && Bq.surf === A.surf) bur = Math.max(bur, Bq.selfW * fb.winW(Bq, fx, fy));
    console.log(`  X c${X.chain} s${X.s.toFixed(4)}: f (${fx.toFixed(4)}, ${fy.toFixed(4)}) bur(pieces) ${bur.toFixed(3)}`);
    for (const ci of near) {
      const cn = fb.corners[ci];
      if (cn.g !== A.surf) continue;
      const pa = F.arms[cn.a].pi;
      const pb = F.arms[cn.b].pi;
      const onA = fb.onArm(cn.a, X);
      const onB = fb.onArm(cn.b, X);
      const dq = Math.hypot(fx - cn.qx, fy - cn.qy);
      const Rf = cn.rV + (2 * aa) / Math.max(0.1, Math.sin(cn.theta / 2)) + 1e-12;
      const fa = fb.footArm(cn.a, fx, fy, 0, Math.max(cn.dVa, cn.dA) + 2 * h).d;
      const fbd = fb.footArm(cn.b, fx, fy, 0, Math.max(cn.dVb, cn.dB) + 2 * h).d;
      const inF = fb.inFill(cn, fx, fy, X);
      let f9 = "";
      if (pa === X.chain && pb === X.chain && (onA || onB)) {
        const other = onA ? cn.b : cn.a;
        const span = other === cn.a ? Math.max(cn.dVa, cn.dA) : Math.max(cn.dVb, cn.dB);
        f9 = ` F9 wt ${(1 - ss(h - 2 * aa, h, fb.footArm(other, fx, fy, 0, span + 2 * h).d)).toFixed(3)}`;
      }
      console.log(`    corner ${ci} arms ${cn.a}(c${pa}) ${cn.b}(c${pb}) onA ${onA} onB ${onB} r ${px(cn.r)} rV ${px(cn.rV)} Rf ${px(Rf)} dq ${px(dq)} omega ${cn.omega.toFixed(3)} wedge ${fb.inWedge(cn, fx, fy)} footA ${px(fa)} footB ${px(fbd)} lim ${px(h - 2 * aa)} inFill ${inF}${f9}`);
    }
  }
}
// The CRN table: is each near corner in its group's list, its cell box, Rf.
const cellX = Math.floor(x / F.cell);
const cellY = Math.floor(y / F.cell);
console.log(`cell (${cellX}, ${cellY}); B.cell ${B.cell}`);
for (let g = 0; g < fb.nGroups; g++) {
  const co = B.grp[4 * g + 2];
  const cnt = B.grp[4 * g + 3];
  for (let i = 0; i < cnt; i++) {
    const o = CRN_TEXELS * 4 * (co + i);
    const box = B.crn.subarray(o + 24, o + 28);
    if (cellX < box[0] || cellX > box[1] || cellY < box[2] || cellY > box[3]) continue;
    const t0 = B.crn.subarray(o, o + 4);
    const t2 = B.crn.subarray(o + 8, o + 12);
    const t3 = B.crn.subarray(o + 12, o + 16);
    const w4 = B.crn.subarray(o + 16, o + 20);
    const w5 = B.crn.subarray(o + 20, o + 24);
    console.log(`CRN g${g} #${co + i}: q (${t0[0].toFixed(3)}, ${t0[1].toFixed(3)}) r ${px(t0[2])} omega ${t2[2].toFixed(3)} Rf ${px(t2[3])} arms ${t3[0]}(c${t3[2]}) ${t3[1]}(c${t3[3]}) winA ${Array.from(w4).map((z) => z.toFixed(3)).join(",")} winB ${Array.from(w5).map((z) => z.toFixed(3)).join(",")} box ${Array.from(box).join(",")}`);
  }
}
