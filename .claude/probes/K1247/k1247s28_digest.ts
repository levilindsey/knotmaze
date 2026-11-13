// K1247 s28: bit-exactness of the speed cuts. Replays a captured drag (k1247s18_capture.mjs frames)
// through OutlineModel's update steps with the app's look flags (fillRec 2, bandRec 1, bandRecGpu 1)
// and prints, per frame, float64-bit digests of zChains' output, fillFrame's output, the paint data
// and the band. A cut is exact when master's and the branch's lines match.
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s28_digest.ts <dragDir> [fillRec=2]
// (or the k1247s28_build.mjs bundle of this file: same output, runs on rollup's bindings)
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { SceneIn } from "../../../src/render/outline/outline";
import { OB_DI, alignJunctionArms, frame } from "../../../src/render/outline/outline";
import { OutlineModel } from "../../../src/render/outline/outline_model";
import { fillFrame } from "../../../src/render/outline/fill_tri";
import { paintFrame, zChains } from "../../../src/render/outline/draw";
import { sectionPaint } from "../../../src/render/outline/paint";
import { digest } from "../../../test/render/outline_digest";
const [dir, fr0 = "2"] = process.argv.slice(2);
const ld = (f: string): SceneIn => {
  const s = JSON.parse(readFileSync(join(dir, f), "utf8")) as SceneIn;
  (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  Object.assign(s.look, fr0 === "x" ? {} : { fillRec: Number(fr0), bandRec: 1, bandRecGpu: 1 });
  return s;
};
const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
const scenes = files.map(ld);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const m = new OutlineModel(scenes[0]) as any;
const out: string[] = [];
// The model's reuse buffer (OutlineModel.update passes one; master's fillFrame ignores the argument).
const buf = {};
// Twice through the frames: the second pass checks the caches carried from frame to frame.
for (let pass = 0; pass < 2; pass++) for (let i = 1; i < scenes.length; i++) {
  const scene = alignJunctionArms(m.st, scenes[i]);
  OB_DI.on = m.bandRec !== null;
  m.table = frame(m.st, scene);
  const zz = zChains(scene);
  const dz = digest({ zc: zz.zc, passes: zz.passes, idx: zz.idx });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fr = (fillFrame as any)(m.fs, m.st, m.table, scene, zz, buf);
  const df = digest(fr);
  paintFrame(m.pd, fr, sectionPaint(scene, "app", m.baseHue), m.rec ? m.rec.nDyn : undefined);
  m.recFrame = fr.rec ?? null;
  const dp = digest(m.pd);
  m.band = m.bandOf(scene, zz);
  const db = digest(m.band);
  out.push(`${pass}:${files[i]} z ${dz} f ${df} p ${dp} b ${db}`);
}
console.log(out.join("\n"));
console.log(`all ${digest(out)}`);
