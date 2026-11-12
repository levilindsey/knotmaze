// K1247 s18: the moved frame's parts in Node (OutlineModel.update's own timings), fill records off
// vs on, median over a captured drag (frames after the first; R reps each, best kept), plus the
// fill's sections (FILL_PROF) with records on. The projection's input.
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s18_parts.ts <dragDir> [reps=3]
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { OutlineModel } from "../../../src/render/outline/outline_model";
import { FILL_PROF } from "../../../src/render/outline/fill_tri";
import type { SceneIn } from "../../../src/render/outline/outline";

const dir = process.argv[2]; const R = Number(process.argv[3] ?? 3);
const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
const scenes: SceneIn[] = files.map((f) => { const s = JSON.parse(readFileSync(join(dir, f), "utf8")); s.look.ctrlArc ??= 0.47; delete s.look.fillRec; return s; });
const withRec = (s: SceneIn, on: boolean): SceneIn => ({ ...s, look: { ...s.look, fillRec: on ? 1 : undefined } } as SceneIn);
const model = new OutlineModel(scenes[0]);
const keys = ["frame", "zChains", "fill", "paint", "band"] as const;
const acc: Record<string, number[]> = {};
const push = (k: string, v: number): void => { (acc[k] ??= []).push(v); };
for (let k = 1; k < scenes.length; k++) {
  for (const on of [false, true]) {
    const best: Record<string, number> = {};
    for (let r = 0; r < R; r++) {
      model.update(withRec(scenes[k], on));
      for (const p of keys) best[p] = Math.min(best[p] ?? Infinity, model.parts[p]);
    }
    let tot = 0;
    for (const p of keys) { push(`${on ? "on" : "off"}.${p}`, best[p]); tot += best[p]; }
    push(`${on ? "on" : "off"}.total`, tot);
  }
}
const med = (xs: number[]): number => Float64Array.from(xs).sort()[xs.length >> 1];
for (const on of ["off", "on"]) console.log(`${on}: ${[...keys, "total"].map((p) => `${p} ${med(acc[`${on}.${p}`]).toFixed(1)}`).join("  ")}`);
// Fill sections with records on (ms per frame, summed then divided).
FILL_PROF.on = true; FILL_PROF.t = {};
for (let k = 1; k < scenes.length; k++) model.update(withRec(scenes[k], true));
FILL_PROF.on = false;
const n = scenes.length - 1;
console.log(`fill sections (on, ms/frame): ${Object.entries(FILL_PROF.t).map(([k, v]) => `${k} ${(v / n).toFixed(2)}`).join("  ")}`);
