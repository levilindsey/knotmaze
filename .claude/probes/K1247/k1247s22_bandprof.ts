// K1247 s22: bandGpu's time on a captured drag (Node), after a warm-up, per frame p50; and the band's
// vertex count. Also the time of frame() and zChains for scale.
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s22_bandprof.ts <dragDir> [reps]
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { alignJunctionArms, frame, structure, type SceneIn } from "../../../src/render/outline/outline";
import { zChains } from "../../../src/render/outline/draw";
import { bandGpu } from "../../../src/render/outline/band_gpu";

const dir = process.argv[2]; const R = Number(process.argv[3] ?? 2);
const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
const scenes: SceneIn[] = files.map((f) => { const s = JSON.parse(readFileSync(join(dir, f), "utf8")); s.look.ctrlArc ??= 0.47; return s; });
const st = structure(scenes[0]);
const inp = scenes.map((s, i) => { const sc = i === 0 ? s : alignJunctionArms(st, s); const tb = frame(st, sc); const zz = zChains(sc); return { sc, tb, zz }; });
const tB: number[] = []; const tF: number[] = []; const tZ: number[] = [];
for (let r = 0; r < R; r++) for (const { sc, tb, zz } of inp) {
  const a = performance.now(); frame(st, sc); const b = performance.now(); zChains(sc); const c = performance.now(); bandGpu(tb, sc, zz); const d = performance.now();
  if (r > 0 || R === 1) { tF.push(b - a); tZ.push(c - b); tB.push(d - c); }
}
const p50 = (a: number[]): string => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1].toFixed(1); };
const b0 = bandGpu(inp[0].tb, inp[0].sc, inp[0].zz);
console.log(`${dir}: frame ${p50(tF)} zChains ${p50(tZ)} band ${p50(tB)} ms p50; band verts ${b0.count}, dropped ${b0.dropped}`);
