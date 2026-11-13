// K1247 s28: OutlineModel.update replayed over a captured drag (k1247s18_capture.mjs frames), the
// app's look flags (fillRec 2, bandRec 1, bandRecGpu 1), R passes; prints each part's p50 / p95 and
// fillFrame's own split (FILL_PROF, per frame). Relative numbers for attribution; the official worker
// frame comes from the ABBA bench under the perf lock.
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s28_prof.ts <dragDir> [R=6] [fprof=1]
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { SceneIn } from "../../../src/render/outline/outline";
import { OutlineModel } from "../../../src/render/outline/outline_model";
import { FILL_PROF } from "../../../src/render/outline/fill_tri";
const [dir, Rs = "6", fp = "1"] = process.argv.slice(2);
const R = Number(Rs);
const ld = (f: string): SceneIn => {
  const s = JSON.parse(readFileSync(join(dir, f), "utf8")) as SceneIn;
  s.look.ctrlArc ??= 0.47;
  Object.assign(s.look, { fillRec: 2, bandRec: 1, bandRecGpu: 1 });
  return s;
};
const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
const scenes = files.map(ld);
const t0 = performance.now();
const m = new OutlineModel(scenes[0]);
console.log(`structure ${(performance.now() - t0).toFixed(0)} ms  ${Object.entries(m.structureParts).map(([k, v]) => `${k} ${v.toFixed(0)}`).join(" ")}`);
for (let w = 0; w < 2; w++) for (let i = 1; i < scenes.length; i++) m.update(scenes[i]);
const parts: Record<string, number[]> = {};
FILL_PROF.on = fp === "1"; FILL_PROF.t = {};
let nF = 0;
for (let r = 0; r < R; r++) for (let i = 1; i < scenes.length; i++) {
  m.update(scenes[i]); nF++;
  for (const [k, v] of Object.entries(m.parts)) (parts[k] ??= []).push(v);
  (parts.total ??= []).push(m.frameMs);
}
const q = (a: number[], p: number): number => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };
for (const [k, a] of Object.entries(parts)) console.log(`${k.padEnd(8)} p50 ${q(a, 0.5).toFixed(2).padStart(7)}  p95 ${q(a, 0.95).toFixed(2).padStart(7)}`);
if (FILL_PROF.on) console.log("fill split (ms/frame): " + Object.entries(FILL_PROF.t).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(v / nF).toFixed(2)}`).join("  "));
