// K1552 (27M): dump link A's gf sources from the master preview on :5485 (dumpsrc.mjs, K1456 s2).
//   node .claude/probes/K1552/dump.mjs
import { spawnSync } from "node:child_process";
const url = "http://localhost:5485/?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1&snd=none";
const r = spawnSync("node", [".claude/probes/K1456/s2/dumpsrc.mjs", url, ".claude/probes/K1552/profile", ".claude/probes/K1552/out/27M/dump"], { stdio: "inherit" });
process.exit(r.status ?? 1);
