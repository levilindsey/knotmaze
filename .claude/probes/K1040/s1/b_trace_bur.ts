// K1040 S1b, step 5: the burial at one site: every piece there, and for each in
// the band its buriers (w = B.ramp * B.selfW * A.ramp, winW) and the corners
// whose fill could hold its foot. Evaluated 1/512 px either side of the site.
// Run: npx vite-node .claude/probes/K1040/s1/b_trace_bur.ts <scene> <x> <y> [x|y]
import { readFileSync } from "node:fs";
import type { FieldScene } from "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/k1040-field/src/render/field/scene";
import { FormB, TERM_NAMES, type Piece } from "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/k1040-field/src/render/field/form_b";

const [name, xs, ys, dir] = process.argv.slice(2);
const s = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
s.look.ctrlArc ??= 0.47;
const fb = new FormB(s);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const F = fb as any;
const px = 1 / fb.ppuDev;
const X = Number(xs);
const Y = Number(ys);
for (const o of [-1, 1]) {
  const x = dir === "y" ? X : X + (o * px) / 512;
  const y = dir === "y" ? Y + (o * px) / 512 : Y;
  const r = fb.evalPoint(x, y);
  const P: Piece[] = [];
  fb.pieces(x, y, P);
  console.log(`(${x.toFixed(6)}, ${y.toFixed(6)}): ink ${r.ink.toFixed(3)} term ${r.term ? TERM_NAMES[r.term.kind] : "none"} top ${r.top} fade ${r.fade}`);
  for (const A of P) {
    const inBand = A.d < fb.h + fb.aa && A.d > fb.h - fb.W - fb.aa;
    console.log(`  piece #${A.idx} chain ${A.chain} s ${A.s.toFixed(4)} k ${A.k} d/h ${(A.d / fb.h).toFixed(4)} surf ${A.surf} selfW ${A.selfW.toFixed(3)} ramp ${A.ramp.toFixed(3)}${inBand ? " BAND" : ""}`);
    if (!inBand) continue;
    const fx = A.fx + (fb.h * (x - A.fx)) / A.d;
    const fy = A.fy + (fb.h * (y - A.fy)) / A.d;
    for (const B of P) {
      if (B === A || B.surf !== A.surf) continue;
      console.log(`     B #${B.idx} chain ${B.chain} w ${(B.ramp * B.selfW * A.ramp).toFixed(3)} winW ${F.winW(B, fx, fy).toFixed(4)}`);
    }
    for (const ci of F.cornersNear(x, y)) {
      const c = F.corners[ci];
      if (c.g !== A.surf) continue;
      const dq = Math.hypot(fx - c.qx, fy - c.qy);
      const ext = (2 * fb.aa) / Math.max(0.1, Math.sin(c.theta / 2));
      const fa = F.footArm(c.a, fx, fy, 0, Math.max(c.dVa, c.dA) + 2 * fb.h);
      const fbb = F.footArm(c.b, fx, fy, 0, Math.max(c.dVb, c.dB) + 2 * fb.h);
      console.log(`     corner ${ci} om ${c.omega.toFixed(3)} r/h ${(c.r / fb.h).toFixed(3)} inFill ${F.inFill(c, fx, fy, A)}: dq-r ${((dq - c.r) / fb.h).toFixed(4)}h, dq-(rV+ext) ${((dq - c.rV - ext) / fb.h).toFixed(4)}h, wedge ${F.inWedge(c, fx, fy)}, onA ${F.onArm(c.a, A)} onB ${F.onArm(c.b, A)}, fa.d/h ${(fa.d / fb.h).toFixed(5)} fb.d/h ${(fbb.d / fb.h).toFixed(5)} lim/h ${((fb.h - 2 * fb.aa) / fb.h).toFixed(5)} theta ${((c.theta * 180) / Math.PI).toFixed(1)} armA chain ${F.arms[c.a].pi} armB chain ${F.arms[c.b].pi} fa.k ${fa.k}`);
    }
  }
}
