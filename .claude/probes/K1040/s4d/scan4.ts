// K1040 S4d scan4: long missing borders. For every chain sample (both sides),
// should-show iff the foot and the band centre lie outside every other tube:
// other chains (whole polyline) and the SAME chain's parts farther than sigma
// in arc length. Missing iff form B inks < 0.5 at the band centre.
// Prints runs longer than MINLEN.
//   node scripts/run_node.mjs .claude/probes/K1040/s4d/scan4.ts <scene> [minlen]
import { readFileSync } from "node:fs";
import { FormB } from "../../../../src/render/field/form_b";
import { pointAt, normS, dS } from "../../../../src/render/field/geom";
import type { FieldScene } from "../../../../src/render/field/scene";

const name = process.argv[2] ?? "def";
const MINLEN = Number(process.argv[3] ?? 0.5);
const scene = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
scene.look.ctrlArc ??= 0.47;
const fb = new FormB(scene, { dpr: 2 });
const h = fb.h, W = fb.W, sigma = fb.sigma;

// distance to polyline pi, optionally skipping segments whose arc midpoint is
// within dsSkip of sRef on that chain (for the own-chain local part).
function distToPoly(pi: number, x: number, y: number, sRef = NaN, dsSkip = 0): number {
  const p = fb.polys[pi];
  let best = Infinity;
  for (let k = 0; k < p.nseg; k++) {
    if (dsSkip > 0) {
      const smid = p.s[k] + p.segLen[k] / 2;
      if (Math.abs(dS(p, sRef, smid)) < dsSkip) continue;
    }
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

let total = 0;
for (let ci = 0; ci < fb.polys.length; ci++) {
  const poly = fb.polys[ci];
  for (const side of [1, -1]) {
    const step = h / 8;
    let run: { s0: number; s1: number; at: [number, number] } | null = null;
    const flush = () => {
      if (run && run.s1 - run.s0 >= MINLEN) {
        console.log(`chain ${ci} side ${side > 0 ? "L" : "R"} s ${run.s0.toFixed(2)}..${run.s1.toFixed(2)} len ${(run.s1 - run.s0).toFixed(2)} at (${run.at[0].toFixed(2)},${run.at[1].toFixed(2)})`);
        total++;
      }
      run = null;
    };
    for (let s = poly.s0; s <= poly.s0 + poly.len; s += step) {
      const c = pointAt(poly, s);
      const nx = -c.ty * side, ny = c.tx * side;
      const bx = c.x + nx * (h - W / 2), by = c.y + ny * (h - W / 2);
      const fx = c.x + nx * h, fy = c.y + ny * h;
      let should = true;
      // own chain far parts
      if (distToPoly(ci, fx, fy, s, sigma) <= h + 1e-9 || distToPoly(ci, bx, by, s, sigma) <= h + 1e-9) should = false;
      if (should)
        for (let oj = 0; oj < fb.polys.length; oj++) {
          if (oj === ci) continue;
          if (distToPoly(oj, fx, fy) <= h + 1e-9 || distToPoly(oj, bx, by) <= h + 1e-9) { should = false; break; }
        }
      const missing = should && fb.evalPoint(bx, by).ink < 0.5;
      if (missing) {
        if (!run) run = { s0: s, s1: s, at: [bx, by] };
        run.s1 = s;
      } else flush();
    }
    flush();
  }
}
console.log(`${name}: ${total} missing runs >= ${MINLEN}`);
