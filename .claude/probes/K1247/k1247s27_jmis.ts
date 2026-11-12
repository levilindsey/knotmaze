// K1247 s27: around every junction fan, the cells where the fill's winning item (fill_tri: highest key) is of
// another chain than form B's label (the census reference), per junction, written as JSON for a before/after diff.
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s27_jmis.ts <scene> <out.json> [--win=0.6] [--cell=0.03]
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s27_jmis.ts --diff <before.json> <after.json>
import { readFileSync, writeFileSync } from "node:fs";
import { FormB as FormBFillet } from "../K1314/form_b_fillet";
import { buildModel } from "../K1314/k1314_census";

const opt = (k: string, d: number): number => Number(process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d);
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
type Row = { j: number; x: number; y: number; cells: number; mis: number };
if (process.argv.includes("--diff")) {
  const A = JSON.parse(readFileSync(args[0], "utf8")) as Row[]; const B = JSON.parse(readFileSync(args[1], "utf8")) as Row[];
  const bj = new Map(B.map((r) => [r.j, r])); let ta = 0; let tb = 0; const ch: string[] = [];
  for (const a of A) { const b = bj.get(a.j); if (!b) continue; ta += a.mis; tb += b.mis; if (a.mis !== b.mis) ch.push(`j${a.j} (${a.x.toFixed(2)},${a.y.toFixed(2)}) ${a.mis} -> ${b.mis}`); }
  console.log(`mismatched cells ${ta} -> ${tb}; ${ch.length} junctions moved`);
  ch.sort((p, q) => Math.abs(Number(q.split(" ").pop()) - Number(q.split(" ")[2])) - Math.abs(Number(p.split(" ").pop()) - Number(p.split(" ")[2])));
  for (const l of ch.slice(0, 16)) console.log(`  ${l}`);
  process.exit(0);
}
const [nm, out] = args; const win = opt("win", 0.6); const cell = opt("cell", 0.03);
const m = buildModel(nm);
const fb = new FormBFillet(JSON.parse(JSON.stringify(m.scene)) as never, { dpr: 2 }) as unknown as { evalPoint(x: number, y: number): { chain: number } };
const P = m.fr.pos; const K = m.fr.key; const T = m.fs.idx;
const chainOf = (it: number): number => { const q = m.fs.items[it] as { kind: string; pi: number; owner: number }; return q.kind === "junc" ? q.owner : q.pi; };
// A fan's cell takes the chain of its dominant slot (vW: the arm whose paint it carries), not the fan's owner.
const VW = m.fs.vW; const ST = m.st as unknown as { arms: { pi: number }[] };
const chainAt = (who: number, w: number[]): number => {
  const q = m.fs.items[who] as { kind: string; arms?: { ai: number }[] };
  if (q.kind !== "junc" || !q.arms) return chainOf(who);
  let bk = 0; let bw = -1;
  for (let k = 0; k < Math.min(4, q.arms.length); k++) { const x = w[3] * VW[4 * w[0] + k] + w[4] * VW[4 * w[1] + k] + w[5] * VW[4 * w[2] + k]; if (x > bw) { bw = x; bk = k; } }
  return ST.arms[q.arms[bk].ai].pi;
};
const rows: Row[] = [];
m.fs.items.forEach((it0, j) => {
  const it = it0 as { kind: string; base: number };
  if (it.kind !== "junc") return;
  const hx = P[2 * it.base]; const hy = P[2 * it.base + 1];
  const x0 = hx - win; const x1 = hx + win; const y0 = hy - win; const y1 = hy + win;
  const tris: number[] = [];
  for (let t = 0; t < T.length; t += 3) {
    const a = T[t]; const b = T[t + 1]; const c = T[t + 2];
    if (Math.max(P[2 * a], P[2 * b], P[2 * c]) < x0 || Math.min(P[2 * a], P[2 * b], P[2 * c]) > x1) continue;
    if (Math.max(P[2 * a + 1], P[2 * b + 1], P[2 * c + 1]) < y0 || Math.min(P[2 * a + 1], P[2 * b + 1], P[2 * c + 1]) > y1) continue;
    tris.push(t);
  }
  let cells = 0; let mis = 0;
  for (let y = y0 + cell / 2; y < y1; y += cell) for (let x = x0 + cell / 2; x < x1; x += cell) {
    let best = -Infinity; let who = -1; let wa = [0, 0, 0, 0, 0, 0];
    for (const t of tris) {
      const a = T[t]; const b = T[t + 1]; const c = T[t + 2];
      const ax = P[2 * a]; const ay = P[2 * a + 1]; const bx = P[2 * b]; const by = P[2 * b + 1]; const cx = P[2 * c]; const cy = P[2 * c + 1];
      const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(den) < 1e-14) continue;
      const l1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / den; const l2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / den; const l3 = 1 - l1 - l2;
      if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
      const k = l1 * K[a] + l2 * K[b] + l3 * K[c];
      if (k > best) { best = k; who = m.vItem[a]; wa = [a, b, c, l1, l2, l3]; }
    }
    if (who < 0) continue;
    const lab = fb.evalPoint(x, y).chain; if (lab < 0) continue;
    cells++; if (chainAt(who, wa) !== lab) mis++;
  }
  rows.push({ j, x: hx, y: hy, cells, mis });
});
writeFileSync(out, JSON.stringify(rows));
console.log(`${nm}: ${rows.length} junctions, ${rows.reduce((a, r) => a + r.cells, 0)} cells, ${rows.reduce((a, r) => a + r.mis, 0)} mismatched`);
