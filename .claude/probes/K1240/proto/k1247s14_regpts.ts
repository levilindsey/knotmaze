// K1247 s14: a dumped table's regions by id: owner, group, point count and points
// (rounded), plus whether each covers (x, y) (even-odd).
// Usage: node scripts/run_node.mjs <this> <sub> <scene> <x> <y> <id>[,<id>...]
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const [sub, nm, xS, yS, idsS] = process.argv.slice(2);
const x = +xS; const y = +yS;
const t = JSON.parse(readFileSync(join(here, "..", "out", sub, `table_${nm}_0.json`), "utf8")); const T = t.table ?? t;
function inside(pts: number[], px: number, py: number): boolean {
  let c = false; const n = pts.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) { const yi = pts[2 * i + 1]; const yj = pts[2 * j + 1]; if ((yi <= py) !== (yj <= py) && px < pts[2 * j] + ((py - yj) / (yi - yj)) * (pts[2 * i] - pts[2 * j])) c = !c; }
  return c;
}
for (const id of idsS.split(",").map(Number)) {
  const rg = T.regions.find((r: any) => r.id === id) ?? T.regions[id];
  if (!rg) { console.log(`region ${id}: none`); continue; }
  const p = rg.pts as number[]; const pts: string[] = [];
  for (let k = 0; k < p.length; k += 2) pts.push(`(${p[k].toFixed(4)},${p[k + 1].toFixed(4)})`);
  console.log(`region ${id} (id ${rg.id}) owner ${rg.ownerChain} group ${rg.group} n ${p.length / 2} covers ${inside(p, x, y)} pieces ${JSON.stringify(rg.pieces ?? [])}`);
  console.log("  " + pts.join(" "));
}
