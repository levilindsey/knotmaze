// K1040 S4d: scan form B for borders that K868 says should show but ink misses.
// For every crossing pass (over + under), both sides, sample the band centre
// (h - W/2 out) through the crossing window; a sample "should show" when
//   over: always (goal 2 / check 16)
//   under: its foot (outline point) and band centre both lie outside the
//          other pass's tube (dist to other polyline > h)
// Missing = ink < 0.5. Prints runs of missing samples.
//   node scripts/run_node.mjs .claude/probes/K1040/s4d/scan.ts <scene> [chainFilter]
import { readFileSync } from "node:fs";
import { FormB } from "../../../../src/render/field/form_b";
import { pointAt, normS } from "../../../../src/render/field/geom";
import type { FieldScene } from "../../../../src/render/field/scene";

const name = process.argv[2] ?? "def";
const onlyChain = process.argv[3] ? Number(process.argv[3]) : -1;
const scene = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
scene.look.ctrlArc ??= 0.47;
const fb = new FormB(scene, { dpr: 2 });
const h = fb.h, W = fb.W;
console.log(`scene ${name} h=${h} W=${W} chains=${fb.polys.length} crossings=${scene.crossings.length}`);

// distance from point to a whole polyline (samples are dense; use vertices+segs of fb.polys)
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

interface Run { chain: number; pass: string; side: number; s0: number; s1: number; n: number; crossPt: [number, number]; other: number; }
const runs: Run[] = [];
for (let ci = 0; ci < scene.crossings.length; ci++) {
  const cr = scene.crossings[ci];
  const passes = [
    { me: cr.a, other: cr.b, role: cr.over === "a" ? "over" : "under" },
    { me: cr.b, other: cr.a, role: cr.over === "b" ? "over" : "under" },
  ];
  for (const ps of passes) {
    if (onlyChain >= 0 && ps.me.chain !== onlyChain && ps.other.chain !== onlyChain) continue;
    const poly = fb.polys[ps.me.chain];
    const atC = pointAt(poly, ps.me.s);
    const oAt = pointAt(fb.polys[ps.other.chain], ps.other.s);
    // crossing angle from tangents
    const dot = Math.abs(atC.tx * oAt.tx + atC.ty * oAt.ty);
    const theta = Math.acos(Math.min(1, dot));
    const L = theta > 0.02 ? h / Math.tan(theta / 2) : 10 * h;
    const win = Math.min(L + h, 6 * h);
    for (const side of [1, -1]) {
      const step = h / 8;
      let run: Run | null = null;
      for (let ds = -win; ds <= win; ds += step) {
        const s = normS(poly, ps.me.s + ds);
        const c = pointAt(poly, s);
        const nx = -c.ty * side, ny = c.tx * side;
        const bx = c.x + nx * (h - W / 2), by = c.y + ny * (h - W / 2);
        const fx = c.x + nx * h, fy = c.y + ny * h;
        let should = false;
        if (ps.role === "over") should = true;
        else should = distToPoly(ps.other.chain, fx, fy) > h + 1e-9 && distToPoly(ps.other.chain, bx, by) > h + 1e-9;
        const ink = should ? fb.evalPoint(bx, by).ink : 1;
        const missing = should && ink < 0.5;
        if (missing) {
          if (!run) run = { chain: ps.me.chain, pass: ps.role, side, s0: s, s1: s, n: 0, crossPt: [atC.x, atC.y], other: ps.other.chain };
          run.s1 = s; run.n++;
        } else if (run) { runs.push(run); run = null; }
      }
      if (run) runs.push(run);
    }
  }
}
runs.sort((a, b) => b.n - a.n);
console.log(`missing runs: ${runs.length}`);
for (const r of runs.slice(0, 40))
  console.log(`chain ${r.chain} ${r.pass} side ${r.side > 0 ? "L" : "R"} s ${r.s0.toFixed(2)}..${r.s1.toFixed(2)} len ${((r.s1 - r.s0)).toFixed(2)} (${r.n} samples) cross@(${r.crossPt[0].toFixed(2)},${r.crossPt[1].toFixed(2)}) other chain ${r.other}`);
