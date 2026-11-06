// K1196 22E: head-minus-base table from two bench22e out dirs.
//   node table22e.mjs <baseDir> <headDir> [s4Dir]
// Per stand, at rest and in play: frame p50, frame mean and finish p50
// (means over the 4 ABBA rounds, control pair excluded), head - base,
// beside each build's same-build control-pair spread (max - min of its
// two baseline control loads' frame p50). With s4Dir, S4-alone and
// S4b-only (head - s4) rows join it.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const load = (d) => JSON.parse(readFileSync(join(resolve(d), "bench_all.json"), "utf8"));
const base = load(process.argv[2]), head = load(process.argv[3]);
const s4 = process.argv[4] ? load(process.argv[4]) : null;
const STATES = ["baseline", "cyc", "loop"];
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const pick = (recs, state, kind, key) => mean(recs.filter((r) => r.state === state && r.round >= 0).map((r) => r[kind].frameMs && key === "frameP50" ? r[kind].frameMs.p50 : key === "frameMean" ? r[kind].frameMs.mean : r[kind].finishMs.p50));
const ctrl = (data, kind) => {
  const a = data.records.filter((r) => r.round < 0).map((r) => r[kind].frameMs.p50);
  return a.length ? Math.max(...a) - Math.min(...a) : NaN;
};
const f = (x, d = 2) => (x == null || !Number.isFinite(x) ? "-" : x.toFixed(d));
console.log(`base ${process.argv[2]} (${base.when}); head ${process.argv[3]} (${head.when})${s4 ? `; s4 ${process.argv[4]} (${s4.when})` : ""}`);
for (const kind of ["rest", "play"]) {
  console.log(`\n## ${kind}: head - base (ms; 4 ABBA rounds, means)`);
  console.log(`| stand | metric | base | ${s4 ? "S4 alone | " : ""}head | head-base |${s4 ? " S4-base | S4b (head-S4) |" : ""} control spread base/head |`);
  for (const s of STATES) for (const [label, key] of [["frame p50", "frameP50"], ["frame mean", "frameMean"], ["finish p50", "finishP50"]]) {
    const b = pick(base.records, s, kind, key), h = pick(head.records, s, kind, key);
    const m = s4 ? pick(s4.records, s, kind, key) : NaN;
    console.log(`| ${s} | ${label} | ${f(b)} | ${s4 ? f(m) + " | " : ""}${f(h)} | ${f(h - b)} |${s4 ? ` ${f(m - b)} | ${f(h - m)} |` : ""} ${f(ctrl(base, kind))} / ${f(ctrl(head, kind))} |`);
  }
}
