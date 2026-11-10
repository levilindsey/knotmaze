// K1247 s14: who covers a crack. In a disk (x, y, r), samples a 1/<ppu> grid;
// a crack point is one table A's faces cover, table B's don't, and form B
// covers. Prints A's faces at the crack points (region id, owner, group,
// pieces: kind, chain, side, s0..s1), then B's faces whose outline passes
// within <near> of a crack point, the same way.
// Usage: node scripts/run_node.mjs <this> <scene> <x> <y> <r> <subA> <subB> [ppu=160] [near=0.05]
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FormB } from "../../../../src/render/field/form_b";

const here = dirname(fileURLToPath(import.meta.url));
const [nm, xS, yS, rS, subA, subB, ppuS, nearS] = process.argv.slice(2);
const cx = +xS; const cy = +yS; const R = +rS; const ppu = Number(ppuS ?? 160); const near = Number(nearS ?? 0.05);
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const scene = JSON.parse(readFileSync(join(SCENE_DIR, `${nm}.json`), "utf8"));
(scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
const fb = new FormB(scene as never, { dpr: 2 }) as any;
const load = (s: string): any => { const t = JSON.parse(readFileSync(join(here, "..", "out", s, `table_${nm}_0.json`), "utf8")); return t.table ?? t; };
const TA = load(subA); const TB = load(subB);
function inside(pts: number[], x: number, y: number): boolean {
  let c = false; const n = pts.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) { const yi = pts[2 * i + 1]; const yj = pts[2 * j + 1]; if ((yi <= y) !== (yj <= y) && x < pts[2 * j] + ((y - yj) / (yi - yj)) * (pts[2 * i] - pts[2 * j])) c = !c; }
  return c;
}
function segD(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax; const dy = by - ay; const L = dx * dx + dy * dy; let t = L > 0 ? ((px - ax) * dx + (py - ay) * dy) / L : 0; t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}
function edgeD(pts: number[], x: number, y: number): number {
  let d = Infinity; const n = pts.length / 2;
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; d = Math.min(d, segD(x, y, pts[2 * i], pts[2 * i + 1], pts[2 * j], pts[2 * j + 1])); }
  return d;
}
const covers = (T: any, x: number, y: number): number[] => { const r: number[] = []; T.faces.forEach((f: any, i: number) => { if (!f.hole && f.ownerChain >= 0 && f.pts.length >= 6 && inside(f.pts, x, y)) r.push(i); }); return r; };
const crack: [number, number][] = [];
const aHit = new Map<number, number>();
for (let y = cy - R; y <= cy + R; y += 1 / ppu) for (let x = cx - R; x <= cx + R; x += 1 / ppu) {
  if (Math.hypot(x - cx, y - cy) > R) continue;
  if (fb.evalPoint(x, y).top < 0) continue;
  const a = covers(TA, x, y); if (!a.length) continue;
  const b = covers(TB, x, y); if (b.length) continue;
  crack.push([x, y]); for (const i of a) aHit.set(i, (aHit.get(i) ?? 0) + 1);
}
console.log(`${nm} (${cx}, ${cy}) r ${R}: ${crack.length} crack points at ${ppu}/unit`);
if (crack.length) {
  let sx = 0; let sy = 0; for (const [x, y] of crack) { sx += x; sy += y; }
  console.log(`  crack centroid (${(sx / crack.length).toFixed(4)}, ${(sy / crack.length).toFixed(4)})`);
}
const desc = (T: any, i: number): string => {
  const f = T.faces[i]; const rg = T.regions[i];
  const ps = (rg.pieces ?? []).map((k: number) => { const p = T.pieces[k]; return `#${k} ${p.kind}/${p.chain}${p.side !== undefined ? (p.side > 0 ? "+" : "-") : ""} s ${p.s0?.toFixed?.(4)}..${p.s1?.toFixed?.(4)}${p.corner !== undefined && p.corner >= 0 ? ` c${p.corner}` : ""}`; });
  return `face ${i} region ${rg.id} owner ${f.ownerChain} group ${f.group} n ${f.pts.length / 2}: ${ps.join(", ")}`;
};
console.log(`${subA} faces at the crack:`);
for (const [i, n] of aHit) console.log(`  ${n} pts: ${desc(TA, i)}`);
console.log(`${subB} faces within ${near} of a crack point:`);
TB.faces.forEach((f: any, i: number) => {
  if (f.hole || f.ownerChain < 0 || f.pts.length < 6) return;
  let d = Infinity; for (const [x, y] of crack) d = Math.min(d, edgeD(f.pts, x, y));
  if (d <= near) console.log(`  d ${d.toFixed(4)}: ${desc(TB, i)}`);
});
console.log(`${subA} faces within ${near} of a crack point:`);
TA.faces.forEach((f: any, i: number) => {
  if (f.hole || f.ownerChain < 0 || f.pts.length < 6) return;
  let d = Infinity; for (const [x, y] of crack) d = Math.min(d, edgeD(f.pts, x, y));
  if (d <= near) console.log(`  d ${d.toFixed(4)}: ${desc(TA, i)}`);
});
