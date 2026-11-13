import { readFileSync } from "node:fs";
import { frame, structure, type SceneIn } from "../../../src/render/outline/outline";
import * as D from "../../../src/render/outline/draw";
const [nm, xs, ys, pis] = process.argv.slice(2);
const sc = JSON.parse(readFileSync(`.claude/probes/K868/scenes/${nm}.json`, "utf8")) as SceneIn;
(sc.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
const table = frame(structure(sc), sc); const zz = D.zChains(sc); const h = table.h;
const x = Number(xs); const y = Number(ys);
for (const pi of pis.split(",").map(Number)) {
  const p = table.pieces[pi]; const np = p.pts.length / 2; let best = 1e9; let bi = -1;
  for (let i = 0; i + 1 < np; i++) {
    const ax = p.pts[2*i], ay = p.pts[2*i+1], bx = p.pts[2*i+2], by = p.pts[2*i+3];
    const dx = bx-ax, dy = by-ay; const t = Math.max(0, Math.min(1, ((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)));
    const d = Math.hypot(x-ax-t*dx, y-ay-t*dy); if (d < best) { best = d; bi = i; }
  }
  const cx = p.cpts[2*bi], cy = p.cpts[2*bi+1];
  const fc = D.footNear(zz.zc[p.chain], x, y, p.s0, 1e9, 0, 0);
  console.log(`p${pi} ${p.kind} ch ${p.chain} nearest seg ${bi} d ${(best/h).toFixed(3)}h; pt (${p.pts[2*bi].toFixed(4)},${p.pts[2*bi+1].toFixed(4)}) cpt (${cx.toFixed(4)},${cy.toFixed(4)}) |pt-cpt| ${(Math.hypot(p.pts[2*bi]-cx,p.pts[2*bi+1]-cy)/h).toFixed(3)}h; |x-cpt| ${(Math.hypot(x-cx,y-cy)/h).toFixed(3)}h; zChain foot d ${(fc.d/h).toFixed(3)}h s ${fc.s.toFixed(3)}`);
}
