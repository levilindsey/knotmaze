// K1451 s2: runs a probe script (the census) with master's keys: every pin window set back to win before the
// first eval of each table set (eval.ts reads T.pinWL / pinWR at call time; the scan's win1e-9 variant, which
// reproduces master's scan exactly). CPU mirror only.
//   node scripts/run_node.mjs .claude/probes/K1451/k1451_master_run.ts <script.ts> [args...]
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";
const P = GfEval.prototype as any; const ev0 = P.eval;
P.eval = function (this: any, ...a: unknown[]) {
  const T = this.T; if (T && !T.__k1451m) { T.pinWL.fill(T.win); T.pinWR.fill(T.win); T.__k1451m = 1; }
  return ev0.apply(this, a);
};
const [script, ...rest] = process.argv.slice(2);
process.argv = [process.argv[0], resolve(script), ...rest];
await import(pathToFileURL(resolve(script)).href);
