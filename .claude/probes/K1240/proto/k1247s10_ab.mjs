// K1247 s10: master's outline.ts against this worktree's, timed on one scene by k1247s8_time.ts,
// alternating (master, mine, mine, master, ...) in one locked session. Master's file is swapped in
// over outline.ts for its runs and the committed one is restored with `git checkout` after each
// (and in a finally), so outline.ts must have no uncommitted changes. outline_master.ts (untracked)
// must sit beside this file:
//   git show master:.claude/probes/K1240/proto/outline.ts > .claude/probes/K1240/proto/outline_master.ts
// Usage (from the worktree root, under the lock):
//   & .claude/probes/K1240/proto/k1247s8_run_locked.ps1 -ScriptName k1247s10_ab.mjs -RunArgs @('<tag>', '[rounds]', '[eps,eps]')
import { spawnSync } from "node:child_process";
import { readFileSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const tag = process.argv[2] ?? "ab";
const rounds = +(process.argv[3] ?? 3);
const epsList = (process.argv[4] ?? "0").split(",").map(Number);
const outline = join(here, "outline.ts");
const out = join(here, "..", "out", "k1247s8_time");
const dirty = spawnSync("git", ["diff", "--quiet", "HEAD", "--", outline]);
if (dirty.status !== 0) { console.error("outline.ts has uncommitted changes: commit them first"); process.exit(2); }
const restore = () => { const r = spawnSync("git", ["checkout", "--", outline], { stdio: "inherit" }); if (r.status !== 0) throw new Error("git checkout of outline.ts failed"); };
const rows = [];
const one = (who, eps, r) => {
  if (who === "master") copyFileSync(join(here, "outline_master.ts"), outline);
  try {
    const t = `${tag}_${who}_e${eps}_${r}`;
    const res = spawnSync("node", ["scripts/run_node.mjs", join(here, "k1247s8_time.ts"), t, `--eps=${eps}`], { stdio: "inherit" });
    if (res.status !== 0) throw new Error(`${t} exited ${res.status}`);
    const d = JSON.parse(readFileSync(join(out, `time_${t}.json`), "utf8"));
    rows.push(`round ${r} ${who.padEnd(6)} eps ${eps}: median ${d.median} p95 ${d.p95} | ${Object.entries(d.phases).map(([k, v]) => `${k} ${v}`).join(", ")} | structure ${d.structureMs}`);
  } finally { if (who === "master") restore(); }
};
try {
  for (let r = 0; r < rounds; r++) for (const eps of epsList) {
    const order = r % 2 ? ["mine", "master"] : ["master", "mine"];
    for (const who of order) one(who, eps, r);
  }
} finally { restore(); }
console.log(rows.join("\n"));
