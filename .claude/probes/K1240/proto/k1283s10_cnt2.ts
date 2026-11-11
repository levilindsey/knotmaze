// K1283 s10 (temporary): footS calls a frame in the working tree's fill (needs footCntX in fill_tri).
import * as O from "./outline";
import * as F from "./fill_tri";
import { loadScene } from "./k1279_census";
const name = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "def";
const scene = loadScene(name); const st = O.structure(scene); const t0 = O.frame(st, scene);
const fs = F.fillStructure(st, F.fillResolution(st, t0)); F.fillFrame(fs, st, t0, scene);
const X = (F as unknown as { footCntX: { calls: number } }).footCntX;
for (const cfg of [{ skipEnd: false, tol: -1 }, { skipEnd: true, tol: -1 }, { skipEnd: true, tol: 0.001 }, { skipEnd: true, tol: 0.01 }, { skipEnd: true, tol: 0.05 }]) {
  Object.assign(F.stripCfg, cfg); X.calls = 0; F.fillFrame(fs, st, t0, scene); console.log(`${name} ${JSON.stringify(cfg)}: footS calls ${X.calls}`);
}