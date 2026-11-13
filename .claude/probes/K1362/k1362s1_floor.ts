// K1362 s1: the candidate floor. Per sampled point near ink: segments the bins hand the pixel (its cell's chunks)
// against the fewest the scene allows (segments whose distance is within the reach h + W + aa), mean and p95.
//   node scripts/run_node.mjs .claude/probes/K1362/k1362s1_floor.ts [scene,...] [--n=200000]
import { buildModel } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/k1314_census.ts";
import { gfTablesOf } from "./k1362s1_census";
const N = +(process.argv.find((a) => a.startsWith("--n="))?.slice(4) ?? 200000);
const scenes = (process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "def,muse_hash,fat").split(",");
const st = (a: number[]): string => { const s = [...a].sort((u, v) => u - v); return `mean ${(s.reduce((u, v) => u + v, 0) / s.length).toFixed(1)} p95 ${s[Math.floor(s.length * 0.95)]}`; };
for (const nm of scenes) {
  const m = buildModel(nm); const T = gfTablesOf(m) as any; const reach = T.h + T.W + T.aa;
  let rs = 1234567; const rnd = (): number => ((rs = (rs * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const binned: number[] = []; const floor: number[] = [];
  for (let i = 0; i < N; i++) {
    const x = T.gx0 + rnd() * T.gW * T.G; const y = T.gy0 + rnd() * T.gH * T.G;
    const cell = Math.floor((y - T.gy0) / T.G) * T.gW + Math.floor((x - T.gx0) / T.G);
    let nb = 0; let nf = 0;
    for (let q = T.cellCh0[cell]; q < T.cellCh0[cell] + T.cellChN[cell]; q++) {
      const c = T.cellChList[q]; const v0 = T.chV0[c]; const n = T.chN[c];
      for (let v = v0; v < v0 + n - 1; v++) { nb++;
        const ax = T.vx[v]; const ay = T.vy[v]; const dx = T.vx[v + 1] - ax; const dy = T.vy[v + 1] - ay; const l2 = dx * dx + dy * dy;
        const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
        const ex = ax + t * dx - x; const ey = ay + t * dy - y; if (ex * ex + ey * ey < reach * reach) nf++; }
    }
    if (nf > 0) { binned.push(nb); floor.push(nf); }
  }
  console.log(`${nm.padEnd(10)} pixels in reach ${binned.length}/${N}: binned ${st(binned)} | floor ${st(floor)} | cell G/h ${(T.G / T.h).toFixed(2)}`);
}
