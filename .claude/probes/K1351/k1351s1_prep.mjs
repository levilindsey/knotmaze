// K1351 s1: build src/render/outline_m holding master's outline.ts + fill_tri.ts (the only two
// src files this stage changes; every other file copied from the working tree, so identical),
// everything else in src/render/outline holding this stage's code (thruGate on). Delete
// outline_m before every npm test; never commit it.
//   node .claude/probes/K1351/k1351s1_prep.mjs master   (outline_m = master versions)
//   node .claude/probes/K1351/k1351s1_prep.mjs mine     (outline_m = working-tree versions)
import { cpSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const mode = process.argv[2];
rmSync("src/render/outline_m", { recursive: true, force: true });
cpSync("src/render/outline", "src/render/outline_m", { recursive: true });
if (mode === "master") {
  for (const f of ["outline.ts", "fill_tri.ts"]) {
    writeFileSync(`src/render/outline_m/${f}`, execFileSync("git", ["show", `HEAD:src/render/outline/${f}`]));
  }
}
console.log(`outline_m = ${mode}`);
