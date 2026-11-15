// K1369 s2: the Pixel motion table from k1369s2_motion.mjs's out/pass/motion_<label>.json (k1369_table.mjs's columns
// plus stage 2's): per run, thermal status and skin, frame p50/p90, rAF and app fps, sleep, sim/wall, ms per substep,
// main / physics / gf-builder run/wait ms per wall s, gf installs per s, post-to-install p50 ms, gated frames, touch to
// pixels (p50/p90 ms; see k1369s2_motion.mjs), main ms per s, and every core's p50 clock (cpu0..cpu7, GPU; MHz). Then
// the bar per scenario: today's app fps against each gf setting's installs per s, and sim/wall, as means over reps.
//   node .claude/probes/K1369/k1369s2_table.mjs .claude/probes/K1369/out/pass/motion_<label>.json
import { readFileSync } from "node:fs";
const j = JSON.parse(readFileSync(process.argv[2], "utf8"));
const f = (x, d = 0) => (x == null || Number.isNaN(x) ? "-" : Number(x).toFixed(d));
const mean = (a) => { const v = a.filter((x) => x != null && !Number.isNaN(x)); return v.length ? v.reduce((p, c) => p + c, 0) / v.length : null; };
const rate = (r) => {
  if (!r.gf) return null;
  if (r.gf.installsPerS != null) return r.gf.installsPerS;
  const span = r.scen === "drag" ? r.threads?.wall - 0.6 : r.sleepS - (r.firstFrameS ?? 0);
  return span > 0 ? r.gf.rebuilds / span : null;
};
const agg = {};
for (const r of j.runs) {
  const p = r.phys ?? {};
  const th = r.threads?.rows ?? [];
  const main = th.find((t) => t.comm === "CrRendererMain");
  const dw = th.filter((t) => t.comm === "DedicatedWorker").sort((a, b) => a.tid - b.tid);
  const phys = dw[0], bld = dw[1];
  const fps = r.n && r.threads?.wall ? r.n / r.threads.wall : null;
  const app = r.appFps ?? p.appFps ?? null;
  const c = r.clocks;
  const clk = (c?.cpu ?? []).map((x, i) => (x ? `${i}:${x[1]}` : null)).filter(Boolean).join(" ");
  const ips = rate(r);
  console.log(`${r.rep ?? ""} ${r.setting} ${r.scen} th${r.thermal?.status} skin${(r.thermal?.temps?.[0] ?? "").split(" ")[1]} ` +
    `p50 ${f(r.p50, 1)} p90 ${f(r.p90, 1)} fps ${f(fps, 1)} app ${f(app, 1)} sleep ${f(r.sleepS, 2)} sw ${f(p.simPerWall, 3)} ms/sub ${f(p.msPerSubstep, 1)} ` +
    `| main ${main?.run}/${main?.wait} phys ${phys?.run}/${phys?.wait} bld ${bld ? bld.run + "/" + bld.wait : "-"} ` +
    `| gf ${r.gf ? `${f(ips, 1)}/s show${f(r.gf.showMs, 0)} gated${r.gf.gated ?? "-"}` : "-"} lat ${r.touchLat ? `${f(r.touchLat.p50, 0)}/${f(r.touchLat.p90, 0)}` : "-"} ` +
    `mainms/s ${f(r.mainMsPerS)} | clk ${clk} G:${c?.gpu?.[1]}`);
  const k = r.scen;
  agg[k] ??= {};
  agg[k][r.setting] ??= { rate: [], sw: [], lat: [], th: [] };
  const a = agg[k][r.setting];
  a.rate.push(r.setting === "today" ? app : ips);
  a.sw.push(p.simPerWall ?? null);
  a.lat.push(r.touchLat?.p50 ?? null);
  a.th.push(r.thermal?.status ?? null);
}
console.log("\nbar (mean over reps): today = app fps, gf = installs per s; sim/wall; touch p50 ms; thermal statuses");
for (const [scen, sets] of Object.entries(agg)) {
  const t = sets.today;
  const tr = t ? mean(t.rate) : null, ts = t ? mean(t.sw) : null;
  console.log(`${scen}: ` + Object.entries(sets).map(([s, a]) => {
    const rr = mean(a.rate), sw = mean(a.sw);
    const pass = s === "today" || tr == null ? "" : (rr != null && rr >= tr && sw != null && ts != null && sw >= ts ? " PASS" : " below");
    return `${s} ${f(rr, 1)}/s sw ${f(sw, 3)} lat ${f(mean(a.lat), 0)} th[${a.th.join("")}]${pass}`;
  }).join(" | "));
}
