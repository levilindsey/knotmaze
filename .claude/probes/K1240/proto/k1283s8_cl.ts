// K1283 s8: chain centerline points near a spot, and each listed point's distance to a chain's centerline.
//   K1283S8_TOOL=k1283s8_cl.ts pwsh k1283s8_bord.ps1 <scene> <x> <y> <R> <chain> [px,py ...]
import * as O from "./k1283s8_dbg_outline";
import { loadScene } from "./k1279_census";
const [name, xs, ys, rs, chs, ...qs] = process.argv.slice(2);
const X = Number(xs); const Y = Number(ys); const R = Number(rs); const ch = Number(chs);
const scene = loadScene(name);
const st = O.structure(scene);
O.frame(st, scene);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const C = (O as any).__fastCaches.get(st);
const p = C.polys[ch];
const f = (v: number): string => v.toFixed(3);
const row: string[] = [];
for (let i = 0; i < p.n; i++) if (Math.hypot(p.x[i] - X, p.y[i] - Y) < R) row.push(`${i}:(${f(p.x[i])},${f(p.y[i])}) s${f(p.s[i])}`);
console.log(`ch${ch} n ${p.n} len ${f(p.len)} closed ${p.closed} h ${f(C.h)} W ${f(C.W)}: ${row.join(" ")}`);
scene.junctions.forEach((j: { c: number[] }, ji: number) => { if (Math.hypot(j.c[0] - X, j.c[1] - Y) < R) console.log(`j${ji} c (${f(j.c[0])}, ${f(j.c[1])})`); });
for (const q of qs) {
  const [qx, qy] = q.split(",").map(Number);
  let best = Infinity; let bs = 0;
  for (let i = 0; i + 1 < p.n; i++) {
    const ax = p.x[i]; const ay = p.y[i]; const dx = p.x[i + 1] - ax; const dy = p.y[i + 1] - ay;
    const l2 = dx * dx + dy * dy; const u = l2 > 0 ? Math.max(0, Math.min(1, ((qx - ax) * dx + (qy - ay) * dy) / l2)) : 0;
    const d = Math.hypot(qx - ax - u * dx, qy - ay - u * dy);
    if (d < best) { best = d; bs = p.s[i] + u * (p.s[i + 1] - p.s[i]); }
  }
  console.log(`  (${q}) to ch${ch}: d ${f(best)} at s ${f(bs)}`);
}
