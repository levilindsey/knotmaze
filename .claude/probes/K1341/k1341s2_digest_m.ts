// K1341 s1: bit-exactness of the fill / zChains cuts. Prints float64-bit digests (test/render/outline_digest)
// of zChains' output, fillFrame's output, the paint data and the band:
//  - per frame of the s18 drags (def, muse_hash, fat; k1247s18_capture.mjs frames), two passes, through
//    OutlineModel's update steps (the unsnapped path, as the app runs it) with the app's look flags
//    (fillRec 2, bandRec 1, bandRecGpu 1), and once more at fillRec 1 (the whole-CPU fill);
//  - per census scene (the 12 of K1240's checks): the model's structure, then the same steps at fillRec 2,
//    3 and 1.
// A cut is exact when master's and the branch's outputs are equal line for line.
//   node .claude/probes/K1247/k1247s28_build.mjs .claude/probes/K1341/k1341s1_digest.ts <outDir>
//   node <outDir>/k1341s1_digest.mjs <s18 drag root> <census scene dir> > dig.txt
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { SceneIn } from "../../../src/render/outline_m/outline";
import { OB_DI, alignJunctionArms, frame } from "../../../src/render/outline_m/outline";
import { OutlineModel } from "../../../src/render/outline_m/outline_model";
import { fillFrame, fillStructure, fillResolution } from "../../../src/render/outline_m/fill_tri";
import { paintFrame, paintData, zChains } from "../../../src/render/outline_m/draw";
import { sectionPaint } from "../../../src/render/outline_m/paint";
import { digest, OUTLINE_SCENES, loadScene } from "../../../test/render/outline_digest";
const [dragRoot, sceneDir] = process.argv.slice(2);
const flags = (s: SceneIn, fr: number): SceneIn => ({ ...s, look: { ...s.look, fillRec: fr, bandRec: 1, bandRecGpu: 1 } as SceneIn["look"] });
const out: string[] = [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const step = (m: any, sc0: SceneIn, buf: object): string => {
  const scene = alignJunctionArms(m.st, sc0);
  OB_DI.on = m.bandRec !== null;
  m.table = frame(m.st, scene);
  const zz = zChains(scene);
  const dz = digest({ zc: zz.zc, passes: zz.passes, idx: zz.idx });
  const fr = fillFrame(m.fs, m.st, m.table, scene, zz, buf);
  const df = digest(fr);
  paintFrame(m.pd, fr, sectionPaint(scene, "app", m.baseHue), m.rec ? m.rec.nDyn : undefined);
  const dp = digest(m.pd);
  m.band = m.bandOf(scene, zz);
  const db = digest(m.band);
  return `z ${dz} f ${df} p ${dp} b ${db}`;
};
for (const nm of ["def", "muse_hash", "fat"]) {
  const dir = join(dragRoot, nm);
  const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
  const raw = files.map((f) => { const s = JSON.parse(readFileSync(join(dir, f), "utf8")) as SceneIn; (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47; return s; });
  for (const fr0 of [2, 1]) {
    const scenes = raw.map((s) => flags(s, fr0));
    const m = new OutlineModel(scenes[0]);
    const buf = {};
    for (let pass = 0; pass < 2; pass++) for (let i = 1; i < scenes.length; i++) out.push(`${nm} r${fr0} ${pass}:${files[i]} ${step(m, scenes[i], buf)}`);
  }
}
for (const nm of OUTLINE_SCENES) {
  const s0 = loadScene(join(sceneDir, `${nm}.json`));
  const m = new OutlineModel(flags(s0, 2));
  for (const fr0 of [2, 3, 1]) out.push(`census ${nm} r${fr0} ${step(m, flags(s0, fr0), {})}`);
  // A fresh fill structure from the frame, as the model's constructor builds it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mm = m as any;
  const fs = fillStructure(mm.st, fillResolution(mm.st, mm.table));
  const sc = alignJunctionArms(mm.st, flags(s0, 3));
  const fr = fillFrame(fs, mm.st, mm.table, sc, zChains(sc));
  out.push(`census ${nm} ctor f ${digest(fr)} p ${digest(paintData(fs, mm.st, fr, sc, "app", mm.baseHue))}`);
}
console.log(out.join("\n"));
console.log(`all ${digest(out)}`);

