// K193/K253: install an A/A pass's noise.json as the tracked floor.
//   node scripts/phone_pass/install_floor.mjs <aaDir> <noteFile> [target=noise.json beside this script] [--min 3] [--force]
// A floor is for ONE viewport, so keep the old one aside first, e.g. `git mv scripts/phone_pass/noise.json
// scripts/phone_pass/noise.landscape.json`: summary.mjs falls back to noise.landscape.json when a pass's viewport fits it.
// <noteFile> holds the floor's handwritten `note`: when it was taken, on what build and phone, and what to watch for.
// Reads <aaDir>/noise.json and <aaDir>/bench.jsonl. The sample counts come from the bench rows (a base and a head row of the
// same rep and cell make one pair), NOT from noise.json's `reps`, which is the pass's -Reps even when the watchdog stopped
// it (the 2026-10-14 19:20 A/A said reps 3 with 2 pairs in five cells and 1 in load-slow). It refuses unless every cell has
// at least --min pairs (default 3), the viewport is 411/412 x 753/755 @2.625 (the pass's -Viewport portrait) and no
// watchdog.trip exists. --force writes it anyway with `reps` = the smallest pair count, a `samples` map, `partial: true` and
// the counts appended to the note.
// Key order follows the landscape floor: from, reps, viewport, note, emulated, display, rule, cells.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const minAt = args.indexOf("--min");
const MIN = minAt >= 0 ? Number(args[minAt + 1]) : 3;
const pos = args.filter((a, i) => !a.startsWith("--") && !(minAt >= 0 && i === minAt + 1));
const [aaDir, noteFile, target = join(HERE, "noise.json")] = pos;
if (!aaDir || !noteFile) { console.log("usage: node scripts/phone_pass/install_floor.mjs <aaDir> <noteFile> [target] [--min 3] [--force]"); process.exit(1); }
const aa = JSON.parse(readFileSync(join(aaDir, "noise.json"), "utf8"));
const rows = readFileSync(join(aaDir, "bench.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const idOf = (r) => (r.cell === "fabric" ? `fabric@${r.moves}` : r.cell === "load" ? `load-${r.link}` : r.cell);
// The cells the pass sampled (a pass run with -Moves 0,7,11 has fabric@11, not fabric@13); a cell with no rows at all would
// not be listed, so the check below also wants knot and both load cells.
const want = [...new Set([...rows.map(idOf), "knot", "load-default", "load-slow"])];
const pairs = {};
for (const id of want) {
  const rs = rows.filter((r) => idOf(r) === id);
  pairs[id] = [...new Set(rs.map((r) => r.rep))].filter((k) => rs.some((r) => r.rep === k && r.build === "base") && rs.some((r) => r.rep === k && r.build === "head")).length;
}
const atFinish = rows.filter((r) => r.cell === "fabric" && r.fab?.solved).length;
const problems = [];
for (const id of want) {
  if (!aa.cells?.[id] || !Object.keys(aa.cells[id]).length) problems.push(`cell ${id} missing or empty`);
  else if (pairs[id] < MIN) problems.push(`cell ${id}: ${pairs[id]} pair(s) of base+head samples, wanted ${MIN}`);
}
const m = /^(\d+)x(\d+)@([\d.]+)$/.exec(aa.viewport || "");
if (!m || ![411, 412].includes(+m[1]) || ![753, 755].includes(+m[2]) || +m[3] !== 2.625) problems.push(`viewport ${aa.viewport}, expected 411x753@2.625`);
const trip = join(aaDir, "state", "watchdog.trip");
if (existsSync(trip)) problems.push(`the watchdog tripped: ${readFileSync(trip, "utf8").trim()}`);
console.log("pairs per cell:", JSON.stringify(pairs), `| fabric samples taken at the finish: ${atFinish}`);
if (problems.length) { console.log("PROBLEMS:\n- " + problems.join("\n- ")); if (!flag("--force")) process.exit(2); console.log("--force: writing a PARTIAL floor anyway"); }
let note = readFileSync(noteFile, "utf8").trim();
const partial = problems.length > 0;
const reps = Math.min(...Object.values(pairs));
if (partial) note += ` PARTIAL: pairs of base+head samples per cell ${JSON.stringify(pairs)}; ${problems.join("; ")}.`;
const out = { from: aa.from, reps, viewport: aa.viewport, note, emulated: aa.emulated, display: aa.display, rule: aa.rule, ...(partial ? { partial: true, samples: pairs } : {}), cells: aa.cells };
writeFileSync(resolve(target), JSON.stringify(out, null, 2) + "\n");
console.log(`wrote ${resolve(target)}: ${aa.from}, ${reps} rep(s), ${aa.viewport}, cells ${Object.keys(aa.cells).join(", ")}${partial ? " (PARTIAL)" : ""}`);
