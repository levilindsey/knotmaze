// K1407 c4: runs a probe script (the check, the census, the crops) with k1407c4_demote.ts's experiment patched into
// GfEval: a face's foot is not buried by corner k's fill when k's other arm has no gathered piece in the face's surface.
//   node scripts/run_node.mjs .claude/probes/K1407/k1407c4_demote_run.ts <script.ts> [args...]
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";
const MODE = +(process.env.DM ?? 1); // 1: no gathered member piece of the other arm; 2: only non-member pieces of it gathered
const P = GfEval.prototype as any; const orig = P.outsideArms;
P.outsideArms = function (this: any, k: number, own: number, x: number, y: number): boolean {
  if (own >= 0) {
    const T = this.T; const S = T.kG[k]; const other = T.kCa[k] === own ? T.kCb[k] : T.kCa[k]; let mem = false; let non = false;
    for (let m = 0; m < this.np; m++) if (this.pc[m] === other) { if (this.psurf[m] === S) mem = true; else non = true; }
    if (MODE === 2 ? non && !mem : !mem) return false;
  }
  return orig.call(this, k, own, x, y);
};
const [script, ...rest] = process.argv.slice(2);
process.argv = [process.argv[0], resolve(script), ...rest];
await import(pathToFileURL(resolve(script)).href);
