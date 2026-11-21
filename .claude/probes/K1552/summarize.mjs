// K1552 (27M): summarise out/27M/time/<group>_b<n>.json into medians.
//   node .claude/probes/K1552/summarize.mjs [group...]   (default: every group file present)
// Per batch saved = control ms - variant ms (ctime rows: [control, variant]; floor: [copy, copy]).
// Prints per group: batches' saved, median saved, median control, median variant, chars removed.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
const root = ".claude/probes/K1552/out/27M";
const inv = JSON.parse(readFileSync(join(root, "inventory.json"), "utf8"));
const removed = Object.fromEntries(inv.rules.map((r) => [r.id, r.charsRemoved]));
removed.all = inv.all.charsRemoved;
removed.lone = -inv.lone.charsAdded;
removed.old = null;
const timeDir = join(root, "time");
const groups = process.argv.slice(2).length ? process.argv.slice(2)
  : [...new Set(readdirSync(timeDir).filter((f) => f.endsWith(".json")).map((f) => f.replace(/_b\d+\.json$/, "")))].sort();
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
for (const g of groups) {
  const rows = [];
  for (let b = 1; b <= 3; b++) {
    const p = join(timeDir, `${g}_b${b}.json`);
    if (!existsSync(p)) continue;
    const j = JSON.parse(readFileSync(p, "utf8"));
    rows.push({ control: j[0].ms, variant: j[1].ms, saved: j[0].ms - j[1].ms, ok: j.every((r) => r.ok), lens: j.map((r) => r.len) });
  }
  if (!rows.length) { console.log(`${g}: no batches`); continue; }
  console.log(`${g}: batches [${rows.map((r) => `${r.saved} (c ${r.control} v ${r.variant}${r.ok ? "" : " ERR"})`).join("; ")}] medianSaved ${med(rows.map((r) => r.saved))} ms medianControl ${med(rows.map((r) => r.control))} medianVariant ${med(rows.map((r) => r.variant))} charsRemoved ${removed[g] ?? "?"}`);
}
