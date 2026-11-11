// K1279: k1247s9_union.ts on the f0c1111c outline snapshot (k1279_base_outline.ts), for the master side of the bars.
// K1247 s9: k1247s8_jitter's per-piece Hausdorff counts a split point that slides along an
// unchanged curve (a corner's tangent point moving between its arc and its run) as a move
// of both pieces. This measures what is drawn: for each piece over --bar px, the distance
// from its points to the union of every piece of the other frame, both ways (device px).
// Same jitter as k1247s8_jitter (seed 12345, perturbT for --cyc).
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s9_union.ts --d=0.001,0.01 [--scene=a,b] [--cyc=<frame>] [--bar=0.25] [--list=3]
import type { SceneIn } from "./k1279_base_outline";
import { structure, frame } from "./k1279_base_outline";
import { ALL, load } from "./k1247s5_scenes";
import { piecesOf, hausdorff } from "./k1247s8_reduce";

const arg = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const ds = (arg("d") ?? "0.01").split(",").map(Number);
const names = arg("scene") ? arg("scene")!.split(",") : ALL;
const bar = +(arg("bar") ?? 0.25); const nList = +(arg("list") ?? 3);
const cyc = arg("cyc");
const perturbT = (scene: SceneIn, A: number): SceneIn => {
  const o = JSON.parse(JSON.stringify(scene)) as SceneIn;
  const dxy = (x: number, y: number): [number, number] => [A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4)), A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3))];
  for (const c of o.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) { const d = dxy(c.pts[i], c.pts[i + 1]); c.pts[i] += d[0]; c.pts[i + 1] += d[1]; }
  return o;
};
type P = { key: string; pts: Float64Array };
// Segments of every piece, bucketed on a grid of `cell` (world units); a point's distance
// searches its 3x3 block, so a distance past `cell` reads as >= cell.
function segGrid(ps: P[], cell: number): (x: number, y: number) => number {
  const g = new Map<string, number[]>();
  const add = (k: string, v: number[]): void => { const a = g.get(k); if (a) a.push(...v); else g.set(k, [...v]); };
  for (const p of ps) {
    const a = p.pts;
    if (a.length === 2) { add(`${Math.floor(a[0] / cell)},${Math.floor(a[1] / cell)}`, [a[0], a[1], a[0], a[1]]); continue; }
    for (let i = 0; i + 3 < a.length; i += 2) {
      const x0 = Math.min(a[i], a[i + 2]); const x1 = Math.max(a[i], a[i + 2]); const y0 = Math.min(a[i + 1], a[i + 3]); const y1 = Math.max(a[i + 1], a[i + 3]);
      for (let cx = Math.floor(x0 / cell); cx <= Math.floor(x1 / cell); cx++) for (let cy = Math.floor(y0 / cell); cy <= Math.floor(y1 / cell); cy++) add(`${cx},${cy}`, [a[i], a[i + 1], a[i + 2], a[i + 3]]);
    }
  }
  return (x: number, y: number): number => {
    let best = cell; const cx = Math.floor(x / cell); const cy = Math.floor(y / cell);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const s = g.get(`${cx + i},${cy + j}`); if (!s) continue;
      for (let k = 0; k < s.length; k += 4) {
        const vx = s[k + 2] - s[k]; const vy = s[k + 3] - s[k + 1]; const l2 = vx * vx + vy * vy;
        const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - s[k]) * vx + (y - s[k + 1]) * vy) / l2)) : 0;
        const d = Math.hypot(x - s[k] - vx * t, y - s[k + 1] - vy * t); if (d < best) best = d;
      }
    }
    return best;
  };
}
for (const name of names) {
  const s0 = load(name);
  const still = cyc !== undefined ? perturbT(s0, ((+cyc <= 20 ? +cyc : 40 - +cyc) / 20) * 0.5 * s0.look.halfWidth) : s0; const S = still.camera.pxPerUnit * 2;
  const A = piecesOf(frame(structure(still), still)) as P[];
  const cell = 0.5 * s0.look.halfWidth; const toA = segGrid(A, cell);
  for (const dpx of ds) {
    let seed = 12345; const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const sc = JSON.parse(JSON.stringify(still)) as SceneIn;
    for (const c of sc.chains) for (let i = 0; i < c.pts.length; i++) c.pts[i] += ((rnd() * 2 - 1) * dpx) / S / Math.SQRT2;
    const B = piecesOf(frame(structure(sc), sc)) as P[]; const toB = segGrid(B, cell);
    let keys = 0; let over = 0; let overU = 0; let maxH = 0; let maxU = 0; const rows: [number, string][] = [];
    for (let i = 0; i < A.length; i++) {
      if (A[i].key !== B[i]?.key) { keys++; continue; }
      const hd = hausdorff(A[i].pts, B[i].pts) * S; if (hd > maxH) maxH = hd;
      if (!(hd > bar)) continue;
      over++;
      let u = 0;
      for (let k = 0; k + 1 < B[i].pts.length; k += 2) u = Math.max(u, toA(B[i].pts[k], B[i].pts[k + 1]));
      for (let k = 0; k + 1 < A[i].pts.length; k += 2) u = Math.max(u, toB(A[i].pts[k], A[i].pts[k + 1]));
      u *= S; if (u > maxU) maxU = u; if (u > bar) overU++;
      rows.push([u, `#${i} ${A[i].key}: piece ${hd.toFixed(3)} px, drawn ${u >= cell * S - 1e-9 ? `>= ${(cell * S).toFixed(1)}` : u.toFixed(3)} px`]);
    }
    rows.sort((a, b) => b[0] - a[0]);
    console.log(`${name}${cyc !== undefined ? ` cyc ${cyc}` : ""} jitter ${dpx} px: keys changed ${keys}; pieces > ${bar} px ${over} (max ${maxH.toFixed(3)}), drawn > ${bar} px ${overU} (max ${maxU.toFixed(3)})`);
    for (const r of rows.slice(0, nList)) console.log(`    ${r[1]}`);
  }
}
