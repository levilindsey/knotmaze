// K1239: old slot cuts vs FormB burial extents per crossing (under chain, both sides).
import { readFileSync } from "node:fs";
import { FormB } from "../../../src/render/field/form_b";
import { pointAt, normS } from "../../../src/render/field/geom";
import type { FieldScene } from "../../../src/render/field/scene";

const d = JSON.parse(readFileSync(".claude/probes/K1239/out/diag_def.json", "utf8"));
const scene: FieldScene = d.scene;
scene.look.ctrlArc ??= 0.47;
const fb = new FormB(scene, { dpr: 1.5 });
const h = scene.look.halfWidth, W = scene.look.band;
const slots: { i: number; over: number; under: number; cutNeg: number; cutPos: number }[] = d.slots ?? [];
let n = 0, sumNeg = 0, sumPos = 0, sumFNeg = 0, sumFPos = 0, worse = 0;
const bad: string[] = [];
for (const x of scene.crossings) {
  const slot = slots.find((s) => s.i === scene.crossings.indexOf(x));
  if (!slot) continue;
  const underChain = x.over === "a" ? x.b.chain : x.a.chain;
  const underS = x.over === "a" ? x.b.s : x.a.s;
  if (slot.under !== underChain) continue;
  const pi = fb.polys.findIndex((p) => p.id === underChain);
  const p = fb.polys[pi];
  // FormB burial extent per direction: last s (from centre outward) with ink<=0.5 at band centre, either side
  const extent = (dir: number): number => {
    let last = 0;
    for (let t = 0.02; t < 1.2; t += 0.02) {
      const s = underS + p.s0 + dir * t;
      const at = pointAt(p, normS(p, s));
      const inked = [1, -1].some((side) => fb.evalPoint(at.x - at.ty * side * (h - W / 2), at.y + at.tx * side * (h - W / 2)).ink > 0.5);
      if (!inked) last = t;
      else if (t > 0.3) break;
    }
    return last;
  };
  // convert scene s to poly s: poly s = scene s + s0 (s0<=0 when extended at start)
  const fNeg = extent(-1), fPos = extent(1);
  n++;
  sumNeg += slot.cutNeg; sumPos += slot.cutPos; sumFNeg += fNeg; sumFPos += fPos;
  const dNeg = fNeg - slot.cutNeg, dPos = fPos - slot.cutPos;
  if (Math.abs(dNeg) > 0.25 || Math.abs(dPos) > 0.25) { worse++; if (bad.length < 12) bad.push(`x${scene.crossings.indexOf(x)} under=${underChain} old=[-${slot.cutNeg.toFixed(2)},+${slot.cutPos.toFixed(2)}] formB=[-${fNeg.toFixed(2)},+${fPos.toFixed(2)}]`); }
}
console.log(`crossings compared ${n}; mean old cut [-${(sumNeg / n).toFixed(3)}, +${(sumPos / n).toFixed(3)}] formB burial [-${(sumFNeg / n).toFixed(3)}, +${(sumFPos / n).toFixed(3)}]; |diff|>0.25: ${worse}`);
for (const b of bad) console.log(b);
