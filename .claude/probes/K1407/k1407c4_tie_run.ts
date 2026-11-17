// K1407 c4: runs a probe script (the check, the crops, the census) with composite()'s tie mix replaced by an
// experiment (eval.ts only; the GLSL is untouched, so GPU-side probes do not see it):
//   TIE=min   the two orders' ink is min(r, r2) inside the window (an outline shows only where both orders show it)
//   TIE=minb  min where the swapped order has more ink, the blend where it has less
//   TIE=n<k>  the blend over a window narrowed to zt min(1, k aa / h) (c4c's dfdc756c was n1)
//   TIE=gm    (K1407 c5) min only where the tie is a group G against an own piece of a chain with an arm in G (a thread
//             that left G's junction: union, as if it were still a member); the blend elsewhere
//   TIE=gms   as gm, but min + (r - min) ss(0, zt, gap): the union at equal keys, the top order at the window's edge
//   TIE=gmd<k> as gms, only while the piece is within k h past the arm's L (d in [-h, L + k h])
//   node scripts/run_node.mjs .claude/probes/K1407/k1407c4_tie_run.ts <script.ts> [args...]
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";
const MODE = process.env.TIE ?? "min";
const ss = (a: number, b: number, v: number): number => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const P = GfEval.prototype as any;
const KD = MODE.startsWith("gmd") ? +MODE.slice(3) : Infinity;
/** a group surface against an own piece whose chain has an arm in that group (near the arm, under gmd<k>) */
const joined = (E: any, a: number, b: number): boolean => {
  if ((a >= 0) === (b >= 0)) return false;
  const G = a >= 0 ? a : b; const j = -1 - (a >= 0 ? b : a); const c = E.pc[j]; const s = E.ps[j]; const T = E.T;
  const len = T.cLen[c]; const closed = T.cClosed[c] === 1;
  for (let i = T.cArm0[c]; i < T.cArm0[c] + T.cArmN[c]; i++) {
    if (T.aG[i] !== G) continue;
    if (KD === Infinity) return true;
    let d = (s - T.aSR[i]) * T.aDir[i]; if (closed) { d = ((d % len) + len) % len; if (d > len / 2) d -= len; }
    if (d >= -T.h && d <= Math.max(T.aL[i], 0) + KD * T.h) return true;
  }
  return false;
};
P.composite = function (this: any): number {
  const ns = this.ns; const zt = MODE[0] === "n" ? this.T.zt * Math.min(1, (+MODE.slice(1) * this.T.aa) / this.T.h) : this.T.zt;
  const comp = (sw: number): number => {
    let Tt = 1; let ink = 0; let best = 0;
    for (let i = 0; i < ns; i++) {
      let e = this.sord[i]; if (sw >= 0 && i === sw) e = this.sord[i + 1]; else if (sw >= 0 && i === sw + 1) e = this.sord[i - 1];
      const c = Tt * this.sv[e];
      if (c > 0) { ink += c; if (c > best && sw < 0) { best = c; this.cWk = this.swk[e]; this.cWa = this.swa[e]; this.cWb = this.swb[e]; } }
      Tt *= 1 - this.sa[e];
      if (!(Tt > 0)) break;
    }
    if (sw < 0) this.cCov = 1 - Math.max(Tt, 0);
    return Math.min(1, ink);
  };
  this.cWk = 0; this.cWa = -1; this.cWb = 0;
  let r = comp(-1);
  for (let i = 0; i + 1 < ns; i++) {
    const gap = this.skey[this.sord[i]] - this.skey[this.sord[i + 1]];
    if (!(gap < zt)) continue;
    const r2 = comp(i);
    if (r2 === r) continue;
    const t = ss(-zt, zt, gap);
    if (MODE.startsWith("gm")) {
      if (joined(this, this.sid[this.sord[i]], this.sid[this.sord[i + 1]])) { const m = Math.min(r, r2); r = MODE === "gm" ? m : m + (r - m) * ss(0, zt, gap); }
      else r = t * r + (1 - t) * r2;
      break;
    }
    r = MODE === "min" || (MODE === "minb" && r2 > r) ? Math.min(r, r2) : t * r + (1 - t) * r2;
    break;
  }
  return r;
};
const [script, ...rest] = process.argv.slice(2);
process.argv = [process.argv[0], resolve(script), ...rest];
await import(pathToFileURL(resolve(script)).href);

