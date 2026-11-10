// K1247 s8: master's path (full density, eps 0) against the reduced path at
// several tolerances, alternating in one locked session, `rounds` rounds.
// Usage (from the worktree root, under k1247s8_run_locked.ps1 -ScriptName k1247s8_pair.mjs):
//   node .claude/probes/K1240/proto/k1247s8_pair.mjs <tag> [rounds] [eps,eps,...]
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const tag = process.argv[2] ?? "x";
const rounds = +(process.argv[3] ?? 2);
// Each entry is eps, or eps:extra args joined by "+" (0.02:--short=4+--armwin=0.5+--winx=2).
const epsList = (process.argv[4] ?? "0,0.02,0.05,0.1,0.2").split(",").map((e) => { const [eps, extra] = e.split(":"); return { eps: +eps, extra: extra ? extra.split("+") : [], label: e.replace(/[:+=-]+/g, "_") }; });
const out = join(here, "..", "out", "k1247s8_time");
const rows = [];
for (let r = 0; r < rounds; r++) {
  for (const { eps, extra, label } of epsList) {
    const t = `${tag}_e${label}_${r}`;
    const res = spawnSync("node", ["scripts/run_node.mjs", join(here, "k1247s8_time.ts"), t, `--eps=${eps}`, ...extra], { stdio: "inherit" });
    if (res.status !== 0) process.exit(res.status ?? 1);
    const d = JSON.parse(readFileSync(join(out, `time_${t}.json`), "utf8"));
    rows.push(`round ${r} eps ${eps}${extra.length ? ` ${extra.join(" ")}` : ""}${d.kept ? ` (${(d.kept / d.full * 100).toFixed(1)}%)` : " (full)"}: median ${d.median} p95 ${d.p95} | ${Object.entries(d.phases).map(([k, v]) => `${k} ${v}`).join(", ")} | select ${d.selectMs} struct ${d.structureMs}`);
  }
}
console.log(rows.join("\n"));
