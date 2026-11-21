// K1552 (27M): the rest of the measurements in one perf-lock call: dump the 0007c8df build's
// sources, time lonefs (loneFold on the gfFs form) and old (0007c8df's largest vs master's), then
// the warm redraw timing (draw.mjs) on the master preview.
//   node .claude/probes/K1552/run_rest.mjs
import { spawnSync } from "node:child_process";
const steps = [
  ["node", [".claude/probes/K1552/dump_old.mjs"]],
  ["node", [".claude/probes/K1552/time_groups.mjs", "lonefs", "old"]],
  ["node", [".claude/probes/K1552/draw.mjs", "http://localhost:5485", ".claude/probes/K1552/profile", ".claude/probes/K1552/out/27M/draw.json"]],
];
for (const [cmd, args] of steps) {
  console.log(`== ${args.join(" ")}`);
  const r = spawnSync(cmd, args, { stdio: "inherit" });
  if (r.status !== 0) { console.error(`step failed: ${args.join(" ")} exit ${r.status}`); process.exit(r.status ?? 1); }
}
console.log("run_rest done");
