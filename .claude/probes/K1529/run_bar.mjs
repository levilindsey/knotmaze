// K1529 (27B): 12 loads of link A through the bar's capture helper
// (.claude/probes/K1436/k1436_screen.mjs), one k1436 job per load, one kept profile.
// Job = link A plus the two pins every screen.mjs capture carries in practice
// (phw=0 so the freeze-parity credit applies; bgs=0 as s21 pinned).
//   node .claude/probes/K1529/run_bar.mjs <base> <outRoot> [nLoads]
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
const [, , base, outRoot, nS = "12"] = process.argv;
const N = +nS;
const prof = join(process.env.TEMP, "k1529-bar-profile");
// t=20 steps to 19.992 in screen.mjs (its K868 t-0.008 recipe) and lands on 8c308669;
// t=20.0167 makes its parity target 2402 substeps, link A's fff8c9e5 frame.
const job = { name: "linkA", query: "3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1&phw=0&snd=none&prp=off&bgs=0", t: 20.0167, hash: "fff8c9e5", w: 1240, h: 900 };
mkdirSync(outRoot, { recursive: true });
const jobsPath = join(outRoot, "jobs_linkA.json");
writeFileSync(jobsPath, JSON.stringify([job]));
const screen = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1436/k1436_screen.mjs";
function run(outDir, extraEnv) {
  mkdirSync(outDir, { recursive: true });
  const r = spawnSync("node", [screen, base, outDir, prof, jobsPath, "1"], {
    env: { ...process.env, STRICT: "1", ...extraEnv }, timeout: 900000, encoding: "utf8", maxBuffer: 1 << 26,
  });
  return (r.stdout ?? "") + (r.stderr ?? "");
}
console.log("warm:", run(join(outRoot, "warm"), { WARM: "1" }).split("\n").filter((l) => /warm/.test(l)).join(" | ").slice(0, 200));
for (let i = 1; i <= N; i++) {
  const d = join(outRoot, `load${String(i).padStart(2, "0")}`);
  const log = run(d, {});
  const mj = join(d, "linkA", "meta.json");
  let view = null;
  if (existsSync(mj)) {
    const M = JSON.parse(readFileSync(mj, "utf8"));
    view = { x: M.view.x, y: M.view.y, s: M.view.s, zoom: M.view.zoom, panX: M.view.panX, panY: M.view.panY, dpr: M.dpr, w: M.w, h: M.h, hash: M.hash, stable: M.stable, freeze: M.freeze };
  }
  console.log(`load ${i}: ${JSON.stringify(view)} :: ${log.split("\n").filter((l) => /hash|stable|WARNING|froze/.test(l)).join(" | ").slice(0, 260)}`);
}
