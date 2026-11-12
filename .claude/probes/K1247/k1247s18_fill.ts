// K1247 s18: fill on (oe=1, records) vs off over a captured drag, in Node: fillFrame time per frame
// (best of R reps, alternating), vertex distance on vs off in device px (p50/p99/max over every
// frame's live vertices), paint-s difference, and the worst spots (frame, world x, y) for the crops.
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s18_fill.ts <dragDir> [reps=3] [outJson]
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { alignJunctionArms, frame, structure, type SceneIn } from "../../../src/render/outline/outline";
import { fillFrame, fillResolution, fillStructure } from "../../../src/render/outline/fill_tri";
import { zChains } from "../../../src/render/outline/draw";

const dir = process.argv[2]; const R = Number(process.argv[3] ?? 3); const outJson = process.argv[4];
const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
const scenes: SceneIn[] = files.map((f) => { const s = JSON.parse(readFileSync(join(dir, f), "utf8")); s.look.ctrlArc ??= 0.47; delete s.look.fillRec; return s; });
const sc0 = scenes[0];
const px = sc0.camera.pxPerUnit * (sc0.camera.dpr || 1);
const st = structure(sc0);
const fs = fillStructure(st, fillResolution(st, frame(st, sc0)));
const SL = 4;
const dists: number[] = []; const sdiff: number[] = []; const tOff: number[] = []; const tOn: number[] = [];
const worst: { f: number; v: number; d: number; x: number; y: number }[] = [];
for (let k = 0; k < scenes.length; k++) {
  const sc = alignJunctionArms(st, scenes[k]);
  const tb = frame(st, sc); const zz = zChains(sc);
  const on = { ...sc, look: { ...sc.look, fillRec: 1 } };
  let a = fillFrame(fs, st, tb, sc, zz); let b = fillFrame(fs, st, tb, on, zz);
  let bo = Infinity; let bn = Infinity;
  for (let r = 0; r < R; r++) {
    let t = performance.now(); a = fillFrame(fs, st, tb, sc, zz); bo = Math.min(bo, performance.now() - t);
    t = performance.now(); b = fillFrame(fs, st, tb, on, zz); bn = Math.min(bn, performance.now() - t);
  }
  tOff.push(bo); tOn.push(bn);
  for (let v = 0; v < fs.nV; v++) {
    if (!(a.key[v] > -999) && !(b.key[v] > -999)) continue;
    const d = Math.hypot(a.pos[2 * v] - b.pos[2 * v], a.pos[2 * v + 1] - b.pos[2 * v + 1]) * px;
    dists.push(d); sdiff.push(Math.abs(a.s4[SL * v] - b.s4[SL * v]));
    if (d > 2) worst.push({ f: k, v, d, x: a.pos[2 * v], y: a.pos[2 * v + 1] });
  }
}
const qs = (xs: number[]): string => { const s = Float64Array.from(xs).sort(); const at = (f: number) => s[Math.min(s.length - 1, Math.floor(f * s.length))]; return `p50 ${at(0.5).toFixed(3)} p90 ${at(0.9).toFixed(3)} p99 ${at(0.99).toFixed(3)} max ${s[s.length - 1].toFixed(2)}`; };
const med = (xs: number[]): number => Float64Array.from(xs).sort()[xs.length >> 1];
console.log(`${dir}: ${scenes.length} frames, ${fs.nV} fill verts, ${px.toFixed(1)} device px/unit`);
console.log(`fillFrame ms (Node, best of ${R}, median over frames): off ${med(tOff).toFixed(1)}  on ${med(tOn).toFixed(1)}`);
console.log(`vertex distance on vs off, device px: ${qs(dists)}`);
console.log(`paint s |on - off| (units): ${qs(sdiff)}`);
// Worst spots: cluster by 1 world unit, keep the 5 largest.
worst.sort((p, q) => q.d - p.d);
const spots: typeof worst = [];
for (const w of worst) { if (spots.every((s) => Math.hypot(s.x - w.x, s.y - w.y) > 3)) spots.push(w); if (spots.length >= 5) break; }
console.log(`worst spots: ${spots.map((s) => `f${s.f} v${s.v} ${s.d.toFixed(1)}px @(${s.x.toFixed(1)},${s.y.toFixed(1)})`).join("; ")}`);
if (outJson) writeFileSync(outJson, JSON.stringify({ spots, tOff, tOn }));
