// K1552 (27M): compile batches for one group, three batches each with its own control copy (ctime.mjs,
// K1456 s2; parallel compiles in one batch, compared within the batch; median of the three saved).
//   node .claude/probes/K1552/time_group.mjs <group> [batches=3]
// Groups: floor (two copies of the base), kxt homeburial runt foldd foldshift tipsink corner home
// gapjoint lone all old (old = the 0007c8df build's largest source in out/27M/dump_old/, if dumped).
// Writes out/27M/time/<group>_b<n>.json (ctime rows) and prints one line per batch.
import { spawnSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const [, , group, batchesArg = "3"] = process.argv;
const root = ".claude/probes/K1552/out/27M";
const vs = join(root, "dump/vs.glsl");
const base = join(root, "dump/11.frag");
const variants = join(root, "variants");
const pair = (g) => {
  if (g === "floor") return [base, base];
  if (g === "old") return [base, join(root, "dump_old/largest.frag")];
  if (g === "lone") return [base, join(variants, "lone.frag")];
  if (g === "lonefs") return [join(variants, "fs_retry.frag"), join(variants, "fs_lone.frag")];
  if (g === "all") return [base, join(variants, "all.frag")];
  return [base, join(variants, `${g}.frag`)];
};
const files = pair(group);
for (const f of files) if (!existsSync(f)) { console.error(`missing ${f}`); process.exit(2); }
mkdirSync(join(root, "time"), { recursive: true });
for (let b = 1; b <= +batchesArg; b++) {
  const out = join(root, "time", `${group}_b${b}.json`);
  const t0 = Date.now();
  const r = spawnSync("node", [".claude/probes/K1456/s2/ctime.mjs", vs, out, ...files], { stdio: "inherit", env: process.env });
  console.log(`batch ${group} ${b}: wall ${((Date.now() - t0) / 1000).toFixed(1)}s exit ${r.status}`);
  if (r.status !== 0) process.exit(r.status ?? 1);
}
console.log(`group ${group} done`);
