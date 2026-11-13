// K1362 s6: print the register-resident tier program's source (or a grep of it) for inspection.
//   node scripts/run_node.mjs .claude/probes/K1362/k1362s6_src.ts <p> <k> [r] [regex] [s][u]
import { gfFs } from "../../../src/render/gpu_field/gf_glsl";
const [p, k, r, re, f] = process.argv.slice(2);
const src = gfFs(false, true, { p: +p, k: +k, ramps: r === "r", reg: (f ?? "s").includes("s"), unroll: (f ?? "").includes("u") });
const lines = src.split("\n");
if (re) { const R = new RegExp(re); lines.forEach((l, i) => { if (R.test(l)) console.log(`${i + 1}: ${l.slice(0, 160)}`); }); }
else console.log(`${lines.length} lines, ${src.length} chars`);
