// K1314 s10: form B's evalPoint along a line (x0,y0)->(x1,y1): ink, top chain, s, z, key, the winning term, fade flags,
// covering surfaces and their dz / dkey, to see which term draws a find's ink.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s10_fbline.ts <scene> x0 y0 x1 y1 [n=8]
import { FormB } from "../../../src/render/field/form_b";
import { buildModel } from "./k1314_census";
const a = process.argv.slice(2); const [nm] = a; const [x0, y0, x1, y1] = a.slice(1, 5).map(Number); const n = +(a[5] ?? 8);
const m = buildModel(nm);
const fb = new FormB(JSON.parse(JSON.stringify(m.scene)) as never, { dpr: 2 }) as any;
for (let i = 0; i <= n; i++) {
  const t = i / n; const x = x0 + (x1 - x0) * t; const y = y0 + (y1 - y0) * t;
  const e = fb.evalPoint(x, y);
  const term = e.term ? JSON.stringify(e.term, (k, v) => (typeof v === "number" ? +v.toFixed(3) : v)).slice(0, 150) : "null";
  console.log(`(${x.toFixed(3)},${y.toFixed(3)}) ink ${e.ink.toFixed(2)} top ${e.top} c${e.chain} s ${e.s.toFixed(3)} z ${e.z.toFixed(3)} key ${e.key.toFixed(3)} fade ${e.fade} nS ${e.nSurf} dz ${e.dz.toFixed(3)} dk ${e.dkey.toFixed(3)} term ${term}`);
}
