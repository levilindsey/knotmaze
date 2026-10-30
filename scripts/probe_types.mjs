// K393 groundwork: the soft type-check over src + test. Runs
// tsconfig.tests.json, names every file it still skips (has errors in),
// and always exits 0. Since K1052 the same config gates in
// `npm run typecheck`; this stays as the per-file counter.
// docs/design/K393_probe.md records the findings.
import { spawnSync } from "node:child_process";

const tsc = process.platform === "win32" ? "npx.cmd" : "npx";
const run = spawnSync(tsc, ["tsc", "-p", "tsconfig.tests.json"], {
  encoding: "utf8",
  shell: process.platform === "win32",
});
const out = `${run.stdout ?? ""}${run.stderr ?? ""}`;
const files = new Map();
let errors = 0;
for (const line of out.split(/\r?\n/)) {
  const m = /^([^(]+)\(\d+,\d+\): error (TS\d+)/.exec(line);
  if (!m) continue;
  errors++;
  const f = m[1].replaceAll("\\", "/");
  files.set(f, (files.get(f) ?? 0) + 1);
}
console.log(`probe:types: ${errors} errors in ${files.size} skipped files (soft pass; typecheck gates)`);
for (const [f, n] of [...files].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${n}\t${f}`);
}
