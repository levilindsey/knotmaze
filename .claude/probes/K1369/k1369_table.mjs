// K1369 s1: one line per cell of a motion run (k1369_motion.mjs's out/motion_<label>.json): thermal status and skin,
// frame p50/p90, rAF fps and the app's own fps, time to sleep, sim/wall, worker busy per wall s, ms per substep, then
// main, physics and gf-builder threads as run/runnable-wait ms per wall s [core:samples], gf builds (count, per s,
// latency ms, worker ms, main ms per frame) and the cell's p50 clocks (L cpu0, M cpu2, B cpu6, G GPU, MHz).
//   node .claude/probes/K1369/k1369_table.mjs .claude/probes/K1369/out/motion_<label>.json
import { readFileSync } from "node:fs";
const j = JSON.parse(readFileSync(process.argv[2], "utf8"));
if (process.argv[3] === "keys") { console.log(JSON.stringify(j.runs[0].phys)); process.exit(0); }
const f = (x, d = 0) => (x == null ? "-" : Number(x).toFixed(d));
for (const r of j.runs) {
  const p = r.phys ?? {};
  const th = r.threads?.rows ?? [];
  const main = th.find((t) => t.comm === "CrRendererMain");
  const dw = th.filter((t) => t.comm === "DedicatedWorker").sort((a, b) => a.tid - b.tid);
  const phys = dw[0], bld = dw[1];
  const fps = r.n && r.threads?.wall ? r.n / r.threads.wall : null;
  const cores = (t) => t ? Object.entries(t.cores).map(([c, n]) => `${c}:${n}`).join(" ") : "";
  const c = r.clocks;
  const big = c?.cpu?.[6]?.[1], mid = c?.cpu?.[2]?.[1], lit = c?.cpu?.[0]?.[1];
  console.log(`${r.link} ${r.setting} ${r.scen} th${r.thermal?.status} skin${(r.thermal?.temps?.[0] ?? "").split(" ")[1]} ` +
    `p50 ${f(r.p50, 1)} p90 ${f(r.p90, 1)} fps ${f(fps, 1)} app ${f(p.appFps, 1)} sleep ${f(r.sleepS, 2)} sw ${f(p.simPerWall, 3)} busy ${f(p.busyPerS)} ms/sub ${f(p.msPerSubstep, 1)} ` +
    `| main ${main?.run}/${main?.wait} [${cores(main)}] mainms/fr ${f(main && fps ? main.run / fps : null, 1)} ` +
    `| phys ${phys?.run}/${phys?.wait} [${cores(phys)}] | bld ${bld ? bld.run + "/" + bld.wait : "-"} ` +
    `| gf ${r.gf ? `${r.gf.rebuilds}b ${f(r.gf.rebuilds / (r.scen === "drag" ? r.threads.wall - 0.6 : r.sleepS - (r.firstFrameS ?? 0)), 1)}/s lat${f(r.gf.latencyMs, 0)} w${f(r.gf.workMs, 1)} m${f(r.gf.mainPerFrame, 2)}` : "-"} | clk L${lit} M${mid} B${big} G${c?.gpu?.[1]}`);
}

