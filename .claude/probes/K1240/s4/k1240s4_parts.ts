import { loadScene } from "../../../../test/render/outline_digest";
import { structure, frame } from "../../../../src/render/outline/outline";
import { fillFrame, fillResolution, fillStructure } from "../../../../src/render/outline/fill_tri";
import { bandData, baseHueFor, paintData, paintFrame, zChains } from "../../../../src/render/outline/draw";
import { sectionPaint } from "../../../../src/render/outline/paint";
const name = process.argv[2] ?? "def";
const s0 = loadScene(`.claude/probes/K868/scenes/${name}.json`);
const T = (l: string, f: () => any): any => { const t = performance.now(); const r = f(); console.log(l, (performance.now() - t).toFixed(1)); return r; };
const st = T("structure", () => structure(s0));
const tb = T("frame0", () => frame(st, s0));
const fs = T("fillStructure", () => fillStructure(st, fillResolution(st, tb)));
const zz = T("zChains", () => zChains(s0));
const fr = T("fillFrame", () => fillFrame(fs, st, tb, s0, zz));
const pd = T("paintData", () => paintData(fs, st, fr, s0, "app", baseHueFor(s0.name)));
T("band", () => bandData(tb, s0, zz));
for (let k = 0; k < 4; k++) {
  const t2 = T("frame", () => frame(st, s0));
  const z2 = T(" zChains", () => zChains(s0));
  const f2 = T(" fillFrame", () => fillFrame(fs, st, t2, s0, z2));
  const sp = T(" sectionPaint", () => sectionPaint(s0, "app", baseHueFor(s0.name)));
  T(" paintFrame", () => paintFrame(pd, f2, sp));
  T(" band", () => bandData(t2, s0, z2));
}
