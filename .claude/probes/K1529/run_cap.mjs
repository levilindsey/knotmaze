// K1529 (27B): 12 loads of link A through .claude/probes/K1482/cap.mjs, the maintained
// copy of the capture lineage s21's cap21b.mjs came from (cap15 -> cap21b). FILL=1 gives
// both looks per load (gf.png border, gf_fill.png fill) on hash fff8c9e5.
//   node .claude/probes/K1529/run_cap.mjs <base> <outRoot> [nLoads]
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
const [, , base, outRoot, nS = "12"] = process.argv;
const N = +nS;
const prof = join(process.env.TEMP, "k1529-cap-profile");
const Q = "3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1&bgs=0";
const cap = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1482/cap.mjs";
function run(outDir, extraEnv) {
  mkdirSync(outDir, { recursive: true });
  const r = spawnSync("node", [cap, base, outDir, prof, Q], {
    env: { ...process.env, HASH: "fff8c9e5", SIMT: "20", FILL: "1", ...extraEnv },
    timeout: 900000, encoding: "utf8", maxBuffer: 1 << 26,
  });
  return (r.stdout ?? "") + (r.stderr ?? "");
}
console.log("warm:", run(join(outRoot, "warm"), { WARM: "1" }).split("\n").filter((l) => /warm|done/.test(l)).join(" | ").slice(0, 200));
for (let i = 1; i <= N; i++) {
  const d = join(outRoot, `load${String(i).padStart(2, "0")}`);
  const log = run(d, {});
  const sj = join(d, "sites_gf.json");
  let view = null;
  if (existsSync(sj)) {
    const S = JSON.parse(readFileSync(sj, "utf8"));
    const A = S.toDevA, dpr = S.dpr;
    view = { x: A[4] / dpr, y: A[5] / dpr, s: A[0] / dpr, dpr, hash: S.hash, lost: S.lost };
  }
  console.log(`load ${i}: ${JSON.stringify(view)} :: ${log.split("\n").filter((l) => /view settled|hash|done|no load|timeout/.test(l)).join(" | ").slice(0, 240)}`);
}
