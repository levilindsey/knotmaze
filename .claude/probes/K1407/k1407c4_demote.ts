// K1407 c4: an experiment on spot 16's V. The face loop's corner-fill burial (`bur = 1` when the foot q is in corner
// k's fill) is skipped when k's other arm has no gathered piece in the face's surface (a ramp-0 non-member there),
// so a demoted arm's fillet no longer buries the member arm's outline. Prints an ink map (step px) of crop pixels,
// base and experiment side by side: ' ' < .1, '.' < .4, '+' < .7, '#' >= .7.
//   node scripts/run_node.mjs .claude/probes/K1407/k1407c4_demote.ts <scene> <x> <y> <c0> <r0> <n> [step=2]
import { buildModel } from "../K1314/k1314_census.ts";
import { gfTablesOf } from "../K1362/k1362s1_census.ts";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";
const [nm, xs, ys, cs, rs, ns, st] = process.argv.slice(2);
const T = gfTablesOf(buildModel(nm)) as any; const P = 480, ppu = P / (2.5 * T.h);
const c0 = Math.round(+xs * ppu - P / 2), r0 = Math.round(+ys * ppu - P / 2); const s = st ? +st : 2;
const A = new GfEval(T) as any; const B = new GfEval(T) as any;
const orig = B.outsideArms.bind(B);
B.outsideArms = (k: number, own: number, x: number, y: number): boolean => {
  if (own >= 0) {
    const S = T.kG[k]; const other = T.kCa[k] === own ? T.kCb[k] : T.kCa[k]; let any = false;
    for (let m = 0; m < B.np; m++) if (B.pc[m] === other && B.psurf[m] === S) { any = true; break; }
    if (!any) return false;
  }
  return orig(k, own, x, y);
};
const ch = (v: number): string => (v < 0.1 ? " " : v < 0.4 ? "." : v < 0.7 ? "+" : "#");
let nd = 0;
for (let r = +rs; r < +rs + +ns; r += s) {
  let la = ""; let lb = "";
  for (let c = +cs; c < +cs + +ns; c += s) {
    const x = (c0 + c + 0.5) / ppu, y = (r0 + r + 0.5) / ppu;
    const a = A.eval(x, y).ink; const b = B.eval(x, y).ink; la += ch(a); lb += ch(b); if (Math.abs(a - b) > 0.02) nd++;
  }
  console.log(`${String(r).padStart(3)} ${la} | ${lb}`);
}
console.log(`differing samples: ${nd}`);
