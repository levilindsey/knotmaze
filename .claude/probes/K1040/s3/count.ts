// K1040 S3: per-scene sizes (chains, segments, groups, corners), FormB's
// construction time and evalPoint's cost per pixel, to size the census.
//   npx vite-node .claude/probes/K1040/s3/count.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FormB } from "../../../../src/render/field/form_b";
import type { FieldScene } from "../../../../src/render/field/scene";

const sceneDir = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const SCENES = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
for (const name of SCENES) {
  const s = JSON.parse(readFileSync(join(sceneDir, `${name}.json`), "utf8")) as FieldScene;
  s.look.ctrlArc ??= 0.47;
  const t0 = performance.now();
  const fb = new FormB(s);
  const t1 = performance.now();
  let nseg = 0;
  let maxSeg = 0;
  for (const p of fb.polys) { nseg += p.nseg; maxSeg = Math.max(maxSeg, p.nseg); }
  const [vw, vh] = s.camera.viewport;
  const [a, b, c, d, e, f] = s.camera.worldToCss;
  const det = a * d - b * c;
  // evalPoint cost on a 200x200 css-px window at the viewport centre, dpr 2 centres
  let n = 0;
  const t2 = performance.now();
  let covered = 0;
  for (let j = 0; j < 200; j++)
    for (let i = 0; i < 200; i++) {
      const u = vw / 2 - 50 + (i + 0.5) / 2 - e;
      const v = vh / 2 - 50 + (j + 0.5) / 2 - f;
      const r = fb.evalPoint((d * u - c * v) / det, (-b * u + a * v) / det);
      if (r.top !== -1) covered++;
      n++;
    }
  const t3 = performance.now();
  console.log(`${name}: chains ${fb.polys.length} segs ${nseg} (max ${maxSeg}) groups ${fb.nGroups} arms ${fb.arms.length} corners ${fb.corners.length} | view ${vw}x${vh} css dpr ${s.camera.dpr} ppu ${s.camera.pxPerUnit.toFixed(2)} h ${fb.h.toFixed(3)} | ctor ${(t1 - t0).toFixed(0)} ms, evalPoint ${((t3 - t2) * 1000 / n).toFixed(1)} us/px (${(100 * covered / n).toFixed(0)}% covered)`);
}
