// K1407 c5: runs a probe script (the check, the crops, the census) with member()'s second loop (a sibling arm's cap
// reaching back past its root, form B's "front pass" cut) bounded by an experiment (eval.ts only; the GLSL is
// untouched, so GPU-side probes do not see it):
//   MB=0  as src
//   MB=1  a back-reaching cut of an arm at the same root as the first loop's arm (the other half of a through pass)
//         is skipped: that arm already carries the pass as its own behind-the-root bound (tables' k uB)
//   MB=2  as 1, and a back-reaching cut of any other arm stops at the first loop's arm's root (it cannot demote
//         an arm of another junction)
//   node scripts/run_node.mjs .claude/probes/K1407/k1407c5_mem_run.ts <script.ts> [args...]
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { GfEval, ss } from "../../../src/render/gpu_field/eval.ts";
const MODE = +(process.env.MB ?? 1);
const P = GfEval.prototype as any;
if (MODE > 0) P.member = function (this: any, c: number, s: number): void {
  const T = this.T; const a0 = T.cArm0[c]; const an = T.cArmN[c]; const lam = T.h;
  const closed = T.cClosed[c] === 1; const len = T.cLen[c];
  let g = -1; let ramp = 0; let ai = -1;
  for (let i = a0; i < a0 + an; i++) {
    let d = (s - T.aSR[i]) * T.aDir[i]; if (closed) d = ((d % len) + len) % len;
    if (d < -1e-12 || d > T.aL[i] + 1e-12) continue;
    const Lc = T.aLcut[i];
    const rp = Lc === Infinity ? 1 : ss(Lc, Lc - lam, d);
    if (g < 0 || rp > ramp) { g = T.aG[i]; ramp = rp; ai = i; }
  }
  if (g >= 0 && ramp > 0) {
    for (let i = a0; i < a0 + an; i++) {
      const Lc = T.aLcut[i]; if (T.aG[i] !== g || Lc === Infinity) continue;
      if (Math.abs(T.aSR[i] - T.aSR[ai]) < 1e-9 && i !== ai) continue; // MB 1: the through pass's other half
      let d = (s - T.aSR[i]) * T.aDir[i]; if (closed) { d = ((d % len) + len) % len; if (d > len / 2) d -= len; }
      if (!(d < 1e-12 && d > Lc - lam)) continue;
      if (MODE === 2) { // the cut stops at ai's root: |d| beyond the distance from i's root back to ai's root is skipped
        let dr = (T.aSR[ai] - T.aSR[i]) * T.aDir[i]; if (closed) { dr = ((dr % len) + len) % len; if (dr > len / 2) dr -= len; }
        if (dr < 0 && d < dr) continue;
      }
      ramp = Math.min(ramp, ss(Lc, Lc - lam, d));
    }
  }
  this.mg = g; this.mramp = g < 0 ? 1 : ramp;
};
const [script, ...rest] = process.argv.slice(2);
process.argv = [process.argv[0], resolve(script), ...rest];
await import(pathToFileURL(resolve(script)).href);
