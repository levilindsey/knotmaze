// K1384 / 27Z3: the table and the 250 ms bar (brief Done 2 and 3) from
// cold27z3.mjs records. A window's longest task / gap is the largest entry
// whose START falls in the window (a task or gap straddling the takeover is
// counted where it starts; its full duration still counts). Windows, on the
// page's performance timeline: (a) before the takeover [0, firstComp),
// (b) the takeover [firstComp-1000, firstComp+1000]. A control load has no
// takeover: its longest is over its whole 60 s. The bar: no gf load's (a) or
// (b) longest, task or gap, exceeds its own link's worst control longest by
// more than 250 ms.
//   node .claude/probes/K1384/analyze27z3.mjs <outDir> [label ...]
// reads <outDir>/<label>.json per label, labels A-gf1..3, A-ctl1..3, P-gf1..3, P-ctl1..3.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
const labels = process.argv.slice(3).length ? process.argv.slice(3)
  : ["A-gf1", "A-gf2", "A-gf3", "A-ctl1", "A-ctl2", "A-ctl3", "P-gf1", "P-gf2", "P-gf3", "P-ctl1", "P-ctl2", "P-ctl3"];
const rec = (l) => JSON.parse(readFileSync(join(dir, `${l}.json`), "utf8"));
const maxIn = (es, key, lo, hi) => es.filter((e) => e.start >= lo && e.start < hi).reduce((m, e) => Math.max(m, e[key]), 0);
const rows = [];
for (const l of labels) {
  const r = rec(l);
  const t = r.firstCompMs;
  rows.push({
    label: l, link: l[0], gf: l.includes("-gf"), firstCompMs: t,
    aTask: t >= 0 ? maxIn(r.longtasks, "dur", 0, t) : 0,
    aGap: t >= 0 ? maxIn(r.gaps, "gap", 0, t) : 0,
    bTask: t >= 0 ? maxIn(r.longtasks, "dur", t - 1000, t + 1000) : 0,
    bGap: t >= 0 ? maxIn(r.gaps, "gap", t - 1000, t + 1000) : 0,
    allTask: maxIn(r.longtasks, "dur", 0, Infinity),
    allGap: maxIn(r.gaps, "gap", 0, Infinity),
    nTask: r.longtasks.length, nGap: r.gaps.length, lost: r.lost, timedOut: r.timedOut,
  });
}
const worst = {};
for (const link of ["A", "P"]) {
  const cs = rows.filter((r) => r.link === link && !r.gf);
  worst[link] = { task: Math.max(...cs.map((r) => r.allTask)), gap: Math.max(...cs.map((r) => r.allGap)) };
}
let fail = 0;
console.log("load      firstComp  (a) task/gap   (b) task/gap   all task/gap  nTask nGap lost timeout");
for (const r of rows) {
  console.log(`${r.label.padEnd(9)} ${String(r.gf ? Math.round(r.firstCompMs) : "-").padStart(8)}  ` +
    `${String(r.gf ? r.aTask : "-").padStart(6)}/${String(r.gf ? r.aGap : "-").padEnd(6)} ` +
    `${String(r.gf ? r.bTask : "-").padStart(6)}/${String(r.gf ? r.bGap : "-").padEnd(6)} ` +
    `${String(r.allTask).padStart(6)}/${String(r.allGap).padEnd(6)} ${String(r.nTask).padStart(5)} ${String(r.nGap).padStart(4)} ${String(r.lost).padStart(4)} ${r.timedOut}`);
}
for (const link of ["A", "P"]) console.log(`control worst ${link}: task ${worst[link].task} ms, gap ${worst[link].gap} ms (bar: +250)`);
for (const r of rows.filter((x) => x.gf)) {
  for (const [w, task, gap] of [["a", r.aTask, r.aGap], ["b", r.bTask, r.bGap]]) {
    const et = task - worst[r.link].task, eg = gap - worst[r.link].gap;
    const bad = et > 250 || eg > 250 || r.firstCompMs < 0;
    if (bad) fail++;
    console.log(`${r.label} (${w}): task excess ${et} ms, gap excess ${eg} ms ${bad ? "OVER BAR" : "ok"}`);
  }
}
console.log(fail ? `BAR FAIL (${fail} window/s over)` : "BAR PASS");
