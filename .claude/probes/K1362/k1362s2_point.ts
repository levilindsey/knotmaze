// K1362 s2: is a large GLSL-vs-mirror ink difference a port bug or float32 noise at a discontinuity of the
// rule? The CPU mirror (float32-rounded tables, as the census compares) evaluated at the pixel and at
// perturbations of 1e-6..1e-4 world units: a jump of the same size within float32-scale offsets is the rule's
// own discontinuity (a gate or winner switch), not the port.
//   node scripts/run_node.mjs .claude/probes/K1362/k1362s2_point.ts <scene> <x> <y> [<scene> <x> <y> ...]
import { buildModel } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/k1314_census.ts";
import { gfTablesOf } from "./k1362s2_census";
import { GfEval } from "../../../src/render/gpu_field/eval";
import type { GfTables } from "../../../src/render/gpu_field/tables";

const a = process.argv.slice(2);
for (let i = 0; i + 2 < a.length; i += 3) {
  const m = buildModel(a[i]); const T = gfTablesOf(m);
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(T)) o[k] = v instanceof Float64Array ? Float64Array.from(new Float32Array(v)) : typeof v === "number" ? Math.fround(v) : v;
  const E = new GfEval(o as unknown as GfTables);
  const x = +a[i + 1], y = +a[i + 2];
  const e0 = E.eval(x, y); // eval reuses its result object: copy it
  const base = { ink: e0.ink, win: e0.winKind, ch: e0.chain, seg: e0.nSeg, k: e0.nK };
  let worst = { d: 0, at: "", win: 0 };
  for (const eps of [1e-6, 3e-6, 1e-5, 3e-5, 1e-4]) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) {
    const e = E.eval(x + dx * eps, y + dy * eps); const d = Math.abs(e.ink - base.ink);
    if (d > worst.d) worst = { d, at: `eps ${eps} dir ${dx},${dy}`, win: e.winKind };
    if (eps === 1e-5 && d > 1e-3) console.log(`  ${a[i]} eps 1e-5 dir ${dx},${dy}: ink ${e.ink.toFixed(4)} (base ${base.ink.toFixed(4)}) win ${e.winKind} vs ${base.win}`);
  }
  console.log(JSON.stringify({ scene: a[i], x, y, base, worst }));
}
