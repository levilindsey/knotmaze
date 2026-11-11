import { loadScene } from "../../../../test/render/outline_digest";
import { structure, frame } from "../../../../src/render/outline/outline";
import { fillFrame, fillResolution, fillStructure } from "../../../../src/render/outline/fill_tri";
import { baseHueFor, paintData, paintFrame, zChains } from "../../../../src/render/outline/draw";
import { sectionPaint } from "../../../../src/render/outline/paint";
import { runTexture } from "../../../../src/render/outline/paint";
const s0 = loadScene(`.claude/probes/K868/scenes/def.json`);
const st = structure(s0); const tb = frame(st, s0);
const fs = fillStructure(st, fillResolution(st, tb)); const zz = zChains(s0);
const fr = fillFrame(fs, st, tb, s0, zz);
const pd = paintData(fs, st, fr, s0, "app", baseHueFor(s0.name));
console.log("nV", fs.nV, "src", pd.src.length, "tex", pd.tex.length, "runs", pd.sp.runs.length, "fr.pos", fr.pos.constructor.name, fr.pos.length, "w4", fr.w4.constructor.name, "s4", fr.s4.constructor.name, "key", fr.key.constructor.name);
const sp = sectionPaint(s0, "app", baseHueFor(s0.name));
for (let k = 0; k < 3; k++) { let t = performance.now(); paintFrame(pd, fr, sp); const a = performance.now() - t; t = performance.now(); const rt = runTexture(sp); console.log("paintFrame", a.toFixed(1), "runTexture", (performance.now() - t).toFixed(1), rt.length); }