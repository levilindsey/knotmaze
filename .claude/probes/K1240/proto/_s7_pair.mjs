// K1247 s7: master (54a6b84d's outline.ts, copied to _s7_base.ts) against this
// branch's outline.ts, alternating in one locked session. Usage (from the
// worktree root, under run_locked_k1247s4.ps1 -ScriptName _s7_pair.mjs):
//   node .claude/probes/K1240/proto/_s7_pair.mjs <tag> [rounds]
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const tag = process.argv[2] ?? "x";
const rounds = +(process.argv[3] ?? 2);
const out = join(here, "..", "out", "k1247c_time");
// _s7_base.ts is master's outline.ts at 54a6b84d (not committed; made here).
const basePath = join(here, "_s7_base.ts");
if (!existsSync(basePath)) writeFileSync(basePath, spawnSync("git", ["show", "54a6b84d:.claude/probes/K1240/proto/outline.ts"], { encoding: "utf8", maxBuffer: 1 << 28 }).stdout);
const rows = [];
for (let r = 0; r < rounds; r++) {
  for (const [who, script] of [["base", "_s7time_base.ts"], [tag, "k1247c_time.ts"]]) {
    const t = `${who}_${tag}_${r}`;
    const res = spawnSync("node", ["scripts/run_node.mjs", join(here, script), t], { stdio: "inherit" });
    if (res.status !== 0) process.exit(res.status ?? 1);
    const rep = JSON.parse(readFileSync(join(out, `time_${t}.json`), "utf8"));
    const d = rep[0];
    rows.push(`${t}: def median ${d.median} p95 ${d.p95} corners ${d.phases?.corners} | ring ${rep[1].median} fat ${rep[2].median} defc ${rep[3].median}`);
  }
}
console.log(rows.join("\n"));
