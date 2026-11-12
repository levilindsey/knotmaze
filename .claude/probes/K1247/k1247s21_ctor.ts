// K1247 s21: the OutlineModel constructor's parts (s21's: one fillRec 3 fill), on one captured frame, fillRec 0 vs 2 (cold = first run in
// the process, then the median of R warm runs). argv: dragDir R
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { frame, structure, type SceneIn } from "../../../src/render/outline/outline";
import { fillFrame, fillResolution, fillStructure, keyScale } from "../../../src/render/outline/fill_tri";
import { baseHueFor, paintData, zChains } from "../../../src/render/outline/draw";
import { bandGpu } from "../../../src/render/outline/band_gpu";
import { OutlineModel, recLayout } from "../../../src/render/outline/outline_model";
const [dir, Rs] = process.argv.slice(2);
const ld = (): SceneIn => { const s = JSON.parse(readFileSync(join(dir, "f000.json"), "utf8")); s.look.ctrlArc ??= 0.47; return s; };
function parts(rec: number): Record<string, number> {
  const scene = ld(); scene.look.fillRec = rec;
  const T: Record<string, number> = {}; let t = performance.now();
  const lap = (k: string): void => { const n = performance.now(); T[k] = (T[k] ?? 0) + n - t; t = n; };
  const bh = baseHueFor(scene.name); const st = structure(scene); lap("structure");
  const tb = frame(st, scene); lap("frame");
  const fs = fillStructure(st, fillResolution(st, tb)); lap("fillStructure");
  const zz = zChains(scene); lap("zChains");
  const gpu = rec === 2; const sc1 = gpu ? { ...scene, look: { ...scene.look, fillRec: 3 } } : scene;
  const fr = fillFrame(fs, st, tb, sc1, zz); lap("fillFrame1");
  const pd = paintData(fs, st, fr, sc1, "app", bh); lap("paintData");
  if (gpu) { recLayout(fs, pd); lap("recLayout"); }
  bandGpu(tb, scene, zz); lap("band"); keyScale(scene); lap("ks");
  return T;
}
const R = Number(Rs);
for (const rec of [0, 2]) {
  const s0 = ld(); s0.look.fillRec = rec;
  const tc = performance.now(); new OutlineModel(s0); const cold = performance.now() - tc;
  const all: Record<string, number[]> = {}; const tot: number[] = [];
  for (let r = 0; r < R; r++) {
    const p = parts(rec); for (const [k, v] of Object.entries(p)) (all[k] ??= []).push(v);
    const s1 = ld(); s1.look.fillRec = rec; const t1 = performance.now(); new OutlineModel(s1); tot.push(performance.now() - t1);
  }
  const med = (a: number[]): number => [...a].sort((x, y) => x - y)[a.length >> 1];
  console.log(`fillRec ${rec}: cold ctor ${cold.toFixed(0)} ms, warm ctor p50 ${med(tot).toFixed(0)} | ` + Object.entries(all).map(([k, v]) => `${k} ${med(v).toFixed(1)}`).join("  "));
}
