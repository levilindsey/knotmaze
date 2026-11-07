// K1040 S4a2: one chain's arms and member() along s.
//   node scripts/run_node.mjs .claude/probes/K1040/s4a2/diag_arm.ts <scene> <chain> <s> [scale]
import { readFileSync } from "node:fs";
import { FormB } from "../../../../src/render/field/form_b";
import type { FieldScene } from "../../../../src/render/field/scene";

const [name, cas, sas, scs] = process.argv.slice(2);
const scale = Number(scs ?? 2);
const scene = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
scene.look.ctrlArc ??= 0.47;
const fb = new FormB(scene, { dpr: scale });
const ci = Number(cas);
const p = fb.polys[ci];
console.log(`chain ${ci} closed ${p.closed} n ${p.n} s0 ${p.s0} len ${p.len} lastS ${p.s[p.n - 1]}`);
for (const a of fb.armsOf[ci]) console.log(`arm idx ${fb.arms.indexOf(a)} kind ${a.kind} g ${a.g} sR ${a.sR} dir ${a.dir} L ${a.L} Lcut ${a.Lcut}`);
const s = Number(sas);
for (const ds of [-0.01, -0.001, -0.0001, 0, 0.0001, 0.001, 0.01]) {
  const q = s + ds;
  console.log(`member(${q.toFixed(5)}):`, fb.member(ci, q));
}
console.log(`member(exact end ${p.s[p.n - 1]}):`, fb.member(ci, p.s[p.n - 1]));
