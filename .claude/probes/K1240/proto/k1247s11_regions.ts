// K1247 s11: where the region ids of a full and a reduced frame part ways (k1247s8_acc's frames,
// cold). Regions are numbered in interval order, skipping intervals whose polygon has under 3
// points, so one skipped region shifts every later id. Prints each region present in only one
// frame (by owner chain and group, aligned in order) with its point count and box.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s11_regions.ts <scene> <mult> <eps px>
import { structure, frame, type SceneIn, type OutlineTable } from "./outline";
import { sceneOf, load } from "./k1247s5_scenes";
import { selectKeep, reduceScene } from "./k1247s8_reduce";

const [name, multS, epsS] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const still = load(name);
const S = still.camera.pxPerUnit * 2; const h = still.look.halfWidth;
const K = selectKeep(still, { eps: +epsS / S });
const sc: SceneIn = sceneOf(name, +multS);
const A = frame(structure(still), sc); const B = frame(structure(reduceScene(still, K)), reduceScene(sc, K));
const box = (p: number[]): string => {
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (let k = 0; k + 1 < p.length; k += 2) { x0 = Math.min(x0, p[k]); x1 = Math.max(x1, p[k]); y0 = Math.min(y0, p[k + 1]); y1 = Math.max(y1, p[k + 1]); }
  return `(${x0.toFixed(3)}, ${y0.toFixed(3)})-(${x1.toFixed(3)}, ${y1.toFixed(3)}) ${(Math.max(x1 - x0, y1 - y0) / h).toFixed(3)} h`;
};
console.log(`${name} ${multS} eps ${epsS} px: regions full ${A.regions.length}, reduced ${B.regions.length}`);
const ra = A.regions; const rb = B.regions;
let i = 0; let j = 0; let shown = 0;
const same = (x: OutlineTable["regions"][number], y: OutlineTable["regions"][number]): boolean => x.ownerChain === y.ownerChain && x.group === y.group;
while ((i < ra.length || j < rb.length) && shown < 20) {
  if (i < ra.length && j < rb.length && same(ra[i], rb[j])) { i++; j++; continue; }
  // One side has an extra region: the one whose next region matches the other's current.
  if (i + 1 < ra.length && j < rb.length && same(ra[i + 1], rb[j])) { console.log(`  full only #${i} ch${ra[i].ownerChain} g${ra[i].group} n${ra[i].pts.length >> 1} ${box(ra[i].pts)} (reduced resumes at #${j})`); i++; shown++; continue; }
  if (j + 1 < rb.length && i < ra.length && same(ra[i], rb[j + 1])) { console.log(`  reduced only #${j} ch${rb[j].ownerChain} g${rb[j].group} n${rb[j].pts.length >> 1} ${box(rb[j].pts)} (full resumes at #${i})`); j++; shown++; continue; }
  console.log(`  diverge full #${i} ${ra[i] ? `ch${ra[i].ownerChain} g${ra[i].group} n${ra[i].pts.length >> 1}` : "-"} vs reduced #${j} ${rb[j] ? `ch${rb[j].ownerChain} g${rb[j].group} n${rb[j].pts.length >> 1}` : "-"}`);
  i++; j++; shown++;
}
