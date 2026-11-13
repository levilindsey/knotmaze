// K1247 s30 (2): the engine comparison's bench, bundled once (vite lib build, minified like the app) and run
// unchanged in Node, a Chrome module worker and Chrome's main thread (k1247s30_engine.mjs). Replays drag
// frames through OutlineModel.update with the app's look and returns each part's ms per update.
import { OutlineModel } from "../../../src/render/outline/outline_model";
import type { SceneIn } from "../../../src/render/outline/outline";

export type Parts = Record<"frame" | "zChains" | "fill" | "paint" | "band" | "total", number[]>;
export function bench(frames: SceneIn[], warm: number, reps: number): { parts: Parts; structureMs: number } {
  for (const S of frames) {
    const look = S.look as SceneIn["look"] & Record<string, number>;
    look.ctrlArc ??= 0.47; look.fillRec = 2; look.bandRec = 1; look.bandRecGpu = 1;
  }
  const t0 = performance.now();
  const m = new OutlineModel(frames[0]);
  const structureMs = performance.now() - t0;
  const parts: Parts = { frame: [], zChains: [], fill: [], paint: [], band: [], total: [] };
  for (let c = 0; c < warm + reps; c++) {
    for (const S of frames) {
      m.update(S);
      if (c < warm) continue;
      const p = m.parts as Record<string, number>;
      for (const k of ["frame", "zChains", "fill", "paint", "band"] as const) parts[k].push(p[k]);
      parts.total.push(m.frameMs);
    }
  }
  return { parts, structureMs };
}
