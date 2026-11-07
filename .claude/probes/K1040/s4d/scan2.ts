// K1040 S4d: whole-chain scan — band-centre samples whose foot and centre lie
// outside every OTHER chain's tube but form B inks < 0.5. Classifies the
// nearest other tube at the foot.
//   node scripts/run_node.mjs .claude/probes/K1040/s4d/scan2.ts <scene> <chain,...>
import { readFileSync } from "node:fs";
import { FormB, OWN } from "../../../../src/render/field/form_b";
import { pointAt, normS } from "../../../../src/render/field/geom";
import type { FieldScene } from "../../../../src/render/field/scene";

const name = process.argv[2] ?? "def";
const chainList = (process.argv[3] ?? "6,61").split(",").map(Number);
const scene = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
scene.look.ctrlArc ??= 0.47;
const fb = new FormB(scene, { dpr: 2 });
const h = fb.h, W = fb.W;

function distToPoly(pi: number, x: number, y: number): number {
  const p = fb.polys[pi];
  let best = Infinity;
  for (let k = 0; k < p.nseg; k++) {
    const b = k + 1 === p.n ? 0 : k + 1;
    const ax = p.x[k], ay = p.y[k], bx = p.x[b], by = p.y[b];
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy;
    let t = l2 > 0 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    const d2 = (x - (ax + dx * t)) ** 2 + (y - (ay + dy * t)) ** 2;
    if (d2 < best) best = d2;
  }
  return Math.sqrt(best);
}

for (const ci of chainList) {
  const poly = fb.polys[ci];
  for (const side of [1, -1]) {
    const step = h / 8;
    let run: { s0: number; s1: number; n: number; worst: [number, number]; minOther: number } | null = null;
    const flush = () => { if (run) { console.log(`chain ${ci} side ${side > 0 ? "L" : "R"} s ${run.s0.toFixed(2)}..${run.s1.toFixed(2)} len ${(run.s1 - run.s0).toFixed(2)} n=${run.n} at (${run.worst[0].toFixed(2)},${run.worst[1].toFixed(2)}) minOtherDistAtFoot ${run.minOther.toFixed(3)} (h=${h})`); run = null; } };
    for (let s = poly.s0; s <= poly.s0 + poly.len; s += step) {
      const c = pointAt(poly, s);
      const nx = -c.ty * side, ny = c.tx * side;
      const bx = c.x + nx * (h - W / 2), by = c.y + ny * (h - W / 2);
      const fx = c.x + nx * h, fy = c.y + ny * h;
      // nearest other chain to foot and to band centre
      let dFoot = Infinity, dCtr = Infinity;
      for (let oj = 0; oj < fb.polys.length; oj++) {
        if (oj === ci) continue;
        const p2 = fb.polys[oj];
        // quick bbox reject
        dFoot = Math.min(dFoot, distToPoly(oj, fx, fy));
        if (dFoot <= h) break;
      }
      let should = dFoot > h + 1e-9;
      if (should) {
        for (let oj = 0; oj < fb.polys.length; oj++) {
          if (oj === ci) continue;
          dCtr = Math.min(dCtr, distToPoly(oj, bx, by));
          if (dCtr <= h) break;
        }
        should = dCtr > h + 1e-9;
      }
      const ev = should ? fb.evalPoint(bx, by) : null;
      const missing = should && ev !== null && ev.ink < 0.5;
      if (missing) {
        if (!run) run = { s0: s, s1: s, n: 0, worst: [bx, by], minOther: dFoot };
        run.s1 = s; run.n++; run.minOther = Math.min(run.minOther, dFoot);
      } else flush();
    }
    flush();
  }
}
console.log("done");
