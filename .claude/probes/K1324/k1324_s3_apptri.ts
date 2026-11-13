// K1324 s3 scratch: the app band's (bandGpu) triangles covering a point: chain, slots, base, s, dC, tie.
import * as D from "../../../src/render/outline/draw";
import { bandGpu } from "../../../src/render/outline/band_gpu";
import { buildModel } from "../K1314/k1314_census";

const [nm, xs, ys] = process.argv.slice(2);
const m = buildModel(nm); const x = Number(xs); const y = Number(ys);
const b = bandGpu(m.table, m.scene, m.zz);
const tie = D.tieAlpha(m.zz, b.h, b.W, b.zt);
for (let t = 0; 3 * t + 2 < b.count; t++) {
  const v = [3 * t, 3 * t + 1, 3 * t + 2];
  const X = v.map((k) => b.pos[2 * k]); const Y = v.map((k) => b.pos[2 * k + 1]);
  const den = (Y[1] - Y[2]) * (X[0] - X[2]) + (X[2] - X[1]) * (Y[0] - Y[2]); if (!(Math.abs(den) > 1e-18)) continue;
  const l1 = ((Y[1] - Y[2]) * (x - X[2]) + (X[2] - X[1]) * (y - Y[2])) / den; const l2 = ((Y[2] - Y[0]) * (x - X[2]) + (X[0] - X[2]) * (y - Y[2])) / den; const l3 = 1 - l1 - l2;
  if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
  const L = [l1, l2, l3]; const at = (k: number): number => L[0] * b.attr[4 * v[0] + k] + L[1] * b.attr[4 * v[1] + k] + L[2] * b.attr[4 * v[2] + k];
  const ch = b.chain[v[0]]; const sl = Array.from(b.slots.subarray(4 * v[0], 4 * v[0] + 4));
  const s = at(0); const dC = at(1); const base = at(3);
  console.log(`tri ${t} ch ${ch} slots ${sl.join(",")} base ${base.toFixed(3)} s ${s.toFixed(3)} dC/h ${(dC / b.h).toFixed(3)} tie ${ch >= 0 ? tie(ch, x, y, s, dC).toFixed(3) : "-"} attr2 ${at(2).toFixed(3)}`);
}
