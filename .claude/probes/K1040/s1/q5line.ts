import { readFileSync } from "node:fs";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB, OWN, TERM_NAMES } from "../../../../src/render/field/form_b";
const s = JSON.parse(readFileSync("C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/muse_hash.json", "utf8")) as FieldScene;
s.look.ctrlArc ??= 0.47;
const fb = new FormB(s, { dpr: 2 });
const [a, b, c, d, e, f] = s.camera.worldToCss;
const det = a * d - b * c;
const world = (x: number, y: number): [number, number] => { const u = x / 2 - e, v = y / 2 - f; return [(d * u - c * v) / det, (-b * u + a * v) / det]; };
for (const j of [183]) {
  for (let i = 1586; i <= 1636; i += 2) {
    const [x, y] = world(i + 0.5, j + 0.5);
    const r = fb.evalPoint(x, y);
    const top = r.top < 0 ? "paper" : r.top >= OWN ? `own${r.top - OWN}` : `g${r.top}`;
    console.log(`${i},${j} (${x.toFixed(3)}, ${y.toFixed(3)}) ink ${r.ink.toFixed(2)} ${top} ${r.term ? TERM_NAMES[r.term.kind] + (r.term.corner !== undefined ? "#" + r.term.corner : "") : "none"} f${r.fade} nSurf ${r.nSurf} Dexp ${(r.Dexp * fb.ppuDev).toFixed(1)}px W ${(fb.W * fb.ppuDev).toFixed(1)}px`);
  }
}
