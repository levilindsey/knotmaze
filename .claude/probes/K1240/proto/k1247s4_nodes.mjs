// K1247 s4: is the corner growth's output converged in its node count?
// Writes outline_nodes.ts (scratch, never committed), a copy of outline.ts
// with growIntegC's 32 nodes changed, for k1247c_verify.ts --impl:
//   node .claude/probes/K1240/proto/k1247s4_nodes.mjs <N> [--w-only]
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247c_verify.ts k1247c_base --impl=./outline_nodes.ts
// <N> sets kfGN (the advance step r0/N and the N trapezoid nodes); with
// --w-only the advance keeps its r0/32 step and only the trapezoid samples
// w at N nodes (N <= 32, dividing 32), so the path is the same.
// Result on 2026-11-09 (largest max-pts distance per scene, in h):
// N=16 0.04-0.21, N=8 0.03-0.34, N=64 0.03-0.17, N=128 0.15-0.69,
// w-only N=16 0.009-0.18; fat (no corners) 0 throughout.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const N = +process.argv[2];
const wOnly = process.argv.includes("--w-only");
if (!(N >= 2)) throw new Error("usage: k1247s4_nodes.mjs <N> [--w-only]");
let t = readFileSync(join(here, "outline.ts"), "utf8").replace(/\r\n/g, "\n");
const rep = (a, b) => { if (!t.includes(a)) throw new Error("missing: " + a); t = t.split(a).join(b); };
if (wOnly) {
  if (N > 32 || 32 % N !== 0) throw new Error("--w-only needs N dividing 32");
  rep("  const dN = kfCst.r0 / kfGN;", `  const dN = kfCst.r0 / ${N};`);
  rep("for (let kk = 1; kk <= kfGN; kk++) {", `for (let kk = 1; kk <= ${N}; kk++) {`);
} else {
  const M = Math.max(33, N + 1);
  rep("const kfGN = 32;", `const kfGN = ${N};`);
  rep("new Float64Array(33 * 12)", `new Float64Array(${M} * 12)`);
  rep("new Int32Array(33 * 2)", `new Int32Array(${M} * 2)`);
  rep("new Float64Array(33);", `new Float64Array(${M});`);
  rep("new Int32Array(33);", `new Int32Array(${M});`);
}
writeFileSync(join(here, "outline_nodes.ts"), t);
console.log(`wrote outline_nodes.ts: ${wOnly ? "w at" : "kfGN ="} ${N}`);
