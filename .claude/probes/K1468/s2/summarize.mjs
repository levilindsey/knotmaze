// K1468 s2: the interleaved table from interleave.ps1's r<round>_<build>.json files.
//   node .claude/probes/K1468/s2/summarize.mjs <dir> [<baseBuild>]
// Per build and link: frame p50 per round, their median and spread, composites per second likewise; and each build's
// median against the base build's (default bae2b).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
const [, , dir, base = "bae2b"] = process.argv;
const rows = {};
for (const f of readdirSync(dir).filter((n) => /^r\d+_.+\.json$/.test(n)).sort()) {
  const [, round, build] = f.match(/^r(\d+)_(.+)\.json$/);
  const j = JSON.parse(readFileSync(join(dir, f), "utf8"));
  for (const run of j.runs) {
    const link = run.url.includes("gfh=1") ? "A" : "B";
    const k = `${build} ${link}`;
    (rows[k] ??= []).push({ round: +round, p50: run.frameMs?.p50, iv: run.intervalMs?.p50, cps: run.composites / j.SEC, lost: run.contextLost, fb: run.fallback });
  }
}
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const out = [];
out.push("build  link | frame p50 per round (ms)        | median | spread | comp/s per round      | median | interval p50 med | lost");
const meds = {};
for (const k of Object.keys(rows).sort()) {
  const r = rows[k].sort((a, b) => a.round - b.round);
  const p = r.map((x) => x.p50), c = r.map((x) => x.cps), iv = r.map((x) => x.iv);
  meds[k] = { p50: med(p), cps: med(c) };
  out.push(`${k.padEnd(12)} | ${p.map((x) => x.toFixed(2).padStart(6)).join(" ").padEnd(31)} | ${med(p).toFixed(2).padStart(6)} | ${(Math.max(...p) - Math.min(...p)).toFixed(2).padStart(6)} | ${c.map((x) => x.toFixed(1).padStart(5)).join(" ").padEnd(21)} | ${med(c).toFixed(1).padStart(6)} | ${med(iv).toFixed(2).padStart(16)} | ${r.map((x) => x.lost).join(",")}`);
}
out.push("");
for (const k of Object.keys(meds).sort()) {
  const [b, l] = k.split(" "); const m0 = meds[`${base} ${l}`];
  if (!m0 || b === base) continue;
  out.push(`${k} vs ${base} ${l}: frame p50 ${((meds[k].p50 / m0.p50 - 1) * 100).toFixed(1)}%, composites/s ${((meds[k].cps / m0.cps - 1) * 100).toFixed(1)}%`);
}
console.log(out.join("\n"));
