// K1247 s14: every region of a dumped table with a point within r of (x, y): id, owner,
// group, depth, point count, and whether it covers (x, y) by even-odd and by nonzero
// winding (the winding number too), plus the region's self-crossings within r. For
// muse_hash's 2 px crack at (26.86, 22.32): a swallowtail in a band's border.
// Usage: node scripts/run_node.mjs <this> <sub> <scene> <x> <y> [r=0.15]
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const [sub, nm, xS, yS, rS] = process.argv.slice(2);
const x = +xS; const y = +yS; const r = rS !== undefined ? +rS : 0.15;
const t = JSON.parse(readFileSync(join(here, "..", "out", sub, `table_${nm}_0.json`), "utf8")); const T = t.table ?? t;
function wind(p: number[]): { eo: boolean; w: number } {
  let eo = false; let w = 0; const n = p.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = p[2 * i], yi = p[2 * i + 1], xj = p[2 * j], yj = p[2 * j + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) eo = !eo;
    if (yj <= y) { if (yi > y && (xi - xj) * (y - yj) - (x - xj) * (yi - yj) > 0) w++; }
    else if (yi <= y && (xi - xj) * (y - yj) - (x - xj) * (yi - yj) < 0) w--;
  }
  return { eo, w };
}
function crossings(p: number[]): string[] {
  const n = p.length / 2; const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const ax = p[2 * i], ay = p[2 * i + 1], bx = p[2 * ((i + 1) % n)], by = p[2 * ((i + 1) % n) + 1];
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const cx = p[2 * j], cy = p[2 * j + 1], dx = p[2 * ((j + 1) % n)], dy = p[2 * ((j + 1) % n) + 1];
      const den = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
      if (Math.abs(den) < 1e-15) continue;
      const u = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / den;
      const v = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / den;
      if (u < 0 || u > 1 || v < 0 || v > 1) continue;
      const px = ax + u * (bx - ax), py = ay + u * (by - ay);
      if (Math.hypot(px - x, py - y) <= r) out.push(`seg ${i} x seg ${j} at (${px.toFixed(4)}, ${py.toFixed(4)}) loop ${j - i} pts`);
    }
  }
  return out;
}
for (const g of T.regions as any[]) {
  const p: number[] = g.pts; let near = false;
  for (let i = 0; i < p.length; i += 2) if (Math.hypot(p[i] - x, p[i + 1] - y) <= r) { near = true; break; }
  if (!near) continue;
  const c = wind(p);
  console.log(`region ${g.id} owner ${g.owner} group ${g.group} depth ${g.depth ?? "-"} n ${p.length / 2} evenodd ${c.eo} winding ${c.w}`);
  for (const s of crossings(p)) console.log(`  ${s}`);
}
