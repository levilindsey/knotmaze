// K1482 s40: which test/render/field/scenes fixtures stage 40's rule changes against stage 37's, in the mirror: per
// scene (retry off and on), px over the table grid at step STEP px (aa = 0.5 / 320) whose ink differs by > 0.02
// between GfEval.S37 "37" and "" (stage 40), and the largest LOSS of ink stage 40 shows (it should only add ink back).
//   node scripts/run_node.mjs .claude/probes/K1482/s40/scan40.ts [STEP=2]
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dir = join(SRC, "test/render/field/scenes");
const SCENES = ["acute20.json", "acute30.json", "curved.json", "dead_end.json", "j_cross.json", "j_hook_cross.json", "j_pair_cross.json",
  "k42.json", "kink.json", "oblique30.json", "t90.json", "tight_curve.json", "x4_ends.json", "x4_throughs.json", "y120.json"];
const AA = 0.5 / 320; const STEP = +(process.argv[2] ?? 2);
for (const n of SCENES) {
  const s = JSON.parse(readFileSync(join(dir, n), "utf8")); s.look.ctrlArc ??= 0.47;
  for (const kRetry of [false, true]) {
    const T: any = withHome(buildTables(s, { aa: AA, kRetry }), true); const E: any = new GfEval(T);
    const px = 2 * AA * STEP; let nd = 0, worst = 0, wx = 0, wy = 0, n0 = 0;
    for (let y = T.gy0; y < T.gy0 + T.gH * T.G; y += px) for (let x = T.gx0; x < T.gx0 + T.gW * T.G; x += px) {
      GfEval.S37 = "37"; const a = E.eval(x, y).ink; GfEval.S37 = ""; const b = E.eval(x, y).ink; GfEval.S37 = "0"; const c = E.eval(x, y).ink;
      if (Math.abs(b - a) > 0.02) { nd++; if (a - b > worst) { worst = a - b; wx = x; wy = y; } }
      if (Math.abs(a - c) > 0.02) n0++;
    }
    console.log(`${n} retry ${kRetry ? 1 : 0}: s37 vs start ${n0} px, s40 vs s37 ${nd} px, worst loss ${worst.toFixed(3)}${worst > 0 ? ` at ${wx.toFixed(4)},${wy.toFixed(4)}` : ""}`);
  }
}
GfEval.S37 = "";
