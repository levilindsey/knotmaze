// K1040 S4d: crossings whose two passes form B puts in ONE group (member()),
// so the per-foot burial (D10) can bury one pass's edge inside the other.
//   node scripts/run_node.mjs .claude/probes/K1040/s4d/scan3.ts <scene>
import { readFileSync } from "node:fs";
import { FormB } from "../../../../src/render/field/form_b";
import { pointAt } from "../../../../src/render/field/geom";
import type { FieldScene } from "../../../../src/render/field/scene";

const name = process.argv[2] ?? "def";
const scene = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
scene.look.ctrlArc ??= 0.47;
const fb = new FormB(scene, { dpr: 2 });
let n = 0;
for (let i = 0; i < scene.crossings.length; i++) {
  const cr = scene.crossings[i];
  const ga = fb.member(cr.a.chain, cr.a.s);
  const gb = fb.member(cr.b.chain, cr.b.s);
  if (ga.g >= 0 && ga.g === gb.g) {
    const p = pointAt(fb.polys[cr.a.chain], cr.a.s);
    const pa = pointAt(fb.polys[cr.a.chain], cr.a.s), pb = pointAt(fb.polys[cr.b.chain], cr.b.s);
    const dot = Math.abs(pa.tx * pb.tx + pa.ty * pb.ty);
    const deg = (Math.acos(Math.min(1, dot)) * 180) / Math.PI;
    console.log(`cross ${i} group ${ga.g} chains ${cr.a.chain}/${cr.b.chain} over ${cr.over} at (${p.x.toFixed(2)},${p.y.toFixed(2)}) angle ${deg.toFixed(1)}deg`);
    n++;
  }
}
console.log(`${name}: ${n} crossings with both passes in one group of ${scene.crossings.length}`);
