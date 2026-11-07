// K1239: FormB ink along chain 31 near crossing 104 (s~1.21, under chain 61).
import { readFileSync } from "node:fs";
import { FormB } from "../../../src/render/field/form_b";
import { pointAt, normS } from "../../../src/render/field/geom";
import type { FieldScene } from "../../../src/render/field/scene";

const d = JSON.parse(readFileSync(process.argv[2] ?? ".claude/probes/K1239/out/diag_def.json", "utf8"));
const scene: FieldScene = d.scene;
scene.look.ctrlArc ??= 0.47;
const fb = new FormB(scene, { dpr: 1.5 });
const h = scene.look.halfWidth, W = scene.look.band;
const pi31 = fb.polys.findIndex((p) => p.id === 31);
const p = fb.polys[pi31];
console.log("chain31 poly s0", p.s0, "len", p.len, "closed", p.closed);
for (const s of [0.3, 0.6, 0.9, 1.05, 1.21, 1.35, 1.5, 1.8, 2.2]) {
  const at = pointAt(p, normS(p, s));
  for (const side of [1, -1]) {
    const px = at.x - at.ty * side * (h - W / 2), py = at.y + at.tx * side * (h - W / 2);
    const ev = fb.evalPoint(px, py);
    console.log(`s=${s} side=${side} pt=(${px.toFixed(2)},${py.toFixed(2)}) ink=${ev.ink.toFixed(3)} term=${ev.term} fade=${ev.fade}`);
  }
  const c = fb.evalPoint(at.x, at.y);
  console.log(`s=${s} centre ink=${c.ink.toFixed(3)} term=${c.term}`);
}
// arms on chain 31 and 61 near the crossing
for (const a of fb.arms) {
  const ch = scene.chains[a.pi]?.id;
  if (ch === 31 || (ch === 61 && Math.abs(a.sR - 144.3) < 30)) console.log(`arm j${a.j} g${a.g} chain${ch} sR=${a.sR.toFixed(2)} dir=${a.dir} kind=${a.kind} L=${a.L.toFixed(3)} Lcut=${a.Lcut}`);
}
console.log("groups: j82 group", fb.groupOf[82], "nGroups", fb.nGroups);
