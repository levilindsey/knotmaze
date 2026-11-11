// K1240 S4b: the outline model's per-frame parts on one scene, the way
// OutlineModel.update runs them (align, frame, zChains, fillFrame,
// sectionPaint + paintFrame, bandGpu), REPS times; median per part.
//   node scripts/run_node.mjs .claude/probes/K1240/s4/k1240s4_parts.ts [scene=def] [reps=8]
import { loadScene } from "../../../../test/render/outline_digest";
import { structure, frame, alignJunctionArms } from "../../../../src/render/outline/outline";
import { fillFrame, fillResolution, fillStructure } from "../../../../src/render/outline/fill_tri";
import { baseHueFor, paintData, paintFrame, zChains } from "../../../../src/render/outline/draw";
import { bandGpu } from "../../../../src/render/outline/band_gpu";
import { sectionPaint } from "../../../../src/render/outline/paint";
const name = process.argv[2] ?? "def";
const reps = Number(process.argv[3] ?? 8);
const s0 = loadScene(`.claude/probes/K868/scenes/${name}.json`);
const T = (l: string, f: () => any): any => { const t = performance.now(); const r = f(); console.log(l, (performance.now() - t).toFixed(1)); return r; };
const st = T("structure", () => structure(s0));
const tb = T("frame0", () => frame(st, s0));
const fs = T("fillStructure", () => fillStructure(st, fillResolution(st, tb)));
const zz = T("zChains", () => zChains(s0));
const fr = T("fillFrame", () => fillFrame(fs, st, tb, s0, zz));
const pd = T("paintData", () => paintData(fs, st, fr, s0, "app", baseHueFor(s0.name)));
T("bandGpu", () => bandGpu(tb, s0, zz));
const parts: Record<string, number[]> = {};
const P = (l: string, f: () => any): any => { const t = performance.now(); const r = f(); (parts[l] ??= []).push(performance.now() - t); return r; };
for (let k = 0; k < reps; k++) {
  const t0 = performance.now();
  const sc = P("align", () => alignJunctionArms(st, s0));
  const t2 = P("frame", () => frame(st, sc));
  const z2 = P("zChains", () => zChains(sc));
  const f2 = P("fillFrame", () => fillFrame(fs, st, t2, sc, z2));
  const sp = P("sectionPaint", () => sectionPaint(sc, "app", baseHueFor(sc.name)));
  P("paintFrame", () => paintFrame(pd, f2, sp));
  P("bandGpu", () => bandGpu(t2, sc, z2));
  (parts.total ??= []).push(performance.now() - t0);
}
const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
for (const [l, a] of Object.entries(parts)) console.log(`${l.padEnd(13)} median ${med(a).toFixed(1)}  min ${Math.min(...a).toFixed(1)}  max ${Math.max(...a).toFixed(1)}`);