// K1362 s11: how much of the scan's corner loop a ring-aware per-cell corner list would drop. For each cell, each
// corner in its list (cellKList) is kept if some point of the cell (padded by 1% of G) can pass the scan's ring test
// (rho > kR - aa - W, rho <= kRmax + W + 2aa) and, for a thru corner, its reach (d <= kRV + W + 4aa). Prints, per scene,
// the list entries now and kept, weighted per cell (each cell is G x G pixels' worth of iterations).
//   node scripts/run_node.mjs .claude/probes/K1362/k1362s11_kprune.ts <sceneDir>
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildTables } from "../../../src/render/gpu_field/tables";
import type { FieldScene } from "../../../src/render/field/scene";
const sceneDir = process.argv[2];
for (const nm of ["def", "muse_hash", "fat"]) {
  const scene = JSON.parse(readFileSync(join(sceneDir, `${nm}.json`), "utf8")) as FieldScene;
  const aa = 0.5 / (scene.camera.pxPerUnit * 2);
  const T = buildTables(scene, { aa }) as any;
  const W = T.W ?? T.P?.W; const G = T.G; const pad = 0.01 * G;
  let now = 0, kept = 0, cells = 0, cellsK = 0;
  for (let cy = 0; cy < T.gH; cy++) for (let cx = 0; cx < T.gW; cx++) {
    const i = cy * T.gW + cx; const k0 = T.cellK0[i]; const kn = T.cellKN[i];
    cells++; if (kn > 0) cellsK++;
    const x0 = T.gx0 + cx * G - pad, x1 = T.gx0 + (cx + 1) * G + pad, y0 = T.gy0 + cy * G - pad, y1 = T.gy0 + (cy + 1) * G + pad;
    for (let q = k0; q < k0 + kn; q++) {
      const k = T.cellKList[q]; now++;
      const px = Math.min(Math.max(T.kCx[k], x0), x1), py = Math.min(Math.max(T.kCy[k], y0), y1);
      const dmin = Math.hypot(px - T.kCx[k], py - T.kCy[k]);
      const fx = Math.max(Math.abs(T.kCx[k] - x0), Math.abs(T.kCx[k] - x1)), fy = Math.max(Math.abs(T.kCy[k] - y0), Math.abs(T.kCy[k] - y1));
      const dmax = Math.hypot(fx, fy);
      let ok = dmin <= T.kRmax[k] + W + 2 * aa && dmax > T.kR[k] - aa - W;
      if (ok && T.kThru[k]) ok = dmin <= T.kRV[k] + W + 4 * aa;
      if (ok) kept++;
    }
  }
  console.log(`${nm}: W ${W} aa ${aa.toExponential(2)} G ${G} cells ${cells} with corners ${cellsK}; entries ${now} kept ${kept} (${(100 * kept / Math.max(1, now)).toFixed(1)}%), per cell ${(now / cells).toFixed(2)} -> ${(kept / cells).toFixed(2)}`);
}
