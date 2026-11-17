// K1438: probe copies of the evaluator, from origin/master's tracked source (so the comparison base is master's code):
//   node .claude/probes/K1438/k1438_mk.mjs
// eval_m.ts   = master's src/render/gpu_field/eval.ts (the switch-off equality check's reference).
// eval_tgr.ts = master's eval.ts + K1435's mode tgr (k1435_mkprobe.mjs's replacements), the port's reference.
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
const D = ".claude/probes/K1438/";
const master = execSync("git show origin/master:src/render/gpu_field/eval.ts", { encoding: "utf8", maxBuffer: 1 << 26 }).replace(/\r\n/g, "\n");
const fix = (s) => s.replace('from "./tables"', 'from "../../../src/render/gpu_field/tables"');
writeFileSync(D + "eval_m.ts", fix(master));
// K1435's generator, pointed at master's text: run its replacements on a copy.
let gen = readFileSync(".claude/probes/K1435/k1435_mkprobe.mjs", "utf8").replace(/\r\n/g, "\n");
gen = gen.replace('let s = readFileSync("src/render/gpu_field/eval.ts", "utf8").replace(/\\r\\n/g, "\\n");', "let s = MASTER;");
gen = gen.replace(/writeFileSync\(D \+ "eval_t\.ts", s\);[\s\S]*$/, "OUT(s);\n");
if (!gen.includes("let s = MASTER;") || !gen.includes("OUT(s)")) throw new Error("generator shape changed");
gen = gen.replace(/^import .*$/m, "");
const fn = new Function("MASTER", "OUT", "readFileSync", "writeFileSync", gen);
fn(master, (s) => writeFileSync(D + "eval_tgr.ts", s), readFileSync, writeFileSync);
console.log("ok");
