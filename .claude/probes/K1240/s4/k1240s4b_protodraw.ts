// K1240 S4b: the prototype's own draw data on one scene (read only use of
// proto/): buildOutline, then buildDrawData (zChains, fillFrame, paintData
// and the CPU tie-alpha band: the 100x), timed. Node through
// scripts/run_node.mjs inflates imported-binding access (SSR getters), so
// compare like with like.
//   node scripts/run_node.mjs .claude/probes/K1240/s4/k1240s4b_protodraw.ts [scene=def]
import { readFileSync } from "node:fs";
import { buildOutline, type SceneIn } from "../proto/outline";
import { buildDrawData } from "../proto/draw";
const name = process.argv[2] ?? "def";
const scene = JSON.parse(readFileSync(`.claude/probes/K868/scenes/${name}.json`, "utf8")) as SceneIn;
(scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
for (let k = 0; k < 3; k++) {
  let t = performance.now(); const table = buildOutline(scene); const tb = performance.now() - t;
  t = performance.now(); const dd = buildDrawData(table, scene); const td = performance.now() - t;
  console.log(`buildOutline ${tb.toFixed(1)} ms, buildDrawData ${td.toFixed(1)} ms, band verts ${dd.bandCount}`);
}