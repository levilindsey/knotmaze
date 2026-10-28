// report_scan.mjs: merges every pass's results (<round-dir>/<pass>/<scan|g31|...>/results.json; the pass folders are a letter and a
// number: s = the scan, b and d = the bisect, c and e = the confirms) and prints, per link, the builds in list order: the renderLoop
// medians, their mean, the step from the previous build (flagged at > 5 ms), the params that moved (value changed in both builds /
// key present on one side only), the skin temperature, GL errors, the passes. Offline: touches no phone.
// Call: node scripts/phone_pass/report_scan.mjs <round-dir> [link]     (link: dense | maxfab | knot24; default all three)
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { loadRound, paramDiff } from "./round.mjs";

const R = loadRound(process.argv[2]);
const root = R.dir;
const runs = [];
for (const d of readdirSync(root, { withFileTypes: true })) {
  if (!d.isDirectory() || !/^[a-z]\d+$/.test(d.name)) continue;
  for (const sub of readdirSync(root + "/" + d.name, { withFileTypes: true })) {
    if (!sub.isDirectory() || sub.name === "builds" || sub.name === "logs" || sub.name === "state") continue;
    const f = `${root}/${d.name}/${sub.name}/results.json`;
    if (!existsSync(f)) continue;
    const J = JSON.parse(readFileSync(f, "utf8"));
    for (const r of J.runs || []) runs.push({ ...r, pass: d.name + "/" + sub.name });
  }
}
const links = process.argv[3] ? [process.argv[3]] : ["dense", "maxfab", "knot24"];
for (const link of links) {
  console.log(`\n== ${link} (render sync ms, renderLoop median of 60; step flagged when > 5 ms from the previous row)`);
  const by = new Map();
  for (const r of runs.filter((r) => r.link === link && r.renderLoop && r.renderLoop.median != null)) {
    const key = r.sha;
    if (!by.has(key)) by.set(key, { sha: r.sha, idx: R.idxOf(r.sha), meds: [], p: [], pass: new Set(), params: null, skin: [], gl: [] });
    const e = by.get(key);
    e.meds.push(r.renderLoop.median); e.p.push(`${r.renderLoop.p10}-${r.renderLoop.p90}`); e.pass.add(r.pass);
    if (!e.params && r.params) e.params = r.params;
    const sk = r.thermal && r.thermal.temps && r.thermal.temps.find((t) => t.startsWith("VIRTUAL-SKIN")); if (sk) e.skin.push(sk.split(" ")[1]);
    e.gl.push((r.glAfter && r.glAfter.errs && r.glAfter.errs.length) || (r.glLoad && r.glLoad.errs && r.glLoad.errs.length) || (r.glAfter && r.glAfter.ctxLost) ? "GL!" : "ok");
  }
  const rows = [...by.values()].sort((a, b) => a.idx - b.idx);
  let prev = null;
  for (const e of rows) {
    const mean = e.meds.reduce((a, v) => a + v, 0) / e.meds.length;
    const d = prev ? mean - prev.mean : null;
    const pd = prev ? paramDiff(prev.params, e.params) : null;
    console.log(`${String(e.idx).padStart(3)} ${e.sha} ${e.meds.map((m) => m.toFixed(1)).join(" ")}${e.meds.length > 1 ? "  mean " + mean.toFixed(1) : ""}  [${e.p[0]}]  ${d == null ? "" : (d >= 0 ? "+" : "") + d.toFixed(1) + (Math.abs(d) > 5 ? "  <== STEP" : "")}  skin ${e.skin.join("/")} gl ${[...new Set(e.gl)].join(",")}  ${[...e.pass].join(",")}  ${R.subj(e.sha).slice(0, 70)}`);
    if (pd && (pd.ch.length || pd.add.length)) console.log(`      params vs prev: changed ${pd.ch.length ? pd.ch.join("; ") : "none"}; one-sided keys ${pd.add.length ? pd.add.join(",") : "none"}`);
    prev = { mean, params: e.params };
    e.mean = mean;
  }
}