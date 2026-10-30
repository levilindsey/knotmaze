// K923: table of bench_frame results. node summarize.mjs <file.json> [...]
// Per URL: frameMs p50 / p95 (mean over the runs), minus the same file's
// floor, the rAF interval p50, frames, context losses, errors.
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const rows = [];
for (const f of process.argv.slice(2)) {
  const r = JSON.parse(readFileSync(f, "utf8"));
  const by = new Map();
  for (const run of r.runs) {
    const v = new URL(run.url).searchParams;
    const key = run.url;
    if (!by.has(key)) by.set(key, { v: v.get("v"), extra: [...v.entries()].filter(([k]) => !["scene", "z", "v"].includes(k)).map(([k, x]) => `${k}=${x}`).join("&"), runs: [] });
    by.get(key).runs.push(run);
  }
  const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
  const stat = (e) => ({
    p50: mean(e.runs.map((x) => x.frameMs ? x.frameMs.p50 : NaN)),
    p95: mean(e.runs.map((x) => x.frameMs ? x.frameMs.p95 : NaN)),
    iv: mean(e.runs.map((x) => x.intervalMs ? x.intervalMs.p50 : NaN)),
    n: e.runs.reduce((s, x) => s + (x.framesDrawn || 0), 0),
    lost: e.runs.reduce((s, x) => s + (x.contextLost || 0), 0),
    err: e.runs.flatMap((x) => x.errors || []).filter((x) => !/favicon|404/.test(x)).length,
    spread: e.runs.map((x) => x.frameMs ? x.frameMs.p50.toFixed(2) : "-").join("/"),
  });
  const ents = [...by.values()].map((e) => ({ ...e, ...stat(e) }));
  const floor = ents.find((e) => e.v === "floor");
  for (const e of ents) rows.push({ file: basename(f, ".json"), ...e, d50: floor ? e.p50 - floor.p50 : NaN, d95: floor ? e.p95 - floor.p95 : NaN });
}
const fx = (x) => (Number.isFinite(x) ? x.toFixed(2) : "-");
console.log("| file | v | extra | p50 | p95 | p50-floor | p95-floor | interval p50 | frames | runs' p50 | lost | err |");
console.log("|---|---|---|---|---|---|---|---|---|---|---|---|");
for (const r of rows) console.log(`| ${r.file} | ${r.v} | ${r.extra} | ${fx(r.p50)} | ${fx(r.p95)} | ${fx(r.d50)} | ${fx(r.d95)} | ${fx(r.iv)} | ${r.n} | ${r.spread} | ${r.lost} | ${r.err} |`);
