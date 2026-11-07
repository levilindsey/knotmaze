// K1220 S5: whole-frame diff of master vs mine at rest, attributed per
// fork kind: changed px within RadiusFh of an i fork (a taper-hidden glyph
// fork in the meta), within RadiusFh of another text fork, and beyond.
//   node diff_forks.mjs <masterRest.png> <mineRest.png> <mineMeta.json> [radiusFh=5]
import { readFileSync } from "node:fs";
import { decodePNG, toRGB } from "./png.mjs";
const [, , A, B, META, RAD = "5"] = process.argv;
const ia = toRGB(decodePNG(readFileSync(A)));
const ib = toRGB(decodePNG(readFileSync(B)));
if (ia.W !== ib.W || ia.H !== ib.H) throw new Error(`size ${ia.W}x${ia.H} vs ${ib.W}x${ib.H}`);
const m = JSON.parse(readFileSync(META, "utf8"));
const dsf = m.dsf || 1.5;
const rpx = Number(RAD) * m.fh * m.view.s * dsf;
const iForks = m.recs.filter((r) => r.glyph && r.hidden).map((r) => [r.sx * dsf, r.sy * dsf]);
const oForks = m.recs.filter((r) => r.glyph && !r.hidden).map((r) => [r.sx * dsf, r.sy * dsf]);
let n = 0, nearI = 0, nearO = 0, far = 0;
for (let i = 0; i < ia.W * ia.H; i++) {
  const o = i * 3;
  const d = Math.max(Math.abs(ia.data[o] - ib.data[o]), Math.abs(ia.data[o + 1] - ib.data[o + 1]), Math.abs(ia.data[o + 2] - ib.data[o + 2]));
  if (!d) continue;
  n++;
  const x = i % ia.W, y = (i / ia.W) | 0;
  let near = 0; // 1 = i fork, 2 = other fork
  for (const [fx, fy] of iForks) if (Math.hypot(x - fx, y - fy) <= rpx) { near = 1; break; }
  if (!near) for (const [fx, fy] of oForks) if (Math.hypot(x - fx, y - fy) <= rpx) { near = 2; break; }
  if (near === 1) nearI++; else if (near === 2) nearO++; else far++;
}
console.log(`${A.split("/").slice(-2).join("/")}: changed ${n} px | within ${RAD} fh of i fork ${nearI}, of other text forks ${nearO}, beyond ${far} (r=${rpx.toFixed(1)}px, iForks=${iForks.length}, otherForks=${oForks.length})`);
