// K1186 run D (20D): write out20d/sheet_key.md from crops.json +
// ranking.json (the sheet's key; sheet.png itself carries no labels).
//   node sheet_key.mjs [outDir]
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, process.argv[2] || "out20d");
const crops = JSON.parse(readFileSync(join(OUT, "crops.json"), "utf8"));
const ranking = JSON.parse(readFileSync(join(OUT, "ranking.json"), "utf8"));
const fmt = (v) => (Array.isArray(v) && v.length === 6 ? `bound ${v[2]}, reach ${v[3]}` : JSON.stringify(v));
let md = "# K1186 run D sheet key (sheet.png: control first, then flip1..flip5; columns before / after / held)\n\n";
md += "Crops: 260 CSS px at the flipping junction on its stand's pinned state (`__knotPinClocks(100)`, `phw=0`, headed real-time Chrome), shown at 780 px (3x CSS; 390 dev px upscaled 2x nearest). Stands and drag paths verbatim from flips.mjs / 19B's dumps (rule 11); named change: dwell per step is 140 ms move + 140 ms held pause (retry rows flip2/flip5: exact 19B timing, 140 ms move, held shot immediately). Held for every row is the brief's paused stand-in: no joinery choice can be held from outside `rebuildFillets` (choices are closure-local per rebuild; `fieldProbe` only reads), so the drag pauses at the before sample, mouse down, and the held crop is that paused frame. The read wrapper is crops.mjs's INSTALL (flips.mjs's sampler, copied): it wraps `rebuildFillets` to read choices and holds nothing. Pixel counts at native resolution (changed px, any channel over 8, table.mjs's diff): flip = before->after, held = before->held, excess = flip - held.\n\n";
md += "| row | junction (live) | ranked flip (19B) | observed on this master | flip px | held px | excess px |\n|---|---|---|---|---|---|---|\n";
for (const r of crops.rows) {
  const rk = ranking.rows.find((x) => x.rowId === r.rowId);
  const ranked = rk ? `${rk.headline.kind}[${rk.headline.idx}] ${fmt(rk.headline.before)} -> ${fmt(rk.headline.after)} at step ${rk.step} (geo ${rk.geoMax.toFixed(0)}, drawn19B ${rk.drawn19B})` : "control (no flip at ji0, step 5)";
  const obs = r.rowId === "control" ? `motion only at step ${r.usedStep}` : `${JSON.stringify(r.valuesObserved?.before)} -> ${JSON.stringify(r.valuesObserved?.after)} at step ${r.usedStep}` + (r.observedStep === r.rankedStep ? " (ranked step)" : r.observedStep >= 0 ? ` (ranked step ${r.rankedStep} not reproduced; first headline change at step ${r.observedStep})` : ` (ranked flip not reproduced; pair shows ranked step ${r.usedStep} motion)`);
  md += `| ${r.rowId} | ${r.stand} ${r.script} ji${r.jiUsed} (${r.centreLive?.map((x) => x.toFixed(2)).join(", ")}) rec ${r.recLive} | ${ranked} | ${obs} | ${r.flipPx} | ${r.heldPx} | ${r.excessPx} |\n`;
}
md += "\nPer-row crop files, traces and 19B piece lists: crops.json and ranking.json in this folder. flip2's ranked cover flip does not occur on this master (cover[0] reads 1 before, during and after the drag, both timings); flip5's ranked 1->0 at step 4 does not occur either (the arm stays 0 until a 0->1 flip at step 14, which its pair shows, as flip4's does). Claude judges from the crops whether the flips that do occur pop.\n";
writeFileSync(join(OUT, "sheet_key.md"), md);
console.log(md);
