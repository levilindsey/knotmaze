// K1214 22M: tables from prof22m / cdp22m outputs.
//   node prof_table.mjs <profDir...>   (each holds prof.json)
//   node prof_table.mjs --cdp <cdpDir...>
// Prints per build: frame stats; per-frame phase means and p95s
// (update, rebuild, tickPaint, tickAnim, tickExplore, fabricUpdate,
// submit, finish); __knotPerf bracketing the window; and, with
// --piece <key>, the frames sorted by that phase's cost (task 4).
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
const piece = args.includes("--piece") ? args[args.indexOf("--piece") + 1] : null;
const cdpMode = args.includes("--cdp");
const dirs = args.filter((a) => !a.startsWith("--") && a !== piece);
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const q = (a, f) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(f * b.length))] : NaN; };
const f2 = (x, d = 2) => (x == null || !Number.isFinite(x) ? "-" : x.toFixed(d));

for (const dir of dirs) {
  if (cdpMode) {
    const r = JSON.parse(readFileSync(join(resolve(dir), "cdp.json"), "utf8"));
    console.log(`\n## CDP ${r.label} (${dir}; stamp ${r.stamp}) total ${r.totalMs} ms`);
    console.log(`files: ${r.files.map((x) => `${x.file} ${x.selfMs}`).join(" | ")}`);
    for (const t of r.top.slice(0, 12)) console.log(`  ${f2(t.selfMs)} ms  ${t.fn.slice(0, 150)}`);
    continue;
  }
  const r = JSON.parse(readFileSync(join(resolve(dir), "prof.json"), "utf8"));
  const fr = r.frames || [];
  const keys = ["update", "rebuild", "tickPaint", "tickAnim", "tickExplore", "fabricUpdate", "submitMs", "finishMs"];
  console.log(`\n## ${r.label} (${dir}; stamp ${r.stamp}) frames ${fr.length}`);
  console.log(`frameMs p50 ${f2(q(fr.map((x) => x.frameMs), 0.5))} p95 ${f2(q(fr.map((x) => x.frameMs), 0.95))} max ${f2(Math.max(...fr.map((x) => x.frameMs)), 1)}; draws/frame ${f2(mean(fr.map((x) => x.draws)), 1)}`);
  console.log(`__knotPerf window: before mean ${f2(r.perf0?.mean)} p95 ${f2(r.perf0?.p95)}; after mean ${f2(r.perf1?.mean)} p95 ${f2(r.perf1?.p95)} max ${f2(r.perf1?.max)} (frames ${r.perf1?.frames}, physMs ${f2(r.perf1?.physMs, 0)}, revealP95 ${f2(r.perf1?.revealP95)})`);
  for (const k of keys) {
    const vals = fr.map((x) => x[k] || 0);
    const calls = fr.reduce((s, x) => s + (x[k + "N"] || 0), 0);
    console.log(`  ${k}: mean ${f2(mean(vals), 3)} p95 ${f2(q(vals, 0.95), 3)} max ${f2(Math.max(...vals), 3)} total ${f2(vals.reduce((s, v) => s + v, 0), 1)} calls ${calls}`);
  }
  if (piece) {
    const sorted = fr.map((x, i) => ({ i, frameMs: x.frameMs, v: x[piece] || 0, animating: x.animating, rebuildN: x.rebuildN || 0, updateN: x.updateN || 0 }))
      .sort((a, b) => b.v - a.v).slice(0, 15);
    console.log(`  frames sorted by ${piece} (top 15 of ${fr.length}):`);
    for (const s of sorted) console.log(`    frame ${s.i}: ${piece} ${f2(s.v, 3)} ms of frame ${f2(s.frameMs)} ms (animating ${s.animating}, rebuild x${s.rebuildN}, update x${s.updateN})`);
    const withPiece = fr.filter((x) => (x[piece] || 0) > 0.05);
    console.log(`  frames with ${piece} > 0.05 ms: ${withPiece.length} of ${fr.length}; their frameMs p95 ${f2(q(withPiece.map((x) => x.frameMs), 0.95))}; the rest p95 ${f2(q(fr.filter((x) => (x[piece] || 0) <= 0.05).map((x) => x.frameMs), 0.95))}`);
  }
}
