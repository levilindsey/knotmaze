// K1040 S4a: form B along a check #12 section, on the CPU (no browser).
//   node scripts/run_node.mjs .claude/probes/K1040/s4a/ref_at.ts <scene> <u> <v> <chain> <k> <side> [scale]
// Prints every pixel's PixelEval along the section (device px from the centreline).
import { readFileSync } from "node:fs";
import { FormB } from "../../../../src/render/field/form_b";
import type { FieldScene } from "../../../../src/render/field/scene";

const [name, us, vs, cs, ks, sds, scs] = process.argv.slice(2);
const scale = Number(scs ?? 2);
const scene = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
scene.look.ctrlArc ??= 0.47;
const fb = new FormB(scene, { dpr: scale });
const [a0, b0, c0, d0, e0, f0] = scene.camera.worldToCss;
const [a, b, c, d, e, f] = [a0 * scale, b0 * scale, c0 * scale, d0 * scale, e0 * scale, f0 * scale];
const det = a * d - b * c;
const ppd = Math.sqrt(Math.abs(det));
const u = Number(us);
const v = Number(vs);
const ci = Number(cs);
const k = Number(ks);
const side = Number(sds);
const p = fb.polys[ci];
const k1 = k + 1 === p.n ? 0 : k + 1;
const dx = p.x[k1] - p.x[k];
const dy = p.y[k1] - p.y[k];
const l = Math.sqrt(dx * dx + dy * dy);
const tx = dx / l;
const ty = dy / l;
const px = (d * (u - e) - c * (v - f)) / det;
const py = (-b * (u - e) + a * (v - f)) / det;
const nx = -ty * side;
const ny = tx * side;
console.log(`h ${(fb.h * ppd).toFixed(3)} px, W ${(fb.W * ppd).toFixed(3)} px, aa ${(fb.aa * ppd).toFixed(3)} px, ppd ${ppd.toFixed(3)}; chain ${ci} closed ${p.closed} n ${p.n}`);
for (let t = 6 / ppd; t <= fb.h + 5 / ppd; t += 0.25 / ppd) {
  const x = px + nx * t;
  const y = py + ny * t;
  const r = fb.evalPoint(x, y);
  const T = r.term;
  console.log(
    `t ${(t * ppd).toFixed(2)} ink ${r.ink.toFixed(3)} top ${r.top} chain ${r.chain} s ${r.s.toFixed(3)} nSurf ${r.nSurf}` +
      (T ? ` term kind ${T.kind} surf ${T.surf} chain ${T.chain} s ${T.s.toFixed(3)} k ${T.k} D ${(T.D * ppd).toFixed(2)}px w ${T.w.toFixed(3)} v ${T.v.toFixed(3)}` : ""),
  );
}
