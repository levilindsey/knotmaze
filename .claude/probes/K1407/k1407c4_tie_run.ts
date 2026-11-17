// K1407 c4: runs a probe script (the check, the crops, the census) with composite()'s tie mix replaced by an
// experiment (eval.ts only; the GLSL is untouched, so GPU-side probes do not see it):
//   TIE=min   the two orders' ink is min(r, r2) inside the window (an outline shows only where both orders show it)
//   TIE=minb  min where the swapped order has more ink, the blend where it has less
//   node scripts/run_node.mjs .claude/probes/K1407/k1407c4_tie_run.ts <script.ts> [args...]
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";
const MODE = process.env.TIE ?? "min";
const ss = (a: number, b: number, v: number): number => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const P = GfEval.prototype as any;
P.composite = function (this: any): number {
  const ns = this.ns; const zt = this.T.zt;
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
    r = MODE === "min" || (MODE === "minb" && r2 > r) ? Math.min(r, r2) : t * r + (1 - t) * r2;
    break;
  }
  return r;
};
const [script, ...rest] = process.argv.slice(2);
process.argv = [process.argv[0], resolve(script), ...rest];
await import(pathToFileURL(resolve(script)).href);
