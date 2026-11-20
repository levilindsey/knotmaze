// K1529 (27B): 12 loads of link A through the capture path s21 used:
//   cap21.ps1 -> cap21b.mjs (= K1482 s15 cap15.mjs + FORCE2), profile k1482s21-<tag>,
//   query adds bgs=0; here run directly with FILL=1, HASH=fff8c9e5, SIMT=20.
// One kept profile for all loads (as cap21.ps1 does per tag), one WARM pass first.
//   node .claude/probes/K1529/run_s21.mjs <base> <outRoot> [nLoads] [capPath]
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
const [, , base, outRoot, nS = "12", capPath = "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/agent-afdf2b8bb494bb380/.claude/probes/K1482/s21/cap21b.mjs"] = process.argv;
const N = +nS;
const prof = join(process.env.TEMP, "k1529-s21-profile");
const Q = "3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1&bgs=0";
function cap(outDir, extraEnv) {
  mkdirSync(outDir, { recursive: true });
  const r = spawnSync("node", [capPath, base, outDir, prof, Q], {
    env: { ...process.env, HASH: "fff8c9e5", SIMT: "20", FILL: "1", ...extraEnv },
    timeout: 900000, encoding: "utf8", maxBuffer: 1 << 26,
  });
  return (r.stdout ?? "") + (r.stderr ?? "");
}
console.log("warm:", cap(join(outRoot, "warm"), { WARM: "1" }).split("\n").filter((l) => /warm|done/.test(l)).join(" | "));
for (let i = 1; i <= N; i++) {
  const d = join(outRoot, `load${String(i).padStart(2, "0")}`);
  const log = cap(d, {});
  const sj = join(d, "sites_gf.json");
  let view = null;
  if (existsSync(sj)) {
    const S = JSON.parse(readFileSync(sj, "utf8"));
    const A = S.toDevA, dpr = S.dpr;
    view = { x: A[4] / dpr, y: A[5] / dpr, s: A[0] / dpr, dpr, hash: S.hash, lost: S.lost };
  }
  console.log(`load ${i}: ${JSON.stringify(view)} :: ${log.split("\n").filter((l) => /hash|done|no load/.test(l)).join(" | ").slice(0, 220)}`);
}
