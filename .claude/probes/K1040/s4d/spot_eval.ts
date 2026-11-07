// K1040 S4d: form B along chain61's band centres through the spot window.
//   node scripts/run_node.mjs .claude/probes/K1040/s4d/spot_eval.ts
import { readFileSync } from "node:fs";
import { FormB, OWN, TERM_NAMES } from "../../../../src/render/field/form_b";
import { pointAt } from "../../../../src/render/field/geom";
import type { FieldScene } from "../../../../src/render/field/scene";

const scene = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/def.json`, "utf8")) as FieldScene;
scene.look.ctrlArc ??= 0.47;
const fb = new FormB(scene, { dpr: 2 });
const h = fb.h, W = fb.W;
const ci = 61;
const poly = fb.polys[ci];
for (const side of [1, -1]) {
  console.log(`--- chain 61 side ${side > 0 ? "L" : "R"} (band centre h-W/2) ---`);
  for (let s = 140.1; s <= 141.75; s += 0.065) {
    const c = pointAt(poly, s);
    const nx = -c.ty * side, ny = c.tx * side;
    const bx = c.x + nx * (h - W / 2), by = c.y + ny * (h - W / 2);
    const ev = fb.evalPoint(bx, by);
    const m = fb.member(ci, s);
    console.log(`s ${s.toFixed(2)} at (${bx.toFixed(2)},${by.toFixed(2)}) ink ${ev.ink.toFixed(3)} top ${ev.top >= OWN ? "OWN" + (ev.top - OWN) : ev.top} term ${ev.term ? TERM_NAMES[ev.term.kind] + " w" + ev.term.w.toFixed(2) : "-"} Dexp ${ev.Dexp === Infinity ? "inf" : ev.Dexp.toFixed(3)} fade ${ev.fade} member g${m.g} ramp ${m.ramp.toFixed(2)} z ${ev.z.toFixed(3)}`);
  }
}
