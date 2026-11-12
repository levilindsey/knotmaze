// K1247 s21: the OutlineModel constructor's parts from any source tree (master's or the branch's), one captured frame, one
// process per run: cold ctor, then the median of R warm part timings. argv: srcRoot frameJson fillRec R
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const [root, fj, recS, Rs] = process.argv.slice(2);
const im = (p: string): Promise<any> => import(pathToFileURL(`${root}/src/render/outline/${p}.ts`).href);
const O = await im("outline"); const F = await im("fill_tri"); const D = await im("draw"); const BG = await im("band_gpu"); const OM = await im("outline_model");
const rec = Number(recS);
const ld = (): any => { const s = JSON.parse(readFileSync(fj, "utf8")); s.look.ctrlArc ??= 0.47; if (rec) s.look.fillRec = rec; else delete s.look.fillRec; return s; };
const tc = performance.now(); new OM.OutlineModel(ld()); const cold = performance.now() - tc;
const all: Record<string, number[]> = {};
for (let r = 0; r < Number(Rs); r++) {
  const scene = ld(); let t = performance.now();
  const lap = (k: string): void => { const n = performance.now(); (all[k] ??= []).push(n - t); t = n; };
  const st = O.structure(scene); lap("structure"); const tb = O.frame(st, scene); lap("frame");
  const fs = F.fillStructure(st, F.fillResolution(st, tb)); lap("fillStructure"); const zz = D.zChains(scene); lap("zChains");
  const gpu = rec === 2; const sc1 = gpu ? { ...scene, look: { ...scene.look, fillRec: 3 } } : scene;
  const fr = F.fillFrame(fs, st, tb, sc1, zz); lap("fillFrame");
  const pd = D.paintData(fs, st, fr, sc1, "app", D.baseHueFor(scene.name)); lap("paintData");
  if (gpu) { OM.recLayout(fs, pd); lap("recLayout"); }
  BG.bandGpu(tb, scene, zz); lap("band");
}
const med = (a: number[]): number => [...a].sort((x, y) => x - y)[a.length >> 1];
console.log(`cold ${cold.toFixed(0)} | ` + Object.entries(all).map(([k, v]) => `${k} ${med(v).toFixed(0)}`).join(" "));
