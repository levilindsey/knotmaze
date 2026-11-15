// K1369 s4: the handoff's markdown table from k1369s4_motion.mjs's out/pass/motion_<label>.json (k1369s2_table.mjs's
// fields, stage 3's layout). One row per setting and scenario, each cell "rep 0 / rep 1": rate (today's app fps or gf's
// installs per s), sim/wall, ms per substep, the physics worker's wait for a core (ms per wall s), touch p50/p90 ms,
// thermal status (skin C), and p50 clocks in MHz (cpu0-1, cpu2-5, cpu6, GPU; a range when the cores of a group differ).
//   node .claude/probes/K1369/k1369s4_md.mjs .claude/probes/K1369/out/pass/motion_<label>.json
import { readFileSync } from "node:fs";
const j = JSON.parse(readFileSync(process.argv[2], "utf8"));
const f = (x, d = 0) => (x == null || Number.isNaN(x) ? "-" : Number(x).toFixed(d));
const rate = (r) => {
  if (!r.gf) return r.appFps ?? r.phys?.appFps ?? null;
  if (r.gf.installsPerS != null) return r.gf.installsPerS;
  const span = r.scen === "drag" ? r.threads?.wall - 0.6 : r.sleepS - (r.firstFrameS ?? 0);
  return span > 0 ? r.gf.rebuilds / span : null;
};
const grp = (c, a, b) => {
  const v = (c?.cpu ?? []).slice(a, b + 1).map((x) => x?.[1]).filter((x) => x != null);
  if (!v.length) return "-";
  const lo = Math.min(...v), hi = Math.max(...v);
  return lo === hi ? `${lo}` : `${lo}-${hi}`;
};
const rows = new Map();
for (const r of j.runs) {
  const th = r.threads?.rows ?? [];
  const phys = th.filter((t) => t.comm === "DedicatedWorker").sort((a, b) => a.tid - b.tid)[0];
  const c = r.clocks;
  const v = {
    rate: f(rate(r), 1), sw: (r.phys?.simPerWall == null ? "-" : r.phys.simPerWall.toFixed(3).replace(/^0/, "")),
    ms: f(r.phys?.msPerSubstep, 1), wait: phys ? `${phys.wait}` : "-",
    lat: r.touchLat ? `${f(r.touchLat.p50)}/${f(r.touchLat.p90)}` : "-",
    th: `${r.thermal?.status ?? "-"} (${(r.thermal?.temps?.[0] ?? "").split(" ")[1] ?? "-"})`,
    c01: grp(c, 0, 1), c25: grp(c, 2, 5), c6: grp(c, 6, 6), g: `${c?.gpu?.[1] ?? "-"}`,
  };
  const k = `${r.setting} ${r.scen}`;
  if (!rows.has(k)) rows.set(k, []);
  rows.get(k)[r.rep ?? 0] = v;
}
const keys = ["rate", "sw", "ms", "wait", "lat", "th", "c01", "c25", "c6", "g"];
console.log("| cell | rate | sim/wall | ms/substep | phys wait ms/s | touch p50/p90 ms | thermal (skin C) | cpu0-1 | cpu2-5 | cpu6 | GPU |");
console.log("|---|---|---|---|---|---|---|---|---|---|---|");
const order = [...rows.keys()].sort((a, b) => {
  const [sa, ca] = a.split(" "), [sb, cb] = b.split(" ");
  const so = ["intro-d", "intro-i", "drag"];
  return so.indexOf(ca) - so.indexOf(cb) || (sa === "today" ? -1 : sb === "today" ? 1 : sa.localeCompare(sb));
});
for (const k of order) {
  const reps = rows.get(k);
  const cell = (key) => {
    const vals = reps.map((v) => (v ? v[key] : "-"));
    return vals.every((x) => x === vals[0]) ? vals[0] : vals.join(" / ");
  };
  console.log(`| ${k} | ${keys.map(cell).join(" | ")} |`);
}
