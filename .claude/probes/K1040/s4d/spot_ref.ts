// K1040 S4d: rasterize form B ink over the spot window (device 1020,1000,
// 200x200 at the app transform) and write a PGM-like JSON of ink>0.5 runs.
//   node scripts/run_node.mjs .claude/probes/K1040/s4d/spot_ref.ts
import { readFileSync, writeFileSync } from "node:fs";
import { FormB } from "../../../../src/render/field/form_b";
import type { FieldScene } from "../../../../src/render/field/scene";

const scene = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/def.json`, "utf8")) as FieldScene;
scene.look.ctrlArc ??= 0.47;
const fb = new FormB(scene, { dpr: 2 });
// app transform: device = (world*178.743 + (-2417.37, -2768.71)) * 1.5
const S = 178.743 * 1.5, OX = -2417.37 * 1.5, OY = -2768.71 * 1.5;
const Wpx = 200, Hpx = 200;
const rows: string[] = [];
for (let j = 0; j < Hpx; j++) {
  let row = "";
  for (let i = 0; i < Wpx; i++) {
    const wx = (1020 + i + 0.5 - OX) / S;
    const wy = (1000 + j + 0.5 - OY) / S;
    row += fb.evalPoint(wx, wy).ink >= 0.5 ? "#" : ".";
  }
  rows.push(row);
}
writeFileSync(".claude/probes/K1040/s4d/out/spot_ref.txt", rows.join("\n"));
for (let j = 20; j < 200; j += 20) console.log(`y${j} ${rows[j]}`);
console.log("wrote out/spot_ref.txt");
