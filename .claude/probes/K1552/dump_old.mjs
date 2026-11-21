// K1552 (27M): dump the 0007c8df build's gf sources (preview on :5486) and copy its largest
// fragment source to dump_old/largest.frag for time_group.mjs group "old".
//   node .claude/probes/K1552/dump_old.mjs
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";
const url = "http://localhost:5486/?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1&snd=none";
const outDir = ".claude/probes/K1552/out/27M/dump_old";
const r = spawnSync("node", [".claude/probes/K1456/s2/dumpsrc.mjs", url, ".claude/probes/K1552/profile_old", outDir], { stdio: "inherit" });
if (r.status !== 0) process.exit(r.status ?? 1);
const frags = readdirSync(outDir).filter((f) => f.endsWith(".frag"));
let best = null;
for (const f of frags) {
  const len = readFileSync(join(outDir, f), "utf8").length;
  console.log(`${f}: ${len}`);
  if (!best || len > best.len) best = { f, len };
}
copyFileSync(join(outDir, best.f), join(outDir, "largest.frag"));
writeFileSync(join(outDir, "largest.json"), JSON.stringify(best));
console.log(`largest: ${best.f} ${best.len}`);
