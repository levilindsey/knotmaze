// K1314 s5: the fill triangles (fill_tri) that cover a point: chain, item kind, each vertex's position, key and s,
// and the key interpolated at the point (the depth test keeps the highest).
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s5_key.ts <scene> <x> <y>
import { buildModel } from "./k1314_census";
import * as F from "../../../src/render/outline/fill_tri";

const [nm, xs, ys] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const x = Number(xs); const y = Number(ys);
const m = buildModel(nm); const fs = m.fs; const fr = m.fr; const P = fr.pos; const K = fr.key; const I = fs.idx;
const f3 = (v: number): string => v.toFixed(3);
// vertex -> item (kind, index)
const vIt = new Int32Array(fs.nV).fill(-1);
fs.items.forEach((it, k) => { for (let v = it.base; v < it.base + F.itemVerts(it); v++) vIt[v] = k; });
// --strip=item,v0,v1: the strip's vertices base+v0..base+v1 (position, key, s, across)
const so = process.argv.find((a) => a.startsWith("--strip="))?.split("=")[1];
if (so) {
  const [ii, v0, v1] = so.split(",").map(Number); const it = fs.items[ii];
  for (let v = it.base + v0; v <= it.base + v1; v++) console.log(`  ${v - it.base}: (${f3(P[2 * v])},${f3(P[2 * v + 1])}) key ${K[v].toFixed(4)} s ${f3(fr.s[v])} across ${fr.across[v].toFixed(2)}`);
}
for (let t = 0; t < I.length; t += 3) {
  const a = I[t], b = I[t + 1], c = I[t + 2];
  const ax = P[2 * a], ay = P[2 * a + 1], bx = P[2 * b], by = P[2 * b + 1], cx = P[2 * c], cy = P[2 * c + 1];
  const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (!(Math.abs(den) > 1e-18)) continue;
  const l1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / den; const l2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / den; const l3 = 1 - l1 - l2;
  if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
  const k = l1 * K[a] + l2 * K[b] + l3 * K[c];
  const it = vIt[a] >= 0 ? fs.items[vIt[a]] : null;
  const kind = it ? `${it.kind}${it.kind === "strip" ? ` iv${it.iv} N${it.N}${it.ghost ? " ghost" : ""}` : it.kind === "junc" ? ` j${it.ji}` : ""}` : "?";
  console.log(`tri ${t / 3} c${fs.vChain[a]} item ${vIt[a]} ${kind} key@pt ${k.toFixed(4)}`);
  for (const v of [a, b, c]) console.log(`   v${v} (${f3(P[2 * v])},${f3(P[2 * v + 1])}) key ${K[v].toFixed(4)} s ${f3(fr.s[v])} across ${fr.across[v].toFixed(2)}`);
}
