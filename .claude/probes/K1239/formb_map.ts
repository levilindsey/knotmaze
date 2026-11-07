// K1239: ASCII map: FormB ink vs chain 31/61 centrelines around j82.
// Usage: run_node formb_map.ts [x0 x1 y0 y1 step]
import { readFileSync } from "node:fs";
import { FormB } from "../../../src/render/field/form_b";
import type { FieldScene } from "../../../src/render/field/scene";

const d = JSON.parse(readFileSync(".claude/probes/K1239/out/diag_def.json", "utf8"));
const scene: FieldScene = d.scene;
scene.look.ctrlArc ??= 0.47;
const fb = new FormB(scene, { dpr: 1.5 });
const [x0, x1, y0, y1, step] = (process.argv.slice(2).map(Number) as number[]).length === 5 ? process.argv.slice(2).map(Number) : [15.9, 18.1, 15.3, 17.1, 0.1];
const near = (c: number, x: number, y: number, r: number) => {
  const pts = scene.chains[c].pts, n = pts.length / 2;
  for (let i = 0; i < n; i++) if (Math.hypot(pts[i * 2] - x, pts[i * 2 + 1] - y) < r) return true;
  return false;
};
for (let y = y1; y >= y0; y -= step) {
  let row = "";
  for (let x = x0; x <= x1; x += step) {
    const ev = fb.evalPoint(x, y);
    let ch = ev.ink > 0.5 ? "#" : ev.ink > 0.05 ? "+" : ".";
    if (near(31, x, y, step * 0.6)) ch = "1";
    else if (near(61, x, y, step * 0.6)) ch = "6";
    row += ch;
  }
  console.log(`${y.toFixed(1)} ${row}`);
}
console.log(`x from ${x0} step ${step}; 1=chain31 centre, 6=chain61 centre, #=FormB ink>0.5`);
