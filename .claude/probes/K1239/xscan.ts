// K1239: scan FormB ink along chain 31 (poly s) across crossing 104.
import { readFileSync } from "node:fs";
import { FormB } from "../../../src/render/field/form_b";
import { pointAt, normS } from "../../../src/render/field/geom";
import type { FieldScene } from "../../../src/render/field/scene";

const d = JSON.parse(readFileSync(".claude/probes/K1239/out/diag_def.json", "utf8"));
const scene: FieldScene = d.scene;
scene.look.ctrlArc ??= 0.47;
const fb = new FormB(scene, { dpr: 1.5 });
const h = scene.look.halfWidth, W = scene.look.band;
const chainId = Number(process.argv[2] ?? 31);
const centre = Number(process.argv[3] ?? 1.02); // poly s of crossing
const p = fb.polys[fb.polys.findIndex((q) => q.id === chainId)];
console.log(`chain ${chainId} poly s0=${p.s0} len=${p.len}; scan around poly s=${centre}`);
for (let s = centre - 0.9; s <= centre + 0.9; s += 0.06) {
  const at = pointAt(p, normS(p, s));
  const vals = [1, -1].map((side) => fb.evalPoint(at.x - at.ty * side * (h - W / 2), at.y + at.tx * side * (h - W / 2)).ink);
  console.log(`s=${s.toFixed(2)} ink L=${vals[0].toFixed(2)} R=${vals[1].toFixed(2)}`);
}
