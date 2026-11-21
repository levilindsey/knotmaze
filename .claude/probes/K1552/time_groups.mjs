// K1552 (27M): run several compile groups back to back (one perf-lock call).
//   node .claude/probes/K1552/time_groups.mjs <group> [group...]
import { spawnSync } from "node:child_process";
for (const g of process.argv.slice(2)) {
  const r = spawnSync("node", [".claude/probes/K1552/time_group.mjs", g, "3"], { stdio: "inherit" });
  if (r.status !== 0) { console.error(`group ${g} failed ${r.status}`); process.exit(r.status ?? 1); }
}
console.log("all groups done");
