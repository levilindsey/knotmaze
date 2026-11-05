// K1196: build out/SUMMARY.md from out/bench_all.json (bench.mjs).
//   node summarize.mjs <outDir>
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const OUT = resolve(process.argv[2] || "out");
const data = JSON.parse(readFileSync(join(OUT, "bench_all.json"), "utf8"));
const recs = data.records;
const by = (kind, state, roundFilter) => recs.filter((r) => r.state === state && roundFilter(r));
const vals = (list, pick) => list.map(pick).filter((x) => x != null && Number.isFinite(x));
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const fmt = (x, d = 2) => (x == null || !Number.isFinite(x) ? "—" : x.toFixed(d));
const stats = (list, pick) => {
  const a = vals(list, pick);
  return { n: a.length, mean: mean(a), min: a.length ? Math.min(...a) : NaN, max: a.length ? Math.max(...a) : NaN, each: a };
};

const states = ["baseline", "cyc", "loop"];
const lines = [];
lines.push("# K1196 (batch 20 Run F): two-ended pulses on loops and cycles — timing");
lines.push("");
lines.push(`Master records in \`bench_all.json\` (${data.when}); raw per-load dumps in \`dumps/\`, appended records in \`rounds.jsonl\`.`);
lines.push(`Host: ${data.host}. Caps renderer: ${data.caps?.renderer || "?"}. Rest window ${data.secRest} s; play window ${data.movesPlay} moves back to back per load.`);
lines.push("Sequence: same-build control pair (baseline twice) first, then 4 ABBA rounds (even: baseline, cyc, loop; odd: loop, cyc, baseline); each load measures rest then play on the same page.");
lines.push("");
lines.push("Stands (verbatim from `stands_cyc.mjs`): baseline = k111 link, no moves, start head; cyc = k111 moves 0,246,82,83,199,150,151,38,155,211 to node_221; loop = seed 1 &pr=8 moves 185,186,187,122,50,118,117,165,60,9,178,57,101 to node_635.");
lines.push("Two-ended knowledge: `__knotPulses()` items with `two === true` in the dumped declaration (see bench.mjs header), cross-checked with `dumpPulses`.");
lines.push("");
for (const kind of ["rest", "play"]) {
  lines.push(`## ${kind === "rest" ? "At rest" : "In play"} — frame ms per load`);
  lines.push("");
  lines.push("| load (seq, round) | state | target two | head | frame p50 | frame mean | finish p50 | frames | window s / moves |");
  lines.push("|---|---|---|---|---:|---:|---:|---:|---|");
  for (const r of recs) {
    const m = r[kind];
    lines.push(`| ${r.seq}, ${r.round} | ${r.state} | ${r.target === null ? "— (none expected)" : `e${r.target}${r.targetItem ? " two" : " MISSING"}`} | ${r.head} | ${fmt(m.frameMs?.p50)} | ${fmt(m.frameMs?.mean)} | ${fmt(m.finishMs?.p50)} | ${m.framesDrawn ?? "—"} | ${kind === "play" ? `${fmt(r.play.windowSec, 2)} s / ${r.play.playLog?.length ?? "—"}` : `${data.secRest} s`} |`);
  }
  lines.push("");
  lines.push("| state (4 rounds, control pair excluded) | frame p50 mean (min–max) | frame mean mean (min–max) | finish p50 mean (min–max) |");
  lines.push("|---|---:|---:|---:|");
  for (const s of states) {
    const list = by(kind, s, (r) => r.round >= 0);
    const a = stats(list, (r) => r[kind].frameMs?.p50), b = stats(list, (r) => r[kind].frameMs?.mean), c = stats(list, (r) => r[kind].finishMs?.p50);
    lines.push(`| ${s} (n=${a.n}) | ${fmt(a.mean)} (${fmt(a.min)}–${fmt(a.max)}) | ${fmt(b.mean)} (${fmt(b.min)}–${fmt(b.max)}) | ${fmt(c.mean)} (${fmt(c.min)}–${fmt(c.max)}) |`);
  }
  const ctrl = by(kind, "baseline", (r) => r.round < 0);
  const ca = stats(ctrl, (r) => r[kind].frameMs?.p50);
  lines.push(`| baseline control pair (n=${ca.n}) | ${fmt(ca.mean)} (${fmt(ca.min)}–${fmt(ca.max)}; each ${ca.each.map((x) => fmt(x)).join(", ")}) | | |`);
  lines.push("");
}
// Play kept-two detail
lines.push("## In play — did the target stay two-ended?");
lines.push("");
for (const r of recs) {
  if (r.target === null) continue;
  const log = r.play.playLog || [];
  const keptB = log.filter((e) => e.twoBefore?.includes(r.target)).length;
  const keptA = log.filter((e) => e.twoAfter?.includes(r.target)).length;
  const heads = [...new Set(log.flatMap((e) => [e.head0, e.head1]))].join(", ");
  lines.push(`- ${r.state} seq ${r.seq} round ${r.round}: e${r.target} two before ${keptB}/${log.length} moves, after ${keptA}/${log.length}; heads visited: ${heads}; ends at ${r.after.head} with two-ended ${r.after.twos.join(", ") || "none"}.`);
}
lines.push("");
lines.push("Baseline play is e0 back and forth between mentr_b and node_12 (24 moves, ends at mentr_b); it declares no two-ended arm, as expected.");
lines.push("");
lines.push("Reference: S4's rest bench (`.claude/probes/K1139/out/s4cyc/bench_rest.json`, ABBA x4, 5 s, k111 start head) read frameP50 base 7.15 ms against S4 7.10 ms — start-head one-ended pulses only.");
lines.push("");
writeFileSync(join(OUT, "SUMMARY.md"), lines.join("\n"));
console.log(lines.join("\n"));
