// K1324 s2: attribute j28's right-side shades (g41_user_tw64). The census's own model and raster (k1314_census.ts),
// once as is and once with the named pieces' band triangles at alpha 0; prints where the ink differs.
//   node scripts/run_node.mjs .claude/probes/K1324/k1324_s2_tailoff.ts <scene> <x> <y> <zoom> <px> <piece,...>
import { buildModel, rasterOutline } from "../K1314/k1314_census";

const [nm, xs, ys, zs, ps, list] = process.argv.slice(2);
const m = buildModel(nm);
const h = m.scene.look.halfWidth; const P = Number(ps); const ppu = P / (Number(zs) * h);
const c0 = Math.round(Number(xs) * ppu - P / 2); const r0 = Math.round(Number(ys) * ppu - P / 2);
const a = rasterOutline(m, c0, r0, P, P, ppu);
const off = new Set(list.split(",").map(Number));
const triA = m.triA.slice();
for (let t = 0; t < m.nTri; t++) if (off.has(m.triP[t])) { m.triA[3 * t] = 0; m.triA[3 * t + 1] = 0; m.triA[3 * t + 2] = 0; }
const b = rasterOutline(m, c0, r0, P, P, ppu);
m.triA.set(triA);
let n = 0; let mx = 0; const rows = new Map<number, [number, number, number]>();
for (let i = 0; i < P * P; i++) {
  const d = a.ink[i] - b.ink[i]; if (Math.abs(d) < 1 / 255) continue;
  n++; mx = Math.max(mx, Math.abs(d));
  const r = Math.floor(i / P); const c = i % P; const k = Math.floor(r / 20);
  const e = rows.get(k) ?? [c, c, 0]; e[0] = Math.min(e[0], c); e[1] = Math.max(e[1], c); e[2]++; rows.set(k, e);
}
console.log(`${nm} (${xs},${ys}) zoom ${zs} ${P}px ppu ${ppu.toFixed(1)}: pieces ${list} off -> ${n} px of ink differ, max ${mx.toFixed(3)}`);
for (const [k, e] of [...rows.entries()].sort((p, q) => p[0] - q[0])) console.log(`  rows ${20 * k}-${20 * k + 19}: cols ${e[0]}-${e[1]}, ${e[2]} px`);
